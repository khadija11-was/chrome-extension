//we have to add play the bookmark and delete the bookmark
import {getActiveTabURL} from "./utils.js";

// Adresse du Worker : local pendant le développement, à remplacer après le déploiement
const API_URL = "http://localhost:8787";

const getVideoId = (tab) => new URLSearchParams(tab.url.split("?")[1]).get("v");

//cette methode permet de créer l'element complet qui range les bookmarks d'un video
const addnewBookmark= (bookmarksElement, bookmark)=>{
  const bookTitleElement= document.createElement("div");
  bookTitleElement.title = "rename";
  bookTitleElement.addEventListener("click", onrename);
  const newbookmarkElement= document.createElement("div");
  const controlsElement= document.createElement("div");

  bookTitleElement.textContent= bookmark.desc;
  bookTitleElement.className= "bookmark-title";
  controlsElement.className="bookmark-controls";

  setbookmarkattributes("play", onplay, controlsElement);
  setbookmarkattributes("delete", ondelete, controlsElement);

  newbookmarkElement.id= "bookmark-"+ bookmark.time;
  newbookmarkElement.className= "bookmark";
  newbookmarkElement.setAttribute("timestamp", bookmark.time);
  newbookmarkElement.appendChild(bookTitleElement);
  newbookmarkElement.appendChild(controlsElement);
  bookmarksElement.appendChild(newbookmarkElement);
}

const onplay=async e =>{
  const bookmarkTime= e.target.parentNode.parentNode.getAttribute("timestamp");
  const activeTab =await getActiveTabURL();
  chrome.tabs.sendMessage(activeTab.id, {
    type: "PLAY",
    value: bookmarkTime
  }).catch(err=>{
    console.warn("content script est pas encore injecté");
  });

}

const onrename = (e) => {
  const titleElement = e.currentTarget;
  if (titleElement.querySelector("input")) return; // déjà en édition

  const bookmarkTime = titleElement.parentNode.getAttribute("timestamp");
  const oldTitle = titleElement.textContent;

  const input = document.createElement("input");
  input.type = "text";
  input.value = oldTitle;
  input.maxLength = 100;
  input.className = "bookmark-title-input";

  titleElement.textContent = "";
  titleElement.appendChild(input);
  input.focus();
  input.select();

  let finished = false;
  const finish = async (save) => {
    if (finished) return; // évite le double déclenchement Enter + blur
    finished = true;

    const newTitle = input.value.trim();
    if (!save || newTitle === "" || newTitle === oldTitle) {
      titleElement.textContent = oldTitle;
      return;
    }

    titleElement.textContent = newTitle;
    const activeTab = await getActiveTabURL();
    // Forme "promesse" : avec un callback, sendMessage ne renvoie rien et .catch() planterait
    chrome.tabs.sendMessage(activeTab.id, {
      type: "RENAME",
      value: bookmarkTime,
      desc: newTitle
    }).then(viewBookmarks).catch(() => {
      console.warn("content script est pas encore injecté");
    });
  };

  input.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") finish(true);
    if (ev.key === "Escape") finish(false);
  });
  input.addEventListener("blur", () => finish(true));
};

const ondelete=async e=>{
  const bookmarkTime= e.target.parentNode.parentNode.getAttribute("timestamp");
  const activeTab =await getActiveTabURL();
  const bookmarkTodelete= document.getElementById("bookmark-"+ bookmarkTime);
  bookmarkTodelete.parentNode.removeChild(bookmarkTodelete);

  chrome.tabs.sendMessage(activeTab.id, {
    type: "DELETE",
    value: bookmarkTime
  }, viewBookmarks);
}

//a function that gonna set the play button et listen the click and call the objective function
// ParentControlElement pour soit play soit delete
const setbookmarkattributes= (src, eventListener, ControlParentElement)=>{
  const ControlElement= document.createElement("img");
  ControlElement.src= "assets/"+ src+".png";
  ControlElement.title= src;
  ControlElement.addEventListener("click", eventListener);
  ControlParentElement.appendChild(ControlElement);

}

//lister tous les bookmarks du currentvideo qui utilise la methode addnewBookmark
const viewBookmarks= (currentVideoBookmarks=[])=>{
  const bookmarksElement= document.getElementById("bookmarks");
  bookmarksElement.innerHTML= "";

  if(currentVideoBookmarks.length >0){
    for(let i=0; i<currentVideoBookmarks.length; i++){
      const bookmark= currentVideoBookmarks[i];
      addnewBookmark(bookmarksElement, bookmark);
    }
  }else{
    bookmarksElement.innerHTML='<i class="row">there is no bookmarks</i>';
  }

}

// ---------- IA : résumé et questions (transcript → Worker) ----------

const formatTime = (s) => {
  const h = Math.floor(s / 3600);
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(Math.floor(s % 60)).padStart(2, "0");
  return h ? `${h}:${m}:${sec}` : `${m}:${sec}`;
};

// Lit le transcript dans la page, l'envoie au Worker, renvoie le résultat
const askWorker = async (action, extra = {}) => {
  const tab = await getActiveTabURL();
  const videoId = getVideoId(tab);

  let tr;
  try {
    tr = await chrome.tabs.sendMessage(tab.id, { type: "GET_TRANSCRIPT" });
  } catch {
    throw new Error("Recharge l'onglet YouTube puis réessaie.");
  }
  if (!tr || tr.error) throw new Error("Cette vidéo n'a pas de transcription disponible.");

  let res;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, videoId, transcript: tr.transcript, lang: "fr", ...extra }),
    });
  } catch {
    throw new Error("Serveur injoignable. Vérifie que le Worker tourne.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Erreur du serveur.");
  return data;
};

// Liste de moments avec bouton ▶ (réutilise le message PLAY existant)
const renderMoments = (container, moments = []) => {
  for (const { time, label } of moments) {
    const row = document.createElement("div");
    row.className = "moment";

    const btn = document.createElement("button");
    btn.className = "moment-play";
    btn.textContent = `▶ ${formatTime(time)}`;
    btn.addEventListener("click", async () => {
      const tab = await getActiveTabURL();
      chrome.tabs.sendMessage(tab.id, { type: "PLAY", value: time }).catch(() => {});
    });

    const text = document.createElement("span");
    text.textContent = label; // textContent : le texte de l'IA ne peut pas injecter de HTML

    row.append(btn, text);
    container.appendChild(row);
  }
};

const renderResult = (out, paragraph, moments) => {
  out.innerHTML = "";
  const para = document.createElement("p");
  para.className = "ai-text";
  para.textContent = paragraph;
  out.appendChild(para);
  renderMoments(out, moments);
};

const setupAI = () => {
  const out = document.getElementById("ai-output");
  const sumBtn = document.getElementById("summarize-btn");
  const askBtn = document.getElementById("ask-btn");
  const askInput = document.getElementById("ask-input");
  if (!out || !sumBtn || !askBtn || !askInput) return; // popup.html pas encore mis à jour

  const run = async (task) => {
    sumBtn.disabled = askBtn.disabled = true;
    out.textContent = "Analyse en cours…";
    try {
      await task();
    } catch (e) {
      out.textContent = "⚠️ " + e.message;
    } finally {
      sumBtn.disabled = askBtn.disabled = false;
    }
  };

  sumBtn.addEventListener("click", () =>
    run(async () => {
      const tab = await getActiveTabURL();
      const key = "summary:" + getVideoId(tab);

      // cache : on ne rappelle pas l'IA pour une vidéo déjà résumée
      let result = (await chrome.storage.local.get(key))[key];
      if (!result) {
        result = await askWorker("summary");
        await chrome.storage.local.set({ [key]: result });
      }
      renderResult(out, result.summary, result.chapters);
    })
  );

  const onAsk = () => {
    const question = askInput.value.trim();
    if (!question) return;
    run(async () => {
      const data = await askWorker("ask", { question });
      renderResult(out, data.answer, data.moments);
    });
  };
  askBtn.addEventListener("click", onAsk);
  askInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") onAsk();
  });
};

document.addEventListener("DOMContentLoaded", async () =>{
  const activeTab=await  getActiveTabURL();
  const queryParamaters= activeTab.url.split("?")[1];
  const urlParamaters= new URLSearchParams(queryParamaters);
  const currentVideo= urlParamaters.get("v");

  if(activeTab.url.includes("youtube.com/watch") && currentVideo){
    chrome.storage.sync.get([currentVideo], (data)=>{
      const currentVideoBookmarks= data[currentVideo]?JSON.parse(data[currentVideo]):[];
      //viewallBookmarks
      viewBookmarks(currentVideoBookmarks);
    });
    setupAI();
  } else {
    //afficher le message que ce n'est pas une page youtube
    const container= document.getElementsByClassName("container")[0];
    container.innerHTML = '<div class="title">This is not a youtube page</div>';
  }
})
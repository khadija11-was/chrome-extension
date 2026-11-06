// Adresse du Worker : local pendant le développement, à remplacer après le déploiement
const API_URL = "http://localhost:8787";

let currentVideoId = null;

const $ = (id) => document.getElementById(id);

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

// ---------- Utilitaires ----------

// Le panneau n'est lié à aucune fenêtre précise : on cible la dernière fenêtre active
const getActiveTab = async () => {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab;
};

const parseVideoId = (url = "") => {
  try {
    const u = new URL(url);
    if (u.hostname === "www.youtube.com" && u.pathname === "/watch") {
      return u.searchParams.get("v");
    }
  } catch {
    /* URL invalide : pas une vidéo */
  }
  return null;
};

const formatTime = (s) => {
  const h = Math.floor(s / 3600);
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(Math.floor(s % 60)).padStart(2, "0");
  return h ? `${h}:${m}:${sec}` : `${m}:${sec}`;
};

// Envoie un message au content script de l'onglet actif (null si injoignable)
const sendToTab = async (message) => {
  const tab = await getActiveTab();
  if (!tab) return null;
  try {
    return await chrome.tabs.sendMessage(tab.id, message);
  } catch {
    console.warn("content script pas encore injecté");
    return null;
  }
};

const loadBookmarks = (videoId) =>
  new Promise((resolve) => {
    chrome.storage.sync.get([videoId], (data) => {
      resolve(data[videoId] ? JSON.parse(data[videoId]) : []);
    });
  });

// ---------- Bookmarks ----------

const iconButton = (name, label, onClick) => {
  const btn = el("button", "icon-btn");
  btn.title = label;
  btn.setAttribute("aria-label", label);
  const img = document.createElement("img");
  img.src = `assets/${name}.png`;
  img.alt = "";
  btn.append(img);
  btn.addEventListener("click", onClick);
  return btn;
};

const startRename = (titleEl, bookmark) => {
  if (titleEl.querySelector("input")) return; // déjà en édition

  const oldTitle = bookmark.desc;
  const input = el("input", "bookmark-title-input");
  input.type = "text";
  input.value = oldTitle;
  input.maxLength = 100;

  titleEl.textContent = "";
  titleEl.append(input);
  input.focus();
  input.select();

  let finished = false;
  const finish = async (save) => {
    if (finished) return; // évite le double déclenchement Enter + blur
    finished = true;

    const newTitle = input.value.trim();
    if (!save || newTitle === "" || newTitle === oldTitle) {
      titleEl.textContent = oldTitle;
      return;
    }

    titleEl.textContent = newTitle;
    const list = await sendToTab({ type: "RENAME", value: bookmark.time, desc: newTitle });
    if (Array.isArray(list)) renderBookmarks(list);
  };

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") finish(true);
    if (e.key === "Escape") finish(false);
  });
  input.addEventListener("blur", () => finish(true));
};

const createCard = (bookmark) => {
  const card = el("div", "bookmark");

  const pill = el("span", "time-pill", formatTime(bookmark.time));

  const title = el("div", "bookmark-title", bookmark.desc);
  title.title = "Cliquer pour renommer";
  title.addEventListener("click", () => startRename(title, bookmark));

  const controls = el("div", "bookmark-controls");
  controls.append(
    iconButton("play", "Aller à ce moment", () =>
      sendToTab({ type: "PLAY", value: bookmark.time })
    ),
    iconButton("delete", "Supprimer", async () => {
      const list = await sendToTab({ type: "DELETE", value: bookmark.time });
      if (Array.isArray(list)) renderBookmarks(list);
    })
  );

  card.append(pill, title, controls);
  return card;
};

const renderBookmarks = (list = []) => {
  const box = $("bookmarks");
  box.textContent = "";
  $("bookmark-count").textContent = list.length;

  if (!list.length) {
    box.append(el("p", "empty-note", "Aucun bookmark. Appuie sur Alt+S pendant la lecture pour en ajouter un."));
    return;
  }
  list.forEach((b) => box.append(createCard(b)));
};

// ---------- Assistant IA (transcript → Worker) ----------

// Lit le transcript dans la page, l'envoie au Worker, renvoie le résultat
const askWorker = async (videoId, action, extra = {}) => {
  const tab = await getActiveTab();
  if (!tab || parseVideoId(tab.url) !== videoId) {
    throw new Error("La vidéo a changé, relance l'analyse.");
  }

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

// Liste de moments avec bouton ▶ (réutilise le message PLAY du content script)
const renderMoments = (container, moments = []) => {
  for (const { time, label } of moments) {
    const row = el("div", "moment");

    const btn = el("button", "moment-play", `▶ ${formatTime(time)}`);
    btn.addEventListener("click", () => sendToTab({ type: "PLAY", value: time }));

    // textContent : le texte de l'IA ne peut pas injecter de HTML
    row.append(btn, el("span", "", label));
    container.append(row);
  }
};

const renderResult = (paragraph, moments) => {
  const out = $("ai-output");
  out.textContent = "";
  out.append(el("p", "ai-text", paragraph));
  renderMoments(out, moments);
};

const resetAI = () => {
  $("ai-output").textContent = "";
  $("ask-input").value = "";
};

// Si la vidéo a déjà été résumée, on affiche le résumé tout de suite
const showCachedSummary = async (videoId) => {
  const key = "summary:" + videoId;
  const result = (await chrome.storage.local.get(key))[key];
  if (result && videoId === currentVideoId) renderResult(result.summary, result.chapters);
};

const setupAI = () => {
  const out = $("ai-output");
  const sumBtn = $("summarize-btn");
  const askBtn = $("ask-btn");
  const askInput = $("ask-input");

  const setBusy = (busy) => {
    sumBtn.disabled = askBtn.disabled = busy;
  };

  const run = async (task) => {
    const vid = currentVideoId;
    setBusy(true);
    out.textContent = "Analyse en cours…";
    try {
      await task(vid);
    } catch (e) {
      if (vid === currentVideoId) out.textContent = "⚠️ " + e.message;
    } finally {
      setBusy(false);
    }
  };

  sumBtn.addEventListener("click", () =>
    run(async (vid) => {
      const key = "summary:" + vid;
      let result = (await chrome.storage.local.get(key))[key];
      if (!result) {
        result = await askWorker(vid, "summary");
        await chrome.storage.local.set({ [key]: result });
      }
      // le panneau reste ouvert : on n'affiche que si l'utilisateur est toujours sur cette vidéo
      if (vid === currentVideoId) renderResult(result.summary, result.chapters);
    })
  );

  const onAsk = () => {
    const question = askInput.value.trim();
    if (!question) return;
    run(async (vid) => {
      const data = await askWorker(vid, "ask", { question });
      if (vid === currentVideoId) renderResult(data.answer, data.moments);
    });
  };
  askBtn.addEventListener("click", onAsk);
  askInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") onAsk();
  });
};

// ---------- Synchronisation avec l'onglet actif ----------

const refresh = async () => {
  const tab = await getActiveTab();
  const videoId = tab ? parseVideoId(tab.url) : null;

  if (!videoId) {
    currentVideoId = null;
    $("main").classList.add("hidden");
    $("not-youtube").classList.remove("hidden");
    $("video-title").textContent = "";
    return;
  }

  $("not-youtube").classList.add("hidden");
  $("main").classList.remove("hidden");
  $("video-title").textContent = (tab.title ?? "")
    .replace(/^\(\d+\)\s*/, "")
    .replace(/\s*-\s*YouTube$/, "");

  const changed = videoId !== currentVideoId;
  currentVideoId = videoId;

  const list = await loadBookmarks(videoId);
  if (videoId !== currentVideoId) return; // l'utilisateur a déjà changé de vidéo
  renderBookmarks(list);

  if (changed) {
    resetAI();
    await showCachedSummary(videoId);
  }
};

// Changement d'onglet
chrome.tabs.onActivated.addListener(refresh);

// Navigation dans l'onglet actif (YouTube change de vidéo sans recharger la page)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && (changeInfo.url || changeInfo.title || changeInfo.status === "complete")) {
    refresh();
  }
});

// Mise à jour en direct : un bookmark ajouté avec Alt+S ou le bouton du lecteur apparaît tout de suite
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync" || !currentVideoId || !changes[currentVideoId]) return;
  if ($("bookmarks").querySelector("input")) return; // renommage en cours : on ne casse pas la saisie
  const value = changes[currentVideoId].newValue;
  renderBookmarks(value ? JSON.parse(value) : []);
});

setupAI();
refresh();
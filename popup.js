//we have to add play the bookmark and delete the bookmark
import {getActiveTabURL} from "./utils.js";

//cette methode permet de créer l'element complet qui range les bookmarks d'un video
const addnewBookmark= (bookmarksElement, bookmark)=>{
  const bookTitleElement= document.createElement("div");
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
    })
  } else {
    //afficher le message que ce n'est pas une page youtube
    const container= document.getElementsByClassName("container")[0];
    container.innerHTML = '<div class="title">This is not a youtube page</div>';
  }
})

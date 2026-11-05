(() => {
  console.log("YouTube Bookmark extension script loaded ✅");
  let youtubeLeftControls, youtubePlayer;
  let currentVideo = "";
  let bookmarkBtnExists = false;
  let currentVideoBookmarks=[];

  const addNewBookmarkEventHandler = async () => {
    const currentTime = youtubePlayer ? youtubePlayer.currentTime : 0;
    const newBookmark = {
      time: currentTime,
      desc: "Bookmark at " + getTime(currentTime),
    };
    currentVideoBookmarks= await fetchBookmarks(); //pour que le stockage de nouvelle bookmark sera dans le tableau updaté
    console.log("Bookmark added at:", currentTime);
    console.log(newBookmark);
    currentVideoBookmarks = [...currentVideoBookmarks, newBookmark].sort((a, b) => a.time - b.time);
    chrome.storage.sync.set({
      [currentVideo]: JSON.stringify(currentVideoBookmarks)
    });
    showToast("✅ Bookmark added at " + getTime(currentTime));
  };

  // Fonction utilitaire pour formater le temps
  const getTime = (t) => {
    const date = new Date(0);
    date.setSeconds(t);
    return date.toISOString().slice(11, 19);
  };
  // fonction pour ajouter un msg de popup lors d'ajout de new bookmark
  const showToast = (message) => {
    // Un seul toast à la fois
    const existing = document.getElementById("yt-bookmark-toast");
    if (existing) existing.remove();

    // Rattaché au lecteur pour rester visible en plein écran
    const player = document.querySelector(".html5-video-player");
    if (!player) return;

    const toast = document.createElement("div");
    toast.id = "yt-bookmark-toast";
    toast.textContent = message;

    Object.assign(toast.style, {
      position: "absolute",
      top: "16px",
      left: "16px",
      padding: "8px 14px",
      background: "rgba(0, 0, 0, 0.8)",
      color: "#fff",
      fontSize: "14px",
      fontFamily: "Roboto, Arial, sans-serif",
      borderRadius: "6px",
      zIndex: "9999",
      pointerEvents: "none",
      opacity: "0",
      transition: "opacity 0.25s ease",
    });

    player.appendChild(toast);

    // Fondu à l'apparition
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
    });

    // Fondu à la disparition puis suppression
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 250);
    }, 2000);
  };

  const newVideoLoaded = async () => {
    // Réinitialiser le flag pour une nouvelle vidéo
    bookmarkBtnExists = false;
    currentVideoBookmarks= await fetchBookmarks();
    
    // Attendre que les contrôles YouTube soient disponibles
    const checkForControls = setInterval(() => {
      youtubeLeftControls = document.getElementsByClassName("ytp-left-controls")[0];
      youtubePlayer = document.getElementsByClassName("video-stream")[0];
      
      if (youtubeLeftControls && youtubePlayer) {
        clearInterval(checkForControls);
        addBookmarkButton();
      }
    }, 500);
  };

  const addBookmarkButton = () => {
    // Vérifier si le bouton existe déjà
    const existingBtn = document.getElementsByClassName("bookmark-btn")[0];
    
    if (!existingBtn) {
      // Créer le bouton de bookmark
      const bookmarkBtn = document.createElement("img");
      bookmarkBtn.src = chrome.runtime.getURL("assets/bookmark.png");
      bookmarkBtn.className = "ytp-button bookmark-btn";
      bookmarkBtn.title = "Click to bookmark current timestamp";
      
      // Styles pour s'adapter au thème sombre/clair
      bookmarkBtn.style.width = "20px";
      bookmarkBtn.style.height = "20px";
      bookmarkBtn.style.marginTop= "1px";
      bookmarkBtn.style.marginLeft = "3px";
      bookmarkBtn.style.cursor = "pointer";
      bookmarkBtn.style.filter = "invert(1) brightness(2)"; // Rend l'icône visible sur fond sombre
      bookmarkBtn.style.opacity = "0.9";
      bookmarkBtn.style.transition = "opacity 0.2s ease";

      // Effet au survol
      bookmarkBtn.addEventListener("mouseenter", () => {
        bookmarkBtn.style.opacity = "1";
      });
      bookmarkBtn.addEventListener("mouseleave", () => {
        bookmarkBtn.style.opacity = "0.9";
      });

      try {
        youtubeLeftControls.appendChild(bookmarkBtn);
        bookmarkBtnExists = true;
        console.log("Bookmark button added successfully ✅");
        
        // Ajouter l'event listener
        bookmarkBtn.addEventListener("click", addNewBookmarkEventHandler);
      } catch (e) {
        console.error("Le bouton n'a pas pu être ajouté", e);
      }
    }
  };

  // Écouter les messages du background script
  chrome.runtime.onMessage.addListener((obj, sender, response) => {
    const { type, value, videoId, desc } = obj;
    if (type === "NEW") {
      currentVideo = videoId;
      console.log("New YouTube video detected:", videoId);
      newVideoLoaded();
    }else if(type === "PLAY"){
      youtubePlayer.currentTime= value;
      console.log("button play clické");
    }else if(type === "DELETE"){
      currentVideoBookmarks=currentVideoBookmarks.filter((b)=> b.time!= value);
      chrome.storage.sync.set({[currentVideo]: JSON.stringify(currentVideoBookmarks)});
      //pour avoir les nouveaux bookmarks dans le popup
      response(currentVideoBookmarks);
    }else if (type === "ADD_BOOKMARK") {
      addNewBookmarkEventHandler();
    }else if (type === "RENAME") {
      currentVideoBookmarks = currentVideoBookmarks.map((b) =>
        b.time == value ? { ...b, desc } : b
      );
      chrome.storage.sync.set({[currentVideo]: JSON.stringify(currentVideoBookmarks)});
      response(currentVideoBookmarks);
    }
  });
  const fetchBookmarks= ()=>{
    return new Promise((resolve)=>{
      chrome.storage.sync.get([currentVideo], (obj)=>{
        resolve(obj[currentVideo]? JSON.parse(obj[currentVideo]): []); //si il existe des bookmarks pour ce video on les parser sinon retourne un tableau vide
      });
    })
  }

  // Vérifier si une vidéo est déjà chargée au démarrage
  if (window.location.hostname === "www.youtube.com" && 
      window.location.pathname === "/watch") {
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v');
    if (videoId) {
      currentVideo = videoId;
      // Attendre que la page soit complètement chargée
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', newVideoLoaded);
      } else {
        setTimeout(newVideoLoaded, 1000);
      }
    }
  }
})();
// alors maintenant on dois ajouter un listner sur le click du bookmark

//À quel moment il parle de X ?” → l’IA répond et ton bouton ▶
//resumé du video

//add a chrome tab listner 
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab)=>{
  if(changeInfo.status=== "complete" && tab.url && tab.url.includes("youtube.com/watch")){
    const queryParamaters=tab.url.split("?")[1];
    const urlParamaters=new URLSearchParams(queryParamaters);
    console.log(urlParamaters);
    //send a message from the background script to the contentScript
    chrome.tabs.sendMessage(tabId,{
      type:"NEW",
      videoId: urlParamaters.get("v"),
    }).catch(err=>{
      console.warn("Content script pas encore chargé → ignoré");
    });

  }
})
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "add-bookmark") return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.includes("youtube.com/watch")) return;

  chrome.tabs.sendMessage(tab.id, { type: "ADD_BOOKMARK" }).catch(() => {
    console.warn("Content script pas encore chargé → ignoré");
  });
});

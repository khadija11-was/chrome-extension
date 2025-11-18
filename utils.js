// pour ui on va lister tous les bookmarks de chrome.storage si la page est youtube sinon afficher un message
  export async function getActiveTabURL() {
    let queryOptions = { active: true, lastFocusedWindow: true };
    // `tab` will either be a `tabs.Tab` instance or `undefined`.
    let [tab] = await chrome.tabs.query(queryOptions);
    return tab;
  }
/* global browser */

let wasActive = new Set();

browser.tabs.onUpdated.addListener( (tabId,changeInfo,tab) => {

    // ignore
    if( !(tab.active ||
          tab.hidden ||
          tab.discarded ||
          wasActive.has(tabId))
    ){
        browser.tabs.discard(tabId);
    }

}, {properties: ["status"]});

browser.tabs.onActivated.addListener( (activeInfo) => {
    if(!wasActive.has(activeInfo.tabId)){
        wasActive.add(activeInfo.tabId);
    }
});

browser.tabs.onRemoved.addListener( tabId => {
    if(wasActive.has(tabId)){
        wasActive.delete(tabId);
    }
});


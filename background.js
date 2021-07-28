
let wasActive = new Set();

browser.tabs.onUpdated.addListener( (tabId,changeInfo,tab) => {

	// ignore
	if(tab.active) { return; }   
	if(tab.hidden) { return; }    
	if(tab.discarded) { return; } 
	if(wasActive.has(tabId)){ return; } 

	browser.tabs.discard(tabId);

}, {properties: ["status"]});


browser.tabs.onActivated.addListener( (activeInfo) => {
	wasActive.add(activeInfo.tabId);
});

browser.tabs.onRemoved.addListener( (tabId, removeInfo) => {
	wasActive.delete(tabId);
});




let was_activ_once = new Set();

browser.tabs.onUpdated.addListener( (tabId,changeInfo,tab) => {

	// 
	if(was_activ_once.has(tabId)){ return; }

	if(tab.active) { return; }

	if(tab.discarded){ return; }

	browser.tabs.discard(tabId);
}, {properties: ["status"]});


browser.tabs.onActivated.addListener( (activeInfo) => {
	was_activ_once.add(activeInfo.tabId);
});

browser.tabs.onRemoved.addListener( (tabId, removeInfo) => {
	was_activ_once.delete(tabId);
});



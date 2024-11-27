/* global browser */

async function getFromStorage(type, id, fallback) {
  let tmp = await browser.storage.local.get(id);
  return typeof tmp[id] === type ? tmp[id] : fallback;
}

async function setToStorage(id, value) {
  let obj = {};
  obj[id] = value;
  return browser.storage.local.set(obj);
}

(async () => {
  const temporary = browser.runtime.id.endsWith("@temporary-addon"); // debugging?
  const manifest = browser.runtime.getManifest();
  const extname = manifest.name;
  let manually_disabled = false;

  async function getMode() {
    return await getFromStorage("boolean", "mode", false);
  }

  async function getRegexList() {
    let out = [];
    let tmp = await getFromStorage("string", "matchers", "");

    tmp.split("\n").forEach((line) => {
      line = line.trim();
      if (line !== "") {
        try {
          line = new RegExp(line.trim());
          out.push(line);
        } catch (e) {
          console.error(e);
        }
      }
    });
    return out;
  }

  function matchesRegEx(url) {
    for (let i = 0; i < regexList.length; i++) {
      if (regexList[i].test(url)) {
        return true;
      }
    }
    return false;
  }

  async function onStorageChange(/*changes, area*/) {
    mode = await getMode();
    regexList = await getRegexList();
  }

  await onStorageChange();

  // -------------------------------

  let wasActive = new Set();

  browser.tabs.onUpdated.addListener(
    (tabId, changeInfo, tab) => {
      // ignore
      if (
        !(
          tab.active ||
          tab.hidden ||
          tab.discarded ||
          wasActive.has(tabId) ||
          manually_disabled ||
          !changeInfo.url.startsWith("http")
        )
      ) {
        const mre = matchesRegEx(tab.url);

        if (
          (mode && mre) || // blacklist(true) => matches are not allowed to load
          (!mode && !mre) // whitelist(false) => matches are allowed to load <=> no match => not allowed
        ) {
          browser.tabs.discard(tabId);
          // console.debug("discarded", tab.url);
        }
      }
    },
    { properties: ["url"] },
  );

  browser.tabs.onActivated.addListener((activeInfo) => {
    if (!wasActive.has(activeInfo.tabId)) {
      wasActive.add(activeInfo.tabId);
    }
  });

  browser.tabs.onRemoved.addListener((tabId) => {
    if (wasActive.has(tabId)) {
      wasActive.delete(tabId);
    }
  });

  browser.storage.onChanged.addListener(onStorageChange);
  browser.browserAction.onClicked.addListener(() => {
    if (manually_disabled) {
      //
      manually_disabled = false;
      browser.browserAction.setBadgeText({ text: "on" });
      browser.browserAction.setBadgeBackgroundColor({
        color: [0, 115, 0, 115],
      });
    } else {
      //
      manually_disabled = true;
      browser.browserAction.setBadgeText({ text: "off" });
      browser.browserAction.setBadgeBackgroundColor({
        color: [115, 0, 0, 115],
      });
    }
  });

  browser.browserAction.setTitle({ title: "Toggle tab background loading" });
  browser.browserAction.setBadgeText({ text: "on" });
  browser.browserAction.setBadgeBackgroundColor({ color: [0, 115, 0, 115] });
})();

browser.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    browser.runtime.openOptionsPage();
  } else {
    // Migrate old data
    let tmp = await getFromStorage("object", "selectors", []);
    tmp = tmp.map((e) => e.url_regex).join("\n");
    await setToStorage("matchers", tmp);
  }
});

/* global browser */

(async () => {
  const temporary = browser.runtime.id.endsWith("@temporary-addon"); // debugging?
  const manifest = browser.runtime.getManifest();
  const extname = manifest.name;
  let manually_disabled = false;

  const log = (level, msg) => {
    level = level.trim().toLowerCase();
    if (
      ["error", "warn"].includes(level) ||
      (temporary && ["debug", "info", "log"].includes(level))
    ) {
      console[level](extname + "::" + level.toUpperCase() + "::" + msg);
      return;
    }
  };

  async function getMode() {
    //log("debug", "getMode");
    let store = undefined;
    try {
      store = await browser.storage.local.get("mode");
    } catch (e) {
      log("error", "access to storage failed");
      return false;
    }
    if (typeof store === "undefined") {
      log("debug", "store is undefined");
      return false;
    }
    if (typeof store.mode !== "boolean") {
      log("debug", "store.mode is not boolean");
      return false;
    }
    return store.mode;
  }

  async function getRegexList() {
    //log("debug", "getRegexList");

    let store = undefined;
    try {
      store = await browser.storage.local.get("selectors");
    } catch (e) {
      log("error", "access to storage failed");
      return [];
    }

    if (typeof store === "undefined") {
      log("debug", "store is undefined");
      return [];
    }

    if (typeof store.selectors === "undefined") {
      log("debug", "store.selectors is undefined");
      return [];
    }

    if (typeof store.selectors.forEach !== "function") {
      log("error", "store.selectors is not iterable");
      return [];
    }

    const l = [];

    store.selectors.forEach((e) => {
      // check activ
      if (typeof e.activ !== "boolean") {
        return;
      }
      if (e.activ !== true) {
        return;
      }

      // check url regex
      if (typeof e.url_regex !== "string") {
        return;
      }
      e.url_regex = e.url_regex.trim();
      if (e.url_regex === "") {
        return;
      }

      try {
        //log("debug", e.url_regex);
        l.push(new RegExp(e.url_regex));
      } catch (e) {
        log("WARN", "invalid url regex : " + e.url_regex);
        return;
      }
    });

    return l;
  }

  function matchesRegEx(url) {
    for (let i = 0; i < regexList.length; i++) {
      if (regexList[i].test(url)) {
        //log("debug", "matchesRegEx: " + url);
        return true;
      }
    }
    return false;
  }

  async function onStorageChange(/*changes, area*/) {
    //log("debug", "onStorageChange");
    mode = await getMode();
    regexList = await getRegexList();
  }

  let mode = await getMode();
  let regexList = await getRegexList();

  // -------------------------------

  let wasActive = new Set();

  browser.tabs.onUpdated.addListener(
    (tabId, changeInfo, tab) => {
      //log("DEBUG", "onUpdated" + JSON.stringify(changeInfo, null, 4));

      // ignore
      if (
        !(
          tab.active ||
          tab.hidden ||
          tab.discarded ||
          wasActive.has(tabId) ||
          manually_disabled
        )
      ) {
        log("DEBUG", "mode:" + mode);
        const mre = matchesRegEx(tab.url);
        log("DEBUG", "mre:" + mre);

        if (
          (!mode && !mre) || // whitelist => matches are allowed to load <=> no match => not allowed
          (mode && mre) // blacklist => matches are not allowed to load
        ) {
          browser.tabs.discard(tabId);
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

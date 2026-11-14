"use strict";
(() => {
  // ../../shared/src/utilities/url-guard.ts
  var GAMBLING_LABELS = [
    "gemwin",
    "haywin",
    "uk88",
    "hitclub",
    "win79",
    "sunwin",
    "yo88",
    "rikvip",
    "go88",
    "bet88",
    "tic88",
    "zowin",
    "zo88",
    "cacuoc",
    "gamebai",
    "nhacai",
    "vsbet",
    "sun88",
    "sun",
    "f8bet",
    "jun88",
    "new88",
    "shbet",
    "hi88",
    "789bet",
    "okvip",
    "kubet",
    "thabet"
  ];
  var ADULT_LABELS = [
    "pornhub",
    "xvideos",
    "xnxx",
    "vlxx",
    "phimsex",
    "hentai",
    "sextop1",
    "sex",
    "javhd",
    "jav",
    "lauxanh",
    "thichxemsex",
    "clipsex",
    "phimxxx",
    "xxx",
    "chaturbate",
    "onlyfans",
    "stripchat",
    "xhamster",
    "redtube"
  ];
  var LABEL_SUFFIX = "[0-9-]*";
  function buildLabelRegex(labels) {
    return new RegExp(`^(?:${labels.join("|")})${LABEL_SUFFIX}$`);
  }
  var GAMBLING_RE = buildLabelRegex(GAMBLING_LABELS);
  var ADULT_RE = buildLabelRegex(ADULT_LABELS);

  // src/content_isolated.ts
  var SHIELD_ID = "shiori-instant-shield";
  var COSMETIC_ID = "shiori-cosmetic-styles";
  var SHIELD_SELECTORS = [
    '[class*="catfish"]',
    '[id*="catfish"]',
    '[class*="popup-banner"]',
    '[id*="popup-banner"]',
    '[class*="floating-ad"]',
    '[id*="floating-ad"]',
    '[class*="ad-sticky"]',
    '[id*="ad-sticky"]',
    '[class*="ads-holder"]',
    '[id*="ads-holder"]',
    '[class*="banner-ads"]',
    '[id*="banner-ads"]',
    '[class*="adv-"]',
    '[class*="-adv"]',
    'div[class*="banner"] a',
    'div[id*="banner"] a',
    'a[href*="pc-catfish"]',
    'a[href*="topbanner"]',
    'a[href*="vsbet"]',
    'a[href*="sun88"]',
    'a[href*="sunwin"]',
    'a[href*="go88"]',
    'a[href*="hitclub"]',
    'img[src*="vsbet"]',
    'img[src*="sun88"]',
    'img[src*="sunwin"]',
    'img[src*="banner"]',
    'img[alt*="vsbet"]',
    'img[alt*="sun88"]',
    // Link tới domain cờ bạc & 18+
    ...GAMBLING_LABELS.flatMap((l) => [`a[href*="//${l}"]`, `a[href*=".${l}"]`, `a[href*="/${l}"]`, `img[src*="${l}"]`]),
    ...ADULT_LABELS.flatMap((l) => [`a[href*="//${l}"]`, `a[href*=".${l}"]`, `a[href*="/${l}"]`]),
    'iframe[src*="popads"]',
    'iframe[src*="clickadu"]',
    'iframe[src*="ads"]',
    // Quảng cáo YouTube ngoài luồng video & Hộp thoại Anti-Adblock
    ".ytp-ad-message-container",
    "ytd-ad-slot-renderer",
    "#player-ads",
    "ytd-banner-promo-renderer",
    "ytd-in-feed-ad-layout-renderer",
    "ytd-enforcement-message-view-model",
    "tp-yt-paper-dialog:has(#feedback)",
    ".yt-playability-error-supported-renderers"
  ];
  var SHIELD_CSS = `${SHIELD_SELECTORS.join(",\n")} {
  display: none !important;
  pointer-events: none !important;
}`;
  var hostname = location.hostname;
  var enabled = true;
  var cosmeticCss = "";
  function mount(id, css) {
    if (!css) return;
    let style = document.getElementById(id);
    if (!style) {
      style = document.createElement("style");
      style.id = id;
      (document.head ?? document.documentElement).appendChild(style);
    }
    style.textContent = css;
  }
  function unmount(id) {
    document.getElementById(id)?.remove();
  }
  function applyState() {
    if (enabled) {
      mount(SHIELD_ID, SHIELD_CSS);
      mount(COSMETIC_ID, cosmeticCss);
    } else {
      unmount(SHIELD_ID);
      unmount(COSMETIC_ID);
    }
  }
  function send(message, cb) {
    try {
      chrome.runtime.sendMessage(message, (res) => {
        void chrome.runtime.lastError;
        cb?.(res);
      });
    } catch {
    }
  }
  applyState();
  chrome.storage.local.get("shiori_enabled", (r) => {
    if (typeof r?.shiori_enabled === "boolean") {
      enabled = r.shiori_enabled;
      applyState();
    }
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.shiori_enabled) {
      enabled = changes.shiori_enabled.newValue !== false;
      applyState();
    }
  });
  send({ type: "GET_COSMETIC_CSS", payload: { hostname } }, (res) => {
    if (typeof res?.css === "string") {
      cosmeticCss = res.css;
      if (enabled) mount(COSMETIC_ID, cosmeticCss);
    }
  });
  var pendingBlocked = 0;
  var flushTimer = null;
  window.addEventListener("message", (event) => {
    if (event.source !== window || !enabled) return;
    const d = event.data;
    if (d?.source !== "shiori-main" || d.type !== "SHIORI_POPUP_BLOCKED" && d.type !== "SHIORI_CLICK_BLOCKED") return;
    pendingBlocked++;
    flushTimer ??= setTimeout(() => {
      send({ type: "INCREMENT_REDIRECT_BLOCKED", payload: { count: pendingBlocked } });
      pendingBlocked = 0;
      flushTimer = null;
    }, 1e3);
  });
  function countHiddenAds() {
    if (!enabled) return;
    try {
      const list = document.querySelectorAll(SHIELD_SELECTORS.join(","));
      let hiddenCount = 0;
      list.forEach((el) => {
        const htmlEl = el;
        if (htmlEl.style.display !== "none") {
          htmlEl.style.setProperty("display", "none", "important");
        }
        hiddenCount++;
      });
      if (hiddenCount > 0) {
        console.log(`[Shiori Shield] \u0110\xE3 d\u1ECDn d\u1EB9p ${hiddenCount} ph\u1EA7n t\u1EED qu\u1EA3ng c\xE1o tr\xEAn trang.`);
        send({ type: "INCREMENT_DOM_HIDDEN", payload: { count: hiddenCount } });
      }
    } catch (e) {
      console.debug("[Shiori Shield] Error counting elements:", e);
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", countHiddenAds, { once: true });
  } else {
    countHiddenAds();
  }
  window.addEventListener("load", countHiddenAds, { once: true });
  setTimeout(countHiddenAds, 2e3);
})();
//# sourceMappingURL=content_isolated.js.map

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
  var AD_NETWORK_DOMAINS = [
    "popads.net",
    "clickadu.com",
    "adsterra.com",
    "propellerads.com",
    "6789x.site"
  ];
  var LABEL_SUFFIX = "[0-9-]*";
  function buildLabelRegex(labels) {
    return new RegExp(`^(?:${labels.join("|")})${LABEL_SUFFIX}$`);
  }
  var GAMBLING_RE = buildLabelRegex(GAMBLING_LABELS);
  var ADULT_RE = buildLabelRegex(ADULT_LABELS);
  function isSameOrSubdomain(host, domain) {
    const h = host.toLowerCase();
    const d = domain.toLowerCase();
    return h === d || h.endsWith("." + d);
  }
  function isSameSite(hostA, hostB) {
    return isSameOrSubdomain(hostA, hostB) || isSameOrSubdomain(hostB, hostA);
  }
  function classifyBlockedHost(hostname) {
    const host = hostname.toLowerCase().replace(/\.$/, "");
    if (!host) return null;
    if (AD_NETWORK_DOMAINS.some((d) => isSameOrSubdomain(host, d))) return "ad-network";
    const labels = host.split(".");
    const body = labels.length > 1 ? labels.slice(0, -1) : labels;
    for (const label of body) {
      if (GAMBLING_RE.test(label)) return "gambling";
      if (ADULT_RE.test(label)) return "adult";
    }
    return null;
  }
  function isBlockedUrl(rawUrl, base) {
    if (!rawUrl) return false;
    try {
      const u = new URL(rawUrl, base);
      if (u.protocol !== "http:" && u.protocol !== "https:") return false;
      return classifyBlockedHost(u.hostname) !== null;
    } catch {
      return false;
    }
  }

  // src/content_main.ts
  (() => {
    const notify = (type) => window.postMessage({ source: "shiori-main", type }, "*");
    const nativeOpen = window.open;
    function guardedOpen(url, target, features) {
      const href = url == null ? "" : String(url);
      let blocked = isBlockedUrl(href, location.href);
      if (!blocked && href) {
        try {
          const targetHost = new URL(href, location.href).hostname;
          const hasActivation = navigator.userActivation?.isActive ?? true;
          blocked = !hasActivation && !isSameSite(targetHost, location.hostname);
        } catch {
        }
      }
      if (blocked) {
        notify("SHIORI_POPUP_BLOCKED");
        return null;
      }
      return nativeOpen.call(window, url, target, features);
    }
    Object.defineProperty(guardedOpen, "name", { value: "open" });
    try {
      window.open = guardedOpen;
    } catch {
    }
    function findAnchor(event) {
      for (const node of event.composedPath()) {
        if (node instanceof HTMLAnchorElement && node.hasAttribute("href")) return node;
      }
      return null;
    }
    function onActivate(event) {
      const anchor = findAnchor(event);
      if (!anchor) return;
      const href = anchor.href || "";
      if (isBlockedUrl(href) || /zo88|vsbet|sun88|sunwin|hitclub|go88|gemwin|uk88|pornhub|xvideos|xnxx|vlxx|phimsex|hentai|sex/i.test(href)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        console.log("[Shiori Shield] \u{1F6AB} \u0110\xE3 ch\u1EB7n click v\xE0o link qu\u1EA3ng c\xE1o/c\u1EDD b\u1EA1c/18+:", href);
        notify("SHIORI_CLICK_BLOCKED");
      }
    }
    window.addEventListener("click", onActivate, true);
    window.addEventListener("auxclick", onActivate, true);
  })();
})();
//# sourceMappingURL=content_main.js.map

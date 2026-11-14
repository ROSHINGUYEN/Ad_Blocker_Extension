"use strict";
(() => {
  // src/content_youtube.ts
  (() => {
    const AD_CLASSES = ["ad-showing", "ad-interrupting"];
    const SKIP_SELECTOR = ".ytp-skip-ad-button, .ytp-ad-skip-button-modern, .ytp-ad-skip-button, .ytp-ad-skip-button-slot button, button.ytp-ad-skip-button-text, .ytp-ad-skip-button-container button, .videoAdUiSkipButton";
    function dispatchSyntheticClick(el) {
      try {
        const rect = el.getBoundingClientRect();
        const opts = {
          bubbles: true,
          cancelable: true,
          composed: true,
          view: window,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2
        };
        el.dispatchEvent(new PointerEvent("pointerdown", opts));
        el.dispatchEvent(new MouseEvent("mousedown", opts));
        el.dispatchEvent(new PointerEvent("pointerup", opts));
        el.dispatchEvent(new MouseEvent("mouseup", opts));
        el.dispatchEvent(new MouseEvent("click", opts));
        el.click();
      } catch {
      }
    }
    let player = null;
    let classObserver = null;
    let pollTimer = null;
    let adActive = false;
    let savedMuted = false;
    let savedRate = 1;
    const isAdShowing = () => {
      if (!player) return false;
      return AD_CLASSES.some((cls) => player.classList.contains(cls));
    };
    function tick() {
      if (!player?.isConnected) return;
      const video = player.querySelector("video.html5-main-video, video");
      if (!video) return;
      if (isAdShowing()) {
        if (!adActive) {
          adActive = true;
          savedMuted = video.muted;
          savedRate = video.playbackRate || 1;
          pollTimer ??= setInterval(tick, 100);
        }
        video.muted = true;
        try {
          const p = player;
          if (typeof p.skipAd === "function") p.skipAd();
        } catch {
        }
        const skipButtons = player.querySelectorAll(SKIP_SELECTOR);
        skipButtons.forEach((btn) => {
          dispatchSyntheticClick(btn);
        });
        player.querySelectorAll(".video-ads button, .ytp-ad-module button, div.ytp-ad-text, button.ytp-ad-skip-button").forEach((btn) => {
          const txt = btn.textContent?.trim().toLowerCase() || "";
          if (txt.includes("b\u1ECF qua") || txt.includes("skip ad") || txt === "skip") {
            dispatchSyntheticClick(btn);
          }
        });
        const d = video.duration;
        if (Number.isFinite(d) && d > 0 && d <= 120) {
          video.playbackRate = 16;
        }
      } else if (adActive) {
        adActive = false;
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
        video.muted = savedMuted;
        if (video.volume === 0) video.volume = 1;
        video.playbackRate = savedRate;
        try {
          const p = player;
          if (typeof p.unMute === "function") p.unMute();
        } catch {
        }
      }
    }
    function bindPlayer() {
      const el = document.getElementById("movie_player");
      if (!el || el === player) return;
      classObserver?.disconnect();
      player = el;
      classObserver = new MutationObserver(tick);
      classObserver.observe(el, { attributes: true, attributeFilter: ["class"] });
      tick();
    }
    let scheduled = false;
    new MutationObserver(() => {
      if (scheduled || player?.isConnected) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        bindPlayer();
      });
    }).observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener("yt-navigate-finish", bindPlayer, true);
    bindPlayer();
  })();
})();
//# sourceMappingURL=content_youtube.js.map

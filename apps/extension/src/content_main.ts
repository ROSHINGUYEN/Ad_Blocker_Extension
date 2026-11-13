// Main world script: Direct YouTube Ad Speedup & Window.open Popunder Guard
(function() {
  // 1. YouTube High-Speed Auto-Skip Engine running in MAIN world (Direct access to HTML5 video element)
  function setupYouTubeSkipper() {
    if (!window.location.hostname.includes('youtube.com')) return;

    setInterval(() => {
      const player = document.getElementById('movie_player') as HTMLElement | null;
      const video = document.querySelector('video') as HTMLVideoElement | null;
      if (!player || !video) return;

      const isAd =
        player.classList.contains('ad-showing') ||
        player.classList.contains('ad-interrupting') ||
        Boolean(document.querySelector('.ytp-ad-player-overlay, .ytp-ad-text, .video-ads'));

      if (isAd) {
        // Tắt tiếng tức thì
        video.muted = true;
        // Tua nhanh tối đa
        video.playbackRate = 16.0;
        // Nhảy thẳng tới cuối clip quảng cáo
        if (video.duration && isFinite(video.duration)) {
          video.currentTime = video.duration;
        }

        // Tự động bấm nút Bỏ qua quảng cáo (Skip Ad)
        const skipBtn = document.querySelector(
          '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, button.ytp-ad-skip-button-text, .ytp-skip-ad-button, .ytp-ad-skip-button-slot button'
        ) as HTMLElement | null;

        if (skipBtn) {
          skipBtn.click();
        }
      }
    }, 100);
  }

  setupYouTubeSkipper();

  // 2. Intercept window.open popunders
  let lastRealClickTimestamp = 0;
  window.addEventListener('pointerdown', (e: PointerEvent) => {
    if (e.isTrusted) lastRealClickTimestamp = Date.now();
  }, true);

  try {
    const originalOpen = window.open;
    window.open = function(url?: string | URL, target?: string, features?: string): Window | null {
      const urlStr = url ? String(url) : '';
      const timeSinceClick = Date.now() - lastRealClickTimestamp;
      const currentHost = window.location.hostname;

      const isThirdParty = Boolean(
        urlStr &&
        !urlStr.startsWith('/') &&
        !urlStr.startsWith('./') &&
        !urlStr.includes(currentHost)
      );

      if (timeSinceClick > 500 || isThirdParty) {
        window.postMessage({ type: 'SHIORI_POPUP_BLOCKED', url: urlStr }, '*');
        return null;
      }

      return originalOpen.call(window, url, target, features);
    };
  } catch {}

  // 3. Intercept click hijacking
  window.addEventListener('click', (event: MouseEvent) => {
    let el = event.target as HTMLElement | null;
    while (el && el !== document.body && el !== document.documentElement) {
      if (el.tagName === 'A') {
        const href = (el as HTMLAnchorElement).href || '';
        const lower = href.toLowerCase();
        if (
          lower.includes('catfish') ||
          lower.includes('utm_medium=pc-catfish') ||
          lower.includes('haywin') ||
          lower.includes('uk88') ||
          lower.includes('hitclub') ||
          lower.includes('win79') ||
          lower.includes('sunwin') ||
          lower.includes('cacuoc')
        ) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          window.postMessage({ type: 'SHIORI_CLICK_BLOCKED', url: href }, '*');
          return;
        }
      }
      el = el.parentElement;
    }
  }, true);
})();

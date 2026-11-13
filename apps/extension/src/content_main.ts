// Intercept window.open directly in MAIN world before page scripts load
(function() {
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

      // Block unprompted or third-party popunder
      if (timeSinceClick > 500 || isThirdParty) {
        console.warn('[Shiori Popunder Guard] Blocked window.open:', urlStr);
        window.postMessage({ type: 'SHIORI_POPUP_BLOCKED', url: urlStr }, '*');
        return null;
      }

      return originalOpen.call(window, url, target, features);
    };
  } catch (err) {
    console.error('[Shiori] Failed to override window.open:', err);
  }

  // Intercept click hijacking on the document
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
          console.warn('[Shiori Click Guard] Suppressed ad click:', href);
          window.postMessage({ type: 'SHIORI_CLICK_BLOCKED', url: href }, '*');
          return;
        }
      }
      el = el.parentElement;
    }
  }, true);
})();

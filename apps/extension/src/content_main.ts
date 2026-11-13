// Main world script: Direct YouTube Ad Auto-Skip & 0ms Click Interceptor
(function() {
  let isExtensionEnabled = true;
  try {
    const stored = localStorage.getItem('shiori_enabled');
    if (stored !== null) isExtensionEnabled = stored === 'true';
  } catch {}

  window.addEventListener('message', (event) => {
    if (event.data?.type === 'SHIORI_SET_ENABLED') {
      isExtensionEnabled = Boolean(event.data.enabled);
    }
  });

  // 1. Synthetic mouse event dispatcher targeting element center
  function dispatchClick(el: HTMLElement) {
    try {
      const rect = el.getBoundingClientRect();
      const opts = {
        bubbles: true,
        cancelable: true,
        composed: true,
        view: window,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      };
      el.dispatchEvent(new PointerEvent('pointerdown', opts));
      el.dispatchEvent(new MouseEvent('mousedown', opts));
      el.dispatchEvent(new PointerEvent('pointerup', opts));
      el.dispatchEvent(new MouseEvent('mouseup', opts));
      el.dispatchEvent(new MouseEvent('click', opts));
      el.click();
    } catch {}
  }

  let wasAdPlaying = false;
  let userPreferredMuted = false;

  function handleYouTubeAdState() {
    if (!isExtensionEnabled) return;
    if (!window.location.hostname.includes('youtube.com')) return;

    const player = document.getElementById('movie_player') as any;
    const video = document.querySelector('video') as HTMLVideoElement | null;
    if (!player || !video) return;

    // Strict detection: YouTube explicitly marks the player with .ad-showing or .ad-interrupting
    const isAdPlaying = Boolean(
      player.classList?.contains('ad-showing') ||
      player.classList?.contains('ad-interrupting')
    );

    if (isAdPlaying) {
      if (!wasAdPlaying) {
        wasAdPlaying = true;
        userPreferredMuted = video.muted;
      }

      // 1. Mute audio during ad so user hears no ad noise
      video.muted = true;

      // 2. Trigger YouTube player skipAd API if exposed
      try {
        if (typeof player.skipAd === 'function') {
          player.skipAd();
        }
      } catch {}

      // 3. Click YouTube skip button variants with synthetic events
      const skipSelectors = [
        '.ytp-ad-skip-button-modern',
        '.ytp-skip-ad-button',
        '.ytp-ad-skip-button',
        '.ytp-ad-skip-button-slot button',
        'button.ytp-ad-skip-button-text',
        '.ytp-ad-skip-button-container button',
        '.videoAdUiSkipButton',
        '[class*="skip-button"]'
      ];

      for (const sel of skipSelectors) {
        const btns = document.querySelectorAll<HTMLElement>(sel);
        btns.forEach((btn) => {
          dispatchClick(btn);
        });
      }

      // Also detect any button with text "skip" or "bỏ qua" inside player ads
      const playerAdBtns = player.querySelectorAll<HTMLElement>('button');
      playerAdBtns.forEach((btn: HTMLElement) => {
        const txt = btn.textContent?.trim().toLowerCase() || '';
        if (txt.includes('bỏ qua') || txt.includes('skip ad') || txt === 'skip') {
          dispatchClick(btn);
        }
      });
    } else {
      // Ad has ended or user is watching real content
      if (wasAdPlaying) {
        wasAdPlaying = false;
        // Restore user sound preferences
        video.muted = userPreferredMuted;
      }

      // Ensure playbackRate is never left altered
      if (video.playbackRate !== 1.0 && video.playbackRate > 2.0) {
        video.playbackRate = 1.0;
      }
    }
  }

  // Polling loop every 200ms (lightweight, zero lag)
  setInterval(handleYouTubeAdState, 200);

  document.addEventListener('play', (e) => {
    if ((e.target as HTMLElement)?.tagName === 'VIDEO') {
      handleYouTubeAdState();
    }
  }, true);

  document.addEventListener('timeupdate', (e) => {
    if ((e.target as HTMLElement)?.tagName === 'VIDEO') {
      handleYouTubeAdState();
    }
  }, true);

  window.addEventListener('yt-navigate-finish', () => {
    handleYouTubeAdState();
  }, true);

  // 2. Intercept window.open popunders (0ms latency)
  let lastRealClickTimestamp = 0;
  window.addEventListener('pointerdown', (e: PointerEvent) => {
    if (e.isTrusted) lastRealClickTimestamp = Date.now();
  }, true);

  try {
    const originalOpen = window.open;
    window.open = function(url?: string | URL, target?: string, features?: string): Window | null {
      if (!isExtensionEnabled) {
        return originalOpen.call(window, url, target, features);
      }

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

  // 3. ZERO-LATENCY Click Neutralizer on Pointerdown & Mousedown (PREVENT TAB SPAWN)
  function isMaliciousAdLink(href: string): boolean {
    if (!href) return false;
    const lower = href.toLowerCase();
    return (
      lower.includes('topbanner') ||
      lower.includes('catfish') ||
      lower.includes('utm_medium') ||
      lower.includes('utm_campaign') ||
      lower.includes('cpd') ||
      lower.includes('gemwin') ||
      lower.includes('haywin') ||
      lower.includes('uk88') ||
      lower.includes('hitclub') ||
      lower.includes('win79') ||
      lower.includes('sunwin') ||
      lower.includes('yo88') ||
      lower.includes('rikvip') ||
      lower.includes('go88') ||
      lower.includes('bet88') ||
      lower.includes('tic88') ||
      lower.includes('zowin') ||
      lower.includes('6789x.site') ||
      lower.includes('cacuoc') ||
      lower.includes('gamebai') ||
      lower.includes('nhacai') ||
      lower.includes('popads') ||
      lower.includes('clickadu') ||
      lower.includes('sex') ||
      lower.includes('xxx') ||
      lower.includes('porn') ||
      lower.includes('hentai') ||
      lower.includes('jav') ||
      lower.includes('vlxx')
    );
  }

  function interceptPotentialAdTrigger(event: MouseEvent | PointerEvent) {
    if (!isExtensionEnabled) return;

    let el = event.target as HTMLElement | null;
    while (el && el !== document.body && el !== document.documentElement) {
      if (el.tagName === 'A') {
        const anchor = el as HTMLAnchorElement;
        const href = anchor.href || anchor.getAttribute('href') || '';
        
        if (isMaliciousAdLink(href)) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          anchor.removeAttribute('href');
          anchor.removeAttribute('target');
          anchor.style.pointerEvents = 'none';
          window.postMessage({ type: 'SHIORI_CLICK_BLOCKED', url: href }, '*');
          return;
        }
      }
      el = el.parentElement;
    }
  }

  window.addEventListener('pointerdown', interceptPotentialAdTrigger, true);
  window.addEventListener('mousedown', interceptPotentialAdTrigger, true);
  window.addEventListener('click', interceptPotentialAdTrigger, true);
  window.addEventListener('auxclick', interceptPotentialAdTrigger, true);
})();

// Main world script: Direct YouTube Ad Auto-Skip & 0ms Click Interceptor
(function() {
  // Check if extension is enabled
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

  // 1. YouTube High-Speed Auto-Skip Engine running in MAIN world
  function dispatchSyntheticClick(el: HTMLElement) {
    const opts = { bubbles: true, cancelable: true, composed: true, view: window };
    el.dispatchEvent(new PointerEvent('pointerdown', opts));
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    el.dispatchEvent(new PointerEvent('pointerup', opts));
    el.dispatchEvent(new MouseEvent('mouseup', opts));
    el.dispatchEvent(new MouseEvent('click', opts));
  }

  let handlingAd = false;
  let originalPlaybackRate = 1.0;
  let originalMuted = false;

  function handleYouTubeAdState() {
    if (!isExtensionEnabled) return;
    if (!window.location.hostname.includes('youtube.com')) return;

    const player = document.getElementById('movie_player') as any;
    const video = document.querySelector('video') as HTMLVideoElement | null;
    if (!player || !video) return;

    // Comprehensive YouTube Ad Detection:
    // 1. Player class contains ad-showing / ad-interrupting
    // 2. Or ad badges / overlays are present on screen (like "Được tài trợ", .ytp-ad-player-overlay, etc.)
    const isAdPlaying =
      player.classList?.contains('ad-showing') ||
      player.classList?.contains('ad-interrupting') ||
      Boolean(document.querySelector('.ytp-ad-player-overlay, .ytp-ad-text, .video-ads, .ytp-ad-module, ytd-ad-slot-renderer, .ytp-ad-badge, [class*="ytp-ad-"]'));

    if (isAdPlaying) {
      if (!handlingAd) {
        handlingAd = true;
        originalPlaybackRate = video.playbackRate > 2.0 ? 1.0 : (video.playbackRate || 1.0);
        originalMuted = video.muted;
      }

      // 1. Mute ad immediately
      video.muted = true;

      // 2. Fast-forward ad at 16x speed
      video.playbackRate = 16.0;

      // 3. Jump to end of ad
      if (video.duration && isFinite(video.duration)) {
        // Only jump if duration is within standard ad bounds (e.g. <= 120s) or current time is not yet at duration
        if (video.duration <= 120 && video.currentTime < video.duration) {
          video.currentTime = video.duration;
        }
      }

      // 4. Force trigger YouTube player's internal skip API if available
      try {
        if (typeof player.skipAd === 'function') {
          player.skipAd();
        }
      } catch {}

      // 5. Dispatch synthetic click on all skip ad button variants
      const skipSelectors = [
        '.ytp-ad-skip-button',
        '.ytp-ad-skip-button-modern',
        'button.ytp-ad-skip-button-text',
        '.ytp-skip-ad-button',
        '.ytp-ad-skip-button-slot button',
        'button[id*="skip"]',
        '.videoAdUiSkipButton',
        '[class*="skip-button"]'
      ];

      for (const sel of skipSelectors) {
        const btn = document.querySelector(sel) as HTMLElement | null;
        if (btn) {
          dispatchSyntheticClick(btn);
          break;
        }
      }
    } else {
      // Restore normal playback for the main video
      if (handlingAd) {
        handlingAd = false;
        video.muted = originalMuted;
        video.playbackRate = originalPlaybackRate;
      }
    }
  }

  // High-frequency polling loop: checks every 50ms for instantaneous ad suppression
  setInterval(handleYouTubeAdState, 50);

  // Hook into video element playback events
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
    handlingAd = false;
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
      lower.includes('xxx')
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

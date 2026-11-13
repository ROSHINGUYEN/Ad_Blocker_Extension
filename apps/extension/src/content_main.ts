// Main world script: Direct YouTube Ad Speedup & Window.open Popunder Guard
(function() {
  // 1. YouTube High-Speed Auto-Skip Engine running in MAIN world (Direct access to HTML5 video element)
  function handleYouTubeAdState() {
    if (!window.location.hostname.includes('youtube.com')) return;

    const player = document.getElementById('movie_player') as HTMLElement | null;
    const video = document.querySelector('video') as HTMLVideoElement | null;
    if (!player || !video) return;

    const isAd =
      player.classList.contains('ad-showing') ||
      player.classList.contains('ad-interrupting') ||
      Boolean(document.querySelector('.ytp-ad-player-overlay, .ytp-ad-text, .video-ads, .ytp-ad-module, ytd-ad-slot-renderer'));

    if (isAd) {
      // 1. Instant Mute
      video.muted = true;
      // 2. Maximum Playback Rate
      video.playbackRate = 16.0;
      // 3. Immediately seek to end of ad clip
      if (video.duration && isFinite(video.duration)) {
        video.currentTime = video.duration;
      }

      // 4. Force click all known skip buttons instantly
      const skipSelectors = [
        '.ytp-ad-skip-button',
        '.ytp-ad-skip-button-modern',
        'button.ytp-ad-skip-button-text',
        '.ytp-skip-ad-button',
        '.ytp-ad-skip-button-slot button',
        'button[id*="skip"]'
      ];
      for (const sel of skipSelectors) {
        const btn = document.querySelector(sel) as HTMLElement | null;
        if (btn) {
          btn.click();
          break;
        }
      }
    }
  }

  // Interval check every 50ms for instant reaction
  setInterval(handleYouTubeAdState, 50);

  // Hook into video element playback events directly
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

  // Hook into YouTube SPA navigation lifecycle
  window.addEventListener('yt-navigate-finish', handleYouTubeAdState, true);
  window.addEventListener('spfdone', handleYouTubeAdState, true);

  // 2. Intercept window.open popunders (0ms latency)
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
    let el = event.target as HTMLElement | null;
    while (el && el !== document.body && el !== document.documentElement) {
      if (el.tagName === 'A') {
        const anchor = el as HTMLAnchorElement;
        const href = anchor.href || anchor.getAttribute('href') || '';
        
        if (isMaliciousAdLink(href)) {
          // Neutralize IMMEDIATELY on pointerdown before mouseup/click creates the tab
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

  // Intercept at all critical stages of the click pipeline (Capture phase)
  window.addEventListener('pointerdown', interceptPotentialAdTrigger, true);
  window.addEventListener('mousedown', interceptPotentialAdTrigger, true);
  window.addEventListener('click', interceptPotentialAdTrigger, true);
  window.addEventListener('auxclick', interceptPotentialAdTrigger, true);
})();

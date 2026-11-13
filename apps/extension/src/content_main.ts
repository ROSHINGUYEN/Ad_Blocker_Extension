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

  // -------------------------------------------------------------
  // 0. DEEP YOUTUBE AD DATA NEUTRALIZATION (Clean player response at source)
  // -------------------------------------------------------------
  function cleanYouTubePlayerObject(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    try {
      if (obj.adPlacements) delete obj.adPlacements;
      if (obj.playerAds) delete obj.playerAds;
      if (obj.adSlots) delete obj.adSlots;
      if (obj.adBreakHeartbeatParams) delete obj.adBreakHeartbeatParams;
    } catch {}
    return obj;
  }

  // Intercept window.ytInitialPlayerResponse if defined
  try {
    let internalPlayerResponse = (window as any).ytInitialPlayerResponse;
    Object.defineProperty(window, 'ytInitialPlayerResponse', {
      configurable: true,
      enumerable: true,
      get() {
        return internalPlayerResponse;
      },
      set(val) {
        internalPlayerResponse = cleanYouTubePlayerObject(val);
      }
    });
    if (internalPlayerResponse) {
      cleanYouTubePlayerObject(internalPlayerResponse);
    }
  } catch {}

  // Intercept fetch API for YouTube Player calls
  try {
    const originalFetch = window.fetch;
    window.fetch = async function(...args: any[]) {
      const response = await originalFetch.apply(this, args as any);
      const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
      if (url.includes('/youtubei/v1/player')) {
        try {
          const clone = response.clone();
          const json = await clone.json();
          cleanYouTubePlayerObject(json);
          return new Response(JSON.stringify(json), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        } catch {
          return response;
        }
      }
      return response;
    };
  } catch {}

  // Intercept XMLHttpRequest for YouTube Player calls
  try {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...rest: any[]) {
      (this as any)._requestUrl = String(url);
      return originalOpen.apply(this, [method, url, ...rest] as any);
    };
    XMLHttpRequest.prototype.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
      if ((this as any)._requestUrl?.includes('/youtubei/v1/player')) {
        this.addEventListener('readystatechange', () => {
          if (this.readyState === 4 && this.status === 200) {
            try {
              const data = JSON.parse(this.responseText);
              cleanYouTubePlayerObject(data);
              Object.defineProperty(this, 'responseText', { value: JSON.stringify(data) });
              Object.defineProperty(this, 'response', { value: JSON.stringify(data) });
            } catch {}
          }
        });
      }
      return originalSend.apply(this, [body] as any);
    };
  } catch {}

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

    // Detect if YouTube is showing an in-stream ad
    const isAdPlaying = Boolean(
      player.classList?.contains('ad-showing') ||
      player.classList?.contains('ad-interrupting') ||
      document.querySelector('.ytp-ad-player-overlay, .ytp-ad-text-overlay, [class*="ytp-ad-module"]')
    );

    if (isAdPlaying) {
      if (!wasAdPlaying) {
        wasAdPlaying = true;
        userPreferredMuted = video.muted;
      }

      // 1. Mute ad immediately
      video.muted = true;

      // 2. Safely jump to the end of the ad video (Non-skippable ads: 0:01 / 0:33)
      // Since isAdPlaying is verified on movie_player, video is currently the ad video stream!
      if (video.duration && isFinite(video.duration) && video.duration > 0) {
        // Fast-forward playback and seek directly to the last millisecond
        video.playbackRate = 16.0;
        if (video.currentTime < video.duration - 0.1) {
          video.currentTime = video.duration;
        }
      }

      // 3. Trigger YouTube internal skipAd() API
      try {
        if (typeof player.skipAd === 'function') {
          player.skipAd();
        }
      } catch {}

      // 4. Click all skip button variants immediately
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

      // Also click any button with text "skip" or "bỏ qua"
      const playerAdBtns = player.querySelectorAll<HTMLElement>('button');
      playerAdBtns.forEach((btn: HTMLElement) => {
        const txt = btn.textContent?.trim().toLowerCase() || '';
        if (txt.includes('bỏ qua') || txt.includes('skip ad') || txt === 'skip') {
          dispatchClick(btn);
        }
      });
    } else {
      // Content video is playing: RESTORE NORMAL SPEED AND SOUND IMMEDIATELY
      if (wasAdPlaying) {
        wasAdPlaying = false;
        video.muted = userPreferredMuted;
      }

      // Guaranteed 1.0x playback for the main video
      if (video.playbackRate > 1.0) {
        video.playbackRate = 1.0;
      }
    }
  }

  // Fast polling loop every 50ms so ad finishes in <0.1s
  setInterval(handleYouTubeAdState, 50);

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

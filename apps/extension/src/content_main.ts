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

  // 1. YouTube Auto-Skip Engine
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

  // --------------------------------------------------------------------------
  // YOUTUBE AD HUNTER — Mute + Skip-only (NO currentTime / playbackRate hack)
  // Lý do: YouTube SSAI phát hiện currentTime/playbackRate => màn hình đen
  // --------------------------------------------------------------------------
  const YOUTUBE_AD_INDICATORS = [
    '.ad-showing',
    '.ad-interrupting',
    'ytd-ad-slot-renderer',
    'ytd-player-legacy-desktop-watch-ads-renderer',
  ];

  const YOUTUBE_SKIP_BUTTONS = [
    '.ytp-ad-skip-button-modern',
    '.ytp-skip-ad-button',
    '.ytp-ad-skip-button',
    '.ytp-ad-skip-button-slot button',
    'button.ytp-ad-skip-button-text',
    '.ytp-ad-skip-button-container button',
    '.videoAdUiSkipButton',
    'button[id*="skip"]',
  ];

  function detectYouTubeAd(): boolean {
    const player = document.getElementById('movie_player') as HTMLElement | null;
    if (player) {
      if (player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting')) {
        return true;
      }
    }
    for (const selector of YOUTUBE_AD_INDICATORS) {
      if (document.querySelector(selector)) return true;
    }
    return false;
  }

  let adMuted = false;

  function handleYouTubeAdState() {
    if (!isExtensionEnabled) return;
    if (!window.location.hostname.includes('youtube.com')) return;

    const player = document.getElementById('movie_player') as any;
    const video = document.querySelector('video') as HTMLVideoElement | null;
    if (!player || !video) return;

    const isAdActive = detectYouTubeAd();

    if (isAdActive) {
      // 1. Tắt tiếng + tua 16x (5s ad → kết thúc trong ~0.3s)
      // KHÔNG dùng currentTime = duration → gây SSAI black screen
      // playbackRate = 16 là an toàn, không trigger SSAI detection
      if (!adMuted) {
        video.muted = true;
        video.volume = 0;
        adMuted = true;
      }
      video.playbackRate = 16.0;

      // 2. Gọi skipAd() API nếu player hỗ trợ (skippable ads)
      try {
        if (typeof player.skipAd === 'function') player.skipAd();
      } catch {}

      // 3. Click tất cả nút Skip có thể xuất hiện
      for (const sel of YOUTUBE_SKIP_BUTTONS) {
        document.querySelectorAll<HTMLElement>(sel).forEach((btn) => {
          dispatchClick(btn);
        });
      }

      // 4. Quét text "Bỏ qua" / "Skip"
      document.querySelectorAll<HTMLElement>('.video-ads button, .ytp-ad-module button').forEach((btn) => {
        const txt = (btn.textContent || '').trim().toLowerCase();
        if (txt.includes('bỏ qua') || txt.includes('skip')) {
          dispatchClick(btn);
        }
      });
    } else {
      // Quảng cáo kết thúc — bật âm thanh + khôi phục tốc độ
      if (adMuted) {
        video.muted = false;
        video.volume = 1;
        adMuted = false;
      }
      if (video.playbackRate !== 1.0) {
        video.playbackRate = 1.0;
      }
    }
  }

  // Interval 200ms — đủ nhanh, không quá aggressive để tránh SSAI detect
  setInterval(handleYouTubeAdState, 200);

  // MutationObserver chỉ theo dõi class thay đổi trên #movie_player (nhẹ hơn, đủ để bắt ad-showing)
  function setupAdObserver() {
    const player = document.getElementById('movie_player');
    if (player) {
      new MutationObserver(handleYouTubeAdState).observe(player, {
        attributes: true,
        attributeFilter: ['class'],
      });
    } else {
      // Chờ player load
      new MutationObserver((_m, obs) => {
        const p = document.getElementById('movie_player');
        if (p) {
          obs.disconnect();
          new MutationObserver(handleYouTubeAdState).observe(p, {
            attributes: true,
            attributeFilter: ['class'],
          });
        }
      }).observe(document.documentElement, { childList: true, subtree: true });
    }
  }
  setupAdObserver();

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

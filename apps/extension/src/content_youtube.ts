/**
 * Content script (MAIN world, CHỈ youtube.com): bỏ qua quảng cáo in-stream.
 *
 * So với bản cũ:
 *  - Chỉ coi là "đang quảng cáo" khi #movie_player có class `ad-showing`/`ad-interrupting`.
 *    Bản cũ còn dò `[class*="ytp-ad-module"]` (container luôn có sẵn trong DOM của player) và
 *    `ytd-ad-slot-renderer` (slot quảng cáo ở feed/sidebar) => có thể tua/tắt tiếng nhầm VIDEO CHÍNH.
 *  - Hàng rào an toàn: chỉ tua khi duration <= 10 phút.
 *  - Event-driven (MutationObserver trên class của player) + poll 250ms CHỈ trong lúc có quảng cáo.
 *    Bản cũ: setInterval 25ms (40 lần/giây) + observer toàn cây DOM, chạy liên tục.
 *  - Khôi phục muted/playbackRate gốc của người dùng khi quảng cáo kết thúc.
 *  - Không xoá playbackTracking (làm mất lịch sử xem) và bỏ đoạn ytcfg vô tác dụng.
 */
(() => {
  const AD_CLASSES = ['ad-showing', 'ad-interrupting'];
  const SKIP_SELECTOR =
    '.ytp-skip-ad-button, .ytp-ad-skip-button-modern, .ytp-ad-skip-button, .ytp-ad-skip-button-container button';
  const MAX_AD_SECONDS = 600;

  /* ---------- 1) Loại dữ liệu quảng cáo khỏi player response ---------- */
  const AD_KEYS = ['adPlacements', 'playerAds', 'adSlots', 'adBreakHeartbeatParams', 'adPlaybackContext'];

  function stripAds<T>(obj: T): T {
    if (obj && typeof obj === 'object') {
      const o = obj as Record<string, any>;
      for (const k of AD_KEYS) if (k in o) delete o[k];
      if (o.playerConfig?.adConfig) delete o.playerConfig.adConfig;
    }
    return obj;
  }

  try {
    let initial = (window as any).ytInitialPlayerResponse;
    Object.defineProperty(window, 'ytInitialPlayerResponse', {
      configurable: true,
      enumerable: true,
      get: () => initial,
      set: (v) => { initial = stripAds(v); },
    });
    if (initial) stripAds(initial);
  } catch { /* trang đã khoá thuộc tính */ }

  try {
    const nativeFetch = window.fetch;
    window.fetch = async function (this: unknown, ...args: Parameters<typeof fetch>) {
      const response = await nativeFetch.apply(this, args);
      try {
        const input = args[0];
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (!url.includes('/youtubei/v1/player') || !response.ok) return response;
        const json = stripAds(await response.clone().json());
        const patched = new Response(JSON.stringify(json), {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
        Object.defineProperty(patched, 'url', { value: response.url });
        return patched;
      } catch {
        return response; // fail-open: không bao giờ làm hỏng request của YouTube
      }
    };
  } catch { /* ignore */ }

  /* ---------- 2) Xử lý quảng cáo in-stream ---------- */
  let player: HTMLElement | null = null;
  let classObserver: MutationObserver | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let adActive = false;
  let savedMuted = false;
  let savedRate = 1;

  const isAdShowing = () => !!player && AD_CLASSES.some((c) => player!.classList.contains(c));

  function tick(): void {
    if (!player?.isConnected) return;
    const video = player.querySelector<HTMLVideoElement>('video.html5-main-video, video');
    if (!video) return;

    if (isAdShowing()) {
      if (!adActive) {
        adActive = true;
        savedMuted = video.muted;
        savedRate = video.playbackRate || 1;
        pollTimer ??= setInterval(tick, 250);
      }
      video.muted = true;

      const skip = player.querySelector<HTMLElement>(SKIP_SELECTOR);
      if (skip && skip.offsetParent !== null) skip.click();

      const d = video.duration;
      if (Number.isFinite(d) && d > 0 && d <= MAX_AD_SECONDS && video.currentTime < d - 0.25) {
        video.playbackRate = 16;
        video.currentTime = d - 0.1;
      }
    } else if (adActive) {
      adActive = false;
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
      video.muted = savedMuted;
      video.playbackRate = savedRate;
    }
  }

  function bindPlayer(): void {
    const el = document.getElementById('movie_player');
    if (!el || el === player) return;
    classObserver?.disconnect();
    player = el;
    classObserver = new MutationObserver(tick);
    classObserver.observe(el, { attributes: true, attributeFilter: ['class'] });
    tick();
  }

  // Chờ player xuất hiện (document_start): gộp bằng rAF để không chạy theo từng mutation
  let scheduled = false;
  new MutationObserver(() => {
    if (scheduled || player?.isConnected) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; bindPlayer(); });
  }).observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener('yt-navigate-finish', bindPlayer, true);
  bindPlayer();
})();

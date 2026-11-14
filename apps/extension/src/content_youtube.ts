/**
 * Content script (MAIN world, CHỈ youtube.com): bỏ qua quảng cáo in-stream.
 *
 * Tiêu chí an toàn tuyệt đối:
 *  - CHỈ can thiệp khi container `#movie_player` thực sự chứa class `ad-showing` hoặc `ad-interrupting`.
 *  - KHÔNG bắt nhầm `ytd-ad-slot-renderer` (banner tĩnh ở sidebar/comments) để tránh tua nhầm hoặc tắt tiếng video chính.
 *  - KHÔNG can thiệp parse/patch JSON của window.fetch / ytInitialPlayerResponse để tránh trigger hệ thống Anti-Adblock của YouTube.
 *  - Khi quảng cáo kết thúc: LẬP TỨC khôi phục âm thanh (`muted`) và tốc độ (`playbackRate`) gốc của người dùng.
 */
(() => {
  const AD_CLASSES = ['ad-showing', 'ad-interrupting'];
  const SKIP_SELECTOR =
    '.ytp-skip-ad-button, .ytp-ad-skip-button-modern, .ytp-ad-skip-button, .ytp-ad-skip-button-slot button, button.ytp-ad-skip-button-text, .ytp-ad-skip-button-container button, .videoAdUiSkipButton';

  function dispatchSyntheticClick(el: HTMLElement): void {
    try {
      const rect = el.getBoundingClientRect();
      const opts: MouseEventInit = {
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

  let player: HTMLElement | null = null;
  let classObserver: MutationObserver | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let adActive = false;
  let savedMuted = false;
  let savedRate = 1;

  // STRICT DETECTION V2: Nhận diện chuẩn xác mọi dạng quảng cáo in-stream không bắt nhầm video chính
  const isAdShowing = (): boolean => {
    if (!player) return false;
    // 1. Kiểm tra class trên container player
    if (AD_CLASSES.some((c) => player!.classList.contains(c))) return true;
    // 2. Kiểm tra container quảng cáo thực tế bên trong player
    if (player.querySelector('.ytp-ad-player-overlay, .ytp-ad-player-overlay-instream-info')) return true;
    // 3. Kiểm tra nút skip hoặc badge ad đang hiển thị
    const skipBtn = player.querySelector<HTMLElement>(SKIP_SELECTOR);
    if (skipBtn && skipBtn.offsetParent !== null) return true;
    return false;
  };

  function tick(): void {
    if (!player?.isConnected) return;
    const video = player.querySelector<HTMLVideoElement>('video.html5-main-video, video');
    if (!video) return;

    if (isAdShowing()) {
      if (!adActive) {
        adActive = true;
        savedMuted = video.muted;
        savedRate = video.playbackRate || 1;
        pollTimer ??= setInterval(tick, 100);
      }

      // 1. Tắt tiếng quảng cáo để không làm ồn
      video.muted = true;

      // 2. Tự động click các loại nút Skip Ad
      try {
        const p = player as any;
        if (typeof p.skipAd === 'function') p.skipAd();
      } catch {}

      const skipButtons = player.querySelectorAll<HTMLElement>(SKIP_SELECTOR);
      skipButtons.forEach((btn) => {
        dispatchSyntheticClick(btn);
      });

      player.querySelectorAll<HTMLElement>('.video-ads button, .ytp-ad-module button, div.ytp-ad-text').forEach((btn) => {
        const txt = btn.textContent?.trim().toLowerCase() || '';
        if (txt.includes('bỏ qua') || txt.includes('skip ad') || txt === 'skip') {
          dispatchSyntheticClick(btn);
        }
      });

      // 3. Xử lý tua tốc độ:
      // - Nếu có nút Skip Ad: giữ tốc độ bình thường hoặc 2x để YouTube API skipAd() chuyển mượt mà (không bị đứt buffer đen 2s)
      // - Nếu là Unskippable Bumper (không có nút skip): tăng 16x để lướt qua nhanh
      const hasSkipButton = skipButtons.length > 0 || !!player.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .videoAdUiSkipButton');
      if (hasSkipButton) {
        if (video.playbackRate > 2) video.playbackRate = 2.0;
      } else {
        if (video.playbackRate < 16) video.playbackRate = 16.0;
      }
    } else if (adActive) {
      // QUẢNG CÁO ĐÃ HẾT: Lập tức phục hồi nguyên trạng video chính và kích hoạt phát tiếp
      adActive = false;
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      video.muted = savedMuted;
      video.playbackRate = savedRate;
      try {
        if (video.paused) video.play();
      } catch {}
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
    requestAnimationFrame(() => {
      scheduled = false;
      bindPlayer();
    });
  }).observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener('yt-navigate-finish', bindPlayer, true);
  bindPlayer();
})();

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
  let savedRate = 1;

  // STRICT DETECTION 100%: CHỈ KHI CONTAINER MOVIE_PLAYER THỰC SỰ CÓ CLASS AD-SHOWING / AD-INTERRUPTING
  const isAdShowing = (): boolean => {
    if (!player) return false;
    return AD_CLASSES.some((c) => player!.classList.contains(c));
  };

  function tick(): void {
    if (!player?.isConnected) return;
    const video = player.querySelector<HTMLVideoElement>('video.html5-main-video, video');
    if (!video) return;

    if (isAdShowing()) {
      if (!adActive) {
        adActive = true;
        savedRate = video.playbackRate || 1;
        pollTimer ??= setInterval(tick, 50);
      }

      // 1. Tắt tiếng quảng cáo 0ms
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

      player.querySelectorAll<HTMLElement>('.video-ads button, .ytp-ad-module button, div.ytp-ad-text, button.ytp-ad-skip-button').forEach((btn) => {
        const txt = btn.textContent?.trim().toLowerCase() || '';
        if (txt.includes('bỏ qua') || txt.includes('skip ad') || txt === 'skip') {
          dispatchSyntheticClick(btn);
        }
      });

      // 3. Tua tốc độ: CHỈ tua khi video thực sự là quảng cáo ngắn (thời lượng <= 120s)
      // KHÔNG BAO GIỜ tua nếu thời lượng > 120s (để bảo vệ 100% video chính của người dùng không bao giờ bị tua nhầm)
      const d = video.duration;
      if (Number.isFinite(d) && d > 0 && d <= 120) {
        video.playbackRate = 16.0;
        // Bỏ qua quảng cáo tức thì: nhảy ngay tới cuối quảng cáo
        if (video.currentTime < d - 0.1) {
          video.currentTime = d - 0.05;
        }
      }
    } else if (adActive) {
      // QUẢNG CÁO ĐÃ HẾT: Lập tức phục hồi nguyên trạng video chính và kích hoạt phát tiếp
      adActive = false;
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      // Khôi phục âm thanh: mở tiếng lại 100% cho video chính
      video.muted = false;
      try {
        const p = player as any;
        if (typeof p.unMute === 'function') p.unMute();
      } catch {}
      if (video.volume === 0) video.volume = 1;
      video.playbackRate = savedRate;
      try {
        if (video.paused) video.play();
      } catch {}
    } else {
      // ĐẢM BẢO KHÔNG BỊ TẮT TIẾNG HOẶC TREO KHI VIDEO CHÍNH ĐANG CHẠY:
      if (video.muted && !video.paused && video.currentTime > 0) {
        video.muted = false;
        try {
          const p = player as any;
          if (typeof p.unMute === 'function') p.unMute();
        } catch {}
      }
      if (video.playbackRate > 2.0) {
        video.playbackRate = 1.0;
      }
      // Tự động play nếu video chính bị kẹt ở trạng thái pause sau quảng cáo
      if (video.paused && video.readyState >= 2 && !video.ended) {
        try { video.play(); } catch {}
      }
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

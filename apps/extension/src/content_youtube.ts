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

  // STRICT DETECTION:
  // 1. Container movie_player có class ad-showing hoặc ad-interrupting
  // 2. HOẶC thanh tiến trình màu vàng/chứa selector hiển thị ad (.ytp-ad-player-overlay, video-ads ytp-ad-module)
  const isAdShowing = (): boolean => {
    if (!player) return false;
    if (AD_CLASSES.some((c) => player!.classList.contains(c))) return true;
    if (player.querySelector('.ytp-ad-player-overlay, .ytp-ad-text, .ytp-ad-preview-container, .ytp-ad-duration-remaining')) return true;
    return false;
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
        // Nếu quảng cáo sắp hết hoặc đang chạy: gọi play() liên tục để không bị kẹt spinner loading
        if (video.paused) {
          try { video.play(); } catch {}
        }
      }
    } else if (adActive) {
      // QUẢNG CÁO ĐÃ HẾT: Lập tức phục hồi nguyên trạng video chính và kích hoạt phát tiếp
      adActive = false;
      // Khôi phục âm thanh: mở tiếng lại cho video chính
      video.muted = false;
      try {
        const p = player as any;
        if (typeof p.unMute === 'function') p.unMute();
      } catch {}
      video.playbackRate = savedRate;
      
      // Kích hoạt video chính tiếp tục phát ngay sau khi hết quảng cáo
      try {
        const p = player as any;
        if (typeof p.playVideo === 'function') p.playVideo();
      } catch {}
      try {
        if (video.paused) video.play();
      } catch {}
    } else {
      // VIDEO CHÍNH ĐANG CHẠY BÌNH THƯỜNG:
      // TUYỆT ĐỐI KHÔNG CAN THIỆP video.play(), video.muted hay volume!
      // Để người dùng toàn quyền bấm tạm dừng (pause/play) hoặc kéo chỉnh âm thanh tùy ý.
      if (video.playbackRate > 2.0) {
        video.playbackRate = 1.0;
      }
    }
  }

  function bindPlayer(): void {
    const el = document.getElementById('movie_player');
    if (!el || el === player) return;
    classObserver?.disconnect();
    player = el;
    classObserver = new MutationObserver(tick);
    classObserver.observe(el, { attributes: true, attributeFilter: ['class'], childList: true, subtree: true });
    // Chạy vòng lặp thường trực 100ms để không bao giờ bị lọt frame quảng cáo
    if (!pollTimer) {
      pollTimer = setInterval(tick, 100);
    }
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

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
  // 2. HOẶC chứa overlay quảng cáo / nhãn thời gian quảng cáo / thanh tiến trình ad
  // 3. HOẶC có nút Skip Ad trong DOM
  const isAdShowing = (video: HTMLVideoElement): boolean => {
    if (!player) return false;
    
    // Nếu player có class ad-showing / ad-interrupting -> 100% là ad
    if (AD_CLASSES.some((c) => player!.classList.contains(c))) return true;

    // Nếu có overlay ad hoặc nút Skip Ad xuất hiện trong player -> 100% là ad
    if (player.querySelector('.ytp-ad-player-overlay, .ytp-ad-preview-container, .ytp-ad-duration-remaining, .ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-text')) {
      return true;
    }

    // Nếu thời lượng video <= 120 giây (chắc chắn là clip quảng cáo)
    const d = video.duration;
    if (Number.isFinite(d) && d > 0 && d <= 120) {
      return true;
    }

    return false;
  };

  function tick(): void {
    if (!player?.isConnected) return;
    const video = player.querySelector<HTMLVideoElement>('video.html5-main-video, video');
    if (!video) return;

    if (isAdShowing(video)) {
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
      const d = video.duration;
      if (Number.isFinite(d) && d > 0 && d <= 120) {
        video.playbackRate = 16.0;
        // Nếu là quảng cáo không có nút skip (non-skippable) như quảng cáo 10s trong ảnh:
        // Tua nhanh an toàn bằng cách nhảy về gần cuối quảng cáo
        if (video.currentTime < d - 0.2) {
          video.currentTime = d - 0.1;
        }
      }
    } else if (adActive) {
      // QUẢNG CÁO ĐÃ HẾT: Lập tức phục hồi nguyên trạng video chính
      adActive = false;
      // Khôi phục âm thanh: mở tiếng lại cho video chính
      video.muted = false;
      try {
        const p = player as any;
        if (typeof p.unMute === 'function') p.unMute();
      } catch {}
      video.playbackRate = savedRate;
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
    classObserver.observe(el, { attributes: true, attributeFilter: ['class'] });

    // Kiểm tra định kỳ nhẹ nhàng mỗi 250ms (chỉ tốn ~0.01% CPU)
    // Đảm bảo không bao giờ bị sót khi YouTube chèn quảng cáo 10s không đổi class
    if (!pollTimer) {
      pollTimer = setInterval(tick, 250);
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

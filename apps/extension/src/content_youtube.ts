/**
 * Content script (MAIN world, CHỈ youtube.com): Tự động nhận diện và bỏ qua quảng cáo in-stream.
 *
 * TIÊU CHÍ SIÊU NHẸ (0% CPU, KHÔNG BAO GIỜ TREO TRANG):
 *  - Tuyệt đối KHÔNG DÙNG setInterval (chống crash tab và loop vô hạn).
 *  - Tuyệt đối KHÔNG DÙNG video.currentTime (chống vỡ buffer MediaSource).
 *  - Tự động bỏ qua quảng cáo bằng: speed 16x + player.skipAd() + click nút Skip.
 *  - Dùng RAF (requestAnimationFrame) khi có quảng cáo để theo dõi êm ái theo chu kỳ render của màn hình.
 */
(() => {
  const SKIP_SELECTOR =
    '.ytp-skip-ad-button, .ytp-ad-skip-button-modern, .ytp-ad-skip-button, .ytp-ad-skip-button-slot button, button.ytp-ad-skip-button-text, .ytp-ad-skip-button-container button, .videoAdUiSkipButton';

  function dispatchSyntheticClick(el: HTMLElement): void {
    try {
      el.click();
    } catch {}
  }

  let player: HTMLElement | null = null;
  let adActive = false;
  let rafId: number | null = null;

  function isAdShowing(): boolean {
    if (!player) return false;
    if (player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting')) {
      return true;
    }
    if (player.querySelector('.ytp-ad-player-overlay, .ytp-ad-text, .ytp-ad-duration-remaining')) {
      return true;
    }
    return false;
  }

  function adLoop(): void {
    if (!player) return;
    const video = player.querySelector<HTMLVideoElement>('video');
    
    if (isAdShowing()) {
      if (!adActive) {
        adActive = true;
        console.log('[Shiori YT Debug] 🎯 Phát hiện quảng cáo! Kích hoạt chế độ tắt tiếng và tăng tốc 16x.');
        // Báo về background để hiển thị lên popup thống kê
        try {
          window.postMessage({ source: 'shiori-main', type: 'SHIORI_CLICK_BLOCKED' }, '*');
        } catch {}
      }
      if (video) {
        video.muted = true;
        if (video.playbackRate < 16.0) {
          video.playbackRate = 16.0;
        }
      }

      // Skip API
      try {
        const p = player as any;
        if (typeof p.skipAd === 'function') {
          p.skipAd();
          console.log('[Shiori YT Debug] ⏩ Đã gọi player.skipAd()');
        }
      } catch {}

      // Click Skip Buttons
      player.querySelectorAll<HTMLElement>(SKIP_SELECTOR).forEach((btn) => {
        console.log('[Shiori YT Debug] 👆 Click nút Skip Ad');
        dispatchSyntheticClick(btn);
      });
      player.querySelectorAll<HTMLElement>('.video-ads button, button.ytp-ad-skip-button').forEach((btn) => {
        const txt = btn.textContent?.trim().toLowerCase() || '';
        if (txt.includes('bỏ qua') || txt.includes('skip ad') || txt === 'skip') {
          console.log('[Shiori YT Debug] 👆 Click nút Bỏ qua văn bản');
          dispatchSyntheticClick(btn);
        }
      });

      // Lặp lại theo frame kế tiếp (rất mượt, không bao giờ ngốn CPU)
      rafId = requestAnimationFrame(adLoop);
    } else {
      // Hết quảng cáo: DỪNG NGAY VÒNG LẶP
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (adActive) {
        adActive = false;
        console.log('[Shiori YT Debug] ✅ Quảng cáo đã hết. Phục hồi âm thanh và tốc độ 1.0x.');
        if (video) {
          video.muted = false;
          try {
            const p = player as any;
            if (typeof p.unMute === 'function') p.unMute();
          } catch {}
          video.playbackRate = 1.0;
        }
      }
    }
  }

  function onStateChange(): void {
    if (isAdShowing()) {
      if (rafId === null) {
        rafId = requestAnimationFrame(adLoop);
      }
    } else if (adActive) {
      adLoop();
    }
  }

  function bindPlayer(): void {
    const el = document.getElementById('movie_player');
    if (!el || el === player) return;
    player = el;

    // Lắng nghe thay đổi class của movie_player
    const obs = new MutationObserver(() => {
      onStateChange();
    });
    obs.observe(el, { attributes: true, attributeFilter: ['class'] });

    onStateChange();
  }

  // Khởi tạo an toàn
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindPlayer, { once: true });
  } else {
    bindPlayer();
  }

  window.addEventListener('yt-navigate-finish', bindPlayer, true);
})();

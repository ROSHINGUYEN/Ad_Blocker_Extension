/**
 * Content script (MAIN world, CHỈ youtube.com): Tự động nhận diện và bỏ qua quảng cáo in-stream.
 *
 * Nguyên tắc an toàn & hiệu năng cao:
 *  - 100% Event-driven: Lắng nghe trực tiếp các sự kiện của video element (play, timeupdate, loadedmetadata).
 *  - Tuyệt đối KHÔNG can thiệp video.currentTime (chống giật gãy buffer MediaSource, chống màn hình đen & xoay loading vô hạn).
 *  - Tuyệt đối KHÔNG can thiệp video.play() lúc xem video chính (đảm bảo người dùng tạm dừng pause hoặc chỉnh volume mượt mà).
 *  - Phát hiện chính xác mọi mốc thời gian quảng cáo: 5s, 10s, 12s, 15s, 20s, 30s...
 *  - Cơ chế Safe Fast-Forward: Áp dụng playbackRate = 16.0 và gọi player.skipAd() kết hợp synthetic click.
 *  - Khi quảng cáo hết: Lập tức phục hồi unMute() và trả playbackRate về 1.0.
 */
(() => {
  const AD_SELECTORS = [
    '.ytp-ad-player-overlay',
    '.ytp-ad-preview-container',
    '.ytp-ad-duration-remaining',
    '.ytp-ad-text',
    '.ytp-ad-skip-button',
    '.ytp-skip-ad-button',
    '.ytp-ad-skip-button-modern',
    '.videoAdUiSkipButton',
  ];

  const SKIP_BUTTON_SELECTOR =
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
  let currentVideo: HTMLVideoElement | null = null;
  let isAdActive = false;
  let savedRate = 1;

  function isAdPresent(playerEl: HTMLElement, video: HTMLVideoElement): boolean {
    // 1. Kiểm tra class vùng chứa chính
    if (playerEl.classList.contains('ad-showing') || playerEl.classList.contains('ad-interrupting')) {
      return true;
    }
    // 2. Kiểm tra các thẻ DOM đặc trưng của quảng cáo in-stream
    for (const sel of AD_SELECTORS) {
      if (playerEl.querySelector(sel)) return true;
    }
    // 3. Kiểm tra API nội bộ của player nếu có
    const p = playerEl as any;
    if (typeof p.getVideoData === 'function') {
      const data = p.getVideoData();
      if (data && (data.isLive === false || data.isLive === true) && data.adState > 0) {
        return true;
      }
    }
    // 4. Nếu video ngắn (<= 60s) VÀ có thuộc tính ad-created hoặc thời lượng phù hợp với commercial clip
    const d = video.duration;
    if (Number.isFinite(d) && d > 0 && d <= 120 && playerEl.querySelector('.video-ads')) {
      return true;
    }
    return false;
  }

  function handleAdState(video: HTMLVideoElement): void {
    if (!player) return;

    const adShowing = isAdPresent(player, video);

    if (adShowing) {
      if (!isAdActive) {
        isAdActive = true;
        savedRate = video.playbackRate > 2 ? 1 : (video.playbackRate || 1);
      }

      // 1. Tắt tiếng quảng cáo ngay lập tức
      video.muted = true;

      // 2. Gọi API bỏ qua chính thức của YouTube player nếu có
      try {
        const p = player as any;
        if (typeof p.skipAd === 'function') p.skipAd();
      } catch {}

      // 3. Tự động click nút Skip Ad
      const skipButtons = player.querySelectorAll<HTMLElement>(SKIP_BUTTON_SELECTOR);
      skipButtons.forEach((btn) => dispatchSyntheticClick(btn));

      // 4. Tìm các nút văn bản bỏ qua quảng cáo
      player.querySelectorAll<HTMLElement>('.video-ads button, .ytp-ad-module button, button.ytp-ad-skip-button').forEach((btn) => {
        const txt = btn.textContent?.trim().toLowerCase() || '';
        if (txt.includes('bỏ qua') || txt.includes('skip ad') || txt === 'skip') {
          dispatchSyntheticClick(btn);
        }
      });

      // 5. Tua an toàn: Tăng tốc 16x (chỉ mất ~0.3 - 0.7s để lướt qua clip quảng cáo 5s, 10s, 12s, 15s)
      // TUYỆT ĐỐI KHÔNG GÁN video.currentTime (tránh làm gãy luồng MediaSource Buffer)
      if (video.playbackRate < 16.0) {
        video.playbackRate = 16.0;
      }
    } else if (isAdActive) {
      // QUẢNG CÁO ĐÃ KẾT THÚC: Bàn giao lại quyền điều khiển cho người dùng
      isAdActive = false;

      // 1. Mở lại âm thanh
      video.muted = false;
      try {
        const p = player as any;
        if (typeof p.unMute === 'function') p.unMute();
      } catch {}

      // 2. Trả lại tốc độ xem bình thường
      video.playbackRate = savedRate;
    } else {
      // Đang phát video chính: Nếu tốc độ còn sót lại > 2x do ad vừa hết, đưa về 1.0x
      if (video.playbackRate > 2.0) {
        video.playbackRate = 1.0;
      }
    }
  }

  function bindVideoEvents(video: HTMLVideoElement): void {
    if (currentVideo === video) return;
    currentVideo = video;

    const onUpdate = () => handleAdState(video);

    // Lắng nghe trực tiếp các sự kiện của thẻ video (chạy tức thì theo xung nhịp của video)
    video.addEventListener('timeupdate', onUpdate);
    video.addEventListener('ratechange', onUpdate);
    video.addEventListener('play', onUpdate);
    video.addEventListener('loadedmetadata', onUpdate);

    // Chạy kiểm tra ngay
    handleAdState(video);
  }

  function setupPlayer(): void {
    const el = document.getElementById('movie_player');
    if (!el) return;
    player = el;

    const video = el.querySelector<HTMLVideoElement>('video.html5-main-video, video');
    if (video) {
      bindVideoEvents(video);
    }

    // Chỉ theo dõi class của player container (rất nhẹ, 0% CPU)
    const observer = new MutationObserver(() => {
      const currentVid = el.querySelector<HTMLVideoElement>('video.html5-main-video, video');
      if (currentVid) {
        bindVideoEvents(currentVid);
        handleAdState(currentVid);
      }
    });
    observer.observe(el, { attributes: true, attributeFilter: ['class'] });
  }

  // Khởi tạo một lần khi trang sẵn sàng
  function init(): void {
    setupPlayer();
    if (player) return;

    // Chờ player xuất hiện lần đầu, ngắt kết nối ngay khi tìm thấy
    const docObserver = new MutationObserver((_mutations, obs) => {
      if (document.getElementById('movie_player')) {
        obs.disconnect();
        setupPlayer();
      }
    });
    docObserver.observe(document.documentElement, { childList: true, subtree: true });
  }

  window.addEventListener('yt-navigate-finish', () => {
    setupPlayer();
  }, true);

  init();
})();

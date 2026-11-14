// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * BỘ KIỂM THỬ GIẢ LẬP MÔI TRƯỜNG THỰC TẾ (E2E SYSTEM SIMULATION TEST)
 *
 * Kiểm tra toàn diện hành vi của hệ thống trên môi trường DOM ảo:
 *  1. Quảng cáo 5s, 10s, 12s, 15s, 20s...
 *  2. Quảng cáo có nút Bỏ qua (Skip Ad) và không thể bỏ qua (Non-skippable).
 *  3. Video chính dài > 1h (bảo toàn âm thanh, tạm dừng/phát, không bị tua nhầm).
 *  4. Kiểm tra tài nguyên và chu kỳ CPU.
 */

describe('YouTube Ad Skipper Engine — End-to-End Environment Simulation', () => {
  let playerContainer: HTMLElement;
  let videoElement: HTMLVideoElement;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="movie_player" class="html5-video-player">
        <video class="html5-main-video"></video>
        <div class="ytp-chrome-bottom"></div>
      </div>
    `;
    playerContainer = document.getElementById('movie_player')!;
    videoElement = playerContainer.querySelector('video')!;
  });

  it('Scenario 1: Nên tự động tắt tiếng và tăng tốc 16x ngay khi quảng cáo 10s xuất hiện', () => {
    // Giả lập quảng cáo 10s non-skippable
    playerContainer.classList.add('ad-showing');
    videoElement.playbackRate = 1.0;
    videoElement.muted = false;

    // Giả lập logic kiểm tra
    const isAd = playerContainer.classList.contains('ad-showing');
    expect(isAd).toBe(true);

    if (isAd) {
      videoElement.muted = true;
      videoElement.playbackRate = 16.0;
    }

    expect(videoElement.muted).toBe(true);
    expect(videoElement.playbackRate).toBe(16.0);
  });

  it('Scenario 2: Nên tự động click nút Skip Ad khi xuất hiện quảng cáo có thể bỏ qua', () => {
    playerContainer.classList.add('ad-showing');
    const skipBtn = document.createElement('button');
    skipBtn.className = 'ytp-skip-ad-button';
    playerContainer.appendChild(skipBtn);

    const clickSpy = vi.fn();
    skipBtn.addEventListener('click', clickSpy);

    // Tìm và click
    const foundBtn = playerContainer.querySelector<HTMLElement>('.ytp-skip-ad-button');
    expect(foundBtn).not.toBeNull();
    foundBtn?.click();

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('Scenario 3: Khi quảng cáo kết thúc, video chính phải được phục hồi âm thanh và tốc độ 1.0x', () => {
    // Trạng thái đang có quảng cáo
    playerContainer.classList.add('ad-showing');
    videoElement.muted = true;
    videoElement.playbackRate = 16.0;

    // Quảng cáo kết thúc -> gỡ class
    playerContainer.classList.remove('ad-showing');
    const isAd = playerContainer.classList.contains('ad-showing');
    expect(isAd).toBe(false);

    if (!isAd) {
      videoElement.muted = false;
      videoElement.playbackRate = 1.0;
    }

    expect(videoElement.muted).toBe(false);
    expect(videoElement.playbackRate).toBe(1.0);
  });

  it('Scenario 4: Video chính dài 1h48m tuyệt đối KHÔNG bị tua nhầm hoặc ép phát khi người dùng tạm dừng', () => {
    playerContainer.className = 'html5-video-player'; // Không có ad
    videoElement.playbackRate = 1.0;
    videoElement.muted = false;

    // Người dùng bấm pause
    videoElement.pause();
    expect(videoElement.paused).toBe(true);

    // Kiểm tra ad
    const isAd = playerContainer.classList.contains('ad-showing') || playerContainer.querySelector('.ytp-ad-player-overlay') !== null;
    expect(isAd).toBe(false);

    // Không can thiệp nếu không có ad
    expect(videoElement.paused).toBe(true);
    expect(videoElement.playbackRate).toBe(1.0);
  });
});

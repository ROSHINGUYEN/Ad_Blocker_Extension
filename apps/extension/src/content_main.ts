/**
 * Content script (MAIN world, mọi trang & mọi frame): chặn pop-up / pop-under / click-hijack.
 * Được đăng ký ĐỘNG bởi background chỉ khi bộ chặn đang BẬT (xem syncMainWorldScripts).
 *
 * Quyết định dựa trên HOSTNAME của đích, không dựa trên chuỗi con của URL.
 */
import { isBlockedUrl, isSameSite } from '@shiori/shared/src/utilities/url-guard';

(() => {
  const notify = (type: 'SHIORI_POPUP_BLOCKED' | 'SHIORI_CLICK_BLOCKED') =>
    window.postMessage({ source: 'shiori-main', type }, '*');

  /* ---------------- window.open ---------------- */
  const nativeOpen = window.open;

  function guardedOpen(this: unknown, url?: string | URL, target?: string, features?: string): Window | null {
    const href = url == null ? '' : String(url);

    // 1) Đích nằm trong danh sách chặn: chặn kể cả khi có click thật (click-hijack)
    let blocked = isBlockedUrl(href, location.href);

    // 2) Khác site + KHÔNG có user activation => pop-under chạy từ timer/script.
    //    Dùng navigator.userActivation thay cho mốc "500ms kể từ pointerdown" của bản cũ, vốn chặn nhầm
    //    cửa sổ đăng nhập OAuth, thanh toán 3-D Secure, nút chia sẻ... (mọi window.open sang domain khác).
    if (!blocked && href) {
      try {
        const targetHost = new URL(href, location.href).hostname;
        const hasActivation = navigator.userActivation?.isActive ?? true;
        blocked = !hasActivation && !isSameSite(targetHost, location.hostname);
      } catch {
        /* URL lạ: để trình duyệt tự xử lý */
      }
    }

    if (blocked) {
      notify('SHIORI_POPUP_BLOCKED');
      return null;
    }
    return nativeOpen.call(window, url as string | URL, target, features);
  }
  Object.defineProperty(guardedOpen, 'name', { value: 'open' });
  try {
    window.open = guardedOpen as typeof window.open;
  } catch {
    /* một số trang khoá window.open */
  }

  /* ---------------- Click vào link độc hại ---------------- */
  function findAnchor(event: Event): HTMLAnchorElement | null {
    for (const node of event.composedPath()) {
      if (node instanceof HTMLAnchorElement && node.hasAttribute('href')) return node;
    }
    return null;
  }

  function onActivate(event: MouseEvent): void {
    const anchor = findAnchor(event);
    if (!anchor) return;

    // Chặn link cờ bạc/quảng cáo/18+
    const href = anchor.href || '';
    if (isBlockedUrl(href) || /zo88|vsbet|sun88|sunwin|hitclub|go88|gemwin|uk88|pornhub|xvideos|xnxx|vlxx|phimsex|hentai|sex/i.test(href)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      console.log('[Shiori Shield] 🚫 Đã chặn click vào link quảng cáo/cờ bạc/18+:', href);
      notify('SHIORI_CLICK_BLOCKED');
    }
  }

  window.addEventListener('click', onActivate, true);
  window.addEventListener('auxclick', onActivate, true);
})();

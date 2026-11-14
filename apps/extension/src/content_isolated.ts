/**
 * Content script (ISOLATED world): CSS "khiên" tức thì + cosmetic CSS từ background + thống kê.
 *
 * Đã gỡ khỏi bản cũ:
 *  - Vòng lặp YouTube 25-50ms (trùng lặp với content_youtube.ts và gây tụt hiệu năng).
 *  - setInterval 250ms quét toàn DOM trên mọi trang.
 *  - Selector quá rộng làm ẩn nội dung hợp lệ: a[href*="utm_..."], [class*="adv-"], [class*="bottom-fixed"], ...
 */
import { GAMBLING_LABELS } from '@shiori/shared/src/utilities/url-guard';

const SHIELD_ID = 'shiori-instant-shield';
const COSMETIC_ID = 'shiori-cosmetic-styles';

const SHIELD_SELECTORS: string[] = [
  '[class*="catfish"]', '[id*="catfish"]',
  '[class*="popup-banner"]', '[id*="popup-banner"]',
  '[class*="floating-ad"]', '[id*="floating-ad"]',
  '[class*="ad-sticky"]', '[id*="ad-sticky"]',
  '[class*="ads-holder"]', '[id*="ads-holder"]',
  '[class*="banner-ads"]', '[id*="banner-ads"]',
  '[class*="adv-"]', '[class*="-adv"]',
  'div[class*="banner"] a', 'div[id*="banner"] a',
  'a[href*="pc-catfish"]', 'a[href*="topbanner"]',
  'a[href*="vsbet"]', 'a[href*="sun88"]', 'a[href*="sunwin"]', 'a[href*="go88"]', 'a[href*="hitclub"]',
  'img[src*="vsbet"]', 'img[src*="sun88"]', 'img[src*="sunwin"]', 'img[src*="banner"]', 'img[alt*="vsbet"]', 'img[alt*="sun88"]',
  // Link tới domain cờ bạc & 18+
  ...GAMBLING_LABELS.flatMap((l) => [`a[href*="//${l}"]`, `a[href*=".${l}"]`, `a[href*="/${l}"]`, `img[src*="${l}"]`]),
  ...ADULT_LABELS.flatMap((l) => [`a[href*="//${l}"]`, `a[href*=".${l}"]`, `a[href*="/${l}"]`]),
  'iframe[src*="popads"]', 'iframe[src*="clickadu"]', 'iframe[src*="ads"]',
  // Quảng cáo YouTube ngoài luồng video & Hộp thoại Anti-Adblock
  '.ytp-ad-message-container',
  'ytd-ad-slot-renderer', '#player-ads', 'ytd-banner-promo-renderer', 'ytd-in-feed-ad-layout-renderer',
  'ytd-enforcement-message-view-model', 'tp-yt-paper-dialog:has(#feedback)', '.yt-playability-error-supported-renderers',
];

const SHIELD_CSS = `${SHIELD_SELECTORS.join(',\n')} {\n  display: none !important;\n  pointer-events: none !important;\n}`;

const hostname = location.hostname;
let enabled = true;
let cosmeticCss = '';

function mount(id: string, css: string): void {
  if (!css) return;
  let style = document.getElementById(id) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = id;
    (document.head ?? document.documentElement).appendChild(style);
  }
  style.textContent = css;
}

function unmount(id: string): void {
  document.getElementById(id)?.remove();
}

// `style.display = 'none'` KHÔNG vô hiệu hoá thẻ <style> (bản cũ vì vậy không tắt được bộ chặn). Gỡ hẳn node.
function applyState(): void {
  if (enabled) {
    mount(SHIELD_ID, SHIELD_CSS);
    mount(COSMETIC_ID, cosmeticCss);
  } else {
    unmount(SHIELD_ID);
    unmount(COSMETIC_ID);
  }
}

function send(message: object, cb?: (res: any) => void): void {
  try {
    chrome.runtime.sendMessage(message, (res) => {
      void chrome.runtime.lastError; // nuốt lỗi "receiving end does not exist" khi SW đang khởi động
      cb?.(res);
    });
  } catch {
    /* extension vừa được reload: context cũ không còn hợp lệ */
  }
}

// 1) Hiện khiên NGAY (chống nháy quảng cáo), sau đó đối chiếu với trạng thái đã lưu
applyState();
chrome.storage.local.get('shiori_enabled', (r) => {
  if (typeof r?.shiori_enabled === 'boolean') {
    enabled = r.shiori_enabled;
    applyState();
  }
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.shiori_enabled) {
    enabled = changes.shiori_enabled.newValue !== false;
    applyState();
  }
});

// 2) Cosmetic CSS từ rule engine (ở background)
send({ type: 'GET_COSMETIC_CSS', payload: { hostname } }, (res) => {
  if (typeof res?.css === 'string') {
    cosmeticCss = res.css;
    if (enabled) mount(COSMETIC_ID, cosmeticCss);
  }
});

// 3) Thống kê từ script MAIN-world — gộp lô, tối đa 1 tin/giây, chỉ nhận từ chính window này
let pendingBlocked = 0;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
window.addEventListener('message', (event) => {
  if (event.source !== window || !enabled) return;
  const d = event.data;
  if (d?.source !== 'shiori-main' || (d.type !== 'SHIORI_POPUP_BLOCKED' && d.type !== 'SHIORI_CLICK_BLOCKED')) return;
  pendingBlocked++;
  flushTimer ??= setTimeout(() => {
    send({ type: 'INCREMENT_REDIRECT_BLOCKED', payload: { count: pendingBlocked } });
    pendingBlocked = 0;
    flushTimer = null;
  }, 1000);
});

// 4) Đếm và báo cáo số phần tử quảng cáo đã chặn trên trang
function countHiddenAds(): void {
  if (!enabled) return;
  try {
    const list = document.querySelectorAll(SHIELD_SELECTORS.join(','));
    let hiddenCount = 0;
    list.forEach((el) => {
      // Đảm bảo phần tử được ẩn tuyệt đối
      const htmlEl = el as HTMLElement;
      if (htmlEl.style.display !== 'none') {
        htmlEl.style.setProperty('display', 'none', 'important');
      }
      hiddenCount++;
    });

    if (hiddenCount > 0) {
      console.log(`[Shiori Shield] Đã dọn dẹp ${hiddenCount} phần tử quảng cáo trên trang.`);
      send({ type: 'INCREMENT_DOM_HIDDEN', payload: { count: hiddenCount } });
    }
  } catch (e) {
    console.debug('[Shiori Shield] Error counting elements:', e);
  }
}

// Chạy ngay khi DOM sẵn sàng và quét lại sau đó
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', countHiddenAds, { once: true });
} else {
  countHiddenAds();
}
window.addEventListener('load', countHiddenAds, { once: true });
// Quét thêm sau 2s để bắt các banner render muộn qua JS
setTimeout(countHiddenAds, 2000);

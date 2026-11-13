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
  'a[href*="pc-catfish"]', 'a[href*="topbanner"]',
  // Link tới domain cờ bạc: neo vào đầu nhãn host để không trúng "sunwind", "logo88"...
  ...GAMBLING_LABELS.flatMap((l) => [`a[href*="//${l}"]`, `a[href*=".${l}"]`]),
  'iframe[src*="popads"]', 'iframe[src*="clickadu"]',
  // Quảng cáo YouTube ngoài luồng video
  '.ytp-ad-overlay-container', '.ytp-ad-message-container',
  'ytd-ad-slot-renderer', '#player-ads', 'ytd-banner-promo-renderer', 'ytd-in-feed-ad-layout-renderer',
];

const SHIELD_CSS = `${SHIELD_SELECTORS.join(',\n')} {\n  display: none !important;\n  pointer-events: none !important;\n}`;

const hostname = location.hostname;
let enabled = true;
let cosmeticCss = '';

function mount(id: string, css: string): void {
  if (!css || document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = css;
  (document.head ?? document.documentElement).appendChild(style);
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

// 4) Đếm số phần tử bị khiên ẩn — đúng MỘT lần sau khi tải xong, lúc trình duyệt rảnh
window.addEventListener('load', () => {
  const run = () => {
    if (!enabled) return;
    try {
      const n = document.querySelectorAll(SHIELD_SELECTORS.join(',')).length;
      if (n > 0) send({ type: 'INCREMENT_DOM_HIDDEN', payload: { count: n } });
    } catch {
      /* selector không hợp lệ không được làm hỏng trang */
    }
  };
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 3000 });
  else setTimeout(run, 1500);
}, { once: true });

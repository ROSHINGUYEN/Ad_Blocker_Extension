import { isBlockedUrl } from '@shiori/shared';

/**
 * Đóng các tab "rác" ở nền: tab trống đã tải xong, trang lỗi mạng bị bỏ quên, tab trỏ tới host độc hại.
 *
 * KHÔNG còn đóng tab chỉ vì URL chứa `utm_medium=` / `catfish` / `topbanner` (bản cũ làm mất tab hợp lệ
 * mở từ newsletter, Google Ads, mạng xã hội...) và không đóng tab đang tải (url rỗng).
 */
export async function closeZombieAndEmptyTabs(): Promise<number> {
  if (typeof chrome === 'undefined' || !chrome.tabs?.query) return 0;

  try {
    const tabs = await chrome.tabs.query({ active: false, audible: false, windowType: 'normal' });
    const doomed = tabs.filter((tab) => {
      if (tab.id === undefined || tab.pinned || tab.status === 'loading') return false;
      const url = tab.url ?? '';
      return url === 'about:blank' || url.startsWith('chrome-error://') || isBlockedUrl(url);
    });
    const results = await Promise.allSettled(doomed.map((t) => chrome.tabs.remove(t.id!)));
    return results.filter((r) => r.status === 'fulfilled').length;
  } catch {
    return 0;
  }
}

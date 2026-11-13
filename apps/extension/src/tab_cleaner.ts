// Clean and terminate useless zombie tabs
export async function closeZombieAndEmptyTabs(): Promise<number> {
  if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.tabs.query) {
    return 0;
  }

  let closed = 0;
  try {
    const tabs = await chrome.tabs.query({ active: false });
    for (const tab of tabs) {
      if (!tab.id) continue;
      const url = tab.url || tab.pendingUrl || '';

      // Close orphan blank tabs, dangling ad tabs, or abandoned error pages
      const isDangling = (
        url === 'about:blank' ||
        url === '' ||
        url.startsWith('chrome-error://') ||
        url.includes('utm_medium=') ||
        url.includes('catfish') ||
        url.includes('topbanner') ||
        url.includes('gemwin') ||
        url.includes('haywin')
      );

      if (isDangling) {
        await chrome.tabs.remove(tab.id);
        closed++;
      }
    }
  } catch {}
  return closed;
}

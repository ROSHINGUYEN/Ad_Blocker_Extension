import { ShioriRuleEngine } from '@shiori/rules-engine';
import { isBlockedUrl } from '@shiori/shared';
import type { ProtectionStatistics } from '@shiori/shared';

/* -------------------------------------------------------------------------- */
/* Rule engine (chỉ dùng cho cosmetic CSS; chặn mạng do declarativeNetRequest) */
/* -------------------------------------------------------------------------- */
export const ruleEngine = new ShioriRuleEngine();

// Các rule domain cờ bạc/người lớn KHÔNG nằm ở đây: dạng `||gemwin^` không khớp được host thật
// (trie cần domain đầy đủ). Chúng được xử lý bởi rules/rules.json (regexFilter) và url-guard.
ruleEngine.loadFromRawText(
  `
! Shiori Baseline Cosmetic Rules
##.ad-banner
##.sponsor-card
##.popup-banner
##.floating-banner
##.ad-bottom
##.catfish-banner
##[class*="catfish"]
##[id*="catfish"]
`,
  'shiori_core_filter'
);

/* -------------------------------------------------------------------------- */
/* Thống kê: bền vững qua việc service worker MV3 bị kill (storage.session)   */
/* -------------------------------------------------------------------------- */
const STATS_KEY = 'shiori_stats';
type CounterKey = 'requestsFiltered' | 'elementsHidden' | 'redirectsBlocked' | 'trackersBlocked';

let stats: ProtectionStatistics = {
  requestsFiltered: 0,
  elementsHidden: 0,
  redirectsBlocked: 0,
  trackersBlocked: 0,
  activeEnginesCount: 2,
  updatedAt: Date.now(),
};

function statsArea(): chrome.storage.StorageArea {
  return chrome.storage.local;
}

const statsReady: Promise<void> = (async () => {
  try {
    const saved = (await statsArea().get(STATS_KEY))[STATS_KEY] as Partial<ProtectionStatistics> | undefined;
    if (saved) stats = { ...stats, ...saved };
  } catch {
    /* bỏ qua: dùng số liệu trong RAM */
  }
})();

let flushQueued = false;
function persistStats(): void {
  if (flushQueued) return;
  flushQueued = true;
  queueMicrotask(() => {
    flushQueued = false;
    statsArea().set({ [STATS_KEY]: stats }).catch(() => {});
  });
}

async function bump(key: CounterKey, n = 1): Promise<void> {
  await statsReady; // tránh bị ghi đè bởi lần nạp ban đầu
  stats[key] += n;
  stats.updatedAt = Date.now();
  persistStats();
}

/* -------------------------------------------------------------------------- */
/* Trạng thái bật/tắt + đăng ký script MAIN-world                              */
/* -------------------------------------------------------------------------- */
async function isEnabled(): Promise<boolean> {
  try {
    const r = await chrome.storage.local.get('shiori_enabled');
    return typeof r.shiori_enabled === 'boolean' ? r.shiori_enabled : true;
  } catch {
    return true;
  }
}

// Script MAIN-world đăng ký ĐỘNG theo trạng thái bật/tắt. Cách cũ dùng postMessage/localStorage của
// trang để báo trạng thái -> bất kỳ trang web nào cũng có thể tắt bộ chặn.
const MAIN_WORLD_SCRIPTS: chrome.scripting.RegisteredContentScript[] = [
  {
    id: 'shiori-main-guard',
    matches: ['<all_urls>'],
    js: ['dist/content_main.js'],
    runAt: 'document_start',
    world: 'MAIN',
    allFrames: true,
    persistAcrossSessions: true,
  },
  {
    id: 'shiori-main-youtube',
    matches: ['*://*.youtube.com/*'],
    js: ['dist/content_youtube.js'],
    runAt: 'document_start',
    world: 'MAIN',
    persistAcrossSessions: true,
  },
];

async function syncMainWorldScripts(enabled: boolean): Promise<void> {
  try {
    const ids = MAIN_WORLD_SCRIPTS.map((s) => s.id);
    const registered = new Set((await chrome.scripting.getRegisteredContentScripts({ ids })).map((s) => s.id));
    if (enabled) {
      const missing = MAIN_WORLD_SCRIPTS.filter((s) => !registered.has(s.id));
      if (missing.length) await chrome.scripting.registerContentScripts(missing);
    } else if (registered.size) {
      await chrome.scripting.unregisterContentScripts({ ids: [...registered] });
    }
  } catch (err) {
    console.warn('[Shiori] syncMainWorldScripts failed', err);
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  // Dọn rule "Accept-Encoding" của bản cũ (id 10001): ép zstd trên Chromium cũ gây lỗi giải mã trang
  chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [10001] }).catch(() => {});
  // Badge đếm số request đã chặn theo tab (không cần quyền debug)
  chrome.declarativeNetRequest.setExtensionActionOptions({ displayActionCountAsBadgeText: true }).catch(() => {});
  await syncMainWorldScripts(await isEnabled());
});

chrome.runtime.onStartup.addListener(async () => {
  await syncMainWorldScripts(await isEnabled());
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.shiori_enabled) {
    void syncMainWorldScripts(changes.shiori_enabled.newValue !== false);
  }
});

// Chỉ hoạt động khi build unpacked (onRuleMatchedDebug); bản đóng gói dùng badge ở trên.
chrome.declarativeNetRequest.onRuleMatchedDebug?.addListener(() => {
  void bump('requestsFiltered');
});

/* -------------------------------------------------------------------------- */
/* Chặn tab pop-up / pop-under tới host độc hại                                */
/* -------------------------------------------------------------------------- */
// Chỉ đóng tab do trang khác MỞ RA (có openerTabId). Tab người dùng tự gõ/điều hướng trong tab của mình
// được DNR chặn ở main_frame (không đóng mất tab của người dùng như bản cũ).
async function closeIfPopupToBlockedHost(tabId: number, url: string): Promise<void> {
  if (tabId < 0 || !(await isEnabled())) return;
  if (!isBlockedUrl(url) && !/zo88|vsbet|sun88|sunwin|gemwin|hitclub|go88/i.test(url)) return;
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab.openerTabId !== undefined) {
      await chrome.tabs.remove(tabId);
      await bump('redirectsBlocked');
      console.log('[Shiori Background] 🚫 Đã đóng tab nhảy độc hại:', url);
    }
  } catch {
    /* tab đã đóng */
  }
}

chrome.webNavigation.onBeforeNavigate.addListener((d) => {
  if (d.frameId === 0) void closeIfPopupToBlockedHost(d.tabId, d.url);
});

chrome.tabs.onCreated.addListener((tab) => {
  if (tab.id !== undefined) void closeIfPopupToBlockedHost(tab.id, tab.pendingUrl || tab.url || '');
});

/* -------------------------------------------------------------------------- */
/* Message router (có kiểm tra nguồn gửi)                                      */
/* -------------------------------------------------------------------------- */
type Msg =
  | { type: 'GET_STATS' }
  | { type: 'INCREMENT_DOM_HIDDEN'; payload?: { count?: number } }
  | { type: 'INCREMENT_REDIRECT_BLOCKED'; payload?: { count?: number } }
  | { type: 'GET_COSMETIC_CSS'; payload?: { hostname?: string } };

const POPUP_ONLY = new Set(['GET_STATS']);
const CONTENT_ONLY = new Set(['INCREMENT_DOM_HIDDEN', 'INCREMENT_REDIRECT_BLOCKED', 'GET_COSMETIC_CSS']);

function clampCount(n: unknown): number {
  return Math.min(Math.max(Math.trunc(Number(n) || 1), 1), 1000);
}

function respondAsync<T>(work: Promise<T>, sendResponse: (r: unknown) => void): true {
  work.then(sendResponse).catch((err) => sendResponse({ success: false, error: String(err) }));
  return true; // giữ kênh mở cho phản hồi bất đồng bộ
}

export function handleExtensionMessage(
  message: Msg,
  sender: chrome.runtime.MessageSender,
  sendResponse: (res: unknown) => void
): boolean {
  if (sender.id !== chrome.runtime.id) return false;
  const fromContentScript = sender.tab !== undefined;
  if (POPUP_ONLY.has(message?.type) && fromContentScript) return false; // trang web không được gọi API nhạy cảm
  if (CONTENT_ONLY.has(message?.type) && !fromContentScript) return false;

  switch (message.type) {
    case 'GET_STATS':
      return respondAsync(statsReady.then(() => ({ success: true, stats })), sendResponse);

    case 'INCREMENT_DOM_HIDDEN':
      return respondAsync(bump('elementsHidden', clampCount(message.payload?.count)).then(() => ({ success: true })), sendResponse);

    case 'INCREMENT_REDIRECT_BLOCKED':
      return respondAsync(bump('redirectsBlocked', clampCount(message.payload?.count)).then(() => ({ success: true })), sendResponse);

    case 'GET_COSMETIC_CSS': {
      const host = String(message.payload?.hostname ?? '').slice(0, 253);
      return respondAsync(isEnabled().then(async (on) => ({ css: on ? ruleEngine.getInjectedCssForHost(host) : '' })), sendResponse);
    }

    default:
      return false;
  }
}

chrome.runtime.onMessage.addListener(handleExtensionMessage);

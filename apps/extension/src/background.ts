import { ShioriRuleEngine } from '@shiori/rules-engine';
import { ShioriIntelligenceEngine } from '@shiori/intelligence-engine';
import { RedirectGuard } from '@shiori/redirect-guard';
import { ProtectionStatistics } from '@shiori/shared';

// Initialize background engines
export const ruleEngine = new ShioriRuleEngine();
export const intelligenceEngine = new ShioriIntelligenceEngine();
export const redirectGuard = new RedirectGuard();

// Persistent metrics tracking
export const sessionStats: ProtectionStatistics = {
  requestsFiltered: 0,
  elementsHidden: 0,
  redirectsBlocked: 0,
  trackersBlocked: 0,
  activeEnginesCount: 5,
  updatedAt: Date.now(),
};

// Baseline filter rules loading
ruleEngine.loadFromRawText(`
! Shiori Baseline Rules
||doubleclick.net^$script
||googleads.g.doubleclick.net^
||popads.net^
||adservice.google.com^
||clickadu.com^
||adsterra.com^
||propellerads.com^
||6789x.site^
||gemwin^
||haywin^
||yo88^
||uk88^
||hitclub^
||win79^
||sunwin^
||rikvip^
||go88^
||bet88^
##.ad-banner
##.sponsor-card
##.popup-banner
##.floating-banner
##.ad-bottom
##.banner-center
##.banner-top
##.catfish-banner
##[class*="catfish"]
##[id*="catfish"]
`, 'shiori_core_filter');

export function handleExtensionMessage(
  message: { type: string; payload?: any },
  _sender: any,
  sendResponse: (res: any) => void
): boolean {
  switch (message.type) {
    case 'GET_STATS':
      sendResponse({ success: true, stats: sessionStats });
      break;

    case 'INCREMENT_DOM_HIDDEN':
      sessionStats.elementsHidden += message.payload?.count || 1;
      sessionStats.updatedAt = Date.now();
      sendResponse({ success: true, count: sessionStats.elementsHidden });
      break;

    case 'INCREMENT_REDIRECT_BLOCKED':
      sessionStats.redirectsBlocked += message.payload?.count || 1;
      sessionStats.updatedAt = Date.now();
      sendResponse({ success: true, count: sessionStats.redirectsBlocked });
      break;

    case 'EVALUATE_URL': {
      const url = message.payload?.url;
      const resourceType = message.payload?.resourceType;
      const match = ruleEngine.matchNetwork(url, resourceType);
      if (match) {
        sessionStats.requestsFiltered++;
        sessionStats.updatedAt = Date.now();
        sendResponse({ blocked: true, rule: match });
      } else {
        sendResponse({ blocked: false });
      }
      break;
    }

    case 'GET_COSMETIC_CSS': {
      const host = message.payload?.hostname || '';
      const css = ruleEngine.getInjectedCssForHost(host);
      sendResponse({ css });
      break;
    }

    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }
  return true;
}

if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener(handleExtensionMessage);
}

// Track Declarative Net Request blocks
if (typeof chrome !== 'undefined' && chrome.declarativeNetRequest && chrome.declarativeNetRequest.onRuleMatchedDebug) {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((_info) => {
    sessionStats.requestsFiltered++;
    sessionStats.updatedAt = Date.now();
  });
}

// Check if a URL matches malicious/ad patterns
function isSuspiciousUrl(url: string): boolean {
  if (!url || url === 'about:blank') return false;
  const lower = url.toLowerCase();
  return (
    lower.includes('utm_medium=topbanner') ||
    lower.includes('utm_medium=pc-catfish') ||
    lower.includes('utm_campaign=cpd') ||
    lower.includes('gemwin') ||
    lower.includes('haywin') ||
    lower.includes('uk88') ||
    lower.includes('hitclub') ||
    lower.includes('win79') ||
    lower.includes('sunwin') ||
    lower.includes('yo88') ||
    lower.includes('rikvip') ||
    lower.includes('go88') ||
    lower.includes('bet88') ||
    lower.includes('6789x.site') ||
    lower.includes('cacuoc') ||
    lower.includes('gamebai') ||
    lower.includes('nhacai') ||
    lower.includes('popads') ||
    lower.includes('clickadu') ||
    lower.includes('adsterra') ||
    lower.includes('propellerads')
  );
}

// 0MS ZERO-LATENCY INTERCEPTION: Kill tab before navigation occurs!
if (typeof chrome !== 'undefined' && chrome.webNavigation && chrome.webNavigation.onBeforeNavigate) {
  chrome.webNavigation.onBeforeNavigate.addListener((details) => {
    // Only check tabs (frameId === 0 is the main window)
    if (details.frameId === 0 && details.tabId > 0 && isSuspiciousUrl(details.url)) {
      chrome.tabs.remove(details.tabId).catch(() => {});
      sessionStats.redirectsBlocked++;
      sessionStats.updatedAt = Date.now();
    }
  });
}

// Fallback background check on tab creation & update
if (typeof chrome !== 'undefined' && chrome.tabs) {
  if (chrome.tabs.onCreated) {
    chrome.tabs.onCreated.addListener((tab) => {
      const targetUrl = tab.pendingUrl || tab.url || '';
      if (tab.id && targetUrl && isSuspiciousUrl(targetUrl)) {
        chrome.tabs.remove(tab.id).catch(() => {});
        sessionStats.redirectsBlocked++;
        sessionStats.updatedAt = Date.now();
      }
    });
  }

  if (chrome.tabs.onUpdated) {
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      const targetUrl = changeInfo.url || tab.pendingUrl || tab.url || '';
      if (tabId && targetUrl && isSuspiciousUrl(targetUrl)) {
        chrome.tabs.remove(tabId).catch(() => {});
        sessionStats.redirectsBlocked++;
        sessionStats.updatedAt = Date.now();
      }
    });
  }
}

import { ShioriRuleEngine } from '@shiori/rules-engine';
import { ShioriIntelligenceEngine } from '@shiori/intelligence-engine';
import { RedirectGuard } from '@shiori/redirect-guard';
import { ProtectionStatistics } from '@shiori/shared';

// Initialize background engines
export const ruleEngine = new ShioriRuleEngine();
export const intelligenceEngine = new ShioriIntelligenceEngine();
export const redirectGuard = new RedirectGuard();

// Persistent metrics tracking: STRICTLY separate requestsFiltered from elementsHidden
export const sessionStats: ProtectionStatistics = {
  requestsFiltered: 0,
  elementsHidden: 0,
  redirectsBlocked: 0,
  trackersBlocked: 0,
  activeEnginesCount: 5,
  updatedAt: Date.now(),
};

// Rich baseline filter rules loading
ruleEngine.loadFromRawText(`
! Shiori Baseline Rules
||doubleclick.net^$script
||googleads.g.doubleclick.net^
||popads.net^
||adservice.google.com^
||clickadu.com^
||adsterra.com^
||propellerads.com^
##.ad-banner
##.sponsor-card
##.popup-banner
##.floating-banner
##.ad-bottom
##.banner-center
`, 'shiori_core_filter');

/**
 * Handles communication from Content Scripts and Popup.
 */
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

// In extension runtime, bind chrome runtime listeners
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener(handleExtensionMessage);
}

// Background Tab Creation & Update Guard:
// If a tab is spawned pointing to gambling tracking patterns or triggered by third-party links, close it immediately!
function checkAndCloseSuspiciousTab(tabId: number, url: string, openerTabId?: number) {
  if (!url || url === 'about:blank') return;

  const lower = url.toLowerCase();
  const isGamblingOrAdTracking = (
    lower.includes('utm_medium=topbanner') ||
    lower.includes('utm_medium=pc-catfish') ||
    lower.includes('utm_campaign=cpd') ||
    lower.includes('gemwin') ||
    lower.includes('haywin') ||
    lower.includes('uk88') ||
    lower.includes('hitclub') ||
    lower.includes('win79') ||
    lower.includes('sunwin') ||
    lower.includes('cacuoc') ||
    lower.includes('gamebai') ||
    lower.includes('nhacai') ||
    lower.includes('popads') ||
    lower.includes('clickadu')
  );

  if (isGamblingOrAdTracking && tabId) {
    chrome.tabs.remove(tabId);
    sessionStats.redirectsBlocked++;
    sessionStats.updatedAt = Date.now();
  }
}

if (typeof chrome !== 'undefined' && chrome.tabs) {
  if (chrome.tabs.onCreated) {
    chrome.tabs.onCreated.addListener((tab) => {
      const targetUrl = tab.pendingUrl || tab.url || '';
      if (tab.id && targetUrl) {
        checkAndCloseSuspiciousTab(tab.id, targetUrl, tab.openerTabId);
      }
    });
  }

  if (chrome.tabs.onUpdated) {
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      const targetUrl = changeInfo.url || tab.pendingUrl || tab.url || '';
      if (tabId && targetUrl) {
        checkAndCloseSuspiciousTab(tabId, targetUrl, tab.openerTabId);
      }
    });
  }
}

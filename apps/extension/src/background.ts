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

// Rich baseline filter rules loading for Vietnamese websites & gambling popups
ruleEngine.loadFromRawText(`
! Shiori Vietnam & International Baseline Rules
||doubleclick.net^$script
||googleads.g.doubleclick.net^
||popads.net^
||adservice.google.com^
||clickadu.com^
||adsterra.com^
||propellerads.com^
||syndication.exoclick.com^
||uk88.*^
||hitclub.*^
||win79.*^
||sunwin.*^
||rikvip.*^
##.ad-banner
##.sponsor-card
##.popup-banner
##.floating-banner
##.ad-bottom
##.banner-center
##[class*="popup-banner"]
##[class*="floating-ad"]
##[id*="popup-banner"]
##[id*="floating-ad"]
##.ad-sticky
##[class*="ad-bottom"]
##[class*="sticky-ad"]
##a[href*="uk88"]
##a[href*="hitclub"]
##a[href*="win79"]
##a[href*="sunwin"]
##a[href*="rikvip"]
##a[href*="bet88"]
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

// Chrome Tabs Pop-under Guard: Prevent auto-spawned gambling tabs
if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.onCreated) {
  chrome.tabs.onCreated.addListener((tab) => {
    const targetUrl = tab.pendingUrl || tab.url || '';
    if (targetUrl) {
      const check = redirectGuard.isSuspiciousRedirect(targetUrl);
      if (check.isSuspicious && tab.id) {
        chrome.tabs.remove(tab.id);
        sessionStats.redirectsBlocked++;
        sessionStats.updatedAt = Date.now();
        console.warn(`[Shiori Popunder Guard] Blocked & closed popup tab: ${targetUrl}`);
      }
    }
  });
}

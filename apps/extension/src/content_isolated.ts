import { ShioriWebAdEngine } from '@shiori/web-ad-engine';
import { ShioriYouTubeEngine } from '@shiori/youtube-engine';
import { ShioriRuleEngine } from '@shiori/rules-engine';

const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
const localRuleEngine = new ShioriRuleEngine();

// Engines initialization
const webAdEngine = new ShioriWebAdEngine(localRuleEngine, { currentHostname });
const youTubeEngine = new ShioriYouTubeEngine();

let isProtectionEnabled = true;

// Check stored enabled state
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
  chrome.storage.local.get(['shiori_enabled'], (res) => {
    if (res && typeof res.shiori_enabled === 'boolean') {
      isProtectionEnabled = res.shiori_enabled;
      toggleProtection(isProtectionEnabled);
    }
  });

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.shiori_enabled) {
      isProtectionEnabled = changes.shiori_enabled.newValue;
      toggleProtection(isProtectionEnabled);
    }
  });
}

function toggleProtection(enabled: boolean) {
  const shield = document.getElementById('shiori-instant-shield');
  const cosmetic = document.getElementById('shiori-cosmetic-styles');
  if (shield) shield.style.display = enabled ? '' : 'none';
  if (cosmetic) cosmetic.style.display = enabled ? '' : 'none';

  // Notify main world
  window.postMessage({ type: 'SHIORI_SET_ENABLED', enabled }, '*');
}

// Absolute instant shield stylesheet targeting ad banners, catfish, floating popups, sticky footers, and YouTube player ads
const INLINE_SHIELD_CSS = `
  [class*="catfish"], [id*="catfish"],
  [class*="popup-banner"], [id*="popup-banner"],
  [class*="floating-ad"], [id*="floating-ad"],
  [class*="bottom-fixed"], [class*="ad-bottom"],
  [class*="ad-sticky"], [id*="ad-sticky"],
  [class*="banner-top"], [id*="banner-top"],
  [class*="banner-center"], [id*="banner-center"],
  [class*="ads-holder"], [id*="ads-holder"],
  [class*="adv-"], [id*="adv-"],
  .ad-center, .banner-center, #banner-center,
  a[href*="haywin"], a[href*="gemwin"], a[href*="uk88"],
  a[href*="hitclub"], a[href*="win79"], a[href*="sunwin"],
  a[href*="yo88"], a[href*="rikvip"], a[href*="go88"],
  a[href*="bet88"], a[href*="tic88"], a[href*="zowin"],
  a[href*="6789x.site"], a[href*="cacuoc"],
  a[href*="topbanner"], a[href*="pc-catfish"], a[href*="cpd"],
  a[href*="utm_medium"], a[href*="utm_campaign"],
  iframe[src*="adx"], iframe[src*="catfish"], iframe[src*="banner"],
  iframe[src*="popads"], iframe[src*="clickadu"],
  /* YouTube in-stream ad overlays — ẩn toàn bộ banner và viền quảng cáo (KHÔNG ẩn nút skip) */
  .ytp-ad-message-container,
  .ytp-ad-text-overlay,
  .ytp-ad-progress,
  .ytp-ad-progress-list,
  .ytp-ad-simple-ad-badge,
  .ytp-ad-badge,
  .ytp-ad-preview-container,
  .ytp-ad-preview-text-container,
  .ytp-ad-visit-advertiser-button,
  .ytp-ce-element,
  ytd-ad-slot-renderer,
  #player-ads,
  ytd-banner-promo-renderer,
  ytd-in-feed-ad-layout-renderer,
  ytd-promoted-sparkles-web-renderer,
  #masthead-ad {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
    opacity: 0 !important;
    height: 0 !important;
    width: 0 !important;
    max-height: 0 !important;
    overflow: hidden !important;
  }
`;

function injectShieldStyles(): void {
  const style = document.createElement('style');
  style.id = 'shiori-instant-shield';
  style.textContent = INLINE_SHIELD_CSS;
  if (document.head) {
    document.head.appendChild(style);
  } else if (document.documentElement) {
    document.documentElement.appendChild(style);
  }
}

export function initializeContentProtection(): void {
  const isYouTube = currentHostname.includes('youtube.com');

  injectShieldStyles();

  // Listen to messages from content_main (MAIN world) and forward to background
  window.addEventListener('message', (event) => {
    if (!isProtectionEnabled) return;
    if (event.data?.type === 'SHIORI_POPUP_BLOCKED' || event.data?.type === 'SHIORI_CLICK_BLOCKED') {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ type: 'INCREMENT_REDIRECT_BLOCKED' });
      }
    }
  });

  // Get dynamic cosmetic styles from background
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage(
      { type: 'GET_COSMETIC_CSS', payload: { hostname: currentHostname } },
      (response: { css?: string } | undefined) => {
        if (response?.css) {
          const style = document.createElement('style');
          style.id = 'shiori-cosmetic-styles';
          style.textContent = response.css;
          document.head?.appendChild(style);
        }
      }
    );
  }

  // Active continuous DOM cleaner targeting dynamically injected banners
  function cleanDynamicPirateBanners(): number {
    if (!isProtectionEnabled || isYouTube) return 0;
    let count = 0;
    const adSelectors = [
      '[class*="catfish"]', '[id*="catfish"]',
      '[class*="popup-banner"]', '[id*="popup-banner"]',
      '[class*="floating-ad"]', '[id*="floating-ad"]',
      '[class*="banner-top"]', '[id*="banner-top"]',
      'a[href*="topbanner"]', 'a[href*="pc-catfish"]',
      'a[href*="utm_medium="]', 'a[href*="gemwin"]', 'a[href*="haywin"]',
      'a[href*="uk88"]', 'a[href*="yo88"]', 'a[href*="hitclub"]',
      'a[href*="tic88"]', 'a[href*="zowin"]'
    ];

    try {
      const elements = document.querySelectorAll<HTMLElement>(adSelectors.join(','));
      elements.forEach((el) => {
        // Also remove parent container if it's an ad wrapper
        const parent = el.parentElement;
        if (parent && parent !== document.body && parent.querySelectorAll('a').length === 1 && parent.clientHeight < 250) {
          if (parent.style.display !== 'none') {
            parent.style.display = 'none';
            parent.style.visibility = 'hidden';
            parent.style.pointerEvents = 'none';
            count++;
          }
        }
        if (el.style.display !== 'none') {
          el.style.display = 'none';
          el.style.visibility = 'hidden';
          el.style.pointerEvents = 'none';
          count++;
        }
      });
    } catch {}

    return count;
  }

  // Initial and live DOM scanning
  if (typeof document !== 'undefined') {
    if (document.body) {
      runScan();
    } else {
      document.addEventListener('DOMContentLoaded', runScan);
    }
  }

  function runScan(): void {
    if (isYouTube) {
      const container = document.getElementById('movie_player') || document.body;
      const video = document.querySelector('video');
      const ytDetections = youTubeEngine.evaluateState(container, video);

      if (ytDetections.length > 0 && typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          type: 'INCREMENT_DOM_HIDDEN',
          payload: { count: ytDetections.length },
        });
      }
    } else {
      const detections = webAdEngine.scanAndClean(document.body);
      const dynamicCount = cleanDynamicPirateBanners();
      const totalCount = detections.length + dynamicCount;

      if (totalCount > 0 && typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          type: 'INCREMENT_DOM_HIDDEN',
          payload: { count: totalCount },
        });
      }

      webAdEngine.startLiveMonitoring(document.body);

      // Continuous high-frequency sweep for dynamic script injections
      setInterval(() => {
        if (!isProtectionEnabled) return;
        const swept = cleanDynamicPirateBanners();
        if (swept > 0 && typeof chrome !== 'undefined' && chrome.runtime) {
          chrome.runtime.sendMessage({
            type: 'INCREMENT_DOM_HIDDEN',
            payload: { count: swept },
          });
        }
      }, 250);
    }
  }
}

if (typeof window !== 'undefined') {
  initializeContentProtection();
}

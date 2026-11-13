import { ShioriWebAdEngine } from '@shiori/web-ad-engine';
import { ShioriYouTubeEngine } from '@shiori/youtube-engine';
import { ShioriRuleEngine } from '@shiori/rules-engine';

const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
const localRuleEngine = new ShioriRuleEngine();

// Engines initialization
const webAdEngine = new ShioriWebAdEngine(localRuleEngine, { currentHostname });
const youTubeEngine = new ShioriYouTubeEngine();

// Instant shield stylesheet
const INLINE_SHIELD_CSS = `
  [class*="catfish"], [id*="catfish"],
  [class*="popup-banner"], [id*="popup-banner"],
  [class*="floating-ad"], [id*="floating-ad"],
  [class*="bottom-fixed"], [class*="ad-bottom"],
  [class*="ad-sticky"], [id*="ad-sticky"],
  .ad-center, .banner-center, #banner-center,
  a[href*="haywin"], a[href*="catfish"], a[href*="uk88"],
  a[href*="hitclub"], a[href*="win79"], a[href*="sunwin"],
  a[href*="rikvip"], a[href*="bet88"], a[href*="cacuoc"] {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
    opacity: 0 !important;
    height: 0 !important;
    overflow: hidden !important;
  }
`;

function injectShieldStyles(): void {
  const style = document.createElement('style');
  style.id = 'shiori-instant-shield';
  style.textContent = INLINE_SHIELD_CSS;
  if (document.head) {
    document.head.appendChild(style);
  } else {
    document.documentElement.appendChild(style);
  }
}

export function initializeContentProtection(): void {
  const isYouTube = currentHostname.includes('youtube.com');

  injectShieldStyles();

  // Listen to messages from content_main (MAIN world) and forward to background
  window.addEventListener('message', (event) => {
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
      (response) => {
        if (response?.css) {
          const style = document.createElement('style');
          style.id = 'shiori-cosmetic-styles';
          style.textContent = response.css;
          document.head?.appendChild(style);
        }
      }
    );
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

      // High-frequency polling loop specifically for YouTube in-stream ads (checks every 250ms)
      setInterval(() => {
        const liveContainer = document.getElementById('movie_player') || document.body;
        const liveVideo = document.querySelector('video');
        if (liveContainer && liveVideo) {
          youTubeEngine.handleInStreamAd(liveVideo, liveContainer);
        }
      }, 250);
    } else {
      const detections = webAdEngine.scanAndClean(document.body);
      if (detections.length > 0 && typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          type: 'INCREMENT_DOM_HIDDEN',
          payload: { count: detections.length },
        });
      }

      webAdEngine.startLiveMonitoring(document.body);
    }
  }
}

if (typeof window !== 'undefined') {
  initializeContentProtection();
}

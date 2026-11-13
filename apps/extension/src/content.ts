import { ShioriWebAdEngine } from '@shiori/web-ad-engine';
import { ShioriYouTubeEngine } from '@shiori/youtube-engine';
import { ShioriRuleEngine } from '@shiori/rules-engine';
import { RedirectGuard } from '@shiori/redirect-guard';

const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
const localRuleEngine = new ShioriRuleEngine();
const redirectGuard = new RedirectGuard();

// Engines initialization
const webAdEngine = new ShioriWebAdEngine(localRuleEngine, { currentHostname });
const youTubeEngine = new ShioriYouTubeEngine();

// Critical Instant Cosmetic CSS for Vietnamese streaming & gambling overlays
const INLINE_SHIELD_CSS = `
  [class*="popup-banner"], [id*="popup-banner"],
  [class*="floating-ad"], [id*="floating-ad"],
  [class*="bottom-fixed"], [class*="ad-bottom"],
  [class*="ad-sticky"], [id*="ad-sticky"],
  .ad-center, .banner-center, #banner-center,
  a[href*="uk88"], a[href*="hitclub"], a[href*="win79"],
  a[href*="sunwin"], a[href*="rikvip"], a[href*="bet88"],
  a[href*="fb88"], a[href*="fun88"], a[href*="w88"] {
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

/**
 * Click-Hijack & Tab Redirection Interceptor.
 * Prevents malicious website scripts from hijacking user clicks to spawn new gambling tabs.
 */
function setupClickHijackInterceptor(): void {
  // 1. Capture phase click listener on window
  window.addEventListener(
    'click',
    (event: MouseEvent) => {
      let target = event.target as HTMLElement | null;

      // Check if clicked element is inside a link
      while (target && target !== document.body && target !== document.documentElement) {
        if (target.tagName === 'A') {
          const href = (target as HTMLAnchorElement).href || '';
          const check = redirectGuard.isSuspiciousRedirect(href);
          if (check.isSuspicious) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            console.warn(`[Shiori Click Interceptor] Blocked click hijack: ${href}`);
            if (typeof chrome !== 'undefined' && chrome.runtime) {
              chrome.runtime.sendMessage({ type: 'INCREMENT_REDIRECT_BLOCKED' });
            }
            return;
          }
        }
        target = target.parentElement;
      }
    },
    true // Capture phase: execute before website's trap listeners
  );

  // 2. Wrap window.open to block script-triggered popups
  try {
    const originalOpen = window.open;
    window.open = function (url?: string | URL, target?: string, features?: string): Window | null {
      const urlStr = url ? url.toString() : '';
      if (urlStr) {
        const check = redirectGuard.isSuspiciousRedirect(urlStr);
        if (check.isSuspicious) {
          console.warn(`[Shiori Popunder Guard] Intercepted window.open: ${urlStr}`);
          if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.sendMessage({ type: 'INCREMENT_REDIRECT_BLOCKED' });
          }
          return null; // Block popup
        }
      }
      return originalOpen.call(window, url, target, features);
    };
  } catch {
    // Window.open wrapping restricted in some contexts
  }
}

export function initializeContentProtection(): void {
  const isYouTube = currentHostname.includes('youtube.com');

  // Inject instant shield styles immediately
  injectShieldStyles();

  // Setup click hijack prevention
  setupClickHijackInterceptor();

  // Ask background for any dynamic cosmetic CSS
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
    } else {
      const detections = webAdEngine.scanAndClean(document.body);
      if (detections.length > 0 && typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          type: 'INCREMENT_DOM_HIDDEN',
          payload: { count: detections.length },
        });
      }

      // Start live debounced DOM observer
      webAdEngine.startLiveMonitoring(document.body);
    }
  }
}

if (typeof window !== 'undefined') {
  initializeContentProtection();
}

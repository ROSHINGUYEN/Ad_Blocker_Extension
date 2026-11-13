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

// Tracking for real mouse gestures
let lastRealClickTimestamp = 0;

/**
 * Click-Hijack & Tab Redirection Interceptor.
 * Operates in the webpage's MAIN world to directly control window.open and event dispatching.
 */
function setupClickHijackInterceptor(): void {
  // 1. Intercept window.open directly in MAIN world
  try {
    const originalOpen = window.open;
    window.open = function (url?: string | URL, target?: string, features?: string): Window | null {
      const urlStr = url ? url.toString() : '';
      const timeSinceClick = Date.now() - lastRealClickTimestamp;

      // In movie/streaming sites, if window.open is called towards a third-party domain, it's 100% pop-under!
      const isThirdParty = Boolean(
        urlStr &&
        !urlStr.startsWith('/') &&
        !urlStr.includes(currentHostname)
      );

      // Block if unprompted or third-party popunder
      if (timeSinceClick > 500 || isThirdParty) {
        console.warn(`[Shiori Popunder Guard] Intercepted and blocked window.open popup: ${urlStr}`);
        window.postMessage({ type: 'SHIORI_POPUP_BLOCKED', url: urlStr }, '*');
        return null;
      }

      return originalOpen.call(window, url, target, features);
    };
  } catch (err) {
    console.error('[Shiori] Failed to override window.open:', err);
  }

  // 2. Intercept fake clicks on hidden <a> tags or document click hijacking
  window.addEventListener(
    'pointerdown',
    (event: PointerEvent) => {
      if (event.isTrusted) {
        lastRealClickTimestamp = Date.now();
      }
    },
    true
  );

  window.addEventListener(
    'click',
    (event: MouseEvent) => {
      let target = event.target as HTMLElement | null;

      while (target && target !== document.body && target !== document.documentElement) {
        if (target.tagName === 'A') {
          const href = (target as HTMLAnchorElement).href || '';
          
          // Detect ad tracker query parameters like in the image: utm_medium=pc-catfish, utm_source, haywin, etc.
          const lowerHref = href.toLowerCase();
          const isAdLink = (
            lowerHref.includes('utm_medium=pc-catfish') ||
            lowerHref.includes('catfish') ||
            lowerHref.includes('cpd') ||
            lowerHref.includes('utm_source=animevietsub') ||
            lowerHref.includes('haywin') ||
            lowerHref.includes('uk88') ||
            lowerHref.includes('gamebai') ||
            lowerHref.includes('cacuoc')
          );

          if (isAdLink) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            console.warn(`[Shiori Click Interceptor] Suppressed ad click: ${href}`);
            window.postMessage({ type: 'SHIORI_CLICK_BLOCKED', url: href }, '*');
            return;
          }
        }
        target = target.parentElement;
      }
    },
    true // Capture phase: execute BEFORE website's listeners
  );
}

// Critical Instant CSS for hiding catfish banners, floating overlays, bottom banners
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

  // Inject instant shield styles immediately
  injectShieldStyles();

  // Setup click hijack and window.open popunder prevention
  setupClickHijackInterceptor();

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
      youTubeEngine.evaluateState(container, video);
    } else {
      webAdEngine.scanAndClean(document.body);
      webAdEngine.startLiveMonitoring(document.body);
    }
  }
}

if (typeof window !== 'undefined') {
  initializeContentProtection();
}

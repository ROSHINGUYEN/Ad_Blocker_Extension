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

// Timestamp tracking for real user gestures
let lastRealClickTimestamp = 0;

/**
 * Click-Hijack & Tab Redirection Interceptor.
 * Prevents malicious website scripts from hijacking user clicks to spawn new gambling tabs.
 */
function setupClickHijackInterceptor(): void {
  // Track genuine user mouse clicks
  window.addEventListener(
    'pointerdown',
    (event: PointerEvent) => {
      if (event.isTrusted) {
        lastRealClickTimestamp = Date.now();
      }
    },
    true
  );

  // Wrap window.open to block sneaky popups
  try {
    const originalOpen = window.open;
    window.open = function (url?: string | URL, target?: string, features?: string): Window | null {
      const urlStr = url ? url.toString() : '';
      const timeSinceClick = Date.now() - lastRealClickTimestamp;

      const decision = redirectGuard.evaluateNavigation(urlStr, currentHostname, {
        isTrustedUserGesture: timeSinceClick <= 800,
        timeSinceLastClickMs: timeSinceClick,
        isTriggeredByScriptTimer: timeSinceClick > 800,
      });

      if (!decision.allow) {
        console.warn(`[Shiori Popunder Guard] Blocked pop-under window.open: ${urlStr} (Reason: ${decision.reason})`);
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          chrome.runtime.sendMessage({ type: 'INCREMENT_REDIRECT_BLOCKED' });
        }
        return null; // Suppress popup
      }

      return originalOpen.call(window, url, target, features);
    };
  } catch {
    // Window.open wrapping restricted in some contexts
  }
}

export function initializeContentProtection(): void {
  const isYouTube = currentHostname.includes('youtube.com');

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
      // For YouTube, exclusively target movie player overlay ads and companion ads
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
      // For general websites, scan for ads and floating modals
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

import { DetectionResult, generateDetectionId, isSameSite } from '@shiori/shared';

export interface IframeScanOptions {
  currentHostname: string;
}

/**
 * Common ad network domain keywords in iframe source URLs.
 */
const KNOWN_AD_IFRAME_PATTERNS = [
  'googleads',
  'adservice.google',
  'doubleclick.net',
  'adnxs.com',
  'adsystem',
  'adserver',
  'pagead',
  'taboola.com',
  'outbrain.com',
  'criteo.com',
  'popads.net',
];

/**
 * Standard IAB banner sizes (width x height)
 */
const KNOWN_IAB_BANNER_SIZES = new Set([
  '300x250', // Medium Rectangle
  '728x90',  // Leaderboard
  '160x600', // Wide Skyscraper
  '300x600', // Half Page
  '970x250', // Billboard
  '320x50',  // Mobile Leaderboard
  '320x100', // Large Mobile Banner
]);

export class IframeAdDetector {
  /**
   * Analyzes an iframe element for ad characteristics.
   */
  public analyzeIframe(
    iframe: HTMLIFrameElement,
    options: IframeScanOptions
  ): DetectionResult | null {
    const src = iframe.src || iframe.getAttribute('data-src') || '';
    const width = iframe.getAttribute('width') || iframe.style.width || '';
    const height = iframe.getAttribute('height') || iframe.style.height || '';
    const reasons: string[] = [];
    let confidence = 0.0;

    // 1. Source URL keyword matching
    if (src) {
      for (const pattern of KNOWN_AD_IFRAME_PATTERNS) {
        if (src.toLowerCase().includes(pattern)) {
          confidence += 0.85;
          reasons.push(`Iframe src contains known ad pattern: "${pattern}"`);
          break;
        }
      }

      // Check for third-party origin
      try {
        const iframeHost = new URL(src).hostname.toLowerCase();
        if (iframeHost && options.currentHostname && !isSameSite(iframeHost, options.currentHostname)) {
          confidence += 0.1;
          reasons.push(`Third-party iframe domain: ${iframeHost}`);
        }
      } catch {
        // Relative or invalid URL
      }
    }

    // 2. IAB Standard Banner Dimension Check
    const cleanW = width.replace(/px/i, '').trim();
    const cleanH = height.replace(/px/i, '').trim();
    if (cleanW && cleanH) {
      const dimensionKey = `${cleanW}x${cleanH}`;
      if (KNOWN_IAB_BANNER_SIZES.has(dimensionKey)) {
        confidence += 0.2;
        reasons.push(`Iframe matches standard IAB banner dimensions: ${dimensionKey}`);
      }
    }

    // 3. Clutter attributes (id / class contains ad identifiers)
    const id = iframe.id || '';
    const className = iframe.className || '';
    if (/\b(ad|ads|advert|banner|sponsored)\b/i.test(`${id} ${className}`)) {
      confidence += 0.15;
      reasons.push('Iframe id or class contains advertising identifiers');
    }

    if (confidence >= 0.70) {
      return {
        detectionId: generateDetectionId('iframe'),
        sourceEngine: 'web-ad',
        category: confidence >= 0.85 ? 'CONFIRMED_AD' : 'SUSPECTED_AD',
        confidence: Math.min(confidence, 1.0),
        evidence: {
          url: src,
          reasons,
        },
        recommendedAction: confidence >= 0.85 ? 'HIDE' : 'REVIEW',
        timestamp: Date.now(),
      };
    }

    return null;
  }
}

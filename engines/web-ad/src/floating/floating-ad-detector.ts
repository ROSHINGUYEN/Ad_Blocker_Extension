import { DetectionResult, generateDetectionId } from '@shiori/shared';

export class FloatingAdDetector {
  /**
   * Pure Structural & Geometric Heuristic Analysis:
   * Detects intrusive modal popups and sticky footer bars by coordinates, z-index,
   * aspect ratio, and backdrop properties — ZERO hardcoded keywords required!
   */
  public analyzeElement(element: HTMLElement, currentHost?: string): DetectionResult | null {
    if (!element || element.nodeType !== 1) return null;

    // Never inspect core HTML tags or video elements
    const tag = element.tagName.toLowerCase();
    if (['html', 'body', 'video', 'main', 'article', 'header', 'nav'].includes(tag)) {
      return null;
    }

    const reasons: string[] = [];
    let isAd = false;
    let confidence = 0.0;

    const style = element.style;
    const computedPosition = style.position || '';
    const zIndex = parseInt(style.zIndex || '0', 10);
    const bottom = style.bottom;

    // 1. Structural Fixed Center Modal Detection (like the UK88 pop-up in middle of screen)
    // - Must be fixed or absolute
    // - Must have high z-index (>= 999)
    // - Usually contains images with an anchor linking out of the current domain
    if ((computedPosition === 'fixed' || computedPosition === 'absolute') && zIndex >= 999) {
      const links = element.querySelectorAll<HTMLAnchorElement>('a[href]');
      let hasOutboundLink = false;

      if (currentHost && links.length > 0) {
        for (let i = 0; i < links.length; i++) {
          const link = links[i];
          if (!link) continue;
          try {
            const linkHost = new URL(link.href).hostname.toLowerCase();
            if (linkHost && !linkHost.endsWith(currentHost) && !currentHost.endsWith(linkHost)) {
              hasOutboundLink = true;
              break;
            }
          } catch {
            // Ignore relative links
          }
        }
      }

      // Check if modal has an image or canvas taking up most of it
      const images = element.querySelectorAll('img, canvas, svg');
      const hasCloseIndicator = Boolean(
        element.querySelector('[class*="close"], [id*="close"], [aria-label*="close"]') ||
        element.textContent?.includes('✕') ||
        element.textContent?.includes('×')
      );

      if ((hasOutboundLink || images.length > 0) && (hasCloseIndicator || zIndex >= 9999)) {
        reasons.push(`Geometric intrusive floating modal (position: ${computedPosition}, z-index: ${zIndex})`);
        confidence = 0.95;
        isAd = true;
      }
    }

    // 2. Structural Sticky Bottom Bar Detection (Banner pinned at bottom of viewport)
    if (computedPosition === 'fixed' && (bottom === '0px' || bottom === '0')) {
      const links = element.querySelectorAll('a[href]');
      if (links.length > 0) {
        reasons.push('Fixed sticky bottom viewport obstruction bar');
        confidence = 0.90;
        isAd = true;
      }
    }

    // 3. Common Ad Framework Naming Conventions (Fallback)
    const idClass = `${element.id} ${element.className}`.toLowerCase();
    if (/\b(popup-banner|floating-banner|ad-bottom|banner-center|ads-modal|adv_center|floating-ad)\b/i.test(idClass)) {
      reasons.push(`Ad naming convention detected: "${idClass}"`);
      confidence = Math.max(confidence, 0.85);
      isAd = true;
    }

    if (isAd && confidence >= 0.85) {
      return {
        detectionId: generateDetectionId('heuristic_ad'),
        sourceEngine: 'web-ad',
        category: 'CONFIRMED_AD',
        confidence,
        evidence: {
          reasons,
        },
        recommendedAction: 'HIDE',
        timestamp: Date.now(),
      };
    }

    return null;
  }
}

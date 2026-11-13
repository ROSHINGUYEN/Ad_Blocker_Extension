import { DetectionResult, generateDetectionId } from '@shiori/shared';

const GAMBLING_AFFILIATE_KEYWORDS = [
  'uk88',
  'hitclub',
  'win79',
  'sunwin',
  'rikvip',
  'bet88',
  'fb88',
  'fun88',
  'w88',
  'shbet',
  'jun88',
  'new88',
  '789club',
  'b52',
  'iwin',
  'go88',
  'cacuoc',
  'gamebai',
  'nhacai',
  'nohu',
  'quayhu',
  'taixiu',
];

export class FloatingAdDetector {
  /**
   * Scans an element for center floating modal ads or sticky bottom banners.
   */
  public analyzeElement(element: HTMLElement): DetectionResult | null {
    if (!element || element.nodeType !== 1) return null;

    const reasons: string[] = [];
    let isAd = false;

    // 1. Check for gambling affiliate link inside or on the element itself
    const href = element.getAttribute('href') || '';
    const onclick = element.getAttribute('onclick') || '';
    const elementTextAndHref = `${href} ${onclick} ${element.innerHTML}`.toLowerCase();

    for (const kw of GAMBLING_AFFILIATE_KEYWORDS) {
      if (elementTextAndHref.includes(kw)) {
        reasons.push(`Contains gambling / illegal betting keyword: "${kw}"`);
        isAd = true;
        break;
      }
    }

    // 2. Geometry & CSS Check: Fixed Center Modal or Bottom Floating Bar
    const style = element.style;
    const computedPosition = style.position || '';
    const zIndex = parseInt(style.zIndex || '0', 10);
    const bottom = style.bottom;

    // Center floating modal (often has high z-index and fixed or absolute)
    if ((computedPosition === 'fixed' || computedPosition === 'absolute') && zIndex >= 999) {
      // If it also contains an image with a link or close button (X)
      const hasCloseButton = Boolean(
        element.querySelector('[class*="close"], [id*="close"], svg, img[src*="close"]') ||
        element.textContent?.includes('✕') ||
        element.textContent?.includes('×')
      );
      if (hasCloseButton || isAd) {
        reasons.push(`High z-index floating overlay modal (z-index: ${zIndex})`);
        isAd = true;
      }
    }

    // Sticky bottom banner
    if (computedPosition === 'fixed' && (bottom === '0px' || bottom === '0')) {
      reasons.push('Fixed sticky bottom banner container');
      isAd = true;
    }

    // Class / ID naming inspection
    const idClass = `${element.id} ${element.className}`.toLowerCase();
    if (/\b(popup-banner|floating-banner|ad-bottom|banner-center|ads-modal|adv_center)\b/i.test(idClass)) {
      reasons.push(`Matched ad banner class/id convention: "${idClass}"`);
      isAd = true;
    }

    if (isAd) {
      return {
        detectionId: generateDetectionId('floating_ad'),
        sourceEngine: 'web-ad',
        category: 'CONFIRMED_AD',
        confidence: 0.95,
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

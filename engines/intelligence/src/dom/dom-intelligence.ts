import { SignalEvidence } from '../types/signals';

export class DOMIntelligence {
  /**
   * Evaluates layout obstructions, high z-index overlay traps, and sticky banners.
   */
  public analyzeElement(element: HTMLElement): SignalEvidence[] {
    const signals: SignalEvidence[] = [];

    const computedStyle = (element.style || {}) as CSSStyleDeclaration;
    const position = computedStyle.position || '';
    const zIndexRaw = computedStyle.zIndex || '';
    const zIndex = parseInt(zIndexRaw, 10);

    // 1. High Z-Index full screen overlay / interstitial check
    if ((position === 'fixed' || position === 'absolute') && !isNaN(zIndex) && zIndex > 9999) {
      signals.push({
        source: 'dom',
        feature: 'high_zindex_overlay',
        weight: 0.4,
        suspiciousScore: 0.85,
        reason: `Element has intrusive z-index (${zIndex}) with ${position} positioning`,
      });
    }

    // 2. Click-trap transparency (opacity 0 or pointer-events trick)
    const opacity = parseFloat(computedStyle.opacity || '1');
    if (opacity === 0 && (position === 'fixed' || position === 'absolute')) {
      signals.push({
        source: 'dom',
        feature: 'invisible_click_trap',
        weight: 0.5,
        suspiciousScore: 0.95,
        reason: 'Element is transparent (opacity 0) with fixed overlay positioning',
      });
    }

    // 3. Class or ID suspicious keyword cluster
    const idClassText = `${element.id} ${element.className}`.toLowerCase();
    const adKeywords = ['ad-container', 'sticky-ad', 'floating-ad', 'popup-wrap', 'ad-banner'];
    for (const kw of adKeywords) {
      if (idClassText.includes(kw)) {
        signals.push({
          source: 'dom',
          feature: 'dom_ad_naming_convention',
          weight: 0.35,
          suspiciousScore: 0.75,
          reason: `DOM attributes contain ad container convention: "${kw}"`,
        });
        break;
      }
    }

    return signals;
  }
}

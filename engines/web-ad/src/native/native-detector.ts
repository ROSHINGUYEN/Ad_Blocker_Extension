import { DetectionResult, generateDetectionId } from '@shiori/shared';

/**
 * Detects native ads disguised as article cards or sponsored content recommendations.
 */
export class NativeAdDetector {
  private static SPONSORED_PATTERNS = [
    /\b(sponsored|promoted|advertisement|tài trợ|quảng cáo)\b/i,
    /\b(paid post|presented by|brought to you by)\b/i,
  ];

  public analyzeElement(element: HTMLElement): DetectionResult | null {
    // 1. Check for visible sponsored badges or disclosure text
    const textContent = element.textContent || '';
    if (textContent.length > 500) {
      // Avoid scanning entire articles
      return null;
    }

    const reasons: string[] = [];
    let confidence = 0.0;

    for (const pattern of NativeAdDetector.SPONSORED_PATTERNS) {
      if (pattern.test(textContent)) {
        confidence += 0.8;
        reasons.push(`Contains sponsored label matching: ${pattern.toString()}`);
        break;
      }
    }

    // 2. Outbrain / Taboola widget classes or data attributes
    const classAndId = `${element.className} ${element.id} ${element.getAttribute('data-widget-id') || ''}`;
    if (/\b(taboola|outbrain|mgid|revcontent)\b/i.test(classAndId)) {
      confidence += 0.85;
      reasons.push('Matches native ad distribution platform identifier');
    }

    if (confidence >= 0.75) {
      return {
        detectionId: generateDetectionId('native'),
        sourceEngine: 'web-ad',
        category: 'SPONSORED_CONTENT',
        confidence: Math.min(confidence, 1.0),
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

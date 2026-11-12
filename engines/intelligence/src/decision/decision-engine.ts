import { DetectionResult, generateDetectionId, DetectionCategory, DetectionAction } from '@shiori/shared';
import { SignalEvidence } from '../types/signals';

export class DecisionEngine {
  /**
   * Correlates multiple signal evidences, computes a weighted confidence score,
   * and derives the final standardized DetectionResult.
   */
  public arbitrate(
    _targetId: string,
    signals: SignalEvidence[],
    options?: { isWhitelisted?: boolean }
  ): DetectionResult {
    // 1. Whitelist override check
    if (options?.isWhitelisted) {
      return {
        detectionId: generateDetectionId('dec'),
        sourceEngine: 'intelligence',
        category: 'LEGITIMATE_CONTENT',
        confidence: 1.0,
        evidence: {
          reasons: ['Domain or element explicitly whitelisted by user policy'],
        },
        recommendedAction: 'ALLOW',
        timestamp: Date.now(),
      };
    }

    if (signals.length === 0) {
      return {
        detectionId: generateDetectionId('dec'),
        sourceEngine: 'intelligence',
        category: 'UNKNOWN',
        confidence: 0.0,
        evidence: { reasons: ['No suspicious signals observed'] },
        recommendedAction: 'ALLOW',
        timestamp: Date.now(),
      };
    }

    // 2. Weighted confidence scoring
    let totalWeight = 0;
    let weightedScoreSum = 0;
    const reasons: string[] = [];

    for (const signal of signals) {
      totalWeight += signal.weight;
      weightedScoreSum += signal.weight * signal.suspiciousScore;
      reasons.push(`[${signal.source.toUpperCase()}] ${signal.reason}`);
    }

    const aggregateConfidence = totalWeight > 0 ? weightedScoreSum / totalWeight : 0;

    // Multi-signal synergy bonus: If signals come from >= 2 distinct sources (e.g. Network + DOM), confidence increases
    const distinctSources = new Set(signals.map((s) => s.source));
    let adjustedConfidence = aggregateConfidence;
    if (distinctSources.size >= 2 && aggregateConfidence > 0.5) {
      adjustedConfidence = Math.min(aggregateConfidence * 1.15, 1.0);
      reasons.push(`[SYNERGY] Multi-source correlation bonus applied across ${distinctSources.size} channels`);
    }

    // 3. Category & Action Determination Policy (Section 5 of Master Prompt)
    let category: DetectionCategory = 'UNKNOWN';
    let recommendedAction: DetectionAction = 'ALLOW';

    if (adjustedConfidence >= 0.85) {
      category = 'CONFIRMED_AD';
      recommendedAction = 'BLOCK';
    } else if (adjustedConfidence >= 0.65) {
      category = 'SUSPECTED_AD';
      recommendedAction = 'HIDE'; // Non-destructive cosmetic action
    } else if (adjustedConfidence >= 0.40) {
      category = 'SPONSORED_CONTENT';
      recommendedAction = 'WARN';
    } else {
      category = 'LEGITIMATE_CONTENT';
      recommendedAction = 'ALLOW';
    }

    return {
      detectionId: generateDetectionId('dec'),
      sourceEngine: 'intelligence',
      category,
      confidence: Math.round(adjustedConfidence * 100) / 100,
      evidence: {
        reasons,
      },
      recommendedAction,
      timestamp: Date.now(),
    };
  }
}

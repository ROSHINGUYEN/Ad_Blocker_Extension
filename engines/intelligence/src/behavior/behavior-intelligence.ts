import { SignalEvidence } from '../types/signals';

export class BehaviorIntelligence {
  private lastUserGestureTime = 0;

  public recordUserGesture(): void {
    this.lastUserGestureTime = Date.now();
  }

  /**
   * Evaluates navigation or popup attempts.
   * If a popup is triggered without a recent user click (< 1000ms), it indicates an intrusive pop-under/popup ad.
   */
  public analyzeNavigation(targetUrl: string, isUserInitiated = false): SignalEvidence[] {
    const signals: SignalEvidence[] = [];
    const timeSinceLastGesture = Date.now() - this.lastUserGestureTime;

    const hasRecentGesture = isUserInitiated || timeSinceLastGesture < 1000;

    if (!hasRecentGesture) {
      signals.push({
        source: 'behavior',
        feature: 'unprompted_popup_navigation',
        weight: 0.6,
        suspiciousScore: 0.9,
        reason: 'Navigation / Window open attempted without user interaction gesture',
      });
    }

    // Detect suspicious redirect protocols
    if (targetUrl.startsWith('data:') || targetUrl.startsWith('javascript:')) {
      signals.push({
        source: 'behavior',
        feature: 'dangerous_protocol_navigation',
        weight: 0.5,
        suspiciousScore: 0.95,
        reason: `Suspicious navigation protocol: ${targetUrl.slice(0, 15)}`,
      });
    }

    return signals;
  }
}

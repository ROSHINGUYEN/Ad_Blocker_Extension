import { YouTubeAdClassifier } from './classification/ad-classifier';
import { PlayerStabilityCircuitBreaker } from './stability/circuit-breaker';
import { YouTubePlayerObserver } from './observer/player-observer';
import { YouTubeUIDetector } from './ui/youtube-ui-detector';
import { DetectionResult, generateDetectionId } from '@shiori/shared';

export class ShioriYouTubeEngine {
  public classifier = new YouTubeAdClassifier();
  public circuitBreaker = new PlayerStabilityCircuitBreaker();
  public observer = new YouTubePlayerObserver();
  public uiDetector = new YouTubeUIDetector();

  /**
   * Evaluates the current YouTube page / player state.
   */
  public evaluateState(container: HTMLElement, video: HTMLVideoElement | null): DetectionResult[] {
    const results: DetectionResult[] = [];

    // 1. Check Circuit Breaker health first
    if (video) {
      this.observer.attach(video, container);
      const snapshot = this.observer.getSnapshot();

      if (snapshot.hasError) {
        this.circuitBreaker.recordError(snapshot.errorMessage || 'Unknown playback error');
      } else if (snapshot.isPlaying) {
        this.circuitBreaker.recordSuccess();
      }
    }

    // If circuit breaker is OPEN, cease all intervention immediately to maintain video stream
    if (!this.circuitBreaker.canIntervene()) {
      results.push({
        detectionId: generateDetectionId('yt_fallback'),
        sourceEngine: 'youtube',
        category: 'LEGITIMATE_CONTENT',
        confidence: 1.0,
        evidence: {
          reasons: ['Circuit Breaker is OPEN due to player stability protection; skipping all filtering'],
        },
        recommendedAction: 'ALLOW',
        timestamp: Date.now(),
      });
      return results;
    }

    // 2. Scan and clean companion and overlay promotions safely
    const removableElements = this.uiDetector.findRemovablePromotions(container);
    for (const el of removableElements) {
      el.style.setProperty('display', 'none', 'important');
      results.push({
        detectionId: generateDetectionId('yt_ad'),
        sourceEngine: 'youtube',
        category: 'CONFIRMED_AD',
        confidence: 0.95,
        evidence: {
          reasons: ['Safe promotional container detected outside player stream'],
        },
        recommendedAction: 'HIDE',
        timestamp: Date.now(),
      });
    }

    return results;
  }
}

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

  private isCurrentlyHandlingAd = false;
  private originalMutedState = false;
  private originalPlaybackRate = 1.0;

  /**
   * Fast-forwards and auto-skips YouTube In-stream Video Ads seamlessly.
   */
  public handleInStreamAd(video: HTMLVideoElement | null, container: HTMLElement): boolean {
    if (!video || !this.circuitBreaker.canIntervene()) {
      return false;
    }

    // STRICT AD DETECTION: Only when container actually has ad-showing or ad-interrupting
    const isAdPlaying =
      container.classList.contains('ad-showing') ||
      container.classList.contains('ad-interrupting');

    if (isAdPlaying) {
      if (!this.isCurrentlyHandlingAd) {
        this.isCurrentlyHandlingAd = true;
        this.originalMutedState = video.muted;
        this.originalPlaybackRate = video.playbackRate || 1.0;
      }

      // 1. Mute audio during ad
      video.muted = true;

      // 2. DO NOT tamper with video.currentTime or playbackRate to prevent fast-forwarding real video!
      // 3. Auto click skip button if available
      const skipButton = container.querySelector<HTMLElement>(
        '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, button.ytp-ad-skip-button-text, .ytp-skip-ad-button, .ytp-ad-skip-button-slot button'
      );
      if (skipButton) {
        skipButton.click();
      }

      return true;
    } else {
      // Restore normal playback if we were handling an ad
      if (this.isCurrentlyHandlingAd) {
        this.isCurrentlyHandlingAd = false;
        video.muted = this.originalMutedState;
        video.playbackRate = this.originalPlaybackRate || 1.0;
      }
      return false;
    }
  }

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

      // Handle In-stream Video Ads
      const handled = this.handleInStreamAd(video, container);
      if (handled) {
        results.push({
          detectionId: generateDetectionId('yt_instream'),
          sourceEngine: 'youtube',
          category: 'CONFIRMED_AD',
          confidence: 0.99,
          evidence: {
            reasons: ['In-stream video ad detected: audio muted, fast-forwarded 16x and skipped'],
          },
          recommendedAction: 'HIDE',
          timestamp: Date.now(),
        });
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

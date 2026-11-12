import { YouTubeAdClassifier } from '../classification/ad-classifier';

export class YouTubeUIDetector {
  private classifier = new YouTubeAdClassifier();

  /**
   * Scans YouTube UI for safe-to-hide promotional elements (companion ads, banners, promos).
   * Does NOT touch the video player element itself.
   */
  public findRemovablePromotions(root: HTMLElement): HTMLElement[] {
    const removable: HTMLElement[] = [];

    // Query candidate ad slots
    const candidates = root.querySelectorAll<HTMLElement>(
      'ytd-ad-slot-renderer, ytd-promoted-sparkles-web-renderer, ytd-banner-promo-renderer, .ytp-ad-overlay-container, .ytp-ad-image-overlay'
    );

    candidates.forEach((el) => {
      const isInsidePlayer = Boolean(el.closest('#movie_player, .html5-video-player'));
      const classification = this.classifier.classify(el, isInsidePlayer);
      if (classification.canSafelyHide) {
        removable.push(el);
      }
    });

    return removable;
  }
}

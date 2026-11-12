export type YouTubeAdCategory =
  | 'PLATFORM_STREAM_AD'     // In-stream preroll / midroll
  | 'PLAYER_OVERLAY_AD'      // Banner / popup rendered over player
  | 'FEED_COMPANION_AD'      // Masthead, sidebar, search feed ads
  | 'CREATOR_SPONSOR_SEGMENT'// Creator's own embedded sponsored segment
  | 'LEGITIMATE_VIDEO';      // Authentic content

export interface YouTubeClassificationResult {
  category: YouTubeAdCategory;
  confidence: number;
  isInsidePlayer: boolean;
  canSafelyHide: boolean;
  reasons: string[];
}

export class YouTubeAdClassifier {
  /**
   * Classifies YouTube elements into 5 distinct categories according to Section 4.2.
   * Strictly avoids conflating creator sponsorships with platform video ads.
   */
  public classify(element: HTMLElement, isInsidePlayer: boolean): YouTubeClassificationResult {
    const className = element.className || '';
    const tagName = element.tagName.toLowerCase();
    const reasons: string[] = [];

    // 1. In-Player Platform Ad (e.g. ad-showing container, ad-interrupting badge)
    if (isInsidePlayer && (className.includes('ad-showing') || className.includes('ad-interrupting'))) {
      reasons.push('Player container contains native platform ad-showing status classes');
      return {
        category: 'PLATFORM_STREAM_AD',
        confidence: 0.95,
        isInsidePlayer: true,
        canSafelyHide: false, // Stream ads require player state handling, NEVER blind CSS hide of the video tag!
        reasons,
      };
    }

    // 2. In-Player Overlay Banner
    if (
      isInsidePlayer &&
      (className.includes('ytp-ad-overlay') || className.includes('ytp-ad-image-overlay') || className.includes('ytp-ad-text-overlay'))
    ) {
      reasons.push('Matches YouTube in-player promotional overlay container');
      return {
        category: 'PLAYER_OVERLAY_AD',
        confidence: 0.9,
        isInsidePlayer: true,
        canSafelyHide: true,
        reasons,
      };
    }

    // 3. Out-of-Player Feed / Sidebar / Masthead Ad
    if (
      !isInsidePlayer &&
      (tagName.includes('ad-slot-renderer') || className.includes('ytd-promoted-sparkles') || className.includes('ytd-banner-promo-renderer'))
    ) {
      reasons.push('Matches YouTube companion/masthead ad slot renderer outside the player');
      return {
        category: 'FEED_COMPANION_AD',
        confidence: 0.95,
        isInsidePlayer: false,
        canSafelyHide: true,
        reasons,
      };
    }

    // 4. Creator Sponsored Segment indicator (e.g., "Bao gồm nội dung được trả tiền để quảng cáo")
    const textContent = element.textContent || '';
    if (textContent.includes('paid promotion') || textContent.includes('chứa nội dung được trả tiền') || textContent.includes('được tài trợ')) {
      reasons.push('Contains creator paid promotion disclosure badge');
      return {
        category: 'CREATOR_SPONSOR_SEGMENT',
        confidence: 0.85,
        isInsidePlayer,
        canSafelyHide: false, // Do not delete creator content segment without user opt-in
        reasons,
      };
    }

    // 5. Default Legitimate Video Content
    return {
      category: 'LEGITIMATE_VIDEO',
      confidence: 1.0,
      isInsidePlayer,
      canSafelyHide: false,
      reasons: ['No promotional or ad indicators found; authentic video content'],
    };
  }
}

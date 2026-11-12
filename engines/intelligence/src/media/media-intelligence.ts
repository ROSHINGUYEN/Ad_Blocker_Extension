import { SignalEvidence } from '../types/signals';

export interface PlayerStatusSnapshot {
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  isAdPlaying?: boolean;
  adTimeRemaining?: number;
  hasPlaybackError?: boolean;
}

export class MediaIntelligence {
  /**
   * Analyzes media player state to distinguish ad intervals from content playback.
   */
  public analyzePlayer(snapshot: PlayerStatusSnapshot): SignalEvidence[] {
    const signals: SignalEvidence[] = [];

    if (snapshot.hasPlaybackError) {
      signals.push({
        source: 'media',
        feature: 'playback_error_detected',
        weight: 0.8,
        suspiciousScore: 0.0, // Error should trigger circuit breaker / fallback, not aggressive blocking!
        reason: 'Player reported playback error; requires stability fallback',
      });
      return signals;
    }

    if (snapshot.isAdPlaying) {
      signals.push({
        source: 'media',
        feature: 'platform_ad_active',
        weight: 0.7,
        suspiciousScore: 0.95,
        reason: `Player marked ad in-progress (${snapshot.adTimeRemaining ?? 0}s remaining)`,
      });
    }

    // Short duration preroll ad detection pattern (< 35s with non-seekable controls)
    if (snapshot.duration > 0 && snapshot.duration <= 35 && snapshot.isAdPlaying === undefined) {
      signals.push({
        source: 'media',
        feature: 'short_video_clip_pattern',
        weight: 0.2,
        suspiciousScore: 0.4,
        reason: `Short video duration clip: ${snapshot.duration}s`,
      });
    }

    return signals;
  }
}

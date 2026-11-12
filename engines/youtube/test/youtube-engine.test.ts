import { describe, it, expect, beforeEach } from 'vitest';
import { Window } from 'happy-dom';
import {
  ShioriYouTubeEngine,
  YouTubeAdClassifier,
  PlayerStabilityCircuitBreaker,
} from '../src';

describe('Engines / YouTube - YouTube Protection & Stability Engine', () => {
  let window: Window;
  let document: Document;
  let engine: ShioriYouTubeEngine;

  beforeEach(() => {
    window = new Window();
    document = window.document as unknown as Document;
    engine = new ShioriYouTubeEngine();
  });

  it('YouTubeAdClassifier should distinctly classify 5 different content types', () => {
    const classifier = new YouTubeAdClassifier();

    // 1. Platform Stream Ad (inside player container)
    const streamAdContainer = document.createElement('div');
    streamAdContainer.className = 'html5-video-player ad-showing';
    const streamRes = classifier.classify(streamAdContainer, true);
    expect(streamRes.category).toBe('PLATFORM_STREAM_AD');
    expect(streamRes.canSafelyHide).toBe(false); // Must not blind hide video stream

    // 2. Overlay Ad
    const overlayAd = document.createElement('div');
    overlayAd.className = 'ytp-ad-overlay-container ytp-ad-image-overlay';
    const overlayRes = classifier.classify(overlayAd, true);
    expect(overlayRes.category).toBe('PLAYER_OVERLAY_AD');
    expect(overlayRes.canSafelyHide).toBe(true);

    // 3. Companion Feed Ad (outside player)
    const feedAd = document.createElement('ytd-ad-slot-renderer');
    const feedRes = classifier.classify(feedAd, false);
    expect(feedRes.category).toBe('FEED_COMPANION_AD');
    expect(feedRes.canSafelyHide).toBe(true);

    // 4. Creator Sponsor segment badge
    const sponsorBadge = document.createElement('div');
    sponsorBadge.textContent = 'Video này chứa nội dung được trả tiền để quảng cáo';
    const sponsorRes = classifier.classify(sponsorBadge, true);
    expect(sponsorRes.category).toBe('CREATOR_SPONSOR_SEGMENT');
    expect(sponsorRes.canSafelyHide).toBe(false); // Do not delete creator content segment

    // 5. Authentic video content
    const normalDiv = document.createElement('div');
    normalDiv.className = 'ytp-title-text';
    const normalRes = classifier.classify(normalDiv, true);
    expect(normalRes.category).toBe('LEGITIMATE_VIDEO');
  });

  it('PlayerStabilityCircuitBreaker should trip OPEN upon consecutive errors and allow cooling down', () => {
    const breaker = new PlayerStabilityCircuitBreaker();
    expect(breaker.canIntervene()).toBe(true);

    // Record 2 playback errors
    breaker.recordError('MEDIA_ERR_DECODE');
    expect(breaker.canIntervene()).toBe(true);
    breaker.recordError('MEDIA_ERR_NETWORK');

    // Threshold reached -> Breaker is OPEN
    expect(breaker.canIntervene()).toBe(false);
    expect(breaker.getState().status).toBe('OPEN');

    // After reset, it returns to CLOSED
    breaker.reset();
    expect(breaker.canIntervene()).toBe(true);
  });

  it('ShioriYouTubeEngine should hide safe promotional components and fallback gracefully when breaker trips', () => {
    const container = document.createElement('div');
    container.id = 'movie_player';

    // Add safe removable companion and overlay promos
    const overlay = document.createElement('div');
    overlay.className = 'ytp-ad-overlay-container';
    container.appendChild(overlay);

    const video = document.createElement('video');
    container.appendChild(video);

    // Normal evaluation -> Hides overlay safely
    const normalResults = engine.evaluateState(container, video);
    expect(normalResults.length).toBe(1);
    expect(normalResults[0]?.category).toBe('CONFIRMED_AD');
    expect(overlay.style.display).toBe('none');

    // Simulate playback error on video
    Object.defineProperty(video, 'error', {
      value: { code: 3, message: 'Decoding error' },
      configurable: true,
    });

    // Cause breaker to trip
    engine.evaluateState(container, video);
    engine.evaluateState(container, video);

    // Now breaker is OPEN -> Engine yields fallback ALLOW result
    const fallbackResults = engine.evaluateState(container, video);
    expect(fallbackResults.length).toBe(1);
    expect(fallbackResults[0]?.category).toBe('LEGITIMATE_CONTENT');
    expect(fallbackResults[0]?.recommendedAction).toBe('ALLOW');
    expect(fallbackResults[0]?.evidence.reasons[0]).toContain('Circuit Breaker is OPEN');
  });
});

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

    const streamAdContainer = document.createElement('div');
    streamAdContainer.className = 'html5-video-player ad-showing';
    const streamRes = classifier.classify(streamAdContainer, true);
    expect(streamRes.category).toBe('PLATFORM_STREAM_AD');
    expect(streamRes.canSafelyHide).toBe(false);

    const overlayAd = document.createElement('div');
    overlayAd.className = 'ytp-ad-overlay-container ytp-ad-image-overlay';
    const overlayRes = classifier.classify(overlayAd, true);
    expect(overlayRes.category).toBe('PLAYER_OVERLAY_AD');
    expect(overlayRes.canSafelyHide).toBe(true);

    const feedAd = document.createElement('ytd-ad-slot-renderer');
    const feedRes = classifier.classify(feedAd, false);
    expect(feedRes.category).toBe('FEED_COMPANION_AD');
    expect(feedRes.canSafelyHide).toBe(true);

    const sponsorBadge = document.createElement('div');
    sponsorBadge.textContent = 'Video này chứa nội dung được trả tiền để quảng cáo';
    const sponsorRes = classifier.classify(sponsorBadge, true);
    expect(sponsorRes.category).toBe('CREATOR_SPONSOR_SEGMENT');
    expect(sponsorRes.canSafelyHide).toBe(false);

    const normalDiv = document.createElement('div');
    normalDiv.className = 'ytp-title-text';
    const normalRes = classifier.classify(normalDiv, true);
    expect(normalRes.category).toBe('LEGITIMATE_VIDEO');
  });

  it('handleInStreamAd should mute audio, trigger skip button and preserve original playback safely', () => {
    const container = document.createElement('div');
    container.className = 'html5-video-player ad-showing';

    let skipClicked = false;
    const skipButton = document.createElement('button');
    skipButton.className = 'ytp-ad-skip-button';
    skipButton.onclick = () => { skipClicked = true; };
    container.appendChild(skipButton);

    const video = document.createElement('video');
    video.muted = false;
    video.playbackRate = 1.0;
    Object.defineProperty(video, 'duration', { value: 30, configurable: true });

    const handled = engine.handleInStreamAd(video, container);
    expect(handled).toBe(true);
    expect(video.muted).toBe(true);
    expect(skipClicked).toBe(true);

    // Simulate ad finished (class removed)
    container.classList.remove('ad-showing');
    const handledAfter = engine.handleInStreamAd(video, container);
    expect(handledAfter).toBe(false);
    expect(video.muted).toBe(false); // Restored
    expect(video.playbackRate).toBe(1.0); // Restored
  });

  it('PlayerStabilityCircuitBreaker should trip OPEN upon consecutive errors and allow cooling down', () => {
    const breaker = new PlayerStabilityCircuitBreaker();
    expect(breaker.canIntervene()).toBe(true);

    breaker.recordError('MEDIA_ERR_DECODE');
    expect(breaker.canIntervene()).toBe(true);
    breaker.recordError('MEDIA_ERR_NETWORK');

    expect(breaker.canIntervene()).toBe(false);
    expect(breaker.getState().status).toBe('OPEN');

    breaker.reset();
    expect(breaker.canIntervene()).toBe(true);
  });
});

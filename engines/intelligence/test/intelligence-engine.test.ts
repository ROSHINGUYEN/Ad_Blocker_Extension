import { describe, it, expect, beforeEach } from 'vitest';
import { Window } from 'happy-dom';
import { ShioriIntelligenceEngine } from '../src';

describe('Engines / Intelligence - Multi-Signal Correlation & Decision Engine', () => {
  let window: Window;
  let document: Document;
  let engine: ShioriIntelligenceEngine;

  beforeEach(() => {
    window = new Window();
    document = window.document as unknown as Document;
    engine = new ShioriIntelligenceEngine();
  });

  it('NetworkIntelligence should extract third-party and tracking query signals', () => {
    const url = 'https://adservice.track-analytics.com/event?fbclid=xyz123&utm_source=feed';
    const signals = engine.network.analyzeUrl(url, 'mainnews.com');

    expect(signals.length).toBeGreaterThanOrEqual(2);
    expect(signals.some((s) => s.feature === 'third_party_origin')).toBe(true);
    expect(signals.some((s) => s.feature === 'tracking_query_parameters')).toBe(true);
  });

  it('DOMIntelligence should catch high z-index overlay and invisible click-traps', () => {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.zIndex = '99999';
    overlay.style.opacity = '0';

    const signals = engine.dom.analyzeElement(overlay);
    expect(signals.length).toBeGreaterThanOrEqual(2);
    expect(signals.some((s) => s.feature === 'high_zindex_overlay')).toBe(true);
    expect(signals.some((s) => s.feature === 'invisible_click_trap')).toBe(true);
  });

  it('BehaviorIntelligence should flag unprompted popup navigation without user click', () => {
    const signals = engine.behavior.analyzeNavigation('https://popads.net/win', false);
    expect(signals.length).toBe(1);
    expect(signals[0]?.feature).toBe('unprompted_popup_navigation');

    // With user gesture, it should not flag unprompted navigation
    engine.behavior.recordUserGesture();
    const cleanSignals = engine.behavior.analyzeNavigation('https://legit-site.com', false);
    expect(cleanSignals.length).toBe(0);
  });

  it('MediaIntelligence should identify active platform ad state and playback error', () => {
    const adSignals = engine.media.analyzePlayer({
      isPlaying: true,
      duration: 120,
      currentTime: 5,
      isAdPlaying: true,
      adTimeRemaining: 15,
    });
    expect(adSignals.some((s) => s.feature === 'platform_ad_active')).toBe(true);

    const errorSignals = engine.media.analyzePlayer({
      isPlaying: false,
      duration: 0,
      currentTime: 0,
      hasPlaybackError: true,
    });
    expect(errorSignals.some((s) => s.feature === 'playback_error_detected')).toBe(true);
  });

  it('DecisionEngine should apply multi-source synergy bonus and respect whitelist', () => {
    const overlayElement = document.createElement('div');
    overlayElement.id = 'sticky-ad-box';
    overlayElement.style.position = 'fixed';
    overlayElement.style.zIndex = '100000';

    const suspiciousUrl = 'https://telemetry.beacon-ads.com/track?utm_campaign=xyz';

    // Evaluating both DOM and Network together
    const decision = engine.evaluateContext(
      'target_1',
      overlayElement,
      suspiciousUrl,
      'news.vn'
    );

    // Multi-signal synergy should elevate confidence into SUSPECTED_AD with HIDE action
    expect(decision.confidence).toBeGreaterThanOrEqual(0.70);
    expect(decision.category).toBe('SUSPECTED_AD');
    expect(decision.recommendedAction).toBe('HIDE');
    expect(decision.evidence.reasons.some((r) => r.includes('[SYNERGY]'))).toBe(true);

    // Whitelist policy override
    const whitelistedDecision = engine.evaluateContext(
      'target_1',
      overlayElement,
      suspiciousUrl,
      'news.vn',
      { isWhitelisted: true }
    );
    expect(whitelistedDecision.category).toBe('LEGITIMATE_CONTENT');
    expect(whitelistedDecision.recommendedAction).toBe('ALLOW');
  });
});

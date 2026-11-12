import { describe, it, expect, beforeEach } from 'vitest';
import { Window } from 'happy-dom';
import { ShioriRuleEngine } from '@shiori/rules-engine';
import {
  ShioriWebAdEngine,
  IframeAdDetector,
  NativeAdDetector,
  DOMRestorationManager,
} from '../src';

describe('Engines / WebAd - Web Protection Engine', () => {
  let window: Window;
  let document: Document;
  let ruleEngine: ShioriRuleEngine;

  beforeEach(() => {
    window = new Window();
    document = window.document as unknown as Document;
    ruleEngine = new ShioriRuleEngine();
  });

  it('IframeAdDetector should detect known ad network iframes and IAB sizes', () => {
    const detector = new IframeAdDetector();
    const iframe = document.createElement('iframe');
    iframe.src = 'https://adservice.google.com/ads?client=ca-pub';
    iframe.setAttribute('width', '300');
    iframe.setAttribute('height', '250');

    const result = detector.analyzeIframe(iframe, { currentHostname: 'myblog.com' });
    expect(result).not.toBeNull();
    expect(result?.category).toBe('CONFIRMED_AD');
    expect(result?.recommendedAction).toBe('HIDE');
    expect(result?.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('IframeAdDetector should not flag normal content iframes (e.g. embed video)', () => {
    const detector = new IframeAdDetector();
    const iframe = document.createElement('iframe');
    iframe.src = 'https://myblog.com/assets/player.html';
    iframe.setAttribute('width', '800');
    iframe.setAttribute('height', '450');

    const result = detector.analyzeIframe(iframe, { currentHostname: 'myblog.com' });
    expect(result).toBeNull();
  });

  it('NativeAdDetector should detect sponsored disclosure badges and native platforms', () => {
    const detector = new NativeAdDetector();
    const widget = document.createElement('div');
    widget.className = 'taboola-widget-feed';
    widget.textContent = 'Bài viết được tài trợ bởi nhãn hàng XYZ';

    const result = detector.analyzeElement(widget);
    expect(result).not.toBeNull();
    expect(result?.category).toBe('SPONSORED_CONTENT');
    expect(result?.recommendedAction).toBe('HIDE');
  });

  it('DOMRestorationManager should safely hide elements and restore them perfectly', () => {
    const manager = new DOMRestorationManager();
    const adBox = document.createElement('div');
    adBox.style.display = 'block';

    const recordId = manager.hideElement(adBox, 'Matched ad banner');
    expect(adBox.style.display).toBe('none');
    expect(manager.getHiddenCount()).toBe(1);

    // Restore element
    const restored = manager.restoreElement(recordId);
    expect(restored).toBe(true);
    expect(adBox.style.display).toBe('block');
    expect(manager.getHiddenCount()).toBe(0);
  });

  it('ShioriWebAdEngine should coordinate scanning, cleaning, and cosmetic styling', () => {
    ruleEngine.loadFromRawText('myblog.com##.ad-banner-top', 'test_rules');

    const engine = new ShioriWebAdEngine(ruleEngine, {
      currentHostname: 'myblog.com',
    });

    // Check cosmetic stylesheet generation
    const css = engine.getCosmeticStyleSheet();
    expect(css).toContain('.ad-banner-top');
    expect(css).toContain('display: none !important');

    // Create a container with an ad iframe and a normal content div
    const container = document.createElement('div');
    const adIframe = document.createElement('iframe');
    adIframe.src = 'https://doubleclick.net/ad.html';
    container.appendChild(adIframe);

    const normalDiv = document.createElement('div');
    normalDiv.textContent = 'Nội dung bài viết thông thường hợp lệ';
    container.appendChild(normalDiv);

    const detections = engine.scanAndClean(container);
    expect(detections.length).toBe(1);
    expect(adIframe.style.display).toBe('none');
    expect(normalDiv.style.display).not.toBe('none');

    // Test bulk restore
    const restoredCount = engine.restoreAllHiddenElements();
    expect(restoredCount).toBe(1);
    expect(adIframe.style.display).not.toBe('none');
  });
});

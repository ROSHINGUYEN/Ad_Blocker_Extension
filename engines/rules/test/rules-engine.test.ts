import { describe, it, expect, beforeEach } from 'vitest';
import { ShioriRuleEngine, parseAdblockRuleLine, FastNetworkTrie } from '../src';

describe('Engines / Rules - Network & Cosmetic Engine', () => {
  let engine: ShioriRuleEngine;

  beforeEach(() => {
    engine = new ShioriRuleEngine();
  });

  it('FastNetworkTrie should match exact domain and subdomains in reverse-order', () => {
    const trie = new FastNetworkTrie();
    trie.insertDomainRule('doubleclick.net', {
      id: 'r1',
      type: 'network',
      action: 'block',
      pattern: '||doubleclick.net^',
      enabled: true,
      version: '1.0',
    });

    const matchSub = trie.matchHostname('ad.doubleclick.net');
    expect(matchSub.length).toBe(1);
    expect(matchSub[0]?.pattern).toBe('||doubleclick.net^');

    const matchExact = trie.matchHostname('doubleclick.net');
    expect(matchExact.length).toBe(1);

    const matchDifferent = trie.matchHostname('google.com');
    expect(matchDifferent.length).toBe(0);
  });

  it('should parse standard EasyList filter rules correctly', () => {
    const cosmetic = parseAdblockRuleLine('example.com##.ad-banner', 1);
    expect(cosmetic).not.toBeNull();
    expect(cosmetic?.type).toBe('cosmetic');

    const network = parseAdblockRuleLine('||adservice.google.com^$script', 2);
    expect(network).not.toBeNull();
    expect(network?.type).toBe('network');
  });

  it('should block URLs matching network rules and respect resource types', () => {
    const filterText = `
! Title: EasyList Sample
||doubleclick.net^$script
||tracking.pixel.com^$image
/banner/ad_*.js
    `;

    engine.loadFromRawText(filterText, 'test_filter');

    // Should match script on doubleclick.net
    const matchScript = engine.matchNetwork('https://ad.doubleclick.net/ad.js', 'script');
    expect(matchScript).not.toBeNull();
    expect(matchScript?.action).toBe('block');

    // Should not match image on doubleclick if rule specifically asks for script
    const matchImage = engine.matchNetwork('https://ad.doubleclick.net/pixel.png', 'image');
    expect(matchImage).toBeNull();

    // Wildcard match
    const matchWildcard = engine.matchNetwork('https://example.com/banner/ad_123.js', 'script');
    expect(matchWildcard).not.toBeNull();

    // Clean URL should not match
    const cleanMatch = engine.matchNetwork('https://example.com/app/main.js', 'script');
    expect(cleanMatch).toBeNull();
  });

  it('should generate accurate injected CSS for cosmetic hiding', () => {
    const filterText = `
##.generic-ad
example.com##.banner-top
example.com,news.com##.sponsor-box
~example.com##.not-on-example
    `;

    engine.loadFromRawText(filterText, 'cosmetic_test');

    const cssForExample = engine.getInjectedCssForHost('example.com');
    expect(cssForExample).toContain('.generic-ad');
    expect(cssForExample).toContain('.banner-top');
    expect(cssForExample).toContain('.sponsor-box');
    expect(cssForExample).not.toContain('.not-on-example');

    const cssForNews = engine.getInjectedCssForHost('news.com');
    expect(cssForNews).toContain('.generic-ad');
    expect(cssForNews).toContain('.sponsor-box');
    expect(cssForNews).not.toContain('.banner-top');
  });

  it('should support package rollback when updating rules', () => {
    const initialPkg = engine.loadFromRawText('||initial-bad-ad.com^', 'rollback_test');
    expect(engine.matchNetwork('https://initial-bad-ad.com/test')).not.toBeNull();

    // Update package with different rules
    const updatedPkg = {
      ...initialPkg,
      version: '2.0.0',
      rules: [],
      rulesCount: 0,
    };
    engine.loadPackage(updatedPkg);
    expect(engine.matchNetwork('https://initial-bad-ad.com/test')).toBeNull();

    // Rollback to v1
    const rolledBack = engine.rollbackPackage(initialPkg.packageId);
    expect(rolledBack).toBe(true);
    expect(engine.matchNetwork('https://initial-bad-ad.com/test')).not.toBeNull();
  });
});

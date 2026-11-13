import { describe, it, expect } from 'vitest';
import { classifyBlockedHost, isBlockedUrl, isSameSite } from '../src/utilities/url-guard';

describe('url-guard', () => {
  it('chặn domain cờ bạc / người lớn / mạng pop-under theo nhãn host', () => {
    for (const u of [
      'https://gemwin.com/', 'https://www.haywin88.vn/x', 'https://a.uk88.xyz:8080/', 'https://ad.popads.net/p.js',
      'https://pornhub.com/', 'https://m.xvideos.com/',
    ]) expect(isBlockedUrl(u), u).toBe(true);
  });

  it('KHÔNG chặn nhầm (các false-positive của bản cũ)', () => {
    for (const u of [
      'javascript:void(0)',
      'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
      'https://www.essex.ac.uk/', 'https://en.wikipedia.org/wiki/Sussex',
      'https://news.example.com/a?utm_campaign=newsletter&utm_medium=email',
      'https://oracle.com/java/technologies/', 'https://logo88.com/', 'https://sunwind.com/',
      'https://www.google.com/search?q=gemwin', 'https://example.com/cpdf/guide',
    ]) expect(isBlockedUrl(u), u).toBe(false);
  });

  it('classifyBlockedHost phân loại đúng', () => {
    expect(classifyBlockedHost('gemwin.com')).toBe('gambling');
    expect(classifyBlockedHost('xnxx.com')).toBe('adult');
    expect(classifyBlockedHost('x.clickadu.com')).toBe('ad-network');
    expect(classifyBlockedHost('example.com')).toBeNull();
  });

  it('isSameSite kiểm tra ranh giới dấu chấm', () => {
    expect(isSameSite('cdn.example.com', 'example.com')).toBe(true);
    expect(isSameSite('evil-example.com', 'example.com')).toBe(false);
    expect(isSameSite('google.evil.com', 'site.com')).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { ShioriRuleEngine } from '../src';

const mkPkg = (v: string) => ({
  packageId: 'p', name: 'p', version: v, checksum: 'a'.repeat(64), createdAt: 1, rulesCount: 1,
  rules: [{ id: '1', type: 'network' as const, action: 'block' as const, pattern: `||v${v}.com^`, enabled: true, version: '1' }],
});

describe('rules-engine regressions', () => {
  it('rollbackPackage quay về bản liền trước (không phải bản cũ nhất)', () => {
    const e = new ShioriRuleEngine();
    e.loadPackage(mkPkg('1')); e.loadPackage(mkPkg('2')); e.loadPackage(mkPkg('3'));
    expect(e.rollbackPackage('p')).toBe(true);
    expect(e.getLoadedPackages()[0]?.version).toBe('2');
  });

  it('nạp lại cùng tên package thì THAY THẾ, không cộng dồn', () => {
    const e = new ShioriRuleEngine();
    e.loadFromRawText('||a.com^', 'list');
    e.loadFromRawText('||b.com^', 'list');
    expect(e.getLoadedPackages()).toHaveLength(1);
    expect(e.matchNetwork('https://a.com/x')).toBeNull();
    expect(e.matchNetwork('https://b.com/x')).not.toBeNull();
  });

  it('hỗ trợ ||host/path và wildcard trong host', () => {
    const e = new ShioriRuleEngine();
    e.loadFromRawText('||example.com/ads^\n||ads*.tracker.net^');
    expect(e.matchNetwork('https://example.com/ads/x.js')).not.toBeNull();
    expect(e.matchNetwork('https://cdn.example.com/ads?x=1')).not.toBeNull();
    expect(e.matchNetwork('https://example.com/news')).toBeNull();
    expect(e.matchNetwork('https://ads42.tracker.net/p')).not.toBeNull();
  });

  it('bỏ qua exception rule @@ thay vì biến thành rule chặn', () => {
    const e = new ShioriRuleEngine();
    e.loadFromRawText('@@||good.com^\n##.ad');
    expect(e.getLoadedPackages()[0]?.rules).toHaveLength(1);
  });

  it('cosmetic: selector hỏng/độc hại không làm mất các selector còn lại', () => {
    const e = new ShioriRuleEngine();
    e.loadFromRawText('##.ok\n##div[[bad\n##.x}body{display:none\n##.ok2');
    const css = e.getInjectedCssForHost('a.com');
    expect(css).toContain('.ok');
    expect(css).toContain('.ok2');
    expect(css).not.toContain('[[bad');
    expect(css).not.toContain('body{');
  });
});

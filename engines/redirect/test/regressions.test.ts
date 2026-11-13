import { describe, it, expect } from 'vitest';
import { RedirectGuard } from '../src';

const gesture = { isTrustedUserGesture: true, timeSinceLastClickMs: 10 };

describe('redirect-guard regressions', () => {
  const g = new RedirectGuard();
  it('chặn host độc hại dù có click thật (click-hijack)', () => {
    expect(g.evaluateNavigation('https://www.haywin88.vn/', 'site.com', gesture).allow).toBe(false);
  });
  it('google.evil.com không còn được tin cậy nhờ "google."', () => {
    const r = g.evaluateNavigation('https://google.evil-site.com/', 'site.com', gesture);
    expect(r.reason).not.toBe('Trusted platform navigation');
  });
  it('subdomain cùng site vẫn được phép; evil-site.com thì không coi là cùng site', () => {
    expect(g.evaluateNavigation('https://cdn.site.com/x', 'site.com', gesture).reason).toMatch(/Same-origin/);
    expect(g.evaluateNavigation('https://evil-site.com/x', 'site.com', gesture).reason).not.toMatch(/Same-origin/);
  });
});

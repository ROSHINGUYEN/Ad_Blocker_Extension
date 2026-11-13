import { describe, it, expect } from 'vitest';
import { RedirectGuard } from '../src';

describe('Engines / Redirect - Redirect Guard', () => {
  const guard = new RedirectGuard();

  it('should flag known gambling and popunder links as suspicious', () => {
    const res = guard.isSuspiciousRedirect('https://uk88.top/play?aff=123');
    expect(res.isSuspicious).toBe(true);
    expect(res.reason).toContain('uk88');

    const res2 = guard.isSuspiciousRedirect('https://tracking.popads.net/serve');
    expect(res2.isSuspicious).toBe(true);
  });

  it('should allow legitimate clean URLs', () => {
    const res = guard.isSuspiciousRedirect('https://animevietsub.best/phim-moi/tap-1');
    expect(res.isSuspicious).toBe(false);

    const resGoogle = guard.isSuspiciousRedirect('https://www.google.com/search?q=anime');
    expect(resGoogle.isSuspicious).toBe(false);
  });
});

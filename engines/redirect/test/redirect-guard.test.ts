import { describe, it, expect } from 'vitest';
import { RedirectGuard } from '../src';

describe('Engines / Redirect - Heuristic Redirect Guard', () => {
  const guard = new RedirectGuard();

  it('should block pop-under navigation attempts triggered without recent user click', () => {
    const decision = guard.evaluateNavigation('https://random-unknown-domain-123.xyz/play', 'animevietsub.best', {
      isTrustedUserGesture: false,
      timeSinceLastClickMs: 3000, // 3 seconds after click -> script timer
      isTriggeredByScriptTimer: true,
    });
    expect(decision.allow).toBe(false);
    expect(decision.isPopunderTrap).toBe(true);
    expect(decision.reason).toContain('without direct trusted user gesture');
  });

  it('should allow authentic same-origin or same root-domain navigation', () => {
    const decision = guard.evaluateNavigation('https://animevietsub.best/tap-2', 'animevietsub.best', {
      isTrustedUserGesture: true,
      timeSinceLastClickMs: 50,
    });
    expect(decision.allow).toBe(true);
    expect(decision.isPopunderTrap).toBe(false);
  });

  it('should allow authentic navigation to major platforms like YouTube and Google', () => {
    const ytDecision = guard.evaluateNavigation('https://www.youtube.com/watch?v=123', 'any-site.com', {
      isTrustedUserGesture: true,
      timeSinceLastClickMs: 100,
    });
    expect(ytDecision.allow).toBe(true);

    const googleDecision = guard.evaluateNavigation('https://www.google.com/search', 'any-site.com', {
      isTrustedUserGesture: true,
      timeSinceLastClickMs: 100,
    });
    expect(googleDecision.allow).toBe(true);
  });
});

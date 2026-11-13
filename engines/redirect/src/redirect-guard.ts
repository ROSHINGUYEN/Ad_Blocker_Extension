export interface NavigationDecision {
  allow: boolean;
  reason: string;
  isPopunderTrap: boolean;
}

/**
 * Heuristic Zero-Trust Redirect & Pop-under Guard.
 * Evaluates navigation purely on behavioral intent, timing, and origin context
 * WITHOUT requiring a hardcoded list of gambling domains.
 */
export class RedirectGuard {
  /**
   * Evaluates if an attempted navigation / window.open is a legitimate user action
   * or a deceptive pop-under/click-hijack trap.
   */
  public evaluateNavigation(
    targetUrl: string,
    currentHost: string,
    options: {
      isTrustedUserGesture: boolean;
      timeSinceLastClickMs: number;
      isTriggeredByScriptTimer?: boolean;
      hasTargetBlank?: boolean;
      clickedElementTagName?: string;
    }
  ): NavigationDecision {
    if (!targetUrl || targetUrl === 'about:blank') {
      return { allow: true, reason: 'Blank navigation', isPopunderTrap: false };
    }

    const lowerUrl = targetUrl.toLowerCase();

    // 1. Dangerous or sneaky protocols
    if (lowerUrl.startsWith('javascript:') || lowerUrl.startsWith('data:text/html')) {
      return {
        allow: false,
        reason: 'Dangerous executable protocol navigation',
        isPopunderTrap: true,
      };
    }

    // 2. Background Script / Timer-induced Pop-under
    // If window.open was called from setTimeout/setInterval or when user has NOT clicked in the last 1000ms
    if (options.isTriggeredByScriptTimer || !options.isTrustedUserGesture || options.timeSinceLastClickMs > 1000) {
      return {
        allow: false,
        reason: 'Unprompted navigation attempt without direct trusted user gesture (Pop-under)',
        isPopunderTrap: true,
      };
    }

    // 3. Same-origin or same root-domain is always safe (e.g. browsing within youtube.com or animevietsub)
    try {
      const parsedTarget = new URL(targetUrl);
      const targetHost = parsedTarget.hostname.toLowerCase();
      const currentCleanHost = currentHost.toLowerCase();

      if (
        targetHost === currentCleanHost ||
        targetHost.endsWith('.' + currentCleanHost) ||
        currentCleanHost.endsWith('.' + targetHost)
      ) {
        return { allow: true, reason: 'Same-origin / subdomain navigation', isPopunderTrap: false };
      }

      // Check if targetHost is an authentic major content/video platform (Never block authentic user clicks to legitimate destinations)
      const COMMON_SAFE_HOSTS = ['google.', 'youtube.com', 'facebook.com', 'twitter.com', 'x.com', 'discord.', 'github.com'];
      if (COMMON_SAFE_HOSTS.some((safe) => targetHost.includes(safe))) {
        return { allow: true, reason: 'Trusted platform navigation', isPopunderTrap: false };
      }
    } catch {
      // Relative URL or invalid URL -> relative URLs belong to the same site!
      return { allow: true, reason: 'Relative same-site navigation', isPopunderTrap: false };
    }

    // 4. Default: User clicked intentionally on a link that is genuine
    return { allow: true, reason: 'Genuine user-initiated navigation', isPopunderTrap: false };
  }
}

import { isBlockedUrl, isSameSite } from '@shiori/shared';

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

    // 3. Đích nằm trong danh sách chặn (cờ bạc / người lớn / mạng pop-under) -> luôn chặn,
    //    kể cả khi có thao tác click thật (click-hijack).
    if (isBlockedUrl(targetUrl)) {
      return { allow: false, reason: 'Destination is on the blocked host list', isPopunderTrap: true };
    }

    // 4. Cùng site (kiểm tra ranh giới dấu chấm, không dùng endsWith trần)
    try {
      const targetHost = new URL(targetUrl).hostname.toLowerCase();
      if (isSameSite(targetHost, currentHost)) {
        return { allow: true, reason: 'Same-origin / subdomain navigation', isPopunderTrap: false };
      }
    } catch {
      // URL tương đối / không hợp lệ -> cùng site
      return { allow: true, reason: 'Relative same-site navigation', isPopunderTrap: false };
    }

    // 5. Default: User clicked intentionally on a link that is genuine
    return { allow: true, reason: 'Genuine user-initiated navigation', isPopunderTrap: false };
  }
}

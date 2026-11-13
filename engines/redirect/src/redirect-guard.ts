const DISALLOWED_POPUP_HOST_PATTERNS = [
  'uk88',
  'hitclub',
  'win79',
  'sunwin',
  'rikvip',
  'bet88',
  'fb88',
  'fun88',
  'w88',
  'shbet',
  'jun88',
  'new88',
  '789club',
  'b52',
  'iwin',
  'go88',
  'popads',
  'clickadu',
  'adsterra',
  'propellerads',
  'syndication',
  'doubleclick',
];

export class RedirectGuard {
  /**
   * Checks whether a target URL is an illegal gambling link or ad pop-under redirect.
   */
  public isSuspiciousRedirect(url: string): { isSuspicious: boolean; reason?: string } {
    if (!url) return { isSuspicious: false };

    const lowerUrl = url.toLowerCase();

    // Protocol check
    if (lowerUrl.startsWith('javascript:') || lowerUrl.startsWith('data:text/html')) {
      return { isSuspicious: true, reason: 'Suspicious script protocol redirection' };
    }

    for (const pattern of DISALLOWED_POPUP_HOST_PATTERNS) {
      if (lowerUrl.includes(pattern)) {
        return { isSuspicious: true, reason: `Target URL matches ad/gambling redirect signature: "${pattern}"` };
      }
    }

    return { isSuspicious: false };
  }
}

import { SignalEvidence } from '../types/signals';

const TRACKING_QUERY_KEYS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'fbclid',
  'gclid',
  'dclid',
  'msclkid',
  'mc_eid',
  'yclid',
  'aff_id',
]);

const SUSPICIOUS_HOST_KEYWORDS = [
  'pixel',
  'track',
  'telemetry',
  'analytics',
  'beacon',
  'click',
  'counter',
  'adsystem',
];

export class NetworkIntelligence {
  /**
   * Analyzes an outgoing request or element source URL for tracking and ad patterns.
   */
  public analyzeUrl(urlStr: string, currentHost: string): SignalEvidence[] {
    const signals: SignalEvidence[] = [];

    let parsed: URL;
    try {
      parsed = new URL(urlStr);
    } catch {
      return signals;
    }

    const host = parsed.hostname.toLowerCase();

    // 1. Third-party check
    const isThirdParty = Boolean(
      currentHost &&
      host !== currentHost &&
      !host.endsWith('.' + currentHost) &&
      !currentHost.endsWith('.' + host)
    );

    if (isThirdParty) {
      signals.push({
        source: 'network',
        feature: 'third_party_origin',
        weight: 0.25,
        suspiciousScore: 0.35,
        reason: `Target hostname (${host}) is third-party to ${currentHost}`,
      });
    }

    // 2. Suspicious tracking query parameters
    let trackingParamCount = 0;
    parsed.searchParams.forEach((_, key) => {
      if (TRACKING_QUERY_KEYS.has(key.toLowerCase())) {
        trackingParamCount++;
      }
    });

    if (trackingParamCount > 0) {
      signals.push({
        source: 'network',
        feature: 'tracking_query_parameters',
        weight: 0.35,
        suspiciousScore: Math.min(0.4 + trackingParamCount * 0.2, 0.95),
        reason: `URL contains ${trackingParamCount} known ad/tracking tracking query parameter(s)`,
      });
    }

    // 3. Suspicious domain keywords
    for (const kw of SUSPICIOUS_HOST_KEYWORDS) {
      if (host.includes(kw)) {
        signals.push({
          source: 'network',
          feature: 'suspicious_domain_keyword',
          weight: 0.3,
          suspiciousScore: 0.6,
          reason: `Hostname contains tracking/ad identifier keyword: "${kw}"`,
        });
        break;
      }
    }

    return signals;
  }
}

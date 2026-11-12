/**
 * SHIORI AD CLEANER - Core Detection Result Types
 */

export type DetectionCategory =
  | 'CONFIRMED_AD'
  | 'SUSPECTED_AD'
  | 'SPONSORED_CONTENT'
  | 'TRACKER'
  | 'MALICIOUS_REDIRECT'
  | 'LEGITIMATE_CONTENT'
  | 'UNKNOWN';

export type DetectionAction =
  | 'BLOCK'
  | 'HIDE'
  | 'WARN'
  | 'ALLOW'
  | 'REVIEW';

export type SourceEngine =
  | 'web-ad'
  | 'youtube'
  | 'redirect'
  | 'privacy'
  | 'rule'
  | 'intelligence';

export interface DetectionEvidence {
  ruleMatched?: string;
  selector?: string;
  domain?: string;
  url?: string;
  reasons: string[];
  metadata?: Record<string, unknown>;
}

export interface DetectionResult {
  detectionId: string;
  sourceEngine: SourceEngine;
  category: DetectionCategory;
  confidence: number; // 0.0 to 1.0
  evidence: DetectionEvidence;
  recommendedAction: DetectionAction;
  timestamp: number;
}

export type EngineStatus = 'idle' | 'running' | 'paused' | 'error' | 'disabled';

export interface EngineHealth {
  engineName: SourceEngine;
  status: EngineStatus;
  lastActive: number;
  detectionsCount: number;
  errorsCount: number;
  lastError?: string;
}

export interface ProtectionStatistics {
  requestsFiltered: number;
  elementsHidden: number;
  redirectsBlocked: number;
  trackersBlocked: number;
  activeEnginesCount: number;
  updatedAt: number;
}

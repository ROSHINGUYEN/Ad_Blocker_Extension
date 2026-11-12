export interface SignalEvidence {
  source: 'network' | 'dom' | 'behavior' | 'media' | 'context';
  feature: string;
  weight: number; // 0.0 -> 1.0 contribution weight
  suspiciousScore: number; // 0.0 -> 1.0 how suspicious this signal is
  reason: string;
}

export interface MultiSignalAssessment {
  targetId: string;
  signals: SignalEvidence[];
  aggregateConfidence: number;
}

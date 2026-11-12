import { z } from 'zod';

export const DetectionCategorySchema = z.enum([
  'CONFIRMED_AD',
  'SUSPECTED_AD',
  'SPONSORED_CONTENT',
  'TRACKER',
  'MALICIOUS_REDIRECT',
  'LEGITIMATE_CONTENT',
  'UNKNOWN',
]);

export const DetectionActionSchema = z.enum([
  'BLOCK',
  'HIDE',
  'WARN',
  'ALLOW',
  'REVIEW',
]);

export const SourceEngineSchema = z.enum([
  'web-ad',
  'youtube',
  'redirect',
  'privacy',
  'rule',
  'intelligence',
]);

export const DetectionEvidenceSchema = z.object({
  ruleMatched: z.string().optional(),
  selector: z.string().optional(),
  domain: z.string().optional(),
  url: z.string().optional(),
  reasons: z.array(z.string()).min(1, 'Phải có ít nhất 1 lý do bằng chứng'),
  metadata: z.record(z.unknown()).optional(),
});

export const DetectionResultSchema = z.object({
  detectionId: z.string().min(1),
  sourceEngine: SourceEngineSchema,
  category: DetectionCategorySchema,
  confidence: z.number().min(0.0).max(1.0),
  evidence: DetectionEvidenceSchema,
  recommendedAction: DetectionActionSchema,
  timestamp: z.number().positive(),
});

export const BaseRuleSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['network', 'cosmetic', 'redirect', 'privacy', 'youtube']),
  action: z.enum(['block', 'hide', 'redirect', 'modify_headers', 'allow']),
  pattern: z.string().min(1),
  domains: z.array(z.string()).optional(),
  excludedDomains: z.array(z.string()).optional(),
  enabled: z.boolean(),
  version: z.string().min(1),
});

export const ShioriRulePackageSchema = z.object({
  packageId: z.string().min(1),
  name: z.string().min(1),
  version: z.string().min(1),
  checksum: z.string().regex(/^[a-f0-9]{64}$/i, 'Checksum phải là SHA-256 hợp lệ'),
  createdAt: z.number().positive(),
  rulesCount: z.number().nonnegative(),
  rules: z.array(BaseRuleSchema),
});

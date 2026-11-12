import { describe, it, expect } from 'vitest';
import {
  DetectionResultSchema,
  generateDetectionId,
  parseCleanUrl,
  debounce,
  type DetectionResult,
} from '../src';

describe('Shared Module - Schemas & Utilities', () => {
  it('should generate valid detection IDs with custom prefix', () => {
    const id = generateDetectionId('yt');
    expect(id).toMatch(/^yt_[a-z0-9]+_[a-z0-9]+$/);
  });

  it('should parse clean URLs correctly', () => {
    const res = parseCleanUrl('https://Doubleclick.net/pagead/ads?client=ca-pub');
    expect(res).not.toBeNull();
    expect(res?.hostname).toBe('doubleclick.net');
    expect(res?.pathname).toBe('/pagead/ads');
    expect(res?.isHttp).toBe(true);

    const invalid = parseCleanUrl('not-a-valid-url');
    expect(invalid).toBeNull();
  });

  it('should validate DetectionResult schema with positive validation', () => {
    const validResult: DetectionResult = {
      detectionId: generateDetectionId('web'),
      sourceEngine: 'web-ad',
      category: 'CONFIRMED_AD',
      confidence: 0.95,
      evidence: {
        domain: 'adservice.google.com',
        reasons: ['Matched known ad network domain', 'Suspicious iframe pattern'],
      },
      recommendedAction: 'BLOCK',
      timestamp: Date.now(),
    };

    const parseOutcome = DetectionResultSchema.safeParse(validResult);
    expect(parseOutcome.success).toBe(true);
  });

  it('should reject invalid DetectionResult (e.g. confidence > 1.0 or empty reasons)', () => {
    const invalidResult = {
      detectionId: 'test_123',
      sourceEngine: 'unknown-engine',
      category: 'INVALID_CATEGORY',
      confidence: 1.5, // Invalid > 1.0
      evidence: {
        reasons: [], // Invalid: min(1) required
      },
      recommendedAction: 'DESTROY', // Invalid action
      timestamp: -50,
    };

    const parseOutcome = DetectionResultSchema.safeParse(invalidResult);
    expect(parseOutcome.success).toBe(false);
  });

  it('should debounce calls properly', async () => {
    let callCount = 0;
    const fn = debounce(() => {
      callCount++;
    }, 50);

    fn();
    fn();
    fn();
    expect(callCount).toBe(0);

    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(callCount).toBe(1);
  });
});

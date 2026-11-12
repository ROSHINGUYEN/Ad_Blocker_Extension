import { describe, it, expect } from 'vitest';
import { RuleDistributionService } from '../src';
import { BaseRule } from '@shiori/shared';

describe('Backend / RuleDistributionService - Integrity & Verification', () => {
  const service = new RuleDistributionService();

  const sampleRules: BaseRule[] = [
    {
      id: 'net_1',
      type: 'network',
      action: 'block',
      pattern: '||badtracker.com^',
      enabled: true,
      version: '1.0',
    },
    {
      id: 'cosm_2',
      type: 'cosmetic',
      action: 'hide',
      pattern: '##.ad-banner',
      enabled: true,
      version: '1.0',
    },
  ];

  it('should package rules with correct SHA-256 checksum', () => {
    const pkg = service.packageRules('EasyList_Base', '1.0.0', sampleRules);
    expect(pkg.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(pkg.rulesCount).toBe(2);

    const verification = service.verifyPackage(pkg);
    expect(verification.isValid).toBe(true);
    expect(verification.computedChecksum).toBe(pkg.checksum);
  });

  it('should reject tampered rule package where checksum does not match', () => {
    const pkg = service.packageRules('Tamper_Test', '1.0.0', sampleRules);

    // Tamper with rules without updating checksum
    const tamperedPkg = {
      ...pkg,
      rules: [
        ...pkg.rules,
        {
          id: 'injected_rule',
          type: 'network' as const,
          action: 'block' as const,
          pattern: '||injected.com^',
          enabled: true,
          version: '1.0',
        },
      ],
      rulesCount: 3,
    };

    const verification = service.verifyPackage(tamperedPkg);
    expect(verification.isValid).toBe(false);
    expect(verification.error).toContain('Integrity check failed');
  });
});

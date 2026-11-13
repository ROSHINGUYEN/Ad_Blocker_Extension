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

  it('should generate identical checksum for rules with different key ordering (Canonical JSON)', () => {
    const rulesOrderA = [
      { id: 'rule_1', type: 'network' as const, action: 'block' as const, pattern: '||tracker.com^', enabled: true, version: '1.0' },
    ];
    // Khác thứ tự thuộc tính trong object
    const rulesOrderB = [
      { version: '1.0', pattern: '||tracker.com^', enabled: true, action: 'block' as const, type: 'network' as const, id: 'rule_1' },
    ];

    const hashA = service.computeRulesChecksum(rulesOrderA);
    const hashB = service.computeRulesChecksum(rulesOrderB);

    expect(hashA).toBe(hashB);
  });

  it('should correctly sign and verify package with Ed25519 asymmetric cryptography', () => {
    const { generateKeyPairSync } = require('node:crypto');
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');

    const pkg = service.packageRules('Verified_Ed25519', '2.0.0', sampleRules, privateKey);
    expect(pkg.signature).toBeDefined();
    expect(pkg.signature).toMatch(/^[a-f0-9]{128}$/i);

    // Xác thực hợp lệ
    const validResult = service.verifyPackage(pkg, publicKey);
    expect(validResult.isValid).toBe(true);
    expect(validResult.signatureVerified).toBe(true);

    // Kẻ tấn công giả mạo sửa 1 byte trong pattern nhưng giữ nguyên chữ ký
    const tamperedRules = JSON.parse(JSON.stringify(sampleRules));
    tamperedRules[0].pattern = '||tampered.com^';

    const tamperedChecksum = service.computeRulesChecksum(tamperedRules);
    const fakePkg = {
      ...pkg,
      rules: tamperedRules,
      checksum: tamperedChecksum, // Đã sửa checksum cho khớp
    };

    // Kiểm tra chữ ký sẽ phát hiện giả mạo
    const fakeResult = service.verifyPackage(fakePkg, publicKey);
    expect(fakeResult.isValid).toBe(false);
    expect(fakeResult.signatureVerified).toBe(false);
    expect(fakeResult.error).toContain('Invalid Ed25519 signature');

    // Ký bởi khoá khác
    const anotherKeyPair = generateKeyPairSync('ed25519');
    const wrongKeyResult = service.verifyPackage(pkg, anotherKeyPair.publicKey);
    expect(wrongKeyResult.isValid).toBe(false);
    expect(wrongKeyResult.signatureVerified).toBe(false);
  });
});

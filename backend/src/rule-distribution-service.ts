import { createHash, sign, verify } from 'node:crypto';
import { ShioriRulePackage, ShioriRulePackageSchema } from '@shiori/shared';

export interface PackageValidationResult {
  isValid: boolean;
  computedChecksum: string;
  signatureVerified?: boolean;
  error?: string;
}

export class RuleDistributionService {
  /**
   * Serializes an arbitrary JS value into Canonical JSON (RFC 8785 subset):
   * - Sorted dictionary keys alphabetically
   * - Handles objects, arrays, numbers, booleans, strings, and null
   * - Ignores/omits undefined values in objects
   * - Deterministic representation ensures identical SHA-256 regardless of key insertion order
   */
  public canonicalStringify(value: any): string {
    if (value === null || typeof value !== 'object') {
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
      return '[' + value.map((item) => this.canonicalStringify(item)).join(',') + ']';
    }
    const keys = Object.keys(value).sort();
    const pairs: string[] = [];
    for (const key of keys) {
      const v = value[key];
      if (v !== undefined && typeof v !== 'function' && typeof v !== 'symbol') {
        pairs.push(`${JSON.stringify(key)}:${this.canonicalStringify(v)}`);
      }
    }
    return '{' + pairs.join(',') + '}';
  }

  /**
   * Computes SHA-256 hash of the canonical rules content inside package.
   */
  public computeRulesChecksum(rules: any[]): string {
    const serialized = this.canonicalStringify(rules);
    return createHash('sha256').update(serialized).digest('hex');
  }

  /**
   * Signs package data using Ed25519 private key.
   * Format: Buffer/string privateKey in PEM or DER or KeyObject format.
   */
  public signPackage(rules: any[], privateKeyPemOrDer: string | Buffer): string {
    const data = Buffer.from(this.canonicalStringify(rules), 'utf8');
    const signatureBuffer = sign(null, data, privateKeyPemOrDer);
    return signatureBuffer.toString('hex');
  }

  /**
   * Verifies package data against an Ed25519 public key.
   */
  public verifySignature(rules: any[], signatureHex: string, publicKeyPemOrDer: string | Buffer): boolean {
    try {
      const data = Buffer.from(this.canonicalStringify(rules), 'utf8');
      const signatureBuffer = Buffer.from(signatureHex, 'hex');
      return verify(null, data, publicKeyPemOrDer, signatureBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Strictly validates incoming rule packages against tamper attacks and invalid schemas.
   * Optionally verifies authenticity via Ed25519 public key if supplied.
   */
  public verifyPackage(
    pkg: ShioriRulePackage,
    expectedPublicKeyPem?: string | Buffer
  ): PackageValidationResult {
    // 1. Zod Schema Verification
    const schemaValidation = ShioriRulePackageSchema.safeParse(pkg);
    if (!schemaValidation.success) {
      return {
        isValid: false,
        computedChecksum: '',
        error: `Schema validation failed: ${schemaValidation.error.message}`,
      };
    }

    // 2. Cryptographic SHA-256 Checksum Verification (Canonical JSON)
    const actualChecksum = this.computeRulesChecksum(pkg.rules);
    if (pkg.checksum.toLowerCase() !== actualChecksum.toLowerCase()) {
      return {
        isValid: false,
        computedChecksum: actualChecksum,
        error: `Integrity check failed! Expected checksum: ${pkg.checksum}, but computed: ${actualChecksum}`,
      };
    }

    // 3. Ed25519 Origin Authenticity Verification (if public key provided or package contains signature)
    let signatureVerified: boolean | undefined = undefined;
    if (expectedPublicKeyPem) {
      if (!pkg.signature) {
        return {
          isValid: false,
          computedChecksum: actualChecksum,
          signatureVerified: false,
          error: 'Package missing required Ed25519 signature',
        };
      }
      const verified = this.verifySignature(pkg.rules, pkg.signature, expectedPublicKeyPem);
      if (!verified) {
        return {
          isValid: false,
          computedChecksum: actualChecksum,
          signatureVerified: false,
          error: 'Authenticity verification failed: Invalid Ed25519 signature',
        };
      }
      signatureVerified = true;
    }

    return {
      isValid: true,
      computedChecksum: actualChecksum,
      signatureVerified,
    };
  }

  /**
   * Creates a verified, cryptographically signed ShioriRulePackage from rule definitions.
   */
  public packageRules(
    name: string,
    version: string,
    rules: any[],
    privateKeyPemOrDer?: string | Buffer
  ): ShioriRulePackage {
    const checksum = this.computeRulesChecksum(rules);
    const signature = privateKeyPemOrDer ? this.signPackage(rules, privateKeyPemOrDer) : undefined;
    return {
      packageId: `pkg_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${version}`,
      name,
      version,
      checksum,
      signature,
      createdAt: Date.now(),
      rulesCount: rules.length,
      rules,
    };
  }
}

import { BaseRule, NetworkRule, CosmeticRule, ShioriRulePackage, ShioriRulePackageSchema } from '@shiori/shared';
import { NetworkRuleMatcher } from './network/matcher';
import { CosmeticRuleManager } from './cosmetic/cosmetic-manager';
import { parseAdblockRuleLine } from './parser/filter-parser';

export class ShioriRuleEngine {
  private networkMatcher = new NetworkRuleMatcher();
  private cosmeticManager = new CosmeticRuleManager();
  private activePackages: Map<string, ShioriRulePackage> = new Map();
  private ruleHistory: ShioriRulePackage[] = []; // For rollback
  private static readonly MAX_HISTORY = 10;

  /**
   * Loads a verified rule package.
   */
  public loadPackage(pkg: ShioriRulePackage): { success: boolean; error?: string } {
    const validation = ShioriRulePackageSchema.safeParse(pkg);
    if (!validation.success) {
      return { success: false, error: validation.error.message };
    }

    // Save previous state for rollback if package already exists
    const existing = this.activePackages.get(pkg.packageId);
    if (existing) {
      this.ruleHistory.push(existing);
      // Giới hạn lịch sử để không rò rỉ bộ nhớ khi cập nhật rule liên tục
      if (this.ruleHistory.length > ShioriRuleEngine.MAX_HISTORY) {
        this.ruleHistory.shift();
      }
    }

    this.activePackages.set(pkg.packageId, pkg);
    this.rebuildIndex();
    return { success: true };
  }

  /**
   * Reverts to previous rule package version (Rollback).
   */
  public rollbackPackage(packageId: string): boolean {
    // Lấy bản GẦN NHẤT của package (findIndex cũ lấy bản cũ nhất -> rollback sai phiên bản)
    let lastVersionIndex = -1;
    for (let i = this.ruleHistory.length - 1; i >= 0; i--) {
      if (this.ruleHistory[i]?.packageId === packageId) {
        lastVersionIndex = i;
        break;
      }
    }
    if (lastVersionIndex === -1) {
      return false;
    }
    const previous = this.ruleHistory.splice(lastVersionIndex, 1)[0];
    if (previous) {
      this.activePackages.set(packageId, previous);
      this.rebuildIndex();
      return true;
    }
    return false;
  }

  /**
   * Loads rules from raw EasyList-style text lines.
   */
  public loadFromRawText(text: string, packageName = 'custom_list'): ShioriRulePackage {
    const lines = text.split('\n');
    const rules: BaseRule[] = [];

    lines.forEach((line, idx) => {
      const parsed = parseAdblockRuleLine(line, idx);
      if (parsed) {
        rules.push(parsed);
      }
    });

    const pkg: ShioriRulePackage = {
      packageId: `pkg_${packageName}`, // ổn định: nạp lại cùng tên sẽ THAY THẾ, không cộng dồn
      name: packageName,
      version: '1.0.0',
      checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', // Baseline SHA-256
      createdAt: Date.now(),
      rulesCount: rules.length,
      rules,
    };

    this.loadPackage(pkg);
    return pkg;
  }

  public matchNetwork(url: string, resourceType?: string): NetworkRule | null {
    return this.networkMatcher.match(url, resourceType);
  }

  public getInjectedCssForHost(hostname: string): string {
    return this.cosmeticManager.getInjectedCssForHost(hostname);
  }

  private rebuildIndex(): void {
    this.networkMatcher.clear();
    this.cosmeticManager.clear();

    for (const pkg of this.activePackages.values()) {
      for (const rule of pkg.rules) {
        if (!rule.enabled) continue;
        if (rule.type === 'network') {
          this.networkMatcher.addRule(rule as NetworkRule);
        } else if (rule.type === 'cosmetic') {
          this.cosmeticManager.addRule(rule as CosmeticRule);
        }
      }
    }
  }

  public getLoadedPackages(): ShioriRulePackage[] {
    return Array.from(this.activePackages.values());
  }
}

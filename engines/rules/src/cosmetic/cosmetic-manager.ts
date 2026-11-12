import { CosmeticRule } from '@shiori/shared';

/**
 * Manages Cosmetic (CSS-based) element hiding rules.
 * Supports generic cosmetic filters and domain-specific filters.
 */
export class CosmeticRuleManager {
  private genericRules: CosmeticRule[] = [];
  private domainRulesMap: Map<string, CosmeticRule[]> = new Map();

  public addRule(rule: CosmeticRule): void {
    if (!rule.enabled) return;

    if (!rule.domains || rule.domains.length === 0) {
      this.genericRules.push(rule);
    } else {
      for (const domain of rule.domains) {
        const cleanDomain = domain.toLowerCase();
        const list = this.domainRulesMap.get(cleanDomain) || [];
        list.push(rule);
        this.domainRulesMap.set(cleanDomain, list);
      }
    }
  }

  /**
   * Generates injected CSS stylesheet string for a target hostname.
   */
  public getInjectedCssForHost(hostname: string): string {
    const cleanHost = hostname.toLowerCase();
    const selectors = new Set<string>();

    // 1. Generic selectors
    for (const rule of this.genericRules) {
      if (this.isDomainExcluded(rule, cleanHost)) continue;
      selectors.add(rule.selector);
    }

    // 2. Domain-specific selectors (including root domain)
    for (const [ruleDomain, rules] of this.domainRulesMap.entries()) {
      if (cleanHost === ruleDomain || cleanHost.endsWith('.' + ruleDomain)) {
        for (const rule of rules) {
          if (!this.isDomainExcluded(rule, cleanHost)) {
            selectors.add(rule.selector);
          }
        }
      }
    }

    if (selectors.size === 0) {
      return '';
    }

    // CSS injection for cosmetic hiding with display none !important
    const combinedSelector = Array.from(selectors).join(',\n');
    return `${combinedSelector} {\n  display: none !important;\n}`;
  }

  private isDomainExcluded(rule: CosmeticRule, hostname: string): boolean {
    if (!rule.excludedDomains || rule.excludedDomains.length === 0) {
      return false;
    }
    return rule.excludedDomains.some(
      (ex) => hostname === ex.toLowerCase() || hostname.endsWith('.' + ex.toLowerCase())
    );
  }

  public clear(): void {
    this.genericRules = [];
    this.domainRulesMap.clear();
  }
}

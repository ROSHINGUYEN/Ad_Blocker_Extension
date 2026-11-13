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

    // Một selector sai làm trình duyệt bỏ CẢ rule (selector list), nên chia thành các khối nhỏ.
    // Nếu một khối lỗi thì chỉ mất khối đó; selector chứa ký tự phá cú pháp CSS bị loại.
    const safe = Array.from(selectors).filter(CosmeticRuleManager.isSafeSelector);
    const CHUNK = 20;
    const blocks: string[] = [];
    for (let i = 0; i < safe.length; i += CHUNK) {
      blocks.push(`${safe.slice(i, i + CHUNK).join(',\n')} {\n  display: none !important;\n}`);
    }
    return blocks.join('\n');
  }

  /** Chặn CSS-injection từ rule package: không cho `{ } ; @ <` và dấu ngoặc mất cân bằng. */
  private static isSafeSelector(selector: string): boolean {
    if (!selector || selector.length > 500) return false;
    if (/[{};@<>\\]/.test(selector)) return false;
    let round = 0;
    let square = 0;
    for (const ch of selector) {
      if (ch === '(') round++;
      else if (ch === ')') round--;
      else if (ch === '[') square++;
      else if (ch === ']') square--;
      if (round < 0 || square < 0) return false;
    }
    return round === 0 && square === 0;
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

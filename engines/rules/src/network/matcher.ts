import { NetworkRule } from '@shiori/shared';
import { FastNetworkTrie } from './fast-trie';

export class NetworkRuleMatcher {
  private domainTrie = new FastNetworkTrie();
  private wildcardRules: { regex: RegExp; rule: NetworkRule }[] = [];

  public addRule(rule: NetworkRule): void {
    if (!rule.enabled) return;

    // Standard adblock pattern: ||example.com^
    if (rule.pattern.startsWith('||')) {
      const body = rule.pattern.slice(2);
      const hostPart = body.replace(/[\^/*?:].*$/, '');
      const hasPathOrWildcard = /[/*?]/.test(body.replace(/\^$/, ''));
      if (hostPart && !hasPathOrWildcard) {
        // Thuần domain: dùng trie (O(số nhãn))
        this.domainTrie.insertDomainRule(hostPart, rule);
      } else {
        // `||host/path`, `||ads*.example.com^`: neo ở đầu hostname rồi dùng regex
        const escaped = body
          .replace(/([.+?$|{}()[\]\\])/g, '\\$1')
          .replace(/\*/g, '.*')
          .replace(/\^/g, '([/:?&=]|$)');
        try {
          this.wildcardRules.push({ regex: new RegExp(`^https?://([^/?#]*\\.)?${escaped}`, 'i'), rule });
        } catch {
          // Bỏ qua regex không hợp lệ
        }
      }
    } else if (rule.pattern.includes('*') || rule.pattern.includes('^')) {
      // Regex conversion for wildcards
      let escaped = rule.pattern
        .replace(/([.+?${}()|[\]\\])/g, '\\$1')
        .replace(/\*/g, '.*')
        .replace(/\^/g, '([/:?&=]|$)');
      try {
        const regex = new RegExp(escaped, 'i');
        this.wildcardRules.push({ regex, rule });
      } catch {
        // Skip invalid regex safely
      }
    } else {
      // Direct string substring match
      if (!rule.pattern) return; // pattern rỗng sẽ khớp MỌI URL
      const escaped = rule.pattern.replace(/([.+?${}()|[\]\\])/g, '\\$1');
      try {
        this.wildcardRules.push({ regex: new RegExp(escaped, 'i'), rule });
      } catch {
        // Bỏ qua
      }
    }
  }

  public match(url: string, resourceType?: string): NetworkRule | null {
    let hostname = '';
    try {
      const parsed = new URL(url);
      hostname = parsed.hostname;
    } catch {
      return null;
    }

    // 1. Fast Trie Check (Domain anchor)
    const trieMatches = this.domainTrie.matchHostname(hostname);
    for (const rule of trieMatches) {
      if (this.matchesResourceType(rule, resourceType)) {
        return rule;
      }
    }

    // 2. Wildcard & Substring Check
    for (const item of this.wildcardRules) {
      if (item.regex.test(url)) {
        if (this.matchesResourceType(item.rule, resourceType)) {
          return item.rule;
        }
      }
    }

    return null;
  }

  private matchesResourceType(rule: NetworkRule, resourceType?: string): boolean {
    if (!rule.resourceTypes || rule.resourceTypes.length === 0) {
      return true;
    }
    if (!resourceType) {
      return true;
    }
    return rule.resourceTypes.includes(resourceType as any);
  }

  public clear(): void {
    this.domainTrie.clear();
    this.wildcardRules = [];
  }
}

import { NetworkRule } from '@shiori/shared';

interface TrieNode {
  children: Map<string, TrieNode>;
  isEndOfWord: boolean;
  rules: NetworkRule[];
}

/**
 * Fast Trie-based Domain and URL Prefix Matcher.
 * Matches domain suffixes/anchors efficiently without full regex overhead.
 */
export class FastNetworkTrie {
  private root: TrieNode = {
    children: new Map(),
    isEndOfWord: false,
    rules: [],
  };

  /**
   * Inserts a domain pattern into the Trie in reverse domain order (e.g. "doubleclick.net" -> "net" -> "doubleclick").
   * This allows exact or subdomain matching in O(k) where k is domain segment count.
   */
  public insertDomainRule(domain: string, rule: NetworkRule): void {
    const parts = domain.toLowerCase().split('.').reverse();
    let current = this.root;

    for (const part of parts) {
      if (!current.children.has(part)) {
        current.children.set(part, {
          children: new Map(),
          isEndOfWord: false,
          rules: [],
        });
      }
      current = current.children.get(part)!;
    }

    current.isEndOfWord = true;
    current.rules.push(rule);
  }

  /**
   * Matches hostname against stored domain rules.
   * Matches both exact domain and any subdomains (e.g., "ad.doubleclick.net" matches "doubleclick.net").
   */
  public matchHostname(hostname: string): NetworkRule[] {
    const parts = hostname.toLowerCase().split('.').reverse();
    let current = this.root;
    const matches: NetworkRule[] = [];

    for (const part of parts) {
      if (current.children.has(part)) {
        current = current.children.get(part)!;
        if (current.isEndOfWord) {
          matches.push(...current.rules);
        }
      } else {
        break;
      }
    }

    return matches;
  }

  public clear(): void {
    this.root = {
      children: new Map(),
      isEndOfWord: false,
      rules: [],
    };
  }
}

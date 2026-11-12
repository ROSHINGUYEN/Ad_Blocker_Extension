export type RuleType = 'network' | 'cosmetic' | 'redirect' | 'privacy' | 'youtube';

export type RuleAction = 'block' | 'hide' | 'redirect' | 'modify_headers' | 'allow';

export interface BaseRule {
  id: string;
  type: RuleType;
  action: RuleAction;
  pattern: string;
  domains?: string[];
  excludedDomains?: string[];
  enabled: boolean;
  version: string;
}

export interface NetworkRule extends BaseRule {
  type: 'network';
  resourceTypes?: Array<'script' | 'image' | 'stylesheet' | 'xmlhttprequest' | 'sub_frame' | 'media' | 'other'>;
}

export interface CosmeticRule extends BaseRule {
  type: 'cosmetic';
  selector: string;
}

export interface ShioriRulePackage {
  packageId: string;
  name: string;
  version: string;
  checksum: string; // SHA-256
  createdAt: number;
  rulesCount: number;
  rules: BaseRule[];
}

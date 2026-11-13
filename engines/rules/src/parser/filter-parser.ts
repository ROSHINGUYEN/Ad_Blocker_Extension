import { BaseRule, NetworkRule, CosmeticRule } from '@shiori/shared';

/**
 * Parses adblock standard filter text lines (EasyList-style) into typed Shiori rules.
 */
export function parseAdblockRuleLine(line: string, index: number): BaseRule | null {
  const trimmed = line.trim();

  // Skip comments and empty lines
  if (!trimmed || trimmed.startsWith('!') || trimmed.startsWith('[')) {
    return null;
  }

  // Exception rules (@@) và cosmetic exception/extended (#@#, #?#, #$#) chưa được hỗ trợ.
  // Bỏ qua thay vì biến thành rule CHẶN sai nghĩa.
  if (trimmed.startsWith('@@') || /#[@?$%]#/.test(trimmed)) {
    return null;
  }

  // 1. Cosmetic Element Hiding Rule: domain##selector or ##selector
  const cosmeticIdx = trimmed.indexOf('##');
  if (cosmeticIdx !== -1) {
    const domainsPart = trimmed.slice(0, cosmeticIdx);
    const selector = trimmed.slice(cosmeticIdx + 2); // giữ nguyên selector chứa '##'
    if (!selector) return null;

    let domains: string[] | undefined;
    let excludedDomains: string[] | undefined;

    if (domainsPart) {
      const parsedDomains = domainsPart.split(',').map((d) => d.trim());
      domains = parsedDomains.filter((d) => !d.startsWith('~'));
      excludedDomains = parsedDomains
        .filter((d) => d.startsWith('~'))
        .map((d) => d.substring(1));
    }

    const cosmeticRule: CosmeticRule = {
      id: `cosm_${index}`,
      type: 'cosmetic',
      action: 'hide',
      pattern: trimmed,
      selector,
      domains: domains && domains.length > 0 ? domains : undefined,
      excludedDomains: excludedDomains && excludedDomains.length > 0 ? excludedDomains : undefined,
      enabled: true,
      version: '1.0',
    };
    return cosmeticRule;
  }

  // 2. Network Rule: ||domain^$script or pattern
  let pattern = trimmed;
  let resourceTypes: Array<'script' | 'image' | 'stylesheet' | 'xmlhttprequest' | 'sub_frame' | 'media' | 'other'> | undefined;

  const dollarIdx = trimmed.lastIndexOf('$');
  if (dollarIdx > 0) {
    // Chỉ tách options ở dấu '$' CUỐI, để pattern chứa '$' không bị cắt cụt
    const basePattern = trimmed.slice(0, dollarIdx);
    const optionsPart = trimmed.slice(dollarIdx + 1);
    pattern = basePattern;
    if (optionsPart) {
      const opts = optionsPart.split(',');
      const validTypes: typeof resourceTypes = [];
      for (const opt of opts) {
        if (['script', 'image', 'stylesheet', 'xmlhttprequest', 'sub_frame', 'media'].includes(opt)) {
          validTypes.push(opt as any);
        }
      }
      if (validTypes.length > 0) {
        resourceTypes = validTypes;
      }
    }
  }

  const networkRule: NetworkRule = {
    id: `net_${index}`,
    type: 'network',
    action: 'block',
    pattern,
    resourceTypes,
    enabled: true,
    version: '1.0',
  };

  return networkRule;
}

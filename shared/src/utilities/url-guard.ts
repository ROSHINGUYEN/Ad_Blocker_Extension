/**
 * URL / hostname guard dùng chung cho background, content script và các engine.
 *
 * Nguyên tắc: so khớp trên HOSTNAME theo ranh giới nhãn (label), không so khớp chuỗi con
 * trên toàn bộ URL. Cách cũ (`url.includes('sex')`, `href.includes('jav')`...) gây
 * false-positive hàng loạt (essex.ac.uk, javascript:, utm_campaign...).
 */

/** Nhãn domain cờ bạc / game bài hay gặp. Khớp `gemwin`, `gemwin88`, `gemwin-88`, `vsbet`, `sun88`, `zo88` nhưng KHÔNG khớp `sunwind` hay `logo88`. */
export const GAMBLING_LABELS: readonly string[] = [
  'gemwin', 'haywin', 'uk88', 'hitclub', 'win79', 'sunwin', 'yo88', 'rikvip',
  'go88', 'bet88', 'tic88', 'zowin', 'zo88', 'cacuoc', 'gamebai', 'nhacai', 'vsbet', 'sun88', 'sun', 'f8bet', 'jun88', 'new88', 'shbet', 'hi88', '789bet', 'okvip', 'kubet', 'thabet',
];

/** Nhãn domain người lớn / 18+. */
export const ADULT_LABELS: readonly string[] = [
  'pornhub', 'xvideos', 'xnxx', 'vlxx', 'phimsex', 'hentai', 'sextop1', 'sex', 'javhd', 'jav',
  'lauxanh', 'thichxemsex', 'clipsex', 'phimxxx', 'xxx', 'chaturbate', 'onlyfans', 'stripchat', 'xhamster', 'redtube',
];

/** Domain mạng quảng cáo pop-under (khớp domain + mọi subdomain). */
export const AD_NETWORK_DOMAINS: readonly string[] = [
  'popads.net', 'clickadu.com', 'adsterra.com', 'propellerads.com', '6789x.site',
];

const LABEL_SUFFIX = '[0-9-]*'; // cho phép gemwin88, gemwin-88, ...

function buildLabelRegex(labels: readonly string[]): RegExp {
  return new RegExp(`^(?:${labels.join('|')})${LABEL_SUFFIX}$`);
}

const GAMBLING_RE = buildLabelRegex(GAMBLING_LABELS);
const ADULT_RE = buildLabelRegex(ADULT_LABELS);

/** true nếu `host` bằng `domain` hoặc là subdomain của `domain` (có kiểm tra ranh giới dấu chấm). */
export function isSameOrSubdomain(host: string, domain: string): boolean {
  const h = host.toLowerCase();
  const d = domain.toLowerCase();
  return h === d || h.endsWith('.' + d);
}

/** true nếu hai host cùng site (một bên là subdomain của bên kia). Không dùng `endsWith` trần. */
export function isSameSite(hostA: string, hostB: string): boolean {
  return isSameOrSubdomain(hostA, hostB) || isSameOrSubdomain(hostB, hostA);
}

export type BlockedCategory = 'gambling' | 'adult' | 'ad-network';

/** Phân loại hostname; trả về null nếu hostname không nằm trong danh sách chặn. */
export function classifyBlockedHost(hostname: string): BlockedCategory | null {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (!host) return null;

  if (AD_NETWORK_DOMAINS.some((d) => isSameOrSubdomain(host, d))) return 'ad-network';

  // Bỏ nhãn cuối (TLD) rồi so khớp từng nhãn còn lại.
  const labels = host.split('.');
  const body = labels.length > 1 ? labels.slice(0, -1) : labels;
  for (const label of body) {
    if (GAMBLING_RE.test(label)) return 'gambling';
    if (ADULT_RE.test(label)) return 'adult';
  }
  return null;
}

/** Chuẩn hoá và kiểm tra một URL tuỳ ý. Chỉ http/https mới được xét. */
export function isBlockedUrl(rawUrl: string, base?: string): boolean {
  if (!rawUrl) return false;
  try {
    const u = new URL(rawUrl, base);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    return classifyBlockedHost(u.hostname) !== null;
  } catch {
    return false;
  }
}

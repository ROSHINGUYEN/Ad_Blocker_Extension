/**
 * Generates an RFC4122 v4-like unique identifier for detections.
 */
export function generateDetectionId(prefix = 'det'): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${randomPart}`;
}

/**
 * Normalizes URL and extracts cleanly host and pathname.
 */
export function parseCleanUrl(rawUrl: string): { hostname: string; pathname: string; isHttp: boolean } | null {
  try {
    const parsed = new URL(rawUrl);
    return {
      hostname: parsed.hostname.toLowerCase(),
      pathname: parsed.pathname,
      isHttp: parsed.protocol === 'http:' || parsed.protocol === 'https:',
    };
  } catch {
    return null;
  }
}

/**
 * Debounce utility with immediate cancellation capability.
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  waitMs: number
): { (...args: Parameters<T>): void; cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, waitMs);
  };

  debounced.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
}

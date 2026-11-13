import { debounce } from '@shiori/shared';

export interface DynamicObserverOptions {
  debounceMs?: number;
  onNewElements: (nodes: HTMLElement[]) => void;
}

/**
 * High-performance, debounced MutationObserver wrapper.
 * Processes batched mutations without blocking the browser main thread.
 */
export class SafeDOMObserver {
  private observer: MutationObserver | null = null;
  private debouncedProcess: ReturnType<typeof debounce>;
  private pendingNodes: Set<HTMLElement> = new Set();
  private isObserving = false;

  constructor(private options: DynamicObserverOptions) {
    const delay = options.debounceMs ?? 50;
    this.debouncedProcess = debounce(() => this.flush(), delay);
  }

  private maxWaitTimer: ReturnType<typeof setTimeout> | null = null;

  private flush(): void {
    if (this.pendingNodes.size === 0) return;
    // Bỏ node con nếu tổ tiên của nó cũng đang chờ -> tránh quét lặp cùng một cây (O(n²))
    const all = Array.from(this.pendingNodes).filter((n) => n.isConnected);
    this.pendingNodes.clear();
    const batch = all.filter((n) => !all.some((o) => o !== n && o.contains(n)));
    if (batch.length) this.options.onNewElements(batch);
  }

  public start(root: Node = document.body): void {
    if (this.isObserving || !root) return;

    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (let i = 0; i < mutation.addedNodes.length; i++) {
            const node = mutation.addedNodes[i];
            if (node && node.nodeType === 1 /* Node.ELEMENT_NODE */) {
              this.pendingNodes.add(node as HTMLElement);
            }
          }
        }
      }
      this.debouncedProcess();
      // debounce thuần có thể bị "đói" nếu DOM thay đổi liên tục (ticker, animation): ép chạy tối đa mỗi 500ms
      if (this.maxWaitTimer === null) {
        this.maxWaitTimer = setTimeout(() => {
          this.maxWaitTimer = null;
          this.flush();
        }, 500);
      }
    });

    this.observer.observe(root, {
      childList: true,
      subtree: true,
    });
    this.isObserving = true;
  }

  public stop(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.debouncedProcess.cancel();
    if (this.maxWaitTimer !== null) {
      clearTimeout(this.maxWaitTimer);
      this.maxWaitTimer = null;
    }
    this.pendingNodes.clear();
    this.isObserving = false;
  }

  public isActive(): boolean {
    return this.isObserving;
  }
}

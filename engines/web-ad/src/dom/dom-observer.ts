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
    this.debouncedProcess = debounce(() => {
      if (this.pendingNodes.size === 0) return;
      const batch = Array.from(this.pendingNodes);
      this.pendingNodes.clear();
      this.options.onNewElements(batch);
    }, delay);
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
    this.pendingNodes.clear();
    this.isObserving = false;
  }

  public isActive(): boolean {
    return this.isObserving;
  }
}

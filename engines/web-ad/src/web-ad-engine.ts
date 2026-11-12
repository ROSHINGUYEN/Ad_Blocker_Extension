import { DetectionResult } from '@shiori/shared';
import { ShioriRuleEngine } from '@shiori/rules-engine';
import { IframeAdDetector } from './iframe/iframe-detector';
import { NativeAdDetector } from './native/native-detector';
import { DOMRestorationManager } from './dom/dom-restoration';
import { SafeDOMObserver } from './dom/dom-observer';

export interface WebAdEngineConfig {
  currentHostname: string;
  enableCosmeticStyles?: boolean;
  enableIframeScanning?: boolean;
  enableNativeAdScanning?: boolean;
}

export class ShioriWebAdEngine {
  private iframeDetector = new IframeAdDetector();
  private nativeDetector = new NativeAdDetector();
  public restorationManager = new DOMRestorationManager();
  private observer: SafeDOMObserver | null = null;

  constructor(
    private ruleEngine: ShioriRuleEngine,
    private config: WebAdEngineConfig
  ) {}

  /**
   * Scans a specific element or sub-tree for ads and hides them safely if detected.
   */
  public scanAndClean(rootElement: HTMLElement): DetectionResult[] {
    const detections: DetectionResult[] = [];

    // 1. Scan Iframes
    if (this.config.enableIframeScanning !== false) {
      const iframes = rootElement.querySelectorAll('iframe');
      iframes.forEach((iframe) => {
        const result = this.iframeDetector.analyzeIframe(iframe, {
          currentHostname: this.config.currentHostname,
        });
        if (result && (result.recommendedAction === 'HIDE' || result.recommendedAction === 'BLOCK')) {
          this.restorationManager.hideElement(iframe, result.evidence.reasons.join(', '));
          detections.push(result);
        }
      });
    }

    // 2. Scan Native / Sponsored Widgets
    if (this.config.enableNativeAdScanning !== false) {
      const candidates = rootElement.querySelectorAll<HTMLElement>(
        '[class*="sponsor"], [class*="advert"], [id*="sponsor"], [id*="advert"], [class*="taboola"], [class*="outbrain"]'
      );
      candidates.forEach((el) => {
        const result = this.nativeDetector.analyzeElement(el);
        if (result && result.recommendedAction === 'HIDE') {
          this.restorationManager.hideElement(el, result.evidence.reasons.join(', '));
          detections.push(result);
        }
      });
    }

    return detections;
  }

  /**
   * Generates injected cosmetic CSS for the active website.
   */
  public getCosmeticStyleSheet(): string {
    if (this.config.enableCosmeticStyles === false) return '';
    return this.ruleEngine.getInjectedCssForHost(this.config.currentHostname);
  }

  /**
   * Starts real-time DOM mutation monitoring with batch debouncing.
   */
  public startLiveMonitoring(root: HTMLElement): void {
    if (this.observer) return;

    this.observer = new SafeDOMObserver({
      debounceMs: 60,
      onNewElements: (nodes) => {
        for (const node of nodes) {
          this.scanAndClean(node);
        }
      },
    });

    this.observer.start(root);
  }

  public stopLiveMonitoring(): void {
    if (this.observer) {
      this.observer.stop();
      this.observer = null;
    }
  }

  public restoreAllHiddenElements(): number {
    return this.restorationManager.restoreAll();
  }
}

import { NetworkIntelligence } from './network/network-intelligence';
import { DOMIntelligence } from './dom/dom-intelligence';
import { BehaviorIntelligence } from './behavior/behavior-intelligence';
import { MediaIntelligence } from './media/media-intelligence';
import { DecisionEngine } from './decision/decision-engine';
import { DetectionResult } from '@shiori/shared';

export class ShioriIntelligenceEngine {
  public network = new NetworkIntelligence();
  public dom = new DOMIntelligence();
  public behavior = new BehaviorIntelligence();
  public media = new MediaIntelligence();
  public decision = new DecisionEngine();

  /**
   * Correlates full context for a given DOM element and associated network URL.
   */
  public evaluateContext(
    targetId: string,
    element: HTMLElement | null,
    url: string | null,
    currentHost: string,
    options?: { isWhitelisted?: boolean }
  ): DetectionResult {
    const signals = [];

    if (url) {
      signals.push(...this.network.analyzeUrl(url, currentHost));
    }

    if (element) {
      signals.push(...this.dom.analyzeElement(element));
    }

    return this.decision.arbitrate(targetId, signals, options);
  }
}

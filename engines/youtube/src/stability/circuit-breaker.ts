export interface CircuitBreakerState {
  status: 'CLOSED' | 'HALF_OPEN' | 'OPEN';
  consecutiveErrors: number;
  lastErrorTimestamp: number;
  totalErrorsTriggered: number;
}

/**
 * YouTube Player Stability Circuit Breaker.
 * If player reports playback errors (MEDIA_ERR_DECODE, MEDIA_ERR_NETWORK, etc.) or abnormal stalls,
 * the circuit breaker trips OPEN to immediately cease all ad interventions and fallback to native ALLOW mode.
 */
export class PlayerStabilityCircuitBreaker {
  private state: CircuitBreakerState = {
    status: 'CLOSED', // CLOSED = Normal operation (interventions enabled)
    consecutiveErrors: 0,
    lastErrorTimestamp: 0,
    totalErrorsTriggered: 0,
  };

  private readonly errorThreshold = 2; // Trip to OPEN after 2 consecutive errors
  private readonly cooldownPeriodMs = 30000; // 30s cooldown before trying HALF_OPEN

  public recordError(reason: string): void {
    const now = Date.now();
    this.state.consecutiveErrors++;
    this.state.lastErrorTimestamp = now;
    this.state.totalErrorsTriggered++;

    if (this.state.consecutiveErrors >= this.errorThreshold) {
      this.state.status = 'OPEN';
      console.warn(`[Shiori YT CircuitBreaker] TRIPPED OPEN due to: ${reason}. Fallback to ALLOW active.`);
    }
  }

  public recordSuccess(): void {
    if (this.state.status === 'HALF_OPEN') {
      this.state.status = 'CLOSED';
      this.state.consecutiveErrors = 0;
    } else if (this.state.status === 'CLOSED') {
      this.state.consecutiveErrors = 0;
    }
  }

  /**
   * Evaluates if filtering/interventions are permitted or if safety fallback is required.
   */
  public canIntervene(): boolean {
    if (this.state.status === 'CLOSED') {
      return true;
    }

    const now = Date.now();
    if (this.state.status === 'OPEN') {
      if (now - this.state.lastErrorTimestamp > this.cooldownPeriodMs) {
        this.state.status = 'HALF_OPEN';
        return true; // Trial intervention
      }
      return false; // Suppress intervention, prioritize video stability!
    }

    return true;
  }

  public getState(): Readonly<CircuitBreakerState> {
    return { ...this.state };
  }

  public reset(): void {
    this.state = {
      status: 'CLOSED',
      consecutiveErrors: 0,
      lastErrorTimestamp: 0,
      totalErrorsTriggered: 0,
    };
  }
}

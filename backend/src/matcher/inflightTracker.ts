export interface InFlightPair {
  buyOrderId: string;
  sellOrderId: string;
  requestId: string;
  submittedAt: number; // Date.now()
}

export class InFlightTracker {
  private inFlight = new Map<string, InFlightPair>();

  private getPairKey(buyOrderId: string, sellOrderId: string): string {
    return `${buyOrderId}-${sellOrderId}`;
  }

  public add(pair: InFlightPair): void {
    const key = this.getPairKey(pair.buyOrderId, pair.sellOrderId);
    if (!this.inFlight.has(key)) {
      this.inFlight.set(key, pair);
    }
  }

  public has(buyOrderId: string, sellOrderId: string): boolean {
    const key = this.getPairKey(buyOrderId, sellOrderId);
    return this.inFlight.has(key);
  }

  public remove(buyOrderId: string, sellOrderId: string): void {
    const key = this.getPairKey(buyOrderId, sellOrderId);
    this.inFlight.delete(key);
  }

  public removeExpired(timeoutMs: number): void {
    const now = Date.now();
    for (const [key, pair] of this.inFlight.entries()) {
      if (now - pair.submittedAt > timeoutMs) {
        this.inFlight.delete(key);
      }
    }
  }

  public getInFlightCount(): number {
    return this.inFlight.size;
  }
}

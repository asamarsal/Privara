import { IFccAdapter, MatchPairRequest, MatchPairResult } from "./types";
import { logger } from "../logger";
import { getConfig } from "../config";

export class FccAdapter implements IFccAdapter {
  private apiUrl: string;

  constructor() {
    this.apiUrl = getConfig().FCC_API_URL;
  }

  public async submitMatchPair(request: MatchPairRequest): Promise<string> {
    logger.info("Submitting match pair to FCC", { apiUrl: this.apiUrl });
    const res = await fetch(`${this.apiUrl}/match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!res.ok) {
      throw new Error(`FCC API error: ${res.statusText}`);
    }

    const data = await res.json();
    return data.requestId;
  }

  public async pollResult(requestId: string): Promise<MatchPairResult | null> {
    const res = await fetch(`${this.apiUrl}/match/${requestId}`, {
      method: "GET",
    });

    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      throw new Error(`FCC API error: ${res.statusText}`);
    }

    const data = await res.json();
    return data as MatchPairResult;
  }
}

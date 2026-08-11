import { MatchPairResultWireSchema } from "@privara/shared";
import { IFccAdapter, MatchPairRequest, MatchPairResult } from "./types";
import { logger } from "../logger";
import { getConfig } from "../config";

export class FccAdapter implements IFccAdapter {
  public readonly mode = "remote" as const;
  private readonly apiUrl = getConfig().FCC_API_URL;

  public async getSignerAddress(): Promise<null> { return null; }

  private async request(url: string, init?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try { return await fetch(url, { ...init, signal: controller.signal }); }
    finally { clearTimeout(timeout); }
  }

  public async submitMatchPair(request: MatchPairRequest): Promise<string> {
    logger.info("Submitting remote FCC request");
    const response = await this.request(`${this.apiUrl}/match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error(`FCC submit failed with HTTP ${response.status}`);
    const data: unknown = await response.json();
    if (!data || typeof data !== "object" || !("requestId" in data) || typeof data.requestId !== "string") throw new Error("FCC returned an invalid request ID");
    return data.requestId;
  }

  public async pollResult(requestId: string): Promise<MatchPairResult | null> {
    const response = await this.request(`${this.apiUrl}/match/${encodeURIComponent(requestId)}`);
    if (response.status === 202) return null;
    if (!response.ok) throw new Error(`FCC poll failed with HTTP ${response.status}`);
    return MatchPairResultWireSchema.parse(await response.json());
  }
}

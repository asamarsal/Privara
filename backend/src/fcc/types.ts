export interface MatchPairRequest {
  buyOrderCiphertext: string;
  sellOrderCiphertext: string;
  chainId: number;
  vaultAddress: string;
}

export interface MatchPairResult {
  status: "COMPATIBLE" | "INCOMPATIBLE";
  matchId?: string;
  buyOrderId?: string;
  sellOrderId?: string;
  executionPrice?: bigint;
  fxrpAmount?: bigint;
  quoteAmount?: bigint;
  expiry?: number;
  chainId?: number;
  vaultAddress?: string;
  signature?: string;
}

export interface IFccAdapter {
  submitMatchPair(request: MatchPairRequest): Promise<string>;
  pollResult(requestId: string): Promise<MatchPairResult | null>;
}

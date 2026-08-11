import { MatchPairResultWire } from "@privara/shared";

export interface MatchPairRequest {
  buyOrderPayload: string;
  sellOrderPayload: string;
  buyCommitment: string;
  sellCommitment: string;
  chainId: number;
  vaultAddress: string;
}

export type MatchPairResult = MatchPairResultWire;

export interface IFccAdapter {
  readonly mode: "local_mock" | "remote";
  getSignerAddress(): Promise<string | null>;
  submitMatchPair(request: MatchPairRequest): Promise<string>;
  pollResult(requestId: string): Promise<MatchPairResult | null>;
}

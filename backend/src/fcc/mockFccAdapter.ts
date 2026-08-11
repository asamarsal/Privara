import { ethers } from "ethers";
import {
  MatchPairResultWireSchema,
  MatchResult,
  OrderSide,
  computeMatchId,
  hashMatchResult,
  midpointPrice,
  orderFromWire,
  calculateQuoteAmount,
  computeOrderCommitment,
  basisPointDeviation,
  OrderType,
} from "@privara/shared";
import { IFccAdapter, MatchPairRequest, MatchPairResult } from "./types";
import { PriceReader } from "../oracle/ftsoPriceReader";
import { logger } from "../logger";
import { getConfig } from "../config";

/** Local-only signer adapter. It sees plaintext order payloads and is not a TEE. */
export class MockFccAdapter implements IFccAdapter {
  public readonly mode = "local_mock" as const;
  private readonly requests = new Map<string, MatchPairRequest>();
  private readonly signer: ethers.Wallet;

  constructor(
    privateKey = getConfig().FCC_MODE === "local_mock" ? getConfig().MOCK_FCC_SIGNER_PRIVATE_KEY : undefined,
    private readonly priceReader?: PriceReader,
    private readonly minSettlementWindowSeconds = getConfig().MIN_SETTLEMENT_WINDOW_SECONDS,
    private readonly oracleMaxAgeSeconds = getConfig().ORACLE_MAX_AGE_SECONDS,
  ) {
    if (!privateKey) throw new Error("MOCK_FCC_SIGNER_PRIVATE_KEY is required for the local mock FCC adapter");
    this.signer = new ethers.Wallet(privateKey);
  }

  public async getSignerAddress(): Promise<string> {
    return this.signer.address;
  }

  public async submitMatchPair(request: MatchPairRequest): Promise<string> {
    const requestId = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "uint256", "address", "bytes32", "bytes32"],
      [ethers.id("PRIVARA_MATCH_REQUEST_V2"), request.chainId, request.vaultAddress, request.buyCommitment, request.sellCommitment]
    ));
    const existing = this.requests.get(requestId);
    if (existing && JSON.stringify(existing) !== JSON.stringify(request)) throw new Error("FCC request id collision");
    this.requests.set(requestId, request);
    logger.debug("Mock FCC request accepted", { requestId });
    return requestId;
  }

  public async pollResult(requestId: string): Promise<MatchPairResult | null> {
    const request = this.requests.get(requestId);
    if (!request) throw new Error(`Unknown FCC request ${requestId}`);

    const buy = orderFromWire(JSON.parse(request.buyOrderPayload));
    const sell = orderFromWire(JSON.parse(request.sellOrderPayload));
    if (buy.side !== OrderSide.buy || sell.side !== OrderSide.sell) throw new Error("Invalid order side");
    if (buy.chainId !== request.chainId || sell.chainId !== request.chainId) throw new Error("Order chain mismatch");
    if (buy.vaultAddress.toLowerCase() !== request.vaultAddress.toLowerCase() || sell.vaultAddress.toLowerCase() !== request.vaultAddress.toLowerCase()) throw new Error("Order vault mismatch");
    if (buy.tokenIn.toLowerCase() !== sell.tokenOut.toLowerCase() || buy.tokenOut.toLowerCase() !== sell.tokenIn.toLowerCase()) throw new Error("Token pair mismatch");
    if (computeOrderCommitment(buy).toLowerCase() !== request.buyCommitment.toLowerCase() || computeOrderCommitment(sell).toLowerCase() !== request.sellCommitment.toLowerCase()) throw new Error("Order commitment mismatch");
    const now = Math.floor(Date.now() / 1000);
    if (buy.expiry <= now || sell.expiry <= now) return { status: "INCOMPATIBLE", reason: "Order expired" };
    if (buy.expiry < now + this.minSettlementWindowSeconds || sell.expiry < now + this.minSettlementWindowSeconds) {
      return { status: "INCOMPATIBLE", reason: "Insufficient settlement window" };
    }
    if (buy.limitPrice < sell.limitPrice) return { status: "INCOMPATIBLE", reason: "Limit prices do not overlap" };
    if (!this.priceReader) throw new Error("Oracle reader is required for local mock matching");
    const oracle = await this.priceReader.readPrice();
    if (oracle.price <= 0n) throw new Error("Oracle price must be nonzero");
    if (!Number.isSafeInteger(oracle.timestamp) || oracle.timestamp <= 0) throw new Error("Oracle timestamp is invalid");
    if (oracle.timestamp > now) throw new Error("Oracle timestamp is in the future");
    if (now - oracle.timestamp > this.oracleMaxAgeSeconds) throw new Error("Oracle price is stale");
    const oraclePrice = oracle.price;

    // A dormant stop remains pollable and is never classified as terminally incompatible.
    if (Number(buy.orderType) === OrderType.stop && oraclePrice < buy.stopPrice) return null;
    if (Number(sell.orderType) === OrderType.stop && oraclePrice > sell.stopPrice) return null;

    // Every type, including market collars, uses its committed limit. Midpoint therefore
    // cannot violate either participant's bound.
    const executionPrice = midpointPrice(sell.limitPrice, buy.limitPrice);
    if (executionPrice < sell.limitPrice || executionPrice > buy.limitPrice) {
      return { status: "INCOMPATIBLE", reason: "Execution violates committed limits" };
    }
    if (basisPointDeviation(oraclePrice, executionPrice) > 200n) {
      return { status: "INCOMPATIBLE", reason: "Execution deviates from oracle by more than 200 bps" };
    }
    const fxrpAmount = sell.amountIn; // exact sell; this matcher does not create partial fills
    const quoteAmount = calculateQuoteAmount(fxrpAmount, executionPrice, 18);
    if (quoteAmount <= 0n || quoteAmount > buy.amountIn) return { status: "INCOMPATIBLE", reason: "Buyer quote budget is insufficient" };
    const expiry = Math.min(buy.expiry, sell.expiry, now + 300);
    if (expiry < now + this.minSettlementWindowSeconds) return { status: "INCOMPATIBLE", reason: "Insufficient settlement window" };
    const withoutId = {
      buyOrderId: buy.orderId,
      sellOrderId: sell.orderId,
      buyCommitment: request.buyCommitment,
      sellCommitment: request.sellCommitment,
      executionPrice,
      fxrpAmount,
      quoteAmount,
      expiry,
      chainId: request.chainId,
      vaultAddress: request.vaultAddress,
    };
    const result: MatchResult = { matchId: computeMatchId(withoutId), ...withoutId };
    const signature = await this.signer.signMessage(ethers.getBytes(hashMatchResult(result)));

    return MatchPairResultWireSchema.parse({
      status: "COMPATIBLE",
      ...result,
      executionPrice: executionPrice.toString(),
      fxrpAmount: fxrpAmount.toString(),
      quoteAmount: quoteAmount.toString(),
      signature,
    });
  }
}

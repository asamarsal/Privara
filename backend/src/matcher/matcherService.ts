import { ethers } from "ethers";
import { Indexer } from "../indexer/indexer";
import { InFlightTracker } from "./inflightTracker";
import { IFccAdapter, MatchPairResult } from "../fcc/types";
import { selectCandidatePair } from "./candidateSelector";
import { OrderPayloadRegistry } from "./orderPayloadRegistry";
import { logger } from "../logger";
import { getConfig } from "../config";
import { computeOrderCommitment, OrderSide, OrderType } from "@privara/shared";
import { OpenOrder } from "../indexer/indexer";

const VaultABI = [
  "function settle(tuple(bytes32 matchId,bytes32 buyOrderId,bytes32 sellOrderId,uint256 executionPrice,uint256 fxrpAmount,uint256 quoteAmount,uint64 matchExpiry,bytes signature) params) external",
  "function isMatchSettled(bytes32) view returns (bool)",
  "function authorizedVerifier() view returns (address)",
  "function verifier() view returns (address)",
  "function FXRP() view returns (address)",
  "function USDT0() view returns (address)",
];

export class MatcherService {
  private readonly tracker = new InFlightTracker();
  private readonly contract: ethers.Contract;
  private readonly terminalPairs = new Set<string>();
  private isRunning = false;

  constructor(
    private readonly indexer: Indexer,
    private readonly payloads: OrderPayloadRegistry,
    private readonly fccAdapter: IFccAdapter,
    wallet: ethers.Wallet,
    vaultAddress: string
  ) {
    this.contract = new ethers.Contract(vaultAddress, VaultABI, wallet);
  }

  public async validateConfiguration(): Promise<void> {
    const adapterSigner = await this.fccAdapter.getSignerAddress();
    if (this.fccAdapter.mode === "local_mock") {
      const authorized = await this.contract.authorizedVerifier();
      if (!adapterSigner || authorized.toLowerCase() !== adapterSigner.toLowerCase()) throw new Error(`Mock FCC signer mismatch: vault authorizes ${authorized}, adapter uses ${adapterSigner}`);
    }
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;
    await this.validateConfiguration();
    this.isRunning = true;
    this.indexer.subscribeToNewEvents();
    void this.mainLoop();
  }

  public stop(): void { this.isRunning = false; }

  private pairKey(buy: string, sell: string) { return `${buy.toLowerCase()}:${sell.toLowerCase()}`; }

  private payloadMatchesChain(orderId: string, onChain: OpenOrder): boolean {
    const order = this.payloads.getOrder(orderId);
    if (!order) return false;
    const expectedSide = onChain.side === 0 ? OrderSide.buy : OrderSide.sell;
    return order.orderId.toLowerCase() === onChain.orderId.toLowerCase()
      && order.maker.toLowerCase() === onChain.maker.toLowerCase()
      && order.side === expectedSide
      && order.tokenIn.toLowerCase() === onChain.tokenIn.toLowerCase()
      && order.amountIn === onChain.amountIn
      && order.expiry === onChain.expiry
      && computeOrderCommitment(order).toLowerCase() === onChain.encryptedCommitment.toLowerCase();
  }

  private async mainLoop(): Promise<void> {
    const config = getConfig();
    while (this.isRunning) {
      try { await this.processCandidates(); }
      catch (error) { logger.error("Matcher loop failed", { error: (error as Error).message }); }
      await new Promise(resolve => setTimeout(resolve, config.POLL_INTERVAL_MS));
    }
  }

  public async processCandidates(): Promise<void> {
    const pair = selectCandidatePair(this.indexer.getOrderBook(), this.terminalPairs, orderId => this.payloads.has(orderId));
    if (!pair) return;
    const key = this.pairKey(pair.buy.orderId, pair.sell.orderId);
    if (this.tracker.has(pair.buy.orderId, pair.sell.orderId)) return;
    const buyPayload = this.payloads.get(pair.buy.orderId);
    const sellPayload = this.payloads.get(pair.sell.orderId);
    if (!buyPayload || !sellPayload) return;
    if (!this.payloadMatchesChain(pair.buy.orderId, pair.buy) || !this.payloadMatchesChain(pair.sell.orderId, pair.sell)) {
      logger.warn("Ignoring payload that does not reconcile with its on-chain order", { buyId: pair.buy.orderId, sellId: pair.sell.orderId });
      this.terminalPairs.add(key);
      return;
    }
    if (this.fccAdapter.mode === "remote") {
      const buyOrder = this.payloads.getOrder(pair.buy.orderId)!;
      const sellOrder = this.payloads.getOrder(pair.sell.orderId)!;
      if (buyOrder.orderType !== OrderType.limit || sellOrder.orderType !== OrderType.limit) {
        // Remote FCC has not attested Market/Stop semantics yet: fail closed.
        this.terminalPairs.add(key);
        logger.warn("Remote FCC does not support Market/Stop orders", { buyId: pair.buy.orderId, sellId: pair.sell.orderId });
        return;
      }
    }

    const network = await this.contract.runner!.provider!.getNetwork();
    const vaultAddress = await this.contract.getAddress();
    const requestId = await this.fccAdapter.submitMatchPair({
      buyOrderPayload: buyPayload,
      sellOrderPayload: sellPayload,
      buyCommitment: pair.buy.encryptedCommitment,
      sellCommitment: pair.sell.encryptedCommitment,
      chainId: Number(network.chainId),
      vaultAddress,
    });
    this.tracker.add({ buyOrderId: pair.buy.orderId, sellOrderId: pair.sell.orderId, requestId, submittedAt: Date.now() });
    void this.pollAndSettle(requestId, pair.buy.orderId, pair.sell.orderId, key);
  }

  private async pollAndSettle(requestId: string, buyId: string, sellId: string, key: string): Promise<void> {
    const config = getConfig();
    const deadline = Date.now() + config.POLL_TIMEOUT_MS;
    try {
      while (this.isRunning && Date.now() < deadline) {
        const result = await this.fccAdapter.pollResult(requestId);
        if (!result) { await new Promise(resolve => setTimeout(resolve, config.POLL_INTERVAL_MS)); continue; }
        if (result.status === "INCOMPATIBLE") {
          this.terminalPairs.add(key);
          logger.info("Pair incompatible", { buyId, sellId, reason: result.reason });
          return;
        }
        await this.submitSettlement(result);
        return;
      }
      logger.warn("FCC poll timeout", { requestId });
    } catch (error) {
      logger.error("FCC/settlement job failed", { requestId, error: (error as Error).message });
    } finally {
      this.tracker.remove(buyId, sellId);
    }
  }

  private async submitSettlement(result: Extract<MatchPairResult, { status: "COMPATIBLE" }>): Promise<void> {
    if (await this.contract.isMatchSettled(result.matchId)) return;
    const tx = await this.contract.settle({
      matchId: result.matchId,
      buyOrderId: result.buyOrderId,
      sellOrderId: result.sellOrderId,
      executionPrice: BigInt(result.executionPrice),
      fxrpAmount: BigInt(result.fxrpAmount),
      quoteAmount: BigInt(result.quoteAmount),
      matchExpiry: result.expiry,
      signature: result.signature,
    });
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) throw new Error(`Settlement ${tx.hash} reverted`);
    logger.info("Settlement confirmed", { hash: tx.hash, blockNumber: receipt.blockNumber });
  }
}

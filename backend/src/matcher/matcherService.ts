import { ethers } from "ethers";
import { Indexer } from "../indexer/indexer";
import { InFlightTracker } from "./inflightTracker";
import { IFccAdapter } from "../fcc/types";
import { selectCandidatePair } from "./candidateSelector";
import { logger } from "../logger";
import { getConfig } from "../config";

const PrivaraVaultABI = [
  "function settle(tuple(bytes32 matchId, bytes32 buyOrderId, bytes32 sellOrderId, uint256 executionPrice, uint256 fxrpAmount, uint256 quoteAmount, uint64 expiry, uint256 chainId, address vaultAddress) result, bytes calldata fccProofOrSignature) external",
  "function usedMatches(bytes32) view returns (bool)"
];

export class MatcherService {
  private indexer: Indexer;
  private tracker: InFlightTracker;
  private fccAdapter: IFccAdapter;
  private contract: ethers.Contract;
  private isRunning: boolean = false;
  private wallet: ethers.Wallet;

  constructor(
    provider: ethers.Provider,
    indexer: Indexer,
    fccAdapter: IFccAdapter,
    wallet: ethers.Wallet,
    vaultAddress: string
  ) {
    this.indexer = indexer;
    this.tracker = new InFlightTracker();
    this.fccAdapter = fccAdapter;
    this.wallet = wallet;
    this.contract = new ethers.Contract(vaultAddress, PrivaraVaultABI, this.wallet);
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    
    // Subscribe to new events
    this.indexer.subscribeToNewEvents();

    // Start loops
    this.mainLoop();
  }

  public stop(): void {
    this.isRunning = false;
  }

  private async mainLoop(): Promise<void> {
    const config = getConfig();
    
    while (this.isRunning) {
      try {
        await this.processCandidates();
      } catch (err) {
        logger.error("Error in matcher loop", { error: (err as Error).message });
      }

      await new Promise((resolve) => setTimeout(resolve, config.POLL_INTERVAL_MS));
    }
  }

  private async processCandidates(): Promise<void> {
    const config = getConfig();
    const chainId = Number((await this.wallet.provider!.getNetwork()).chainId);
    const vaultAddress = await this.contract.getAddress();

    // 1. Clean up expired inflight tracking
    this.tracker.removeExpired(config.POLL_TIMEOUT_MS);

    // 2. Select pair
    const orderBook = this.indexer.getOrderBook();
    const pair = selectCandidatePair(orderBook);

    if (!pair) {
      return;
    }

    if (this.tracker.has(pair.buy.orderId, pair.sell.orderId)) {
      // Already in flight
      return;
    }

    logger.info("Found candidate pair", { buy: pair.buy.orderId, sell: pair.sell.orderId });

    // 3. Submit to FCC
    try {
      const requestId = await this.fccAdapter.submitMatchPair({
        buyOrderCiphertext: pair.buy.encryptedCommitment,
        sellOrderCiphertext: pair.sell.encryptedCommitment,
        chainId,
        vaultAddress,
      });

      this.tracker.add({
        buyOrderId: pair.buy.orderId,
        sellOrderId: pair.sell.orderId,
        requestId,
        submittedAt: Date.now()
      });

      // Fire-and-forget the poll and settle flow
      this.pollAndSettle(requestId, pair.buy.orderId, pair.sell.orderId);

    } catch (err) {
      logger.error("Failed to submit to FCC", { error: (err as Error).message });
    }
  }

  private async pollAndSettle(requestId: string, buyOrderId: string, sellOrderId: string): Promise<void> {
    const config = getConfig();
    const maxAttempts = config.POLL_TIMEOUT_MS / config.POLL_INTERVAL_MS;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (!this.isRunning) break;

      try {
        const result = await this.fccAdapter.pollResult(requestId);

        if (result) {
          if (result.status === "COMPATIBLE") {
            await this.submitSettlement(result);
          } else {
            logger.info("Pair incompatible", { buyOrderId, sellOrderId });
          }

          // We got a result, clean up tracker
          this.tracker.remove(buyOrderId, sellOrderId);
          return;
        }

      } catch (err) {
        logger.error("Error polling FCC", { requestId, error: (err as Error).message });
      }

      await new Promise(res => setTimeout(res, config.POLL_INTERVAL_MS));
    }

    logger.warn("Poll timeout for request", { requestId });
    this.tracker.remove(buyOrderId, sellOrderId);
  }

  private async submitSettlement(result: any): Promise<void> {
    logger.info("Submitting settlement", { matchId: result.matchId });

    try {
      const used = await this.contract.usedMatches(result.matchId);
      if (used) {
        logger.info("Match already settled", { matchId: result.matchId });
        return;
      }

      const tx = await this.contract.settle(
        {
          matchId: result.matchId,
          buyOrderId: result.buyOrderId,
          sellOrderId: result.sellOrderId,
          executionPrice: result.executionPrice,
          fxrpAmount: result.fxrpAmount,
          quoteAmount: result.quoteAmount,
          expiry: result.expiry,
          chainId: result.chainId,
          vaultAddress: result.vaultAddress,
        },
        result.signature
      );

      logger.info("Settlement transaction sent", { hash: tx.hash });
      const receipt = await tx.wait();
      logger.info("Settlement transaction mined", { blockNumber: receipt.blockNumber, hash: tx.hash });

    } catch (err) {
      logger.error("Settlement failed", { error: (err as Error).message });
    }
  }
}

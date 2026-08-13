import { ethers } from "ethers";
import { logger } from "../logger";
import { getConfig } from "../config";

const PrivaraVaultABI = [
  "event OrderCommitted(bytes32 indexed orderId, address indexed maker, uint8 side, address tokenIn, uint256 amountIn, bytes32 encryptedCommitment, uint64 expiry)",
  "event OrderCancelled(bytes32 indexed orderId, address indexed maker)",
  "event OrderSettled(bytes32 indexed matchId, bytes32 indexed buyOrderId, bytes32 indexed sellOrderId, uint256 executionPrice, uint256 fxrpAmount, uint256 quoteAmount)",
];

export type OrderStatus = "active" | "cancelled" | "settled" | "expired";
export interface OpenOrder {
  orderId: string; maker: string; side: number; tokenIn: string; amountIn: bigint;
  encryptedCommitment: string; expiry: number; blockNumber: number; logIndex: number;
  txHash?: string; status?: OrderStatus;
}
export interface SettlementRecord {
  matchId: string; buyOrderId: string; sellOrderId: string; buyer: string; seller: string;
  executionPrice: bigint; fxrpAmount: bigint; quoteAmount: bigint;
  blockNumber: number; logIndex: number; txHash: string; timestamp: number;
}
export type OrderBook = Map<string, OpenOrder>;

export class Indexer {
  private readonly orders = new Map<string, OpenOrder>();
  private readonly settlements = new Map<string, SettlementRecord>();
  private readonly blockTimestamps = new Map<number, number>();
  private readonly provider: ethers.Provider;
  private readonly contract: ethers.Contract;
  private readonly fromBlock: number;
  private readonly pollIntervalMs: number;
  private lastPolledBlock = 0;
  private polling = false;
  private timer?: ReturnType<typeof setTimeout>;

  constructor(provider: ethers.Provider, vaultAddress: string, fromBlock: number, pollIntervalMs = getConfig().POLL_INTERVAL_MS) {
    this.provider = provider;
    this.contract = new ethers.Contract(vaultAddress, PrivaraVaultABI, provider);
    this.fromBlock = fromBlock;
    this.pollIntervalMs = pollIntervalMs;
  }

  /** Matcher-compatible active view. Expiry is evaluated at read time. */
  public getOrderBook(): OrderBook {
    const now = Math.floor(Date.now() / 1000);
    for (const order of this.orders.values()) {
      if (order.status === "active" && order.expiry <= now) order.status = "expired";
    }
    return new Map([...this.orders].filter(([, order]) => order.status === "active"));
  }
  public getOrders(): ReadonlyMap<string, OpenOrder> { return this.orders; }
  public getSettlements(): readonly SettlementRecord[] { return [...this.settlements.values()]; }
  public getFreshness() { return { lastIndexedBlock: this.lastPolledBlock, polling: this.polling }; }

  private async timestamp(blockNumber: number): Promise<number> {
    const cached = this.blockTimestamps.get(blockNumber);
    if (cached !== undefined) return cached;
    const block = await this.provider.getBlock(blockNumber);
    if (!block) throw new Error(`Block ${blockNumber} not found`);
    const value = Number(block.timestamp);
    this.blockTimestamps.set(blockNumber, value);
    return value;
  }

  private async applyEvent(event: ethers.EventLog): Promise<void> {
    if (event.eventName === "OrderCommitted") {
      const [orderId, maker, side, tokenIn, amountIn, encryptedCommitment, expiry] = event.args;
      this.orders.set(orderId, { orderId, maker, side: Number(side), tokenIn, amountIn: BigInt(amountIn), encryptedCommitment,
        expiry: Number(expiry), blockNumber: event.blockNumber, logIndex: event.index,
        txHash: event.transactionHash, status: Number(expiry) > Math.floor(Date.now() / 1000) ? "active" : "expired" });
    } else if (event.eventName === "OrderCancelled") {
      const order = this.orders.get(event.args[0]);
      if (order && order.status !== "settled") order.status = "cancelled";
    } else if (event.eventName === "OrderSettled") {
      const [matchId, buyOrderId, sellOrderId, executionPrice, fxrpAmount, quoteAmount] = event.args;
      const buy = this.orders.get(buyOrderId), sell = this.orders.get(sellOrderId);
      if (!buy || !sell) {
        logger.warn("Settlement references unknown order", { matchId, buyOrderId, sellOrderId });
        return;
      }
      buy.status = "settled"; sell.status = "settled";
      this.settlements.set(matchId, { matchId, buyOrderId, sellOrderId, buyer: buy.maker, seller: sell.maker,
        executionPrice: BigInt(executionPrice), fxrpAmount: BigInt(fxrpAmount), quoteAmount: BigInt(quoteAmount),
        blockNumber: event.blockNumber, logIndex: event.index, txHash: event.transactionHash,
        timestamp: await this.timestamp(event.blockNumber) });
    }
  }

  private async events(from: number, to: number): Promise<ethers.EventLog[]> {
    const [committed, cancelled, settled] = await Promise.all([
      this.contract.queryFilter(this.contract.filters.OrderCommitted(), from, to),
      this.contract.queryFilter(this.contract.filters.OrderCancelled(), from, to),
      this.contract.queryFilter(this.contract.filters.OrderSettled(), from, to),
    ]);
    return [...committed, ...cancelled, ...settled]
      .filter((event): event is ethers.EventLog => event instanceof ethers.EventLog)
      .sort((a, b) => a.blockNumber - b.blockNumber || a.index - b.index);
  }

  private async syncRange(from: number, to: number): Promise<void> {
    const CHUNK_SIZE = 30;
    const BATCH_SIZE = 35;
    let current = from;
    while (current <= to) {
      const batchPromises = [];
      const batchRanges = [];
      for (let i = 0; i < BATCH_SIZE && current <= to; i++) {
        const start = current;
        const end = Math.min(start + CHUNK_SIZE - 1, to);
        batchRanges.push({ start, end });
        batchPromises.push(this.events(start, end));
        current = end + 1;
      }
      const batchResults = await Promise.all(batchPromises);
      for (let i = 0; i < batchResults.length; i++) {
        for (const event of batchResults[i]) {
          await this.applyEvent(event);
        }
        this.lastPolledBlock = batchRanges[i].end;
      }
    }
  }

  public async replayEvents(): Promise<void> {
    this.orders.clear(); this.settlements.clear(); this.blockTimestamps.clear();
    const latest = await this.provider.getBlockNumber();
    this.lastPolledBlock = this.fromBlock - 1;
    if (this.fromBlock <= latest) await this.syncRange(this.fromBlock, latest);
    logger.info("Replay complete", { activeOrders: this.getOrderBook().size, retainedOrders: this.orders.size, settlements: this.settlements.size });
  }

  private schedule(): void {
    if (!this.timer) this.timer = setTimeout(() => { this.timer = undefined; void this.poll(); }, this.pollIntervalMs);
  }
  private async poll(): Promise<void> {
    if (this.polling) return;
    this.polling = true;
    try {
      const latest = await this.provider.getBlockNumber();
      if (latest > this.lastPolledBlock) await this.syncRange(this.lastPolledBlock + 1, latest);
    } catch (error) { logger.error("Error during event polling", { error: (error as Error).message }); }
    finally { this.polling = false; this.schedule(); }
  }
  public subscribeToNewEvents(): void { this.schedule(); }
  public stop(): void { if (this.timer) clearTimeout(this.timer); this.timer = undefined; }
}

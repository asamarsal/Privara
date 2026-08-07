import { ethers } from "ethers";
import { logger } from "../logger";
import { getConfig } from "../config";
// Assuming PrivaraVault ABI is available in shared or we can import it.
// For now, we will use a minimal ABI for the events and getOrder.
const PrivaraVaultABI = [
  "event OrderCommitted(bytes32 indexed orderId, address indexed maker, uint8 side, address tokenIn, uint256 amountIn, uint64 expiry)",
  "event OrderCancelled(bytes32 indexed orderId, address indexed maker)",
  "event OrderSettled(bytes32 indexed matchId, bytes32 indexed buyOrderId, bytes32 indexed sellOrderId, uint256 executionPrice, uint256 fxrpAmount, uint256 quoteAmount)",
  "function commitOrder(bytes32 orderId, uint8 side, address tokenIn, uint256 amountIn, bytes32 encryptedCommitment, uint64 expiry)"
];

export interface OpenOrder {
  orderId: string;
  maker: string;
  side: number; // 0 for Buy, 1 for Sell
  tokenIn: string;
  amountIn: bigint;
  encryptedCommitment: string;
  expiry: number;
  blockNumber: number;
  logIndex: number;
}

export type OrderBook = Map<string, OpenOrder>;

export class Indexer {
  private orderBook: OrderBook = new Map();
  private provider: ethers.Provider;
  private contract: ethers.Contract;
  private fromBlock: number;
  private lastPolledBlock: number = 0;

  constructor(provider: ethers.Provider, vaultAddress: string, fromBlock: number) {
    this.provider = provider;
    this.contract = new ethers.Contract(vaultAddress, PrivaraVaultABI, this.provider);
    this.fromBlock = fromBlock;
  }

  public getOrderBook(): OrderBook {
    return this.orderBook;
  }

  public async replayEvents(): Promise<void> {
    logger.info("Replaying events", { fromBlock: this.fromBlock });
    
    const filterCommitted = this.contract.filters.OrderCommitted();
    const filterCancelled = this.contract.filters.OrderCancelled();
    const filterSettled = this.contract.filters.OrderSettled();

    const latestBlock = await this.provider.getBlockNumber();
    this.lastPolledBlock = latestBlock;
    const CHUNK_SIZE = 30; // Coston2 limit is 30 blocks
    let allEvents: ethers.EventLog[] = [];
    
    // Process chunks concurrently to speed up but limit concurrency to avoid rate limits
    const CONCURRENCY_LIMIT = 5;
    let currentBlock = this.fromBlock;
    let processedBlocks = 0;
    const totalBlocks = latestBlock - this.fromBlock;

    while (currentBlock <= latestBlock) {
      const promises = [];
      for (let i = 0; i < CONCURRENCY_LIMIT && currentBlock <= latestBlock; i++) {
        let from = currentBlock;
        let to = from + CHUNK_SIZE - 1;
        if (to > latestBlock) to = latestBlock;
        
        promises.push(
          Promise.all([
            this.contract.queryFilter(filterCommitted, from, to),
            this.contract.queryFilter(filterCancelled, from, to),
            this.contract.queryFilter(filterSettled, from, to)
          ]).then(([committed, cancelled, settled]) => {
            return [...(committed as ethers.EventLog[]), ...(cancelled as ethers.EventLog[]), ...(settled as ethers.EventLog[])];
          })
        );
        currentBlock += CHUNK_SIZE;
      }

      const results = await Promise.all(promises);
      for (const batchEvents of results) {
        allEvents.push(...batchEvents);
      }
      
      processedBlocks += CHUNK_SIZE * promises.length;
      if (processedBlocks % (CHUNK_SIZE * CONCURRENCY_LIMIT * 10) === 0 || currentBlock > latestBlock) {
        const progress = Math.min(100, Math.round((processedBlocks / totalBlocks) * 100));
        logger.info(`Syncing events... ${progress}% (${currentBlock}/${latestBlock})`);
      }
    }

    // Sort by blockNumber, then logIndex
    allEvents.sort((a, b) => {
      if (a.blockNumber === b.blockNumber) {
        return a.index - b.index;
      }
      return a.blockNumber - b.blockNumber;
    });

    for (const event of allEvents) {
      if ('eventName' in event && event.eventName === 'OrderCommitted' && 'args' in event) {
        const [orderId, maker, side, tokenIn, amountIn, expiry] = (event as ethers.EventLog).args;
        
        // Since _orders is internal in the contract, we can't query it.
        // Instead, we parse the transaction that emitted the event to get the encryptedCommitment.
        let encryptedCommitment = "0x0000000000000000000000000000000000000000000000000000000000000000";
        try {
          const tx = await this.provider.getTransaction((event as ethers.EventLog).transactionHash);
          if (tx && tx.data) {
            const parsed = this.contract.interface.parseTransaction({ data: tx.data });
            if (parsed && parsed.name === "commitOrder") {
              encryptedCommitment = parsed.args[4]; // 5th argument is encryptedCommitment
            }
          }
        } catch (err) {
          logger.warn("Failed to fetch tx for OrderCommitted", { txHash: (event as ethers.EventLog).transactionHash });
        }
        
        this.orderBook.set(orderId, {
          orderId,
          maker,
          side: Number(side),
          tokenIn,
          amountIn: BigInt(amountIn),
          encryptedCommitment,
          expiry: Number(expiry),
          blockNumber: event.blockNumber,
          logIndex: event.index,
        });
      } else if ('eventName' in event && event.eventName === 'OrderCancelled' && 'args' in event) {
        const [orderId] = (event as ethers.EventLog).args;
        this.orderBook.delete(orderId);
      } else if ('eventName' in event && event.eventName === 'OrderSettled' && 'args' in event) {
        const [matchId, buyOrderId, sellOrderId] = (event as ethers.EventLog).args;
        this.orderBook.delete(buyOrderId);
        this.orderBook.delete(sellOrderId);
      }
    }
    
    logger.info("Replay complete", { orderBookSize: this.orderBook.size });
  }

  public subscribeToNewEvents(): void {
    logger.info("Subscribing to new events via manual polling");
    
    setInterval(async () => {
      try {
        const latestBlock = await this.provider.getBlockNumber();
        if (latestBlock <= this.lastPolledBlock) return;

        const from = this.lastPolledBlock + 1;
        const to = latestBlock;

        const filterCommitted = this.contract.filters.OrderCommitted();
        const filterCancelled = this.contract.filters.OrderCancelled();
        const filterSettled = this.contract.filters.OrderSettled();

        const [committed, cancelled, settled] = await Promise.all([
          this.contract.queryFilter(filterCommitted, from, to),
          this.contract.queryFilter(filterCancelled, from, to),
          this.contract.queryFilter(filterSettled, from, to)
        ]);

        const allEvents = [...(committed as ethers.EventLog[]), ...(cancelled as ethers.EventLog[]), ...(settled as ethers.EventLog[])];

        allEvents.sort((a, b) => {
          if (a.blockNumber === b.blockNumber) {
            return a.index - b.index;
          }
          return a.blockNumber - b.blockNumber;
        });

        for (const event of allEvents) {
          if ('eventName' in event && event.eventName === 'OrderCommitted' && 'args' in event) {
            const [orderId, maker, side, tokenIn, amountIn, expiry] = event.args;
            logger.info("New OrderCommitted", { orderId });
            
            let encryptedCommitment = "0x0000000000000000000000000000000000000000000000000000000000000000";
            try {
              const tx = await this.provider.getTransaction(event.transactionHash);
              if (tx && tx.data) {
                const parsed = this.contract.interface.parseTransaction({ data: tx.data });
                if (parsed && parsed.name === "commitOrder") {
                  encryptedCommitment = parsed.args[4];
                }
              }
            } catch (err) {
              logger.error("Failed to fetch tx for new event", { orderId, error: (err as Error).message });
            }

            this.orderBook.set(orderId, {
              orderId, maker, side: Number(side), tokenIn, amountIn: BigInt(amountIn),
              encryptedCommitment, expiry: Number(expiry),
              blockNumber: event.blockNumber, logIndex: event.index,
            });
          } else if ('eventName' in event && event.eventName === 'OrderCancelled' && 'args' in event) {
            const [orderId] = event.args;
            logger.info("OrderCancelled", { orderId });
            this.orderBook.delete(orderId);
          } else if ('eventName' in event && event.eventName === 'OrderSettled' && 'args' in event) {
            const [matchId, buyOrderId, sellOrderId] = event.args;
            logger.info("OrderSettled", { matchId, buyOrderId, sellOrderId });
            this.orderBook.delete(buyOrderId);
            this.orderBook.delete(sellOrderId);
          }
        }
        
        this.lastPolledBlock = latestBlock;
      } catch (err) {
        logger.error("Error during manual event polling", { error: (err as Error).message });
      }
    }, 5000);
  }
}

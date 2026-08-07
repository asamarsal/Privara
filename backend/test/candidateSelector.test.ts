import { describe, it, expect } from "vitest";
import { selectCandidatePair } from "../src/matcher/candidateSelector";
import { OrderBook, OpenOrder } from "../src/indexer/indexer";

describe("Candidate Selector", () => {
  it("should return null if there are no open buy orders", () => {
    const orderBook: OrderBook = new Map();
    orderBook.set("sell1", { orderId: "sell1", maker: "m1", side: 1, tokenIn: "t1", amountIn: 1n, encryptedCommitment: "0x1", expiry: Date.now() / 1000 + 3600, blockNumber: 1, logIndex: 1 });
    
    const result = selectCandidatePair(orderBook);
    expect(result).toBeNull();
  });

  it("should return null if there are no open sell orders", () => {
    const orderBook: OrderBook = new Map();
    orderBook.set("buy1", { orderId: "buy1", maker: "m1", side: 0, tokenIn: "t1", amountIn: 1n, encryptedCommitment: "0x1", expiry: Date.now() / 1000 + 3600, blockNumber: 1, logIndex: 1 });
    
    const result = selectCandidatePair(orderBook);
    expect(result).toBeNull();
  });

  it("should select the oldest buy and sell candidates", () => {
    const orderBook: OrderBook = new Map();
    const expiry = Date.now() / 1000 + 3600;

    orderBook.set("buy1", { orderId: "buy1", maker: "m1", side: 0, tokenIn: "t1", amountIn: 1n, encryptedCommitment: "0x1", expiry, blockNumber: 2, logIndex: 1 });
    orderBook.set("buy2", { orderId: "buy2", maker: "m1", side: 0, tokenIn: "t1", amountIn: 1n, encryptedCommitment: "0x2", expiry, blockNumber: 1, logIndex: 2 });
    
    orderBook.set("sell1", { orderId: "sell1", maker: "m1", side: 1, tokenIn: "t1", amountIn: 1n, encryptedCommitment: "0x3", expiry, blockNumber: 3, logIndex: 1 });
    orderBook.set("sell2", { orderId: "sell2", maker: "m1", side: 1, tokenIn: "t1", amountIn: 1n, encryptedCommitment: "0x4", expiry, blockNumber: 3, logIndex: 0 });

    const result = selectCandidatePair(orderBook);
    expect(result).not.toBeNull();
    expect(result!.buy.orderId).toBe("buy2");
    expect(result!.sell.orderId).toBe("sell2");
  });

  it("should ignore expired orders", () => {
    const orderBook: OrderBook = new Map();
    const pastExpiry = Date.now() / 1000 - 3600;
    const futureExpiry = Date.now() / 1000 + 3600;

    orderBook.set("buy1", { orderId: "buy1", maker: "m1", side: 0, tokenIn: "t1", amountIn: 1n, encryptedCommitment: "0x1", expiry: pastExpiry, blockNumber: 1, logIndex: 1 });
    orderBook.set("buy2", { orderId: "buy2", maker: "m1", side: 0, tokenIn: "t1", amountIn: 1n, encryptedCommitment: "0x2", expiry: futureExpiry, blockNumber: 2, logIndex: 1 });
    
    orderBook.set("sell1", { orderId: "sell1", maker: "m1", side: 1, tokenIn: "t1", amountIn: 1n, encryptedCommitment: "0x3", expiry: futureExpiry, blockNumber: 3, logIndex: 1 });

    const result = selectCandidatePair(orderBook);
    expect(result).not.toBeNull();
    expect(result!.buy.orderId).toBe("buy2");
    expect(result!.sell.orderId).toBe("sell1");
  });
});

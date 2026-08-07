import { OrderBook, OpenOrder } from "../indexer/indexer";

export function selectCandidatePair(orderBook: OrderBook): { buy: OpenOrder; sell: OpenOrder } | null {
  const nowUnix = Math.floor(Date.now() / 1000);

  let bestBuy: OpenOrder | null = null;
  let bestSell: OpenOrder | null = null;

  for (const order of orderBook.values()) {
    // Skip expired orders
    if (order.expiry <= nowUnix) {
      continue;
    }

    if (order.side === 0) { // Buy
      bestBuy = getOlderOrder(bestBuy, order);
    } else if (order.side === 1) { // Sell
      bestSell = getOlderOrder(bestSell, order);
    }
  }

  if (bestBuy && bestSell) {
    return { buy: bestBuy, sell: bestSell };
  }

  return null;
}

function getOlderOrder(currentBest: OpenOrder | null, newOrder: OpenOrder): OpenOrder {
  if (!currentBest) return newOrder;

  if (newOrder.blockNumber < currentBest.blockNumber) {
    return newOrder;
  }
  if (newOrder.blockNumber === currentBest.blockNumber && newOrder.logIndex < currentBest.logIndex) {
    return newOrder;
  }

  return currentBest;
}

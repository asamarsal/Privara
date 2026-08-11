import { OrderBook, OpenOrder } from "../indexer/indexer";

export function selectCandidatePair(
  orderBook: OrderBook,
  excludedPairs: ReadonlySet<string> = new Set(),
  hasPayload: (orderId: string) => boolean = () => true
): { buy: OpenOrder; sell: OpenOrder } | null {
  const nowUnix = Math.floor(Date.now() / 1000);

  const buys = Array.from(orderBook.values()).filter(order => order.side === 0 && order.expiry > nowUnix && hasPayload(order.orderId)).sort(compareOrders);
  const sells = Array.from(orderBook.values()).filter(order => order.side === 1 && order.expiry > nowUnix && hasPayload(order.orderId)).sort(compareOrders);
  for (const buy of buys) {
    for (const sell of sells) {
      const key = `${buy.orderId.toLowerCase()}:${sell.orderId.toLowerCase()}`;
      if (!excludedPairs.has(key)) return { buy, sell };
    }
  }
  return null;
}

function compareOrders(a: OpenOrder, b: OpenOrder): number {
  return a.blockNumber === b.blockNumber ? a.logIndex - b.logIndex : a.blockNumber - b.blockNumber;
}

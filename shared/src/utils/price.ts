/**
 * Calculates the integer midpoint of two prices.
 * Used for matching compatible orders.
 */
export function midpointPrice(sellerMin: bigint, buyerMax: bigint): bigint {
  return (sellerMin + buyerMax) / 2n;
}

/**
 * Calculates the quote amount (amountOut) based on base amount and price.
 * Formula: quoteAmount = (fxrpAmount * price) / (10 ** priceDecimals)
 */
export function calculateQuoteAmount(fxrpAmount: bigint, price: bigint, priceDecimals: number): bigint {
  const divisor = 10n ** BigInt(priceDecimals);
  return (fxrpAmount * price) / divisor;
}

/**
 * Normalizes an amount from one decimal precision to another.
 */
export function normalizeDecimals(amount: bigint, fromDecimals: number, toDecimals: number): bigint {
  if (fromDecimals === toDecimals) {
    return amount;
  }
  if (fromDecimals < toDecimals) {
    const multiplier = 10n ** BigInt(toDecimals - fromDecimals);
    return amount * multiplier;
  } else {
    const divisor = 10n ** BigInt(fromDecimals - toDecimals);
    return amount / divisor;
  }
}

/**
 * Calculates the absolute deviation in basis points (1 bp = 0.01%).
 * Formula: |reference - actual| * 10000 / reference
 */
export function basisPointDeviation(reference: bigint, actual: bigint): bigint {
  if (reference === 0n) return 0n; // Edge case
  
  const diff = reference > actual ? reference - actual : actual - reference;
  return (diff * 10000n) / reference;
}

import { Order, OrderSide, OrderType } from '../schemas';

const MARKET_COLLAR_DENOMINATOR = 100n;

function requirePositivePrice(price: bigint, name: string): void {
  if (price <= 0n) throw new RangeError(`${name} must be positive`);
}

/** Upper 1% market collar, rounded up so integer division never narrows it. */
export function buyMarketCollar(referencePrice: bigint): bigint {
  requirePositivePrice(referencePrice, 'Reference price');
  return (referencePrice * 101n + MARKET_COLLAR_DENOMINATOR - 1n) / MARKET_COLLAR_DENOMINATOR;
}

/** Lower 1% market collar, rounded down. */
export function sellMarketCollar(referencePrice: bigint): bigint {
  requirePositivePrice(referencePrice, 'Reference price');
  return (referencePrice * 99n) / MARKET_COLLAR_DENOMINATOR;
}

export function marketCollarPrice(referencePrice: bigint, side: OrderSide): bigint {
  return side === OrderSide.buy ? buyMarketCollar(referencePrice) : sellMarketCollar(referencePrice);
}

/** Buy stops trigger at-or-above; sell stops trigger at-or-below. */
export function isStopTriggered(side: OrderSide, stopPrice: bigint, marketPrice: bigint): boolean {
  requirePositivePrice(stopPrice, 'Stop price');
  requirePositivePrice(marketPrice, 'Market price');
  return side === OrderSide.buy ? marketPrice >= stopPrice : marketPrice <= stopPrice;
}

/** Tests the committed worst-price protection shared by every order type. */
export function isExecutionPriceAllowed(side: OrderSide, limitPrice: bigint, executionPrice: bigint): boolean {
  if (limitPrice <= 0n || executionPrice <= 0n) return false;
  return side === OrderSide.buy ? executionPrice <= limitPrice : executionPrice >= limitPrice;
}

/** Tests both activation (for stops) and the committed execution-price bound. */
export function canOrderExecute(order: Order, executionPrice: bigint, marketPrice: bigint = executionPrice): boolean {
  if (order.orderType === OrderType.stop && !isStopTriggered(order.side, order.stopPrice, marketPrice)) return false;
  return isExecutionPriceAllowed(order.side, order.limitPrice, executionPrice);
}

/** Tests whether a price can satisfy both orders' committed protections. */
export function areOrdersPriceCompatible(buyOrder: Order, sellOrder: Order, executionPrice: bigint): boolean {
  return buyOrder.side === OrderSide.buy
    && sellOrder.side === OrderSide.sell
    && canOrderExecute(buyOrder, executionPrice)
    && canOrderExecute(sellOrder, executionPrice);
}

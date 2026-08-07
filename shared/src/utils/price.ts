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

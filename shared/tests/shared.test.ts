import { describe, it, expect } from 'vitest';
import { AbiCoder, getBytes } from 'ethers';
import { 
  OrderSchema, 
  MatchResultSchema,
  encodeOrderForHashing,
  hashOrder,
  midpointPrice,
  calculateQuoteAmount,
  normalizeDecimals,
  basisPointDeviation,
  FIXTURE_SELL_ORDER,
  FIXTURE_BUY_ORDER,
  FIXTURE_INCOMPATIBLE_BUY_ORDER,
  FIXTURE_EXPIRED_ORDER,
  FIXTURE_MATCH_RESULT,
  orderToWire,
  orderFromWire,
  computeMatchId,
  hashMatchResult,
  OrderSide,
  OrderType,
  buyMarketCollar,
  sellMarketCollar,
  marketCollarPrice,
  isStopTriggered,
  isExecutionPriceAllowed,
  canOrderExecute,
  areOrdersPriceCompatible
} from '../src';

describe('Schemas', () => {
  it('should validate valid orders', () => {
    expect(() => OrderSchema.parse(FIXTURE_SELL_ORDER)).not.toThrow();
    expect(() => OrderSchema.parse(FIXTURE_BUY_ORDER)).not.toThrow();
  });
  
  it('should validate valid match result', () => {
    expect(() => MatchResultSchema.parse(FIXTURE_MATCH_RESULT)).not.toThrow();
  });

  it('rejects invalid type, stop-price, and side relationships', () => {
    expect(() => OrderSchema.parse({ ...FIXTURE_BUY_ORDER, limitPrice: 0n })).toThrow();
    expect(() => OrderSchema.parse({ ...FIXTURE_BUY_ORDER, orderType: OrderType.market, stopPrice: 1n })).toThrow();
    expect(() => OrderSchema.parse({ ...FIXTURE_BUY_ORDER, orderType: OrderType.stop, stopPrice: 0n })).toThrow();
    expect(() => OrderSchema.parse({ ...FIXTURE_BUY_ORDER, orderType: OrderType.stop, stopPrice: FIXTURE_BUY_ORDER.limitPrice + 1n })).toThrow();
    expect(() => OrderSchema.parse({ ...FIXTURE_SELL_ORDER, orderType: OrderType.stop, stopPrice: FIXTURE_SELL_ORDER.limitPrice - 1n })).toThrow();
    expect(() => OrderSchema.parse({ ...FIXTURE_BUY_ORDER, orderType: OrderType.stop, stopPrice: FIXTURE_BUY_ORDER.limitPrice })).not.toThrow();
    expect(() => OrderSchema.parse({ ...FIXTURE_SELL_ORDER, orderType: OrderType.stop, stopPrice: FIXTURE_SELL_ORDER.limitPrice })).not.toThrow();
  });
});

describe('Encoding', () => {
  it('round-trips canonical wire orders without bigint precision loss', () => {
    const wire = orderToWire(FIXTURE_SELL_ORDER);
    expect(typeof wire.amountIn).toBe('string');
    expect(orderFromWire(JSON.parse(JSON.stringify(wire)))).toEqual(FIXTURE_SELL_ORDER);
    expect(() => orderFromWire({ ...wire, amountIn: '01' })).toThrow();
  });

  it('round-trips market and stop orders and preserves their discriminants', () => {
    const market = { ...FIXTURE_BUY_ORDER, orderType: OrderType.market as const };
    const stop = { ...FIXTURE_SELL_ORDER, orderType: OrderType.stop as const, stopPrice: FIXTURE_SELL_ORDER.limitPrice + 1n };
    expect(orderFromWire(orderToWire(market))).toEqual(market);
    expect(orderFromWire(orderToWire(stop))).toEqual(stop);
  });

  it('preserves established limit commitments and commits type and stop price', () => {
    const coder = AbiCoder.defaultAbiCoder();
    const legacyEncoding = getBytes(coder.encode(
      ['bytes32', 'address', 'uint8', 'address', 'address', 'uint256', 'uint256', 'uint8', 'uint256', 'uint64', 'uint256', 'uint256', 'address'],
      [FIXTURE_SELL_ORDER.orderId, FIXTURE_SELL_ORDER.maker, 1, FIXTURE_SELL_ORDER.tokenIn, FIXTURE_SELL_ORDER.tokenOut, FIXTURE_SELL_ORDER.amountIn, FIXTURE_SELL_ORDER.limitPrice, 0, 0n, FIXTURE_SELL_ORDER.expiry, FIXTURE_SELL_ORDER.nonce, FIXTURE_SELL_ORDER.chainId, FIXTURE_SELL_ORDER.vaultAddress]
    ));
    expect(encodeOrderForHashing(FIXTURE_SELL_ORDER)).toEqual(legacyEncoding);
    const market = { ...FIXTURE_BUY_ORDER, orderType: OrderType.market as const };
    const stop = { ...FIXTURE_BUY_ORDER, orderType: OrderType.stop as const, stopPrice: FIXTURE_BUY_ORDER.limitPrice - 1n };
    expect(hashOrder(market)).not.toBe(hashOrder(FIXTURE_BUY_ORDER));
    expect(hashOrder(stop)).not.toBe(hashOrder(market));
    expect(hashOrder({ ...stop, stopPrice: stop.stopPrice - 1n })).not.toBe(hashOrder(stop));
  });

  it('computes deterministic domain-separated match IDs and digests', () => {
    const { matchId: _ignored, ...withoutId } = FIXTURE_MATCH_RESULT;
    const matchId = computeMatchId(withoutId);
    const result = { ...FIXTURE_MATCH_RESULT, matchId };
    expect(computeMatchId(withoutId)).toBe(matchId);
    expect(hashMatchResult(result)).toMatch(/^0x[0-9a-f]{64}$/);
    expect(hashMatchResult({ ...result, quoteAmount: result.quoteAmount + 1n })).not.toBe(hashMatchResult(result));
  });

  it('should encode and hash deterministically', () => {
    const hash1 = hashOrder(FIXTURE_SELL_ORDER);
    const hash2 = hashOrder(FIXTURE_SELL_ORDER);
    expect(hash1).toEqual(hash2);
    expect(hash1).toMatch(/^0x[0-9a-f]{64}$/);
    
    const hashBuy = hashOrder(FIXTURE_BUY_ORDER);
    expect(hash1).not.toEqual(hashBuy);
  });
});

describe('Price Utils', () => {
  it('should calculate midpoint', () => {
    expect(midpointPrice(10n, 20n)).toBe(15n);
    expect(midpointPrice(10n, 21n)).toBe(15n); // Integer division floor
  });
  
  it('should calculate quote amount', () => {
    // 100 FXRP at 0.5 price (18 dec) = 50 USDT
    // fxrpAmount: 100 * 10^18
    // price: 0.5 * 10^18 = 5 * 10^17
    // expected: 50 * 10^18
    const fxrp = 100n * 10n**18n;
    const price = 5n * 10n**17n;
    const quote = calculateQuoteAmount(fxrp, price, 18);
    expect(quote).toBe(50n * 10n**18n);
  });
  
  it('should normalize decimals', () => {
    expect(normalizeDecimals(1n * 10n**6n, 6, 18)).toBe(1n * 10n**18n);
    expect(normalizeDecimals(1n * 10n**18n, 18, 6)).toBe(1n * 10n**6n);
    expect(normalizeDecimals(100n, 18, 18)).toBe(100n);
  });
  
  it('should calculate basis point deviation', () => {
    // 1% = 100 bp
    // reference = 1000
    // actual = 1010
    // diff = 10 -> (10 * 10000) / 1000 = 100 bp
    expect(basisPointDeviation(1000n, 1010n)).toBe(100n);
  });

  it('calculates conservative 1% market collars using bigint rounding', () => {
    expect(buyMarketCollar(100n)).toBe(101n);
    expect(buyMarketCollar(101n)).toBe(103n); // ceil(102.01)
    expect(sellMarketCollar(100n)).toBe(99n);
    expect(sellMarketCollar(101n)).toBe(99n); // floor(99.99)
    expect(marketCollarPrice(101n, OrderSide.buy)).toBe(103n);
    expect(marketCollarPrice(101n, OrderSide.sell)).toBe(99n);
    expect(() => buyMarketCollar(0n)).toThrow();
  });

  it('uses inclusive stop-trigger boundaries', () => {
    expect(isStopTriggered(OrderSide.buy, 100n, 99n)).toBe(false);
    expect(isStopTriggered(OrderSide.buy, 100n, 100n)).toBe(true);
    expect(isStopTriggered(OrderSide.sell, 100n, 101n)).toBe(false);
    expect(isStopTriggered(OrderSide.sell, 100n, 100n)).toBe(true);
  });

  it('checks execution protection, activation, and pair compatibility', () => {
    expect(isExecutionPriceAllowed(OrderSide.buy, 100n, 100n)).toBe(true);
    expect(isExecutionPriceAllowed(OrderSide.buy, 100n, 101n)).toBe(false);
    expect(isExecutionPriceAllowed(OrderSide.sell, 100n, 100n)).toBe(true);
    expect(isExecutionPriceAllowed(OrderSide.sell, 100n, 99n)).toBe(false);
    const stopBuy = { ...FIXTURE_BUY_ORDER, orderType: OrderType.stop as const, limitPrice: 110n, stopPrice: 100n };
    expect(canOrderExecute(stopBuy, 105n, 99n)).toBe(false);
    expect(canOrderExecute(stopBuy, 105n, 100n)).toBe(true);
    const buy = { ...FIXTURE_BUY_ORDER, limitPrice: 110n };
    const sell = { ...FIXTURE_SELL_ORDER, limitPrice: 100n };
    expect(areOrdersPriceCompatible(buy, sell, 105n)).toBe(true);
    expect(areOrdersPriceCompatible(buy, sell, 99n)).toBe(false);
  });
});

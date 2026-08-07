import { describe, it, expect } from 'vitest';
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
  FIXTURE_MATCH_RESULT
} from '../src';

describe('Schemas', () => {
  it('should validate valid orders', () => {
    expect(() => OrderSchema.parse(FIXTURE_SELL_ORDER)).not.toThrow();
    expect(() => OrderSchema.parse(FIXTURE_BUY_ORDER)).not.toThrow();
  });
  
  it('should validate valid match result', () => {
    expect(() => MatchResultSchema.parse(FIXTURE_MATCH_RESULT)).not.toThrow();
  });
});

describe('Encoding', () => {
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
});

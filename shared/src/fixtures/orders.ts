import { OrderSide, Order, MatchResult, OrderType } from '../schemas';

const FXRP = '0x1111111111111111111111111111111111111111';
const USDT0 = '0x2222222222222222222222222222222222222222';
const VAULT = '0x3333333333333333333333333333333333333333';
const ALICE = '0x4444444444444444444444444444444444444444';
const BOB = '0x5555555555555555555555555555555555555555';

const CURRENT_TIME = Math.floor(Date.now() / 1000);
const FUTURE_EXPIRY = CURRENT_TIME + 3600; // 1 hour
const PAST_EXPIRY = CURRENT_TIME - 3600; // 1 hour ago

// Sell 100 FXRP for at least 0.5 USDT0 each
// 100 * 10^18
const fxrpAmount = 100n * 10n**18n;
// 0.5 * 10^18
const sellPrice = 5n * 10n**17n; 

export const FIXTURE_SELL_ORDER: Order = {
  orderId: '0x0000000000000000000000000000000000000000000000000000000000000001',
  maker: ALICE,
  side: OrderSide.sell,
  tokenIn: FXRP,
  tokenOut: USDT0,
  amountIn: fxrpAmount,
  limitPrice: sellPrice,
  orderType: OrderType.limit,
  stopPrice: 0n,
  expiry: FUTURE_EXPIRY,
  nonce: 1n,
  chainId: 114,
  vaultAddress: VAULT
};

// Buy 100 FXRP for at most 0.6 USDT0 each
// Quote amount needed to lock = 100 * 0.6 = 60 USDT0 = 60 * 10^6 (USDT has 6 decimals? Let's assume 18 for now based on standard)
const buyPrice = 6n * 10n**17n;
const quoteAmount = 60n * 10n**18n; // Assuming 18 decimals for simplicity in this fixture

export const FIXTURE_BUY_ORDER: Order = {
  orderId: '0x0000000000000000000000000000000000000000000000000000000000000002',
  maker: BOB,
  side: OrderSide.buy,
  tokenIn: USDT0,
  tokenOut: FXRP,
  amountIn: quoteAmount,
  limitPrice: buyPrice,
  orderType: OrderType.limit,
  stopPrice: 0n,
  expiry: FUTURE_EXPIRY,
  nonce: 1n,
  chainId: 114,
  vaultAddress: VAULT
};

// Incompatible Buy Order (Price too low: 0.4 < 0.5)
const badBuyPrice = 4n * 10n**17n;
export const FIXTURE_INCOMPATIBLE_BUY_ORDER: Order = {
  ...FIXTURE_BUY_ORDER,
  orderId: '0x0000000000000000000000000000000000000000000000000000000000000003',
  limitPrice: badBuyPrice,
  amountIn: 40n * 10n**18n
};

// Expired Order
export const FIXTURE_EXPIRED_ORDER: Order = {
  ...FIXTURE_SELL_ORDER,
  orderId: '0x0000000000000000000000000000000000000000000000000000000000000004',
  expiry: PAST_EXPIRY
};

// Midpoint execution price: (0.5 + 0.6) / 2 = 0.55
const execPrice = 55n * 10n**16n; 
// Total quote amount at 0.55: 100 * 0.55 = 55 USDT0
const execQuoteAmount = 55n * 10n**18n;

export const FIXTURE_MATCH_RESULT: MatchResult = {
  matchId: '0x0000000000000000000000000000000000000000000000000000000000000abc',
  buyOrderId: FIXTURE_BUY_ORDER.orderId,
  sellOrderId: FIXTURE_SELL_ORDER.orderId,
  buyCommitment: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  sellCommitment: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  executionPrice: execPrice,
  fxrpAmount: fxrpAmount,
  quoteAmount: execQuoteAmount,
  expiry: FUTURE_EXPIRY,
  chainId: 114,
  vaultAddress: VAULT
};

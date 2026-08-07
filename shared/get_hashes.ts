import { hashOrder, hashMatchResult } from './src';
import { FIXTURE_SELL_ORDER, FIXTURE_BUY_ORDER, FIXTURE_MATCH_RESULT } from './src';

FIXTURE_SELL_ORDER.expiry = 1700000000;
FIXTURE_BUY_ORDER.expiry = 1700000000;
FIXTURE_MATCH_RESULT.expiry = 1700000000;

console.log('Sell:', hashOrder(FIXTURE_SELL_ORDER));
console.log('Buy:', hashOrder(FIXTURE_BUY_ORDER));
console.log('Match:', hashMatchResult(FIXTURE_MATCH_RESULT));

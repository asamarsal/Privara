import { AbiCoder, getBytes, id, keccak256 } from 'ethers';
import { MatchResult, Order, OrderSide } from '../schemas';

const abiCoder = AbiCoder.defaultAbiCoder();
export const MATCH_RESULT_V2_DOMAIN = id('PRIVARA_MATCH_RESULT_V2');
export const MATCH_ID_V2_DOMAIN = id('PRIVARA_MATCH_ID_V2');

export function encodeOrderForHashing(order: Order): Uint8Array {
  const sideUint8 = order.side === OrderSide.buy ? 0 : 1;
  return getBytes(abiCoder.encode(
    ['bytes32', 'address', 'uint8', 'address', 'address', 'uint256', 'uint256', 'uint8', 'uint256', 'uint64', 'uint256', 'uint256', 'address'],
    [order.orderId, order.maker, sideUint8, order.tokenIn, order.tokenOut, order.amountIn, order.limitPrice, order.orderType, order.stopPrice, order.expiry, order.nonce, order.chainId, order.vaultAddress]
  ));
}

export function hashOrder(order: Order): string {
  return keccak256(encodeOrderForHashing(order));
}

export function computeOrderCommitment(order: Order): string {
  return hashOrder(order);
}

export function computeMatchId(result: Omit<MatchResult, 'matchId'>): string {
  return keccak256(abiCoder.encode(
    ['bytes32', 'bytes32', 'bytes32', 'bytes32', 'bytes32', 'uint256', 'uint256', 'uint256', 'uint64', 'uint256', 'address'],
    [MATCH_ID_V2_DOMAIN, result.buyOrderId, result.sellOrderId, result.buyCommitment, result.sellCommitment, result.executionPrice, result.fxrpAmount, result.quoteAmount, result.expiry, result.chainId, result.vaultAddress]
  ));
}

export function encodeMatchResultForHashing(result: MatchResult): Uint8Array {
  return getBytes(abiCoder.encode(
    ['bytes32', 'bytes32', 'bytes32', 'bytes32', 'bytes32', 'bytes32', 'uint256', 'uint256', 'uint256', 'uint64', 'uint256', 'address'],
    [MATCH_RESULT_V2_DOMAIN, result.matchId, result.buyOrderId, result.sellOrderId, result.buyCommitment, result.sellCommitment, result.executionPrice, result.fxrpAmount, result.quoteAmount, result.expiry, result.chainId, result.vaultAddress]
  ));
}

export function hashMatchResult(result: MatchResult): string {
  return keccak256(encodeMatchResultForHashing(result));
}

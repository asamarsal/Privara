import { AbiCoder, getBytes, keccak256 } from 'ethers';
import { Order, OrderSide, MatchResult } from '../schemas';

const abiCoder = AbiCoder.defaultAbiCoder();

/**
 * Encodes an order into a Uint8Array (bytes) using standard ABI encoding.
 * Deterministic for given Order fields.
 */
export function encodeOrderForHashing(order: Order): Uint8Array {
  // We represent the side as a uint8: 0 for buy, 1 for sell
  const sideUint8 = order.side === OrderSide.buy ? 0 : 1;
  const encodedHex = abiCoder.encode(
    ['bytes32', 'address', 'uint8', 'address', 'address', 'uint256', 'uint256', 'uint64', 'uint256', 'uint256', 'address'],
    [
      order.orderId,
      order.maker,
      sideUint8,
      order.tokenIn,
      order.tokenOut,
      order.amountIn,
      order.limitPrice,
      order.expiry,
      order.nonce,
      order.chainId,
      order.vaultAddress
    ]
  );
  return getBytes(encodedHex);
}

/**
 * Hashes the encoded order bytes using keccak256.
 */
export function hashOrder(order: Order): string {
  const encoded = encodeOrderForHashing(order);
  return keccak256(encoded);
}

/**
 * Encodes a MatchResult into a Uint8Array (bytes) using standard ABI encoding.
 */
export function encodeMatchResultForHashing(result: MatchResult): Uint8Array {
  const encodedHex = abiCoder.encode(
    ['bytes32', 'bytes32', 'bytes32', 'uint256', 'uint256', 'uint256', 'uint64', 'uint256', 'address'],
    [
      result.matchId,
      result.buyOrderId,
      result.sellOrderId,
      result.executionPrice,
      result.fxrpAmount,
      result.quoteAmount,
      result.expiry,
      result.chainId,
      result.vaultAddress
    ]
  );
  return getBytes(encodedHex);
}

/**
 * Hashes the encoded MatchResult bytes using keccak256.
 */
export function hashMatchResult(result: MatchResult): string {
  const encoded = encodeMatchResultForHashing(result);
  return keccak256(encoded);
}

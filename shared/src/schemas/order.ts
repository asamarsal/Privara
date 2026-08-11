import { z } from 'zod';

export enum OrderSide {
  buy = 'buy',
  sell = 'sell',
}

export enum OrderType {
  limit = 0,
  market = 1,
  stop = 2,
}

export enum OrderStatus {
  open = 'open',
  filled = 'filled',
  cancelled = 'cancelled',
  expired = 'expired',
}

const bytes32 = z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Must be a 32-byte hex string');
const address = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Must be an EVM address');
const uint256 = z.bigint().nonnegative();
const uint64Number = z.number().int().nonnegative().safe();

const orderFields = {
  orderId: bytes32,
  maker: address,
  side: z.nativeEnum(OrderSide),
  tokenIn: address,
  tokenOut: address,
  amountIn: uint256.refine(value => value > 0n, 'Amount must be positive'),
  // Every order commits a positive worst-price bound, including market orders.
  limitPrice: uint256.refine(value => value > 0n, 'Limit price must be positive'),
  expiry: uint64Number,
  nonce: uint256,
  chainId: uint64Number.refine(value => value > 0, 'Chain ID must be positive'),
  vaultAddress: address,
};

export const OrderSchema = z.discriminatedUnion('orderType', [
  z.object({ ...orderFields, orderType: z.literal(OrderType.limit), stopPrice: z.literal(0n) }),
  z.object({ ...orderFields, orderType: z.literal(OrderType.market), stopPrice: z.literal(0n) }),
  z.object({ ...orderFields, orderType: z.literal(OrderType.stop), stopPrice: uint256.refine(value => value > 0n, 'Stop price must be positive') }),
]).superRefine((order, ctx) => {
  if (order.tokenIn.toLowerCase() === order.tokenOut.toLowerCase()) {
    ctx.addIssue({ code: 'custom', path: ['tokenOut'], message: 'Token pair must contain distinct assets' });
  }
  if (order.orderType === OrderType.stop) {
    const relationshipIsValid = order.side === OrderSide.buy
      ? order.limitPrice >= order.stopPrice
      : order.limitPrice <= order.stopPrice;
    if (!relationshipIsValid) {
      ctx.addIssue({
        code: 'custom',
        path: ['limitPrice'],
        message: order.side === OrderSide.buy
          ? 'Stop buy limit price must be greater than or equal to stop price'
          : 'Stop sell limit price must be less than or equal to stop price',
      });
    }
  }
});

export type Order = z.infer<typeof OrderSchema>;

const decimalString = z.string().regex(/^(0|[1-9][0-9]*)$/, 'Must be an unsigned canonical decimal string');

const wireFields = {
  orderId: bytes32,
  maker: address,
  side: z.nativeEnum(OrderSide),
  tokenIn: address,
  tokenOut: address,
  amountIn: decimalString,
  limitPrice: decimalString,
  expiry: uint64Number,
  nonce: decimalString,
  chainId: uint64Number,
  vaultAddress: address,
};

// Conversion through OrderSchema supplies the positive-price and relationship checks.
export const OrderWireSchema = z.discriminatedUnion('orderType', [
  z.object({ ...wireFields, orderType: z.literal(OrderType.limit), stopPrice: z.literal('0') }),
  z.object({ ...wireFields, orderType: z.literal(OrderType.market), stopPrice: z.literal('0') }),
  z.object({ ...wireFields, orderType: z.literal(OrderType.stop), stopPrice: decimalString.refine(value => value !== '0', 'Stop price must be positive') }),
]).superRefine((wire, ctx) => {
  const parsed = OrderSchema.safeParse({
    ...wire,
    amountIn: BigInt(wire.amountIn),
    limitPrice: BigInt(wire.limitPrice),
    stopPrice: BigInt(wire.stopPrice),
    nonce: BigInt(wire.nonce),
  });
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      ctx.addIssue({ code: 'custom', path: issue.path, message: issue.message });
    }
  }
});

export type OrderWire = z.infer<typeof OrderWireSchema>;

export function orderToWire(order: Order): OrderWire {
  const valid = OrderSchema.parse(order);
  return OrderWireSchema.parse({
    ...valid,
    amountIn: valid.amountIn.toString(),
    limitPrice: valid.limitPrice.toString(),
    stopPrice: valid.stopPrice.toString(),
    nonce: valid.nonce.toString(),
  });
}

export function orderFromWire(input: unknown): Order {
  const wire = OrderWireSchema.parse(input);
  return OrderSchema.parse({
    ...wire,
    amountIn: BigInt(wire.amountIn),
    limitPrice: BigInt(wire.limitPrice),
    stopPrice: BigInt(wire.stopPrice),
    nonce: BigInt(wire.nonce),
  });
}

import { z } from 'zod';

export enum OrderSide {
  buy = 'buy',
  sell = 'sell',
}

export enum OrderStatus {
  open = 'open',
  filled = 'filled',
  cancelled = 'cancelled',
  expired = 'expired',
}

export const OrderSchema = z.object({
  orderId: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Must be a 32-byte hex string"),
  maker: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Must be an EVM address"),
  side: z.nativeEnum(OrderSide),
  tokenIn: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Must be an EVM address"),
  tokenOut: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Must be an EVM address"),
  amountIn: z.bigint(),
  limitPrice: z.bigint(),
  expiry: z.number(),
  nonce: z.bigint(),
  chainId: z.number(),
  vaultAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Must be an EVM address"),
});

export type Order = z.infer<typeof OrderSchema>;

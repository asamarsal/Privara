import { z } from 'zod';

export const MatchResultSchema = z.object({
  matchId: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Must be a 32-byte hex string"),
  buyOrderId: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Must be a 32-byte hex string"),
  sellOrderId: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Must be a 32-byte hex string"),
  executionPrice: z.bigint(),
  fxrpAmount: z.bigint(),
  quoteAmount: z.bigint(),
  expiry: z.number(),
  chainId: z.number(),
  vaultAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Must be an EVM address"),
});

export type MatchResult = z.infer<typeof MatchResultSchema>;

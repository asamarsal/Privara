import { z } from 'zod';

const bytes32 = z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Must be a 32-byte hex string');
const address = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Must be an EVM address');
const decimalString = z.string().regex(/^(0|[1-9][0-9]*)$/, 'Must be an unsigned canonical decimal string');

export const MatchResultSchema = z.object({
  matchId: bytes32,
  buyOrderId: bytes32,
  sellOrderId: bytes32,
  buyCommitment: bytes32,
  sellCommitment: bytes32,
  executionPrice: z.bigint().positive(),
  fxrpAmount: z.bigint().positive(),
  quoteAmount: z.bigint().positive(),
  expiry: z.number().int().positive().safe(),
  chainId: z.number().int().positive().safe(),
  vaultAddress: address,
});

export type MatchResult = z.infer<typeof MatchResultSchema>;

export const MatchResultWireSchema = z.object({
  status: z.literal('COMPATIBLE'),
  matchId: bytes32,
  buyOrderId: bytes32,
  sellOrderId: bytes32,
  buyCommitment: bytes32,
  sellCommitment: bytes32,
  executionPrice: decimalString,
  fxrpAmount: decimalString,
  quoteAmount: decimalString,
  expiry: z.number().int().positive().safe(),
  chainId: z.number().int().positive().safe(),
  vaultAddress: address,
  signature: z.string().regex(/^0x[a-fA-F0-9]{130}$/, 'Must be a 65-byte signature'),
});

export const IncompatibleResultWireSchema = z.object({
  status: z.literal('INCOMPATIBLE'),
  reason: z.string().min(1).max(200),
});

export const MatchPairResultWireSchema = z.discriminatedUnion('status', [
  MatchResultWireSchema,
  IncompatibleResultWireSchema,
]);

export type MatchPairResultWire = z.infer<typeof MatchPairResultWireSchema>;

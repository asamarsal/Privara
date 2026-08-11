import { formatUnits } from 'viem';

/** Formats token units without converting through an unsafe JavaScript number. */
export function formatTokenAmount(value: bigint, decimals = 18, maxFractionDigits = 4): string {
  const [whole, fraction = ''] = formatUnits(value, decimals).split('.');
  const trimmed = fraction.slice(0, maxFractionDigits).replace(/0+$/, '');
  return trimmed ? `${whole}.${trimmed}` : whole;
}

export function orderErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  const lower = message.toLowerCase();
  if (lower.includes('user rejected') || lower.includes('user denied')) return 'The wallet request was rejected.';
  if (lower.includes('failed to fetch') || lower.includes('network error')) return 'Could not reach the order backend or RPC. Check your connection and try again.';
  if (lower.includes('insufficient funds')) return 'The wallet lacks enough native C2FLR to pay the network fee.';
  if (lower.includes('revert')) return `The vault contract rejected the order${message ? `: ${message}` : '.'}`;
  return message || 'Failed to submit the order. Check the backend and wallet, then try again.';
}

import { useReadContract } from 'wagmi';
import { parseAbi, formatUnits, parseUnits } from 'viem';
import { deployment } from '../config/deployment';

const ftsoV2Abi = parseAbi([
  'function getFeedById(bytes21 _feedId) external payable returns (uint256 _value, int8 _decimals, uint64 _timestamp)'
]);

export function useFtsoPrice() {
  const { data, isError, isLoading, error } = useReadContract({
    address: deployment.ftsoV2,
    abi: ftsoV2Abi,
    functionName: 'getFeedById',
    args: [deployment.feedId],
    chainId: deployment.chainId,
    query: { refetchInterval: 10_000 },
  });

  if (isError) return { status: 'error' as const, priceFormatted: '—', priceBigInt: 0n, timestamp: 0, isLoading: false, isError: true, error };
  if (isLoading || !data) return { status: 'loading' as const, priceFormatted: '—', priceBigInt: 0n, timestamp: 0, isLoading: true, isError: false };

  const [value, decimals, rawTimestamp] = data as [bigint, number, bigint];
  const decimalsNumber = Number(decimals);
  if (value <= 0n || decimalsNumber < 0 || decimalsNumber > 18) return { status: 'error' as const, priceFormatted: '—', priceBigInt: 0n, timestamp: Number(rawTimestamp), isLoading: false, isError: true };
  const timestamp = Number(rawTimestamp);
  const age = Math.floor(Date.now() / 1000) - timestamp;
  const priceFormatted = formatUnits(value, decimalsNumber);
  const priceBigInt = parseUnits(priceFormatted, 18);
  if (age < 0 || age > 300) return { status: 'stale' as const, priceFormatted, priceBigInt, timestamp, isLoading: false, isError: true };
  return { status: 'live' as const, priceFormatted, priceBigInt, timestamp, isLoading: false, isError: false };
}

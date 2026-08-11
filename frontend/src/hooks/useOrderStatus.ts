import { useCallback, useEffect, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { parseAbi } from 'viem';
import { deployment } from '../config/deployment';

export type OrderStatus = 'open' | 'matched' | 'settled' | 'cancelled' | 'expired';

const vaultAbi = parseAbi([
  'function isOrderCancelled(bytes32 orderId) view returns (bool)',
  'function isOrderFilled(bytes32 orderId) view returns (bool)',
]);

export const useOrderStatus = (orderId: string, expiryTimestamp: number) => {
  const publicClient = usePublicClient();
  const vaultAddress = deployment.vault;
  const [status, setStatus] = useState<OrderStatus>('open');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const refetch = useCallback(async () => {
    if (!publicClient || !orderId) return;
    setIsLoading(true);
    setError(undefined);
    try {
      const [cancelled, filled] = await Promise.all([
        publicClient.readContract({ address: vaultAddress, abi: vaultAbi, functionName: 'isOrderCancelled', args: [orderId as `0x${string}`] }),
        publicClient.readContract({ address: vaultAddress, abi: vaultAbi, functionName: 'isOrderFilled', args: [orderId as `0x${string}`] }),
      ]);
      if (cancelled) setStatus('cancelled');
      else if (filled) setStatus('settled');
      else if (Date.now() / 1000 >= expiryTimestamp) setStatus('expired');
      else setStatus('open');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to read order status');
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, orderId, expiryTimestamp, vaultAddress]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { status, isLoading, error, refetch };
};

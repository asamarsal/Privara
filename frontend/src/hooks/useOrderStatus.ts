import { useEffect, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { parseAbi } from 'viem';

export type OrderStatus = 'open' | 'matched' | 'settled' | 'cancelled' | 'expired';

const vaultAbi = parseAbi([
  'event OrderCancelled(bytes32 indexed orderId, address indexed maker)',
  'event OrderSettled(bytes32 indexed matchId, bytes32 indexed buyOrderId, bytes32 indexed sellOrderId, uint256 executionPrice, uint256 fxrpAmount, uint256 quoteAmount)'
]);

export const useOrderStatus = (orderId: string, expiryTimestamp: number) => {
  const publicClient = usePublicClient();
  const vaultAddress = "0xa479Bc0C4B000D0dcD6FaC3BB9E71B830eBE048E";
  
  const [status, setStatus] = useState<OrderStatus>('open');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!publicClient || !vaultAddress || !orderId) return;

    let isMounted = true;
    
    const checkStatus = async () => {
      setIsLoading(true);
      try {
        // Check if expired
        if (Date.now() / 1000 >= expiryTimestamp) {
          if (isMounted) setStatus('expired');
        }

        // Check cancelled events
        const cancelLogs = await publicClient.getLogs({
          address: vaultAddress,
          event: vaultAbi[0],
          args: { orderId: orderId as `0x${string}` },
          fromBlock: 'earliest'
        });

        if (cancelLogs.length > 0) {
          if (isMounted) setStatus('cancelled');
          return;
        }

        // Check settled events
        const settleLogs = await publicClient.getLogs({
          address: vaultAddress,
          event: vaultAbi[1],
          fromBlock: 'earliest'
        });
        
        // Since buyOrderId and sellOrderId are not indexed by orderId individually but they are indexed in the event, viem getLogs with args can filter
        const isSettled = settleLogs.some(log => log.args.buyOrderId === orderId || log.args.sellOrderId === orderId);

        if (isSettled) {
          if (isMounted) setStatus('settled');
          return;
        }
      } catch (err) {
        console.error("Error checking order status", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    checkStatus();

    return () => { isMounted = false; };
  }, [publicClient, vaultAddress, orderId, expiryTimestamp]);

  return { status, isLoading };
};

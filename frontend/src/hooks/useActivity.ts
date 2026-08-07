import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';

export interface OrderHistoryItem {
  orderId: string;
  maker: string;
  side: number; // 0 = buy, 1 = sell
  tokenIn: string;
  amountIn: bigint;
  expiry: number;
  blockNumber: number;
  txHash?: string;
}

export interface SettlementHistoryItem {
  matchId: string;
  buyOrderId: string;
  sellOrderId: string;
  executionPrice: bigint;
  fxrpAmount: bigint;
  quoteAmount: bigint;
  txHash: string;
}

// Remove localStorage helpers - no longer needed
export function saveOrderToHistory(_order: any) {
  // No-op: data now comes from the backend indexer
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export const useActivity = () => {
  const { address } = useAccount();
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [settlements, setSettlements] = useState<SettlementHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async (isBackground = false) => {
    if (!address) {
      setIsLoading(false);
      setOrders([]);
      return;
    }
    if (!isBackground) setIsLoading(true);
    setError(null);

    try {
      // Fetch orders for this address from the backend indexer
      const res = await fetch(`${BACKEND_URL}/orders/${address}`);
      if (!res.ok) throw new Error(`Backend returned ${res.status}`);

      const raw: any[] = await res.json();
      const parsed: OrderHistoryItem[] = raw.map(o => ({
        ...o,
        amountIn: BigInt(o.amountIn),
      }));

      setOrders(parsed);
      setSettlements([]); // Settlements endpoint can be added later
    } catch (err: any) {
      console.error('[Activity] Backend fetch failed:', err);
      setError(
        err?.message?.includes('Failed to fetch')
          ? 'Cannot connect to backend indexer. Make sure the backend is running (npm run dev in backend folder).'
          : err.message
      );
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // Poll every 10 seconds for real-time updates without flickering
    const interval = setInterval(() => refresh(true), 10000);
    return () => clearInterval(interval);
  }, [address]);

  return { orders, settlements, isLoading, error, refresh };
};

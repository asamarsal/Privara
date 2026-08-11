import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';

export interface OrderHistoryItem {
  orderId: string;
  maker: string;
  side: number;
  tokenIn: string;
  amountIn: bigint;
  expiry: number;
  blockNumber: number;
  txHash?: string;
  timestamp?: number;
}

export interface SettlementHistoryItem {
  matchId: string;
  buyOrderId: string;
  sellOrderId: string;
  executionPrice: bigint;
  fxrpAmount: bigint;
  quoteAmount: bigint;
  txHash: string;
  blockNumber: number;
  timestamp?: number;
  ftsoPrice?: bigint;
}

export interface PortfolioMetrics {
  volume24h: bigint;
  activeOrders: number;
  settledTrades: number;
}

export interface PortfolioFreshness {
  updatedAt?: number;
  indexedBlock?: number;
  [key: string]: unknown;
}

interface PortfolioResponse {
  orders: OrderHistoryItem[];
  settlements: SettlementHistoryItem[];
  metrics: PortfolioMetrics;
  freshness: PortfolioFreshness | null;
}

export function saveOrderToHistory(_order: unknown) {
  // No-op: data comes from the backend indexer.
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
export const portfolioQueryKey = (address: string) => ['portfolio', address.toLowerCase()] as const;

const bigint = (value: unknown) => BigInt((value ?? 0) as string | number | bigint);
const number = (value: unknown) => Number(value ?? 0);

function parsePortfolio(raw: any): PortfolioResponse {
  const metrics = raw?.metrics ?? {};
  return {
    orders: (raw?.activeOrders ?? []).map((order: any) => ({
      ...order,
      amountIn: bigint(order.amountIn),
      side: number(order.side),
      expiry: number(order.expiry),
      blockNumber: number(order.blockNumber),
      timestamp: order.timestamp == null ? undefined : number(order.timestamp),
    })),
    settlements: (raw?.settledTrades ?? []).map((settlement: any) => ({
      ...settlement,
      executionPrice: bigint(settlement.executionPrice),
      fxrpAmount: bigint(settlement.fxrpAmount),
      quoteAmount: bigint(settlement.quoteAmount),
      ftsoPrice: settlement.ftsoPrice == null ? undefined : bigint(settlement.ftsoPrice),
      blockNumber: number(settlement.blockNumber),
      timestamp: settlement.timestamp == null ? undefined : number(settlement.timestamp),
    })),
    metrics: {
      volume24h: bigint(metrics.userVolume24hQuote ?? 0),
      activeOrders: number(metrics.activeOrdersCount),
      settledTrades: number(metrics.settledTradesCount),
    },
    freshness: raw?.indexer ?? null,
  };
}

async function fetchPortfolio(address: string, signal?: AbortSignal): Promise<PortfolioResponse> {
  const response = await fetch(`${BACKEND_URL}/portfolio/${address}`, { signal });
  if (!response.ok) throw new Error(`Backend returned ${response.status}`);
  return parsePortfolio(await response.json());
}

export const useActivity = () => {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: address ? portfolioQueryKey(address) : ['portfolio', 'disconnected'],
    queryFn: ({ signal }) => fetchPortfolio(address!, signal),
    enabled: !!address,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
    staleTime: 2_000,
    retry: 1,
  });

  const emptyMetrics: PortfolioMetrics = { volume24h: 0n, activeOrders: 0, settledTrades: 0 };
  const refresh = async (_isBackground = false) => {
    if (!address) {
      queryClient.removeQueries({ queryKey: ['portfolio'] });
      return;
    }
    await query.refetch({ cancelRefetch: true });
  };

  return {
    orders: address ? query.data?.orders ?? [] : [],
    settlements: address ? query.data?.settlements ?? [] : [],
    metrics: address ? query.data?.metrics ?? emptyMetrics : emptyMetrics,
    freshness: address ? query.data?.freshness ?? null : null,
    isLoading: !!address && query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refresh,
  };
};

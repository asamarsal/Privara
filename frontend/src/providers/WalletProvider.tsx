import { createConfig, http, WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode } from 'react';
import { injected } from 'wagmi/connectors';

export const coston2 = {
  id: 114,
  name: 'Coston2',
  nativeCurrency: { name: 'Coston Flare', symbol: 'C2FLR', decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_COSTON2_RPC_URL || 'https://coston2-api.flare.network/ext/C/rpc'] },
  },
  blockExplorers: {
    default: { name: 'Coston2 Explorer', url: process.env.NEXT_PUBLIC_COSTON2_EXPLORER_URL || 'https://coston2-explorer.flare.network' },
  },
} as const;

const queryClient = new QueryClient();

export const config = createConfig({
  chains: [coston2],
  connectors: [injected()],
  transports: {
    [coston2.id]: http(),
  },
  ssr: true,
});

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
};

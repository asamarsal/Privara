import { createConfig, http, WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode } from 'react';
import { injected } from 'wagmi/connectors';
import { deployment } from '../config/deployment';

export const coston2 = {
  id: 114,
  name: 'Coston2',
  nativeCurrency: { name: 'Coston Flare', symbol: 'C2FLR', decimals: 18 },
  rpcUrls: {
    default: { http: [deployment.rpcUrl] },
  },
  blockExplorers: {
    default: { name: 'Coston2 Explorer', url: deployment.explorerUrl },
  },
} as const;

const queryClient = new QueryClient();

export const config = createConfig({
  chains: [coston2],
  connectors: [injected()],
  transports: {
    [coston2.id]: http(coston2.rpcUrls.default.http[0]),
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

import dynamic from 'next/dynamic';
import React from 'react';

const WalletProviderNoSSR = dynamic(() => import('../providers/WalletProvider').then(mod => mod.WalletProvider), {
  ssr: false
});

export const ClientWalletProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <WalletProviderNoSSR>
      {children}
    </WalletProviderNoSSR>
  );
};

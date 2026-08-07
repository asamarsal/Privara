import React from 'react';
import { Layout } from './Layout';
import { WalletProvider } from '../providers/WalletProvider';
import { ToastProvider } from './ToastContext';
import { ThemeProvider } from '../contexts/ThemeContext';

export default function AppWrapper({ Component, pageProps }: any) {
  return (
    <ThemeProvider>
      <WalletProvider>
        <ToastProvider>
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </ToastProvider>
      </WalletProvider>
    </ThemeProvider>
  );
}

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useState, useEffect } from 'react';

export const useWallet = () => {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return {
    address: address || '',
    isConnected: mounted ? isConnected : false,
    chainId,
    connect: () => connect({ connector: connectors[0] }),
    disconnect: () => disconnect(),
  };
};

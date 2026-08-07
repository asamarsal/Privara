import { useAccount, useConnect, useDisconnect } from 'wagmi';

export const useWallet = () => {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  return {
    address: address || '',
    isConnected,
    chainId,
    connect: () => connect({ connector: connectors[0] }),
    disconnect: () => disconnect(),
  };
};

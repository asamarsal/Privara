import { useAccount, useSwitchChain } from 'wagmi';
import { coston2 } from '../providers/WalletProvider';
import { useState, useEffect } from 'react';

export const useNetwork = () => {
  const { chainId, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isCorrectNetwork = !mounted || !isConnected || chainId === coston2.id;

  return {
    isCorrectNetwork,
    switchToCoston2: () => switchChain({ chainId: coston2.id }),
  };
};

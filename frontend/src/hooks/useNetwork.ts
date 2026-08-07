import { useAccount, useSwitchChain } from 'wagmi';
import { coston2 } from '../providers/WalletProvider';

export const useNetwork = () => {
  const { chainId, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();

  const isCorrectNetwork = !isConnected || chainId === coston2.id;

  return {
    isCorrectNetwork,
    switchToCoston2: () => switchChain({ chainId: coston2.id }),
  };
};

import { useReadContracts } from 'wagmi';
import { useWallet } from './useWallet';
import { parseAbi } from 'viem';

const vaultAbi = parseAbi([
  'function balanceOf(address token, address user) view returns (uint256)'
]);

export const useVaultBalance = () => {
  const { address } = useWallet();
  const vaultAddress = "0xa479Bc0C4B000D0dcD6FaC3BB9E71B830eBE048E";
  const fxrpAddress = "0x12967a98792fc53Fb39E91d9B69917B5D32fb011";
  const usdt0Address = "0xDC7E830282489f5e461C4bfC0deE292fD9591C86";

  const { data, isError, isLoading, refetch } = useReadContracts({
    contracts: [
      {
        address: vaultAddress,
        abi: vaultAbi,
        functionName: 'balanceOf',
        args: [fxrpAddress, address as `0x${string}`],
      },
      {
        address: vaultAddress,
        abi: vaultAbi,
        functionName: 'balanceOf',
        args: [usdt0Address, address as `0x${string}`],
      }
    ],
    query: {
      enabled: !!address && !!vaultAddress && !!fxrpAddress && !!usdt0Address,
    }
  });

  const fxrpBalance = data?.[0].result as bigint | undefined;
  const usdt0Balance = data?.[1].result as bigint | undefined;

  const formatBalance = (bal?: bigint) => {
    if (bal === undefined) return '0.00';
    // 18 decimals conversion, keep 2 decimal places for display
    const etherStr = bal.toString().padStart(19, '0');
    const whole = etherStr.slice(0, -18) || '0';
    const fraction = etherStr.slice(-18).slice(0, 2);
    return `${whole}.${fraction}`;
  };

  return {
    fxrpBalance,
    usdt0Balance,
    formattedFxrp: formatBalance(fxrpBalance),
    formattedUsdt0: formatBalance(usdt0Balance),
    isLoading,
    isError,
    refetch,
  };
};

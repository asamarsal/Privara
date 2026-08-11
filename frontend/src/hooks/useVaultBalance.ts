import { useReadContracts } from 'wagmi';
import { useWallet } from './useWallet';
import { parseAbi } from 'viem';
import { deployment } from '../config/deployment';

const vaultAbi = parseAbi([
  'function balanceOf(address token, address user) view returns (uint256)',
  'function lockedBalanceOf(address token, address user) view returns (uint256)',
  'function availableBalanceOf(address token, address user) view returns (uint256)'
]);

export const useVaultBalance = () => {
  const { address } = useWallet();
  const { vault: vaultAddress, fxrp: fxrpAddress, usdt0: usdt0Address } = deployment;

  const { data, isError, isLoading, refetch } = useReadContracts({
    contracts: [
      ...[fxrpAddress, usdt0Address].flatMap(tokenAddress => [
        { address: vaultAddress, abi: vaultAbi, functionName: 'balanceOf' as const, args: [tokenAddress, address as `0x${string}`] },
        { address: vaultAddress, abi: vaultAbi, functionName: 'lockedBalanceOf' as const, args: [tokenAddress, address as `0x${string}`] },
        { address: vaultAddress, abi: vaultAbi, functionName: 'availableBalanceOf' as const, args: [tokenAddress, address as `0x${string}`] },
      ])
    ],
    query: {
      enabled: !!address && !!vaultAddress && !!fxrpAddress && !!usdt0Address,
    }
  });

  const fxrpBalance = data?.[0].result as bigint | undefined;
  const fxrpLockedBalance = data?.[1].result as bigint | undefined;
  const fxrpAvailableBalance = data?.[2].result as bigint | undefined;
  const usdt0Balance = data?.[3].result as bigint | undefined;
  const usdt0LockedBalance = data?.[4].result as bigint | undefined;
  const usdt0AvailableBalance = data?.[5].result as bigint | undefined;
  const contractError = data?.find(result => result.status === 'failure')?.error;

  const formatBalance = (bal?: bigint) => {
    if (bal === undefined) return '0.00';
    // 18 decimals conversion, keep 2 decimal places for display
    const etherStr = bal.toString().padStart(19, '0');
    const whole = etherStr.slice(0, -18) || '0';
    const fraction = etherStr.slice(-18).slice(0, 2);
    return `${whole}.${fraction}`;
  };

  return {
    // Legacy names remain aliases for total balances.
    fxrpBalance,
    usdt0Balance,
    fxrpTotalBalance: fxrpBalance,
    usdt0TotalBalance: usdt0Balance,
    fxrpLockedBalance,
    usdt0LockedBalance,
    fxrpAvailableBalance,
    usdt0AvailableBalance,
    formattedFxrp: formatBalance(fxrpBalance),
    formattedUsdt0: formatBalance(usdt0Balance),
    formattedFxrpLocked: formatBalance(fxrpLockedBalance),
    formattedUsdt0Locked: formatBalance(usdt0LockedBalance),
    formattedFxrpAvailable: formatBalance(fxrpAvailableBalance),
    formattedUsdt0Available: formatBalance(usdt0AvailableBalance),
    isLoading,
    isError: isError || !!contractError,
    error: contractError,
    refetch,
  };
};

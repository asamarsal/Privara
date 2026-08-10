import { useReadContract } from 'wagmi';
import { parseAbi, formatUnits, parseEther } from 'viem';

const ftsoV2Abi = parseAbi([
  'function getFeedById(bytes21 _feedId) external payable returns (uint256 _value, int8 _decimals, uint64 _timestamp)'
]);

export function useFtsoPrice() {
  const ftsoAddress = process.env.NEXT_PUBLIC_FTSO_V2_ADDRESS as `0x${string}`;
  const feedId = process.env.NEXT_PUBLIC_XRP_USD_FEED_ID as `0x${string}`;

  const { data, isError, isLoading } = useReadContract({
    address: ftsoAddress,
    abi: ftsoV2Abi,
    functionName: 'getFeedById',
    args: [feedId],
    query: {
      refetchInterval: 10000, // Refetch every 10 seconds
    }
  });

  // Default mock price if loading or error
  let priceFormatted = '1.0658';
  let priceBigInt = parseEther('1.0658');

  if (data) {
    const [value, decimals, timestamp] = data as [bigint, number, bigint];
    
    // FTSO decimals are usually negative, e.g., -5, meaning we need to shift by 5
    // But IFtsoV2 usually returns positive decimals like 5, meaning the value has 5 decimal places.
    // e.g. value = 106580, decimals = 5 -> 1.0658
    // viem's formatUnits takes the number of decimals
    
    // Convert int8 decimals to absolute number (viem might return it as number or bigint)
    const dec = Math.abs(Number(decimals)); 
    
    priceFormatted = formatUnits(value, dec);
    
    // Convert the exact price to an 18-decimal bigint for standard math in our app
    priceBigInt = parseEther(priceFormatted);
  }

  return {
    priceFormatted,
    priceBigInt,
    isLoading,
    isError
  };
}

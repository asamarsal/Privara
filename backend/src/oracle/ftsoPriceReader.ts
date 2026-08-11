import { ethers } from "ethers";

const FtsoV2ABI = [
  "function getFeedById(bytes21 _feedId) external view returns (uint256 _value, int8 _decimals, uint64 _timestamp)",
];

export interface OraclePrice {
  price: bigint;
  timestamp: number;
}

export interface PriceReader {
  readPrice(): Promise<OraclePrice>;
}

/** Normalize an unsigned FTSO value to Privara's 18-decimal price convention. */
export function normalizeFtsoPrice(value: bigint, decimals: number): bigint {
  if (value <= 0n) throw new Error("FTSO price must be nonzero");
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) {
    throw new Error(`Unsupported FTSO decimals: ${decimals}`);
  }
  const normalized = decimals === 18
    ? value
    : decimals < 18
      ? value * (10n ** BigInt(18 - decimals))
      : value / (10n ** BigInt(decimals - 18));
  if (normalized <= 0n) throw new Error("FTSO price rounds to zero at 18 decimals");
  return normalized;
}

export class FtsoPriceReader implements PriceReader {
  private readonly contract: ethers.Contract;

  constructor(
    provider: ethers.Provider,
    ftsoAddress: string,
    private readonly feedId: string,
    private readonly maxAgeSeconds: number,
    private readonly now: () => number = () => Math.floor(Date.now() / 1000),
  ) {
    this.contract = new ethers.Contract(ftsoAddress, FtsoV2ABI, provider);
  }

  public async readPrice(): Promise<OraclePrice> {
    const result = await this.contract.getFeedById(this.feedId);
    const timestamp = Number(result[2]);
    const now = this.now();
    if (!Number.isSafeInteger(timestamp) || timestamp <= 0) throw new Error("FTSO timestamp is invalid");
    if (timestamp > now) throw new Error("FTSO timestamp is in the future");
    if (now - timestamp > this.maxAgeSeconds) throw new Error("FTSO price is stale");
    return { price: normalizeFtsoPrice(BigInt(result[0]), Number(result[1])), timestamp };
  }
}

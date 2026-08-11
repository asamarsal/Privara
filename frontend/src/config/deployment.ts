export type Address = `0x${string}`;

function address(value: string | undefined, fallback: Address, name: string): Address {
  const resolved = value || fallback;
  if (!/^0x[a-fA-F0-9]{40}$/.test(resolved) || /^0x0{40}$/i.test(resolved)) throw new Error(`Invalid ${name} address`);
  return resolved as Address;
}

function bytes21(value: string | undefined, fallback: `0x${string}`, name: string): `0x${string}` {
  const resolved = value || fallback;
  if (!/^0x[a-fA-F0-9]{42}$/.test(resolved)) throw new Error(`Invalid ${name} bytes21 value`);
  return resolved as `0x${string}`;
}

export const deployment = {
  chainId: 114,
  network: 'Coston2',
  vault: address(process.env.NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS, '0x295ACfEce01513a360EA54768eB6efAf337a303E', 'vault'),
  fxrp: address(process.env.NEXT_PUBLIC_FXRP_TOKEN_ADDRESS, '0x883610C496161486b73412083073126d36167377', 'FXRP'),
  usdt0: address(process.env.NEXT_PUBLIC_USDT0_TOKEN_ADDRESS, '0x9d361B93A298CEe2bd3Ad85318EC82efe1aFdaC2', 'USDT0'),
  ftsoV2: address(process.env.NEXT_PUBLIC_FTSO_V2_ADDRESS, '0x3d893C53D9e8056135C26C8c638B76C8b60Df726', 'FTSOv2'),
  feedId: bytes21(process.env.NEXT_PUBLIC_XRP_USD_FEED_ID, '0x015852502f55534400000000000000000000000000', 'XRP/USD feed ID'),
  rpcUrl: process.env.NEXT_PUBLIC_COSTON2_RPC_URL || 'https://coston2-api.flare.network/ext/C/rpc',
  explorerUrl: process.env.NEXT_PUBLIC_COSTON2_EXPLORER_URL || 'https://coston2-explorer.flare.network',
  backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001',
  deployBlock: 33902106n,
  tokenDecimals: { FXRP: 18, USDT0: 18 },
  priceDecimals: 18,
  fccMode: 'local_mock' as const,
  version: process.env.NEXT_PUBLIC_DEPLOYMENT_VERSION || 'v2',
} as const;

const canonicalV2 = {
  vault: '0x295ACfEce01513a360EA54768eB6efAf337a303E',
  fxrp: '0x883610C496161486b73412083073126d36167377',
  usdt0: '0x9d361B93A298CEe2bd3Ad85318EC82efe1aFdaC2',
  ftsoV2: '0x3d893C53D9e8056135C26C8c638B76C8b60Df726',
  feedId: '0x015852502f55534400000000000000000000000000',
} as const;

const same = (left: string, right: string) => left.toLowerCase() === right.toLowerCase();

// Fail closed when any public environment override points away from the verified
// canonical V2 manifest. Runtime wallet/network checks still apply separately.
export const isAuditedV2Deployment = deployment.version === 'v2'
  && deployment.chainId === 114
  && same(deployment.vault, canonicalV2.vault)
  && same(deployment.fxrp, canonicalV2.fxrp)
  && same(deployment.usdt0, canonicalV2.usdt0)
  && same(deployment.ftsoV2, canonicalV2.ftsoV2)
  && same(deployment.feedId, canonicalV2.feedId);

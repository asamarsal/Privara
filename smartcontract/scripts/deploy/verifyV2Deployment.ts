import { ethers } from "hardhat";
import { readDraft, writeDraft, writeFinal } from "./manifest";

async function main() {
  const draft = readDraft();
  const network = await ethers.provider.getNetwork();
  const isCoston2 = network.chainId === 114n;
  if (!isCoston2 && process.env.ALLOW_LOCAL_DEPLOY !== "true") throw new Error("Verification must run on Coston2 unless ALLOW_LOCAL_DEPLOY=true");
  if (!draft.deploymentRunId || !draft.owner || !draft.contracts?.PrivaraVault || !draft.contracts?.FccVerifier || !draft.tokens?.FXRP || !draft.tokens?.USDT0 || !draft.fcc?.authorizedSigner || !draft.oracle?.FtsoV2 || !draft.oracle?.xrpUsdFeedId) throw new Error("V2 draft manifest is incomplete");
  if (draft.tokens.FXRP.toLowerCase() === draft.tokens.USDT0.toLowerCase()) throw new Error("V2 draft token addresses must be distinct");

  const Vault = await ethers.getContractFactory("PrivaraVault");
  const vault = Vault.attach(draft.contracts.PrivaraVault);
  const Verifier = await ethers.getContractFactory("FccVerifier");
  const verifier = Verifier.attach(draft.contracts.FccVerifier);
  const tokenAbi = ["function symbol() view returns(string)", "function decimals() view returns(uint8)", "function owner() view returns(address)", "function faucetAmount() view returns(uint256)", "function maxSupply() view returns(uint256)"];
  const fxrp = new ethers.Contract(draft.tokens.FXRP, tokenAbi, ethers.provider);
  const usdt0 = new ethers.Contract(draft.tokens.USDT0, tokenAbi, ethers.provider);

  const vaultCode = await ethers.provider.getCode(draft.contracts.PrivaraVault);
  const verifierCode = await ethers.provider.getCode(draft.contracts.FccVerifier);
  const fxrpCode = await ethers.provider.getCode(draft.tokens.FXRP);
  const usdt0Code = await ethers.provider.getCode(draft.tokens.USDT0);
  const checks: Record<string, boolean> = {
    chainId: Number(network.chainId) === draft.chainId,
    vaultCode: vaultCode !== "0x",
    verifierCode: verifierCode !== "0x",
    fxrpCode: fxrpCode !== "0x",
    usdt0Code: usdt0Code !== "0x",
    vaultCodeHash: ethers.keccak256(vaultCode) === draft.codeHashes?.PrivaraVault,
    verifierCodeHash: ethers.keccak256(verifierCode) === draft.codeHashes?.FccVerifier,
    fxrpCodeHash: ethers.keccak256(fxrpCode) === draft.deployments?.FXRP?.codeHash,
    usdt0CodeHash: ethers.keccak256(usdt0Code) === draft.deployments?.USDT0?.codeHash,
    fxrpSymbol: await fxrp.symbol() === "FXRP",
    usdt0Symbol: await usdt0.symbol() === "USDT0",
    fxrpDecimals: Number(await fxrp.decimals()) === 18,
    usdt0Decimals: Number(await usdt0.decimals()) === 18,
    fxrpOwner: (await fxrp.owner()).toLowerCase() === draft.owner.toLowerCase(),
    usdt0Owner: (await usdt0.owner()).toLowerCase() === draft.owner.toLowerCase(),
    fxrpFaucet: (await fxrp.faucetAmount()).toString() === draft.deployments?.FXRP?.faucetAmount,
    usdt0Faucet: (await usdt0.faucetAmount()).toString() === draft.deployments?.USDT0?.faucetAmount,
    fxrpCap: (await fxrp.maxSupply()).toString() === draft.deployments?.FXRP?.maxSupply,
    usdt0Cap: (await usdt0.maxSupply()).toString() === draft.deployments?.USDT0?.maxSupply,
    vaultFxrp: (await vault.FXRP()).toLowerCase() === draft.tokens.FXRP.toLowerCase(),
    vaultUsdt0: (await vault.USDT0()).toLowerCase() === draft.tokens.USDT0.toLowerCase(),
    vaultVerifier: (await vault.verifier()).toLowerCase() === draft.contracts.FccVerifier.toLowerCase(),
    vaultSigner: (await vault.authorizedVerifier()).toLowerCase() === draft.fcc.authorizedSigner.toLowerCase(),
    vaultFtso: (await vault.ftsoV2()).toLowerCase() === draft.oracle.FtsoV2.toLowerCase(),
    feedId: (await vault.xrpUsdFeedId()).toLowerCase() === draft.oracle.xrpUsdFeedId.toLowerCase(),
    maxDeviation: Number(await vault.MAX_DEVIATION_BPS()) === 200,
    maxOracleAge: Number(await vault.MAX_ORACLE_AGE()) === 300,
    priceScale: await vault.PRICE_SCALE() === 10n ** 18n,
    verifierReserved: await verifier.reservedOfficialVerifier() === ethers.ZeroAddress,
  };

  const mockKey = process.env.MOCK_FCC_SIGNER_PRIVATE_KEY;
  if (!mockKey) throw new Error("MOCK_FCC_SIGNER_PRIVATE_KEY is required to verify signer parity");
  checks.mockSignerParity = new ethers.Wallet(mockKey).address.toLowerCase() === draft.fcc.authorizedSigner.toLowerCase();

  const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
  if (failures.length) throw new Error(`V2 verification failed: ${failures.join(", ")}`);

  const verified = {
    ...draft,
    version: isCoston2 ? "v2" : "v2-local-verified",
    verifiedAt: new Date().toISOString(),
    verification: checks,
    examples: draft.examples || {},
  };
  writeDraft(verified);
  if (isCoston2) writeFinal(verified);
  console.log(JSON.stringify({ status: "verified", promotedToCanonical: isCoston2, checks }, null, 2));
}

main().catch(error => { console.error(error); process.exitCode = 1; });

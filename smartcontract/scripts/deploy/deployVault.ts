import { ethers } from "hardhat";
import { readDraft, writeDraft } from "./manifest";

function requiredAddress(value: string | undefined, label: string): string {
  if (!value || !ethers.isAddress(value) || value === ethers.ZeroAddress) throw new Error(`Missing or invalid ${label}`);
  return ethers.getAddress(value);
}

function resolveConsistentAddress(envValue: string | undefined, draftValue: string | undefined, label: string): string {
  const fromEnv = envValue ? requiredAddress(envValue, label) : undefined;
  const fromDraft = draftValue ? requiredAddress(draftValue, `${label} draft value`) : undefined;
  if (fromEnv && fromDraft && fromEnv !== fromDraft) throw new Error(`${label} conflicts with the current deployment draft`);
  return requiredAddress(fromEnv || fromDraft, label);
}

async function main() {
  const network = await ethers.provider.getNetwork();
  if (network.chainId !== 114n && process.env.ALLOW_LOCAL_DEPLOY !== "true") throw new Error("This script targets Coston2. Set ALLOW_LOCAL_DEPLOY=true only for local verification.");
  const draft = readDraft();
  if (!draft.deploymentRunId) throw new Error("Missing deploymentRunId; deploy V2 mock assets first");
  if (Number(draft.chainId) !== Number(network.chainId)) throw new Error("Deployment draft chainId does not match the active network");
  const fxrpAddress = resolveConsistentAddress(process.env.FXRP_TOKEN_ADDRESS, draft.tokens?.FXRP, "FXRP_TOKEN_ADDRESS");
  const usdt0Address = resolveConsistentAddress(process.env.USDT0_TOKEN_ADDRESS, draft.tokens?.USDT0, "USDT0_TOKEN_ADDRESS");
  if (fxrpAddress === usdt0Address) throw new Error("FXRP and USDT0 must be different contracts");
  const ftsoV2Address = resolveConsistentAddress(process.env.FTSO_V2_ADDRESS, draft.oracle?.FtsoV2, "FTSO_V2_ADDRESS");
  const xrpUsdFeedId = process.env.XRP_USD_FEED_ID || draft.oracle?.xrpUsdFeedId;
  if (!xrpUsdFeedId || !/^0x[a-fA-F0-9]{42}$/.test(xrpUsdFeedId)) throw new Error("Missing or invalid XRP_USD_FEED_ID bytes21");
  const authorizedSigner = resolveConsistentAddress(process.env.PRIVARA_AUTHORIZED_ATTESTATION_SIGNER, draft.fcc?.authorizedSigner, "PRIVARA_AUTHORIZED_ATTESTATION_SIGNER");
  const verifierAddress = resolveConsistentAddress(process.env.PRIVARA_VERIFIER_ADAPTER_ADDRESS, draft.verifier?.address, "PRIVARA_VERIFIER_ADAPTER_ADDRESS");
  const mockKey = process.env.MOCK_FCC_SIGNER_PRIVATE_KEY;
  if (!mockKey || new ethers.Wallet(mockKey).address !== authorizedSigner) throw new Error("Mock FCC signer key/address parity check failed before vault deployment");

  const erc20 = ["function symbol() view returns(string)", "function decimals() view returns(uint8)"];
  const fxrp = new ethers.Contract(fxrpAddress, erc20, ethers.provider);
  const usdt0 = new ethers.Contract(usdt0Address, erc20, ethers.provider);
  if (await fxrp.symbol() !== "FXRP" || Number(await fxrp.decimals()) !== 18) throw new Error("FXRP demo token metadata mismatch");
  if (await usdt0.symbol() !== "USDT0" || Number(await usdt0.decimals()) !== 18) throw new Error("USDT0 demo token metadata mismatch");
  if (await ethers.provider.getCode(verifierAddress) === "0x") throw new Error("Verifier adapter has no bytecode");
  if (await ethers.provider.getCode(ftsoV2Address) === "0x") throw new Error("FTSOv2 address has no bytecode");

  const [deployer] = await ethers.getSigners();
  const Vault = await ethers.getContractFactory("PrivaraVault");
  const vault = await Vault.deploy(fxrpAddress, usdt0Address, ftsoV2Address, verifierAddress, authorizedSigner, xrpUsdFeedId);
  await vault.waitForDeployment();
  const tx = vault.deploymentTransaction();
  if (!tx) throw new Error("Vault deployment transaction unavailable");
  const receipt = await tx.wait();
  if (!receipt || receipt.status !== 1) throw new Error("Vault deployment reverted");
  const address = await vault.getAddress();
  const code = await ethers.provider.getCode(address);
  if (code === "0x") throw new Error("Vault has no runtime bytecode");

  if ((await vault.FXRP()).toLowerCase() !== fxrpAddress.toLowerCase()) throw new Error("Vault FXRP mismatch");
  if ((await vault.USDT0()).toLowerCase() !== usdt0Address.toLowerCase()) throw new Error("Vault USDT0 mismatch");
  if ((await vault.verifier()).toLowerCase() !== verifierAddress.toLowerCase()) throw new Error("Vault verifier mismatch");
  if ((await vault.authorizedVerifier()).toLowerCase() !== authorizedSigner.toLowerCase()) throw new Error("Vault signer mismatch");

  writeDraft({
    network: network.chainId === 114n ? "coston2" : "hardhat-local",
    chainId: Number(network.chainId),
    version: "v2-draft",
    deployedAt: new Date().toISOString(),
    deployBlock: receipt.blockNumber,
    deployTxHash: tx.hash,
    contracts: { PrivaraVault: address, FccVerifier: verifierAddress },
    tokens: { FXRP: fxrpAddress, USDT0: usdt0Address, fxrpSymbol: "FXRP", usdt0Symbol: "USDT0", fxrpDecimals: 18, usdt0Decimals: 18, assetMode: "coston2_mock" },
    oracle: { FtsoV2: ftsoV2Address, xrpUsdFeedId, maxDeviationBps: 200, maxAgeSeconds: 300 },
    fcc: { infraMode: "local_mock", verifierMode: "local_eip191", authorizedSigner, extensionId: "" },
    codeHashes: { PrivaraVault: ethers.keccak256(code), FccVerifier: ethers.keccak256(await ethers.provider.getCode(verifierAddress)) },
    owner: deployer.address,
    examples: {},
  });
  console.log(JSON.stringify({ vault: address, deployBlock: receipt.blockNumber, txHash: tx.hash, draft: "deployments/coston2-v2-draft.json" }, null, 2));
}

main().catch(error => { console.error(error); process.exitCode = 1; });

import { ethers } from "hardhat";
import { draftPath, readDraft, writeDraft } from "./manifest";

function resolveAuthorizedSigner(): string {
  const privateKey = process.env.MOCK_FCC_SIGNER_PRIVATE_KEY;
  const configuredAddress = process.env.PRIVARA_AUTHORIZED_ATTESTATION_SIGNER;
  if (!privateKey) throw new Error("MOCK_FCC_SIGNER_PRIVATE_KEY is required for an explicit local_mock deployment");
  if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey)) throw new Error("MOCK_FCC_SIGNER_PRIVATE_KEY must be a 32-byte 0x-prefixed hex value");
  const derived = new ethers.Wallet(privateKey).address;
  if (configuredAddress && (!ethers.isAddress(configuredAddress) || ethers.getAddress(configuredAddress) !== derived)) {
    throw new Error("PRIVARA_AUTHORIZED_ATTESTATION_SIGNER does not match MOCK_FCC_SIGNER_PRIVATE_KEY");
  }
  return derived;
}

async function main() {
  const network = await ethers.provider.getNetwork();
  if (network.chainId !== 114n && process.env.ALLOW_LOCAL_DEPLOY !== "true") throw new Error("This script targets Coston2. Set ALLOW_LOCAL_DEPLOY=true only for local verification.");
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("DEPLOYER_PRIVATE_KEY is required for deployment");
  const draft = readDraft();
  if (!draft.deploymentRunId || !draft.tokens?.FXRP || !draft.tokens?.USDT0) throw new Error("Deploy V2 mock assets first to initialize a fresh deployment draft");
  if (Number(draft.chainId) !== Number(network.chainId)) throw new Error("Deployment draft chainId does not match the active network");
  const authorizedSigner = resolveAuthorizedSigner();
  const Verifier = await ethers.getContractFactory("FccVerifier");
  const verifier = await Verifier.deploy(ethers.ZeroAddress);
  await verifier.waitForDeployment();
  const tx = verifier.deploymentTransaction();
  if (!tx) throw new Error("Verifier deployment transaction unavailable");
  const receipt = await tx.wait();
  if (!receipt || receipt.status !== 1) throw new Error("Verifier deployment reverted");
  const address = await verifier.getAddress();
  const code = await ethers.provider.getCode(address);
  if (code === "0x") throw new Error("Verifier has no runtime bytecode");
  if ((await verifier.reservedOfficialVerifier()) !== ethers.ZeroAddress) throw new Error("Reserved official verifier must be zero in local mode");
  writeDraft({
    verifier: { address, txHash: tx.hash, deployBlock: receipt.blockNumber, codeHash: ethers.keccak256(code), mode: "local_eip191", reservedOfficialVerifier: ethers.ZeroAddress },
    fcc: { infraMode: "local_mock", verifierMode: "local_eip191", authorizedSigner, extensionId: "" },
  });
  console.log(JSON.stringify({ verifier: address, authorizedSigner, deployer: deployer.address, draft: draftPath }, null, 2));
}

main().catch(error => { console.error(error); process.exitCode = 1; });

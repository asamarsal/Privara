import { ethers } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const fxrpAddress = process.env.FXRP_TOKEN_ADDRESS;
  const usdt0Address = process.env.USDT0_TOKEN_ADDRESS;
  const ftsoV2Address = process.env.FTSO_V2_ADDRESS;
  const xrpUsdFeedId = process.env.XRP_USD_FEED_ID;
  const authorizedVerifier = process.env.FCC_VERIFIER_ADDRESS; // 0xdbFc...
  const verifierContract = process.env.AUTHORIZED_VERIFIER_ADDRESS; // 0x56a4...

  if (!fxrpAddress || fxrpAddress === ethers.ZeroAddress) throw new Error("Missing or invalid FXRP_TOKEN_ADDRESS");
  if (!usdt0Address || usdt0Address === ethers.ZeroAddress) throw new Error("Missing or invalid USDT0_TOKEN_ADDRESS");
  if (!ftsoV2Address || ftsoV2Address === ethers.ZeroAddress) throw new Error("Missing or invalid FTSO_V2_ADDRESS");
  if (!xrpUsdFeedId) throw new Error("Missing XRP_USD_FEED_ID");
  if (!authorizedVerifier || authorizedVerifier === ethers.ZeroAddress) throw new Error("Missing or invalid FCC_VERIFIER_ADDRESS");
  if (!verifierContract || verifierContract === ethers.ZeroAddress) throw new Error("Missing or invalid AUTHORIZED_VERIFIER_ADDRESS (FccVerifier)");

  console.log("Deploying PrivaraVault with the following configuration:");
  console.log("  FXRP:", fxrpAddress);
  console.log("  USDT0:", usdt0Address);
  console.log("  FTSOv2:", ftsoV2Address);
  console.log("  Verifier Contract:", verifierContract);
  console.log("  Authorized Signer:", authorizedVerifier);
  console.log("  Feed ID:", xrpUsdFeedId);

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const PrivaraVault = await ethers.getContractFactory("PrivaraVault");
  const vault = await PrivaraVault.deploy(
    fxrpAddress,
    usdt0Address,
    ftsoV2Address,
    verifierContract,
    authorizedVerifier,
    xrpUsdFeedId
  );

  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  const tx = vault.deploymentTransaction();
  const deployBlock = tx?.blockNumber || 0;

  console.log("PrivaraVault deployed to:", vaultAddress);

  // Write to deployments/coston2.json
  const deploymentsDir = path.join(__dirname, "../../../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const coston2JsonPath = path.join(deploymentsDir, "coston2.json");
  let coston2Json: any = {
    network: "coston2",
    chainId: 114,
    deployedAt: new Date().toISOString(),
    deployBlock: deployBlock,
    contracts: {
      PrivaraVault: vaultAddress,
      FccVerifier: verifierContract
    },
    tokens: {
      FXRP: fxrpAddress,
      USDT0: usdt0Address
    },
    oracle: {
      FtsoV2: ftsoV2Address,
      xrpUsdFeedId: xrpUsdFeedId,
      maxDeviationBps: 200
    },
    fcc: {
      extensionId: process.env.FCC_EXTENSION_ID || "",
      infraMode: "local_mock"
    },
    examples: {
      orderCommittedTxHash: "",
      orderSettledTxHash: ""
    }
  };

  // If coston2.json already exists, merge it
  if (fs.existsSync(coston2JsonPath)) {
    const existing = JSON.parse(fs.readFileSync(coston2JsonPath, 'utf8'));
    coston2Json = { ...existing, ...coston2Json };
  }

  fs.writeFileSync(coston2JsonPath, JSON.stringify(coston2Json, null, 2));
  console.log("coston2.json written successfully");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

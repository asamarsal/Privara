import { ethers } from 'hardhat';

async function main() {
  const fccVerifierAddress = process.env.FCC_VERIFIER_ADDRESS;
  
  if (!fccVerifierAddress || fccVerifierAddress === ethers.ZeroAddress) {
    throw new Error("Missing or invalid FCC_VERIFIER_ADDRESS");
  }

  console.log("Deploying FccVerifier with verifier:", fccVerifierAddress);

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const FccVerifier = await ethers.getContractFactory("FccVerifier");
  const verifier = await FccVerifier.deploy(fccVerifierAddress);
  await verifier.waitForDeployment();
  const address = await verifier.getAddress();

  console.log("FccVerifier deployed to:", address);
  console.log("Please update AUTHORIZED_VERIFIER_ADDRESS in your .env with this address.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

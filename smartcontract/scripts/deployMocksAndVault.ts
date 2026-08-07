import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: "../.env" });

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying mock tokens with account:", deployer.address);

  // Deploy Mock FXRP
  const fxrpFactory = await ethers.getContractFactory("MockERC20");
  const fxrp = await fxrpFactory.deploy("Mock FXRP", "FXRP");
  await fxrp.waitForDeployment();
  const fxrpAddress = await fxrp.getAddress();
  console.log("Mock FXRP deployed to:", fxrpAddress);

  // Deploy Mock USDT0
  const usdtFactory = await ethers.getContractFactory("MockERC20");
  const usdt = await usdtFactory.deploy("Mock USDT0", "USDT0");
  await usdt.waitForDeployment();
  const usdtAddress = await usdt.getAddress();
  console.log("Mock USDT0 deployed to:", usdtAddress);

  // also mint to deployer for backup
  const mintAmount = ethers.parseEther("10000");
  await fxrp.mint(deployer.address, mintAmount);
  await usdt.mint(deployer.address, mintAmount);
  console.log("Minted 10000 FXRP & USDT0 to deployer");

  // Re-deploy Vault
  const ftsoAddress = process.env.FTSO_V2_ADDRESS!;
  const verifierAddress = process.env.FCC_VERIFIER_ADDRESS!;
  const authorizedVerifier = process.env.AUTHORIZED_VERIFIER_ADDRESS!;
  const feedId = process.env.XRP_USD_FEED_ID!;

  console.log("Deploying new PrivaraVault...");
  const vaultFactory = await ethers.getContractFactory("PrivaraVault");
  const vault = await vaultFactory.deploy(
    fxrpAddress,
    usdtAddress,
    ftsoAddress,
    verifierAddress,
    authorizedVerifier,
    feedId
  );
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("New PrivaraVault deployed to:", vaultAddress);

  // Update .env file
  const envPath = path.join(__dirname, "../../.env");
  let envContent = fs.readFileSync(envPath, "utf8");
  
  envContent = envContent.replace(/FXRP_TOKEN_ADDRESS=.*/, `FXRP_TOKEN_ADDRESS=${fxrpAddress}`);
  envContent = envContent.replace(/NEXT_PUBLIC_FXRP_TOKEN_ADDRESS=.*/, `NEXT_PUBLIC_FXRP_TOKEN_ADDRESS=${fxrpAddress}`);
  
  envContent = envContent.replace(/USDT0_TOKEN_ADDRESS=.*/, `USDT0_TOKEN_ADDRESS=${usdtAddress}`);
  envContent = envContent.replace(/NEXT_PUBLIC_USDT0_TOKEN_ADDRESS=.*/, `NEXT_PUBLIC_USDT0_TOKEN_ADDRESS=${usdtAddress}`);
  
  envContent = envContent.replace(/VAULT_CONTRACT_ADDRESS=.*/g, `VAULT_CONTRACT_ADDRESS=${vaultAddress}`);
  envContent = envContent.replace(/NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS=.*/, `NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS=${vaultAddress}`);

  fs.writeFileSync(envPath, envContent);
  console.log(".env updated with new addresses.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

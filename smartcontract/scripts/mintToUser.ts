import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: "../.env" });

async function main() {
  const userAddress = "0xfeff727205fe524a3a8a16c404fec9cfe4124acd";
  const mintAmount = ethers.parseEther("10000");

  const fxrpAddress = process.env.FXRP_TOKEN_ADDRESS!;
  const usdtAddress = process.env.USDT0_TOKEN_ADDRESS!;

  const fxrp = await ethers.getContractAt("MockERC20", fxrpAddress);
  const usdt = await ethers.getContractAt("MockERC20", usdtAddress);

  console.log(`Minting 10000 tokens to ${userAddress}...`);
  await fxrp.mint(userAddress, mintAmount);
  await usdt.mint(userAddress, mintAmount);
  console.log("Success!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

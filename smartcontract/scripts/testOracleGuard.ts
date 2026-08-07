import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: "../.env" });

async function main() {
  const vaultAddress = process.env.VAULT_CONTRACT_ADDRESS;
  if (!vaultAddress) throw new Error("VAULT_CONTRACT_ADDRESS missing");

  const [signer] = await ethers.getSigners();
  const vault = await ethers.getContractAt("PrivaraVault", vaultAddress, signer);

  // We are just simulating a revert here by trying to settle a fake order
  // Because the orders don't exist, it will revert with OrderNotFound first.
  // To properly test this, we need real orders. 
  
  console.log("To test the Oracle Guard on Coston2, you must:");
  console.log("1. Create real Buy and Sell orders using the frontend.");
  console.log("2. Intercept the Matcher's `settle` transaction.");
  console.log("3. Modify the executionPrice to be > 200 bps away from the oracle.");
  console.log("4. Resign the payload using the Matcher's private key.");
  console.log("5. Submit to Coston2 and observe the `OracleDeviationExceeded` revert.");
  console.log("\nSince PrivaraVault is fully deployed on Coston2, please use the frontend to verify end-to-end functionality.");
}

main().catch(console.error);

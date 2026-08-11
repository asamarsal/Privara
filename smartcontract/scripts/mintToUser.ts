import { ethers } from "hardhat";

async function main() {
  const recipient = process.env.DEMO_RECIPIENT;
  const symbol = process.env.DEMO_TOKEN_SYMBOL;
  const amountText = process.env.DEMO_MINT_AMOUNT || "1000";
  if (!recipient || !ethers.isAddress(recipient)) throw new Error("DEMO_RECIPIENT must be a valid address");
  if (symbol !== "FXRP" && symbol !== "USDT0") throw new Error("DEMO_TOKEN_SYMBOL must be FXRP or USDT0");
  const tokenAddress = symbol === "FXRP" ? process.env.FXRP_TOKEN_ADDRESS : process.env.USDT0_TOKEN_ADDRESS;
  if (!tokenAddress || !ethers.isAddress(tokenAddress)) throw new Error(`${symbol} token address is missing`);
  const [signer] = await ethers.getSigners();
  const token = await ethers.getContractAt("PrivaraDemoToken", tokenAddress, signer);
  if ((await token.owner()).toLowerCase() !== signer.address.toLowerCase()) throw new Error("Configured signer is not token owner");
  if (await token.symbol() !== symbol || Number(await token.decimals()) !== 18) throw new Error("Token metadata mismatch");
  const amount = ethers.parseEther(amountText);
  const tx = await token.mint(recipient, amount);
  const receipt = await tx.wait();
  if (!receipt || receipt.status !== 1) throw new Error("Mint transaction reverted");
  console.log(JSON.stringify({ token: symbol, recipient: ethers.getAddress(recipient), amount: amountText, txHash: tx.hash, blockNumber: receipt.blockNumber }, null, 2));
}

main().catch(error => { console.error(error); process.exitCode = 1; });

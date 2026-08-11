import { ethers } from "hardhat";
import { randomUUID } from "crypto";
import { draftPath, resetDraft, writeDraft } from "./manifest";

async function deployToken(name: string, symbol: string, owner: string) {
  const Token = await ethers.getContractFactory("PrivaraDemoToken");
  const token = await Token.deploy(name, symbol, owner, ethers.parseEther("1000"), ethers.parseEther("10000000"));
  await token.waitForDeployment();
  const tx = token.deploymentTransaction();
  if (!tx) throw new Error(`${symbol} deployment transaction unavailable`);
  const receipt = await tx.wait();
  if (!receipt || receipt.status !== 1) throw new Error(`${symbol} deployment reverted`);
  const address = await token.getAddress();
  const code = await ethers.provider.getCode(address);
  if (code === "0x") throw new Error(`${symbol} has no runtime bytecode`);
  if (await token.symbol() !== symbol || Number(await token.decimals()) !== 18) throw new Error(`${symbol} metadata verification failed`);
  if ((await token.owner()).toLowerCase() !== owner.toLowerCase()) throw new Error(`${symbol} owner verification failed`);
  if (await token.faucetAmount() !== ethers.parseEther("1000")) throw new Error(`${symbol} faucet amount verification failed`);
  if (await token.maxSupply() !== ethers.parseEther("10000000")) throw new Error(`${symbol} max supply verification failed`);
  return { address, txHash: tx.hash, deployBlock: receipt.blockNumber, codeHash: ethers.keccak256(code), symbol, decimals: 18, owner, faucetAmount: ethers.parseEther("1000").toString(), maxSupply: ethers.parseEther("10000000").toString() };
}

async function main() {
  if ((await ethers.provider.getNetwork()).chainId !== 114n && process.env.ALLOW_LOCAL_DEPLOY !== "true") throw new Error("This script targets Coston2. Set ALLOW_LOCAL_DEPLOY=true only for local verification.");
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("DEPLOYER_PRIVATE_KEY is required for deployment");
  const deploymentRunId = randomUUID();
  resetDraft({ deploymentRunId, startedAt: new Date().toISOString() });
  const fxrp = await deployToken("Privara Demo FXRP", "FXRP", deployer.address);
  writeDraft({ deployments: { FXRP: fxrp } });
  const usdt0 = await deployToken("Privara Demo USDT0", "USDT0", deployer.address);
  if (fxrp.address.toLowerCase() === usdt0.address.toLowerCase()) throw new Error("FXRP and USDT0 must be different contracts");
  writeDraft({
    network: (await ethers.provider.getNetwork()).chainId === 114n ? "coston2" : "hardhat-local",
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    version: "v2-draft",
    assetMode: "coston2_mock",
    tokens: { FXRP: fxrp.address, USDT0: usdt0.address, fxrpSymbol: fxrp.symbol, usdt0Symbol: usdt0.symbol, fxrpDecimals: 18, usdt0Decimals: 18 },
    deployments: { FXRP: fxrp, USDT0: usdt0 },
  });
  console.log(JSON.stringify({ deploymentRunId, fxrp: fxrp.address, usdt0: usdt0.address, draft: draftPath }, null, 2));
}

main().catch(error => { console.error(error); process.exitCode = 1; });

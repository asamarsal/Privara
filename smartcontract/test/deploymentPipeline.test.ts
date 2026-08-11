import { expect } from "chai";
import { ethers } from "hardhat";
import { PrivaraDemoToken, PrivaraVault } from "../typechain-types";


describe("Jalur A local deployment pipeline", () => {
  it("deploys assets, verifier, vault and verifies a V2 settlement", async () => {
    const [deployer, seller, buyer, attestationSigner] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("PrivaraDemoToken");
    const fxrp = await Token.deploy("Privara Demo FXRP", "FXRP", deployer.address, ethers.parseEther("1000"), ethers.parseEther("10000000")) as unknown as PrivaraDemoToken;
    const usdt0 = await Token.deploy("Privara Demo USDT0", "USDT0", deployer.address, ethers.parseEther("1000"), ethers.parseEther("10000000")) as unknown as PrivaraDemoToken;
    const Ftso = await ethers.getContractFactory("MockFtsoV2");
    const ftso = await Ftso.deploy();
    const Verifier = await ethers.getContractFactory("FccVerifier");
    const verifier = await Verifier.deploy(ethers.ZeroAddress);
    const Vault = await ethers.getContractFactory("PrivaraVault");
    const vault = await Vault.deploy(await fxrp.getAddress(), await usdt0.getAddress(), await ftso.getAddress(), await verifier.getAddress(), attestationSigner.address, "0x015852502f55534400000000000000000000000000") as unknown as PrivaraVault;

    expect(await fxrp.symbol()).to.equal("FXRP");
    expect(await usdt0.symbol()).to.equal("USDT0");
    expect(await fxrp.decimals()).to.equal(18);
    expect(await vault.authorizedVerifier()).to.equal(attestationSigner.address);
    expect(await vault.verifier()).to.equal(await verifier.getAddress());

    await fxrp.connect(seller).claim();
    await usdt0.connect(buyer).claim();
    const base = ethers.parseEther("100");
    const price = ethers.parseEther("0.5");
    const quote = ethers.parseEther("50");
    await fxrp.connect(seller).approve(await vault.getAddress(), base);
    await usdt0.connect(buyer).approve(await vault.getAddress(), quote);
    await vault.connect(seller).deposit(await fxrp.getAddress(), base);
    await vault.connect(buyer).deposit(await usdt0.getAddress(), quote);

    const now = (await ethers.provider.getBlock("latest"))!.timestamp;
    await ftso.setPrice(ethers.parseUnits("0.5", 5), 5, now);
    const expiry = BigInt(now + 300);
    const sellId = ethers.id("jalur-a-sell");
    const buyId = ethers.id("jalur-a-buy");
    const sellCommitment = ethers.id("jalur-a-sell-payload");
    const buyCommitment = ethers.id("jalur-a-buy-payload");
    await vault.connect(seller).commitOrder(sellId, 1, await fxrp.getAddress(), base, sellCommitment, expiry);
    await vault.connect(buyer).commitOrder(buyId, 0, await usdt0.getAddress(), quote, buyCommitment, expiry);

    const matchId = ethers.id("jalur-a-match");
    const digest = await vault.hashMatchResult(matchId, buyId, sellId, buyCommitment, sellCommitment, price, base, quote, expiry, (await ethers.provider.getNetwork()).chainId, await vault.getAddress());
    const signature = await attestationSigner.signMessage(ethers.getBytes(digest));
    await expect(vault.settle({ matchId, buyOrderId: buyId, sellOrderId: sellId, executionPrice: price, fxrpAmount: base, quoteAmount: quote, matchExpiry: expiry, signature })).to.emit(vault, "OrderSettled");
    expect(await vault.balanceOf(await fxrp.getAddress(), buyer.address)).to.equal(base);
    expect(await vault.balanceOf(await usdt0.getAddress(), seller.address)).to.equal(quote);
  });
});

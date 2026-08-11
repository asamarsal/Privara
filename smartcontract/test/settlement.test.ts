import { expect } from "chai";
import { ethers } from "hardhat";
import { PrivaraVault, MockERC20, MockFtsoV2 } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("PrivaraVault V2 settlement", function () {
  let vault: PrivaraVault;
  let fxrp: MockERC20;
  let usdt0: MockERC20;
  let ftso: MockFtsoV2;
  let seller: HardhatEthersSigner;
  let buyer: HardhatEthersSigner;
  let attacker: HardhatEthersSigner;
  let signer: HardhatEthersSigner;

  const price = ethers.parseEther("0.5");
  const base = ethers.parseEther("100");
  const quote = ethers.parseEther("50");
  const buyId = ethers.keccak256(ethers.toUtf8Bytes("buy-v2"));
  const sellId = ethers.keccak256(ethers.toUtf8Bytes("sell-v2"));
  const buyCommitment = ethers.keccak256(ethers.toUtf8Bytes("buy-ciphertext"));
  const sellCommitment = ethers.keccak256(ethers.toUtf8Bytes("sell-ciphertext"));

  async function freshTimestamp(offset = 0) {
    return BigInt((await ethers.provider.getBlock("latest"))!.timestamp + offset);
  }

  beforeEach(async () => {
    [, seller, buyer, attacker, signer] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("MockERC20");
    fxrp = await Token.deploy("Mock FXRP", "FXRP") as unknown as MockERC20;
    usdt0 = await Token.deploy("Mock USDT0", "USDT0") as unknown as MockERC20;
    const Ftso = await ethers.getContractFactory("MockFtsoV2");
    ftso = await Ftso.deploy() as unknown as MockFtsoV2;
    const Verifier = await ethers.getContractFactory("FccVerifier");
    const verifier = await Verifier.deploy(ethers.ZeroAddress);
    const Vault = await ethers.getContractFactory("PrivaraVault");
    vault = await Vault.deploy(await fxrp.getAddress(), await usdt0.getAddress(), await ftso.getAddress(), await verifier.getAddress(), signer.address, "0x015852502f55534400000000000000000000000000") as unknown as PrivaraVault;

    await fxrp.mint(seller.address, base);
    await usdt0.mint(buyer.address, quote);
    await fxrp.connect(seller).approve(await vault.getAddress(), base);
    await usdt0.connect(buyer).approve(await vault.getAddress(), quote);
    await vault.connect(seller).deposit(await fxrp.getAddress(), base);
    await vault.connect(buyer).deposit(await usdt0.getAddress(), quote);
    const expiry = await freshTimestamp(3600);
    await vault.connect(seller).commitOrder(sellId, 1, await fxrp.getAddress(), base, sellCommitment, expiry);
    await vault.connect(buyer).commitOrder(buyId, 0, await usdt0.getAddress(), quote, buyCommitment, expiry);
    await ftso.setPrice(ethers.parseUnits("0.5", 5), 5, await freshTimestamp());
  });

  async function params(overrides: Record<string, unknown> = {}) {
    return {
      matchId: ethers.keccak256(ethers.toUtf8Bytes("match-v2")),
      buyOrderId: buyId,
      sellOrderId: sellId,
      executionPrice: price,
      fxrpAmount: base,
      quoteAmount: quote,
      matchExpiry: await freshTimestamp(1800),
      signature: "0x",
      ...overrides,
    };
  }

  async function sign(p: any, withSigner = signer) {
    const digest = await vault.hashMatchResult(
      p.matchId, p.buyOrderId, p.sellOrderId, buyCommitment, sellCommitment,
      p.executionPrice, p.fxrpAmount, p.quoteAmount, p.matchExpiry,
      (await ethers.provider.getNetwork()).chainId, await vault.getAddress()
    );
    p.signature = await withSigner.signMessage(ethers.getBytes(digest));
    return p;
  }

  it("settles exact full-fill orders and releases locks", async () => {
    const p = await sign(await params());
    await expect(vault.settle(p)).to.emit(vault, "OrderSettled").withArgs(p.matchId, buyId, sellId, price, base, quote);
    expect(await vault.balanceOf(await fxrp.getAddress(), buyer.address)).to.equal(base);
    expect(await vault.balanceOf(await usdt0.getAddress(), seller.address)).to.equal(quote);
    expect(await vault.lockedBalanceOf(await fxrp.getAddress(), seller.address)).to.equal(0n);
    expect(await vault.lockedBalanceOf(await usdt0.getAddress(), buyer.address)).to.equal(0n);
    expect(await vault.isMatchSettled(p.matchId)).to.equal(true);
  });

  it("rejects wrong signer and every commitment mutation", async () => {
    await expect(vault.settle(await sign(await params(), attacker))).to.be.revertedWithCustomError(vault, "InvalidProof");
    const p = await sign(await params());
    p.signature = await signer.signMessage(ethers.getBytes(await vault.hashMatchResult(
      p.matchId, p.buyOrderId, p.sellOrderId,
      ethers.keccak256(ethers.toUtf8Bytes("wrong")), sellCommitment,
      p.executionPrice, p.fxrpAmount, p.quoteAmount, p.matchExpiry,
      (await ethers.provider.getNetwork()).chainId, await vault.getAddress()
    )));
    await expect(vault.settle(p)).to.be.revertedWithCustomError(vault, "InvalidProof");
  });

  it("rejects amount and quote tampering", async () => {
    await expect(vault.settle(await sign(await params({ fxrpAmount: base - 1n })))).to.be.revertedWithCustomError(vault, "InvalidSettlementAmount");
    await expect(vault.settle(await sign(await params({ quoteAmount: quote - 1n })))).to.be.revertedWithCustomError(vault, "InvalidQuoteAmount");
    await expect(vault.settle(await sign(await params({ executionPrice: price + 1n })))).to.be.revertedWithCustomError(vault, "InvalidQuoteAmount");
  });

  it("rejects match expiry beyond either order", async () => {
    await expect(vault.settle(await sign(await params({ matchExpiry: await freshTimestamp(7200) })))).to.be.revertedWithCustomError(vault, "MatchOutlivesOrder");
  });

  it("rejects replay, cancelled, expired, and wrong-side orders", async () => {
    const p = await sign(await params());
    await vault.settle(p);
    await expect(vault.settle(p)).to.be.revertedWithCustomError(vault, "ReplayDetected");
  });

  it("rejects cancelled order", async () => {
    await vault.connect(seller).cancelOrder(sellId);
    await expect(vault.settle(await sign(await params()))).to.be.revertedWithCustomError(vault, "OrderAlreadyCancelled");
  });

  it("accepts exactly 200 bps and rejects more", async () => {
    const p200 = await params({ executionPrice: ethers.parseEther("0.51"), quoteAmount: ethers.parseEther("51") });
    // A separate setup is needed because exact-fill quote is committed. This proves the guard boundary directly through a matching committed buy.
    const buy2 = ethers.keccak256(ethers.toUtf8Bytes("buy-200"));
    const commitment2 = ethers.keccak256(ethers.toUtf8Bytes("buy-200-c"));
    await usdt0.mint(buyer.address, ethers.parseEther("1"));
    await usdt0.connect(buyer).approve(await vault.getAddress(), ethers.MaxUint256);
    await vault.connect(buyer).deposit(await usdt0.getAddress(), ethers.parseEther("1"));
    await vault.connect(buyer).cancelOrder(buyId);
    await vault.connect(buyer).commitOrder(buy2, 0, await usdt0.getAddress(), p200.quoteAmount, commitment2, await freshTimestamp(3600));
    p200.buyOrderId = buy2;
    const digest = await vault.hashMatchResult(p200.matchId, buy2, sellId, commitment2, sellCommitment, p200.executionPrice, base, p200.quoteAmount, p200.matchExpiry, (await ethers.provider.getNetwork()).chainId, await vault.getAddress());
    p200.signature = await signer.signMessage(ethers.getBytes(digest));
    await expect(vault.settle(p200)).to.emit(vault, "OrderSettled");
  });

  it("rejects stale, zero, and future oracle data", async () => {
    await ftso.setPrice(ethers.parseUnits("0.5", 5), 5, await freshTimestamp(-301));
    await expect(vault.settle(await sign(await params()))).to.be.revertedWithCustomError(vault, "OraclePriceStale");
    await ftso.setPrice(0, 5, await freshTimestamp());
    await expect(vault.settle(await sign(await params()))).to.be.revertedWithCustomError(vault, "OraclePriceInvalid");
    await ftso.setPrice(ethers.parseUnits("0.5", 5), 5, await freshTimestamp(60));
    await expect(vault.settle(await sign(await params()))).to.be.revertedWithCustomError(vault, "OracleTimestampInFuture");
  });

  it("rejects 201 bps oracle deviation", async () => {
    const execution = ethers.parseEther("0.51005");
    const expectedQuote = base * execution / 10n ** 18n;
    await vault.connect(buyer).cancelOrder(buyId);
    await usdt0.mint(buyer.address, expectedQuote - quote);
    await usdt0.connect(buyer).approve(await vault.getAddress(), ethers.MaxUint256);
    await vault.connect(buyer).deposit(await usdt0.getAddress(), expectedQuote - quote);
    const id = ethers.keccak256(ethers.toUtf8Bytes("buy-201"));
    const c = ethers.keccak256(ethers.toUtf8Bytes("buy-201-c"));
    await vault.connect(buyer).commitOrder(id, 0, await usdt0.getAddress(), expectedQuote, c, await freshTimestamp(3600));
    const p = await params({ buyOrderId: id, executionPrice: execution, quoteAmount: expectedQuote });
    const digest = await vault.hashMatchResult(p.matchId, id, sellId, c, sellCommitment, execution, base, expectedQuote, p.matchExpiry, (await ethers.provider.getNetwork()).chainId, await vault.getAddress());
    p.signature = await signer.signMessage(ethers.getBytes(digest));
    await expect(vault.settle(p)).to.be.revertedWithCustomError(vault, "OracleDeviationExceeded");
  });
});

import { expect } from "chai";
import { ethers } from "hardhat";
import { PrivaraVault, MockERC20 } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("PrivaraVault V2", function () {
  let vault: PrivaraVault;
  let fxrp: MockERC20;
  let usdt0: MockERC20;
  let unsupported: MockERC20;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let mallory: HardhatEthersSigner;

  const amount = ethers.parseEther("100");
  const commitment = ethers.keccak256(ethers.toUtf8Bytes("ciphertext-v2"));
  const sellId = ethers.keccak256(ethers.toUtf8Bytes("sell-v2"));
  const buyId = ethers.keccak256(ethers.toUtf8Bytes("buy-v2"));

  beforeEach(async () => {
    [, alice, bob, mallory] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("MockERC20");
    fxrp = await Token.deploy("Mock FXRP", "FXRP") as unknown as MockERC20;
    usdt0 = await Token.deploy("Mock USDT0", "USDT0") as unknown as MockERC20;
    unsupported = await Token.deploy("Unsupported", "UNS") as unknown as MockERC20;
    const Ftso = await ethers.getContractFactory("MockFtsoV2");
    const ftso = await Ftso.deploy();
    const Verifier = await ethers.getContractFactory("FccVerifier");
    const verifier = await Verifier.deploy(ethers.ZeroAddress);
    const Vault = await ethers.getContractFactory("PrivaraVault");
    vault = await Vault.deploy(await fxrp.getAddress(), await usdt0.getAddress(), await ftso.getAddress(), await verifier.getAddress(), alice.address, "0x" + "00".repeat(21)) as unknown as PrivaraVault;

    await fxrp.mint(alice.address, amount * 2n);
    await usdt0.mint(bob.address, amount * 2n);
    await fxrp.connect(alice).approve(await vault.getAddress(), ethers.MaxUint256);
    await usdt0.connect(bob).approve(await vault.getAddress(), ethers.MaxUint256);
  });

  it("rejects using the same contract for both assets", async () => {
    const Ftso = await ethers.getContractFactory("MockFtsoV2");
    const ftso = await Ftso.deploy();
    const Verifier = await ethers.getContractFactory("FccVerifier");
    const verifier = await Verifier.deploy(ethers.ZeroAddress);
    const Vault = await ethers.getContractFactory("PrivaraVault");
    await expect(Vault.deploy(await fxrp.getAddress(), await fxrp.getAddress(), await ftso.getAddress(), await verifier.getAddress(), alice.address, "0x" + "00".repeat(21)))
      .to.be.revertedWithCustomError(Vault, "UnsupportedToken");
  });

  it("deposits supported assets and preserves accounting", async () => {
    await expect(vault.connect(alice).deposit(await fxrp.getAddress(), amount))
      .to.emit(vault, "Deposited").withArgs(alice.address, await fxrp.getAddress(), amount);
    expect(await vault.balanceOf(await fxrp.getAddress(), alice.address)).to.equal(amount);
    expect(await fxrp.balanceOf(await vault.getAddress())).to.equal(amount);
  });

  it("rejects unsupported deposits and withdrawals", async () => {
    await unsupported.mint(mallory.address, amount);
    await unsupported.connect(mallory).approve(await vault.getAddress(), amount);
    await expect(vault.connect(mallory).deposit(await unsupported.getAddress(), amount)).to.be.revertedWithCustomError(vault, "UnsupportedToken");
    await expect(vault.connect(mallory).withdraw(await unsupported.getAddress(), 1n)).to.be.revertedWithCustomError(vault, "UnsupportedToken");
  });

  it("rejects zero deposits and withdrawals", async () => {
    await expect(vault.connect(alice).deposit(await fxrp.getAddress(), 0)).to.be.revertedWithCustomError(vault, "ZeroAmount");
    await expect(vault.connect(alice).withdraw(await fxrp.getAddress(), 0)).to.be.revertedWithCustomError(vault, "ZeroAmount");
  });

  it("withdraws available balance", async () => {
    await vault.connect(alice).deposit(await fxrp.getAddress(), amount);
    await expect(vault.connect(alice).withdraw(await fxrp.getAddress(), amount))
      .to.emit(vault, "Withdrawn").withArgs(alice.address, await fxrp.getAddress(), amount);
    expect(await vault.balanceOf(await fxrp.getAddress(), alice.address)).to.equal(0n);
  });

  it("enforces side-to-token direction", async () => {
    await vault.connect(alice).deposit(await fxrp.getAddress(), amount);
    await vault.connect(bob).deposit(await usdt0.getAddress(), amount);
    const expiry = BigInt((await ethers.provider.getBlock("latest"))!.timestamp + 3600);
    await expect(vault.connect(alice).commitOrder(sellId, 0, await fxrp.getAddress(), amount, commitment, expiry)).to.be.revertedWithCustomError(vault, "InvalidTokenForSide");
    await expect(vault.connect(bob).commitOrder(buyId, 1, await usdt0.getAddress(), amount, commitment, expiry)).to.be.revertedWithCustomError(vault, "InvalidTokenForSide");
  });

  it("rejects zero commitment", async () => {
    await vault.connect(alice).deposit(await fxrp.getAddress(), amount);
    const expiry = BigInt((await ethers.provider.getBlock("latest"))!.timestamp + 3600);
    await expect(vault.connect(alice).commitOrder(sellId, 1, await fxrp.getAddress(), amount, ethers.ZeroHash, expiry)).to.be.revertedWithCustomError(vault, "ZeroCommitment");
  });

  it("locks committed funds and prevents oversubscription or withdrawal", async () => {
    await vault.connect(alice).deposit(await fxrp.getAddress(), amount);
    const expiry = BigInt((await ethers.provider.getBlock("latest"))!.timestamp + 3600);
    await vault.connect(alice).commitOrder(sellId, 1, await fxrp.getAddress(), amount, commitment, expiry);
    expect(await vault.lockedBalanceOf(await fxrp.getAddress(), alice.address)).to.equal(amount);
    expect(await vault.availableBalanceOf(await fxrp.getAddress(), alice.address)).to.equal(0n);
    await expect(vault.connect(alice).withdraw(await fxrp.getAddress(), 1n)).to.be.revertedWithCustomError(vault, "InsufficientAvailableBalance");
    await expect(vault.connect(alice).commitOrder(ethers.keccak256(ethers.toUtf8Bytes("second")), 1, await fxrp.getAddress(), 1n, commitment, expiry)).to.be.revertedWithCustomError(vault, "InsufficientAvailableBalance");
  });

  it("releases locked funds on cancellation", async () => {
    await vault.connect(alice).deposit(await fxrp.getAddress(), amount);
    const expiry = BigInt((await ethers.provider.getBlock("latest"))!.timestamp + 3600);
    await vault.connect(alice).commitOrder(sellId, 1, await fxrp.getAddress(), amount, commitment, expiry);
    await expect(vault.connect(alice).cancelOrder(sellId)).to.emit(vault, "OrderCancelled").withArgs(sellId, alice.address);
    expect(await vault.lockedBalanceOf(await fxrp.getAddress(), alice.address)).to.equal(0n);
    await vault.connect(alice).withdraw(await fxrp.getAddress(), amount);
  });

  it("rejects duplicate, expired, unauthorized, and double cancellation", async () => {
    await vault.connect(alice).deposit(await fxrp.getAddress(), amount);
    const latest = (await ethers.provider.getBlock("latest"))!.timestamp;
    await expect(vault.connect(alice).commitOrder(sellId, 1, await fxrp.getAddress(), amount, commitment, latest)).to.be.revertedWithCustomError(vault, "OrderExpired");
    const expiry = BigInt(latest + 3600);
    await vault.connect(alice).commitOrder(sellId, 1, await fxrp.getAddress(), amount, commitment, expiry);
    await expect(vault.connect(alice).commitOrder(sellId, 1, await fxrp.getAddress(), amount, commitment, expiry)).to.be.revertedWithCustomError(vault, "OrderExists");
    await expect(vault.connect(mallory).cancelOrder(sellId)).to.be.revertedWithCustomError(vault, "NotOrderMaker");
    await vault.connect(alice).cancelOrder(sellId);
    await expect(vault.connect(alice).cancelOrder(sellId)).to.be.revertedWithCustomError(vault, "OrderAlreadyCancelled");
  });
});

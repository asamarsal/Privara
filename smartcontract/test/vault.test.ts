import { expect } from "chai";
import { ethers } from "hardhat";
import { PrivaraVault, MockERC20 } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("PrivaraVault", function () {
  let vault: PrivaraVault;
  let fxrp: MockERC20;
  let usdt0: MockERC20;
  let unsupportedToken: MockERC20;

  let deployer: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let mallory: HardhatEthersSigner;

  const depositAmount = ethers.parseUnits("100", 18);
  const futureExpiry = Math.floor(Date.now() / 1000) + 3600;
  const pastExpiry = Math.floor(Date.now() / 1000) - 3600;

  beforeEach(async function () {
    [deployer, alice, bob, mallory] = await ethers.getSigners();

    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    fxrp = await MockERC20Factory.deploy("Mock FXRP", "FXRP");
    usdt0 = await MockERC20Factory.deploy("Mock USDT0", "USDT0");
    unsupportedToken = await MockERC20Factory.deploy("Unsupported", "UNS");

    const VaultFactory = await ethers.getContractFactory("PrivaraVault");
    const MockFtsoFactory = await ethers.getContractFactory("MockFtsoV2");
    const ftso = await MockFtsoFactory.deploy();
    const FccVerifierFactory = await ethers.getContractFactory("FccVerifier");
    const verifier = await FccVerifierFactory.deploy(ethers.ZeroAddress);
    const feedId = "0x" + "00".repeat(21);
    vault = await VaultFactory.deploy(await fxrp.getAddress(), await usdt0.getAddress(), await ftso.getAddress(), await verifier.getAddress(), deployer.address, feedId);

    // Mint tokens
    await fxrp.mint(alice.address, depositAmount * 2n);
    await usdt0.mint(bob.address, depositAmount * 2n);
    await unsupportedToken.mint(mallory.address, depositAmount);

    // Approvals
    await fxrp.connect(alice).approve(await vault.getAddress(), ethers.MaxUint256);
    await usdt0.connect(bob).approve(await vault.getAddress(), ethers.MaxUint256);
    await unsupportedToken.connect(mallory).approve(await vault.getAddress(), ethers.MaxUint256);
  });

  describe("Deposit", function () {
    it("Deposit FXRP", async function () {
      await expect(vault.connect(alice).deposit(await fxrp.getAddress(), depositAmount))
        .to.emit(vault, "Deposited")
        .withArgs(alice.address, await fxrp.getAddress(), depositAmount);
      
      expect(await vault.balanceOf(await fxrp.getAddress(), alice.address)).to.equal(depositAmount);
    });

    it("Deposit USDT0", async function () {
      await expect(vault.connect(bob).deposit(await usdt0.getAddress(), depositAmount))
        .to.emit(vault, "Deposited")
        .withArgs(bob.address, await usdt0.getAddress(), depositAmount);
      
      expect(await vault.balanceOf(await usdt0.getAddress(), bob.address)).to.equal(depositAmount);
    });

    it("Reject unsupported token", async function () {
      await expect(vault.connect(mallory).deposit(await unsupportedToken.getAddress(), depositAmount))
        .to.be.revertedWithCustomError(vault, "UnsupportedToken");
    });

    it("Reject zero deposit", async function () {
      await expect(vault.connect(alice).deposit(await fxrp.getAddress(), 0))
        .to.be.revertedWithCustomError(vault, "ZeroAmount");
    });

    it("Confirm total token accounting is preserved", async function () {
      await vault.connect(alice).deposit(await fxrp.getAddress(), depositAmount);
      const contractBalance = await fxrp.balanceOf(await vault.getAddress());
      const aliceInternal = await vault.balanceOf(await fxrp.getAddress(), alice.address);
      expect(contractBalance).to.equal(aliceInternal);
    });
  });

  describe("Withdrawal", function () {
    beforeEach(async function () {
      await vault.connect(alice).deposit(await fxrp.getAddress(), depositAmount);
    });

    it("Withdraw full balance", async function () {
      const balanceBefore = await fxrp.balanceOf(alice.address);
      await expect(vault.connect(alice).withdraw(await fxrp.getAddress(), depositAmount))
        .to.emit(vault, "Withdrawn")
        .withArgs(alice.address, await fxrp.getAddress(), depositAmount);
      
      expect(await vault.balanceOf(await fxrp.getAddress(), alice.address)).to.equal(0);
      const balanceAfter = await fxrp.balanceOf(alice.address);
      expect(balanceAfter - balanceBefore).to.equal(depositAmount);
    });

    it("Withdraw partial balance", async function () {
      const withdrawAmount = depositAmount / 2n;
      await vault.connect(alice).withdraw(await fxrp.getAddress(), withdrawAmount);
      expect(await vault.balanceOf(await fxrp.getAddress(), alice.address)).to.equal(withdrawAmount);
    });

    it("Reject withdrawal exceeding balance", async function () {
      await expect(vault.connect(alice).withdraw(await fxrp.getAddress(), depositAmount + 1n))
        .to.be.revertedWithCustomError(vault, "InsufficientBalance");
    });

    it("Reject zero withdrawal", async function () {
      await expect(vault.connect(alice).withdraw(await fxrp.getAddress(), 0))
        .to.be.revertedWithCustomError(vault, "ZeroAmount");
    });
  });

  describe("Order Commitment", function () {
    const dummyCommitment = ethers.keccak256(ethers.toUtf8Bytes("dummy"));
    const orderIdSell = ethers.keccak256(ethers.toUtf8Bytes("sell1"));
    const orderIdBuy = ethers.keccak256(ethers.toUtf8Bytes("buy1"));

    beforeEach(async function () {
      await vault.connect(alice).deposit(await fxrp.getAddress(), depositAmount);
      await vault.connect(bob).deposit(await usdt0.getAddress(), depositAmount);
    });

    it("Create sell order", async function () {
      await expect(vault.connect(alice).commitOrder(
        orderIdSell, 1, await fxrp.getAddress(), depositAmount, dummyCommitment, futureExpiry
      )).to.emit(vault, "OrderCommitted")
        .withArgs(orderIdSell, alice.address, 1, await fxrp.getAddress(), depositAmount, futureExpiry);
    });

    it("Create buy order", async function () {
      await expect(vault.connect(bob).commitOrder(
        orderIdBuy, 0, await usdt0.getAddress(), depositAmount, dummyCommitment, futureExpiry
      )).to.emit(vault, "OrderCommitted")
        .withArgs(orderIdBuy, bob.address, 0, await usdt0.getAddress(), depositAmount, futureExpiry);
    });

    it("Reject duplicate orderId", async function () {
      await vault.connect(alice).commitOrder(
        orderIdSell, 1, await fxrp.getAddress(), depositAmount, dummyCommitment, futureExpiry
      );
      await expect(vault.connect(alice).commitOrder(
        orderIdSell, 1, await fxrp.getAddress(), depositAmount, dummyCommitment, futureExpiry
      )).to.be.revertedWithCustomError(vault, "OrderExists");
    });

    it("Reject order with past expiry", async function () {
      await expect(vault.connect(alice).commitOrder(
        orderIdSell, 1, await fxrp.getAddress(), depositAmount, dummyCommitment, pastExpiry
      )).to.be.revertedWithCustomError(vault, "OrderExpired");
    });

    it("Reject order with zero amountIn", async function () {
      await expect(vault.connect(alice).commitOrder(
        orderIdSell, 1, await fxrp.getAddress(), 0, dummyCommitment, futureExpiry
      )).to.be.revertedWithCustomError(vault, "ZeroAmount");
    });

    it("Reject order with insufficient maker balance", async function () {
      await expect(vault.connect(alice).commitOrder(
        orderIdSell, 1, await fxrp.getAddress(), depositAmount + 1n, dummyCommitment, futureExpiry
      )).to.be.revertedWithCustomError(vault, "InsufficientBalance");
    });
  });

  describe("Order Cancellation", function () {
    const dummyCommitment = ethers.keccak256(ethers.toUtf8Bytes("dummy"));
    const orderId = ethers.keccak256(ethers.toUtf8Bytes("order1"));

    beforeEach(async function () {
      await vault.connect(alice).deposit(await fxrp.getAddress(), depositAmount);
      await vault.connect(alice).commitOrder(
        orderId, 1, await fxrp.getAddress(), depositAmount, dummyCommitment, futureExpiry
      );
    });

    it("Cancel own order", async function () {
      await expect(vault.connect(alice).cancelOrder(orderId))
        .to.emit(vault, "OrderCancelled")
        .withArgs(orderId, alice.address);
    });

    it("Reject cancellation by stranger", async function () {
      await expect(vault.connect(mallory).cancelOrder(orderId))
        .to.be.revertedWithCustomError(vault, "NotOrderMaker");
    });

    it("Reject cancellation of nonexistent order", async function () {
      const badId = ethers.keccak256(ethers.toUtf8Bytes("badId"));
      await expect(vault.connect(alice).cancelOrder(badId))
        .to.be.revertedWithCustomError(vault, "OrderNotFound");
    });

    it("Reject double cancellation", async function () {
      await vault.connect(alice).cancelOrder(orderId);
      await expect(vault.connect(alice).cancelOrder(orderId))
        .to.be.revertedWithCustomError(vault, "OrderAlreadyCancelled");
    });
  });

  describe("Accounting Conservation", function () {
    it("Sum of internal balances equals vault ERC-20 balance", async function () {
      await vault.connect(alice).deposit(await fxrp.getAddress(), depositAmount);
      await vault.connect(alice).withdraw(await fxrp.getAddress(), depositAmount / 2n);
      
      const internalBal = await vault.balanceOf(await fxrp.getAddress(), alice.address);
      const vaultErc20 = await fxrp.balanceOf(await vault.getAddress());
      
      expect(internalBal).to.equal(vaultErc20);
    });
  });
});



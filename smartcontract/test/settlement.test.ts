import { expect } from "chai";
import { ethers } from "hardhat";
import { PrivaraVault, MockERC20, MockFtsoV2, FccVerifier } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("PrivaraVault Settlement", function () {
  let vault: PrivaraVault;
  let fxrp: MockERC20;
  let usdt0: MockERC20;
  let ftso: MockFtsoV2;
  let verifier: FccVerifier;

  let deployer: HardhatEthersSigner;
  let alice: HardhatEthersSigner; // seller
  let bob: HardhatEthersSigner;   // buyer
  let mallory: HardhatEthersSigner; // attacker
  let testSigner: HardhatEthersSigner;

  const depositAmount = ethers.parseUnits("1000", 18);
  const futureExpiry = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const pastExpiry = BigInt(Math.floor(Date.now() / 1000) - 3600);

  const buyOrderId = ethers.keccak256(ethers.toUtf8Bytes("buy1"));
  const sellOrderId = ethers.keccak256(ethers.toUtf8Bytes("sell1"));
  const matchId = ethers.keccak256(ethers.toUtf8Bytes("match1"));
  const dummyCommitment = ethers.keccak256(ethers.toUtf8Bytes("dummy"));

  const executionPrice = ethers.parseUnits("0.5", 18); // 0.5 USDT per XRP
  const fxrpAmount = ethers.parseUnits("100", 18);
  const quoteAmount = ethers.parseUnits("50", 18);

  const feedId = "0x015852502f55534400000000000000000000000000";

  beforeEach(async function () {
    [deployer, alice, bob, mallory, testSigner] = await ethers.getSigners();

    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    fxrp = await MockERC20Factory.deploy("Mock FXRP", "FXRP");
    usdt0 = await MockERC20Factory.deploy("Mock USDT0", "USDT0");

    const MockFtsoFactory = await ethers.getContractFactory("MockFtsoV2");
    ftso = await MockFtsoFactory.deploy();
    await ftso.setPrice(ethers.parseUnits("0.5", 5), 5, 0); // Price 0.5 with 5 decimals

    const FccVerifierFactory = await ethers.getContractFactory("FccVerifier");
    verifier = await FccVerifierFactory.deploy(ethers.ZeroAddress);

    const VaultFactory = await ethers.getContractFactory("PrivaraVault");
    vault = await VaultFactory.deploy(
      await fxrp.getAddress(),
      await usdt0.getAddress(),
      await ftso.getAddress(),
      await verifier.getAddress(),
      testSigner.address,
      feedId
    );

    // Mint tokens
    await fxrp.mint(alice.address, depositAmount);
    await usdt0.mint(bob.address, depositAmount);

    // Approvals
    await fxrp.connect(alice).approve(await vault.getAddress(), ethers.MaxUint256);
    await usdt0.connect(bob).approve(await vault.getAddress(), ethers.MaxUint256);

    // Initial Deposits
    await vault.connect(alice).deposit(await fxrp.getAddress(), depositAmount);
    await vault.connect(bob).deposit(await usdt0.getAddress(), depositAmount);

    // Commit Orders
    // Alice sells 100 FXRP
    await vault.connect(alice).commitOrder(sellOrderId, 1, await fxrp.getAddress(), fxrpAmount, dummyCommitment, futureExpiry);
    // Bob buys 100 FXRP with USDT0
    await vault.connect(bob).commitOrder(buyOrderId, 0, await usdt0.getAddress(), quoteAmount, dummyCommitment, futureExpiry);
  });

  async function getSignature(params: any): Promise<string> {
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const digest = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes32", "bytes32", "bytes32", "uint256", "uint256", "uint256", "uint64", "uint256", "address"],
        [
          params.matchId,
          params.buyOrderId,
          params.sellOrderId,
          params.executionPrice,
          params.fxrpAmount,
          params.quoteAmount,
          params.matchExpiry,
          chainId,
          await vault.getAddress()
        ]
      )
    );
    return testSigner.signMessage(ethers.getBytes(digest));
  }

  describe("Valid Settlement", function () {
    it("Should settle successfully and update balances", async function () {
      const params = {
        matchId,
        buyOrderId,
        sellOrderId,
        executionPrice,
        fxrpAmount,
        quoteAmount,
        matchExpiry: futureExpiry,
        signature: "0x"
      };
      params.signature = await getSignature(params);

      await expect(vault.connect(deployer).settle(params))
        .to.emit(vault, "OrderSettled")
        .withArgs(matchId, buyOrderId, sellOrderId, executionPrice, fxrpAmount, quoteAmount);

      expect(await vault.balanceOf(await fxrp.getAddress(), bob.address)).to.equal(fxrpAmount);
      expect(await vault.balanceOf(await usdt0.getAddress(), alice.address)).to.equal(quoteAmount);
    });
  });

  describe("Proof Rejection", function () {
    it("Reject invalid signature (wrong signer)", async function () {
      const params = {
        matchId, buyOrderId, sellOrderId, executionPrice, fxrpAmount, quoteAmount, matchExpiry: futureExpiry, signature: "0x"
      };
      // Sign with mallory instead of testSigner
      const chainId = (await ethers.provider.getNetwork()).chainId;
      const digest = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["bytes32", "bytes32", "bytes32", "uint256", "uint256", "uint256", "uint64", "uint256", "address"],
          [params.matchId, params.buyOrderId, params.sellOrderId, params.executionPrice, params.fxrpAmount, params.quoteAmount, params.matchExpiry, chainId, await vault.getAddress()]
        )
      );
      params.signature = mallory.signMessage(ethers.getBytes(digest));

      await expect(vault.connect(deployer).settle(params)).to.be.revertedWithCustomError(vault, "InvalidProof");
    });

    it("Reject tampered matchId", async function () {
      const params = { matchId, buyOrderId, sellOrderId, executionPrice, fxrpAmount, quoteAmount, matchExpiry: futureExpiry, signature: "0x" };
      params.signature = await getSignature(params);
      params.matchId = ethers.keccak256(ethers.toUtf8Bytes("tampered"));
      await expect(vault.connect(deployer).settle(params)).to.be.revertedWithCustomError(vault, "InvalidProof");
    });
  });

  describe("Replay Protection", function () {
    it("Reject replayed matchId", async function () {
      const params = { matchId, buyOrderId, sellOrderId, executionPrice, fxrpAmount, quoteAmount, matchExpiry: futureExpiry, signature: "0x" };
      params.signature = await getSignature(params);

      await vault.connect(deployer).settle(params);
      await expect(vault.connect(deployer).settle(params)).to.be.revertedWithCustomError(vault, "ReplayDetected");
    });
  });

  describe("Order State Rejection", function () {
    it("Reject if match expired", async function () {
      const params = { matchId, buyOrderId, sellOrderId, executionPrice, fxrpAmount, quoteAmount, matchExpiry: pastExpiry, signature: "0x" };
      params.signature = await getSignature(params);
      await expect(vault.connect(deployer).settle(params)).to.be.revertedWithCustomError(vault, "MatchExpired");
    });

    it("Reject if order cancelled", async function () {
      await vault.connect(alice).cancelOrder(sellOrderId);
      const params = { matchId, buyOrderId, sellOrderId, executionPrice, fxrpAmount, quoteAmount, matchExpiry: futureExpiry, signature: "0x" };
      params.signature = await getSignature(params);
      await expect(vault.connect(deployer).settle(params)).to.be.revertedWithCustomError(vault, "OrderAlreadyCancelled");
    });
    
    it("Reject wrong side", async function () {
        const params = { matchId, buyOrderId: sellOrderId, sellOrderId: buyOrderId, executionPrice, fxrpAmount, quoteAmount, matchExpiry: futureExpiry, signature: "0x" };
        params.signature = await getSignature(params);
        await expect(vault.connect(deployer).settle(params)).to.be.revertedWithCustomError(vault, "WrongOrderSide");
    });
  });

  describe("Balance Rejection", function () {
    it("Reject insufficient FXRP", async function () {
      // Alice withdraws all
      await vault.connect(alice).withdraw(await fxrp.getAddress(), depositAmount);
      const params = { matchId, buyOrderId, sellOrderId, executionPrice, fxrpAmount, quoteAmount, matchExpiry: futureExpiry, signature: "0x" };
      params.signature = await getSignature(params);
      await expect(vault.connect(deployer).settle(params)).to.be.revertedWithCustomError(vault, "InsufficientBalance");
    });
  });

  describe("Oracle Deviation", function () {
    it("Accept within 200 bps", async function () {
      // Oracle is 0.5. Execution price is 0.505 (100 bps)
      const execPrice = ethers.parseUnits("0.505", 18);
      const params = { matchId, buyOrderId, sellOrderId, executionPrice: execPrice, fxrpAmount, quoteAmount, matchExpiry: futureExpiry, signature: "0x" };
      params.signature = await getSignature(params);
      await expect(vault.connect(deployer).settle(params)).to.emit(vault, "OrderSettled");
    });

    it("Reject 201 bps deviation", async function () {
      // Oracle is 0.5. Execution price is 0.51005 (201 bps)
      const execPrice = ethers.parseUnits("0.51005", 18);
      const params = { matchId, buyOrderId, sellOrderId, executionPrice: execPrice, fxrpAmount, quoteAmount, matchExpiry: futureExpiry, signature: "0x" };
      params.signature = await getSignature(params);
      await expect(vault.connect(deployer).settle(params)).to.be.revertedWithCustomError(vault, "OracleDeviationExceeded");
    });
  });

  describe("Balance Conservation", function () {
    it("Vault token balance = sum of internal balances", async function () {
      const params = { matchId, buyOrderId, sellOrderId, executionPrice, fxrpAmount, quoteAmount, matchExpiry: futureExpiry, signature: "0x" };
      params.signature = await getSignature(params);
      await vault.connect(deployer).settle(params);
      
      const aliceBal = await vault.balanceOf(await fxrp.getAddress(), alice.address);
      const bobBal = await vault.balanceOf(await fxrp.getAddress(), bob.address);
      const contractBal = await fxrp.balanceOf(await vault.getAddress());
      
      expect(aliceBal + bobBal).to.equal(contractBal);
    });
  });
});



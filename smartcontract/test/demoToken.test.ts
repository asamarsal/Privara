import { expect } from "chai";
import { ethers } from "hardhat";
import { PrivaraDemoToken } from "../typechain-types";


describe("PrivaraDemoToken", () => {
  it("supports one capped faucet claim per address", async () => {
    const [owner, alice] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("PrivaraDemoToken");
    const faucet = ethers.parseEther("1000");
    const token = await Token.deploy("Privara Demo FXRP", "FXRP", owner.address, faucet, ethers.parseEther("1000000")) as unknown as PrivaraDemoToken;
    await expect(token.connect(alice).claim()).to.emit(token, "Transfer").withArgs(ethers.ZeroAddress, alice.address, faucet);
    expect(await token.balanceOf(alice.address)).to.equal(faucet);
    await expect(token.connect(alice).claim()).to.be.revertedWithCustomError(token, "AlreadyClaimed");
  });

  it("restricts administrative minting and enforces supply cap", async () => {
    const [owner, alice] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("PrivaraDemoToken");
    const cap = ethers.parseEther("2000");
    const token = await Token.deploy("Privara Demo USDT0", "USDT0", owner.address, ethers.parseEther("1000"), cap) as unknown as PrivaraDemoToken;
    await expect(token.connect(alice).mint(alice.address, 1n)).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    await token.mint(alice.address, cap);
    await expect(token.connect(alice).claim()).to.be.revertedWithCustomError(token, "MaxSupplyExceeded");
  });

  it("uses 18 decimals for V2 settlement arithmetic", async () => {
    const [owner] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("PrivaraDemoToken");
    const token = await Token.deploy("Privara Demo FXRP", "FXRP", owner.address, 1n, 100n) as unknown as PrivaraDemoToken;
    expect(await token.decimals()).to.equal(18);
    expect(await token.symbol()).to.equal("FXRP");
  });
});

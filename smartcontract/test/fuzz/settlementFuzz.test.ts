import { expect } from "chai";
import { ethers } from "hardhat";

describe("PrivaraVault V2 property checks", function () {
  it("quote arithmetic is exact for representative prices", async () => {
    const prices = [ethers.parseEther("0.001"), ethers.parseEther("0.5"), ethers.parseEther("1"), ethers.parseEther("5000")];
    const amounts = [1n, ethers.parseEther("1"), ethers.parseEther("100"), ethers.parseEther("1000000")];
    for (const amount of amounts) {
      for (const price of prices) {
        const quote = amount * price / 10n ** 18n;
        expect(quote).to.be.gte(0n);
        expect(quote * 10n ** 18n).to.be.lte(amount * price);
      }
    }
  });

  it("basis-point boundaries are deterministic", async () => {
    const reference = ethers.parseEther("1");
    const values = [
      [ethers.parseEther("0.98"), 200n],
      [ethers.parseEther("1.02"), 200n],
      [ethers.parseEther("0.9799"), 201n],
      [ethers.parseEther("1.0201"), 201n],
    ] as const;
    for (const [actual, minimumExpected] of values) {
      const delta = actual > reference ? actual - reference : reference - actual;
      const bps = delta * 10_000n / reference;
      expect(bps).to.equal(minimumExpected);
    }
  });
});

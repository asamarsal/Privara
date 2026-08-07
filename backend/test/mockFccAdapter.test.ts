import { describe, it, expect } from "vitest";
import { MockFccAdapter } from "../src/fcc/mockFccAdapter";

describe("MockFccAdapter", () => {
  it("should return COMPATIBLE for valid overlapping orders", async () => {
    const adapter = new MockFccAdapter();
    const requestId = await adapter.submitMatchPair({
      buyOrderCiphertext: JSON.stringify({ orderId: "0x0000000000000000000000000000000000000000000000000000000000000001", limitPrice: "600000000000000000" }), // 0.6
      sellOrderCiphertext: JSON.stringify({ orderId: "0x0000000000000000000000000000000000000000000000000000000000000002", limitPrice: "500000000000000000", amountIn: "100000000000000000000" }), // 0.5
      chainId: 114,
      vaultAddress: "0x3333333333333333333333333333333333333333"
    });

    const result = await adapter.pollResult(requestId);
    expect(result).not.toBeNull();
    expect(result!.status).toBe("COMPATIBLE");
    expect(result!.matchId).toBeDefined();
    expect(result!.executionPrice).toBe(550000000000000000n); // (0.5 + 0.6) / 2
  });

  it("should return INCOMPATIBLE for non-overlapping orders", async () => {
    const adapter = new MockFccAdapter();
    const requestId = await adapter.submitMatchPair({
      buyOrderCiphertext: JSON.stringify({ orderId: "0x0000000000000000000000000000000000000000000000000000000000000001", limitPrice: "400000000000000000" }), // 0.4
      sellOrderCiphertext: JSON.stringify({ orderId: "0x0000000000000000000000000000000000000000000000000000000000000002", limitPrice: "500000000000000000", amountIn: "100000000000000000000" }), // 0.5
      chainId: 114,
      vaultAddress: "0x3333333333333333333333333333333333333333"
    });

    const result = await adapter.pollResult(requestId);
    expect(result).not.toBeNull();
    expect(result!.status).toBe("INCOMPATIBLE");
  });

  it("should return INCOMPATIBLE when magic string is passed (for fallback tests)", async () => {
    const adapter = new MockFccAdapter();
    const requestId = await adapter.submitMatchPair({
      buyOrderCiphertext: "INCOMPATIBLE",
      sellOrderCiphertext: "0x123",
      chainId: 114,
      vaultAddress: "0x3333333333333333333333333333333333333333"
    });

    const result = await adapter.pollResult(requestId);
    expect(result).not.toBeNull();
    expect(result!.status).toBe("INCOMPATIBLE");
  });

  it("should return COMPATIBLE fallback if parsing fails", async () => {
    const adapter = new MockFccAdapter();
    const requestId = await adapter.submitMatchPair({
      buyOrderCiphertext: "0x123",
      sellOrderCiphertext: "0x456",
      chainId: 114,
      vaultAddress: "0x3333333333333333333333333333333333333333"
    });

    const result = await adapter.pollResult(requestId);
    expect(result).not.toBeNull();
    expect(result!.status).toBe("COMPATIBLE");
    expect(result!.executionPrice).toBe(1n);
  });
});

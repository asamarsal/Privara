import { describe, it, expect } from "vitest";
import { ethers } from "ethers";
import {
  FIXTURE_BUY_ORDER,
  FIXTURE_SELL_ORDER,
  Order,
  OrderType,
  computeOrderCommitment,
  hashMatchResult,
  orderFromWire,
  orderToWire,
} from "@privara/shared";
import { MockFccAdapter } from "../src/fcc/mockFccAdapter";
import { ConfigSchema } from "../src/config";

const TEST_SIGNER_PRIVATE_KEY = "0x0000000000000000000000000000000000000000000000000000000000000001";
const PRICE = 55n * 10n ** 16n;
const now = () => Math.floor(Date.now() / 1000);
const reader = (price = PRICE, timestamp = now()) => ({ readPrice: async () => ({ price, timestamp }) });

const payload = (order: Order) => JSON.stringify(orderToWire(order));
function request(buy: Order = FIXTURE_BUY_ORDER, sell: Order = FIXTURE_SELL_ORDER) {
  // Exercise both shared wire conversion directions before handing JSON to the adapter.
  expect(orderFromWire(JSON.parse(payload(buy)))).toEqual(buy);
  expect(orderFromWire(JSON.parse(payload(sell)))).toEqual(sell);
  return {
    buyOrderPayload: payload(buy), sellOrderPayload: payload(sell),
    buyCommitment: computeOrderCommitment(buy), sellCommitment: computeOrderCommitment(sell),
    chainId: 114, vaultAddress: buy.vaultAddress,
  };
}
async function match(buy: Order, sell: Order, oracle = reader(), minWindow = 30, maxAge = 300) {
  const adapter = new MockFccAdapter(TEST_SIGNER_PRIVATE_KEY, oracle, minWindow, maxAge);
  return adapter.pollResult(await adapter.submitMatchPair(request(buy, sell)));
}
const baseConfig = {
  COSTON2_RPC_URL: "http://localhost:8545", VAULT_CONTRACT_ADDRESS: "0x0000000000000000000000000000000000000000",
  VAULT_DEPLOY_BLOCK: 0, DEPLOYMENT_VERSION: "v2", MATCHER_PRIVATE_KEY: "0x" + "00".repeat(32),
};

describe("FCC configuration", () => {
  it("requires local oracle/signer configuration and remote credentials", () => {
    expect(ConfigSchema.safeParse({ ...baseConfig, FCC_MODE: "local_mock" }).success).toBe(false);
    expect(ConfigSchema.safeParse({ ...baseConfig, FCC_MODE: "local_mock", MOCK_FCC_SIGNER_PRIVATE_KEY: TEST_SIGNER_PRIVATE_KEY,
      FTSO_V2_ADDRESS: "0x0000000000000000000000000000000000000001", XRP_USD_FEED_ID: "0x" + "00".repeat(21) }).success).toBe(true);
    expect(ConfigSchema.safeParse({ ...baseConfig, FCC_MODE: "remote" }).success).toBe(false);
    expect(ConfigSchema.safeParse({ ...baseConfig, FCC_MODE: "remote", FCC_API_URL: "https://fcc.example.test/api", FCC_EXTENSION_ID: "extension-id" }).success).toBe(true);
  });
});

describe("MockFccAdapter Market/Limit/Stop V2", () => {
  it("matches market buy and sell collars through valid shared wire payloads", async () => {
    const marketBuy: Order = { ...FIXTURE_BUY_ORDER, orderType: OrderType.market, limitPrice: 56n * 10n ** 16n };
    const marketSell: Order = { ...FIXTURE_SELL_ORDER, orderType: OrderType.market, limitPrice: 54n * 10n ** 16n };
    expect(await match(marketBuy, { ...FIXTURE_SELL_ORDER, limitPrice: 54n * 10n ** 16n })).toMatchObject({ status: "COMPATIBLE", executionPrice: "550000000000000000" });
    expect(await match({ ...FIXTURE_BUY_ORDER, limitPrice: 56n * 10n ** 16n }, marketSell)).toMatchObject({ status: "COMPATIBLE", executionPrice: "550000000000000000" });
  });

  it("uses inclusive buy-stop trigger and keeps a dormant buy temporary", async () => {
    const buy: Order = { ...FIXTURE_BUY_ORDER, orderType: OrderType.stop, stopPrice: PRICE, limitPrice: 60n * 10n ** 16n };
    expect(await match(buy, FIXTURE_SELL_ORDER, reader(PRICE - 1n))).toBeNull();
    expect(await match(buy, FIXTURE_SELL_ORDER, reader(PRICE))).toMatchObject({ status: "COMPATIBLE" });
  });

  it("uses inclusive sell-stop trigger and keeps a dormant sell temporary", async () => {
    const sell: Order = { ...FIXTURE_SELL_ORDER, orderType: OrderType.stop, stopPrice: PRICE, limitPrice: 50n * 10n ** 16n };
    expect(await match(FIXTURE_BUY_ORDER, sell, reader(PRICE + 1n))).toBeNull();
    expect(await match(FIXTURE_BUY_ORDER, sell, reader(PRICE))).toMatchObject({ status: "COMPATIBLE" });
  });

  it("enforces stop-limit relationships and execution bounds", async () => {
    expect(() => orderToWire({ ...FIXTURE_BUY_ORDER, orderType: OrderType.stop, stopPrice: 61n * 10n ** 16n })).toThrow();
    expect(() => orderToWire({ ...FIXTURE_SELL_ORDER, orderType: OrderType.stop, stopPrice: 49n * 10n ** 16n })).toThrow();
    const boundedBuy: Order = { ...FIXTURE_BUY_ORDER, orderType: OrderType.stop, stopPrice: PRICE, limitPrice: PRICE };
    expect(await match(boundedBuy, { ...FIXTURE_SELL_ORDER, limitPrice: 56n * 10n ** 16n })).toMatchObject({ status: "INCOMPATIBLE" });
  });

  it("fails closed on stale, future, and zero injected oracle values", async () => {
    await expect(match(FIXTURE_BUY_ORDER, FIXTURE_SELL_ORDER, reader(PRICE, now() - 301), 30, 300)).rejects.toThrow("stale");
    await expect(match(FIXTURE_BUY_ORDER, FIXTURE_SELL_ORDER, reader(PRICE, now() + 1))).rejects.toThrow("future");
    await expect(match(FIXTURE_BUY_ORDER, FIXTURE_SELL_ORDER, reader(0n))).rejects.toThrow("nonzero");
  });

  it("rejects >200 bps deviation, insufficient budget, and settlement window", async () => {
    expect(await match(FIXTURE_BUY_ORDER, FIXTURE_SELL_ORDER, reader(50n * 10n ** 16n))).toMatchObject({ status: "INCOMPATIBLE", reason: expect.stringContaining("200 bps") });
    expect(await match({ ...FIXTURE_BUY_ORDER, amountIn: 54n * 10n ** 18n }, FIXTURE_SELL_ORDER)).toMatchObject({ status: "INCOMPATIBLE", reason: expect.stringContaining("budget") });
    const expiring = { ...FIXTURE_BUY_ORDER, expiry: now() + 29 };
    expect(await match(expiring, FIXTURE_SELL_ORDER)).toMatchObject({ status: "INCOMPATIBLE", reason: expect.stringContaining("settlement window") });
  });

  it("preserves V2 personal-sign signature recovery", async () => {
    const result = await match(FIXTURE_BUY_ORDER, FIXTURE_SELL_ORDER);
    expect(result?.status).toBe("COMPATIBLE");
    if (result?.status === "COMPATIBLE") {
      const recovered = ethers.verifyMessage(ethers.getBytes(hashMatchResult({
        ...result, executionPrice: BigInt(result.executionPrice), fxrpAmount: BigInt(result.fxrpAmount), quoteAmount: BigInt(result.quoteAmount),
      })), result.signature);
      expect(recovered).toBe(new ethers.Wallet(TEST_SIGNER_PRIVATE_KEY).address);
    }
  });

  it("rejects commitment mismatch and keeps deterministic request IDs", async () => {
    const adapter = new MockFccAdapter(TEST_SIGNER_PRIVATE_KEY, reader());
    const good = request();
    expect(await adapter.submitMatchPair(good)).toBe(await adapter.submitMatchPair(good));
    const bad = { ...good, buyCommitment: "0x" + "00".repeat(32) };
    await expect(adapter.pollResult(await adapter.submitMatchPair(bad))).rejects.toThrow("commitment mismatch");
  });
});

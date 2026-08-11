import { describe, expect, it } from "vitest";
import { Wallet } from "ethers";
import { FIXTURE_SELL_ORDER, orderToWire } from "@privara/shared";
import { OrderPayloadRegistry } from "../src/matcher/orderPayloadRegistry";

async function signedFixture(overrides: Record<string, unknown> = {}) {
  const wallet = new Wallet("0x0123456789012345678901234567890123456789012345678901234567890123");
  const order = { ...FIXTURE_SELL_ORDER, maker: wallet.address, ...overrides };
  const wire = orderToWire(order);
  const signature = await wallet.signMessage(JSON.stringify(wire));
  return { wallet, order: wire, signature };
}

describe("OrderPayloadRegistry", () => {
  it("accepts maker-signed canonical payload idempotently", async () => {
    const registry = new OrderPayloadRegistry();
    const fixture = await signedFixture();
    const first = registry.register(fixture.order, fixture.wallet.address, fixture.signature, 114, fixture.order.vaultAddress);
    const second = registry.register(fixture.order, fixture.wallet.address, fixture.signature, 114, fixture.order.vaultAddress);
    expect(first).toEqual(second);
    expect(registry.has(fixture.order.orderId)).toBe(true);
  });

  it("rejects wrong signer, chain, and vault", async () => {
    const registry = new OrderPayloadRegistry();
    const fixture = await signedFixture();
    const attacker = Wallet.createRandom();
    await expect(Promise.resolve().then(() => registry.register(fixture.order, attacker.address, fixture.signature, 114, fixture.order.vaultAddress))).rejects.toThrow("signature");
    expect(() => registry.register(fixture.order, fixture.wallet.address, fixture.signature, 115, fixture.order.vaultAddress)).toThrow("chain");
    expect(() => registry.register(fixture.order, fixture.wallet.address, fixture.signature, 114, attacker.address)).toThrow("vault");
  });

  it("rejects conflicting payload for one order ID", async () => {
    const registry = new OrderPayloadRegistry();
    const first = await signedFixture();
    registry.register(first.order, first.wallet.address, first.signature, 114, first.order.vaultAddress);
    const changed = await signedFixture({ amountIn: FIXTURE_SELL_ORDER.amountIn + 1n });
    expect(() => registry.register(changed.order, changed.wallet.address, changed.signature, 114, changed.order.vaultAddress)).toThrow("Conflicting payload");
  });
});

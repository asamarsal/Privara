import { ethers } from "ethers";
import { computeOrderCommitment, Order, OrderSide, orderFromWire, orderToWire } from "@privara/shared";

export class OrderPayloadRegistry {
  private readonly payloads = new Map<string, string>();

  public register(input: unknown, maker: string, signature: string, expectedChainId: number, expectedVault: string): { orderId: string; commitment: string } {
    const order = orderFromWire(input);
    const payload = JSON.stringify(orderToWire(order));
    const recovered = ethers.verifyMessage(payload, signature);
    if (recovered.toLowerCase() !== maker.toLowerCase() || order.maker.toLowerCase() !== maker.toLowerCase()) throw new Error("Maker signature is invalid");
    if (order.chainId !== expectedChainId) throw new Error("Wrong order chain");
    if (order.vaultAddress.toLowerCase() !== expectedVault.toLowerCase()) throw new Error("Wrong order vault");
    if (order.side !== OrderSide.buy && order.side !== OrderSide.sell) throw new Error("Unsupported side");
    const existing = this.payloads.get(order.orderId.toLowerCase());
    if (existing && existing !== payload) throw new Error("Conflicting payload for order ID");
    this.payloads.set(order.orderId.toLowerCase(), payload);
    return { orderId: order.orderId, commitment: computeOrderCommitment(order) };
  }

  public get(orderId: string): string | undefined {
    return this.payloads.get(orderId.toLowerCase());
  }

  public getOrder(orderId: string): Order | undefined {
    const payload = this.get(orderId);
    return payload ? orderFromWire(JSON.parse(payload)) : undefined;
  }

  public has(orderId: string): boolean {
    return this.payloads.has(orderId.toLowerCase());
  }
}

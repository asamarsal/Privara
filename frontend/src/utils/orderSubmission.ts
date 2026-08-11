import { orderToWire, type Order } from '@privara/shared';
import { deployment } from '../config/deployment';

export async function submitOrderPayload(order: Order, maker: string, signature: string): Promise<void> {
  const response = await fetch(`${deployment.backendUrl}/orders/payload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order: orderToWire(order), maker, signature }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Matcher payload submission failed (${response.status})`);
  }
}

export function createOrderId(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

export function createNonce(): bigint {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return BigInt(`0x${Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')}`);
}

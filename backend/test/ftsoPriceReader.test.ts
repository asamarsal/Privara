import { describe, expect, it } from "vitest";
import { normalizeFtsoPrice } from "../src/oracle/ftsoPriceReader";

describe("FTSO price normalization", () => {
  it("scales lower precision to 18 decimals", () => {
    expect(normalizeFtsoPrice(55_000n, 5)).toBe(550000000000000000n);
  });

  it("scales down higher precision", () => {
    expect(normalizeFtsoPrice(550000000000000000000n, 21)).toBe(550000000000000000n);
  });

  it("rejects zero and values that round to zero", () => {
    expect(() => normalizeFtsoPrice(0n, 5)).toThrow("nonzero");
    expect(() => normalizeFtsoPrice(1n, 19)).toThrow("rounds to zero");
  });
});

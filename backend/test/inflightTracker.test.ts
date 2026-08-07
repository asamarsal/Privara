import { describe, it, expect } from "vitest";
import { InFlightTracker } from "../src/matcher/inflightTracker";

describe("InFlightTracker", () => {
  it("should add and track in-flight pairs", () => {
    const tracker = new InFlightTracker();
    tracker.add({ buyOrderId: "buy1", sellOrderId: "sell1", requestId: "req1", submittedAt: Date.now() });

    expect(tracker.has("buy1", "sell1")).toBe(true);
    expect(tracker.getInFlightCount()).toBe(1);
  });

  it("should remove in-flight pairs", () => {
    const tracker = new InFlightTracker();
    tracker.add({ buyOrderId: "buy1", sellOrderId: "sell1", requestId: "req1", submittedAt: Date.now() });
    tracker.remove("buy1", "sell1");

    expect(tracker.has("buy1", "sell1")).toBe(false);
    expect(tracker.getInFlightCount()).toBe(0);
  });

  it("should remove expired pairs", async () => {
    const tracker = new InFlightTracker();
    const past = Date.now() - 5000;
    
    tracker.add({ buyOrderId: "buy1", sellOrderId: "sell1", requestId: "req1", submittedAt: past });
    tracker.add({ buyOrderId: "buy2", sellOrderId: "sell2", requestId: "req2", submittedAt: Date.now() });

    tracker.removeExpired(2000); // 2 seconds timeout

    expect(tracker.has("buy1", "sell1")).toBe(false);
    expect(tracker.has("buy2", "sell2")).toBe(true);
    expect(tracker.getInFlightCount()).toBe(1);
  });
});

import express from "express";
import cors from "cors";
import { ethers } from "ethers";
import { getConfig } from "./config";
import { logger } from "./logger";
import { Indexer } from "./indexer/indexer";
import { MockFccAdapter } from "./fcc/mockFccAdapter";
import { FccAdapter } from "./fcc/fccAdapter";
import { MatcherService } from "./matcher/matcherService";

async function main() {
  const config = getConfig();

  // Create Provider
  const provider = new ethers.JsonRpcProvider(config.COSTON2_RPC_URL);
  
  // Create Wallet
  const wallet = new ethers.Wallet(config.MATCHER_PRIVATE_KEY, provider);

  logger.info("Starting Privara Backend Matcher", { address: wallet.address });

  // Initialize Indexer
  const indexer = new Indexer(provider, config.VAULT_CONTRACT_ADDRESS, config.VAULT_DEPLOY_BLOCK);
  await indexer.replayEvents();

  // Initialize Adapter
  const isMock = config.FCC_API_URL === "mock_url" || config.FCC_API_URL.includes("mock");
  const fccAdapter = isMock ? new MockFccAdapter() : new FccAdapter();
  logger.info("Initialized FCC Adapter", { type: isMock ? "mock" : "real" });

  // Initialize Matcher Service
  const matcher = new MatcherService(provider, indexer, fccAdapter, wallet, config.VAULT_CONTRACT_ADDRESS);
  matcher.start();

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.get("/status", (req, res) => {
    const orderBook = indexer.getOrderBook();
    res.status(200).json({
      status: "ok",
      openOrdersCount: orderBook.size
    });
  });

  // GET /orders/:address - return all open orders for a maker address
  app.get("/orders/:address", (req, res) => {
    const { address } = req.params;
    const orderBook = indexer.getOrderBook();
    const makerOrders = Array.from(orderBook.values())
      .filter(o => o.maker.toLowerCase() === address.toLowerCase())
      .map(o => ({
        ...o,
        amountIn: o.amountIn.toString(), // bigint -> string for JSON
      }));
    res.status(200).json(makerOrders);
  });

  // GET /orders - return all open orders (for order book display)
  app.get("/orders", (req, res) => {
    const orderBook = indexer.getOrderBook();
    const allOrders = Array.from(orderBook.values()).map(o => ({
      ...o,
      amountIn: o.amountIn.toString(),
    }));
    res.status(200).json(allOrders);
  });

  app.listen(config.PORT, () => {
    logger.info(`API listening on port ${config.PORT}`);
  });

  process.on("SIGTERM", () => {
    logger.info("SIGTERM received. Shutting down.");
    matcher.stop();
    process.exit(0);
  });
}

main().catch((err) => {
  logger.fatal("Fatal error in main", { error: err.message });
  process.exit(1);
});

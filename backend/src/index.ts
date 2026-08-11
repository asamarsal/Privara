import express from "express";
import cors from "cors";
import { ethers } from "ethers";
import { getConfig } from "./config";
import { logger } from "./logger";
import { Indexer } from "./indexer/indexer";
import { MockFccAdapter } from "./fcc/mockFccAdapter";
import { FccAdapter } from "./fcc/fccAdapter";
import { MatcherService } from "./matcher/matcherService";
import { OrderPayloadRegistry } from "./matcher/orderPayloadRegistry";
import { FtsoPriceReader } from "./oracle/ftsoPriceReader";

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
  const isMock = config.FCC_MODE === "local_mock";
  const fccAdapter = isMock
    ? new MockFccAdapter(undefined, new FtsoPriceReader(provider, config.FTSO_V2_ADDRESS, config.XRP_USD_FEED_ID, config.ORACLE_MAX_AGE_SECONDS))
    : new FccAdapter();
  const payloads = new OrderPayloadRegistry();
  logger.info("Initialized FCC Adapter", { type: config.FCC_MODE });

  // Initialize Matcher Service
  const matcher = new MatcherService(indexer, payloads, fccAdapter, wallet, config.VAULT_CONTRACT_ADDRESS);
  await matcher.start();

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/live", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.get("/health", async (_req, res) => {
    try {
      const network = await provider.getNetwork();
      const code = await provider.getCode(config.VAULT_CONTRACT_ADDRESS);
      if (Number(network.chainId) !== 114 || code === "0x") throw new Error("Deployment is not ready");
      res.status(200).json({ status: "ready", chainId: Number(network.chainId), fccMode: config.FCC_MODE });
    } catch (error) {
      res.status(503).json({ status: "not_ready", error: (error as Error).message });
    }
  });

  app.post("/orders/payload", (req, res) => {
    try {
      const { order, maker, signature } = req.body ?? {};
      if (!order || typeof maker !== "string" || typeof signature !== "string") return res.status(400).json({ error: "order, maker, and signature are required" });
      const registered = payloads.register(order, maker, signature, 114, config.VAULT_CONTRACT_ADDRESS);
      const onChain = indexer.getOrderBook().get(registered.orderId);
      if (onChain && onChain.encryptedCommitment.toLowerCase() !== registered.commitment.toLowerCase()) return res.status(409).json({ error: "Payload does not match on-chain commitment" });
      return res.status(201).json(registered);
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
    }
  });

  app.get("/status", (_req, res) => {
    res.status(200).json({
      status: "ok",
      openOrdersCount: indexer.getOrderBook().size
    });
  });

  // GET /orders/:address - return all open orders for a maker address
  app.get("/orders/:address", (req, res) => {
    const { address } = req.params;
    if (!ethers.isAddress(address)) return res.status(400).json({ error: "Invalid EVM address" });
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
  app.get("/orders", (_req, res) => {
    const allOrders = Array.from(indexer.getOrderBook().values()).map(o => ({
      ...o,
      amountIn: o.amountIn.toString(),
    }));
    res.status(200).json(allOrders);
  });

  app.get("/portfolio/:address", (req, res) => {
    const { address } = req.params;
    if (!ethers.isAddress(address)) return res.status(400).json({ error: "Invalid EVM address" });
    const normalized = address.toLowerCase();
    const activeOrders = [...indexer.getOrderBook().values()]
      .filter(order => order.maker.toLowerCase() === normalized)
      .map(order => ({ ...order, amountIn: order.amountIn.toString() }));
    const allSettlements = indexer.getSettlements();
    const settledTrades = allSettlements.filter(trade => trade.buyer.toLowerCase() === normalized || trade.seller.toLowerCase() === normalized);
    const cutoff = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
    const volume = (trades: typeof allSettlements) => trades
      .filter(trade => trade.timestamp >= cutoff)
      .reduce((sum, trade) => sum + trade.quoteAmount, 0n).toString();
    const serializeTrade = (trade: (typeof allSettlements)[number]) => ({
      ...trade,
      executionPrice: trade.executionPrice.toString(),
      fxrpAmount: trade.fxrpAmount.toString(),
      quoteAmount: trade.quoteAmount.toString(),
    });
    return res.status(200).json({
      address: ethers.getAddress(address),
      activeOrders,
      settledTrades: settledTrades.map(serializeTrade),
      metrics: {
        activeOrdersCount: activeOrders.length,
        settledTradesCount: settledTrades.length,
        userVolume24hQuote: volume(settledTrades),
        protocolVolume24hQuote: volume(allSettlements),
      },
      indexer: indexer.getFreshness(),
    });
  });

  app.listen(config.PORT, () => {
    logger.info(`API listening on port ${config.PORT}`);
  });

  process.on("SIGTERM", () => {
    logger.info("SIGTERM received. Shutting down.");
    matcher.stop();
    indexer.stop();
    process.exit(0);
  });
}

main().catch((err) => {
  logger.fatal("Fatal error in main", { error: err.message });
  process.exit(1);
});

import { ethers } from "ethers";
import { IFccAdapter, MatchPairRequest, MatchPairResult } from "./types";
import { logger } from "../logger";

// MOCK ADAPTER — Test use only. Must not be used in production.
export class MockFccAdapter implements IFccAdapter {
  private requests = new Map<string, MatchPairRequest>();
  private testSigner: ethers.Wallet;

  constructor() {
    // We use a dummy private key for signing mock results. 
    // In actual tests, the tests will have to fund or whitelist this signer in the Mock verifier if needed, 
    // but TestVerifier just recovers the signer address.
    this.testSigner = new ethers.Wallet("0x1111111111111111111111111111111111111111111111111111111111111111");
  }

  public async submitMatchPair(request: MatchPairRequest): Promise<string> {
    const requestId = ethers.keccak256(ethers.toUtf8Bytes(Date.now().toString() + Math.random().toString()));
    this.requests.set(requestId, request);
    logger.debug("MockFccAdapter: submitMatchPair", { requestId });
    return requestId;
  }

  public async pollResult(requestId: string): Promise<MatchPairResult | null> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Request ${requestId} not found`);
    }

    // Attempt to parse JSON. If it fails, assume it's incompatible for test sake,
    // or simulate incompatibility based on some dummy string.
    try {
      const buyOrder = JSON.parse(request.buyOrderCiphertext);
      const sellOrder = JSON.parse(request.sellOrderCiphertext);

      // Check limitPrice overlap
      const buyPrice = BigInt(buyOrder.limitPrice);
      const sellPrice = BigInt(sellOrder.limitPrice);

      if (buyPrice < sellPrice) {
        return { status: "INCOMPATIBLE" };
      }

      const executionPrice = (buyPrice + sellPrice) / 2n;
      const fxrpAmount = BigInt(sellOrder.amountIn);
      const quoteAmount = (fxrpAmount * executionPrice) / (10n ** 18n);
      
      const expiry = Math.floor(Date.now() / 1000) + 3600;

      // Construct MatchResult for hashing (Phase 2 TestVerifier style)
      // TestVerifier expects: verify(digest, signature)
      // The digest is keccak256(abi.encode(MatchResult))
      const matchId = ethers.keccak256(ethers.toUtf8Bytes("match-" + requestId));
      
      const digest = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          [
            "bytes32",
            "bytes32",
            "bytes32",
            "uint256",
            "uint256",
            "uint256",
            "uint64",
            "uint64",
            "address",
          ],
          [
            matchId,
            buyOrder.orderId,
            sellOrder.orderId,
            executionPrice,
            fxrpAmount,
            quoteAmount,
            expiry,
            request.chainId,
            request.vaultAddress,
          ]
        )
      );

      const signature = await this.testSigner.signMessage(ethers.getBytes(digest));

      return {
        status: "COMPATIBLE",
        matchId,
        buyOrderId: buyOrder.orderId,
        sellOrderId: sellOrder.orderId,
        executionPrice,
        fxrpAmount,
        quoteAmount,
        expiry,
        chainId: request.chainId,
        vaultAddress: request.vaultAddress,
        signature,
      };

    } catch (e) {
      // If parsing fails (e.g. they just sent bytes32 hashes), return compatible with dummy data
      // just to satisfy the tests. Wait, if it's not JSON, how do we return INCOMPATIBLE for tests?
      // We can use a magic string in the ciphertext to simulate INCOMPATIBLE.
      if (request.buyOrderCiphertext === "INCOMPATIBLE") {
        return { status: "INCOMPATIBLE" };
      }

      const matchId = ethers.keccak256(ethers.toUtf8Bytes("dummy-match-" + requestId));
      const digest = ethers.keccak256(ethers.toUtf8Bytes("dummy"));
      const signature = await this.testSigner.signMessage(ethers.getBytes(digest));

      return {
        status: "COMPATIBLE",
        matchId,
        buyOrderId: ethers.keccak256(ethers.toUtf8Bytes("buy")),
        sellOrderId: ethers.keccak256(ethers.toUtf8Bytes("sell")),
        executionPrice: 1n,
        fxrpAmount: 1n,
        quoteAmount: 1n,
        expiry: Math.floor(Date.now() / 1000) + 3600,
        chainId: request.chainId,
        vaultAddress: request.vaultAddress,
        signature
      };
    }
  }
}

# Privara 🛡️ 

> **Private orders. Fair settlement.** 
> *Trade FXRP without revealing your limits.*

Privara is a decentralized confidential matching order book built on the **Flare Network**. It enables users to trade FXRP and USDT0 without exposing their order terms to the public, protecting them from front-running, sandwich attacks, and MEV. 

---

## 🏆 Hackathon Submission Details

### 1. Project Name
**Privara**

### 2. Selected Bounty
- **Flare Network**: General / DeFi (Utilizing Flare Confidential Compute & FTSOv2)

### 3. Short Product Description
Privara solves the MEV and front-running problems of traditional DEXs by encrypting order terms on the client side. Orders are matched in a secure enclave (Flare Confidential Compute) where price and quantity limits remain strictly confidential. Only successfully matched orders are executed on-chain, utilizing FTSOv2 as a decentralized price guard to ensure fair settlement.

### 4. Target User
- **DeFi Traders & Whales**: Users executing large FXRP trades who want to avoid price slippage caused by front-running.
- **Institutions**: Entities requiring strict privacy for their trading strategies and order book positions.

### 5. Demo & Links
- **Demo Video**: *(Insert Video Link Here)*
- **Live App (Testnet)**: *(Insert App Link Here)* 
- **GitHub Repository**: *(Insert GitHub Link Here)*

---

## 🚀 How Privara Uses Flare

Privara is deeply integrated with Flare's core protocols to achieve its confidential trading model:

1. **Flare Confidential Compute (FCC)** 
   Order terms (price limits, quantities) are encrypted in the browser. The Privara matcher runs inside a Trusted Execution Environment (TEE) powered by FCC. It decrypts the orders, privately compares them to find a match, and returns a signed match result. At no point are the raw order terms visible to the matcher operator or the public blockchain.
   
2. **FTSOv2 (Flare Time Series Oracle v2)**
   To ensure that the off-chain matched price is fair and manipulation-resistant, Privara's smart contract queries the FTSOv2 XRP/USD feed during settlement. The contract acts as a price guard, verifying the settlement against the decentralized oracle before transferring funds.

3. **Coston2 Smart Contracts**
   The entire non-custodial vault and settlement logic is deployed natively on Flare's Coston2 Testnet, taking advantage of fast block times and low fees.

---

## 🏗️ What Was Built During the Hackathon

The entire Privara stack was conceptualized, designed, and built from scratch during this hackathon:
- **Smart Contracts (`/smartcontract`)**: Engineered the `PrivaraVault` for non-custodial asset management and atomic on-chain settlement, along with an FCC signature verification module.
- **Confidential Matcher (`/backend`)**: Developed the off-chain matching engine that simulates TEE decryption and order matching.
- **Frontend (`/frontend`)**: Built a premium, responsive Web3 interface using Next.js, Wagmi, and GSAP for institutional-grade 3D UI/UX and smooth animations.

---

## 🔗 Smart Contract Deployments (Coston2 Testnet)

Privara is fully deployed and functional on the **Flare Coston2 Testnet** (Chain ID: 114):

- **Privara Vault**: `0xA83a1b48eA4b0d255125cA556AcefaF274CCC1A6` (and `0xa479Bc0C4B000D0dcD6FaC3BB9E71B830eBE048E`)
- **FCC Verifier (Mock)**: `0x56a4ab076b49806BDf31c529355067401e3AA572`
- **Supported Assets**: 
  - FXRP (`0xa3Bd00D652D0f28D2417339322A51d4Fbe2B22D3`)
  - USDT0 (`0xC1A5B41512496B80903D1f32d6dEa3a73212E71F`)
- **Oracle**: FTSOv2 XRP/USD Feed (`0x015852502f55534400000000000000000000000000`)

---

## 🔮 Roadmap & Next Steps

1. **Full TEE Integration**: Transition the current FCC matching engine mock into a production-ready hardware TEE enclave (e.g., Intel SGX/AWS Nitro).
2. **Flare Mainnet Launch**: Audit the smart contracts and deploy the protocol to the Flare Mainnet.
3. **Expanded Asset Support**: Support additional FAsset pairs (FDOge, FLTC, etc.) beyond FXRP.
4. **Liquidity Mining**: Introduce incentives for market makers to provide dark pool liquidity inside the Privara ecosystem.
5. **Real User Testing**: Begin onboarding pilot users and trading firms for beta testing on Coston2 to gather feedback on the UX and matching latency.

---
*Built with ❤️ for the Flare Hackathon.*

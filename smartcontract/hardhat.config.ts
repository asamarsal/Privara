import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

// Load from root .env if running from workspace, or local .env
dotenv.config({ path: "../.env" });

const coston2RpcUrl = process.env.COSTON2_RPC_URL || "https://coston2-api.flare.network/ext/C/rpc";
const deployerKey = process.env.DEPLOYER_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001"; // Default dummy key for compilation if not provided

const config: HardhatUserConfig = {
  solidity: { version: "0.8.24", settings: { evmVersion: "cancun" } },
  networks: {
    hardhat: {
      chainId: 31337 // Standard local network for testing
    },
    coston2: {
      url: coston2RpcUrl,
      accounts: [deployerKey],
      chainId: 114
    }
  }
};

export default config;



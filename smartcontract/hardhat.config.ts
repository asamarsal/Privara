import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import * as path from "path";

// Resolve from this package so commands behave consistently from either workspace root.
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const coston2RpcUrl = process.env.COSTON2_RPC_URL || "https://coston2-api.flare.network/ext/C/rpc";
const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
if (deployerKey && !/^0x[a-fA-F0-9]{64}$/.test(deployerKey)) {
  throw new Error("DEPLOYER_PRIVATE_KEY must be a 32-byte 0x-prefixed hex value");
}


const config: HardhatUserConfig = {
  solidity: { version: "0.8.24", settings: { evmVersion: "cancun" } },
  networks: {
    hardhat: {
      chainId: 31337 // Standard local network for testing
    },
    coston2: {
      url: coston2RpcUrl,
      accounts: deployerKey ? [deployerKey] : [],
      chainId: 114
    }
  }
};

export default config;



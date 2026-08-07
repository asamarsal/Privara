import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const rpcUrl = process.env.COSTON2_RPC_URL || "https://coston2-api.flare.network/ext/C/rpc";
const ftsoAddress = process.env.FTSO_V2_ADDRESS || "0x3d893C53D9e8056135C26C8c638B76C8b60Df726";
const feedId = process.env.XRP_USD_FEED_ID || "0x015852502f55534400000000000000000000000000";

const abi = [
    "function getFeedById(bytes21 _feedId) external view returns (uint256 _value, int8 _decimals, uint64 _timestamp)"
];

async function main() {
    console.log("Connecting to Coston2 RPC...");
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    const ftso = new ethers.Contract(ftsoAddress, abi, provider);

    console.log(`Querying FTSOv2 at ${ftsoAddress}`);
    console.log(`Feed ID: ${feedId}`);

    const result = await ftso.getFeedById(feedId);
    const value = result[0];
    const decimals = Number(result[1]);
    const timestamp = result[2];

    let normalizedPrice = value;
    if (decimals < 18) {
        normalizedPrice = value * (10n ** BigInt(18 - decimals));
    } else if (decimals > 18) {
        normalizedPrice = value / (10n ** BigInt(decimals - 18));
    }

    console.log("--- Result ---");
    console.log(`Raw price: ${value}`);
    console.log(`Decimals: ${decimals}`);
    console.log(`Normalized (18 decimals): ${normalizedPrice}`);
    console.log(`Timestamp: ${timestamp} (${new Date(Number(timestamp) * 1000).toISOString()})`);
}

main().catch(console.error);

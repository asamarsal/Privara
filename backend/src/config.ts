import { z } from "zod";
import { resolve } from "path";
import { config as dotenvConfig } from "dotenv";

// Load from `.env` in the root `privara` folder
dotenvConfig({ path: resolve(__dirname, "../../.env") });

const ConfigSchema = z.object({
  COSTON2_RPC_URL: z.string().min(1, "COSTON2_RPC_URL is required"),
  VAULT_CONTRACT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM address"),
  VAULT_DEPLOY_BLOCK: z.coerce.number().int().nonnegative(),
  MATCHER_PRIVATE_KEY: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid hex private key"),
  FCC_EXTENSION_ID: z.string().optional(), // mock mode doesn't strictly need it
  FCC_API_URL: z.string().url("FCC_API_URL must be a valid URL").or(z.literal("mock_url")),
  POLL_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
  POLL_TIMEOUT_MS: z.coerce.number().int().positive().default(120000),
  PORT: z.coerce.number().int().positive().default(3001),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
});

export type Config = z.infer<typeof ConfigSchema>;

let config: Config;

if (process.env.NODE_ENV === "test") {
  config = {
    COSTON2_RPC_URL: "http://localhost:8545",
    VAULT_CONTRACT_ADDRESS: "0x0000000000000000000000000000000000000000",
    VAULT_DEPLOY_BLOCK: 0,
    MATCHER_PRIVATE_KEY: "0x0000000000000000000000000000000000000000000000000000000000000000",
    FCC_EXTENSION_ID: "test",
    FCC_API_URL: "http://localhost:3300",
    POLL_INTERVAL_MS: 5000,
    POLL_TIMEOUT_MS: 120000,
    PORT: 3001,
    LOG_LEVEL: "info",
  } as Config;
} else {
  try {
    config = ConfigSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Invalid environment variables:");
      error.issues.forEach((e) => {
        console.error(`  - ${e.path.join(".")}: ${e.message}`);
      });
    } else {
      console.error("❌ Failed to parse config:", error);
    }
    process.exit(1);
  }
}

export const getConfig = (): Config => config;

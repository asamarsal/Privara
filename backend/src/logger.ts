import pino from "pino";
import { getConfig } from "./config";

const config = getConfig();

// Create a Pino logger instance
const rawLogger = pino({
  level: config.LOG_LEVEL,
  transport:
    process.env.NODE_ENV !== "production"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
          },
        }
      : undefined,
});

// A wrapper to prevent sensitive data logging
export const logger = {
  info: (msg: string, data?: any) => rawLogger.info(sanitize(data), msg),
  warn: (msg: string, data?: any) => rawLogger.warn(sanitize(data), msg),
  error: (msg: string, data?: any) => rawLogger.error(sanitize(data), msg),
  debug: (msg: string, data?: any) => rawLogger.debug(sanitize(data), msg),
  fatal: (msg: string, data?: any) => rawLogger.fatal(sanitize(data), msg),
  trace: (msg: string, data?: any) => rawLogger.trace(sanitize(data), msg),
};

function sanitize(data: any): any {
  if (!data) return data;
  if (typeof data !== "object") return data;

  const sanitized = { ...data };
  const forbiddenKeys = [
    "limitPrice",
    "LimitPrice",
    "amountIn",
    "AmountIn",
    "encryptedCommitment",
    "MATCHER_PRIVATE_KEY",
    "privateKey",
  ];

  for (const key of Object.keys(sanitized)) {
    if (forbiddenKeys.includes(key)) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof sanitized[key] === "object") {
      sanitized[key] = sanitize(sanitized[key]);
    }
  }

  return sanitized;
}

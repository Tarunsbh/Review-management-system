import Redis from "ioredis";
import { logger } from "../utils/logger";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const REDIS_CONNECT_TIMEOUT_MS = Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 1500);

const redisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
};

let redisInstance: Redis | null = null;

export function getRedis(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis(REDIS_URL, redisOptions);

    redisInstance.on("connect", () => {
      logger.info("Redis connected");
    });

    redisInstance.on("error", (err) => {
      logger.warn("Redis connection error (non-fatal):", err.message);
    });
  }
  return redisInstance;
}

export function createRedisClient(): Redis {
  return new Redis(REDIS_URL, redisOptions);
}

export async function isRedisAvailable(): Promise<boolean> {
  const client = getRedis();

  try {
    await Promise.race([
      client.ping(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Redis connection timed out")), REDIS_CONNECT_TIMEOUT_MS);
      }),
    ]);
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(`Redis unavailable — Redis-backed features disabled: ${message}`);
    client.disconnect();
    return false;
  }
}

export const redis = getRedis();
export default redis;

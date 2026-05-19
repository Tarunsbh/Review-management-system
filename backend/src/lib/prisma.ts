import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";

// ─────────────────────────────────────────────────────────────────────────────
// PrismaClient Singleton
// Re-use a single connection across hot-reloads in development
// ─────────────────────────────────────────────────────────────────────────────

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [
      { emit: "event", level: "query" },
      { emit: "event", level: "error" },
      { emit: "event", level: "warn" },
    ],
  });

// Forward Prisma query events to Winston in development
if (process.env.NODE_ENV === "development") {
  (prisma as any).$on("query", (e: any) => {
    logger.debug("Prisma Query", {
      query: e.query,
      params: e.params,
      duration: `${e.duration}ms`,
    });
  });
}

(prisma as any).$on("error", (e: any) => {
  logger.error("Prisma Error", { message: e.message, target: e.target });
});

(prisma as any).$on("warn", (e: any) => {
  logger.warn("Prisma Warning", { message: e.message });
});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;

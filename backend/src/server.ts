import dotenv from "dotenv";
dotenv.config();

import http from "http";
import app from "./app";
import { logger } from "./utils/logger";
import { startSyncJob } from "./jobs/syncJob";
import { runDbInit } from "./scripts/db-init";
import { initReviewsGateway } from "./gateways/reviews.gateway";
import { startReviewSyncWorker } from "./workers/reviewSync.worker";
import { startEmailWorker } from "./workers/email.worker";
import { isRedisAvailable } from "./lib/redis";

const PORT = process.env.PORT || 4000;

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Promise Rejection", { reason });
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception", error);
  process.exit(1);
});

// ── Bootstrap ──────────────────────────────────────────────
runDbInit()
  .then(async () => {
    // Wrap Express in an HTTP server so Socket.io can attach
    const httpServer = http.createServer(app);

    // Initialise Socket.io gateway
    try {
      await initReviewsGateway(httpServer);
      logger.info("🔌 Socket.io gateway initialised");
    } catch (err) {
      logger.warn("⚠️  Socket.io gateway failed (non-fatal):", String(err));
    }

    // Start BullMQ workers (gracefully skip if Redis is unavailable)
    try {
      if (await isRedisAvailable()) {
        startReviewSyncWorker();
        startEmailWorker();
        logger.info("🗂️  BullMQ workers started");
      } else {
        logger.warn("⚠️  BullMQ workers skipped — Redis is unavailable");
      }
    } catch (err) {
      logger.warn("⚠️  BullMQ workers failed (non-fatal — Redis may be offline):", String(err));
    }

    httpServer.listen(PORT, () => {
      logger.info(`🚀 eGlobe Review Management API running on port ${PORT}`);
      logger.info(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
      logger.info(`🔗 API URL: http://localhost:${PORT}/api`);
      logger.info(`📖 API Docs: http://localhost:${PORT}/api/docs`);

      // Start cron-based sync scheduler
      try {
        startSyncJob();
        logger.info("⏰ Background sync job started");
      } catch (err) {
        logger.warn("⚠️  Sync job failed to start:", String(err));
      }
    });

    process.on("SIGTERM", () => {
      logger.info("SIGTERM received — shutting down gracefully");
      httpServer.close(() => {
        logger.info("HTTP server closed");
        process.exit(0);
      });
    });

    process.on("SIGINT", () => {
      logger.info("SIGINT received — shutting down gracefully");
      httpServer.close(() => {
        logger.info("HTTP server closed");
        process.exit(0);
      });
    });

  })
  .catch((err) => {
    logger.error("Fatal: DB init failed", err);
    process.exit(1);
  });

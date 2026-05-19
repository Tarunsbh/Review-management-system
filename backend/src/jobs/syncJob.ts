import cron from "node-cron";
import { prisma } from "../lib/prisma";
import { GoogleService } from "../services/GoogleService";
import { logger } from "../utils/logger";

export const startSyncJob = (): void => {
  // ── Hourly review sync ───────────────────────────────────────────────────────
  cron.schedule("0 * * * *", async () => {
    logger.info("⏰ Running scheduled review sync...");
    const start = Date.now();
    const syncLog = await prisma.syncLog.create({
      data: { status: "IN_PROGRESS", triggeredBy: "cron" },
    }).catch(() => null);

    try {
      const result   = await GoogleService.syncReviews();
      const duration = (Date.now() - start) / 1000;

      if (syncLog) {
        await prisma.syncLog.update({
          where: { id: syncLog.id },
          data: {
            status:         result.totalSynced > 0 || !result.error ? "SUCCESS" : "FAILED",
            reviewsSynced:  result.totalSynced,
            newReviews:     result.newReviews,
            updatedReviews: result.updatedReviews,
            completedAt:    new Date(),
            duration,
            errors:         result.error ? JSON.stringify([result.error]) : null,
          },
        }).catch(() => {});
      }

      if (result.newReviews > 0) {
        await prisma.notification.create({
          data: {
            type:    "SYNC_COMPLETE",
            title:   `Auto-sync: ${result.newReviews} new review${result.newReviews > 1 ? "s" : ""}`,
            message: `Scheduled sync found ${result.newReviews} new review${result.newReviews > 1 ? "s" : ""} via ${result.source === "business_profile" ? "Google Business Profile" : "Google Places API"}.`,
          },
        }).catch(() => {});
      }

      logger.info("✅ Scheduled sync completed", {
        source:     result.source,
        newReviews: result.newReviews,
        total:      result.totalSynced,
        duration:   `${duration.toFixed(2)}s`,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error("❌ Scheduled sync failed", { error: msg });

      if (syncLog) {
        await prisma.syncLog.update({
          where: { id: syncLog.id },
          data: {
            status:      "FAILED",
            completedAt: new Date(),
            errors:      JSON.stringify([msg]),
          },
        }).catch(() => {});
      }
    }
  });

  // ── Daily analytics aggregation at midnight ──────────────────────────────────
  cron.schedule("0 0 * * *", async () => {
    logger.info("📊 Running daily analytics aggregation...");
    // Analytics are computed on-demand from the reviews table — nothing to cache
  });

  logger.info("⏰ Cron jobs scheduled: review sync (hourly), analytics (daily)");
};

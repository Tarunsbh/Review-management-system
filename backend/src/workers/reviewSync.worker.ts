import { Worker, Job } from "bullmq";
import { PrismaClient } from "@prisma/client";
import axios from "axios";
import { redis } from "../lib/redis";
import { logger } from "../utils/logger";

const prisma = new PrismaClient();

async function processJob(job: Job): Promise<void> {
  const { type } = job.data as { type: string; businessId?: string };

  if (type === "sync-reviews") {
    await syncReviews(job);
  } else if (type === "retry-failed") {
    await retryFailed(job);
  } else {
    throw new Error(`Unknown job type: ${type}`);
  }
}

async function syncReviews(job: Job): Promise<void> {
  const startedAt = new Date();
  logger.info(`[reviewSync] Starting sync job ${job.id}`);

  // Read Google auth credentials
  const googleAuth = await prisma.googleAuth.findFirst();
  if (!googleAuth?.isConnected || !googleAuth.accessToken) {
    logger.warn("[reviewSync] Google not connected — skipping sync");
    return;
  }

  let reviewsSynced = 0;
  let newReviews = 0;
  let errors: string | null = null;

  try {
    const { locationId, accountId, accessToken } = googleAuth;
    if (!locationId || !accountId) {
      throw new Error("Missing locationId or accountId");
    }

    const url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { pageSize: 50 },
    });

    const reviews: Array<{
      reviewId: string;
      reviewer: { displayName: string; profilePhotoUrl?: string };
      starRating: string;
      comment?: string;
      createTime: string;
      reviewReply?: { comment: string; updateTime: string };
      name: string;
    }> = response.data.reviews || [];

    const starMap: Record<string, number> = {
      ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5,
    };

    for (const r of reviews) {
      reviewsSynced++;
      const rating = starMap[r.starRating] || 3;
      const existing = await prisma.review.findUnique({
        where: { googleReviewId: r.reviewId },
      });

      if (!existing) {
        await prisma.review.create({
          data: {
            googleReviewId:   r.reviewId,
            reviewerName:     r.reviewer.displayName,
            reviewerPhotoUrl: r.reviewer.profilePhotoUrl,
            rating,
            text:          r.comment || "",
            publishedAt:   new Date(r.createTime),
            sentiment:     rating >= 4 ? "POSITIVE" : rating === 3 ? "NEUTRAL" : "NEGATIVE",
            sentimentScore: rating / 5,
            googleReviewUrl: r.name,
            isSynced: true,
            isNew:    true,
          },
        });
        newReviews++;
      }
    }

    await prisma.syncLog.create({
      data: {
        status:        "SUCCESS",
        reviewsSynced,
        newReviews,
        updatedReviews: 0,
        startedAt,
        completedAt:   new Date(),
        duration:      (Date.now() - startedAt.getTime()) / 1000,
        triggeredBy:   "queue",
      },
    });

    logger.info(`[reviewSync] Done — ${newReviews} new, ${reviewsSynced} total`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors = msg;
    logger.error("[reviewSync] Sync failed:", msg);

    await prisma.syncLog.create({
      data: {
        status:      "FAILED",
        reviewsSynced,
        newReviews,
        updatedReviews: 0,
        errors,
        startedAt,
        completedAt: new Date(),
        triggeredBy: "queue",
      },
    });

    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

async function retryFailed(_job: Job): Promise<void> {
  logger.info("[reviewSync] Retrying failed sync jobs");
  // Re-queue failed syncs logic here if needed
}

export function startReviewSyncWorker(): Worker {
  const worker = new Worker("review-sync", processJob, { connection: redis });

  worker.on("completed", (job) => {
    logger.info(`[reviewSync] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    logger.error(`[reviewSync] Job ${job?.id} failed:`, err.message);
  });

  logger.info("[reviewSync] Worker started");
  return worker;
}

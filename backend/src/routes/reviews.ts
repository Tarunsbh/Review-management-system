import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { GoogleService } from "../services/GoogleService";
import { logger } from "../utils/logger";
import { normalizeString } from "../utils/params";

const router = Router();
router.use(authenticate);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reviews
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  "/",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = normalizeString(req.query.page) ?? "1";
    const limit = normalizeString(req.query.limit) ?? "12";
    const search = normalizeString(req.query.search);
    const rating = normalizeString(req.query.rating);
    const sentiment = normalizeString(req.query.sentiment);
    const hasReply = normalizeString(req.query.hasReply);
    const sortBy = normalizeString(req.query.sortBy) ?? "publishedAt";
    const sortOrder = normalizeString(req.query.sortOrder) ?? "desc";

    const pageNum  = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip     = (pageNum - 1) * limitNum;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // Build Prisma where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { reviewerName: { contains: search } },
        { text:         { contains: search } },
      ];
    }
    if (rating && rating !== "all") {
      where.rating = parseInt(rating);
    }
    if (sentiment && sentiment !== "all") {
      where.sentiment = sentiment.toUpperCase();
    }
    if (hasReply === "true") {
      where.reply = { isNot: null };
    } else if (hasReply === "false") {
      where.reply = { is: null };
    }

    // Order
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allowedSort: Record<string, any> = {
      publishedAt: { publishedAt: sortOrder },
      rating:      { rating:      sortOrder },
      createdAt:   { createdAt:   sortOrder },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orderBy: any = allowedSort[sortBy] ?? { publishedAt: "desc" };

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: { reply: true },
      }),
      prisma.review.count({ where }),
    ]);

    // Mark fetched reviews as seen
    const newIds = reviews.filter((r: any) => r.isNew).map((r: any) => r.id);
    if (newIds.length > 0) {
      await prisma.review.updateMany({
        where: { id: { in: newIds } },
        data:  { isNew: false },
      });
    }

    return res.json({
      success: true,
      data: {
        reviews: reviews.map((r: any) => ({
          ...r,
          keywords: safeParseJson(r.keywords, []),
        })),
        total,
        page:       pageNum,
        limit:      limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reviews/export  (must be BEFORE /:id)
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  "/export",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const format = typeof req.query.format === "string" ? req.query.format : "csv";

    const reviews = await prisma.review.findMany({
      orderBy: { publishedAt: "desc" },
      include: { reply: true },
    });

    if (format === "csv") {
      const header = "ID,Reviewer,Rating,Text,Date,Sentiment,Has Reply,Reply Text";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (reviews as any[]).map((r: any) => {
        const safe = (s: string) => `"${s.replace(/"/g, '""')}"`;
        return [
          r.id,
          safe(r.reviewerName),
          r.rating,
          safe(r.text),
          r.publishedAt.toISOString(),
          r.sentiment,
          r.reply ? "Yes" : "No",
          r.reply ? safe(r.reply.text) : "",
        ].join(",");
      });

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=reviews-${Date.now()}.csv`);
      return res.send([header, ...rows].join("\n"));
    }

    return res.status(400).json({ success: false, error: "Unsupported format. Use csv." });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reviews/:id
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  "/:id",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = normalizeString(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, error: "Invalid review id" });
    }

    const review = await prisma.review.findUnique({
      where:   { id },
      include: { reply: true, aiReplies: { orderBy: { createdAt: "desc" }, take: 5 } },
    });

    if (!review) {
      return res.status(404).json({ success: false, error: "Review not found" });
    }

    return res.json({
      success: true,
      data: { ...review, keywords: safeParseJson(review.keywords, []) },
    });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/reviews/sync  — trigger a manual Google sync
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  "/sync",
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const syncLog = await prisma.syncLog.create({
      data: {
        status:      "IN_PROGRESS",
        triggeredBy: "manual",
      },
    });

    const start = Date.now();

    try {
      const result   = await GoogleService.syncReviews();
      const duration = (Date.now() - start) / 1000;

      const updated = await prisma.syncLog.update({
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
      });

      logger.info("Manual sync completed", {
        syncId:     syncLog.id,
        source:     result.source,
        newReviews: result.newReviews,
        total:      result.totalSynced,
      });

      return res.json({
        success: true,
        data:    updated,
        message: result.error
          ? result.error
          : `Synced ${result.totalSynced} reviews (${result.newReviews} new) via ${result.source === "business_profile" ? "Google Business Profile" : "Google Places API"}.`,
        syncResult: result,
      });
    } catch (err) {
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status:      "FAILED",
          completedAt: new Date(),
          errors:      JSON.stringify([String(err)]),
        },
      });
      throw err;
    }
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/reviews/:id/reply
// ─────────────────────────────────────────────────────────────────────────────

const replySchema = z.object({
  text:          z.string().min(1, "Reply text required").max(4000),
  isAiGenerated: z.boolean().optional().default(false),
  postedToGoogle: z.boolean().optional().default(false),
});

router.post(
  "/:id/reply",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const parsed = replySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: "Validation failed", details: parsed.error.errors });
    }

    const reviewId = normalizeString(req.params.id);
    if (!reviewId) {
      return res.status(400).json({ success: false, error: "Invalid review id" });
    }

    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) {
      return res.status(404).json({ success: false, error: "Review not found" });
    }

    // Upsert so editing an existing reply also works
    const reply = await prisma.reviewReply.upsert({
      where:  { reviewId },
      create: {
        reviewId,
        text:          parsed.data.text,
        isAiGenerated: parsed.data.isAiGenerated,
        postedToGoogle: parsed.data.postedToGoogle,
        postedAt:      parsed.data.postedToGoogle ? new Date() : null,
      },
      update: {
        text:          parsed.data.text,
        isAiGenerated: parsed.data.isAiGenerated,
        postedToGoogle: parsed.data.postedToGoogle,
        postedAt:      parsed.data.postedToGoogle ? new Date() : undefined,
        updatedAt:     new Date(),
      },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        type:     "REPLY_POSTED",
        title:    `Reply posted to ${review.reviewerName}'s review`,
        message:  `Your reply to ${review.reviewerName} has been saved${parsed.data.postedToGoogle ? " and posted to Google" : ""}.`,
        reviewId: review.id,
      },
    });

    logger.info("Reply saved", { reviewId, userId: req.user?.id });

    return res.status(201).json({
      success: true,
      data:    reply,
      message: "Reply posted successfully",
    });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/reviews/:id/reply/:replyId
// ─────────────────────────────────────────────────────────────────────────────

router.put(
  "/:id/reply/:replyId",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { text } = req.body;
    if (!text?.trim()) {
      return res.status(400).json({ success: false, error: "Reply text required" });
    }

    const replyId = normalizeString(req.params.replyId);
    if (!replyId) {
      return res.status(400).json({ success: false, error: "Invalid reply id" });
    }

    const reply = await prisma.reviewReply.update({
      where: { id: replyId },
      data:  { text: text.trim(), updatedAt: new Date() },
    });

    return res.json({ success: true, data: reply, message: "Reply updated" });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/reviews/:id/reply/:replyId
// ─────────────────────────────────────────────────────────────────────────────

router.delete(
  "/:id/reply/:replyId",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const replyId = normalizeString(req.params.replyId);
    if (!replyId) {
      return res.status(400).json({ success: false, error: "Invalid reply id" });
    }

    await prisma.reviewReply.delete({ where: { id: replyId } });
    return res.json({ success: true, message: "Reply deleted" });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function safeParseJson(value: string, fallback: unknown) {
  try { return JSON.parse(value); } catch { return fallback; }
}

export default router;

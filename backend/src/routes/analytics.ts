import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();
router.use(authenticate);

// ─── helpers ────────────────────────────────────────────────────────────────

function getDateFilter(period: string): Date {
  const now = new Date();
  switch (period) {
    case "7d":  return new Date(now.getTime() - 7  * 86400000);
    case "30d": return new Date(now.getTime() - 30 * 86400000);
    case "90d": return new Date(now.getTime() - 90 * 86400000);
    default:    return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  }
}

// ─── GET /api/analytics/summary ─────────────────────────────────────────────

router.get("/summary", asyncHandler(async (_req: AuthRequest, res: Response) => {
  const [
    totalReviews,
    avgRatingRaw,
    positiveCount,
    negativeCount,
    neutralCount,
    repliedCount,
    newThisMonth,
    newLastMonth,
  ] = await Promise.all([
    prisma.review.count(),
    prisma.review.aggregate({ _avg: { rating: true } }),
    prisma.review.count({ where: { sentiment: "POSITIVE" } }),
    prisma.review.count({ where: { sentiment: "NEGATIVE" } }),
    prisma.review.count({ where: { sentiment: "NEUTRAL"  } }),
    prisma.reviewReply.count(),
    prisma.review.count({ where: { publishedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } }),
    prisma.review.count({ where: { publishedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } }),
  ]);

  const averageRating  = avgRatingRaw._avg.rating ?? 0;
  const unrepliedCount = totalReviews - repliedCount;
  const replyRate      = totalReviews > 0 ? Math.round((repliedCount / totalReviews) * 1000) / 10 : 0;
  const reviewGrowth   = newLastMonth > 0 ? Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 1000) / 10 : 0;

  return res.json({
    success: true,
    data: {
      totalReviews,
      averageRating:   Math.round(averageRating * 100) / 100,
      positiveCount,
      negativeCount,
      neutralCount,
      repliedCount,
      unrepliedCount,
      replyRate,
      reviewGrowth,
      newThisMonth,
    },
  });
}));

// ─── GET /api/analytics/trends ──────────────────────────────────────────────

router.get("/trends", asyncHandler(async (req: AuthRequest, res: Response) => {
  const period = (req.query.period as string) || "1y";
  const since  = getDateFilter(period);

  const reviews = await prisma.review.findMany({
    where:  { publishedAt: { gte: since } },
    select: { publishedAt: true, rating: true, sentiment: true },
    orderBy: { publishedAt: "asc" },
  });

  // Group by YYYY-MM
  const buckets: Record<string, { reviews: number; totalRating: number; positive: number; negative: number; neutral: number }> = {};

  for (const r of reviews) {
    const key = `${r.publishedAt.getFullYear()}-${String(r.publishedAt.getMonth() + 1).padStart(2, "0")}`;
    if (!buckets[key]) buckets[key] = { reviews: 0, totalRating: 0, positive: 0, negative: 0, neutral: 0 };
    buckets[key].reviews++;
    buckets[key].totalRating += r.rating;
    if (r.sentiment === "POSITIVE") buckets[key].positive++;
    else if (r.sentiment === "NEGATIVE") buckets[key].negative++;
    else buckets[key].neutral++;
  }

  const data = Object.entries(buckets).map(([month, b]) => ({
    date:      month,
    reviews:   b.reviews,
    avgRating: b.reviews > 0 ? Math.round((b.totalRating / b.reviews) * 100) / 100 : 0,
    positive:  b.positive,
    negative:  b.negative,
    neutral:   b.neutral,
  }));

  return res.json({ success: true, data });
}));

// ─── GET /api/analytics/rating-distribution ─────────────────────────────────

router.get("/rating-distribution", asyncHandler(async (_req: AuthRequest, res: Response) => {
  const total = await prisma.review.count();

  const counts = await Promise.all([5, 4, 3, 2, 1].map(async (rating) => {
    const count = await prisma.review.count({ where: { rating } });
    return { rating, count, percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0 };
  }));

  return res.json({ success: true, data: counts });
}));

// ─── GET /api/analytics/sentiment-trends ────────────────────────────────────

router.get("/sentiment-trends", asyncHandler(async (req: AuthRequest, res: Response) => {
  const period = (req.query.period as string) || "1y";
  const since  = getDateFilter(period);

  const reviews = await prisma.review.findMany({
    where:  { publishedAt: { gte: since } },
    select: { publishedAt: true, sentiment: true },
    orderBy: { publishedAt: "asc" },
  });

  const buckets: Record<string, { total: number; positive: number; negative: number; neutral: number }> = {};
  for (const r of reviews) {
    const key = `${r.publishedAt.getFullYear()}-${String(r.publishedAt.getMonth() + 1).padStart(2, "0")}`;
    if (!buckets[key]) buckets[key] = { total: 0, positive: 0, negative: 0, neutral: 0 };
    buckets[key].total++;
    if (r.sentiment === "POSITIVE") buckets[key].positive++;
    else if (r.sentiment === "NEGATIVE") buckets[key].negative++;
    else buckets[key].neutral++;
  }

  const data = Object.entries(buckets).map(([date, b]) => ({
    date,
    positive: b.total > 0 ? Math.round((b.positive / b.total) * 100) : 0,
    negative: b.total > 0 ? Math.round((b.negative / b.total) * 100) : 0,
    neutral:  b.total > 0 ? Math.round((b.neutral  / b.total) * 100) : 0,
  }));

  return res.json({ success: true, data });
}));

// ─── GET /api/analytics/keywords ────────────────────────────────────────────

router.get("/keywords", asyncHandler(async (_req: AuthRequest, res: Response) => {
  const reviews = await prisma.review.findMany({
    select: { keywords: true, sentiment: true },
  });

  const freq: Record<string, { count: number; positive: number; negative: number }> = {};

  for (const r of reviews) {
    let kws: string[] = [];
    try { kws = JSON.parse(r.keywords); } catch { continue; }
    for (const kw of kws) {
      if (!kw) continue;
      if (!freq[kw]) freq[kw] = { count: 0, positive: 0, negative: 0 };
      freq[kw].count++;
      if (r.sentiment === "POSITIVE") freq[kw].positive++;
      if (r.sentiment === "NEGATIVE") freq[kw].negative++;
    }
  }

  const data = Object.entries(freq)
    .map(([keyword, f]) => ({
      keyword,
      count:     f.count,
      sentiment: f.positive >= f.negative ? "positive" : "negative",
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return res.json({ success: true, data });
}));

// ─── GET /api/analytics/monthly-comparison ──────────────────────────────────

router.get("/monthly-comparison", asyncHandler(async (_req: AuthRequest, res: Response) => {
  const now  = new Date();
  const data = [];

  for (let i = 5; i >= 0; i--) {
    const d         = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const dLast     = new Date(now.getFullYear() - 1, now.getMonth() - i, 1);
    const dEnd      = new Date(d.getFullYear(),     d.getMonth() + 1,     1);
    const dLastEnd  = new Date(dLast.getFullYear(), dLast.getMonth() + 1, 1);

    const [thisYear, lastYear] = await Promise.all([
      prisma.review.count({ where: { publishedAt: { gte: d,     lt: dEnd     } } }),
      prisma.review.count({ where: { publishedAt: { gte: dLast, lt: dLastEnd } } }),
    ]);

    data.push({
      month:    d.toLocaleDateString("en-US", { month: "short" }),
      thisYear,
      lastYear,
    });
  }

  return res.json({ success: true, data });
}));

export default router;

import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, requireRole, AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();
router.use(authenticate, requireRole("SUPER_ADMIN"));

// GET /api/admin/stats
router.get(
  "/stats",
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const [totalUsers, totalBusinesses, totalReviews, subscriptions] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.business.count({ where: { deletedAt: null } }),
      prisma.review.count(),
      prisma.subscription.findMany({
        where:   { status: "active", deletedAt: null },
        include: { plan: true },
      }),
    ]);

    const mrr = subscriptions.reduce((acc, s) => {
      const price = s.plan.price;
      if (s.plan.interval === "year") return acc + price / 12;
      return acc + price;
    }, 0);

    res.json({
      success: true,
      data:    { totalUsers, totalBusinesses, totalReviews, mrr: Math.round(mrr * 100) / 100, activeSubscriptions: subscriptions.length },
    });
  })
);

// GET /api/admin/users
router.get(
  "/users",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const page   = Math.max(1, parseInt((req.query.page as string) || "1", 10));
    const limit  = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || "20", 10)));
    const search = (req.query.search as string) || "";
    const skip   = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name:  { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
      prisma.user.count({ where }),
    ]);

    res.json({ success: true, data: users, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
  })
);

// PUT /api/admin/users/:id
router.put(
  "/users/:id",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { isActive, role } = req.body as { isActive?: boolean; role?: string };

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(isActive !== undefined && { isActive }),
        ...(role && { role }),
      },
    });

    res.json({ success: true, data: updated });
  })
);

// GET /api/admin/businesses
router.get(
  "/businesses",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const page  = Math.max(1, parseInt((req.query.page as string) || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || "20", 10)));
    const skip  = (page - 1) * limit;

    const [businesses, total] = await Promise.all([
      prisma.business.findMany({
        where:   { deletedAt: null },
        include: { subscriptions: { include: { plan: true }, orderBy: { createdAt: "desc" }, take: 1 } },
        skip,
        take:    limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.business.count({ where: { deletedAt: null } }),
    ]);

    res.json({ success: true, data: businesses, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
  })
);

// GET /api/admin/subscriptions
router.get(
  "/subscriptions",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const page  = Math.max(1, parseInt((req.query.page as string) || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || "20", 10)));
    const skip  = (page - 1) * limit;

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where:   { deletedAt: null },
        include: { plan: true, business: true },
        skip,
        take:    limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.subscription.count({ where: { deletedAt: null } }),
    ]);

    res.json({ success: true, data: subscriptions, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
  })
);

// GET /api/admin/queue-stats
router.get(
  "/queue-stats",
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    // Return basic queue health without requiring Redis
    const stats = {
      queues: ["review-sync", "email", "notification", "ai-reply"],
      note:   "Queue statistics require Redis. Start Redis to see live stats.",
    };
    res.json({ success: true, data: stats });
  })
);

// GET /api/admin/audit-logs
router.get(
  "/audit-logs",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const page  = Math.max(1, parseInt((req.query.page as string) || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || "50", 10)));
    const skip  = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        skip,
        take:    limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.auditLog.count(),
    ]);

    res.json({ success: true, data: logs, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
  })
);

export default router;

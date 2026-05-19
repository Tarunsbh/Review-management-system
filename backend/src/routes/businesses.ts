import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();
router.use(authenticate);

const createBusinessSchema = z.object({
  name:     z.string().min(1).max(255),
  slug:     z.string().min(1).max(255).optional(),
  industry: z.string().max(100).optional(),
  logoUrl:  z.string().url().optional(),
});

const updateBusinessSchema = createBusinessSchema.partial();

// GET /api/businesses
router.get(
  "/",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const businesses = await prisma.business.findMany({
      where: { ownerId: userId, deletedAt: null },
      include: {
        locations:     { where: { deletedAt: null } },
        subscriptions: {
          where:   { deletedAt: null },
          include: { plan: true },
          orderBy: { createdAt: "desc" },
          take:    1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: businesses });
  })
);

// POST /api/businesses
router.post(
  "/",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const body = createBusinessSchema.parse(req.body);
    const userId = req.user!.id;

    // Auto-generate slug if not provided
    const slug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    // Check slug uniqueness
    const existing = await prisma.business.findUnique({ where: { slug } });
    if (existing) {
      res.status(409).json({ success: false, error: "Slug already taken" });
      return;
    }

    // Find free plan
    const freePlan = await prisma.plan.findUnique({ where: { slug: "free" } });

    const business = await prisma.business.create({
      data: {
        name:    body.name,
        slug,
        industry: body.industry,
        ownerId: userId,
        logoUrl: body.logoUrl,
        isActive: true,
        plan:    "free",
      },
    });

    // Create default free subscription if plan exists
    if (freePlan) {
      await prisma.subscription.create({
        data: {
          businessId:          business.id,
          planId:              freePlan.id,
          status:              "active",
          currentPeriodStart:  new Date(),
          currentPeriodEnd:    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }

    res.status(201).json({ success: true, data: business });
  })
);

// GET /api/businesses/:id
router.get(
  "/:id",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const business = await prisma.business.findFirst({
      where: { id, ownerId: userId, deletedAt: null },
      include: {
        locations:     { where: { deletedAt: null } },
        googleAccounts: { where: { deletedAt: null } },
        subscriptions: {
          where:   { deletedAt: null },
          include: { plan: true },
          orderBy: { createdAt: "desc" },
          take:    1,
        },
      },
    });

    if (!business) {
      res.status(404).json({ success: false, error: "Business not found" });
      return;
    }

    res.json({ success: true, data: business });
  })
);

// PUT /api/businesses/:id
router.put(
  "/:id",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const body = updateBusinessSchema.parse(req.body);

    const business = await prisma.business.findFirst({
      where: { id, ownerId: userId, deletedAt: null },
    });

    if (!business) {
      res.status(404).json({ success: false, error: "Business not found" });
      return;
    }

    const updated = await prisma.business.update({
      where: { id },
      data:  body,
    });

    res.json({ success: true, data: updated });
  })
);

// DELETE /api/businesses/:id
router.delete(
  "/:id",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const business = await prisma.business.findFirst({
      where: { id, ownerId: userId, deletedAt: null },
    });

    if (!business) {
      res.status(404).json({ success: false, error: "Business not found" });
      return;
    }

    await prisma.business.update({
      where: { id },
      data:  { deletedAt: new Date(), isActive: false },
    });

    res.json({ success: true, message: "Business deleted" });
  })
);

export default router;

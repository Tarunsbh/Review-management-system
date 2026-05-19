import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router({ mergeParams: true });
router.use(authenticate);

const locationSchema = z.object({
  name:     z.string().min(1).max(255),
  address:  z.string().max(500).optional(),
  placeId:  z.string().max(255).optional(),
  timezone: z.string().max(100).optional(),
});

async function verifyBusinessOwner(businessId: string, userId: string): Promise<boolean> {
  const biz = await prisma.business.findFirst({
    where: { id: businessId, ownerId: userId, deletedAt: null },
  });
  return !!biz;
}

// GET /api/businesses/:businessId/locations
router.get(
  "/",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const businessId = String(req.params.businessId);
    if (!(await verifyBusinessOwner(businessId, req.user!.id))) {
      res.status(403).json({ success: false, error: "Access denied" });
      return;
    }

    const locations = await prisma.businessLocation.findMany({
      where:   { businessId, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });

    res.json({ success: true, data: locations });
  })
);

// POST /api/businesses/:businessId/locations
router.post(
  "/",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const businessId = String(req.params.businessId);
    if (!(await verifyBusinessOwner(businessId, req.user!.id))) {
      res.status(403).json({ success: false, error: "Access denied" });
      return;
    }

    const body = locationSchema.parse(req.body);
    const location = await prisma.businessLocation.create({
      data: { businessId, ...body },
    });

    res.status(201).json({ success: true, data: location });
  })
);

// PUT /api/businesses/:businessId/locations/:id
router.put(
  "/:id",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const businessId = String(req.params.businessId);
    const id = String(req.params.id);
    if (!(await verifyBusinessOwner(businessId, req.user!.id))) {
      res.status(403).json({ success: false, error: "Access denied" });
      return;
    }

    const body = locationSchema.partial().parse(req.body);
    const loc = await prisma.businessLocation.findFirst({
      where: { id, businessId, deletedAt: null },
    });

    if (!loc) {
      res.status(404).json({ success: false, error: "Location not found" });
      return;
    }

    const updated = await prisma.businessLocation.update({ where: { id }, data: body });
    res.json({ success: true, data: updated });
  })
);

// DELETE /api/businesses/:businessId/locations/:id
router.delete(
  "/:id",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const businessId = String(req.params.businessId);
    const id = String(req.params.id);
    if (!(await verifyBusinessOwner(businessId, req.user!.id))) {
      res.status(403).json({ success: false, error: "Access denied" });
      return;
    }

    const loc = await prisma.businessLocation.findFirst({
      where: { id, businessId, deletedAt: null },
    });

    if (!loc) {
      res.status(404).json({ success: false, error: "Location not found" });
      return;
    }

    await prisma.businessLocation.update({
      where: { id },
      data:  { deletedAt: new Date() },
    });

    res.json({ success: true, message: "Location deleted" });
  })
);

export default router;

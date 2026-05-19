import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();
router.use(authenticate);

const createTeamSchema = z.object({
  businessId:  z.string().min(1),
  name:        z.string().min(1).max(255),
  description: z.string().optional(),
});

const addMemberSchema = z.object({
  userId: z.string().min(1),
  role:   z.enum(["OWNER", "MANAGER", "STAFF", "VIEWER"]).default("STAFF"),
});

const updateRoleSchema = z.object({
  role: z.enum(["OWNER", "MANAGER", "STAFF", "VIEWER"]),
});

// GET /api/teams?businessId=xxx
router.get(
  "/",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { businessId } = req.query as { businessId?: string };

    const where: Record<string, unknown> = { deletedAt: null };
    if (businessId) where.businessId = businessId;

    const teams = await prisma.team.findMany({
      where,
      include: { members: { where: { deletedAt: null } } },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: teams });
  })
);

// POST /api/teams
router.post(
  "/",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const body = createTeamSchema.parse(req.body);

    // Verify business ownership
    const biz = await prisma.business.findFirst({
      where: { id: body.businessId, ownerId: req.user!.id, deletedAt: null },
    });
    if (!biz) {
      res.status(403).json({ success: false, error: "Access denied" });
      return;
    }

    const team = await prisma.team.create({
      data: {
        businessId:  body.businessId,
        name:        body.name,
        description: body.description,
      },
    });

    // Auto-add creator as OWNER
    await prisma.teamMember.create({
      data: { teamId: team.id, userId: req.user!.id, role: "OWNER" },
    });

    res.status(201).json({ success: true, data: team });
  })
);

// POST /api/teams/:id/members
router.post(
  "/:id/members",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const body = addMemberSchema.parse(req.body);

    const team = await prisma.team.findFirst({
      where: { id, deletedAt: null },
      include: { members: { where: { userId: req.user!.id } } },
    });

    if (!team) {
      res.status(404).json({ success: false, error: "Team not found" });
      return;
    }

    // Check requester is team owner or manager
    const requesterMember = team.members.find((m: any) => m.userId === req.user!.id);
    if (!requesterMember || !["OWNER", "MANAGER"].includes(requesterMember.role)) {
      res.status(403).json({ success: false, error: "Insufficient permissions" });
      return;
    }

    // Check user exists
    const user = await prisma.user.findUnique({ where: { id: body.userId } });
    if (!user) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }

    const member = await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: id, userId: body.userId } },
      create: { teamId: id, userId: body.userId, role: body.role },
      update: { role: body.role, deletedAt: null },
    });

    res.status(201).json({ success: true, data: member });
  })
);

// DELETE /api/teams/:id/members/:userId
router.delete(
  "/:id/members/:userId",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id, userId } = req.params;

    const team = await prisma.team.findFirst({
      where: { id, deletedAt: null },
      include: { members: { where: { userId: req.user!.id } } },
    });

    if (!team) {
      res.status(404).json({ success: false, error: "Team not found" });
      return;
    }

    const requesterMember = team.members.find((m: any) => m.userId === req.user!.id);
    const isSelf = userId === req.user!.id;

    if (!isSelf && (!requesterMember || !["OWNER", "MANAGER"].includes(requesterMember.role))) {
      res.status(403).json({ success: false, error: "Insufficient permissions" });
      return;
    }

    await prisma.teamMember.updateMany({
      where: { teamId: id, userId },
      data:  { deletedAt: new Date() },
    });

    res.json({ success: true, message: "Member removed" });
  })
);

// PUT /api/teams/:id/members/:userId
router.put(
  "/:id/members/:userId",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id, userId } = req.params;
    const { role } = updateRoleSchema.parse(req.body);

    const team = await prisma.team.findFirst({
      where: { id, deletedAt: null },
      include: { members: { where: { userId: req.user!.id } } },
    });

    if (!team) {
      res.status(404).json({ success: false, error: "Team not found" });
      return;
    }

    const requesterMember = team.members.find((m: any) => m.userId === req.user!.id);
    if (!requesterMember || !["OWNER", "MANAGER"].includes(requesterMember.role)) {
      res.status(403).json({ success: false, error: "Insufficient permissions" });
      return;
    }

    const updated = await prisma.teamMember.updateMany({
      where: { teamId: id, userId, deletedAt: null },
      data:  { role },
    });

    res.json({ success: true, data: updated });
  })
);

export default router;

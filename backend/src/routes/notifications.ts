import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { normalizeString } from "../utils/params";

const router = Router();

router.use(authenticate);

// GET /api/notifications
router.get("/", asyncHandler(async (req: AuthRequest, res: Response) => {
  const pageValue = normalizeString(req.query.page);
  const limitValue = normalizeString(req.query.limit);
  const unreadOnlyValue = normalizeString(req.query.unreadOnly);

  const page       = Math.max(1, parseInt(pageValue || "1", 10));
  const limit      = Math.min(50, parseInt(limitValue || "20", 10));
  const unreadOnly = unreadOnlyValue === "true";
  const where      = unreadOnly ? { isRead: false } : {};

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip:    (page - 1) * limit,
      take:    limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { isRead: false } }),
  ]);

  return res.json({
    success: true,
    data: {
      notifications,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      unreadCount,
    },
  });
}));

// GET /api/notifications/unread-count
router.get("/unread-count", asyncHandler(async (_req: AuthRequest, res: Response) => {
  const count = await prisma.notification.count({ where: { isRead: false } });
  return res.json({ success: true, data: { count } });
}));

// PUT /api/notifications/read-all   (must be before /:id)
router.put("/read-all", asyncHandler(async (_req: AuthRequest, res: Response) => {
  const { count } = await prisma.notification.updateMany({
    where: { isRead: false },
    data:  { isRead: true },
  });
  return res.json({ success: true, message: `${count} notifications marked as read` });
}));

// PUT /api/notifications/:id/read
router.put("/:id/read", asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = normalizeString(req.params.id);
  if (!id) {
    return res.status(400).json({ success: false, error: "Invalid notification id" });
  }

  const notif = await prisma.notification.update({
    where: { id },
    data:  { isRead: true },
  });
  return res.json({ success: true, data: notif, message: "Notification marked as read" });
}));

// DELETE /api/notifications/:id
router.delete("/:id", asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = normalizeString(req.params.id);
  if (!id) {
    return res.status(400).json({ success: false, error: "Invalid notification id" });
  }

  await prisma.notification.delete({ where: { id } });
  return res.json({ success: true, message: "Notification deleted" });
}));

export default router;

import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { logger } from "../utils/logger";

const router = Router();

const JWT_SECRET     = process.env.JWT_SECRET     || "eglobe_super_secret_key_2025";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email:    z.string().email("Invalid email format"),
  password: z.string().min(1, "Password required"),
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  "/login",
  asyncHandler(async (req: Request, res: Response) => {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: result.error.errors,
      });
    }

    const { email, password } = result.data;

    // Fetch user from DB
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      logger.warn("Failed login attempt", { email, ip: req.ip });
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
        message: "Email or password is incorrect",
      });
    }

    // Constant-time password comparison
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      logger.warn("Failed login attempt (bad password)", { email, ip: req.ip });
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
        message: "Email or password is incorrect",
      });
    }

    // Stamp last login
    await prisma.user.update({
      where: { id: user.id },
      data:  { lastLogin: new Date() },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET as string,
      { expiresIn: JWT_EXPIRES_IN } as any,
    );

    logger.info("Successful login", { userId: user.id, email, ip: req.ip });

    return res.json({
      success: true,
      data: {
        token,
        user: {
          id:        user.id,
          email:     user.email,
          name:      user.name,
          role:      user.role,
          avatar:    user.avatar,
          lastLogin: user.lastLogin,
        },
      },
      message: "Login successful",
    });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true, email: true, name: true,
        role: true, avatar: true, lastLogin: true, createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    return res.json({ success: true, data: { user } });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  "/logout",
  asyncHandler(async (_req: Request, res: Response) => {
    return res.json({ success: true, message: "Logged out successfully" });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/refresh
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  "/refresh",
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, error: "User inactive" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET as string,
      { expiresIn: JWT_EXPIRES_IN } as any,
    );

    return res.json({ success: true, data: { token } });
  }),
);

export default router;

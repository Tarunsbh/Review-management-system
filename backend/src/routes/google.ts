import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { GoogleService } from "../services/GoogleService";
import { logger } from "../utils/logger";

const router = Router();
router.use(authenticate);

// Helper: get or create singleton Google auth row
async function getGoogleAuth() {
  let auth = await prisma.googleAuth.findFirst();
  if (!auth) {
    auth = await prisma.googleAuth.create({ data: {} });
  }
  return auth;
}

// ─── GET /api/google/auth-url ──────────────────────────────────────────────────
// Reads credentials from settings DB (falls back to env), builds OAuth URL
router.get("/auth-url", asyncHandler(async (req: AuthRequest, res: Response) => {
  const redirectUri =
    (req.query.redirect_uri as string) ||
    process.env.GOOGLE_REDIRECT_URI ||
    `${process.env.APP_URL || "http://localhost:4000"}/api/google/callback`;

  const authUrl = await GoogleService.buildAuthUrl(redirectUri);
  const creds   = await GoogleService.getCredentials();

  return res.json({
    success: true,
    data: {
      authUrl,
      configured: !!(creds.clientId && creds.clientSecret),
    },
  });
}));

// ─── GET /api/google/callback (browser redirect) ─────────────────────────────
// Google redirects here with ?code=... after user grants access
router.get("/callback", asyncHandler(async (req: AuthRequest, res: Response) => {
  const { code, error } = req.query as Record<string, string>;

  if (error) {
    logger.warn("Google OAuth denied:", error);
    return res.redirect(
      `${process.env.FRONTEND_URL || "http://localhost:3000"}/integrations?error=${encodeURIComponent(error)}`,
    );
  }

  if (!code) {
    return res.redirect(
      `${process.env.FRONTEND_URL || "http://localhost:3000"}/integrations?error=no_code`,
    );
  }

  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    `${process.env.APP_URL || "http://localhost:4000"}/api/google/callback`;

  try {
    const tokens = await GoogleService.exchangeCode(code, redirectUri);
    const creds  = await GoogleService.getCredentials();

    const auth = await getGoogleAuth();
    await prisma.googleAuth.update({
      where: { id: auth.id },
      data: {
        accessToken:  tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt:    new Date(Date.now() + tokens.expires_in * 1000),
        isConnected:  true,
        accountId:    creds.accountId  || null,
        locationId:   creds.locationId || null,
      },
    });

    logger.info("Google OAuth connected successfully");
    return res.redirect(
      `${process.env.FRONTEND_URL || "http://localhost:3000"}/integrations?connected=true`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("Google OAuth callback failed:", msg);
    return res.redirect(
      `${process.env.FRONTEND_URL || "http://localhost:3000"}/integrations?error=${encodeURIComponent(msg)}`,
    );
  }
}));

// ─── POST /api/google/callback (frontend posts code) ─────────────────────────
// Alternative: frontend can POST the code instead of using the redirect flow
router.post("/callback", asyncHandler(async (req: AuthRequest, res: Response) => {
  const { code, redirectUri: bodyRedirect } = req.body as { code?: string; redirectUri?: string };
  if (!code) return res.status(400).json({ success: false, error: "Authorization code required" });

  const redirectUri =
    bodyRedirect ||
    process.env.GOOGLE_REDIRECT_URI ||
    `${process.env.APP_URL || "http://localhost:4000"}/api/google/callback`;

  try {
    const tokens = await GoogleService.exchangeCode(code, redirectUri);
    const creds  = await GoogleService.getCredentials();

    const auth = await getGoogleAuth();
    await prisma.googleAuth.update({
      where: { id: auth.id },
      data: {
        accessToken:  tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt:    new Date(Date.now() + tokens.expires_in * 1000),
        isConnected:  true,
        accountId:    creds.accountId  || null,
        locationId:   creds.locationId || null,
      },
    });

    logger.info("Google OAuth connected via POST callback");
    return res.json({
      success: true,
      data: { isConnected: true, connectedAt: new Date() },
      message: "Google account connected successfully",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("Google OAuth POST callback failed:", msg);
    return res.status(400).json({ success: false, error: msg });
  }
}));

// ─── POST /api/google/disconnect ─────────────────────────────────────────────
router.post("/disconnect", asyncHandler(async (_req: AuthRequest, res: Response) => {
  const auth = await getGoogleAuth();
  await prisma.googleAuth.update({
    where: { id: auth.id },
    data:  { isConnected: false, accessToken: null, refreshToken: null, expiresAt: null },
  });
  return res.json({ success: true, message: "Google account disconnected" });
}));

// ─── GET /api/google/status ───────────────────────────────────────────────────
router.get("/status", asyncHandler(async (_req: AuthRequest, res: Response) => {
  const auth         = await getGoogleAuth();
  const totalReviews = await prisma.review.count();
  const lastSync     = await prisma.syncLog.findFirst({
    where:   { status: "SUCCESS" },
    orderBy: { completedAt: "desc" },
  });

  return res.json({
    success: true,
    data: {
      isConnected:  auth.isConnected,
      accountName:  auth.accountName,
      locationName: auth.locationName,
      placeId:      auth.placeId || "",
      totalReviews,
      lastSync:     lastSync?.completedAt ?? null,
      nextSync:     auth.isConnected ? new Date(Date.now() + 60 * 60 * 1000) : null,
    },
  });
}));

// ─── POST /api/google/sync ────────────────────────────────────────────────────
// Triggers a real sync via GoogleService (Business Profile API → Places API fallback)
router.post("/sync", asyncHandler(async (_req: AuthRequest, res: Response) => {
  const start   = Date.now();
  const syncLog = await prisma.syncLog.create({
    data: { status: "IN_PROGRESS", triggeredBy: "manual" },
  });

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

    // Notify about sync completion
    if (result.newReviews > 0) {
      await prisma.notification.create({
        data: {
          type:    "SYNC_COMPLETE",
          title:   `Sync complete — ${result.newReviews} new review${result.newReviews > 1 ? "s" : ""}`,
          message: `Synced ${result.totalSynced} reviews via ${result.source === "business_profile" ? "Google Business Profile" : "Google Places API"}.`,
        },
      });
    } else if (result.totalSynced > 0) {
      await prisma.notification.create({
        data: {
          type:    "SYNC_COMPLETE",
          title:   "Sync complete — no new reviews",
          message: `All ${result.totalSynced} reviews are already up to date.`,
        },
      });
    }

    logger.info("Sync completed", {
      syncId: syncLog.id,
      source: result.source,
      newReviews: result.newReviews,
      totalSynced: result.totalSynced,
      duration,
    });

    return res.json({
      success: true,
      data: updated,
      message: result.error
        ? result.error
        : `Synced ${result.totalSynced} reviews (${result.newReviews} new) via ${result.source === "business_profile" ? "Google Business Profile" : "Google Places API"}.`,
      syncResult: result,
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status:      "FAILED",
        completedAt: new Date(),
        errors:      JSON.stringify([msg]),
      },
    });
    throw err;
  }
}));

// ─── GET /api/google/sync-logs ────────────────────────────────────────────────
router.get("/sync-logs", asyncHandler(async (req: AuthRequest, res: Response) => {
  const limit = Math.min(50, parseInt(req.query.limit as string || "20"));
  const logs  = await prisma.syncLog.findMany({
    orderBy: { startedAt: "desc" },
    take:    limit,
  });
  return res.json({ success: true, data: logs });
}));

export default router;

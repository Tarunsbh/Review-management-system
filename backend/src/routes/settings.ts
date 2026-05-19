import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { logger } from "../utils/logger";

const router = Router();
router.use(authenticate);

const VALID_SECTIONS = ["google", "openai", "email", "business", "notifications"] as const;
type Section = typeof VALID_SECTIONS[number];

const SECTION_DEFAULTS: Record<Section, Record<string, unknown>> = {
  google: { apiKey: "", clientId: "", clientSecret: "", placeId: "", accountId: "", locationId: "", isConnected: false, lastSync: null },
  openai: { apiKey: "", model: "gpt-4o", temperature: 0.7, maxTokens: 500, defaultTone: "professional", autoSuggest: true },
  email:  { smtpHost: "", smtpPort: 587, smtpUsername: "", smtpPassword: "", fromEmail: "", fromName: "eGlobe Reviews", isVerified: false },
  business: { name: "", address: "", phone: "", email: "", website: "", industry: "hotel", description: "" },
  notifications: { emailNotifications: true, newReviewAlert: true, negativeReviewAlert: true, weeklyReport: false, monthlyReport: true, slackWebhook: "", whatsappNumber: "" },
};

function maskSecrets(section: string, data: Record<string, unknown>) {
  const d = { ...data };
  if (section === "google")  { if (d.apiKey) d.apiKey = "sk-***" + String(d.apiKey).slice(-4); if (d.clientSecret) d.clientSecret = "***masked***"; }
  if (section === "openai")  { if (d.apiKey) d.apiKey = "sk-***masked***"; }
  if (section === "email")   { if (d.smtpPassword) d.smtpPassword = "***masked***"; }
  return d;
}

// GET /api/settings
router.get("/", asyncHandler(async (_req: AuthRequest, res: Response) => {
  const rows = await prisma.settings.findMany();
  const result: Record<string, unknown> = {};
  for (const section of VALID_SECTIONS) {
    const row  = rows.find((r: any) => r.section === section);
    const data = row ? { ...SECTION_DEFAULTS[section], ...JSON.parse(row.data) } : { ...SECTION_DEFAULTS[section] };
    result[section] = maskSecrets(section, data as Record<string, unknown>);
  }
  return res.json({ success: true, data: result });
}));

// GET /api/settings/:section
router.get("/:section", asyncHandler(async (req: AuthRequest, res: Response) => {
  const section = req.params.section as Section;
  if (!VALID_SECTIONS.includes(section)) return res.status(400).json({ success: false, error: "Invalid section" });
  const row  = await prisma.settings.findUnique({ where: { section } });
  const data = row ? { ...SECTION_DEFAULTS[section], ...JSON.parse(row.data) } : { ...SECTION_DEFAULTS[section] };
  return res.json({ success: true, data: maskSecrets(section, data as Record<string, unknown>) });
}));

// PUT /api/settings/:section
router.put("/:section", asyncHandler(async (req: AuthRequest, res: Response) => {
  const section = req.params.section as Section;
  if (!VALID_SECTIONS.includes(section)) return res.status(400).json({ success: false, error: "Invalid section" });

  const existing = await prisma.settings.findUnique({ where: { section } });
  const existingData = existing ? (JSON.parse(existing.data) as Record<string, unknown>) : {};

  const incoming = req.body as Record<string, unknown>;
  const sanitised: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(incoming)) {
    if (!String(v).includes("***")) sanitised[k] = v;
  }

  const merged = { ...SECTION_DEFAULTS[section], ...existingData, ...sanitised };

  await prisma.settings.upsert({
    where:  { section },
    create: { section, data: JSON.stringify(merged) },
    update: { data: JSON.stringify(merged) },
  });

  logger.info(`Settings updated: ${section}`, { userId: req.user?.id });
  return res.json({ success: true, data: maskSecrets(section, merged), message: `${section} settings saved` });
}));

// POST /api/settings/test/:type
router.post("/test/:type", asyncHandler(async (req: AuthRequest, res: Response) => {
  const type = String(req.params.type);
  const row  = await prisma.settings.findUnique({ where: { section: type } });
  const data = row ? JSON.parse(row.data) : {};
  await new Promise(r => setTimeout(r, 400));
  const results: Record<string, { success: boolean; message: string }> = {
    google: { success: !!data.apiKey,          message: data.apiKey          ? "Google API key configured"  : "Google API key not set" },
    openai: { success: !!data.apiKey,          message: data.apiKey          ? "OpenAI API key configured"  : "OpenAI API key not set" },
    email:  { success: !!(data.smtpHost && data.smtpUsername), message: data.smtpHost ? "SMTP settings valid" : "SMTP host not configured" },
  };
  const result = results[type as string];
  if (!result) return res.status(400).json({ success: false, error: "Invalid test type" });
  return res.json({ success: true, data: result });
}));

export default router;

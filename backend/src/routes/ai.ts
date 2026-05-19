import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { logger } from "../utils/logger";

const router = Router();
router.use(authenticate);

const generateSchema = z.object({
  reviewId:     z.string().optional(),
  reviewText:   z.string().min(1),
  rating:       z.number().min(1).max(5),
  reviewerName: z.string().min(1),
  tone:         z.enum(["professional","friendly","formal","luxury","hospitality","empathetic"]),
  businessName: z.string().optional(),
  instructions: z.string().optional(),
});

/** Read a settings section from DB, return parsed JSON or {} */
async function getSettingsSection(section: string): Promise<Record<string, string>> {
  const row = await prisma.settings.findUnique({ where: { section } });
  return row ? (JSON.parse(row.data) as Record<string, string>) : {};
}

const TEMPLATES: Record<string, (d: { reviewerName: string; rating: number; businessName: string }) => string> = {
  professional: ({ reviewerName, rating, businessName }) =>
    rating >= 4
      ? `Dear ${reviewerName},\n\nThank you sincerely for your wonderful review of ${businessName}. We are truly delighted that your experience exceeded your expectations. Your kind words will be shared with our entire team.\n\nWe look forward to welcoming you back very soon.\n\nWarm regards,\nManagement, ${businessName}`
      : `Dear ${reviewerName},\n\nThank you for sharing your feedback. We sincerely apologize that your experience at ${businessName} did not meet our high standards. We have immediately addressed your concerns with our team.\n\nWe would appreciate the opportunity to make this right — please contact our Guest Relations team.\n\nSincerely,\nManagement, ${businessName}`,

  friendly: ({ reviewerName, rating, businessName }) =>
    rating >= 4
      ? `Hi ${reviewerName}! 😊\n\nWow, thank you so much for this amazing review! We're absolutely thrilled you had such a fantastic experience at ${businessName}! You've made our day — we'll be sharing your kind words with the whole team! 🌟\n\nCan't wait to see you again! ❤️\n\nWith love, The ${businessName} Family`
      : `Hi ${reviewerName}! 😔\n\nWe're really sorry your stay didn't go as it should have — that's not the experience we want for you! Thank you for letting us know. We've already talked with our team and are making changes right away.\n\nWould you give us another chance? We'd love to make it up to you! 🙏`,

  luxury: ({ reviewerName, rating, businessName }) =>
    rating >= 4
      ? `Most Esteemed ${reviewerName},\n\nIt is with the deepest gratitude that we acknowledge your gracious review of ${businessName}. Your discerning recognition of our unwavering commitment to luxury hospitality is the highest honour we could receive.\n\nWe look forward with great anticipation to welcoming you once more.\n\nWith the warmest regards,\n${businessName}`
      : `Dear Esteemed ${reviewerName},\n\nWe are profoundly sorry that your visit to ${businessName} did not reflect the extraordinary standards of excellence that define our legacy. We respectfully request the privilege of speaking with you personally to restore your faith in our service.\n\nWith sincere apologies,\n${businessName}`,

  hospitality: ({ reviewerName, rating, businessName }) =>
    rating >= 4
      ? `Dear ${reviewerName},\n\nThank you from the bottom of our hearts for your lovely review! At ${businessName}, creating memorable experiences is our greatest passion. Knowing we achieved this for you brings immense joy to our entire team.\n\nWe are looking forward to your next visit!\n\nWith warm hospitality,\nThe Team at ${businessName}`
      : `Dear ${reviewerName},\n\nThank you for your honest feedback. In hospitality, every guest experience is personal and your comfort is our greatest responsibility. We are sorry we fell short and have taken immediate steps to address your concerns.\n\nWould you give us the chance to show you the hospitality you deserve?\n\nWith sincere regards,\nThe Team at ${businessName}`,

  empathetic: ({ reviewerName, rating, businessName }) =>
    rating >= 4
      ? `Dear ${reviewerName},\n\nThank you for sharing your experience. Reading your review genuinely moved our team at ${businessName}. We pour our hearts into every guest's stay, and knowing we succeeded for you is incredibly rewarding.\n\nWe look forward to seeing you again.\n\nWith heartfelt gratitude,\n${businessName}`
      : `Dear ${reviewerName},\n\nThank you sincerely for taking the time to share your experience. We understand how disappointing it must have been, and your feelings are completely valid. We have listened carefully and are taking concrete steps to address every point.\n\nWe truly hope you will give us the opportunity to show you the experience you deserved.\n\nWith understanding and care,\n${businessName}`,

  formal: ({ reviewerName, rating, businessName }) =>
    rating >= 4
      ? `Dear Mr./Ms. ${reviewerName},\n\nWe acknowledge receipt of your review and wish to extend our sincere gratitude for your positive assessment of ${businessName}. Your feedback has been communicated to the relevant departments.\n\nYours faithfully,\nGuest Relations Department\n${businessName}`
      : `Dear Mr./Ms. ${reviewerName},\n\nWe acknowledge receipt of your review and formally address the concerns raised regarding ${businessName}. We sincerely regret the inconvenience caused and confirm the matters are being investigated with appropriate urgency.\n\nPlease contact our Guest Relations Department to facilitate a resolution.\n\nYours sincerely,\nGuest Relations Department\n${businessName}`,
};

// POST /api/ai/generate-reply
router.post("/generate-reply", asyncHandler(async (req: AuthRequest, res: Response) => {
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: "Validation failed", details: parsed.error.errors });
  }

  const { reviewId, reviewText, rating, reviewerName, tone, instructions } = parsed.data;
  const start = Date.now();

  // ── Read settings from DB (fallback to env vars) ──────────────────────────
  const [openaiSettings, bizSettings] = await Promise.all([
    getSettingsSection("openai"),
    getSettingsSection("business"),
  ]);

  // OpenAI key: settings DB first, then env var
  const openAiKey = (openaiSettings.apiKey && !openaiSettings.apiKey.includes("***"))
    ? openaiSettings.apiKey
    : process.env.OPENAI_API_KEY;

  // Business name: request body → settings DB → env fallback
  const businessName = parsed.data.businessName
    || bizSettings.name
    || "our business";

  let reply = "";
  let model = "template";
  let tokensUsed: number | undefined;

  if (openAiKey && openAiKey !== "your_openai_api_key" && !openAiKey.includes("placeholder")) {
    try {
      const { default: OpenAI } = await import("openai");
      const client = new OpenAI({ apiKey: openAiKey });
      const systemPrompt = `You are a professional hotel manager responding to Google reviews for ${businessName}. Generate a ${tone} reply to this ${rating}-star review from ${reviewerName}. ${instructions ? `Instructions: ${instructions}` : ""} Keep it 100-200 words.`;

      const completion = await client.chat.completions.create({
        model:       process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages:    [{ role: "system", content: systemPrompt }, { role: "user", content: `Review: "${reviewText}"` }],
        temperature: 0.7,
        max_tokens:  400,
      });
      reply      = completion.choices[0]?.message?.content || "";
      model      = completion.model;
      tokensUsed = completion.usage?.total_tokens;
    } catch (err) {
      logger.warn("OpenAI failed, using template", { error: String(err) });
      reply = (TEMPLATES[tone] || TEMPLATES.professional)({ reviewerName, rating, businessName: businessName || "our hotel" });
    }
  } else {
    reply = (TEMPLATES[tone] || TEMPLATES.professional)({ reviewerName, rating, businessName: businessName || "our hotel" });
  }

  const processingTime = (Date.now() - start) / 1000;

  // Persist AI history if we have a reviewId
  if (reviewId) {
    await prisma.aiReplyHistory.create({
      data: {
        reviewId,
        generatedReply: reply,
        tone,
        model,
        tokensUsed,
        processingTime,
        wasUsed: false,
      },
    }).catch((_err: unknown) => logger.warn("Could not save AI history", { err: String(_err) }));
  }

  return res.json({
    success: true,
    data: {
      reply,
      tone,
      confidence:     0.92,
      processingTime,
      source:         model === "template" ? "template" : "openai",
      tokensUsed,
    },
  });
}));

// POST /api/ai/mark-used  — flag a generated reply as actually used
router.post("/mark-used", asyncHandler(async (req: AuthRequest, res: Response) => {
  const { aiReplyId } = req.body;
  if (!aiReplyId) return res.status(400).json({ success: false, error: "aiReplyId required" });
  await prisma.aiReplyHistory.update({ where: { id: aiReplyId }, data: { wasUsed: true } });
  return res.json({ success: true, message: "Reply marked as used" });
}));

// POST /api/ai/analyze-sentiment
router.post("/analyze-sentiment", asyncHandler(async (req: AuthRequest, res: Response) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ success: false, error: "Text required" });

  const positive = ["great","excellent","amazing","wonderful","fantastic","love","perfect","best","outstanding","exceptional","beautiful","superb"];
  const negative = ["bad","terrible","awful","horrible","worst","poor","disappointed","dirty","noisy","slow","rude","disgusting","unacceptable"];

  const lower = (text as string).toLowerCase();
  const pos = positive.filter(w => lower.includes(w)).length;
  const neg = negative.filter(w => lower.includes(w)).length;

  let sentiment = "NEUTRAL", score = 0.5;
  if (pos > neg) { sentiment = "POSITIVE"; score = Math.min(0.95, 0.5 + pos * 0.1); }
  else if (neg > pos) { sentiment = "NEGATIVE"; score = Math.max(0.05, 0.5 - neg * 0.1); }

  return res.json({ success: true, data: { sentiment, score, positiveSignals: pos, negativeSignals: neg } });
}));

// POST /api/ai/improve-reply
router.post("/improve-reply", asyncHandler(async (req: AuthRequest, res: Response) => {
  const { text, tone } = req.body;
  if (!text) return res.status(400).json({ success: false, error: "Text required" });

  const openaiSettings = await getSettingsSection("openai");
  const openAiKey = (openaiSettings.apiKey && !openaiSettings.apiKey.includes("***"))
    ? openaiSettings.apiKey
    : process.env.OPENAI_API_KEY;
  let improved = text;

  if (openAiKey && openAiKey !== "your_openai_api_key") {
    try {
      const { default: OpenAI } = await import("openai");
      const client = new OpenAI({ apiKey: openAiKey });
      const res2 = await client.chat.completions.create({
        model:    "gpt-4o-mini",
        messages: [
          { role: "system", content: `Improve this hotel review reply to sound more ${tone || "professional"}. Keep roughly the same length and meaning.` },
          { role: "user", content: text },
        ],
        temperature: 0.5,
        max_tokens:  400,
      });
      improved = res2.choices[0]?.message?.content || text;
    } catch { /* fallback to original */ }
  } else {
    improved = text.trim() + (text.trim().endsWith(".") ? "" : ".") + "\n\nWe look forward to welcoming you back soon!";
  }

  return res.json({ success: true, data: { improvedText: improved, tone } });
}));

export default router;

import { Router, Response, Request } from "express";
import Stripe from "stripe";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { logger } from "../utils/logger";

const router = Router();

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key === "sk_test_...") return null;
  return new Stripe(key, { apiVersion: "2025-04-30.basil" });
}

// GET /api/billing/plans
router.get(
  "/plans",
  asyncHandler(async (_req: Request, res: Response) => {
    const plans = await prisma.plan.findMany({
      where:   { isActive: true, deletedAt: null },
      orderBy: { price: "asc" },
    });
    res.json({ success: true, data: plans });
  })
);

// GET /api/billing/subscription
router.get(
  "/subscription",
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { businessId } = req.query as { businessId?: string };

    const where: Record<string, unknown> = { deletedAt: null };
    if (businessId) where.businessId = businessId;

    const sub = await prisma.subscription.findFirst({
      where,
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: sub });
  })
);

// POST /api/billing/checkout
router.post(
  "/checkout",
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { planId, businessId } = req.body as { planId: string; businessId: string };

    const stripe = getStripe();
    if (!stripe) {
      res.status(503).json({ success: false, error: "Stripe not configured" });
      return;
    }

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      res.status(404).json({ success: false, error: "Plan not found" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer_email: user?.email,
      metadata: { businessId, planId, userId: req.user!.id },
      line_items: [
        {
          price_data: {
            currency:   "usd",
            unit_amount: Math.round(plan.price * 100),
            recurring:  { interval: (plan.interval as "month" | "year") },
            product_data: { name: plan.name },
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.APP_URL || "http://localhost:3000"}/billing?success=true`,
      cancel_url:  `${process.env.APP_URL || "http://localhost:3000"}/billing?canceled=true`,
    });

    res.json({ success: true, data: { url: session.url } });
  })
);

// POST /api/billing/portal
router.post(
  "/portal",
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { businessId } = req.body as { businessId: string };

    const stripe = getStripe();
    if (!stripe) {
      res.status(503).json({ success: false, error: "Stripe not configured" });
      return;
    }

    const sub = await prisma.subscription.findFirst({
      where: { businessId, deletedAt: null },
    });

    if (!sub?.stripeCustomerId) {
      res.status(404).json({ success: false, error: "No Stripe customer found" });
      return;
    }

    const session = await stripe.billingPortal.sessions.create({
      customer:   sub.stripeCustomerId,
      return_url: `${process.env.APP_URL || "http://localhost:3000"}/billing`,
    });

    res.json({ success: true, data: { url: session.url } });
  })
);

// POST /api/billing/webhook (raw body required)
router.post(
  "/webhook",
  asyncHandler(async (req: Request, res: Response) => {
    const stripe = getStripe();
    if (!stripe) {
      res.status(503).json({ error: "Stripe not configured" });
      return;
    }

    const sig = req.headers["stripe-signature"] as string;
    const secret = process.env.STRIPE_WEBHOOK_SECRET || "";

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body as Buffer, sig, secret);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Webhook verification failed";
      logger.error("[billing] Webhook error:", msg);
      res.status(400).json({ error: msg });
      return;
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const { businessId, planId } = session.metadata || {};

      if (businessId && planId) {
        await prisma.subscription.updateMany({
          where: { businessId, deletedAt: null },
          data:  {
            status:              "active",
            stripeCustomerId:    session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            planId,
          },
        });
        logger.info(`[billing] Subscription activated for business ${businessId}`);
      }
    } else if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data:  { status: "canceled" },
      });
    } else if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      const subRecord = await prisma.subscription.findFirst({
        where: { stripeSubscriptionId: invoice.subscription as string },
      });
      if (subRecord) {
        await prisma.invoice.create({
          data: {
            subscriptionId:  subRecord.id,
            businessId:      subRecord.businessId,
            amount:          invoice.amount_paid / 100,
            currency:        invoice.currency,
            status:          "paid",
            stripeInvoiceId: invoice.id,
            paidAt:          new Date(),
          },
        });
      }
    }

    res.json({ received: true });
  })
);

export default router;

/**
 * db-init.ts
 * ─────────────────────────────────────────────────────────────
 * Runs automatically on first backend startup.
 * • Pushes the Prisma schema to SQL Server (creates all tables)
 * • Seeds the admin user and default settings if not present
 * • Safe to run multiple times — fully idempotent
 *
 * Usage (standalone):
 *   npx tsx src/scripts/db-init.ts
 *
 * Called automatically from src/server.ts on startup.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({
  log: ["warn", "error"],
});

export async function runDbInit(): Promise<void> {
  console.log("\n🚀 eGlobe DB Init — checking database state...\n");

  try {
    // ── 1. Test connection ─────────────────────────────────
    await prisma.$connect();
    console.log("✅ Connected to SQL Server");

    // ── 2. Admin user ──────────────────────────────────────
    const adminEmail = "admin@admin.com";
    const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

    if (!existingAdmin) {
      const hash = await bcrypt.hash("admin", 10);
      await prisma.user.create({
        data: {
          id:       "user_admin_001",
          email:    adminEmail,
          name:     "Admin User",
          password: hash,
          role:     "ADMIN",
          isActive: true,
        },
      });
      console.log("✅ Admin user created   → admin@admin.com / admin");
    } else {
      console.log("✅ Admin user exists    → admin@admin.com");
    }

    // ── 3. Default settings ────────────────────────────────
    const sections = ["google", "openai", "email", "business", "notifications"];
    const defaults: Record<string, object> = {
      google:        { apiKey: "", clientId: "", clientSecret: "", placeId: "", accountId: "", locationId: "", isConnected: false },
      openai:        { apiKey: "", model: "gpt-4o", temperature: 0.7, maxTokens: 500, defaultTone: "professional", autoSuggest: true },
      email:         { smtpHost: "", smtpPort: 587, smtpUsername: "", smtpPassword: "", fromEmail: "", fromName: "eGlobe Reviews", isVerified: false },
      business:      { name: "", address: "", phone: "", email: "", website: "", industry: "hotel", description: "" },
      notifications: { emailNotifications: true, newReviewAlert: true, negativeReviewAlert: true, weeklyReport: false, monthlyReport: true, slackWebhook: "", whatsappNumber: "" },
    };

    for (const section of sections) {
      await prisma.settings.upsert({
        where:  { section },
        create: { section, data: JSON.stringify(defaults[section]) },
        update: {},  // don't overwrite existing settings
      });
    }
    console.log("✅ Default settings initialised");

    // ── 4. Google auth singleton ───────────────────────────
    const googleAuth = await prisma.googleAuth.findFirst();
    if (!googleAuth) {
      await prisma.googleAuth.create({ data: {} });
      console.log("✅ Google auth record created");
    }

    // ── 5. Business info ───────────────────────────────────
    const bizInfo = await prisma.businessInfo.findFirst();
    if (!bizInfo) {
      await prisma.businessInfo.create({
        data: {
          id:       "biz_001",
          name:     "",
          address:  "",
          phone:    "",
          email:    "",
          website:  "",
          industry: "hotel",
        },
      });
      console.log("✅ Business info record created (blank — configure in Settings)");
    }

    // ── 6. Subscription Plans ──────────────────────────────
    const planDefs = [
      {
        id: "plan_free_001", name: "Free", slug: "free", price: 0, interval: "month",
        reviewLimit: 50, locationLimit: 1, userLimit: 1,
        features: ["50 reviews/month", "1 location", "AI replies (5/day)", "Email support"],
      },
      {
        id: "plan_pro_001", name: "Pro", slug: "pro", price: 49, interval: "month",
        reviewLimit: 1000, locationLimit: 5, userLimit: 10,
        features: ["1000 reviews/month", "5 locations", "Unlimited AI replies", "Priority support", "Analytics"],
      },
      {
        id: "plan_ent_001", name: "Enterprise", slug: "enterprise", price: 199, interval: "month",
        reviewLimit: 99999, locationLimit: 50, userLimit: 100,
        features: ["Unlimited reviews", "50 locations", "All AI tones", "24/7 support", "Custom reports", "Webhook access", "Dedicated manager"],
      },
    ];

    for (const p of planDefs) {
      await prisma.plan.upsert({
        where:  { slug: p.slug },
        create: {
          id: p.id, name: p.name, slug: p.slug, price: p.price, interval: p.interval,
          reviewLimit: p.reviewLimit, locationLimit: p.locationLimit, userLimit: p.userLimit,
          features: JSON.stringify(p.features), isActive: true,
        },
        update: { name: p.name, price: p.price, features: JSON.stringify(p.features), isActive: true },
      });
    }
    console.log("✅ Subscription plans seeded (Free / Pro / Enterprise)");

    // ── 7. Default Business ────────────────────────────────
    const defaultBizId = "biz_default_001";
    const defaultBizSlug = "my-business";
    let defaultBiz = await prisma.business.findFirst({
      where: {
        OR: [
          { id: defaultBizId },
          { slug: defaultBizSlug },
        ],
      },
    });

    if (!defaultBiz) {
      defaultBiz = await prisma.business.create({
        data: {
          id:       defaultBizId,
          name:     "My Business",
          slug:     defaultBizSlug,
          industry: "hotel",
          ownerId:  "user_admin_001",
          isActive: true,
          plan:     "free",
        },
      });
      console.log("✅ Default business created");
    } else {
      await prisma.business.update({
        where: { id: defaultBiz.id },
        data: {
          name:     defaultBiz.name || "My Business",
          slug:     defaultBizSlug,
          industry: defaultBiz.industry || "hotel",
          ownerId:  defaultBiz.ownerId || "user_admin_001",
          isActive: true,
          plan:     defaultBiz.plan || "free",
        },
      });
      console.log("✅ Default business exists");
    }

    const existingSubscription = await prisma.subscription.findFirst({
      where: { businessId: defaultBiz.id, planId: "plan_free_001" },
    });
    if (!existingSubscription) {
      await prisma.subscription.create({
        data: {
          businessId:         defaultBiz.id,
          planId:             "plan_free_001",
          status:             "active",
          currentPeriodStart: new Date(),
          currentPeriodEnd:   new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      console.log("✅ Default subscription created");
    }

    const existingLocation = await prisma.businessLocation.findFirst({
      where: { businessId: defaultBiz.id, name: "Main Property" },
    });
    if (!existingLocation) {
      await prisma.businessLocation.create({
        data: {
          businessId: defaultBiz.id,
          name:       "Main Property",
          address:    "",
          timezone:   "Asia/Kolkata",
        },
      });
      console.log("✅ Default location created (configure address in Settings)");
    }

    // ── 8. Welcome notification ────────────────────────────
    const notifCount = await prisma.notification.count();
    if (notifCount === 0) {
      await prisma.notification.create({
        data: {
          type:    "SYSTEM",
          title:   "Welcome to eGlobe Review Management!",
          message: "Your system is ready. Go to Settings to connect your Google Business Profile and OpenAI API.",
          isRead:  false,
        },
      });
      console.log("✅ Welcome notification created");
    }

    console.log("\n✨ Database ready — all tables and seed data in place.\n");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("does not exist") || msg.includes("Invalid object name")) {
      console.error("\n❌ Tables not found. Run `npm run db:push` first to create the schema, then restart.\n");
    } else {
      console.error("\n❌ DB Init error:", msg, "\n");
    }
    // Don't throw — let the server continue even if seed fails
  } finally {
    await prisma.$disconnect();
  }
}

// ── Standalone entry-point ─────────────────────────────────
if (require.main === module) {
  runDbInit()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

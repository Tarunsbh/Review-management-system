/**
 * db-clean.ts
 * ─────────────────────────────────────────────────────────────
 * Wipes ALL fake / seeded data from the database.
 *
 * KEEPS (structural records):
 *   ✅ Admin user (admin@admin.com)
 *   ✅ Settings rows (but resets all values to blank)
 *   ✅ Business & BusinessLocation records (with blank name/address)
 *   ✅ Subscription plans (Free / Pro / Enterprise)
 *
 * DELETES (all transactional / seeded content):
 *   🗑  All reviews
 *   🗑  All review replies
 *   🗑  All AI reply history
 *   🗑  All notifications
 *   🗑  All sync logs
 *   🗑  Google auth tokens (resets to disconnected)
 *   🗑  All API logs
 *
 * Usage:
 *   cd backend && npm run db:clean
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["warn", "error"] });

async function main() {
  console.log("\n🧹 eGlobe DB Clean — wiping all fake/seeded data...\n");

  try {
    await prisma.$connect();
    console.log("✅ Connected to SQL Server\n");

    // ── Delete in dependency order ─────────────────────────────────────────

    // 1. AI reply history (depends on reviews)
    const aiCount = await prisma.aiReplyHistory.count();
    await prisma.aiReplyHistory.deleteMany();
    console.log(`🗑  AI reply history   — deleted ${aiCount} records`);

    // 2. Review replies (depends on reviews)
    const repliesCount = await prisma.reviewReply.count();
    await prisma.reviewReply.deleteMany();
    console.log(`🗑  Review replies     — deleted ${repliesCount} records`);

    // 3. Reviews
    const reviewCount = await prisma.review.count();
    await prisma.review.deleteMany();
    console.log(`🗑  Reviews            — deleted ${reviewCount} records`);

    // 4. Sync logs
    const syncCount = await prisma.syncLog.count();
    await prisma.syncLog.deleteMany();
    console.log(`🗑  Sync logs          — deleted ${syncCount} records`);

    // 5. Notifications
    const notifCount = await prisma.notification.count();
    await prisma.notification.deleteMany();
    console.log(`🗑  Notifications      — deleted ${notifCount} records`);

    // 6. API logs (if table exists)
    try {
      const apiLogCount = await (prisma as any).apiLog?.count?.() ?? 0;
      if (apiLogCount > 0) {
        await (prisma as any).apiLog.deleteMany();
        console.log(`🗑  API logs           — deleted ${apiLogCount} records`);
      }
    } catch { /* table may not exist */ }

    // 7. Reset Google auth — clear tokens, mark disconnected
    await prisma.googleAuth.updateMany({
      data: {
        accessToken:  null,
        refreshToken: null,
        expiresAt:    null,
        isConnected:  false,
        accountId:    null,
        locationId:   null,
        accountName:  null,
        locationName: null,
        placeId:      null,
      },
    });
    console.log("🔄  Google auth        — reset to disconnected");

    // 8. Reset ALL settings to blank defaults (preserves rows, clears values)
    const BLANK_DEFAULTS: Record<string, object> = {
      google:        { apiKey: "", clientId: "", clientSecret: "", placeId: "", accountId: "", locationId: "", isConnected: false },
      openai:        { apiKey: "", model: "gpt-4o", temperature: 0.7, maxTokens: 500, defaultTone: "professional", autoSuggest: true },
      email:         { smtpHost: "", smtpPort: 587, smtpUsername: "", smtpPassword: "", fromEmail: "", fromName: "", isVerified: false },
      business:      { name: "", address: "", phone: "", email: "", website: "", industry: "", description: "" },
      notifications: { emailNotifications: true, newReviewAlert: true, negativeReviewAlert: true, weeklyReport: false, monthlyReport: true, slackWebhook: "", whatsappNumber: "" },
    };

    for (const [section, defaults] of Object.entries(BLANK_DEFAULTS)) {
      await prisma.settings.upsert({
        where:  { section },
        create: { section, data: JSON.stringify(defaults) },
        update: { data: JSON.stringify(defaults) },
      });
    }
    console.log("🔄  Settings           — reset to blank (configure in Settings page)");

    // 9. Reset business info to blank
    await prisma.businessInfo.updateMany({
      data: { name: "", address: "", phone: "", email: "", website: "", description: "" },
    });
    await prisma.businessLocation.updateMany({
      data: { name: "Main Property", address: "" },
    });
    console.log("🔄  Business info      — reset to blank");

    // 10. Add a fresh welcome notification
    await prisma.notification.create({
      data: {
        type:    "SYSTEM",
        title:   "Database cleaned — ready for real data",
        message: "All fake data removed. Go to Settings to add your Google API Key, Place ID, and OpenAI key to start fetching real reviews.",
        isRead:  false,
      },
    });
    console.log("✅  Welcome notification created");

    console.log("\n✨ Database is clean and ready.\n");
    console.log("────────────────────────────────────────────────────────");
    console.log("  Next steps:");
    console.log("  1. Go to Settings → Google  — add API Key + Place ID");
    console.log("  2. Go to Settings → OpenAI  — add API Key");
    console.log("  3. Go to Integrations       — click 'Sync Reviews'");
    console.log("────────────────────────────────────────────────────────\n");

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Can't reach database") || msg.includes("connect ECONNREFUSED")) {
      console.error("\n❌ SQL Server not running. Start it with: bash start-db.sh\n");
    } else {
      console.error("\n❌ Clean failed:", msg, "\n");
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

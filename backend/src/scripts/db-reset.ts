/**
 * db-reset.ts
 * ─────────────────────────────────────────────────────────────
 * Drops ALL application tables from SQL Server so that
 * `prisma db push` can recreate them cleanly from scratch.
 *
 * Usage:
 *   npm run db:reset           — drop tables
 *   npm run db:fresh           — drop → push schema → seed
 *
 * WARNING: All data is deleted. Development use only.
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient({ log: ["warn", "error"] });

const DROP_ORDER = [
  "ai_reply_history",
  "review_replies",
  "reviews",
  "notifications",
  "api_logs",
  "sync_logs",
  "analytics_cache",
  "settings",
  "google_auth",
  "business_info",
  "users",
  // Prisma internal shadow tables (safe to ignore if absent)
  "_prisma_migrations",
];

async function resetDb(): Promise<void> {
  console.log("\n⚠️  eGlobe DB Reset — dropping all tables...\n");

  await prisma.$connect();

  // Disable all FK constraints so we can drop in any order
  try {
    await prisma.$executeRawUnsafe(
      `EXEC sp_MSforeachtable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL'`
    );
  } catch {
    // sp_MSforeachtable may not be available on Azure SQL — ignore
  }

  for (const table of DROP_ORDER) {
    try {
      await prisma.$executeRawUnsafe(
        `IF OBJECT_ID('${table}', 'U') IS NOT NULL DROP TABLE [${table}]`
      );
      console.log(`  ✓ Dropped  ${table}`);
    } catch (err) {
      console.warn(`  ⚠ Skipped  ${table}: ${String(err).split("\n")[0]}`);
    }
  }

  // Drop views
  const views = [
    "v_reviews_with_replies",
    "v_analytics_summary",
    "v_monthly_stats",
    "v_unanswered_reviews",
  ];
  for (const view of views) {
    try {
      await prisma.$executeRawUnsafe(
        `IF OBJECT_ID('${view}', 'V') IS NOT NULL DROP VIEW [${view}]`
      );
      console.log(`  ✓ Dropped  view: ${view}`);
    } catch { /* ignore */ }
  }

  await prisma.$disconnect();

  console.log("\n✅ All tables dropped.");
  console.log("   Next: run  npm run db:push  then  npm run db:init\n");
}

resetDb()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Reset failed:", err);
    process.exit(1);
  });

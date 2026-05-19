/**
 * reset-settings.ts
 * ─────────────────────────────────────────────────────────────
 * Clears any previously seeded placeholder/fake data from the
 * settings and businessInfo tables so the app starts blank.
 *
 * Run ONCE if you already started the server before this fix:
 *   npx tsx src/scripts/reset-settings.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["warn", "error"] });

async function main() {
  console.log("\n🧹 Clearing placeholder data from settings...\n");

  // ── 1. Reset business settings to blank ───────────────────
  const blankBusiness = JSON.stringify({
    name: "", address: "", phone: "", email: "",
    website: "", industry: "hotel", description: "",
  });
  await prisma.settings.upsert({
    where:  { section: "business" },
    create: { section: "business", data: blankBusiness },
    update: { data: blankBusiness },
  });
  console.log("✅ Business settings → cleared");

  // ── 2. Reset businessInfo table to blank ──────────────────
  await prisma.businessInfo.updateMany({
    data: { name: "", address: "", phone: "", email: "", website: "" },
  });
  console.log("✅ BusinessInfo table → cleared");

  // ── 3. Ensure google settings start with isConnected=false ─
  const googleRow = await prisma.settings.findUnique({ where: { section: "google" } });
  if (googleRow) {
    const googleData = JSON.parse(googleRow.data) as Record<string, unknown>;
    // Only clear if apiKey is the old placeholder, never if the user set a real key
    if (!googleData.apiKey || String(googleData.apiKey).startsWith("sk-***")) {
      googleData.apiKey      = "";
      googleData.clientId    = googleData.clientId    ?? "";
      googleData.clientSecret= "";
      googleData.placeId     = googleData.placeId     ?? "";
      googleData.accountId   = googleData.accountId   ?? "";
      googleData.locationId  = googleData.locationId  ?? "";
      googleData.isConnected = false;
      await prisma.settings.update({
        where: { section: "google" },
        data:  { data: JSON.stringify(googleData) },
      });
      console.log("✅ Google settings → cleared (API keys blanked)");
    } else {
      console.log("⏭  Google settings → skipped (real key detected, not cleared)");
    }
  }

  // ── 4. Ensure openai settings have blank apiKey ────────────
  const openaiRow = await prisma.settings.findUnique({ where: { section: "openai" } });
  if (openaiRow) {
    const openaiData = JSON.parse(openaiRow.data) as Record<string, unknown>;
    if (!openaiData.apiKey || String(openaiData.apiKey).includes("masked")) {
      openaiData.apiKey = "";
      await prisma.settings.update({
        where: { section: "openai" },
        data:  { data: JSON.stringify(openaiData) },
      });
      console.log("✅ OpenAI settings → API key cleared");
    } else {
      console.log("⏭  OpenAI settings → skipped (real key detected, not cleared)");
    }
  }

  console.log("\n✨ Done. All placeholder data removed.\n");
  console.log("   → Go to Settings in the app to enter your real credentials.\n");
}

main()
  .catch((e) => { console.error("Error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());

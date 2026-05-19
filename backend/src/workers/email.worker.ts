import { Worker, Job } from "bullmq";
import nodemailer, { Transporter } from "nodemailer";
import { PrismaClient } from "@prisma/client";
import { redis } from "../lib/redis";
import { logger } from "../utils/logger";

const prisma = new PrismaClient();

interface EmailSettings {
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  fromEmail: string;
  fromName: string;
}

async function getTransporter(): Promise<Transporter | null> {
  try {
    const settings = await prisma.settings.findUnique({ where: { section: "email" } });
    if (!settings) return null;

    const cfg = JSON.parse(settings.data) as EmailSettings;
    if (!cfg.smtpHost || !cfg.smtpUsername || !cfg.smtpPassword) return null;

    return nodemailer.createTransport({
      host: cfg.smtpHost,
      port: cfg.smtpPort || 587,
      secure: (cfg.smtpPort || 587) === 465,
      auth: { user: cfg.smtpUsername, pass: cfg.smtpPassword },
    });
  } catch {
    return null;
  }
}

async function processJob(job: Job): Promise<void> {
  const { type } = job.data as { type: string; to?: string; subject?: string; html?: string; reviewId?: string };

  const transporter = await getTransporter();
  if (!transporter) {
    logger.warn(`[email] No SMTP configured — skipping job ${job.id}`);
    return;
  }

  const settings = await prisma.settings.findUnique({ where: { section: "email" } });
  const cfg: EmailSettings = settings ? JSON.parse(settings.data) : { fromName: "eGlobe Reviews", fromEmail: "noreply@eglobe.com" };

  if (type === "new-review-alert") {
    const { reviewId } = job.data as { reviewId: string; to: string };
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) return;

    await transporter.sendMail({
      from: `"${cfg.fromName}" <${cfg.fromEmail}>`,
      to: job.data.to,
      subject: `New ${review.rating}★ Review from ${review.reviewerName}`,
      html: `<h2>New Review Received</h2>
             <p><strong>Reviewer:</strong> ${review.reviewerName}</p>
             <p><strong>Rating:</strong> ${review.rating}/5</p>
             <p><strong>Review:</strong> ${review.text}</p>`,
    });
  } else if (type === "weekly-report") {
    const { to } = job.data as { to: string };
    const reviewCount = await prisma.review.count();
    const avgRating = await prisma.review.aggregate({ _avg: { rating: true } });

    await transporter.sendMail({
      from: `"${cfg.fromName}" <${cfg.fromEmail}>`,
      to,
      subject: "Weekly Review Report",
      html: `<h2>Weekly Review Summary</h2>
             <p>Total reviews: ${reviewCount}</p>
             <p>Average rating: ${(avgRating._avg.rating || 0).toFixed(2)}</p>`,
    });
  } else if (type === "invitation") {
    const { to, inviterName, businessName, role } = job.data as {
      to: string; inviterName: string; businessName: string; role: string;
    };

    await transporter.sendMail({
      from: `"${cfg.fromName}" <${cfg.fromEmail}>`,
      to,
      subject: `You've been invited to join ${businessName}`,
      html: `<h2>Team Invitation</h2>
             <p>${inviterName} has invited you to join <strong>${businessName}</strong> as ${role}.</p>`,
    });
  }

  logger.info(`[email] Sent job ${job.id} (${type})`);
  await prisma.$disconnect();
}

export function startEmailWorker(): Worker {
  const worker = new Worker("email", processJob, { connection: redis });

  worker.on("completed", (job) => {
    logger.info(`[email] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    logger.error(`[email] Job ${job?.id} failed:`, err.message);
  });

  logger.info("[email] Worker started");
  return worker;
}

import { Queue } from "bullmq";
import { redis } from "./redis";
import { logger } from "../utils/logger";

const connection = redis;

function createQueue(name: string): Queue {
  const q = new Queue(name, { connection });
  q.on("error", (err) => {
    logger.warn(`Queue [${name}] error (non-fatal):`, err.message);
  });
  return q;
}

export const reviewSyncQueue = createQueue("review-sync");
export const emailQueue = createQueue("email");
export const notificationQueue = createQueue("notification");
export const aiReplyQueue = createQueue("ai-reply");

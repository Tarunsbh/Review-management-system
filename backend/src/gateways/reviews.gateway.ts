import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createRedisClient, isRedisAvailable } from "../lib/redis";
import { logger } from "../utils/logger";

let io: SocketIOServer | null = null;

async function enableRedisAdapter(server: SocketIOServer): Promise<void> {
  const redisReady = await isRedisAvailable();
  if (!redisReady) {
    logger.warn("[gateway] Redis adapter unavailable — using in-memory adapter");
    return;
  }

  const pubClient = createRedisClient();
  const subClient = createRedisClient();

  pubClient.on("error", (err) => {
    logger.warn("[gateway] Redis pub client error (non-fatal):", err.message);
  });

  subClient.on("error", (err) => {
    logger.warn("[gateway] Redis sub client error (non-fatal):", err.message);
  });

  try {
    await Promise.all([pubClient.connect(), subClient.connect()]);
    server.adapter(createAdapter(pubClient, subClient));
    logger.info("[gateway] Socket.io using Redis adapter");
  } catch (err) {
    pubClient.disconnect();
    subClient.disconnect();
    logger.warn("[gateway] Redis adapter unavailable — using in-memory adapter:", err instanceof Error ? err.message : String(err));
  }
}

export async function initReviewsGateway(httpServer: HttpServer): Promise<SocketIOServer> {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/socket.io",
  });

  await enableRedisAdapter(io);

  const reviewsNs = io.of("/reviews");

  reviewsNs.on("connection", (socket: Socket) => {
    logger.info(`[gateway] Client connected: ${socket.id}`);

    socket.on("join:business", (businessId: string) => {
      socket.join(`business:${businessId}`);
      logger.info(`[gateway] Socket ${socket.id} joined business:${businessId}`);
    });

    socket.on("leave:business", (businessId: string) => {
      socket.leave(`business:${businessId}`);
    });

    socket.on("disconnect", () => {
      logger.info(`[gateway] Client disconnected: ${socket.id}`);
    });
  });

  logger.info("[gateway] Reviews Socket.io gateway initialised on /reviews");
  return io;
}

export function emitToRoom(room: string, event: string, data: unknown): void {
  if (!io) {
    logger.warn("[gateway] Socket.io not initialised — skipping emit");
    return;
  }
  io.of("/reviews").to(room).emit(event, data);
}

export function getIO(): SocketIOServer | null {
  return io;
}

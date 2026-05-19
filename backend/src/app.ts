import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

import authRoutes from "./routes/auth";
import reviewRoutes from "./routes/reviews";
import aiRoutes from "./routes/ai";
import analyticsRoutes from "./routes/analytics";
import settingsRoutes from "./routes/settings";
import googleRoutes from "./routes/google";
import notificationRoutes from "./routes/notifications";
import businessRoutes from "./routes/businesses";
import locationRoutes from "./routes/locations";
import teamRoutes from "./routes/teams";
import billingRoutes from "./routes/billing";
import adminRoutes from "./routes/admin";
import { errorHandler } from "./middleware/errorHandler";
import { apiLogger } from "./middleware/apiLogger";
import { logger } from "./utils/logger";

// ── Swagger / OpenAPI setup ─────────────────────────────────
const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "eGlobe Review Management API",
      version: "2.0.0",
      description: "Enterprise Google Review Management Platform — REST API documentation",
      contact: { name: "eGlobe Support", email: "support@eglobe.com" },
    },
    servers: [
      { url: "http://localhost:4000/api", description: "Local Development" },
      { url: "https://api.eglobe.com/api", description: "Production" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./src/routes/*.ts"],
};

const app: Application = express();

// ============================================================
// Security Middleware
// ============================================================

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: "Too many login attempts." },
});

app.use("/api", globalLimiter);
app.use("/api/auth/login", authLimiter);

// ============================================================
// Body Parsing & Utils
// ============================================================

app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined", { stream: { write: (msg) => logger.http(msg.trim()) } }));
app.use(apiLogger);

// ============================================================
// Routes
// ============================================================

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "eGlobe Review Management API is running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Swagger docs
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: "eGlobe Review API Docs",
  customCss: ".swagger-ui .topbar { background-color: #6366f1; }",
}));
app.get("/api/docs.json", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// Stripe billing webhook needs raw body (mount before json parser on this route)
app.use("/api/billing/webhook", express.raw({ type: "application/json" }));

// ── Core routes ────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/google", googleRoutes);
app.use("/api/notifications", notificationRoutes);

// ── Enterprise routes ──────────────────────────────────────
app.use("/api/businesses", businessRoutes);
app.use("/api/businesses/:businessId/locations", locationRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/admin", adminRoutes);

// 404 handler
app.use("*", (_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    message: `The requested endpoint does not exist`,
  });
});

// Error handler
app.use(errorHandler);

export default app;

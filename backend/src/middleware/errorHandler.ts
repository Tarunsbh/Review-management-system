import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const isDev = process.env.NODE_ENV === "development";

  logger.error("Error:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    statusCode,
  });

  // Detect database connection errors and return a clear message
  const msg = err.message || "";
  const isDbDown =
    msg.includes("Can't reach database") ||
    msg.includes("connect ECONNREFUSED") ||
    msg.includes("Connection refused") ||
    msg.includes("login failed") ||
    msg.includes("P1001") || // Prisma: can't reach DB
    msg.includes("P1002") || // Prisma: DB server timeout
    msg.includes("P1017");   // Prisma: server closed connection

  const clientMessage = isDbDown
    ? "Database is not reachable. Please start SQL Server (run ./start-db.sh) and try again."
    : err.message || "Internal server error";

  res.status(statusCode).json({
    success: false,
    error: clientMessage,
    ...(isDev && !isDbDown && { stack: err.stack }),
  });
};

export const createError = (message: string, statusCode: number): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

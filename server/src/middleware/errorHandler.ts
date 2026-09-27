import { Request, Response, NextFunction } from "express";

/**
 * 404 handler for unknown API routes.
 *
 * This runs only if no route above it matched.
 */
export const notFoundHandler = (
  req: Request,
  res: Response
) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

/**
 * Final safety-net error handler.
 *
 * Individual controllers already catch and translate
 * their own errors into user-friendly 400/500 responses.
 * This middleware only runs for truly unhandled errors
 * (e.g. a thrown error in middleware, or a bug in a
 * controller that forgot its own try/catch), so the
 * client never sees a raw stack trace.
 */
export const globalErrorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error("Unhandled error:", err);

  res.status(500).json({
    success: false,
    message: "Something went wrong. Please try again.",
  });
};

import express from "express";
import cors from "cors";

import mentorRoutes from "./routes/mentor.routes";
import bookingRoutes from "./routes/booking.routes";
import slotRoutes from "./routes/slot.routes";

import {
  notFoundHandler,
  globalErrorHandler,
} from "./middleware/errorHandler";

const app = express();

/*
 * Allow the frontend origin to be configured via env var
 * so production deployments aren't stuck with an
 * open/wildcard CORS policy. Falls back to the local
 * Vite dev server origin.
 */

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
];

app.use(
  cors({
    origin: allowedOrigins,
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "Codeyoung Booking API is running",
  });
});

app.use("/api/mentors", mentorRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/slots", slotRoutes);

app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;

import rateLimit from "express-rate-limit";

/**
 * Rate limit for the booking-creation endpoint.
 *
 * A genuine parent booking a trial class only ever submits
 * this a handful of times per session (retry after a
 * validation error, "slot just booked" race, etc). 10
 * requests/minute/IP comfortably covers normal retries
 * while blocking a scripted flood that could otherwise
 * exhaust the day's mentor capacity or hammer the email
 * provider.
 */
export const bookingRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Too many booking attempts. Please wait a moment and try again.",
  },
});

/**
 * Rate limit for read-only availability endpoints
 * (slots / mentor availability).
 *
 * These are called automatically as the parent picks a
 * date/timezone, so the limit is generous — it exists only
 * to blunt scripted polling, not to interrupt normal use.
 */
export const availabilityRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Too many requests. Please wait a moment and try again.",
  },
});

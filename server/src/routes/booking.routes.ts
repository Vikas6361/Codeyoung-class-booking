import { Router } from "express";
import {
  createBookingController,
} from "../controllers/booking.controller";
import { bookingRateLimiter } from "../middleware/rateLimiter";

const router = Router();

router.post(
  "/",
  bookingRateLimiter,
  createBookingController
);

export default router;
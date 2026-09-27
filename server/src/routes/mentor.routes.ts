import { Router } from "express";
import {
  checkMentorAvailability,
} from "../controllers/mentor.controller";
import { availabilityRateLimiter } from "../middleware/rateLimiter";

const router = Router();

router.get(
  "/availability",
  availabilityRateLimiter,
  checkMentorAvailability
);

export default router;

import { Router } from "express";
import { getSlotsController } from "../controllers/slot.controller";
import { availabilityRateLimiter } from "../middleware/rateLimiter";

const router = Router();

router.get("/", availabilityRateLimiter, getSlotsController);

export default router;
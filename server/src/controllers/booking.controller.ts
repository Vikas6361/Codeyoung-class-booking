import { Request, Response } from "express";
import { z } from "zod";

import {
  createBooking,
} from "../services/booking.service";

const createBookingSchema =
  z.object({
    parent: z.object({
      name: z
        .string()
        .min(
          2,
          "Name must contain at least 2 characters"
        ),

      email: z
        .string()
        .email(
          "Invalid email address"
        ),

      timezone: z
        .string()
        .min(
          1,
          "Timezone is required"
        ),
    }),

    date: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "Date must be YYYY-MM-DD"
      ),

    time: z
      .string()
      .regex(
        /^\d{2}:\d{2}$/,
        "Time must be HH:mm"
      ),
  });

export const createBookingController =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      /*
       * Validate request body
       */
      const validation =
        createBookingSchema.safeParse(
          req.body
        );

      if (!validation.success) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid booking request",

          errors:
            validation.error.flatten(),
        });
      }

      /*
       * Create booking
       */
      const booking =
        await createBooking(
          validation.data
        );

      return res.status(201).json({
        success: true,

        message:
          "Trial class booked successfully",

        booking,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to create booking";

      console.error(error);

      /*
       * Client/business-rule errors thrown by the booking
       * service are always plain Error objects with a
       * user-safe message. Any error surfaced from
       * createBooking() is safe to relay to the client;
       * only truly unexpected (non-Error) failures fall
       * through to the generic 500 below.
       */
      if (error instanceof Error) {
        return res.status(400).json({
          success: false,
          message,
        });
      }

      /*
       * Unexpected server error
       */
      return res.status(500).json({
        success: false,

        message:
          "Something went wrong while creating the booking.",
      });
    }
  };
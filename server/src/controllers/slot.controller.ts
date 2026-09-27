
import { Request, Response } from "express";
import { getAvailableSlots } from "../services/slot.service";

export const getSlotsController = async (
  req: Request,
  res: Response
) => {
  try {
    const { date, timezone } = req.query;

    if (
      typeof date !== "string" ||
      typeof timezone !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Date and timezone are required"
      });
    }

    const slots = await getAvailableSlots(
      date,
      timezone
    );

    return res.json({
      success: true,
      date,
      timezone,
      slots
    });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Unable to retrieve slots";

    if (
      message === "Invalid date" ||
      message === "Invalid timezone"
    ) {
      return res.status(400).json({
        success: false,
        message
      });
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve slots"
    });
  }
};
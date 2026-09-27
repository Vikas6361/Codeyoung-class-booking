import { Request, Response } from "express";
import { getAvailableMentors } from "../services/mentor.service";
import { localTimeToUTC } from "../services/timezone.service";

export const checkMentorAvailability = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      date,
      time,
      timezone,
    } = req.query;

    if (
      typeof date !== "string" ||
      typeof time !== "string" ||
      typeof timezone !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "date, time and timezone are required",
      });
    }

    const startTimeUTC = localTimeToUTC(
      date,
      time,
      timezone
    );

    const mentors =
      await getAvailableMentors(startTimeUTC);

    return res.json({
      success: true,

      requestedTime: {
        date,
        time,
        timezone,
        utc: startTimeUTC.toISOString(),
      },

      availableMentors: mentors.map(
        (mentor) => ({
          id: mentor._id,
          name: mentor.name,
          timezone: mentor.timezone,
        })
      ),
    });
  } catch (error) {
    console.error(error);

    /*
     * localTimeToUTC / getAvailableMentors throw plain
     * Error objects with a user-safe message for
     * validation problems (invalid timezone, DST
     * transition, etc). Relay those as 400s instead of
     * masking them as a generic server error.
     */
    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to check mentor availability",
    });
  }
};
import { DateTime } from "luxon";

import { Mentor } from "../models/Mentor";
import { Booking } from "../models/Booking";

import {
  BOOKING_CONFIG,
} from "../config/booking";

export interface AvailableMentor {
  mentor: InstanceType<typeof Mentor>;
  classesToday: number;
}

/**
 * Find mentors who can conduct a class
 * at the requested UTC time.
 *
 * Checks:
 *
 * 1. Mentor is active
 * 2. Class falls inside mentor working hours
 * 3. Class does not cross mentor's local midnight
 * 4. Mentor has no overlapping booking
 * 5. Mentor has fewer than 2 classes that day
 */
export const getAvailableMentorsWithLoad =
  async (
    startTimeUTC: Date
  ): Promise<AvailableMentor[]> => {
    const endTimeUTC = new Date(
      startTimeUTC.getTime() +
        BOOKING_CONFIG.CLASS_DURATION_MINUTES *
          60 *
          1000
    );

    const mentors = await Mentor.find({
      isActive: true,
    });

    const available: AvailableMentor[] = [];

    for (const mentor of mentors) {
      /*
       * Convert requested UTC time into
       * the mentor's local timezone.
       */
      const mentorLocalStart =
        DateTime.fromJSDate(
          startTimeUTC,
          {
            zone: "utc",
          }
        ).setZone(mentor.timezone);

      const mentorLocalEnd =
        DateTime.fromJSDate(
          endTimeUTC,
          {
            zone: "utc",
          }
        ).setZone(mentor.timezone);

      if (
        !mentorLocalStart.isValid ||
        !mentorLocalEnd.isValid
      ) {
        continue;
      }

      /*
       * Do not allow a class to cross
       * the mentor's local calendar day.
       */
      if (
        mentorLocalStart.toISODate() !==
        mentorLocalEnd.toISODate()
      ) {
        continue;
      }

      /*
       * Check mentor working hours.
       *
       * Example:
       * 09:00 AM - 06:00 PM
       */
      const startMinutes =
        mentorLocalStart.hour * 60 +
        mentorLocalStart.minute;

      const endMinutes =
        mentorLocalEnd.hour * 60 +
        mentorLocalEnd.minute;

      const workStartMinutes =
        BOOKING_CONFIG.MENTOR_WORK_START_HOUR *
        60;

      const workEndMinutes =
        BOOKING_CONFIG.MENTOR_WORK_END_HOUR *
        60;

      if (
        startMinutes < workStartMinutes ||
        endMinutes > workEndMinutes
      ) {
        continue;
      }

      /*
       * Find the mentor's local calendar day.
       */
      const mentorLocalDay =
        mentorLocalStart.startOf("day");

      const nextLocalDay =
        mentorLocalDay.plus({
          days: 1,
        });

      const dayStartUTC =
        mentorLocalDay
          .toUTC()
          .toJSDate();

      const dayEndUTC =
        nextLocalDay
          .toUTC()
          .toJSDate();

      /*
       * Get all confirmed bookings
       * belonging to this mentor's local day.
       */
      const bookings =
        await Booking.find({
          mentorId: mentor._id,

          status: "CONFIRMED",

          startTimeUTC: {
            $lt: dayEndUTC,
          },

          endTimeUTC: {
            $gt: dayStartUTC,
          },
        });

      /*
       * Check for overlapping booking.
       *
       * Overlap rule:
       *
       * existingStart < requestedEnd
       * AND
       * existingEnd > requestedStart
       */
      const hasOverlap =
        bookings.some((booking) => {
          return (
            booking.startTimeUTC <
              endTimeUTC &&
            booking.endTimeUTC >
              startTimeUTC
          );
        });

      if (hasOverlap) {
        continue;
      }

      /*
       * Enforce maximum 2 classes
       * per mentor per local day.
       */
      if (
        bookings.length >=
        BOOKING_CONFIG.MAX_CLASSES_PER_MENTOR_PER_DAY
      ) {
        continue;
      }

      available.push({
        mentor,
        classesToday: bookings.length,
      });
    }

    /*
     * Prefer mentors with fewer classes.
     *
     * Example:
     *
     * Mentor A → 2 classes
     * Mentor B → 1 class
     * Mentor C → 0 classes
     *
     * Mentor C will be considered first.
     */
    return available.sort(
      (a, b) =>
        a.classesToday -
        b.classesToday
    );
  };

/**
 * Backward-compatible helper used by
 * the availability API.
 */
export const getAvailableMentors =
  async (
    startTimeUTC: Date
  ) => {
    const available =
      await getAvailableMentorsWithLoad(
        startTimeUTC
      );

    return available.map(
      (item) => item.mentor
    );
  };

/**
 * Select the mentor with the lowest
 * current workload.
 *
 * If multiple mentors have the same
 * workload, one is selected randomly.
 */
export const selectMentor =
  async (
    startTimeUTC: Date
  ) => {
    const available =
      await getAvailableMentorsWithLoad(
        startTimeUTC
      );

    if (available.length === 0) {
      return null;
    }

    const minimumLoad =
      available[0].classesToday;

    const candidates =
      available.filter(
        (item) =>
          item.classesToday ===
          minimumLoad
      );

    const randomIndex =
      Math.floor(
        Math.random() *
          candidates.length
      );

    return candidates[randomIndex]
      .mentor;
  };
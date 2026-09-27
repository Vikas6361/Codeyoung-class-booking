import { DateTime } from "luxon";

import {
  getAvailableMentors,
} from "./mentor.service";

import {
  isValidTimezone,
} from "./timezone.service";

export const getAvailableSlots =
  async (
    date: string,
    timezone: string
  ) => {
    if (!isValidTimezone(timezone)) {
      throw new Error(
        "Invalid timezone"
      );
    }

    const day = DateTime.fromISO(
      date,
      {
        zone: timezone,
      }
    );

    if (
      !day.isValid ||
      day.toISODate() !== date
    ) {
      throw new Error(
        "Invalid date"
      );
    }

    const slots = [];

    /*
     * Generate hourly slots.
     *
     * Example:
     *
     * 09:00
     * 10:00
     * 11:00
     * ...
     * 20:00
     *
     * DST safety:
     *
     * Luxon's DateTime#set() does NOT reject a nonexistent
     * local time (e.g. 02:30 on a US spring-forward day) —
     * it silently normalizes it forward to the next valid
     * instant. If left unchecked, that means two different
     * "hour" values in this loop (e.g. hour=2 and hour=3 on
     * a spring-forward day) can both resolve to the exact
     * same real instant, producing two duplicate-looking
     * slots in the list shown to the parent.
     *
     * To avoid that, every candidate local time is round-
     * tripped the same way validateLocalDateTime() does for
     * an actual booking: format it back out and compare
     * against what was requested. If they don't match, this
     * local hour does not really exist on this day in this
     * timezone (a DST gap) and the slot is skipped — not
     * silently shifted.
     */
    for (
      let hour = 0;
      hour < 24;
      hour++
    ) {
      const requestedLocal = `${date}T${String(hour).padStart(2, "0")}:00`;

      const localStart = DateTime.fromISO(
        requestedLocal,
        {
          zone: timezone,
          setZone: true,
        }
      );

      if (!localStart.isValid) {
        continue;
      }

      const roundTrip = localStart.toFormat(
        "yyyy-MM-dd'T'HH:mm"
      );

      /*
       * This local hour does not exist on this calendar
       * day in this timezone (DST spring-forward gap).
       * Skip it entirely rather than showing a shifted or
       * duplicate slot.
       */
      if (roundTrip !== requestedLocal) {
        continue;
      }

      /*
       * Don't show slots that are
       * already in the past.
       */
      if (
        localStart.toMillis() <=
        Date.now()
      ) {
        continue;
      }

      /*
       * Convert parent local time
       * to UTC.
       */
      const utcStart =
        localStart.toUTC();

      /*
       * Find mentors available at
       * this exact UTC instant.
       */
      const mentors =
        await getAvailableMentors(
          utcStart.toJSDate()
        );

      /*
       * Only return slots that have
       * at least one available mentor.
       */
      if (mentors.length === 0) {
        continue;
      }

      slots.push({
        time: localStart.toFormat(
          "hh:mm a"
        ),

        startTimeUTC:
          utcStart.toISO(),

        timezone,

        availableMentors:
          mentors.length,

        available: true,
      });
    }

    return slots;
  };
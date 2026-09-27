import { DateTime } from "luxon";

import { Parent } from "../models/Parent";
import { Booking } from "../models/Booking";

import {
  assertValidTimezone,
  convertUTCToTimezone,
  getLocalDate,
  localTimeToUTC,
} from "./timezone.service";

import {
  getAvailableMentorsWithLoad,
} from "./mentor.service";

import {
  reserveMentorDailyCapacity,
  releaseMentorDailyCapacity,
} from "./capacity.service";

import {
  generateMeetingLink,
} from "../utils/meetingLink";

import {
  sendParentConfirmationEmail,
  sendMentorAssignmentEmail,
} from "./email.service";

import {
  BOOKING_CONFIG,
} from "../config/booking";

interface CreateBookingInput {
  parent: {
    name: string;
    email: string;
    timezone: string;
  };

  date: string;

  time: string;
}

/**
 * Create a trial-class booking.
 *
 * Flow:
 *
 * 1. Validate parent timezone
 * 2. Validate local date/time
 * 3. Convert local time to UTC
 * 4. Validate future booking
 * 5. Validate hourly slot
 * 6. Find available mentors
 * 7. Try mentors one by one
 * 8. Atomically reserve daily capacity
 * 9. Create booking
 * 10. Generate meeting link
 * 11. Send emails
 * 12. Return confirmation
 */
export const createBooking =
  async (
    input: CreateBookingInput
  ) => {
    const {
      parent,
      date,
      time,
    } = input;

    /*
     * ------------------------------------------------
     * 1. Validate timezone
     * ------------------------------------------------
     */

    assertValidTimezone(
      parent.timezone
    );

    /*
     * ------------------------------------------------
     * 2. Validate local date/time
     * ------------------------------------------------
     */

    const localDateTime =
      DateTime.fromISO(
        `${date}T${time}`,
        {
          zone: parent.timezone,
          setZone: true,
        }
      );

    if (!localDateTime.isValid) {
      throw new Error(
        "The selected date or time is invalid."
      );
    }

    /*
     * Only hourly slots are accepted.
     *
     * 10:00 ✓
     * 11:00 ✓
     *
     * 10:30 ✗
     */
    if (
      localDateTime.minute !== 0 ||
      localDateTime.second !== 0
    ) {
      throw new Error(
        "Trial classes must start on an hourly slot."
      );
    }

    /*
     * Convert parent local time → UTC.
     */
    const startTimeUTC =
      localTimeToUTC(
        date,
        time,
        parent.timezone
      );

    /*
     * ------------------------------------------------
     * 3. Prevent past bookings
     * ------------------------------------------------
     */

    if (
      startTimeUTC.getTime() <=
      Date.now()
    ) {
      throw new Error(
        "You cannot book a trial class in the past."
      );
    }

    /*
     * ------------------------------------------------
     * 4. Calculate class end time
     * ------------------------------------------------
     */

    const endTimeUTC =
      new Date(
        startTimeUTC.getTime() +
          BOOKING_CONFIG.CLASS_DURATION_MINUTES *
            60 *
            1000
      );

    /*
     * ------------------------------------------------
     * 5. Find available mentors
     * ------------------------------------------------
     *
     * Mentors are sorted by workload.
     */

    const availableMentors =
      await getAvailableMentorsWithLoad(
        startTimeUTC
      );

    if (
      availableMentors.length === 0
    ) {
      throw new Error(
        "No mentors are available for the selected time slot."
      );
    }

    /*
     * ------------------------------------------------
     * 6. Find/create parent
     * ------------------------------------------------
     *
     * Parent.email now has a unique index. Two concurrent
     * first-time bookings from the same new email could
     * both pass the findOne() check below before either
     * has created the document. If that happens, the
     * losing create() call will fail with a MongoDB
     * duplicate-key error (code 11000) — in that case we
     * simply re-fetch the record the other request just
     * created, rather than surfacing a confusing 500.
     */

    let parentRecord =
      await Parent.findOne({
        email:
          parent.email.toLowerCase(),
      });

    if (!parentRecord) {
      try {
        parentRecord =
          await Parent.create({
            name: parent.name,

            email:
              parent.email.toLowerCase(),

            timezone:
              parent.timezone,
          });
      } catch (error: any) {
        if (error?.code === 11000) {
          parentRecord =
            await Parent.findOne({
              email:
                parent.email.toLowerCase(),
            });

          if (!parentRecord) {
            throw error;
          }
        } else {
          throw error;
        }
      }
    } else {
      parentRecord.name =
        parent.name;

      parentRecord.timezone =
        parent.timezone;

      await parentRecord.save();
    }

    /*
     * ------------------------------------------------
     * 7. Try available mentors
     * ------------------------------------------------
     *
     * This is important for concurrent requests.
     *
     * If Mentor A becomes unavailable while
     * we're booking, we'll try Mentor B.
     */

    for (
      const availableMentor
      of availableMentors
    ) {
      const mentor =
        availableMentor.mentor;

      /*
       * Determine the mentor's local
       * calendar date.
       */
      const mentorLocalDate =
        getLocalDate(
          startTimeUTC,
          mentor.timezone
        );

      /*
       * ------------------------------------------------
       * 8. Atomically reserve daily capacity
       * ------------------------------------------------
       */

      const capacityReserved =
        await reserveMentorDailyCapacity(
          mentor._id,
          mentorLocalDate
        );

      /*
       * Mentor reached the daily limit
       * because another request won the race.
       */
      if (!capacityReserved) {
        continue;
      }

      let bookingCreated =
        false;

      try {
        /*
         * ------------------------------------------------
         * 9. Final conflict check
         * ------------------------------------------------
         */

        const conflictingBooking =
          await Booking.findOne({
            mentorId: mentor._id,

            status: "CONFIRMED",

            startTimeUTC: {
              $lt: endTimeUTC,
            },

            endTimeUTC: {
              $gt: startTimeUTC,
            },
          });

        if (conflictingBooking) {
          continue;
        }

        /*
         * ------------------------------------------------
         * 10. Generate meeting link
         * ------------------------------------------------
         */

        const meetingLink =
          generateMeetingLink();

        /*
         * ------------------------------------------------
         * 11. Create booking
         * ------------------------------------------------
         */

        const booking =
          await Booking.create({
            parentId:
              parentRecord._id,

            mentorId:
              mentor._id,

            startTimeUTC,

            endTimeUTC,

            parentTimezone:
              parent.timezone,

            mentorTimezone:
              mentor.timezone,

            meetingLink,

            status: "CONFIRMED",
          });

        bookingCreated = true;

        /*
         * ------------------------------------------------
         * 12. Prepare local times
         * ------------------------------------------------
         */

        const parentLocalTime =
          convertUTCToTimezone(
            startTimeUTC,
            parent.timezone
          );

        const mentorLocalTime =
          convertUTCToTimezone(
            startTimeUTC,
            mentor.timezone
          );

        /*
         * ------------------------------------------------
         * 13. Send emails
         * ------------------------------------------------
         *
         * Parent and mentor get different templates and
         * subject lines — a mentor assignment notice reads
         * very differently from a parent confirmation.
         *
         * Email failure should not destroy
         * an already-created booking.
         */

        const parentLocalDateTime = DateTime.fromJSDate(
          startTimeUTC,
          { zone: "utc" }
        ).setZone(parent.timezone);

        const mentorLocalDateTime = DateTime.fromJSDate(
          startTimeUTC,
          { zone: "utc" }
        ).setZone(mentor.timezone);

        try {
          await sendParentConfirmationEmail({
            recipient:
              parentRecord.email,

            parentName:
              parentRecord.name,

            mentorName:
              mentor.name,

            date:
              parentLocalDateTime.toFormat("dd LLL yyyy"),

            time:
              parentLocalDateTime.toFormat("hh:mm a"),

            parentTimezone:
              parent.timezone,

            meetingLink,
          });

          await sendMentorAssignmentEmail({
            recipient:
              mentor.email,

            mentorName:
              mentor.name,

            studentName:
              parentRecord.name,

            studentEmail:
              parentRecord.email,

            date:
              mentorLocalDateTime.toFormat("dd LLL yyyy"),

            mentorLocalTime:
              mentorLocalDateTime.toFormat("hh:mm a"),

            mentorTimezone:
              mentor.timezone,

            meetingLink,
          });
        } catch (emailError) {
          console.error(
            "Booking created, but email delivery failed:",
            emailError
          );
        }

        /*
         * ------------------------------------------------
         * 14. Return booking confirmation
         * ------------------------------------------------
         */

        return {
          bookingId:
            booking._id,

          parent: {
            name:
              parentRecord.name,

            email:
              parentRecord.email,

            timezone:
              parentRecord.timezone,

            localTime:
              parentLocalTime,
          },

          mentor: {
            id:
              mentor._id,

            name:
              mentor.name,

            email:
              mentor.email,

            timezone:
              mentor.timezone,

            localTime:
              mentorLocalTime,
          },

          meetingLink,

          startTimeUTC:
            startTimeUTC.toISOString(),

          endTimeUTC:
            endTimeUTC.toISOString(),

          status:
            booking.status,
        };
      } catch (error: any) {
        /*
         * Duplicate mentor + slot means
         * another request won the race.
         *
         * Try another mentor.
         */
        if (
          error?.code === 11000
        ) {
          continue;
        }

        throw error;
      } finally {
        /*
         * If booking wasn't successfully created,
         * release the daily capacity reservation.
         */
        if (!bookingCreated) {
          await releaseMentorDailyCapacity(
            mentor._id,
            mentorLocalDate
          );
        }
      }
    }

    /*
     * Every available mentor was either:
     *
     * - taken by another request
     * - reached capacity
     * - had a conflict
     */

    throw new Error(
      "The selected slot was just booked. Please choose another time."
    );
  };
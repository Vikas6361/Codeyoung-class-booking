import mongoose from "mongoose";

import {
  MentorDailyCapacity,
} from "../models/MentorDailyCapacity";

const MAX_CLASSES_PER_DAY = 2;

/**
 * Atomically reserve one class slot for a mentor
 * on their local calendar date.
 *
 * Returns:
 * true  -> capacity successfully reserved
 * false -> mentor has already reached 2 classes
 */
export const reserveMentorDailyCapacity =
  async (
    mentorId: mongoose.Types.ObjectId,
    localDate: string
  ): Promise<boolean> => {
    try {
      const result =
        await MentorDailyCapacity.findOneAndUpdate(
          {
            mentorId,

            localDate,

            bookingCount: {
              $lt: MAX_CLASSES_PER_DAY,
            },
          },

          {
            $inc: {
              bookingCount: 1,
            },
          },

          {
            returnDocument: "after",

            upsert: true,

            setDefaultsOnInsert: true,
          }
        );

      return result !== null;
    } catch (error: any) {
      /*
       * Two simultaneous requests may try to create
       * the same mentor + date document.
       *
       * The unique index in MentorDailyCapacity
       * protects this operation.
       */
      if (error?.code === 11000) {
        return false;
      }

      throw error;
    }
  };

/**
 * Release a previously reserved class slot.
 *
 * This is used when capacity was reserved but
 * booking creation failed.
 */
export const releaseMentorDailyCapacity =
  async (
    mentorId: mongoose.Types.ObjectId,
    localDate: string
  ): Promise<void> => {
    await MentorDailyCapacity.findOneAndUpdate(
      {
        mentorId,

        localDate,

        bookingCount: {
          $gt: 0,
        },
      },

      {
        $inc: {
          bookingCount: -1,
        },
      }
    );
  };
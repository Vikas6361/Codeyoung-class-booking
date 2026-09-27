import mongoose, { Document, Schema } from "mongoose";

export interface IMentorDailyCapacity extends Document {
  mentorId: mongoose.Types.ObjectId;
  localDate: string;
  bookingCount: number;
}

const mentorDailyCapacitySchema =
  new Schema<IMentorDailyCapacity>(
    {
      mentorId: {
        type: Schema.Types.ObjectId,
        ref: "Mentor",
        required: true,
      },

      localDate: {
        type: String,
        required: true,
      },

      bookingCount: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
        max: 2,
      },
    },
    {
      timestamps: true,
    }
  );

mentorDailyCapacitySchema.index(
  {
    mentorId: 1,
    localDate: 1,
  },
  {
    unique: true,
  }
);

export const MentorDailyCapacity =
  mongoose.model<IMentorDailyCapacity>(
    "MentorDailyCapacity",
    mentorDailyCapacitySchema
  );
import mongoose, { Document, Schema } from "mongoose";

export type BookingStatus =
  | "CONFIRMED"
  | "CANCELLED";

export interface IBooking extends Document {
  parentId: mongoose.Types.ObjectId;
  mentorId: mongoose.Types.ObjectId;

  startTimeUTC: Date;
  endTimeUTC: Date;

  parentTimezone: string;
  mentorTimezone: string;

  meetingLink: string;

  status: BookingStatus;

  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "Parent",
      required: true,
    },

    mentorId: {
      type: Schema.Types.ObjectId,
      ref: "Mentor",
      required: true,
    },

    startTimeUTC: {
      type: Date,
      required: true,
    },

    endTimeUTC: {
      type: Date,
      required: true,
    },

    parentTimezone: {
      type: String,
      required: true,
    },

    mentorTimezone: {
      type: String,
      required: true,
    },

    meetingLink: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["CONFIRMED", "CANCELLED"],
      default: "CONFIRMED",
    },
  },
  {
    timestamps: true,
  }
);

bookingSchema.index({
  mentorId: 1,
  startTimeUTC: 1,
  endTimeUTC: 1,
});

bookingSchema.index({
  parentId: 1,
  startTimeUTC: 1,
});
bookingSchema.index(
  {
    mentorId: 1,
    startTimeUTC: 1,
  },
  {
    unique: true,
  }
);

export const Booking = mongoose.model<IBooking>(
  "Booking",
  bookingSchema
);
import mongoose, {
  Document,
  Schema,
} from "mongoose";

export interface IMentor extends Document {
  _id: mongoose.Types.ObjectId;

  name: string;
  email: string;
  timezone: string;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const mentorSchema =
  new Schema<IMentor>(
    {
      name: {
        type: String,
        required: true,
        trim: true,
      },

      email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
      },

      timezone: {
        type: String,
        required: true,
      },

      isActive: {
        type: Boolean,
        default: true,
      },
    },
    {
      timestamps: true,
    }
  );

export const Mentor =
  mongoose.model<IMentor>(
    "Mentor",
    mentorSchema
  );
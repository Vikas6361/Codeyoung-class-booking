import mongoose, { Document, Schema } from "mongoose";

export interface IParent extends Document {
  name: string;
  email: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

const parentSchema = new Schema<IParent>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
    },

    timezone: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Parent = mongoose.model<IParent>("Parent", parentSchema);
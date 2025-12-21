import mongoose from "mongoose";

const OrganisationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NewUser",
      required: true,
    },
    company: {
      type: String,
      required: true,
      trim: true,
    },
    address1: {
      type: String,
      required: true,
      trim: true,
    },
    address2: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    pincode: {
      type: String,
      required: true,
      trim: true,
    },
    industry: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

// Create compound index to ensure one organisation per user
OrganisationSchema.index({ userId: 1 }, { unique: true });

export const Organisation = mongoose.model("Organisation", OrganisationSchema);

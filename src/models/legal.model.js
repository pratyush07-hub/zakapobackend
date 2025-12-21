import mongoose from "mongoose";

const LegalDetailsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NewUser",
      required: true,
    },
    companyId: {
      type: String,
      required: true,
      trim: true,
    },
    gstNo: {
      type: String,
      required: true,
      trim: true,
    },
    otherTax: {
      type: String,
      trim: true,
    },
    taxNo: {
      type: String,
      trim: true,
    },
    contactMemberName: {
      type: String,
      trim: true,
    },
    designation: {
      type: String,
      trim: true,
    },
    contactNo: {
      type: String,
      required: true,
      trim: true,
    },
    websiteLink: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Create compound index to ensure one legal details per user
LegalDetailsSchema.index({ userId: 1 }, { unique: true });

export const LegalDetails = mongoose.model("LegalDetails", LegalDetailsSchema);

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import config from "../config/config.js";

const NewUserSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
    },
    emailAddress: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    accountPassword: {
      type: String,
      required: true,
    },
    userState: {
      type: String,
      required: true,
    },
    contactNumber: {
      type: String,
      required: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationOTP: {
      type: String,
      default: null,
    },
    emailVerificationExpires: {
      type: Date,
      default: null,
    },
    refreshToken: {
      type: String,
    },
    // 🔐 Add reset token & expiry
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
    // new fields
    userName: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      default: function () {
        return this.emailAddress
          ? this.emailAddress.split("@")[0].toLowerCase()
          : undefined;
      },
    },

    role: {
      type: String,
      enum: ["admin", "operations", "marketing", "analytics", "inventory"],
      default: "operations",
    },

    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
  },
  { timestamps: true }
);

// pre hook --> which will encrypt password before getting saved to DB
NewUserSchema.pre("save", async function (next) {
  if (!this.isModified("accountPassword")) return next();

  this.accountPassword = await bcrypt.hash(this.accountPassword, 10);

  return next();
});

// method to check if password is correct or not

NewUserSchema.methods.isPasswordCorrect = async function (UserPassword) {
  return await bcrypt.compare(UserPassword, this.accountPassword);
};

// generate access token method

NewUserSchema.methods.generateAccessToken = function () {
  return jwt.sign({ _id: this._id }, config.ACCESS_TOKEN_SECRET, {
    expiresIn: config.ACCESS_TOKEN_EXPIRY,
  });
};

NewUserSchema.methods.generateRefreshToken = function () {
  return jwt.sign({ _id: this._id }, config.REFRESH_TOKEN_SECRET, {
    expiresIn: config.REFRESH_TOKEN_EXPIRY,
  });
};

export const User = mongoose.model("NewUser", NewUserSchema);

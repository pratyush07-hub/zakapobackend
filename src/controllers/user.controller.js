import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import config from "../config/config.js";
import nodemailer from "nodemailer";

const generateAccessAndRefreshToken = async (presentUserID) => {
  try {
    const targetUser = await User.findById(presentUserID);
    const accessToken = targetUser.generateAccessToken();
    const refreshToken = targetUser.generateRefreshToken();

    // now we will set the refresh token to DB
    targetUser.refreshToken = refreshToken;

    await targetUser.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new Error(
      `error inside the generate access and refresh token method: ${error.message}`
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  console.log("Registration request received:", { 
    body: req.body, 
    headers: req.headers,
    method: req.method,
    url: req.url
  });
  
  const {
    companyName,
    emailAddress,
    accountPassword,
    userState,
    contactNumber,
  } = req.body;
  
  // if any filed is absent
  if (
    [companyName, emailAddress, accountPassword, userState, contactNumber].some(
      (field) => field?.trim() === ""
    )
  ) {
    console.log("Missing required fields");
    return res.status(400).json({ message: "all fields are required" });
  }

  // check if user already exist

  const existingUser = await User.findOne({ emailAddress });

  if (existingUser)
    return res.status(400).json({ message: "user already exist" });

  // create a new user in DB
  const newUser = await User.create({
    companyName,
    emailAddress,
    accountPassword,
    userState,
    contactNumber,
  });

  // check if user is created or not

  const createdUser = await User.findById(newUser._id).select(
    "-accountPassword -refreshToken"
  );

  if (!createdUser) {
    console.log("Failed to create user");
    return res
      .status(500)
      .json({ message: "Something went wrong while registering the user" });
  }

  // Generate OTP and send verification email
  const otp = `${Math.floor(100000 + Math.random() * 900000)}`;
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  createdUser.emailVerificationOTP = otp;
  createdUser.emailVerificationExpires = otpExpiry;
  await createdUser.save({ validateBeforeSave: false });

  try {
    const port = Number(config.EMAIL_PORT) || 587;
    const useService = Boolean(config.EMAIL_HOST === undefined && config.EMAIL_PORT === undefined && config.EMAIL_USER && config.EMAIL_PASS);
    const transporter = nodemailer.createTransport(
      useService
        ? {
            service: "gmail",
            auth: { user: config.EMAIL_USER, pass: config.EMAIL_PASS },
          }
        : {
            host: config.EMAIL_HOST || "smtp.gmail.com",
            port,
            secure: port === 465,
            auth: { user: config.EMAIL_USER, pass: config.EMAIL_PASS },
          }
    );

    await transporter.verify();

    await transporter.sendMail({
      from: config.EMAIL_USER,
      to: emailAddress,
      subject: "Verify your email",
      text: `Your verification code is ${otp}. It expires in 10 minutes.`,
      html: `<p>Your verification code is <b>${otp}</b>. It expires in 10 minutes.</p>`,
    });
  } catch (mailErr) {
    console.log("Failed to send verification email:", mailErr.message);
    // Continue without failing registration; user can request resend
  }

  console.log("User registered successfully:", createdUser._id);
  return res.status(201).json({
    success: true,
    statusCode: 200,
    message: "User was registered successfully. Verification OTP sent to email.",
    data: createdUser,
  });
});

const logIn = asyncHandler(async (req, res) => {
  const { emailAddress, accountPassword } = req.body;

  // verify if email and password is received or not
  if (!emailAddress || !accountPassword)
    return res
      .status(400)
      .json({ success: false, message: "required fields are missing" });

  // verify if user is available in DB or not

  const isUserPresent = await User.findOne({ emailAddress });

  if (!isUserPresent)
    return res
      .status(404)
      .json({ success: false, message: "user doesn't exist" });

  // now check for password is correct or not
  const isPasswordValid = await isUserPresent.isPasswordCorrect(
    accountPassword
  );

  if (!isPasswordValid)
    return res
      .status(401)
      .json({ success: false, message: "email or password don't match" });

  // now if password also match then we need to generate a access token and refresh token

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    isUserPresent._id
  );

  // now we just need to send the data to user but before that we need to update the object in DB

  const userToSend = isUserPresent.toObject();
  delete userToSend.accountPassword;
  delete userToSend.refreshToken;

  return res
    .status(200)
    .cookie("accessToken", accessToken, { httpOnly: true, secure: true })
    .cookie("refreshToken", refreshToken, { httpOnly: true, secure: true })
    .json({
      success: true,
      message: "User logged in successfully",
      data: { user: userToSend },
    });
});

const logOut = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.specificUser._id,
    {
      $set: { refreshToken: null },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .clearCookie("accessToken", { httpOnly: true, secure: true })
    .clearCookie("refreshToken", { httpOnly: true, secure: true })
    .json({
      success: true,
      statusCode: 200,
      message: "User logged out successfully",
    });
});

const Regenerate_refreshToken = asyncHandler(async (req, res) => {
  const refreshToken_userEnd = req.cookies?.refreshToken;
  console.log(refreshToken_userEnd);
  if (!refreshToken_userEnd)
    return res
      .status(401)
      .json({ success: false, message: "Unauthorised request" });

  // now we need to decode the refresh token to access the payload so we can fetch the user from DB on bais of ID

  try {
    const decodedRefreshToken = jwt.verify(
      refreshToken_userEnd,
      config.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedRefreshToken._id);

    if (!user)
      return res.status(401).json({ success: false, message: "invalid user" });

    if (refreshToken_userEnd !== user.refreshToken)
      return res.status(401).json({
        success: "false",
        message: "refresh token does not match or expired",
      });

    // now if they match it means that user is verified and user will have a new access and refresh token

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id
    );

    user.refreshToken = refreshToken;
    await user.save();

    return res
      .status(200)
      .cookie("accessToken", accessToken, { httpOnly: true, secure: true })
      .cookie("refreshToken", refreshToken, { httpOnly: true, secure: true })
      .json({ success: true, message: "token regenerated succcessfully" });
  } catch (error) {
    throw new Error(
      `error while generating the refresh token ${error.message}`
    );
  }
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { emailAddress, otp } = req.body;
  if (!emailAddress || !otp)
    return res.status(400).json({ success: false, message: "Email and OTP are required" });

  const user = await User.findOne({ emailAddress });
  if (!user) return res.status(404).json({ success: false, message: "User not found" });
  if (user.isEmailVerified) {
    const userObj = user.toObject();
    delete userObj.accountPassword;
    delete userObj.refreshToken;
    return res.status(200).json({ success: true, message: "Email already verified", data: { user: userObj } });
  }

  const now = new Date();
  if (!user.emailVerificationOTP || !user.emailVerificationExpires || user.emailVerificationExpires < now) {
    return res.status(400).json({ success: false, message: "OTP expired or not set" });
  }
  if (user.emailVerificationOTP !== otp) {
    return res.status(400).json({ success: false, message: "Invalid OTP" });
  }

  user.isEmailVerified = true;
  user.emailVerificationOTP = null;
  user.emailVerificationExpires = null;
  await user.save({ validateBeforeSave: false });

  const userObj = user.toObject();
  delete userObj.accountPassword;
  delete userObj.refreshToken;
  return res.status(200).json({ success: true, message: "Email verified successfully", data: { user: userObj } });
});

const resendVerificationOTP = asyncHandler(async (req, res) => {
  const { emailAddress } = req.body;
  if (!emailAddress) return res.status(400).json({ success: false, message: "Email is required" });
  const user = await User.findOne({ emailAddress });
  if (!user) return res.status(404).json({ success: false, message: "User not found" });
  if (user.isEmailVerified) return res.status(200).json({ success: true, message: "Email already verified" });

  const otp = `${Math.floor(100000 + Math.random() * 900000)}`;
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
  user.emailVerificationOTP = otp;
  user.emailVerificationExpires = otpExpiry;
  await user.save({ validateBeforeSave: false });

  try {
    const port = Number(config.EMAIL_PORT) || 587;
    const useService = Boolean(config.EMAIL_HOST === undefined && config.EMAIL_PORT === undefined && config.EMAIL_USER && config.EMAIL_PASS);
    const transporter = nodemailer.createTransport(
      useService
        ? { service: "gmail", auth: { user: config.EMAIL_USER, pass: config.EMAIL_PASS } }
        : { host: config.EMAIL_HOST || "smtp.gmail.com", port, secure: port === 465, auth: { user: config.EMAIL_USER, pass: config.EMAIL_PASS } }
    );
    await transporter.verify();
    await transporter.sendMail({
      from: config.EMAIL_USER,
      to: emailAddress,
      subject: "Your new verification code",
      text: `Your verification code is ${otp}. It expires in 10 minutes.`,
      html: `<p>Your verification code is <b>${otp}</b>. It expires in 10 minutes.</p>`,
    });
  } catch (mailErr) {
    return res.status(500).json({ success: false, message: "Failed to send OTP" });
  }

  return res.status(200).json({ success: true, message: "OTP sent" });
});

export { registerUser, logIn, logOut, Regenerate_refreshToken, verifyEmail, resendVerificationOTP };

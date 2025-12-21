import { User } from "../models/user.model.js";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const forgetPasswordController = async (req, res) => {
  try {
    const { emailAddress } = req.body;

    const user = await User.findOne({ emailAddress });
    if (!user) {
      return res.status(404).json({ Status: "User not existed" });
    }

    const token = jwt.sign({ id: user._id }, "jwt_secret_key", {
      expiresIn: "1d",
    });

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // use SSL
      auth: {
        user: emailAddress,
        pass: process.env.PASS,
      },
    });

    const mailOptions = {
      from: "youremail@gmail.com",
      to: emailAddress, // <- send to user's actual email
      subject: "Reset Password Link",
      text: `http://localhost:5173/reset-password/${user._id}/${token}`,
    };

    await transporter.sendMail(mailOptions);
    return res.json({ Status: "Success" });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return res.status(500).json({ Status: "Error", message: error.message });
  }
};

const resetPasswordController = async (req, res) => {
  const { id, token } = req.params;
  const { accountPassword } = req.body;

  try {
    // Verify the token
    const decoded = jwt.verify(token, "jwt_secret_key");

    // Hash the new password
    const hashedPassword = await bcrypt.hash(accountPassword, 10);

    // Update the user password in the database
    await User.findByIdAndUpdate(
      { _id: id },
      { accountPassword: hashedPassword }
    );

    return res.send({ Status: "Success" });
  } catch (err) {
    console.error("Reset Password Error:", err.message);
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(400).json({ Status: "Error with token" });
    }
    return res.status(500).json({ Status: "Error", message: err.message });
  }
};

export { forgetPasswordController, resetPasswordController };

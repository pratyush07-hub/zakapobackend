
import { Router } from "express";

import { verifyJWTToken } from "../middlewares/auth.middleware.js";
import { registerUser , logIn , logOut , Regenerate_refreshToken, verifyEmail, resendVerificationOTP } from "../controllers/user.controller.js";

 
const router = Router();

router.route("/register").post(registerUser);

router.route("/login").post(logIn);

router.route("/logout").post( verifyJWTToken, logOut);

router.route("/regenerate-token").post(Regenerate_refreshToken);

// email verification
router.route("/verify-email").post(verifyEmail);
router.route("/resend-otp").post(resendVerificationOTP);

export default router;
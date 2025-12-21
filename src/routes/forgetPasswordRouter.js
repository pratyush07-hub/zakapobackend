import express from "express";
import {
  forgetPasswordController,
  resetPasswordController,
} from "../controllers/forgetPasswordController.js";

const forgetPasswordRouter = express.Router();

forgetPasswordRouter.post("/forgot-password", forgetPasswordController);
forgetPasswordRouter.post(
  "/reset-password/:id/:token",
  resetPasswordController
);

export default forgetPasswordRouter;

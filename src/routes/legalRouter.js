import express from "express";
import { createOrUpdateLegalDetails, getLegalDetails } from "../controllers/legal.controller.js";
import { verifyJWTToken } from "../middlewares/auth.middleware.js";

const legalRouter = express.Router();

// Create or update legal details (authentication optional)
legalRouter.post("/", createOrUpdateLegalDetails);

// Get legal details (requires authentication)
legalRouter.get("/", verifyJWTToken, getLegalDetails);

export default legalRouter;

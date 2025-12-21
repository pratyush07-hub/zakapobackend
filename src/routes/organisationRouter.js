import express from "express";
import { createOrUpdateOrganisation, getOrganisationDetails } from "../controllers/organisation.controller.js";
import { verifyJWTToken } from "../middlewares/auth.middleware.js";

const organisationRouter = express.Router();

// Create or update organisation details (authentication optional)
organisationRouter.post("/", createOrUpdateOrganisation);

// Get organisation details (requires authentication)
organisationRouter.get("/", verifyJWTToken, getOrganisationDetails);

export default organisationRouter;

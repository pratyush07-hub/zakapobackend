import express from "express";
import { getStats } from "../controllers/getStatsController.js";

const statsRouter = express.Router();

statsRouter.get("/", getStats);

export default statsRouter;

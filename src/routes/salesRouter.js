import express from "express";
import { getSales } from "../controllers/getSalesController.js";

const salesRouter = express.Router();

salesRouter.get("/", getSales);

export default salesRouter;

import express from "express";
import { getStocks } from "../controllers/getStocksController.js";

const stockRouter = express.Router();

stockRouter.get("/", getStocks);

export default stockRouter;

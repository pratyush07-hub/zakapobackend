import express from "express";
import { addCombo, getCombos, updateCombo, deleteCombo } from "../controllers/combo.controller.js";

const comboRouter = express.Router();

comboRouter.post("/", addCombo);
comboRouter.get("/", getCombos);
comboRouter.put("/:comboId", updateCombo);
comboRouter.delete("/:comboId", deleteCombo);

export default comboRouter;



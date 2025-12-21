import express from "express";
import {
  addItem,
  getItems,
  updateItems,
  deleteItem,
} from "../controllers/addItemController.js";

const addItemRouter = express.Router();

addItemRouter.post("/", addItem);      // POST /api/add-item → saves item in your DB
addItemRouter.get("/", getItems);      // GET /api/get-item → fetches items from DB
addItemRouter.put("/", updateItems);   // PUT /api/update-item → update items
addItemRouter.delete("/:itemId", deleteItem);   // DELETE /api/delete-item/:id → delete items

export default addItemRouter;

import express from "express";
import {
  getBigCommerceProducts,
  updateBigCommerceProduct,
  deleteBigCommerceProduct,
} from "../controllers/bigcommerce.controller.js";

const bigcommerceRouter = express.Router();

bigcommerceRouter.get("/", getBigCommerceProducts);           // GET /api/bigcommerce → fetches products from BigCommerce
bigcommerceRouter.put("/", updateBigCommerceProduct);         // PUT /api/bigcommerce → update BigCommerce product
bigcommerceRouter.delete("/:bigcommerceId", deleteBigCommerceProduct);   // DELETE /api/bigcommerce/:id → delete BigCommerce product

export default bigcommerceRouter;

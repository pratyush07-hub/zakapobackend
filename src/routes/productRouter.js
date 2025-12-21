import express from "express";
import { getProducts } from "../controllers/productController.js";
import { getShopifyProducts, updateShopifyProduct, deleteShopifyProduct } from "../controllers/shopify.controller.js";

const productRouter = express.Router();

productRouter.get("/", getProducts);          // GET /api/all-products → DB products
productRouter.get("/shopify", getShopifyProducts);  // GET /api/all-products/shopify → Shopify products
productRouter.put("/shopify", updateShopifyProduct);  // PUT /api/all-products/shopify → Update Shopify product
productRouter.delete("/shopify/:shopifyId", deleteShopifyProduct);  // DELETE /api/all-products/shopify/:id → Delete Shopify product

export default productRouter;

import mongoose, { Schema } from "mongoose";

const productSchema = new Schema({
  name: String,
  productId: String,
  category: String,
  duration: String,
});

const Product = mongoose.model("selling", productSchema);
export default Product;

import mongoose, { Schema } from "mongoose";

const salesSchema = new Schema({
  month: String,
  amazon: Number,
  flipkart: Number,
  shopify: Number,
});

const Sales = mongoose.model("Sale", salesSchema);

export default Sales;

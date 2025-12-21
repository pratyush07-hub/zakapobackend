import mongoose, { Schema } from "mongoose";

const StockSchema = new Schema({
  product: String,
  productId: String,
  availableStock: Number,
  forecast: String,
  status: String,
});

const Stock = mongoose.model("stock", StockSchema);
export default Stock;

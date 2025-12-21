import mongoose from "mongoose";

const ComboItemSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: "Item" },
    productID: { type: String },
    name: { type: String },
    price: { type: Number, default: 0 },
    quantity: { type: Number, default: 1 },
  },
  { _id: false }
);

const ComboSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    sku: { type: String },
    description: { type: String },
    price: { type: Number, required: true },
    weight: { type: Number, default: 0 },
    image: { type: String },
    items: { type: [ComboItemSchema], default: [] },
  },
  { timestamps: true }
);

const Combo = mongoose.model("Combo", ComboSchema);
export default Combo;




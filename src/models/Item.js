
import mongoose, { Schema } from "mongoose";

const itemSchema = new Schema(
  {
    productID: {
      type: String,
      required: true,
    },
    variantName: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    category: String,
    channel: String,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NewUser",
      required: true,
    },
    // Store platform product identifiers for cross-platform sync
    shopifyProductId: {
      type: String,
    },
    bigcommerceProductId: {
      type: String,
    },
  },
  { timestamps: true }
);

const Item = mongoose.model("Item", itemSchema);

export default Item;
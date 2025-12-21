import Product from "../models/Product.js";

const getProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json({ products });
  } catch (error) {
    console.error("Error in getItems:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};
export { getProducts };

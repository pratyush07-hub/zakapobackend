import Stock from "../models/Stock.js";

const getStocks = async (req, res) => {
  try {
    const all_stocks = await Stock.find();
    res.status(200).json({ all_stocks });
  } catch (error) {
    console.error("Error in getItems:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};
export { getStocks };

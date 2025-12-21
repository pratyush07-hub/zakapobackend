import Sales from "../models/Sales.js";

const getSales = async (req, res) => {
  try {
    const SalesReport = await Sales.find();
    res.status(200).json({ SalesReport });
  } catch (error) {
    console.error("Error in Sales Report:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};
export { getSales };

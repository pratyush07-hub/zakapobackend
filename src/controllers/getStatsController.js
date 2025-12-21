import Stats from "../models/Stats.js";

const getStats = async (req, res) => {
  try {
    const Sales_Stats = await Stats.find();
    res.status(200).json({ Sales_Stats });
  } catch (error) {
    console.error("Error in Sales Stats:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};
export { getStats };

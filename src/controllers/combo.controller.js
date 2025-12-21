import mongoose from "mongoose";
import Combo from "../models/Combo.js";

export const addCombo = async (req, res) => {
  try {
    const { userId, name, sku, description, price, weight, image, items } = req.body;

    if (!userId || !name || !price) {
      return res.status(400).json({ error: "userId, name and price are required" });
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid userId" });
    }

    const combo = new Combo({
      userId: new mongoose.Types.ObjectId(userId),
      name,
      sku,
      description,
      price,
      weight,
      image,
      items: Array.isArray(items) ? items : [],
    });

    const saved = await combo.save();
    return res.status(201).json({ message: "Combo created", data: saved });
  } catch (e) {
    console.error("addCombo error:", e.message);
    return res.status(500).json({ error: "Server error" });
  }
};

export const getCombos = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "User ID is required." });
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid userId" });
    }

    const combos = await Combo.find({ userId: new mongoose.Types.ObjectId(userId) });
    return res.status(200).json({ combos });
  } catch (e) {
    console.error("getCombos error:", e.message);
    return res.status(500).json({ error: "Server error" });
  }
};

export const updateCombo = async (req, res) => {
  try {
    const { comboId } = req.params;
    const { name, sku, description, price, weight } = req.body;
    
    if (!comboId) return res.status(400).json({ error: "Combo ID required" });
    if (!mongoose.Types.ObjectId.isValid(comboId)) {
      return res.status(400).json({ error: "Invalid comboId" });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (sku !== undefined) updateData.sku = sku;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (weight !== undefined) updateData.weight = weight;

    const updated = await Combo.findByIdAndUpdate(
      new mongoose.Types.ObjectId(comboId),
      updateData,
      { new: true }
    );
    
    if (!updated) return res.status(404).json({ error: "Combo not found" });
    return res.status(200).json({ message: "Combo updated", data: updated });
  } catch (e) {
    console.error("updateCombo error:", e.message);
    return res.status(500).json({ error: "Server error" });
  }
};

export const deleteCombo = async (req, res) => {
  try {
    const { comboId } = req.params;
    if (!comboId) return res.status(400).json({ error: "Combo ID required" });
    if (!mongoose.Types.ObjectId.isValid(comboId)) {
      return res.status(400).json({ error: "Invalid comboId" });
    }
    const deleted = await Combo.findByIdAndDelete(new mongoose.Types.ObjectId(comboId));
    if (!deleted) return res.status(404).json({ error: "Combo not found" });
    return res.status(200).json({ message: "Combo deleted", data: deleted });
  } catch (e) {
    console.error("deleteCombo error:", e.message);
    return res.status(500).json({ error: "Server error" });
  }
};



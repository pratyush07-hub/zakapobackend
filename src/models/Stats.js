import mongoose, { Schema } from "mongoose";

const statsSchema = new Schema({
  timeframe: String,
  shipments: Number,
  returned: Number,
  damaged: Number,
  profit: Number,
});

const Stats = mongoose.model("Stat", statsSchema);

export default Stats;

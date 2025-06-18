// models/Tracker.js
const mongoose = require("mongoose");

const trackerSchema = new mongoose.Schema({
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  driverName: { type: String, required: true },
  lat: Number,
  lng: Number,
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Tracker", trackerSchema);

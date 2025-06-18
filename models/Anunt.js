const mongoose = require("mongoose");

const anuntSchema = new mongoose.Schema({
  produs: { type: String, required: true },
  pret_lei_tona: { type: Number, required: true },
  moneda: { type: String, enum: ['lei', 'euro'], default: 'lei' },
  judet: { type: String, required: true },
  localitate: { type: String, required: true },
  descriere: { type: String, maxlength: 500 },
  lat: { type: Number },
  lng: { type: Number },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // ca să știu cine a postat
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Anunt", anuntSchema);

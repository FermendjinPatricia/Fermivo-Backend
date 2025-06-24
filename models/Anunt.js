const mongoose = require("mongoose"); 
const anuntSchema = new mongoose.Schema({
  produs: { type: String, required: true }, // Numele produsului
  pret_lei_tona: { type: Number, required: true }, // Prețul în lei pe tonă
  moneda: { type: String, enum: ['lei', 'euro'], default: 'lei' }, // Moneda, implicit lei
  judet: { type: String, required: true }, // Județul în care se află anunțul
  localitate: { type: String, required: true }, // Localitatea în care se află anunțul
  descriere: { type: String, maxlength: 500 }, // Descrierea anunțului, maxim 500 de caractere
  lat: { type: Number }, // Latitudinea pentru localizare
  lng: { type: Number }, // Longitudinea pentru localizare
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // ID-ul utilizatorului care a creat anunțul
  createdAt: { type: Date, default: Date.now } // Data la care a fost creat anunțul
});

module.exports = mongoose.model("Anunt", anuntSchema);

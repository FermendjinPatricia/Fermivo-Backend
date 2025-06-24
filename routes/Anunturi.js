const express = require("express");
const router = express.Router();
require("dotenv").config();
const Anunt = require("../models/Anunt");
const verifyToken = require("../middlewares/verifyToken");

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

async function getCoordsFromLocalitate(localitate) {
  const token = process.env.MAPBOX_ACCESS_TOKEN;
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(localitate)}.json?access_token=${token}&limit=1&country=RO`;

  const response = await fetch(url);
  const data = await response.json();

  if (!data.features || data.features.length === 0) {
    return { lat: null, lng: null };
  }

  return {
    lng: data.features[0].center[0],
    lat: data.features[0].center[1]
  };
}


// ✅ POST /api/anunturi - Adaugă anunț
router.post("/", verifyToken, async (req, res) => { // Router pentru adăugarea anunțului
  try { 
    const { produs, pret_lei_tona,moneda, judet, descriere, localitate } = req.body; // Obține datele din corpul cererii
    if (!produs || !pret_lei_tona || !judet || !descriere || !localitate) { // Verifică dacă toate câmpurile sunt completate
      return res.status(400).json({ message: "Toate câmpurile sunt obligatorii." }); // Răspunde cu eroare dacă lipsesc câmpuri
    }
    const coords = await getCoordsFromLocalitate(localitate); // Obține coordonatele pentru localitate
    const anuntNou = new Anunt({ // Creează un nou anunț
      produs,
      pret_lei_tona,
      moneda: moneda || "lei", // default la lei
      judet,
      descriere,
      localitate,
      lat: coords.lat,
      lng: coords.lng,
      userId: req.user._id,
    });
    const savedAd = await anuntNou.save(); // Salvează anunțul în baza de date
    res.status(201).json({ success: true, ad: savedAd }); // Răspunde cu anunțul salvat
  } catch (error) { // Gestionează erorile
    console.error("❌ Eroare la salvarea anunțului:", error); 
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// ✅ GET /api/anunturi - Listare toate anunturi
router.get("/", async (req, res) => {
  try {
    const anunturi = await Anunt.find()
      .populate("userId", "nume prenume isPremium")
      .sort({ "userId.isPremium": -1, createdAt: -1 }); // întâi premium, apoi cele mai noi

    res.status(200).json({ success: true, anunturi });
  } catch (error) {
    console.error("Eroare la get anunturi:", error);
    res.status(500).json({ success: false, message: "Eroare server." });
  }
});

// ✅ GET /api/anunturi/user/:id - Anunturi unui user
router.get("/user/:id", async (req, res) => {
  try {
    const anunturi = await Anunt.find({ userId: req.params.id }).sort({ createdAt: -1 });
    res.json({ success: true, anunturi });
  } catch (error) {
    res.status(500).json({ success: false, error: "Eroare la fetch user anunțuri" });
  }
});

// ✅ GET /api/anunturi/:id - Un singur anunt (pentru editare/detalii)
router.get("/:id", async (req, res) => {
  try {
    const anunt = await Anunt.findById(req.params.id).populate("userId", "nume prenume telefon reviews rating numReviews");
    if (!anunt) return res.status(404).json({ message: "Anunțul nu a fost găsit." });
    res.json({ success: true, anunt });
  } catch (error) {
    res.status(500).json({ success: false, message: "Eroare server" });
  }
});

// ✅ PUT /api/anunturi/:id - Update anunt
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { produs, pret_lei_tona, moneda, judet, descriere, localitate} = req.body;

    const updatedAnunt = await Anunt.findByIdAndUpdate(
      req.params.id,
      { produs, pret_lei_tona, moneda, judet, descriere, localitate },
      { new: true }
    );

    if (!updatedAnunt) {
      return res.status(404).json({ success: false, message: "Anunțul nu a fost găsit." });
    }

    res.json({ success: true, anunt: updatedAnunt });
  } catch (error) {
    res.status(500).json({ success: false, message: "Eroare la actualizare." });
  }
});

// Șterge toate anunțurile
router.delete("/delete-all", async (req, res) => {
  try {
    await Anunt.deleteMany({});
    res.status(200).json({ message: "Toate anunțurile au fost șterse cu succes." });
  } catch (error) {
    res.status(500).json({ message: "Eroare la ștergerea anunțurilor.", error });
  }
});

// ✅ DELETE /api/anunturi/:id - Șterge anunț
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const anunt = await Anunt.findById(req.params.id);

    if (!anunt) {
      return res.status(404).json({ success: false, message: "Anunțul nu a fost găsit." });
    }

    // opțional: verificare userId
    if (anunt.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Nu ai dreptul să ștergi acest anunț." });
    }

    await anunt.deleteOne();
    res.json({ success: true, message: "Anunț șters cu succes" });
  } catch (error) {
    console.error("❌ Eroare la ștergere anunț:", error);
    res.status(500).json({ success: false, message: "Eroare server la ștergere" });
  }
});



module.exports = router;


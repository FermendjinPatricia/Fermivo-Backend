const express = require("express");
const router = express.Router();
const Tracker = require("../models/Tracker");
const { v4: uuidv4 } = require("uuid");
const verifyToken = require("../middlewares/verifyToken");

// Generează link unic pentru șofer
router.post("/generate-link", verifyToken, async (req, res) => {
  try {
    const { driverName } = req.body;
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minute

    const tracker = new Tracker({
      buyerId: req.user._id,
      driverName,
      token,
      expiresAt
    });

    await tracker.save();

    res.json({ success: true, link: `${process.env.FRONTEND_URL}/track/${token}` });
  } catch (err) {
    res.status(500).json({ success: false, message: "Eroare server", error: err });
  }
});

// Șoferul trimite locația
router.post("/:token/location", async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const token = req.params.token;

    const tracker = await Tracker.findOne({ token });
    if (!tracker || tracker.expiresAt < new Date()) {
      return res.status(400).json({ message: "Link expirat sau invalid." });
    }

    tracker.lat = lat;
    tracker.lng = lng;
    await tracker.save();

    res.json({ success: true, message: "Locație actualizată" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Eroare server", error: err });
  }
});

// Cumpărătorul vede toate camioanele active
router.get("/buyer/:id", async (req, res) => {
  try {
    const trackers = await Tracker.find({
      buyerId: req.params.id,
      expiresAt: { $gt: new Date() }
    });

    res.json({ success: true, trackers });
  } catch (err) {
    res.status(500).json({ success: false, message: "Eroare server", error: err });
  }
});

// DELETE /api/trackers/:id
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const tracker = await Tracker.findById(req.params.id);
    if (!tracker) return res.status(404).json({ message: "Tracker inexistent" });

    // opțional: verifici dacă buyerId === req.user._id
    if (tracker.buyerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Nu ai voie să ștergi acest tracker." });
    }

    await tracker.deleteOne();
    res.json({ success: true, message: "Urmărirea a fost dezactivată." });
  } catch (e) {
    res.status(500).json({ success: false, error: e });
  }
});


module.exports = router;

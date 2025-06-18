// routes/BlockedUsers.js
const express = require("express");
const router = express.Router();
const BlockedUser = require("../models/BlockedUser");

// Blochează un utilizator
router.post("/", async (req, res) => {
  const { blockerId, blockedId } = req.body;

  if (!blockerId || !blockedId) {
    return res.status(400).json({ success: false, message: "Date lipsă pentru blocare." });
  }

  try {
    const entry = new BlockedUser({ blocker: blockerId, blocked: blockedId });
    await entry.save();
    res.json({ success: true, message: "Utilizator blocat cu succes." });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: "Utilizatorul este deja blocat." });
    }
    res.status(500).json({ success: false, message: "Eroare la blocare.", error: err });
  }
});

// (Opțional) Deblochează un utilizator
router.delete("/", async (req, res) => {
  const { blockerId, blockedId } = req.body;

  try {
    await BlockedUser.findOneAndDelete({ blocker: blockerId, blocked: blockedId });
    res.json({ success: true, message: "Utilizator deblocat cu succes." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Eroare la deblocare.", error: err });
  }
});

// Verifică dacă un utilizator este blocat de altul
router.get("/:blockerId/:blockedId", async (req, res) => {
  try {
    const { blockerId, blockedId } = req.params;
    const exists = await BlockedUser.findOne({ blocker: blockerId, blocked: blockedId });
    res.json({ blocked: !!exists });
  } catch (err) {
    res.status(500).json({ success: false, message: "Eroare la verificare blocare", error: err });
  }
});


module.exports = router;

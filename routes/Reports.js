// routes/Reports.js
const express = require("express");
const router = express.Router();
const Report = require("../models/Report");

router.post("/", async (req, res) => {
  const { reporterId, reportedId, reason, description } = req.body;

  if (!reporterId || !reportedId || !reason) {
    return res.status(400).json({ success: false, message: "Câmpuri obligatorii lipsă." });
  }

  try {
    const report = new Report({ reporterId, reportedId, reason, description });
    await report.save();

    res.json({ success: true, message: "Raportul a fost trimis cu succes." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Eroare la salvarea raportului", error: err });
  }
});

// routes/Reports.js
router.get("/", async (req, res) => {
  try {
    const reports = await Report.find()
      .populate("reporterId", "email")
      .populate("reportedId", "email")
      .sort({ createdAt: -1 });

    res.json({ success: true, reports });
  } catch (err) {
    res.status(500).json({ success: false, message: "Eroare la fetch rapoarte", error: err });
  }
});


module.exports = router;

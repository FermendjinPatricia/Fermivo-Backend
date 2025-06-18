const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const BlockedUser = require("../models/BlockedUser");


// ✅ POST - începe o conversație nouă (sau returnează una existentă)
router.post("/start", async (req, res) => {
  const { senderId, receiverId } = req.body;

  try {
    let conv = await Conversation.findOne({
      participants: { $all: [senderId, receiverId], $size: 2 }
    });

    if (!conv) {
      conv = new Conversation({ participants: [senderId, receiverId] });
      await conv.save();
    }

    conv = await conv.populate("participants", "nume prenume profilePicture");
    res.json({ success: true, conversatie: conv });
  } catch (err) {
    res.status(500).json({ success: false, message: "Eroare la creare conversatie", error: err });
  }
});


// ✅ GET - conversațiile unui user (important să fie înainte de /:id)
router.get("/user/:userId", async (req, res) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.params.userId);
    const conversatii = await Conversation.find({
      participants: userObjectId
    })
      .populate("participants", "nume prenume profilePicture")
      .sort({ updatedAt: -1 });

    res.json({ success: true, conversatii });
  } catch (err) {
    res.status(500).json({ success: false, message: "Eroare la fetch conversatii", error: err });
  }
});


// ✅ GET - detalii despre o conversație (pt. afișare nume în header)
router.get("/id/:id", async (req, res) => {
  try {
    const conv = await Conversation.findById(req.params.id)
      .populate("participants", "nume prenume profilePicture");

    if (!conv) {
      return res.status(404).json({ success: false, message: "Conversație inexistentă" });
    }

    res.json({ success: true, conversatie: conv });
  } catch (err) {
    res.status(500).json({ success: false, message: "Eroare la fetch conversație", error: err });
  }
});


// ✅ GET - toate mesajele dintr-o conversație
router.get("/:id/messages", async (req, res) => {
  try {
    const messages = await Message.find({ conversationId: req.params.id }).sort({ createdAt: 1 });
    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: "Eroare la fetch mesaje", error: err });
  }
});


// ✅ POST - adaugă mesaj într-o conversație
router.post("/:id/messages", async (req, res) => {
  const { senderId, text } = req.body;

  try {
    const conv = await Conversation.findById(req.params.id);
    if (!conv) {
      return res.status(404).json({ success: false, message: "Conversație inexistentă." });
    }

    const receiverId = conv.participants.find(p => p.toString() !== senderId);

    // Verifică dacă utilizatorul destinatar l-a blocat pe cel care trimite
    const isBlocked = await BlockedUser.findOne({ blocker: receiverId, blocked: senderId });
    if (isBlocked) {
      return res.status(403).json({ success: false, message: "Nu poți trimite mesaje acestui utilizator." });
    }

    const msg = new Message({
      conversationId: req.params.id,
      senderId,
      text,
    });

    await msg.save();

    await Conversation.findByIdAndUpdate(req.params.id, {
      lastMessage: {
        text,
        senderId,
        createdAt: new Date(),
      },
    });

    res.json({ success: true, message: msg });
  } catch (err) {
    res.status(500).json({ success: false, message: "Eroare la trimitere mesaj", error: err });
  }
});



// ❌ DELETE - șterge o conversație și toate mesajele asociate
router.delete("/:id", async (req, res) => {
  const conversationId = req.params.id;

  try {
    // Șterge toate mesajele asociate conversației
    await Message.deleteMany({ conversationId });

    // Șterge conversația propriu-zisă
    await Conversation.findByIdAndDelete(conversationId);

    res.json({ success: true, message: "Conversația a fost ștearsă cu succes." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Eroare la ștergerea conversației", error: err });
  }
});


module.exports = router;



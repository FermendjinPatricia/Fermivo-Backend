const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path"); // <- lipsa rezolvată aici
const multer = require("multer");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const User = require("../models/User");

// Register
router.post("/register", async (req, res) => {
  try {
    const {
      nume,
      prenume,
      denumireaFirmei,
      codUnicDeIdentificare,
      adresa,
      telefon,
      email,
      parola,
      role,
    } = req.body;

    if (role === "admin") {
      return res.status(403).json({
        message: "Crearea conturilor de admin este permisă doar intern.",
      });
    }

    const utilizatorExistent = await User.findOne({ email });
    if (utilizatorExistent) {
      return res.status(400).json({ message: "Email-ul este deja utilizat." });
    }

    const hashedPassword = await bcrypt.hash(parola, 10);

    const utilizatorNou = new User({
      nume,
      prenume,
      denumireaFirmei,
      codUnicDeIdentificare,
      adresa,
      telefon,
      email,
      parola: hashedPassword,
      role,
    });

    await utilizatorNou.save();
    res.status(201).json({
      message: "Utilizator creat cu succes!",
      utilizator: utilizatorNou,
    });
  } catch (error) {
    console.error("❌ Eroare la crearea utilizatorului:", error);
    res
      .status(500)
      .json({ message: "Eroare la crearea utilizatorului.", error });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, parola } = req.body;

    const utilizator = await User.findOne({ email });
    if (!utilizator) {
      return res.status(400).json({ message: "Email sau parolă incorectă." });
    }

    const parolaCorecta = await bcrypt.compare(parola, utilizator.parola);
    if (!parolaCorecta) {
      return res.status(400).json({ message: "Email sau parolă incorectă." });
    }

    const token = jwt.sign(
      {
        _id: utilizator._id,
        email: utilizator.email,
        role: utilizator.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      message: "Autentificare reușită!",
      token,
      utilizator: {
        _id: utilizator._id,
        email: utilizator.email,
        role: utilizator.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Eroare la autentificare.", error });
  }
});

// Upload poza profil
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `profile-${req.user._id}${ext}`);
  },
});
const upload = multer({ storage });

router.post(
  "/upload-profile",
  verifyToken,
  upload.single("profilePicture"),
  async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "Utilizator inexistent" });
      }

      user.profilePicture = req.file.filename;
      await user.save();

      res.status(200).json({ success: true, filename: req.file.filename });
    } catch (err) {
      console.error("Eroare la upload:", err);
      res.status(500).json({ message: "Eroare upload imagine.", error: err });
    }
  }
);

// Get user by id
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Utilizator inexistent" });
    }
    res.json({ success: true, user });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Eroare server", error: err });
  }
});

// Update user profile
router.put("/:id", async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "Utilizator inexistent" });
    }

    res.json({ success: true, user: updatedUser });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Eroare server", error: err });
  }
});

router.get("/all", verifyToken, async (req, res) => {
  try {
    const users = await User.find().select("-parola");
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ message: "Eroare la fetch users", error: err });
  }
});

// Delete all users
router.delete("/delete-all", async (req, res) => {
  try {
    await User.deleteMany({});
    res
      .status(200)
      .json({ message: "Toți utilizatorii au fost șterși cu succes." });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Eroare la ștergerea utilizatorilor.", error });
  }
});

router.post("/:id/rate", verifyToken, async (req, res) => {
  try {
    const userRatedId = req.params.id;
    const raterId = req.user._id;
    const { rating } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ success: false, message: "Rating invalid" });
    }

    const user = await User.findById(userRatedId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // verificăm dacă userul deja a votat
    const existingReviewIndex = user.reviews.findIndex(
      (r) => r.userId.toString() === raterId.toString()
    );
    if (existingReviewIndex !== -1) {
      user.reviews[existingReviewIndex].rating = rating;
    } else {
      user.reviews.push({ userId: raterId, rating });
    }

    user.markModified("reviews"); // 🔧 asigură că se salvează corect

    const avg =
      user.reviews.reduce((sum, r) => sum + r.rating, 0) / user.reviews.length;

    user.rating = avg;
    user.numReviews = user.reviews.length;

    console.log("➡️ Before Save:");
    console.log("reviews:", user.reviews);
    console.log("rating:", user.rating);
    console.log("numReviews:", user.numReviews);

    await user.save();

    console.log("✅ After Save");
    console.log("reviews:", user.reviews);
    console.log("rating:", user.rating);
    console.log("numReviews:", user.numReviews);

    res.json({
      success: true,  
      average: avg.toFixed(1),
      numReviews: user.numReviews,
      userRating: rating,
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Eroare server", error: err });
  }
});

// Adaugă anunț la favorite
router.post("/favorites/:anuntId", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const anuntId = req.params.anuntId;

    if (!user.favoriteAnunturi.includes(anuntId)) {
      user.favoriteAnunturi.push(anuntId);
      await user.save();
    }

    res.status(200).json({ message: "Adăugat la favorite." });
  } catch (err) {
    res.status(500).json({ message: "Eroare la adăugare în favorite." });
  }
});

// Elimină anunț din favorite
router.delete("/favorites/:anuntId", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.favoriteAnunturi = user.favoriteAnunturi.filter(
      id => id.toString() !== req.params.anuntId
    );
    await user.save();

    res.status(200).json({ message: "Eliminat din favorite." });
  } catch (err) {
    res.status(500).json({ message: "Eroare la eliminare din favorite." });
  }
});

// Afișează toate favoritele
router.get("/favorites", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("favoriteAnunturi");
    res.status(200).json(user.favoriteAnunturi);
  } catch (err) {
    res.status(500).json({ message: "Eroare la încărcarea favoritelor." });
  }
});

module.exports = router;

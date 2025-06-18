// createAdmin.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("./models/User");

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log("✅ Conectat la MongoDB.");

    const email = "admin@fermivo.ro";
    const parola = "admin123"; // 🔒 schimbă parola ulterior

    const exista = await User.findOne({ email });
    if (exista) {
      console.log("⚠️ Adminul există deja. Oprire.");
      return process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(parola, 10);

    const admin = new User({
      nume: "Admin",
      prenume: "Fermivo",
      email,
      parola: hashedPassword,
      role: "admin",
      denumireaFirmei: "Fermivo SRL",
      codUnicDeIdentificare: "ROADMIN",
      adresa: "Sediu central",
      telefon: "0123456789"
    });

    await admin.save();
    console.log("✅ Cont admin creat cu succes.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Eroare la creare admin:", err);
    process.exit(1);
  }
};

run();

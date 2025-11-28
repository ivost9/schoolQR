require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const FORTUNES = require("./fortunes");
const app = express();

app.set("trust proxy", true);
app.use(cors());
app.use(bodyParser.json());

const MONGO_URI = process.env.MONGO_URI;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

if (!MONGO_URI) {
  console.error("❌ ГРЕШКА: Липсва MONGO_URI!");
} else {
  mongoose.connect(MONGO_URI).then(() => console.log("✅ MongoDB Connected"));
}

// --- СХЕМА НА БАЗАТА ---
const VisitSchema = new mongoose.Schema(
  {
    deviceId: String,
    date: String,
    fortune: String,
    deviceInfo: String,
    ipAddress: String,
  },
  { timestamps: true }
);

VisitSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

// Използваме същата колекция, данните ще се допълнят
const Visit = mongoose.model("Koleda_NEW_2025", VisitSchema);

// --- ДЕТЕКТИВСКА ФУНКЦИЯ ЗА МОДЕЛИ ---
const detectExactModel = (ua, screen) => {
  if (!screen) return "Неизвестен екран";
  const { width, height, pixelRatio } = screen;

  // 1. АКО Е IPHONE (Проверка по резолюция)
  if (ua.includes("iPhone")) {
    // iPhone 14 Pro Max / 15 Pro Max / 15 Plus
    if ((width === 430 && height === 932) || (width === 932 && height === 430))
      return " iPhone 14/15 Pro Max";

    // iPhone 14 Pro / 15 Pro
    if ((width === 393 && height === 852) || (width === 852 && height === 393))
      return " iPhone 14/15 Pro";

    // iPhone 12 / 13 / 14 / 13 Pro / 12 Pro (Еднакви екрани)
    if ((width === 390 && height === 844) || (width === 844 && height === 390))
      return " iPhone 12/13/14";

    // iPhone 12 Pro Max / 13 Pro Max / 14 Plus
    if ((width === 428 && height === 926) || (width === 926 && height === 428))
      return " iPhone 12/13/14 Max";

    // iPhone 11 Pro / X / XS
    if (width === 375 && height === 812) return " iPhone X/XS/11 Pro";

    // iPhone 11 / XR
    if (width === 414 && height === 896) return " iPhone 11/XR";

    // Стари модели (SE / 8 / 7)
    if (width === 375 && height === 667) return " iPhone SE/8/7";

    return `iPhone`;
  }

  // 2. АКО Е ANDROID (Тук гледаме User Agent-а, защото те си казват модела)
  if (ua.includes("Android")) {
    // Опитваме се да хванем модела след "Android X;"
    // Пример: "... Android 13; SM-S918B Build/..." -> S23 Ultra
    const match = ua.match(/Android\s[0-9.]+;\s([^;]+)\sBuild/);
    if (match && match[1]) {
      return `🤖 ${match[1].trim()}`;
    }
    return "🤖 Android (Unknown Model)";
  }

  // 3. КОМПЮТРИ
  if (ua.includes("Windows")) return "💻 Windows PC";
  if (ua.includes("Macintosh")) return "💻 Mac";

  return "❓ Неизвестно";
};

app.get("/", (req, res) => res.send("Server OK"));

// --- ADMIN ---
app.get("/api/admin-stats", async (req, res) => {
  const { secret } = req.query;
  if (secret !== ADMIN_SECRET)
    return res.status(403).json({ error: "Access Denied" });
  try {
    const visits = await Visit.find().sort({ createdAt: -1 });
    res.json({ count: visits.length, visits });
  } catch (err) {
    res.status(500).json({ error: "Error" });
  }
});

// --- USER ---
app.post("/api/get-fortune", async (req, res) => {
  const { deviceId, screenData } = req.body; // Получаваме и screenData
  if (!deviceId) return res.status(400).json({ error: "Missing ID" });

  const todayStr = new Date().toDateString();
  const userAgent = req.headers["user-agent"] || "";
  const userIp =
    req.ip || req.headers["x-forwarded-for"] || req.connection.remoteAddress;

  // ИЗПОЛЗВАМЕ НОВАТА ЛОГИКА
  const modelName = detectExactModel(userAgent, screenData);

  try {
    const visitToday = await Visit.findOne({ deviceId, date: todayStr });

    if (visitToday) {
      return res.json({
        allowed: true,
        message: visitToday.fortune,
        isRevisit: true,
      });
    }

    const randomFortune =
      FORTUNES.length > 0
        ? FORTUNES[Math.floor(Math.random() * FORTUNES.length)]
        : "Весела Коледа!";

    await Visit.create({
      deviceId,
      date: todayStr,
      fortune: randomFortune,
      deviceInfo: modelName, // Тук вече ще пише "iPhone 14 Pro"
      ipAddress: userIp,
    });

    console.log(`✨ Нов: ${modelName}`);

    return res.json({
      allowed: true,
      message: randomFortune,
      isRevisit: false,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

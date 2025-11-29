require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const cron = require("node-cron"); // <--- 1. НОВ ПАКЕТ
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

// Тук махнах стария TTL (expireAfterSeconds), защото вече ще трием ръчно всяка нощ.
// Оставяме само индекса за бързина.
VisitSchema.index({ date: 1, ipAddress: 1, deviceInfo: 1 });

const Visit = mongoose.model("Koleda", VisitSchema);

// --- ⏰ АВТОМАТИЧНО ИЗЧИСТВАНЕ В 00:00 ---
// '0 0 * * *' означава: Минута 0, Час 0 (Полунощ), Всеки ден
cron.schedule(
  "0 0 * * *",
  async () => {
    console.log("🕛 НАСТЪПИ НОВ ДЕН! Започвам изчистване на базата...");

    try {
      const result = await Visit.deleteMany({}); // Изтрива ВСИЧКИ записи
      console.log(
        `✅ УСПЕХ: Базата е изчистена. Изтрити записи: ${result.deletedCount}`
      );
    } catch (err) {
      console.error("❌ ГРЕШКА при изчистване на базата:", err);
    }
  },
  {
    scheduled: true,
    timezone: "Europe/Sofia", // Важно! За да е 00:00 в България, а не по Гринуич
  }
);

// --- ДЕТЕКТИВСКА ФУНКЦИЯ ЗА МОДЕЛИ ---
const detectExactModel = (ua, screen) => {
  if (!screen) return "Неизвестен екран";
  const { width, height } = screen;

  // IPHONE
  if (ua.includes("iPhone")) {
    if ((width === 430 && height === 932) || (width === 932 && height === 430))
      return "iPhone 14/15/16 Pro Max";
    if ((width === 393 && height === 852) || (width === 852 && height === 393))
      return "iPhone 14/15/16 Pro";
    if ((width === 390 && height === 844) || (width === 844 && height === 390))
      return "iPhone 12/13/14";
    if ((width === 428 && height === 926) || (width === 926 && height === 428))
      return "iPhone 12/13/14 Max";
    if (width === 375 && height === 812) return "iPhone X/XS/11 Pro";
    if (width === 414 && height === 896) return "iPhone 11/XR";
    if (width === 375 && height === 667) return "iPhone SE/8/7";
    return `iPhone`;
  }
  // ANDROID
  if (ua.includes("Android")) {
    const match = ua.match(/Android\s[0-9.]+;\s([^;]+)\sBuild/);
    if (match && match[1]) return `🤖 ${match[1].trim()}`;
    return "🤖 Android";
  }
  // PC
  if (ua.includes("Windows")) return "💻 Windows PC";
  if (ua.includes("Macintosh")) return "💻 Mac";

  return "❓ Неизвестно";
};

// --- ФУНКЦИЯ ЗА БЪЛГАРСКО ВРЕМЕ ---
const getBgDateString = () => {
  return new Date().toLocaleDateString("bg-BG", {
    timeZone: "Europe/Sofia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
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
  const { deviceId, screenData } = req.body;
  const todayStr = getBgDateString();

  const userAgent = req.headers["user-agent"] || "";
  const userIp =
    req.ip || req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  const modelName = detectExactModel(userAgent, screenData);

  try {
    // 🛑 УМНА ПРОВЕРКА (ID или IP+Model)
    const visitToday = await Visit.findOne({
      date: todayStr,
      $or: [
        { deviceId: deviceId },
        { ipAddress: userIp, deviceInfo: modelName },
      ],
    });

    if (visitToday) {
      console.log(`♻️ REVISIT: ${modelName} (IP: ${userIp})`);
      return res.json({
        allowed: true,
        message: visitToday.fortune,
        isRevisit: true,
      });
    }

    // --- НОВО ВЛИЗАНЕ ---
    const randomFortune =
      FORTUNES.length > 0
        ? FORTUNES[Math.floor(Math.random() * FORTUNES.length)]
        : "Весела Коледа!";

    await Visit.create({
      deviceId: deviceId || "unknown",
      date: todayStr,
      fortune: randomFortune,
      deviceInfo: modelName,
      ipAddress: userIp,
    });

    console.log(`✨ NEW VISIT: ${modelName} (IP: ${userIp})`);

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

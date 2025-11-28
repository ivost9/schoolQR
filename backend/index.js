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
    date: String, // Датата (напр. "29.11.2025")
    fortune: String, // Какво му се е паднало
    deviceInfo: String, // Какъв телефон е (iPhone/Samsung)
    ipAddress: String,
  },
  { timestamps: true } // <--- ТОВА АВТОМАТИЧНО ЗАПИСВА ЧАСА НА ПЪРВОТО ВЛИЗАНЕ
);

// Изтриваме старите записи след 48 часа (за да не се пълни базата с история от минали дни)
VisitSchema.index({ createdAt: 1 }, { expireAfterSeconds: 172800 });

const Visit = mongoose.model("Koleda_Final_Smart", VisitSchema);

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
  if (!deviceId) return res.status(400).json({ error: "Missing ID" });

  // 1. Взимаме днешната БГ дата
  const todayStr = getBgDateString();

  try {
    // 🛑 СПИРАЧКАТА ЗА ДУБЛИРАНЕ 🛑
    // Проверяваме: Има ли запис за този телефон + тази дата?
    const visitToday = await Visit.findOne({
      deviceId: deviceId,
      date: todayStr,
    });

    // АКО ВЕЧЕ ИМА ЗАПИС (влиза 2-ри, 3-ти път днес):
    if (visitToday) {
      console.log(`♻️ Връщаме стар запис, без да пишем в базата.`);
      return res.json({
        allowed: true,
        message: visitToday.fortune,
        isRevisit: true,
      });
      // ТУК ФУНКЦИЯТА СПИРА (return).
      // Кодът надолу (Visit.create) НЕ се изпълнява.
    }

    // --- ОТТУК НАДОЛУ СЕ ИЗПЪЛНЯВА САМО ПРИ ПЪРВО ВЛИЗАНЕ ЗА ДЕНЯ ---

    const randomFortune =
      FORTUNES.length > 0
        ? FORTUNES[Math.floor(Math.random() * FORTUNES.length)]
        : "Весела Коледа!";

    const userAgent = req.headers["user-agent"] || "";
    const userIp =
      req.ip || req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const modelName = detectExactModel(userAgent, screenData);

    // ✅ СЪЗДАВАМЕ ЗАПИС (САМО СЕГА)
    await Visit.create({
      deviceId,
      date: todayStr,
      fortune: randomFortune,
      deviceInfo: modelName,
      ipAddress: userIp,
    });
    // Часът се записва автоматично в полето createdAt

    console.log(`✨ Първо влизане за деня: ${modelName}`);

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

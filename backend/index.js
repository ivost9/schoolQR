require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const FORTUNES = require("./fortunes");
const app = express();

// Полезно за Render/Heroku, за да разчита правилно заявките
app.set("trust proxy", true);
app.use(cors());
app.use(bodyParser.json());

const MONGO_URI = process.env.MONGO_URI;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

// --- 1. ВРЪЗКА С БАЗАТА ---
if (!MONGO_URI) {
  console.error("❌ ГРЕШКА: Липсва MONGO_URI в .env файла!");
} else {
  mongoose
    .connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch((err) => console.error("❌ MongoDB Connection Error:", err));
}

// --- 2. СХЕМА (Опростена) ---
const VisitSchema = new mongoose.Schema(
  {
    deviceId: String, // Уникално ID от localStorage на телефона
    date: String, // Датата във формат "DD.MM.YYYY" (БГ време)
    fortune: String, // Какво му се е паднало
  },
  { timestamps: true } // Пази createdAt и updatedAt автоматично
);

// Създаваме индекс за по-бързо търсене
VisitSchema.index({ deviceId: 1, date: 1 });

const Visit = mongoose.model("Visit", VisitSchema);

// --- 3. ПОМОЩНА ФУНКЦИЯ ЗА БГ ВРЕМЕ ---
// Важно: Сървърите обикновено са в UTC. Тази функция гарантира,
// че "Днес" означава днес в България, а не в Лондон.
const getBgDateString = () => {
  return new Date().toLocaleDateString("bg-BG", {
    timeZone: "Europe/Sofia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

app.get("/", (req, res) => {
  res.send("School Christmas Server is Running! 🎄");
});

// --- 4. ADMIN API (Връща пълна история) ---
app.get("/api/admin-stats", async (req, res) => {
  const { secret } = req.query;

  if (secret !== ADMIN_SECRET) {
    return res.status(403).json({ error: "Достъп отказан! Грешен ключ." });
  }

  try {
    // Връщаме всички записи, сортирани по време (най-новите първи)
    const visits = await Visit.find().sort({ createdAt: -1 });
    res.json({ count: visits.length, visits });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Грешка при четене на базата." });
  }
});

// --- 5. USER API (Основната логика) ---
app.post("/api/get-fortune", async (req, res) => {
  const { deviceId } = req.body;

  // Защита: Ако фронтендът не прати ID
  if (!deviceId) {
    return res.status(400).json({ error: "Липсва Device ID!" });
  }

  // Взимаме днешната дата според България
  const todayStr = getBgDateString();

  try {
    // А. Търсим дали този телефон (deviceId) вече има запис за тази дата (todayStr)
    const visitToday = await Visit.findOne({ deviceId, date: todayStr });

    // Б. Ако намерим запис -> Връщаме старото късметче
    if (visitToday) {
      console.log(
        `♻️ REVISIT: ID ${deviceId.slice(0, 5)}... днес вече е теглил.`
      );
      return res.json({
        allowed: true,
        message: visitToday.fortune,
        isRevisit: true,
      });
    }

    // В. Ако НЕ намерим запис -> Теглим ново и го записваме
    const randomFortune =
      FORTUNES.length > 0
        ? FORTUNES[Math.floor(Math.random() * FORTUNES.length)]
        : "Весела Коледа! (Списъкът с късмети е празен)";

    await Visit.create({
      deviceId,
      date: todayStr,
      fortune: randomFortune,
    });

    console.log(
      `✨ NEW VISIT: ID ${deviceId.slice(0, 5)}... изтегли ново късметче.`
    );

    return res.json({
      allowed: true,
      message: randomFortune,
      isRevisit: false,
    });
  } catch (err) {
    console.error("❌ SERVER ERROR:", err);
    res.status(500).json({ error: "Възникна грешка в сървъра." });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

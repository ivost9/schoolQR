import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import "./App.css";

// Импорт на снимките
import treeImg from "./tree.png";
import snowmanImg from "./snowman.png";
import santaSleighImg from "./santa_sleigh.png";

const API_URL = "https://schoolqr.onrender.com"; // Твоят линк

// --- СИГУРНА ФУНКЦИЯ ЗА ID ---
// Това гарантира, че дори localStorage да е забранен, сайтът няма да забие
const getOrCreateDeviceId = () => {
  try {
    let id = localStorage.getItem("device_uuid");
    if (!id) {
      id = uuidv4();
      localStorage.setItem("device_uuid", id);
      console.log("🆕 Генерирано ново ID:", id);
    } else {
      console.log("💾 Намерено старо ID:", id);
    }
    return id;
  } catch (error) {
    console.error("⚠️ Грешка с localStorage (може би е Private Mode):", error);
    return uuidv4(); // Връщаме временно ID, ако паметта е забранена
  }
};

const Snowflakes = () => {
  const flakes = Array.from({ length: 50 });
  return (
    <div className="snowflakes" aria-hidden="true">
      {flakes.map((_, i) => {
        const style = {
          left: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 5}s`,
          animationDuration: `${Math.random() * 5 + 10}s`,
          opacity: Math.random(),
          fontSize: `${Math.random() * 10 + 10}px`,
        };
        return (
          <div key={i} className="snowflake" style={style}>
            ❅
          </div>
        );
      })}
    </div>
  );
};

const getDaysUntilChristmas = () => {
  const today = new Date();
  const year = today.getFullYear();
  const christmas = new Date(year, 11, 25);
  if (today.getMonth() === 11 && today.getDate() > 25) {
    christmas.setFullYear(year + 1);
  }
  const diffTime = christmas - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

function App() {
  const [fortune, setFortune] = useState(null);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line no-unused-vars
  const [isRevisit, setIsRevisit] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({ count: 0, todaysVisits: [] });

  const daysUntilChristmas = getDaysUntilChristmas();
  const urlParams = new URLSearchParams(window.location.search);
  const secretKey = urlParams.get("secret");
  const [expandedRow, setExpandedRow] = useState(null);

  // Използваме useRef, за да сме сигурни, че заявката се праща само веднъж при зареждане
  const requestSent = useRef(false);

  const toggleRow = (id) => {
    if (expandedRow === id) {
      setExpandedRow(null);
    } else {
      setExpandedRow(id);
    }
  };

  const getRealDate = (visit) => {
    if (visit.updatedAt) return new Date(visit.updatedAt);
    if (visit.createdAt) return new Date(visit.createdAt);
    return new Date(parseInt(visit._id.substring(0, 8), 16) * 1000);
  };

  const isToday = (someDate) => {
    const today = new Date();
    return (
      someDate.getDate() === today.getDate() &&
      someDate.getMonth() === today.getMonth() &&
      someDate.getFullYear() === today.getFullYear()
    );
  };

  useEffect(() => {
    // 1. АДМИН ЛОГИКА
    if (secretKey) {
      setIsAdmin(true);
      axios
        .get(`${API_URL}/api/admin-stats?secret=${secretKey}`)
        .then((res) => {
          const allVisits = res.data.visits;
          const filteredToday = allVisits.filter((visit) =>
            isToday(getRealDate(visit))
          );
          const sortedVisits = filteredToday.sort(
            (a, b) => getRealDate(b) - getRealDate(a)
          );
          setStats({ count: sortedVisits.length, todaysVisits: sortedVisits });
          setLoading(false);
        })
        .catch(() => {
          setFortune("Хо-хо-хо! Грешен ключ!");
          setIsAdmin(false);
          setLoading(false);
        });
      return;
    }

    // 2. ПОТРЕБИТЕЛСКА ЛОГИКА (Само ако не е пращана заявка)
    if (requestSent.current) return;
    requestSent.current = true;

    const deviceId = getOrCreateDeviceId(); // Взимаме ID-то по сигурния начин

    const fetchFortune = async () => {
      try {
        const screenData = {
          width: window.screen.width, // Физическата ширина на екрана
          height: window.screen.height, // Физическата височина
          pixelRatio: window.devicePixelRatio || 1,
        };

        console.log(
          `📡 Изпращам заявка: ID=${deviceId}, Screen=${screenData.width}x${screenData.height}`
        );

        const response = await axios.post(`${API_URL}/api/get-fortune`, {
          deviceId: deviceId,
          screenData: screenData,
        });

        setFortune(response.data.message);
        setIsRevisit(response.data.isRevisit);

        if (response.data.isRevisit) {
          console.log("♻️ Сървърът каза: Това е повторно посещение.");
        } else {
          console.log("✨ Сървърът каза: Това е нов късмет.");
        }
      } catch (err) {
        console.error("❌ Грешка при връзка:", err);
        setFortune("Джуджетата изпуснаха сървъра. Опитайте пак.");
      } finally {
        setLoading(false);
      }
    };

    fetchFortune();
  }, [secretKey]);

  return (
    <div className="app-container">
      <Snowflakes />

      {/* --- КОМПЛЕКТ 1: ЗА КОМПЮТЪР (Извън картата) --- */}
      <div className="desktop-decor tree-corner">
        <img src={treeImg} alt="Елха" />
      </div>
      <div className="desktop-decor snowman-corner">
        <img src={snowmanImg} alt="Снежен човек" />
      </div>

      {!isAdmin && (
        <div className="central-santa-container bounce-animation">
          <img src={santaSleighImg} alt="Дядо Коледа" />
        </div>
      )}

      <div className={`glass-card ${isAdmin ? "admin-mode" : "holiday-mode"}`}>
        {/* --- КОМПЛЕКТ 2: ЗА ТЕЛЕФОН (Вътре в картата) --- */}
        <div className="mobile-decor tree-mobile">
          <img src={treeImg} alt="Елха" />
        </div>
        <div className="mobile-decor snowman-mobile">
          <img src={snowmanImg} alt="Снежен човек" />
        </div>

        {isAdmin ? (
          <div className="admin-container">
            <div className="admin-header">
              <h3>📜 ДНЕВНИЯТ СПИСЪК</h3>
              <div className="stats-summary">
                <span>
                  Днес: <strong>{stats.count}</strong> деца
                </span>
              </div>
            </div>

            <div className="logs-wrapper">
              {loading ? (
                <div className="spinner"></div>
              ) : (
                <div className="logs-list">
                  {stats.todaysVisits.length === 0 ? (
                    <p style={{ padding: "20px", opacity: 0.7, color: "#fff" }}>
                      Няма посетители днес.
                    </p>
                  ) : (
                    stats.todaysVisits.map((visit) => {
                      const dateObj = getRealDate(visit);
                      const timeStr = dateObj.toLocaleTimeString("bg-BG", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      const isExpanded = expandedRow === visit._id;

                      return (
                        <div
                          key={visit._id}
                          className={`list-item ${
                            isExpanded ? "expanded" : ""
                          }`}
                          onClick={() => toggleRow(visit._id)}
                        >
                          <div className="item-header">
                            <span className="col-time">{timeStr}</span>
                            <span className="col-device">
                              {visit.deviceInfo || "❓"}
                            </span>
                            <span className="arrow-icon">▼</span>
                          </div>

                          <div className="item-details">
                            <div className="detail-row">
                              <strong>Късметче:</strong>
                              <p className="full-fortune">
                                {visit.fortune || "Неизвестно"}
                              </p>
                            </div>
                            <div
                              className="detail-row"
                              style={{
                                fontSize: "0.8rem",
                                color: "#999",
                                marginTop: "10px",
                              }}
                            >
                              ID:{" "}
                              {visit.deviceId
                                ? visit.deviceId.substring(0, 8)
                                : "N/A"}
                              ...
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => (window.location.href = "/")}
              className="exit-btn"
            >
              Затвори
            </button>
          </div>
        ) : (
          <>
            <div className="header">
              <h2>Твоят Зимен Късмет</h2>
            </div>
            <div className="content">
              {loading ? (
                <div className="loader-container">
                  <div className="spinner"></div>
                  <p>Търсим късмет...</p>
                </div>
              ) : (
                <div className="message-container fade-in">
                  <p className="fortune-text">{fortune}</p>
                </div>
              )}
            </div>

            <div className="footer desktop-counter">
              <p className="footer-countdown">
                {daysUntilChristmas === 0
                  ? "✨ ВЕСЕЛА КОЛЕДА! ✨"
                  : `Остават ${daysUntilChristmas} дни до Коледа`}
              </p>
            </div>
          </>
        )}
      </div>

      {!isAdmin && (
        <div className="mobile-counter">
          <p className="footer-countdown">
            {daysUntilChristmas === 0
              ? "✨ ВЕСЕЛА КОЛЕДА! ✨"
              : `Остават ${daysUntilChristmas} дни до Коледа`}
          </p>
        </div>
      )}
    </div>
  );
}

export default App;

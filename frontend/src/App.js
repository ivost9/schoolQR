import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import "./App.css";

// Импорт на снимките
import treeImg from "./tree.png";
import snowmanImg from "./snowman.png";
import santaSleighImg from "./santa_sleigh.png";

// --- 1. АВТОМАТИЧЕН ИЗБОР НА СЪРВЪР ---
// Ако тестваш локално ползва localhost, ако го качиш - ползва Render
const API_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://schoolqr.onrender.com";

// --- 2. СИГУРНА ФУНКЦИЯ ЗА ID ---
const getOrCreateDeviceId = () => {
  try {
    let id = localStorage.getItem("device_uuid");
    if (!id) {
      id = uuidv4();
      localStorage.setItem("device_uuid", id);
    }
    return id;
  } catch (error) {
    console.error("⚠️ Грешка с localStorage:", error);
    return uuidv4();
  }
};

// --- ПОМОЩНИ ФУНКЦИИ ЗА ДИЗАЙНА ---
const Snowflakes = () => {
  const flakes = Array.from({ length: 50 });
  return (
    <div className="snowflakes" aria-hidden="true">
      {flakes.map((_, i) => (
        <div
          key={i}
          className="snowflake"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${Math.random() * 5 + 10}s`,
            opacity: Math.random(),
            fontSize: `${Math.random() * 10 + 10}px`,
          }}
        >
          ❅
        </div>
      ))}
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

// Функция за извличане на реална дата от записа
const getRealDate = (visit) => {
  if (visit.updatedAt) return new Date(visit.updatedAt);
  if (visit.createdAt) return new Date(visit.createdAt);
  // Резервен вариант: вадим от ID-то
  return new Date(parseInt(visit._id.substring(0, 8), 16) * 1000);
};

// Функция за проверка дали датата е ДНЕС (БГ време)
const isDateToday = (dateObj) => {
  const todayStr = new Date().toLocaleDateString("bg-BG", {
    timeZone: "Europe/Sofia",
  });
  const checkStr = dateObj.toLocaleDateString("bg-BG", {
    timeZone: "Europe/Sofia",
  });
  return todayStr === checkStr;
};

function App() {
  // Състояния (State)
  const [fortune, setFortune] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({ count: 0, todaysVisits: [] });
  const [expandedRow, setExpandedRow] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [isRevisit, setIsRevisit] = useState(false);

  const daysUntilChristmas = getDaysUntilChristmas();
  const urlParams = new URLSearchParams(window.location.search);
  const secretKey = urlParams.get("secret");
  const requestSent = useRef(false);

  // Функция за отваряне на ред (за админ панела)
  const toggleRow = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  useEffect(() => {
    // --- ЛОГИКА ЗА АДМИН ---
    if (secretKey) {
      setIsAdmin(true);
      axios
        .get(`${API_URL}/api/admin-stats?secret=${secretKey}`)
        .then((res) => {
          const allVisits = res.data.visits;

          // 1. Филтрираме само днешните (за да пасва на дизайна "Дневен списък")
          const filteredToday = allVisits.filter((visit) =>
            isDateToday(getRealDate(visit))
          );

          // 2. Сортираме най-новите най-отгоре
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

    // --- ЛОГИКА ЗА ПОТРЕБИТЕЛ ---
    if (requestSent.current) return;
    requestSent.current = true;

    const deviceId = getOrCreateDeviceId();

    const fetchFortune = async () => {
      try {
        // Изпращаме само ID, без screenData
        const response = await axios.post(`${API_URL}/api/get-fortune`, {
          deviceId: deviceId,
        });

        setFortune(response.data.message);
        setIsRevisit(response.data.isRevisit);
      } catch (err) {
        console.error("Error:", err);
        setFortune("Джуджетата изпуснаха сървъра. Опитайте пак.");
      } finally {
        setLoading(false);
      }
    };

    fetchFortune();
  }, [secretKey]);

  // --- ДИЗАЙН (Запазен на 100%) ---
  return (
    <div className="app-container">
      <Snowflakes />

      {/* PC Декорация */}
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
        {/* Мобилна декорация */}
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
                              ID:{" "}
                              {visit.deviceId
                                ? visit.deviceId.substring(0, 5)
                                : "?"}
                              ...
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
                              Пълно ID: {visit.deviceId}
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

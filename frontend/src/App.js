import React, { useState, useEffect } from "react";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import "./App.css";

// Импорт на снимките
import treeImg from "./tree.png";
import snowmanImg from "./snowman.png";
import santaSleighImg from "./santa_sleigh.png";

const API_URL = "https://schoolqr.onrender.com"; // Увери се, че това е твоят линк

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
  const [isRevisit, setIsRevisit] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({ count: 0, todaysVisits: [] });

  const daysUntilChristmas = getDaysUntilChristmas();
  const urlParams = new URLSearchParams(window.location.search);
  const secretKey = urlParams.get("secret");
  const [expandedRow, setExpandedRow] = useState(null);

  // Функция за превключвате
  const toggleRow = (id) => {
    if (expandedRow === id) {
      setExpandedRow(null); // Затваряме, ако е кликнато същото
    } else {
      setExpandedRow(id); // Отваряме новото
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

    let deviceId = localStorage.getItem("device_uuid");
    if (!deviceId) {
      deviceId = uuidv4();
      localStorage.setItem("device_uuid", deviceId);
    }

    const fetchFortune = async () => {
      try {
        const screenData = {
          width: window.screen.width,
          height: window.screen.height,
          pixelRatio: window.devicePixelRatio || 1,
        };
        const response = await axios.post(`${API_URL}/api/get-fortune`, {
          deviceId: deviceId,
          screenData: screenData,
        });
        setFortune(response.data.message);
        setIsRevisit(response.data.isRevisit);
      } catch (err) {
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

      {/* --- КОМПЛЕКТ 1: ЗА КОМПЮТЪР (Извън картата, по ъглите на екрана) --- */}
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
        {/* --- КОМПЛЕКТ 2: ЗА ТЕЛЕФОН (Вътре в картата, залепени за нея) --- */}
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

                      // Проверяваме дали този ред е отворен
                      const isExpanded = expandedRow === visit._id;

                      return (
                        <div
                          key={visit._id}
                          className={`list-item ${
                            isExpanded ? "expanded" : ""
                          }`}
                          onClick={() => toggleRow(visit._id)}
                        >
                          {/* ГОРНА ЧАСТ (Винаги видима) */}
                          <div className="item-header">
                            <span className="col-time">{timeStr}</span>
                            <span className="col-device">
                              {visit.deviceInfo || "❓"}
                            </span>
                            <span className="arrow-icon">▼</span>
                          </div>

                          {/* ДОЛНА ЧАСТ (Скрита, показва се при клик) */}
                          <div className="item-details">
                            <div className="detail-row">
                              <strong>Късметче:</strong>
                              <p className="full-fortune">
                                {visit.fortune || "Неизвестно"}
                              </p>
                            </div>
                            {/* Можеш да добавиш и IP адрес тук ако искаш */}
                            <div
                              className="detail-row"
                              style={{
                                fontSize: "0.8rem",
                                color: "#999",
                                marginTop: "10px",
                              }}
                            >
                              ID: {visit.deviceId.substring(0, 8)}...
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
            {/* --- ВАРИАНТ 1: ЗА ДЕСКТОП (ВЪТРЕ) --- */}
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
      {/* --- ВАРИАНТ 2: ЗА МОБИЛНИ (ОТВЪН) --- */}
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

import React, { useState, useEffect } from "react";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import "./App.css";

// Импорт на снимките
import treeImg from "./tree.png";
import snowmanImg from "./snowman.png";
import santaSleighImg from "./santa_sleigh.png";
// Подобрен компонент за много сняг
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

// --- НОВА ФУНКЦИЯ ЗА БРОЯЧА ---
const getDaysUntilChristmas = () => {
  const today = new Date();
  const year = today.getFullYear();
  const christmas = new Date(year, 11, 25);

  if (today.getMonth() === 11 && today.getDate() > 25) {
    christmas.setFullYear(year + 1);
  }

  const diffTime = christmas - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};

function App() {
  const [fortune, setFortune] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRevisit, setIsRevisit] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Променихме 'visits' на 'todaysVisits', за да е ясно, че са само за днес
  const [stats, setStats] = useState({ count: 0, todaysVisits: [] });

  const daysUntilChristmas = getDaysUntilChristmas();

  const urlParams = new URLSearchParams(window.location.search);
  const secretKey = urlParams.get("secret");

  const API_URL =
    window.location.hostname === "localhost"
      ? "http://localhost:5000"
      : "https://schoolqr.onrender.com";

  const getRealDate = (visit) => {
    if (visit.updatedAt) return new Date(visit.updatedAt);
    if (visit.createdAt) return new Date(visit.createdAt);
    return new Date(parseInt(visit._id.substring(0, 8), 16) * 1000);
  };

  // --- ПОМОЩНА ФУНКЦИЯ: Проверка дали дата е днешната ---
  const isToday = (someDate) => {
    const today = new Date();
    return (
      someDate.getDate() === today.getDate() &&
      someDate.getMonth() === today.getMonth() &&
      someDate.getFullYear() === today.getFullYear()
    );
  };

  useEffect(() => {
    // --- АДМИН ЛОГИКА ---
    if (secretKey) {
      setIsAdmin(true);
      axios
        .get(`${API_URL}/api/admin-stats?secret=${secretKey}`)
        .then((res) => {
          const allVisits = res.data.visits;

          // 1. Филтрираме само записите от ДНЕС
          const filteredToday = allVisits.filter((visit) => {
            const date = getRealDate(visit);
            return isToday(date);
          });

          // 2. Сортираме ги (най-новите най-горе)
          const sortedVisits = filteredToday.sort((a, b) => {
            return getRealDate(b) - getRealDate(a);
          });

          setStats({ count: sortedVisits.length, todaysVisits: sortedVisits });
          setLoading(false);
        })
        .catch((err) => {
          console.error("Грешка:", err);
          setFortune("Хо-хо-хо! Грешен ключ за шейната!");
          setIsAdmin(false);
          setLoading(false);
        });
      return;
    }

    // --- ПОТРЕБИТЕЛСКА ЛОГИКА ---
    let deviceId = localStorage.getItem("device_uuid");
    if (!deviceId) {
      deviceId = uuidv4();
      localStorage.setItem("device_uuid", deviceId);
    }

    const fetchFortune = async () => {
      try {
        // --- НОВО: Взимаме размерите на екрана ---
        const screenData = {
          width: window.screen.width,
          height: window.screen.height,
          pixelRatio: window.devicePixelRatio || 1,
        };

        const response = await axios.post(`${API_URL}/api/get-fortune`, {
          deviceId: deviceId,
          screenData: screenData, // Изпращаме мерките на сървъра
        });

        setFortune(response.data.message);
        setIsRevisit(response.data.isRevisit);
      } catch (err) {
        console.error(err);
        setFortune("Джуджетата изпуснаха сървъра в преспата. Опитайте пак.");
      } finally {
        setLoading(false);
      }
    };

    fetchFortune();
  }, [secretKey, API_URL]);

  return (
    <div className="app-container">
      <Snowflakes />

      <div className="corner-decoration tree-corner">
        <img src={treeImg} alt="Коледна елха" />
      </div>
      <div className="corner-decoration snowman-corner">
        <img src={snowmanImg} alt="Снежен човек" />
      </div>

      {!isAdmin && (
        <div className="central-santa-container bounce-animation">
          <img src={santaSleighImg} alt="Дядо Коледа с шейната" />
        </div>
      )}

      <div className={`glass-card ${isAdmin ? "admin-mode" : "holiday-mode"}`}>
        {isAdmin ? (
          // --- АДМИН ПАНЕЛ (ТАБЛИЦА) ---
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
                    <p style={{ padding: "20px", opacity: 0.7 }}>
                      Още няма посетители днес...
                    </p>
                  ) : (
                    stats.todaysVisits.map((visit, index) => {
                      const dateObj = getRealDate(visit);
                      const timeStr = dateObj.toLocaleTimeString("bg-BG", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      const fortuneText = visit.fortune || "Неизвестно";
                      // Ако няма инфо, пишем въпросителна
                      const deviceText = visit.deviceInfo || "❓";

                      return (
                        <div
                          key={visit._id}
                          className="log-row fade-in"
                          style={{ animationDelay: `${index * 0.05}s` }}
                        >
                          <div className="col-time">{timeStr}</div>
                          {/* Тук показваме телефона */}
                          <div className="col-device">{deviceText}</div>
                          <div className="col-fortune">{fortuneText}</div>
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
              Затвори Списъка
            </button>
          </div>
        ) : (
          // --- ПОТРЕБИТЕЛСКИ ИЗГЛЕД ---
          <>
            <div className="header" style={{ marginTop: "20px" }}>
              <h2>
                {isRevisit ? "Твоят Зимен Късмет" : "Късметче от преспата"}
              </h2>
            </div>

            <div className="content">
              {loading ? (
                <div className="loader-container">
                  <div className="spinner"></div>
                  <p>Разравяме снега за твоя късмет...</p>
                </div>
              ) : (
                <div className="message-container fade-in">
                  <p className="fortune-text">{fortune}</p>
                </div>
              )}
            </div>

            <div className="footer">
              <p className="footer-countdown">
                {daysUntilChristmas === 0
                  ? "✨ ВЕСЕЛА КОЛЕДА! ✨"
                  : `⏳ Остават ${daysUntilChristmas} дни до Коледа`}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;

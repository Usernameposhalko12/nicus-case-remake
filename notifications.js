// ============================================
// ЦЕНТР ПОВІДОМЛЕНЬ
// ============================================
import {
  getNotifications, markAllNotificationsRead, markNotificationRead,
  deleteNotification, clearAllNotifications,
} from "./firebase.js";

// ── СТИЛІ ──────────────────────────────────
function injectNotificationStyles() {
  if (document.getElementById("notif-center-styles")) return;
  const s = document.createElement("style");
  s.id = "notif-center-styles";
  s.textContent = `
    .notif-container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px 16px 40px;
    }
    .notif-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 18px;
      gap: 10px;
    }
    .notif-title {
      font-family: 'Syne', sans-serif;
      font-size: 22px;
      font-weight: 800;
      color: var(--text);
    }
    .notif-clear-btn {
      background: var(--glass);
      border: 1.5px solid var(--glass-border);
      border-radius: var(--radius-md, 10px);
      padding: 8px 14px;
      font-size: 12px;
      font-weight: 700;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }
    .notif-clear-btn:hover {
      color: var(--accent);
      border-color: var(--accent);
    }
    .notif-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .notif-card {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: var(--glass);
      backdrop-filter: blur(16px);
      border: 1.5px solid var(--glass-border);
      border-radius: var(--radius-lg, 14px);
      padding: 14px 16px;
      box-shadow: var(--shadow-sm);
      position: relative;
      transition: all 0.2s ease;
    }
    .notif-card.unread {
      border-color: var(--teal);
      background: rgba(94,203,62,0.06);
    }
    .notif-card.unread::before {
      content: "";
      position: absolute;
      top: 16px;
      left: -1px;
      width: 4px;
      height: calc(100% - 32px);
      border-radius: 4px;
      background: var(--teal);
    }
    .notif-icon {
      font-size: 24px;
      flex-shrink: 0;
      line-height: 1;
      margin-top: 2px;
    }
    .notif-body { flex: 1; min-width: 0; }
    .notif-card-title {
      font-weight: 700;
      font-size: 14px;
      color: var(--text);
      margin-bottom: 2px;
    }
    .notif-card-msg {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.4;
      word-break: break-word;
    }
    .notif-card-time {
      font-size: 11px;
      color: var(--text-muted);
      opacity: 0.7;
      margin-top: 6px;
    }
    .notif-del-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 16px;
      cursor: pointer;
      padding: 2px 6px;
      opacity: 0.6;
      transition: opacity 0.2s ease;
      flex-shrink: 0;
    }
    .notif-del-btn:hover { opacity: 1; color: #f05060; }
    .notif-empty {
      text-align: center;
      padding: 60px 20px;
      color: var(--text-muted);
      font-size: 15px;
    }
    .notif-empty-icon { font-size: 48px; margin-bottom: 12px; }
  `;
  document.head.appendChild(s);
}

// ── ДОПОМІЖНЕ ──────────────────────────────
function formatNotifTime(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  if (isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1)   return "щойно";
  if (diffMin < 60)  return diffMin + " хв тому";
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24)    return diffH + " год тому";
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7)     return diffD + " дн тому";
  return d.toLocaleDateString("uk-UA");
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── РЕНДЕР ─────────────────────────────────
export async function renderNotificationCenter(currentUser) {
  injectNotificationStyles();

  const page = document.getElementById("page-notifications");
  if (!page || !currentUser?.uid) return;

  page.innerHTML = `<div class="notif-container"><div class="notif-empty">⏳ Завантаження...</div></div>`;

  let notifs = [];
  try {
    notifs = await getNotifications(currentUser.uid);
  } catch (e) {
    console.error("renderNotificationCenter:", e);
    page.innerHTML = `<div class="notif-container"><div class="notif-empty">❌ Не вдалось завантажити сповіщення</div></div>`;
    return;
  }

  const paint = () => {
    page.innerHTML = `
      <div class="notif-container">
        <div class="notif-header">
          <div class="notif-title">🔔 Центр повідомлень</div>
          ${notifs.length ? '<button class="notif-clear-btn" id="notif-clear-all">🗑 Очистити все</button>' : ''}
        </div>
        <div class="notif-list" id="notif-list">
          ${notifs.length ? notifs.map(n => `
            <div class="notif-card ${n.read ? '' : 'unread'}" data-id="${n.docId}">
              <div class="notif-icon">${n.icon || '🔔'}</div>
              <div class="notif-body">
                <div class="notif-card-title">${escapeHtml(n.title)}</div>
                <div class="notif-card-msg">${escapeHtml(n.message)}</div>
                <div class="notif-card-time">${formatNotifTime(n.createdAt)}</div>
              </div>
              <button class="notif-del-btn" data-del="${n.docId}" title="Видалити">✕</button>
            </div>
          `).join("") : `
            <div class="notif-empty">
              <div class="notif-empty-icon">📭</div>
              Сповіщень поки немає.<br>Тут з'являтимуться новини про покупки, друзів та інше.
            </div>
          `}
        </div>
      </div>
    `;

    const clearBtn = document.getElementById("notif-clear-all");
    if (clearBtn) {
      clearBtn.onclick = async () => {
        const ids = notifs.map(n => n.docId);
        clearBtn.disabled = true;
        try {
          await clearAllNotifications(currentUser.uid, ids);
          notifs = [];
          paint();
          if (window._showToastGlobal) window._showToastGlobal("Сповіщення очищено", "success");
        } catch (e) {
          if (window._showToastGlobal) window._showToastGlobal("❌ Не вдалось очистити", "error");
        }
      };
    }

    page.querySelectorAll(".notif-del-btn").forEach(btn => {
      btn.onclick = async (ev) => {
        ev.stopPropagation();
        const id = btn.getAttribute("data-del");
        try {
          await deleteNotification(currentUser.uid, id);
          notifs = notifs.filter(n => n.docId !== id);
          paint();
        } catch (e) {
          if (window._showToastGlobal) window._showToastGlobal("❌ Не вдалось видалити", "error");
        }
      };
    });
  };

  paint();

  // Позначаємо непрочитані як прочитані одразу після відкриття сторінки
  const unreadIds = notifs.filter(n => !n.read).map(n => n.docId);
  if (unreadIds.length) {
    notifs = notifs.map(n => ({ ...n, read: true }));
    markAllNotificationsRead(currentUser.uid, unreadIds).catch(() => {});
  }
}

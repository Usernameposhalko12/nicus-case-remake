// ── СТИЛІ ДЛЯ ХАБУ ЕКОСИСТЕМИ ──────────────
function injectHubStyles() {
  if (document.getElementById("ecosystem-hub-styles")) return;
  const s = document.createElement("style");
  s.id = "ecosystem-hub-styles";
  s.textContent = `
    .hub-container {
      max-width: 600px;
      margin: 40px auto;
      padding: 24px;
      text-align: center;
    }
    .hub-hero-title {
      font-family: 'Syne', sans-serif;
      font-size: 28px;
      font-weight: 800;
      background: linear-gradient(135deg, var(--teal), var(--accent));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 8px;
    }
    .hub-hero-sub {
      color: var(--text-muted);
      font-size: 15px;
      margin-bottom: 30px;
    }
    .hub-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    .hub-card {
      background: var(--glass);
      backdrop-filter: blur(16px);
      border: 1.5px solid var(--glass-border);
      border-radius: var(--radius-lg);
      padding: 24px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
      box-shadow: var(--shadow-sm);
      cursor: pointer;
      position: relative;
      overflow: hidden;
    }
    .hub-card.active-app:hover {
      transform: translateY(-6px) scale(1.02);
      border-color: var(--teal);
      box-shadow: var(--shadow-md), var(--shadow-teal);
      background: rgba(255,255,255,0.92);
    }
    .hub-card.disabled-app {
      opacity: 0.55;
      cursor: not-allowed;
      filter: grayscale(0.4);
    }
    .hub-card-icon {
      font-size: 42px;
    }
    .hub-card-name {
      font-family: 'Syne', sans-serif;
      font-size: 16px;
      font-weight: 700;
      color: var(--text);
    }
    .hub-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 20px;
      text-transform: uppercase;
    }
    .badge-ready { background: rgba(94,203,62,0.18); color: #3a9a20; border: 1px solid rgba(94,203,62,0.35); }
    .badge-soon  { background: rgba(240,125,40,0.15); color: var(--accent); border: 1px solid rgba(240,125,40,0.3); }
    
    @media (max-width: 480px) {
      .hub-grid { grid-template-columns: 1fr; }
    }
  `;
  document.head.appendChild(s);
}

// ── РЕНДЕР ХАБУ ЕКОСИСТЕМИ ──────────────
export function renderEcosystemHub(currentUser, onSelectApp) {
  injectHubStyles();
  const appWrapper = document.getElementById("app-wrapper");
  if (!appWrapper) return;

  appWrapper.innerHTML = `
    <div class="hub-container">
      <div class="hub-hero-title">🌍 ЕКОСИСТЕМА НІКУС</div>
      <div class="hub-hero-sub">Вітаю, ${currentUser.username || 'Гравець'}! Обери потрібний додаток:</div>
      
      <div class="hub-grid">
        <!-- Потужнометр -->
        <div class="hub-card disabled-app" onclick="window._showFeatureSoon('Потужнометр')">
          <span class="hub-card-icon">⚡</span>
          <div class="hub-card-name">Потужнометр</div>
          <span class="hub-badge badge-soon">Скоро</span>
        </div>

        <!-- НікусДія -->
        <div class="hub-card disabled-app" onclick="window._showFeatureSoon('НікусДія')">
          <span class="hub-card-icon">📱</span>
          <div class="hub-card-name">НікусДія</div>
          <span class="hub-badge badge-soon">Скоро</span>
        </div>

        <!-- НікусКейсРемейк (РОБОЧИЙ) -->
        <div class="hub-card active-app" onclick="window._launchApp('nikusCaseRemake')">
          <span class="hub-card-icon">📦</span>
          <div class="hub-card-name">НікусКейсРемейк</div>
          <span class="hub-badge badge-ready">Доступно</span>
        </div>

        <!-- НікусБанк -->
        <div class="hub-card disabled-app" onclick="window._showFeatureSoon('НікусБанк')">
          <span class="hub-card-icon">💳</span>
          <div class="hub-card-name">НікусБанк</div>
          <span class="hub-badge badge-soon">Скоро</span>
        </div>
      </div>
    </div>
  `;

  window._showFeatureSoon = (appName) => {
    if (window._showToastGlobal) {
      window._showToastGlobal(`⏳ Додаток "${appName}" на етапі підключення!`, "error");
    }
  };

  window._launchApp = (appName) => {
    if (appName === 'nikusCaseRemake') {
      onSelectApp(); // Запускає існуючий інтерфейс казино / кейсів без змін
    }
  };
}

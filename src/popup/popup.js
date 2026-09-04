import { getLocalDateKey } from "../shared.js";
import { rescanHistory } from "../rescan.js";
import { computeDomainStats } from "../analytics.js";

const TREND_DAYS = 7;
const TOP_DOMAINS = 6;
const THEME_KEY = "themePref";
const THEME_ORDER = ["auto", "light", "dark"];

const THEME_ICONS = {
  auto: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 3a9 9 0 000 18z" fill="currentColor" stroke="none"></path></svg>',
  light: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>',
  dark: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"></path></svg>',
};

const THEME_LABELS = { auto: "Auto", light: "Light", dark: "Dark" };

// ---------- theme ----------

function applyTheme(pref) {
  if (pref === "auto") {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = pref;
  }
  document.getElementById("theme-icon").innerHTML = THEME_ICONS[pref];
  document.getElementById("theme-btn").title = `Theme: ${THEME_LABELS[pref]}`;
}

async function initTheme() {
  const { [THEME_KEY]: stored } = await chrome.storage.local.get(THEME_KEY);
  applyTheme(THEME_ORDER.includes(stored) ? stored : "auto");
}

function setupThemeButton() {
  document.getElementById("theme-btn").addEventListener("click", async () => {
    const current = document.documentElement.dataset.theme || "auto";
    const next = THEME_ORDER[(THEME_ORDER.indexOf(current) + 1) % THEME_ORDER.length];
    applyTheme(next);
    await chrome.storage.local.set({ [THEME_KEY]: next });
  });
}

// ---------- rendering ----------

function formatDateLabel(dateKey, todayKey) {
  if (dateKey === todayKey) return "Today";
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateKey === getLocalDateKey(yesterday)) return "Yesterday";
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function renderTrend(days, todayKey) {
  const container = document.getElementById("trend");
  container.innerHTML = "";

  const entries = [];
  for (let i = TREND_DAYS - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = getLocalDateKey(date);
    const count = days[key] ? Object.keys(days[key].urls).length : 0;
    entries.push({ key, count, isToday: key === todayKey, weekday: date.toLocaleDateString("en-US", { weekday: "narrow" }) });
  }

  const max = Math.max(1, ...entries.map((e) => e.count));

  for (const entry of entries) {
    const col = document.createElement("div");
    col.className = "trend-col" + (entry.isToday ? " is-today" : "");

    const track = document.createElement("div");
    track.className = "trend-bar-track";
    const bar = document.createElement("div");
    bar.className = "trend-bar";
    bar.style.height = `${Math.max(6, (entry.count / max) * 100)}%`;
    bar.title = `${formatDateLabel(entry.key, todayKey)}: ${entry.count} URL${entry.count === 1 ? "" : "s"}`;
    track.appendChild(bar);

    const label = document.createElement("div");
    label.className = "trend-col-label";
    label.textContent = entry.isToday ? "•" : entry.weekday;

    col.append(track, label);
    container.appendChild(col);
  }
}

function renderDomains(urls) {
  const container = document.getElementById("domain-list");
  container.innerHTML = "";

  const stats = computeDomainStats(urls).slice(0, TOP_DOMAINS);

  if (stats.length === 0) {
    const empty = document.createElement("p");
    empty.className = "panel-empty";
    empty.textContent = "No domains yet today.";
    container.appendChild(empty);
    return;
  }

  const max = stats[0].count;

  for (const { domain, count } of stats) {
    const row = document.createElement("div");
    row.className = "domain-row";

    const name = document.createElement("span");
    name.className = "domain-name";
    name.textContent = domain;
    name.title = domain;

    const barTrack = document.createElement("div");
    barTrack.className = "domain-bar-track";
    const bar = document.createElement("div");
    bar.className = "domain-bar";
    bar.style.width = `${(count / max) * 100}%`;
    barTrack.appendChild(bar);

    const countEl = document.createElement("span");
    countEl.className = "domain-count";
    countEl.textContent = count;

    row.append(name, barTrack, countEl);
    container.appendChild(row);
  }
}

function renderTodayUrls(urls) {
  const list = document.getElementById("url-list");
  const emptyState = document.getElementById("empty-state");
  list.innerHTML = "";

  if (urls.length === 0) {
    emptyState.hidden = false;
    list.hidden = true;
    return;
  }

  emptyState.hidden = true;
  list.hidden = false;

  for (const { url } of [...urls].sort((a, b) => b.time - a.time)) {
    const li = document.createElement("li");
    li.textContent = url;
    li.title = url;
    list.appendChild(li);
  }
}

async function render() {
  const { days = {} } = await chrome.storage.local.get("days");
  const todayKey = getLocalDateKey(new Date());
  const urls = days[todayKey] ? Object.values(days[todayKey].urls) : [];

  document.getElementById("count").textContent = urls.length;
  document.getElementById("domain-count").textContent = computeDomainStats(urls).length;
  document.getElementById("date").textContent = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  renderTrend(days, todayKey);
  renderDomains(urls);
  renderTodayUrls(urls);
}

// ---------- rescan ----------

function setupRescanButton() {
  const button = document.getElementById("rescan-btn");
  const icon = document.getElementById("rescan-icon");
  const status = document.getElementById("status-bar");

  button.addEventListener("click", async () => {
    button.disabled = true;
    icon.classList.add("spinning");
    status.hidden = false;
    status.textContent = "Scanning browser history…";

    try {
      await rescanHistory();
      await render();
      status.textContent = "History synced";
    } catch (err) {
      console.error("WebMemX: rescan failed", err);
      status.textContent = "Rescan failed — see console";
    } finally {
      icon.classList.remove("spinning");
      button.disabled = false;
      setTimeout(() => {
        status.hidden = true;
      }, 1800);
    }
  });
}

initTheme();
setupThemeButton();
setupRescanButton();
render();

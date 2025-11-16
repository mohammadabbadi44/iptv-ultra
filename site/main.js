const THEME_KEY = "iptv-theme";
const fakePlaylistStats = {
  sports: { channels: 152, quality: "1080p / 720p", update: "Updated hourly" },
  movies: { channels: 96, quality: "1080p", update: "Refreshed daily" },
  arabic: { channels: 112, quality: "720p", update: "New entries weekly" },
  worldwide: { channels: 128, quality: "1080p / 720p", update: "Live feeds refreshed" },
  quality: { channels: 140, quality: "Optimized 1080p / 720p", update: "Curated daily" }
};

function getStoredTheme() {
  return localStorage.getItem(THEME_KEY);
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  updateToggleLabel(theme);
}

function updateToggleLabel(theme) {
  const button = document.querySelector("[data-theme-toggle]");
  if (!button) return;
  button.textContent = theme === "dark" ? "Switch to Light" : "Switch to Dark";
}

function initTheme() {
  const stored = getStoredTheme();
  const prefers = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  applyTheme(stored || prefers);
}

async function loadPlaylistStats() {
  const cards = document.querySelectorAll("[data-playlist-id]");
  if (!cards.length) return;
  const stats = await fetchPlaylistStats();
  cards.forEach((card) => {
    const id = card.dataset.playlistId;
    const meta = card.querySelector(".card-meta");
    const status = card.querySelector(".card-status");
    if (stats[id] && meta) {
      meta.textContent = `${stats[id].channels} Channels · ${stats[id].quality}`;
    }
    if (stats[id] && status) {
      status.textContent = stats[id].update;
    }
  });
}

function fetchPlaylistStats() {
  return new Promise((resolve) => {
    setTimeout(() => resolve(fakePlaylistStats), 320);
  });
}

function setupSmoothScroll() {
  document.querySelectorAll("a[href^='#']").forEach((link) => {
    link.addEventListener("click", (event) => {
      const id = link.getAttribute("href").substring(1);
      const target = document.getElementById(id);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth" });
      history.replaceState(null, "", `#${id}`);
    });
  });
}

function markActiveNav() {
  const current = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("nav a").forEach((link) => {
    const candidate = link.getAttribute("href").split("/").pop();
    if (!candidate) return;
    if (candidate === current || (candidate === "index.html" && current === "")) {
      link.classList.add("active");
    }
  });
}

function displayLastUpdated() {
  const el = document.getElementById("lastUpdated");
  if (!el) return;
  const modified = new Date(document.lastModified);
  const safeDate = Number.isNaN(modified.getTime()) ? new Date() : modified;
  el.textContent = `Last Updated ${safeDate.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`;
}

function attachThemeToggle() {
  const button = document.querySelector("[data-theme-toggle]");
  if (!button) return;
  button.addEventListener("click", () => {
    const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
  });
}

window.addEventListener("DOMContentLoaded", () => {
  initTheme();
  loadPlaylistStats();
  setupSmoothScroll();
  markActiveNav();
  displayLastUpdated();
  attachThemeToggle();
});

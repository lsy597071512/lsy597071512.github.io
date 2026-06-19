import { applyI18n, t } from "./shared/i18n.js";

// Only preload lightweight home-screen assets. Heavy 3D models are loaded once in game.js.
const ASSETS = [
  "home.html",
  "guide.html",
  "styles/app.css",
  "scripts/home.js",
  "scripts/guide.js",
  "scripts/shared/meta.js",
  "scripts/shared/i18n.js",
  "TEX/loading_d.png",
  "music/jiemian01.mp3"
];

applyI18n(document, "loading");

const lBar = document.getElementById("lBar");
const lPct = document.getElementById("lPct");
const subtitle = document.querySelector(".l-subtitle");
const start = performance.now();
let completed = 0;

function updateProgress() {
  const pct = ASSETS.length ? Math.min(100, Math.round((completed / ASSETS.length) * 100)) : 100;
  lBar.style.width = `${pct}%`;
  lPct.textContent = `${pct}％`;
}

function preload(url) {
  if (/\.(png|jpg|jpeg|gif|webp)$/i.test(url)) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = resolve;
      img.onerror = resolve;
      img.src = url;
    });
  }
  return fetch(url, { cache: "force-cache" }).then(() => undefined).catch(() => undefined);
}

async function boot() {
  updateProgress();
  subtitle.textContent = t("loading.preload");

  await Promise.allSettled(ASSETS.map(url => preload(url).finally(() => {
    completed += 1;
    updateProgress();
  })));

  const elapsed = performance.now() - start;
  if (elapsed < 900) {
    await new Promise(resolve => window.setTimeout(resolve, 900 - elapsed));
  }

  subtitle.textContent = t("loading.ready");
  window.setTimeout(() => {
    location.replace("home.html");
  }, 220);
}

boot();

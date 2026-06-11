const ASSETS = [
  "home.html",
  "game.html",
  "styles/app.css",
  "scripts/home.js",
  "scripts/game.js",
  "scripts/shared/meta.js",
  "TEX/01_d.png",
  "TEX/loading_d.png",
  "model/tex/skybox_basecolor_01.png",
  "model/Sphere001.fbx",
  "model/Sphere001_col.FBX",
  "model/rock_new01.FBX",
  "model/rock_new03.FBX",
  "model/boss01.fbx",
  "model/wanjia01.FBX",
  "model/ani/wanjia01_idle.FBX",
  "model/ani/wanjia01_run.fbx",
  "model/ani/wanjia01_attacked.fbx",
  "music/jiemian01.mp3",
  "music/zhandou01.mp3"
];

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
  subtitle.textContent = "正在预载菜单与战斗资源";

  await Promise.allSettled(ASSETS.map(url => preload(url).finally(() => {
    completed += 1;
    updateProgress();
  })));

  const elapsed = performance.now() - start;
  if (elapsed < 900) {
    await new Promise(resolve => window.setTimeout(resolve, 900 - elapsed));
  }

  subtitle.textContent = "任务环境就绪，正在进入主页菜单";
  window.setTimeout(() => {
    location.replace("home.html");
  }, 220);
}

boot();

export const META_KEY = "starCrystalSurvivalMeta";

export const RANKS = [
  { name: "星尘新手", score: 0, icon: "✨" },
  { name: "翠晶探索者", score: 60, icon: "💚" },
  { name: "紫星旅人", score: 140, icon: "💜" },
  { name: "赤焰先锋", score: 280, icon: "🔥" },
  { name: "深蓝骑士", score: 480, icon: "💎" },
  { name: "橙金游侠", score: 750, icon: "🟠" },
  { name: "金色传说", score: 1200, icon: "👑" },
  { name: "永恒星王", score: 2000, icon: "🏆" }
];

export const ACHIEVEMENTS = [
  { id: "firstCrystal", icon: "💎", name: "第一颗晶石", desc: "获得任意积分", check: s => s.bestScore >= 5 },
  { id: "score100", icon: "🌟", name: "翠晶突破", desc: "最高分达到60", check: s => s.bestScore >= 60 },
  { id: "score300", icon: "🚀", name: "星环冲刺", desc: "最高分达到750", check: s => s.bestScore >= 750 },
  { id: "score650", icon: "👑", name: "金色传说", desc: "最高分达到1200", check: s => s.bestScore >= 1200 },
  { id: "survive60", icon: "⏱️", name: "坚持一分钟", desc: "存活60秒", check: s => s.bestTime >= 60 },
  { id: "survive120", icon: "🛡️", name: "两分钟试炼", desc: "存活120秒", check: s => s.bestTime >= 120 },
  { id: "play5", icon: "🔥", name: "再来一局", desc: "累计游玩5局", check: s => s.gamesPlayed >= 5 },
  { id: "play15", icon: "⚡", name: "停不下来", desc: "累计游玩15局", check: s => s.gamesPlayed >= 15 },
  { id: "rankKing", icon: "🏆", name: "永恒星王", desc: "达到2000分", check: s => s.bestScore >= 2000 }
];

export const SHOP_ITEMS = [
  { id: "speed5", icon: "⚡", name: "加速果实(5秒)", desc: "开局5秒加速", price: 500, type: "speed", duration: 5 },
  { id: "invincible5", icon: "🛡️", name: "无敌果实(5秒)", desc: "开局5秒无敌", price: 1000, type: "invincible", duration: 5 },
  { id: "speed8", icon: "⚡⚡", name: "加速果实(8秒)", desc: "开局8秒加速", price: 2000, type: "speed", duration: 8 },
  { id: "invincible8", icon: "🛡️🛡️", name: "无敌果实(8秒)", desc: "开局8秒无敌", price: 2000, type: "invincible", duration: 8 },
  { id: "both5", icon: "💥", name: "无敌加速(5秒)", desc: "开局5秒无敌+加速", price: 4500, type: "both", duration: 5 },
  { id: "both8", icon: "💥💥", name: "无敌加速(8秒)", desc: "开局8秒无敌+加速", price: 7500, type: "both", duration: 8 },
  { id: "both12", icon: "🔥", name: "无敌加速(12秒)", desc: "开局12秒无敌+加速", price: 12000, type: "both", duration: 12 }
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function asFiniteNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

export function normalizeMeta(input = {}) {
  const achievements = {};
  if (input.achievements && typeof input.achievements === "object") {
    for (const achievement of ACHIEVEMENTS) {
      achievements[achievement.id] = !!input.achievements[achievement.id];
    }
  } else {
    for (const achievement of ACHIEVEMENTS) {
      achievements[achievement.id] = false;
    }
  }

  const purchasedItemId = typeof input.purchasedItemId === "string" ? input.purchasedItemId : null;
  const purchasedItemLabel = typeof input.purchasedItemLabel === "string" ? input.purchasedItemLabel : null;
  const bgmVolume = clamp(asFiniteNumber(Number(input.bgmVolume), 0.5), 0, 1);

  return {
    bestScore: Math.max(0, Math.floor(asFiniteNumber(Number(input.bestScore), 0))),
    bestTime: Math.max(0, asFiniteNumber(Number(input.bestTime), 0)),
    gamesPlayed: Math.max(0, Math.floor(asFiniteNumber(Number(input.gamesPlayed), 0))),
    achievements,
    bgmVolume,
    totalPoints: Math.max(0, Math.floor(asFiniteNumber(Number(input.totalPoints), 0))),
    purchasedItemId,
    purchasedItemLabel
  };
}

export function loadMeta() {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return normalizeMeta();
    return normalizeMeta(JSON.parse(raw));
  } catch {
    return normalizeMeta();
  }
}

export function saveMeta(meta) {
  const normalized = normalizeMeta(meta);
  localStorage.setItem(META_KEY, JSON.stringify(normalized));
  return normalized;
}

export function generateMysteryItem() {
  const rand = Math.floor(Math.random() * 3001) + 1000;
  let label;
  let desc;
  let type;
  let duration;
  if (rand <= 1500) {
    label = "小加速";
    desc = "开局6秒加速";
    type = "speed";
    duration = 6;
  } else if (rand <= 2000) {
    label = "小无敌";
    desc = "开局6秒无敌";
    type = "invincible";
    duration = 6;
  } else if (rand <= 2500) {
    label = "蓄力加速";
    desc = "先减速5秒，再加速10秒";
    type = "chargeSpeed";
    duration = 10;
  } else if (rand <= 3000) {
    label = "速度急救包";
    desc = "5秒加速+低血满血恢复";
    type = "healPack";
    duration = 5;
  } else {
    label = "啥都没有";
    desc = "无任何效果，白白花了积分";
    type = "nothing";
    duration = 0;
  }
  return { id: "mystery", icon: "❓", name: "惊喜箱", desc, price: rand, type, duration, label };
}

export function renderAchievementPanel(target, meta, options = {}) {
  const element = typeof target === "string" ? document.getElementById(target) : target;
  if (!element) return;

  const { isGameover = false, newList = [] } = options;
  const safeMeta = normalizeMeta(meta);
  element.classList.toggle("is-gameover", !!isGameover);

  let current = RANKS[0];
  let next = null;
  for (const rank of RANKS) {
    if (safeMeta.bestScore >= rank.score) current = rank;
    else {
      next = rank;
      break;
    }
  }

  const progress = next ? clamp((safeMeta.bestScore - current.score) / (next.score - current.score), 0, 1) : 1;
  const unlockedCount = ACHIEVEMENTS.filter(item => safeMeta.achievements[item.id]).length;
  const achievementsHtml = ACHIEVEMENTS.map(item => {
    const unlocked = !!safeMeta.achievements[item.id];
    return `<div class="achievement ${unlocked ? "unlocked" : "locked"}">
      <span class="achievement-state">${unlocked ? "已解锁" : "待解锁"}</span>
      <span class="icon">${unlocked ? item.icon : "🔒"}</span>
      <b>${escapeHtml(item.name)}</b><span>${escapeHtml(item.desc)}</span>
    </div>`;
  }).join("");

  const newHtml = newList.length
    ? `<div class="new-achievement">🎉 新成就解锁：${newList.map(item => `${item.icon} ${escapeHtml(item.name)}`).join("、")}</div>`
    : "";
  const progressText = next
    ? `距离下一段位「${next.icon} ${escapeHtml(next.name)}」还差 ${Math.max(0, next.score - safeMeta.bestScore)} 分`
    : "已达到最高段位，挑战更高纪录！";
  const noteText = isGameover
    ? "本局结束后已同步刷新历史最佳记录与成就进度。"
    : "成就会跨局累计保存，每次挑战都有机会解锁新的徽章。";

  element.innerHTML = `
    <div class="rank-row">
      <span class="rank-badge">${current.icon} ${escapeHtml(current.name)}</span>
      <span class="rank-stat">最高分 ${safeMeta.bestScore}</span>
      <span class="rank-stat">最长存活 ${safeMeta.bestTime.toFixed(1)}s</span>
      <span class="rank-stat">游玩 ${safeMeta.gamesPlayed} 局</span>
    </div>
    <div class="progress-shell">
      <div class="progress-meta">
        <span class="progress-pill">段位进度 ${Math.round(progress * 100)}%</span>
        <span class="progress-pill">已解锁 ${unlockedCount}/${ACHIEVEMENTS.length}</span>
      </div>
      <div class="progress-wrap"><div class="progress-bar" style="width:${progress * 100}%"></div></div>
      <p class="progress-caption">${progressText}</p>
      <p class="progress-note">${noteText}</p>
    </div>
    ${newHtml}
    <div class="achievements">${achievementsHtml}</div>
  `;
}

export const LANG_KEY = "starCrystalLanguage";

const STRINGS = {
  zh: {
    "page.title.home": "星空水晶生存战 - 主页菜单",
    "page.title.guide": "星空水晶生存战 - 玩法说明",
    "page.title.loading": "星空水晶生存战 - 任务加载",
    "page.title.game": "星空水晶生存战",
    "home.title": "星空水晶生存战",
    "home.lead": "在阿尔法星的赤色荒原上收集晶石、躲避怪物、刷新段位，冲击更高纪录。",
    "home.guide": "玩法说明",
    "home.start": "开始游戏",
    "home.shop": "星际商店",
    "home.intro": "每一局都会提升晶石价值与敌人强度，合理利用加速、回血和无敌果实才能冲上更高段位。",
    "home.stat.mode": "模式",
    "home.stat.modeVal": "生存收集",
    "home.stat.control": "操作",
    "home.stat.controlVal": "WASD / 摇杆",
    "home.stat.goal": "目标",
    "home.stat.goalVal": "刷分解锁成就",
    "shop.title": "星际商店",
    "shop.points": "累计积分",
    "shop.back": "← 返回主页",
    "shop.confirmTitle": "确认购买",
    "shop.confirmYes": "确认",
    "shop.confirmNo": "取消",
    "shop.closedToast": "商店关门了，请下次再来",
    "shop.buy": "购买",
    "shop.soldOut": "已下架",
    "shop.needPoints": "差{n}分",
    "shop.confirmMsg": "是否花费 {price} 积分购买「{name}」？\n购买后商店将关闭，效果在下局游戏生效",
    "shop.mysteryHidden": "???",
    "shop.mysteryReveal": "惊喜",
    "settings.title": "系统设置",
    "settings.language": "系统语言",
    "settings.langZh": "中文 (Chinese)",
    "settings.langEn": "English (英文)",
    "settings.close": "关闭",
    "settings.btnLabel": "设置",
    "loading.subtitle": "正在部署阿尔法星任务环境",
    "loading.preload": "正在预载菜单与战斗资源",
    "loading.ready": "任务环境就绪，正在进入主页菜单",
    "guide.title": "玩法说明",
    "guide.lead": "在阿尔法星上尽量存活并收集晶石，积分越高，挑战越强，回报也越大。",
    "guide.back": "← 返回主页",
    "guide.start": "开始游戏",
    "guide.sec.score": "积分怎么获得？",
    "guide.sec.crystal": "积分水晶",
    "guide.sec.enemy": "怪物",
    "guide.sec.fruit": "状态果实",
    "guide.score.l1": "靠近并拾取<strong>积分水晶</strong>即可获得积分，是本局得分的唯一来源。",
    "guide.score.l2": "当前积分越高，场上水晶颜色越高级，单颗分值从 <strong>+5</strong> 逐步升到 <strong>+80</strong>。",
    "guide.score.l3": "处于<strong>加速</strong>或<strong>无敌</strong>状态时，拾取水晶有额外倍率：加速 ×1.2、无敌 ×1.6、两者同时 ×2.0。",
    "guide.score.l4": "本局结束后，积分会计入<strong>最高纪录</strong>与<strong>累计积分</strong>（可在星际商店消费）。",
    "guide.crystal.text": "彩色晶石持续刷新在平台上，是主要的收集目标。积分档位提升后，水晶会变色并更值钱，同时敌人也会同步变强。",
    "guide.enemy.text": "敌人会主动追击，碰撞会扣血并击退。存活越久，数量与速度都会增加；后期还会出现紫色精英与幽灵 BOSS，威胁更大。",
    "guide.fruit.speed": "<strong>加速果实</strong>：短时间移速提升，便于脱困与刷分。",
    "guide.fruit.heal": "<strong>回血果实</strong>：恢复生命值，低血时优先拾取。",
    "guide.fruit.inv": "<strong>无敌果实</strong>：短时间免疫伤害，并可撞开敌人。",
    "hud.score": "积分",
    "hud.time": "存活",
    "hud.fps": "FPS",
    "game.warning": "警告：生命值过低！",
    "game.startToast": "您已来到阿尔法星球，请存活下去并收集更多的晶石。",
    "game.pauseTitle": "暂停 (P / ESC)",
    "game.pauseAria": "暂停游戏",
    "game.pauseHeading": "游戏暂停",
    "game.pauseNote": "返回主页不会保存本局进度，也不会计入成绩与积分。",
    "game.resume": "继续游戏",
    "game.home": "返回主页",
    "game.overTitle": "游戏结束",
    "game.finalScore": "最终得分：",
    "game.finalTime": "存活时间：",
    "game.overLead": "本次阿尔法星探索结束，继续挑战更高积分与更长生存时间。",
    "game.overLeadDebug": "本局使用了调试能力，成绩不会写入历史记录、成就与商店积分。",
    "game.restart": "重新开始",
    "game.goHome": "返回主页",
    "game.loadingSubtitle": "正在部署阿尔法星任务环境",
    "game.bootError": "任务启动失败，请刷新页面重试",
    "game.evalExplore": "探索评价",
    "game.evalExploreVal": "继续冲榜",
    "game.evalGoal": "主要目标",
    "game.evalGoalVal": "突破新纪录",
    "game.evalNext": "下一步",
    "game.evalNextVal": "再次出发",
    "game.portraitTipTitle": "游玩提示",
    "game.portraitTipBody": "建议竖屏游玩，以获得更好的视野与操作体验。",
    "game.portraitTipConfirm": "知道了",
    "ach.unlocked": "已解锁",
    "ach.locked": "待解锁",
    "ach.newUnlock": "新成就解锁：",
    "ach.progressMax": "已达到最高段位，挑战更高纪录！",
    "ach.progressNext": "距离下一段位「{icon} {name}」还差 {n} 分",
    "ach.noteHome": "成就会跨局累计保存，每次挑战都有机会解锁新的徽章。",
    "ach.noteGameover": "本局结束后已同步刷新历史最佳记录与成就进度。",
    "ach.rankProgress": "段位进度 {n}%",
    "ach.unlockedCount": "已解锁 {n}/{total}",
    "ach.bestScore": "最高分 {n}",
    "ach.bestTime": "最长存活 {n}s",
    "ach.gamesPlayed": "游玩 {n} 局",
    "status.speed": "正在加速",
    "status.invincible": "正处于无敌中",
    "status.heal": "已经加血{n}值",
    "status.invSpeed": "正在无敌加速中",
    "popup.speed": "加速!",
    "popup.inv": "无敌!",
    "popup.shield": "免伤!",
    "rank.0": "星尘新手",
    "rank.60": "翠晶探索者",
    "rank.140": "紫星旅人",
    "rank.280": "赤焰先锋",
    "rank.480": "深蓝骑士",
    "rank.750": "橙金游侠",
    "rank.1200": "金色传说",
    "rank.2000": "永恒星王",
    "ach.firstCrystal.name": "第一颗晶石",
    "ach.firstCrystal.desc": "获得任意积分",
    "ach.score100.name": "翠晶突破",
    "ach.score100.desc": "最高分达到60",
    "ach.score300.name": "星环冲刺",
    "ach.score300.desc": "最高分达到750",
    "ach.score650.name": "金色传说",
    "ach.score650.desc": "最高分达到1200",
    "ach.survive60.name": "坚持一分钟",
    "ach.survive60.desc": "存活60秒",
    "ach.survive120.name": "两分钟试炼",
    "ach.survive120.desc": "存活120秒",
    "ach.play5.name": "再来一局",
    "ach.play5.desc": "累计游玩5局",
    "ach.play15.name": "停不下来",
    "ach.play15.desc": "累计游玩15局",
    "ach.rankKing.name": "永恒星王",
    "ach.rankKing.desc": "达到2000分",
    "shop.speed5.name": "加速果实(5秒)",
    "shop.speed5.desc": "开局5秒加速",
    "shop.invincible5.name": "无敌果实(5秒)",
    "shop.invincible5.desc": "开局5秒无敌",
    "shop.speed8.name": "加速果实(8秒)",
    "shop.speed8.desc": "开局8秒加速",
    "shop.invincible8.name": "无敌果实(8秒)",
    "shop.invincible8.desc": "开局8秒无敌",
    "shop.both5.name": "无敌加速(5秒)",
    "shop.both5.desc": "开局5秒无敌+加速",
    "shop.both8.name": "无敌加速(8秒)",
    "shop.both8.desc": "开局8秒无敌+加速",
    "shop.both12.name": "无敌加速(12秒)",
    "shop.both12.desc": "开局12秒无敌+加速",
    "shop.mystery.name": "惊喜箱",
    "mystery.smallSpeed.label": "小加速",
    "mystery.smallSpeed.desc": "开局6秒加速",
    "mystery.smallInv.label": "小无敌",
    "mystery.smallInv.desc": "开局6秒无敌",
    "mystery.charge.label": "蓄力加速",
    "mystery.charge.desc": "先减速5秒，再加速10秒",
    "mystery.healPack.label": "速度急救包",
    "mystery.healPack.desc": "5秒加速+低血满血恢复",
    "mystery.nothing.label": "啥都没有",
    "mystery.nothing.desc": "无任何效果，白白花了积分",
    "crystal.lightBlue": "浅蓝色",
    "crystal.skyBlue": "天蓝色",
    "crystal.green": "绿色",
    "crystal.purple": "紫色",
    "crystal.red": "红色",
    "crystal.deepBlue": "深蓝色",
    "crystal.orange": "橙色",
    "crystal.yellow": "黄色",
    "crystal.gold": "金色",
    "crystal.starWhite": "星白色"
  },
  en: {
    "page.title.home": "Star Crystal Survival - Home",
    "page.title.guide": "Star Crystal Survival - Guide",
    "page.title.loading": "Star Crystal Survival - Loading",
    "page.title.game": "Star Crystal Survival",
    "home.title": "Star Crystal Survival",
    "home.lead": "Collect crystals, dodge monsters, and climb ranks on Alpha Star's red wasteland.",
    "home.guide": "How to Play",
    "home.start": "Start Game",
    "home.shop": "Star Shop",
    "home.intro": "Each run raises crystal value and enemy strength. Use speed, heal, and invincible fruits wisely to reach higher ranks.",
    "home.stat.mode": "Mode",
    "home.stat.modeVal": "Survival",
    "home.stat.control": "Controls",
    "home.stat.controlVal": "WASD / Joystick",
    "home.stat.goal": "Goal",
    "home.stat.goalVal": "Score & Achievements",
    "shop.title": "Star Shop",
    "shop.points": "✨ Total Points",
    "shop.back": "← Back to Home",
    "shop.confirmTitle": "Confirm Purchase",
    "shop.confirmYes": "Confirm",
    "shop.confirmNo": "Cancel",
    "shop.closedToast": "Shop is closed. Come back next time!",
    "shop.buy": "Buy",
    "shop.soldOut": "Sold Out",
    "shop.needPoints": "Need {n} pts",
    "shop.confirmMsg": "Spend {price} points on 「{name}」?\nThe shop closes after purchase. Effect applies next run.",
    "shop.mysteryHidden": "???",
    "shop.mysteryReveal": "Surprise",
    "settings.title": "Settings",
    "settings.language": "Language",
    "settings.langZh": "中文 (Chinese)",
    "settings.langEn": "English",
    "settings.close": "Close",
    "settings.btnLabel": "Settings",
    "loading.subtitle": "Deploying Alpha Star mission environment",
    "loading.preload": "Preloading menu and battle assets",
    "loading.ready": "Ready. Entering home menu…",
    "guide.title": "How to Play",
    "guide.lead": "Survive and collect crystals on Alpha Star. Higher score means tougher foes and bigger rewards.",
    "guide.back": "← Back to Home",
    "guide.start": "Start Game",
    "guide.sec.score": "How to Score?",
    "guide.sec.crystal": "Score Crystals",
    "guide.sec.enemy": "Monsters",
    "guide.sec.fruit": "Status Fruits",
    "guide.score.l1": "Collect <strong>score crystals</strong> by walking near them. They are your only score source.",
    "guide.score.l2": "Higher score upgrades crystal colors and values from <strong>+5</strong> up to <strong>+80</strong>.",
    "guide.score.l3": "<strong>Speed</strong> or <strong>invincible</strong> boosts pickup: speed ×1.2, invincible ×1.6, both ×2.0.",
    "guide.score.l4": "After each run, score adds to <strong>best record</strong> and <strong>total points</strong> (for the shop).",
    "guide.crystal.text": "Colored crystals spawn on the platform. As tiers rise, crystals worth more and enemies grow stronger.",
    "guide.enemy.text": "Enemies chase you; hits deal damage and knockback. Later, purple elites and ghost bosses appear.",
    "guide.fruit.speed": "<strong>Speed fruit</strong>: short burst of movement for escape and scoring.",
    "guide.fruit.heal": "<strong>Heal fruit</strong>: restores HP; grab when low.",
    "guide.fruit.inv": "<strong>Invincible fruit</strong>: brief immunity and can knock enemies away.",
    "hud.score": "Score",
    "hud.time": "Time",
    "hud.fps": "FPS",
    "game.warning": "Warning: Low HP!",
    "game.startToast": "Welcome to Alpha Star. Survive and collect more crystals.",
    "game.pauseTitle": "Pause (P / ESC)",
    "game.pauseAria": "Pause game",
    "game.pauseHeading": "Paused",
    "game.pauseNote": "Returning home won't save this run or count toward records.",
    "game.resume": "Resume",
    "game.home": "Home",
    "game.overTitle": "Game Over",
    "game.finalScore": "Final Score: ",
    "game.finalTime": "Survival Time: ",
    "game.overLead": "Run complete. Push for a higher score and longer survival.",
    "game.overLeadDebug": "Debug cheats were used. This run won't be saved.",
    "game.restart": "Restart",
    "game.goHome": "Home",
    "game.loadingSubtitle": "Deploying Alpha Star mission environment",
    "game.bootError": "Mission start failed. Please refresh and try again.",
    "game.evalExplore": "Rating",
    "game.evalExploreVal": "Keep Climbing",
    "game.evalGoal": "Main Goal",
    "game.evalGoalVal": "Beat Your Best",
    "game.evalNext": "Next Step",
    "game.evalNextVal": "Go Again",
    "game.portraitTipTitle": "Play Tip",
    "game.portraitTipBody": "Portrait mode is recommended for the best view and controls.",
    "game.portraitTipConfirm": "Got it",
    "ach.unlocked": "Unlocked",
    "ach.locked": "Locked",
    "ach.newUnlock": "New achievement: ",
    "ach.progressMax": "Max rank reached! Chase a new record!",
    "ach.progressNext": "{n} pts to 「{icon} {name}」",
    "ach.noteHome": "Achievements persist across runs. Every attempt can unlock badges.",
    "ach.noteGameover": "Best records and achievements updated after this run.",
    "ach.rankProgress": "Rank {n}%",
    "ach.unlockedCount": "Unlocked {n}/{total}",
    "ach.bestScore": "Best {n}",
    "ach.bestTime": "Best {n}s",
    "ach.gamesPlayed": "Runs {n}",
    "status.speed": "Speed boost",
    "status.invincible": "Invincible",
    "status.heal": "Healed +{n}",
    "status.invSpeed": "Invincible speed",
    "popup.speed": "Speed!",
    "popup.inv": "Invinc!",
    "popup.shield": "Block!",
    "rank.0": "Stardust Novice",
    "rank.60": "Jade Explorer",
    "rank.140": "Violet Traveler",
    "rank.280": "Blaze Vanguard",
    "rank.480": "Deep Blue Knight",
    "rank.750": "Orange Ranger",
    "rank.1200": "Golden Legend",
    "rank.2000": "Eternal Star King",
    "ach.firstCrystal.name": "First Crystal",
    "ach.firstCrystal.desc": "Score any points",
    "ach.score100.name": "Jade Breakthrough",
    "ach.score100.desc": "Best score 60+",
    "ach.score300.name": "Orbit Rush",
    "ach.score300.desc": "Best score 750+",
    "ach.score650.name": "Golden Legend",
    "ach.score650.desc": "Best score 1200+",
    "ach.survive60.name": "One Minute",
    "ach.survive60.desc": "Survive 60s",
    "ach.survive120.name": "Two Minutes",
    "ach.survive120.desc": "Survive 120s",
    "ach.play5.name": "One More Run",
    "ach.play5.desc": "Play 5 runs",
    "ach.play15.name": "Can't Stop",
    "ach.play15.desc": "Play 15 runs",
    "ach.rankKing.name": "Eternal Star King",
    "ach.rankKing.desc": "Reach 2000 pts",
    "shop.speed5.name": "Speed Fruit (5s)",
    "shop.speed5.desc": "5s speed at start",
    "shop.invincible5.name": "Invincible (5s)",
    "shop.invincible5.desc": "5s invincible at start",
    "shop.speed8.name": "Speed Fruit (8s)",
    "shop.speed8.desc": "8s speed at start",
    "shop.invincible8.name": "Invincible (8s)",
    "shop.invincible8.desc": "8s invincible at start",
    "shop.both5.name": "Invinc+Speed (5s)",
    "shop.both5.desc": "5s invincible + speed",
    "shop.both8.name": "Invinc+Speed (8s)",
    "shop.both8.desc": "8s invincible + speed",
    "shop.both12.name": "Invinc+Speed (12s)",
    "shop.both12.desc": "12s invincible + speed",
    "shop.mystery.name": "Mystery Box",
    "mystery.smallSpeed.label": "Mini Speed",
    "mystery.smallSpeed.desc": "6s speed at start",
    "mystery.smallInv.label": "Mini Invinc",
    "mystery.smallInv.desc": "6s invincible at start",
    "mystery.charge.label": "Charge Speed",
    "mystery.charge.desc": "Slow 5s, then speed 10s",
    "mystery.healPack.label": "Speed Heal Pack",
    "mystery.healPack.desc": "5s speed + full heal when low HP",
    "mystery.nothing.label": "Nothing",
    "mystery.nothing.desc": "No effect. Points wasted.",
    "crystal.lightBlue": "Light Blue",
    "crystal.skyBlue": "Sky Blue",
    "crystal.green": "Green",
    "crystal.purple": "Purple",
    "crystal.red": "Red",
    "crystal.deepBlue": "Deep Blue",
    "crystal.orange": "Orange",
    "crystal.yellow": "Yellow",
    "crystal.gold": "Gold",
    "crystal.starWhite": "Star White"
  }
};

let currentLang = "en";

export function getLang() {
  return currentLang;
}

export function loadLang() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === "en" || saved === "zh") currentLang = saved;
  } catch {}
  return currentLang;
}

export function setLang(lang) {
  if (lang !== "zh" && lang !== "en") return currentLang;
  currentLang = lang;
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {}
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  return currentLang;
}

export function t(key, params = {}) {
  const table = STRINGS[currentLang] || STRINGS.zh;
  const fallback = STRINGS.zh;
  let text = table[key] ?? fallback[key] ?? key;
  for (const [k, v] of Object.entries(params)) {
    text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
  }
  return text;
}

export function applyI18n(root = document, pageKey = "") {
  if (pageKey) {
    document.title = t(`page.title.${pageKey}`);
  }
  root.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = t(key);
  });
  root.querySelectorAll("[data-i18n-html]").forEach(el => {
    const key = el.getAttribute("data-i18n-html");
    if (key) el.innerHTML = t(key);
  });
  root.querySelectorAll("[data-i18n-title]").forEach(el => {
    const key = el.getAttribute("data-i18n-title");
    if (key) el.title = t(key);
  });
  root.querySelectorAll("[data-i18n-aria]").forEach(el => {
    const key = el.getAttribute("data-i18n-aria");
    if (key) el.setAttribute("aria-label", t(key));
  });
}

export function getRankName(scoreThreshold) {
  return t(`rank.${scoreThreshold}`);
}

export function getAchievementText(id, field) {
  return t(`ach.${id}.${field}`);
}

export function getShopItemText(id, field) {
  if (id === "mystery") return t(`shop.mystery.${field}`);
  return t(`shop.${id}.${field}`);
}

export function getCrystalTierKey(tierKey) {
  const map = {
    lightBlue: "crystal.lightBlue",
    skyBlue: "crystal.skyBlue",
    green: "crystal.green",
    purple: "crystal.purple",
    red: "crystal.red",
    deepBlue: "crystal.deepBlue",
    orange: "crystal.orange",
    yellow: "crystal.yellow",
    gold: "crystal.gold",
    starWhite: "crystal.starWhite"
  };
  return t(map[tierKey] || "crystal.lightBlue");
}

export function localizeMystery(type) {
  const keyMap = {
    speed: "smallSpeed",
    invincible: "smallInv",
    chargeSpeed: "charge",
    healPack: "healPack",
    nothing: "nothing"
  };
  const k = keyMap[type] || "nothing";
  return {
    label: t(`mystery.${k}.label`),
    desc: t(`mystery.${k}.desc`)
  };
}

loadLang();
document.documentElement.lang = currentLang === "zh" ? "zh-CN" : "en";

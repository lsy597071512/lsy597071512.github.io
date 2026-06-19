import {
  loadMeta,
  saveMeta,
  SHOP_ITEMS,
  generateMysteryItem,
  renderAchievementPanel,
  getLocalizedShopItem
} from "./shared/meta.js";
import { applyI18n, getLang, setLang, t } from "./shared/i18n.js";

const BGM_MENU_URL = "music/jiemian01.mp3";
const BGM_SESSION_KEY = "starCrystalBgmUnlocked";
const BGM_GESTURE_EVENTS = ["pointerdown", "keydown", "touchstart", "click"];
const GAME_PREFETCH_URLS = [
  "game.html",
  "scripts/game.js?v=20250619b",
  "model/tex/skybox_basecolor_01.png?v=v2",
  "model/tex/Sphere001_BaseColor.png?v=v2",
  "model/Sphere001.fbx?v=v2",
  "model/wanjia01.FBX?v=v2",
  "model/ani/wanjia01_idle.FBX?v=v2",
  "model/ani/wanjia01_run.fbx?v=v2"
];
let _gamePrefetchStarted = false;

let meta = loadMeta();
let currentMysteryItem = null;
let shopPendingItem = null;
let menuBgm = null;
let menuBgmReady = false;
let lifecycleListenersBound = false;
let gestureListenersBound = false;

const startScreen = document.getElementById("startScreen");
const shopScreen = document.getElementById("shopScreen");
const shopConfirm = document.getElementById("shopConfirm");
const shopGrid = document.getElementById("shopGrid");
const shopPointsDisplay = document.getElementById("shopPointsDisplay");
const shopConfirmText = document.getElementById("shopConfirmText");
const shopClosedToast = document.getElementById("shopClosedToast");
const bgmSlider = document.getElementById("bgmVolSlider");
const settingsModal = document.getElementById("settingsModal");
const settingsBtn = document.getElementById("settingsBtn");
const settingsCloseBtn = document.getElementById("settingsCloseBtn");

function prefetchGameAssets() {
  if (_gamePrefetchStarted) return;
  _gamePrefetchStarted = true;
  GAME_PREFETCH_URLS.forEach(url => {
    fetch(url, { cache: "force-cache" }).catch(() => {});
  });
}

function scheduleGamePrefetch() {
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(() => prefetchGameAssets(), { timeout: 2500 });
  } else {
    window.setTimeout(prefetchGameAssets, 1200);
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function markBgmSessionUnlocked() {
  try {
    sessionStorage.setItem(BGM_SESSION_KEY, "1");
  } catch {}
}

function isMenuBgmActive() {
  return !!(menuBgm && !menuBgm.paused && !menuBgm.ended);
}

function ensureMenuBgm() {
  if (menuBgm) return menuBgm;
  menuBgm = new Audio(BGM_MENU_URL);
  menuBgm.loop = true;
  menuBgm.preload = "auto";
  menuBgm.volume = meta.bgmVolume ?? 0.5;
  menuBgm.addEventListener("canplaythrough", onMenuBgmReady, { once: false });
  menuBgm.addEventListener("playing", markBgmSessionUnlocked);
  menuBgm.addEventListener("error", () => {
    menuBgmReady = false;
    window.setTimeout(() => {
      if (menuBgm) menuBgm.load();
    }, 600);
  });
  menuBgm.load();
  return menuBgm;
}

function onMenuBgmReady() {
  menuBgmReady = true;
  tryStartMenuBgm();
}

function syncVolume(nextValue) {
  const volume = Math.max(0, Math.min(1, Number(nextValue) / 100));
  bgmSlider.value = String(Math.round(volume * 100));
  meta.bgmVolume = volume;
  meta = saveMeta(meta);
  if (menuBgm) menuBgm.volume = volume;
  if (volume > 0) tryStartMenuBgm();
}

function bindLifecycleBgmListeners() {
  if (lifecycleListenersBound) return;
  lifecycleListenersBound = true;
  window.addEventListener("pageshow", onPageShowForBgm);
  document.addEventListener("visibilitychange", onVisibilityChangeForBgm);
  window.addEventListener("focus", onFocusForBgm);
}

function bindGestureBgmListeners() {
  if (gestureListenersBound) return;
  gestureListenersBound = true;
  BGM_GESTURE_EVENTS.forEach(eventName => {
    window.addEventListener(eventName, onUserGestureForBgm, { capture: true, passive: true });
  });
}

function onUserGestureForBgm() {
  tryStartMenuBgm();
}

function onVisibilityChangeForBgm() {
  if (document.visibilityState === "visible") tryStartMenuBgm();
}

function onFocusForBgm() {
  tryStartMenuBgm();
}

function onPageShowForBgm() {
  menuBgmReady = !!(menuBgm && menuBgm.readyState >= 3);
  tryStartMenuBgm();
}

function tryStartMenuBgm() {
  const volume = meta.bgmVolume ?? 0.5;
  if (volume <= 0) return;

  const audio = ensureMenuBgm();
  audio.volume = volume;

  if (isMenuBgmActive()) return;

  if (audio.readyState < 3) {
    audio.load();
    return;
  }

  const playPromise = audio.play();
  if (!playPromise || typeof playPromise.then !== "function") return;

  playPromise
    .then(() => {
      markBgmSessionUnlocked();
    })
    .catch(() => {
      bindGestureBgmListeners();
    });
}

function refreshLanguageUI() {
  applyI18n(document, "home");
  updateLangButtons();
  renderAchievementPanel("startAchievementPanel", meta, { isGameover: false, newList: [] });
  if (shopScreen.style.display !== "none") renderShop();
}

function updateLangButtons() {
  const lang = getLang();
  document.querySelectorAll(".settings-lang-btn").forEach(btn => {
    btn.classList.toggle("is-active", btn.getAttribute("data-lang") === lang);
  });
}

function openSettings() {
  updateLangButtons();
  settingsModal.style.display = "flex";
  settingsModal.setAttribute("aria-hidden", "false");
}

function closeSettings() {
  settingsModal.style.display = "none";
  settingsModal.setAttribute("aria-hidden", "true");
}

function openShop() {
  tryStartMenuBgm();
  if (!currentMysteryItem) currentMysteryItem = generateMysteryItem();
  renderShop();
  startScreen.style.display = "none";
  shopScreen.style.display = "flex";
}

function closeShop() {
  shopScreen.style.display = "none";
  shopConfirm.style.display = "none";
  startScreen.style.display = "flex";
  renderAchievementPanel("startAchievementPanel", meta, { isGameover: false, newList: [] });
  tryStartMenuBgm();
}

function updateShopPointsDisplay() {
  shopPointsDisplay.textContent = String(meta.totalPoints || 0);
}

function renderShop() {
  updateShopPointsDisplay();
  const shopClosed = meta.purchasedItemId !== null;
  const items = [...SHOP_ITEMS.map(getLocalizedShopItem)];
  if (currentMysteryItem) items.push(getLocalizedShopItem(currentMysteryItem));

  shopGrid.innerHTML = items.map(item => {
    const canAfford = (meta.totalPoints || 0) >= item.price;
    let desc = item.desc;
    if (item.id === "mystery") {
      desc = shopClosed ? (meta.purchasedItemLabel || t("shop.mysteryReveal")) : t("shop.mysteryHidden");
    }

    let btnClass = "cant-buy";
    let btnText = shopClosed
      ? t("shop.soldOut")
      : t("shop.needPoints", { n: item.price - (meta.totalPoints || 0) });
    if (!shopClosed && canAfford) {
      btnClass = "can-buy";
      btnText = t("shop.buy");
    }

    return `<div class="shop-item${shopClosed ? " purchased" : ""}">
      <span class="shop-item-icon">${item.icon}</span>
      <span class="shop-item-name">${escapeHtml(item.name)}</span>
      <span class="shop-item-desc">${escapeHtml(desc)}</span>
      <span class="shop-item-price${canAfford && !shopClosed ? "" : " locked"}">💎 ${item.price}</span>
      <button class="shop-buy-btn ${btnClass}" data-item-id="${item.id}" data-item-price="${item.price}" ${shopClosed ? "disabled" : ""}>${btnText}</button>
    </div>`;
  }).join("");

  shopGrid.querySelectorAll(".shop-buy-btn.can-buy").forEach(button => {
    button.addEventListener("click", () => {
      const itemId = button.getAttribute("data-item-id");
      const raw = itemId === "mystery" ? currentMysteryItem : SHOP_ITEMS.find(entry => entry.id === itemId);
      const item = getLocalizedShopItem(raw);
      if (!item || meta.purchasedItemId !== null || meta.totalPoints < item.price) return;
      shopPendingItem = item;
      shopConfirmText.textContent = t("shop.confirmMsg", { price: item.price, name: item.name });
      shopConfirm.style.display = "flex";
    });
  });
}

function showShopClosedToast() {
  shopClosedToast.textContent = t("shop.closedToast");
  shopClosedToast.style.animation = "none";
  void shopClosedToast.offsetWidth;
  shopClosedToast.style.display = "block";
  shopClosedToast.style.animation = "toastPop 3s forwards";
  window.setTimeout(() => {
    shopClosedToast.style.display = "none";
  }, 3000);
}

function confirmPurchase() {
  const item = shopPendingItem;
  shopPendingItem = null;
  shopConfirm.style.display = "none";
  if (!item || meta.purchasedItemId !== null || meta.totalPoints < item.price) return;

  meta.totalPoints -= item.price;
  if (item.id === "mystery") {
    meta.purchasedItemId = `mystery_${item.type}_${item.duration}${item.type === "healPack" ? "_heal" : ""}`;
    meta.purchasedItemLabel = item.label || t("shop.mysteryReveal");
  } else {
    meta.purchasedItemId = item.id;
    meta.purchasedItemLabel = null;
  }

  meta = saveMeta(meta);
  renderShop();
  showShopClosedToast();
}

function init() {
  refreshLanguageUI();
  bgmSlider.value = String(Math.round((meta.bgmVolume || 0.5) * 100));

  bindLifecycleBgmListeners();
  bindGestureBgmListeners();
  ensureMenuBgm();
  tryStartMenuBgm();

  settingsBtn.addEventListener("click", openSettings);
  settingsCloseBtn.addEventListener("click", closeSettings);
  settingsModal.addEventListener("click", event => {
    if (event.target === settingsModal) closeSettings();
  });
  document.querySelectorAll(".settings-lang-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const lang = btn.getAttribute("data-lang");
      if (lang !== getLang()) {
        setLang(lang);
        currentMysteryItem = generateMysteryItem();
        refreshLanguageUI();
      }
      closeSettings();
    });
  });

  document.getElementById("startBtn").addEventListener("click", () => {
    prefetchGameAssets();
    if (menuBgm) {
      menuBgm.pause();
      menuBgm.currentTime = 0;
    }
    location.href = "game.html";
  });
  document.getElementById("startBtn").addEventListener("touchstart", prefetchGameAssets, { passive: true });
  document.getElementById("shopEntryBtn").addEventListener("click", openShop);
  document.getElementById("shopBackBtn").addEventListener("click", closeShop);
  document.getElementById("shopConfirmYes").addEventListener("click", confirmPurchase);
  document.getElementById("shopConfirmNo").addEventListener("click", () => {
    shopPendingItem = null;
    shopConfirm.style.display = "none";
  });

  const guideEntryBtn = document.getElementById("guideEntryBtn");
  if (guideEntryBtn) {
    guideEntryBtn.addEventListener("click", () => {
      tryStartMenuBgm();
      location.href = "guide.html";
    });
  }

  bgmSlider.addEventListener("input", event => syncVolume(event.target.value));
  scheduleGamePrefetch();
}

init();

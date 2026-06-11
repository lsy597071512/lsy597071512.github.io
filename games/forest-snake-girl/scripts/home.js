import { loadMeta, saveMeta, SHOP_ITEMS, generateMysteryItem, renderAchievementPanel } from "./shared/meta.js";

const BGM_MENU_URL = "music/jiemian01.mp3";

let meta = loadMeta();
let currentMysteryItem = null;
let shopPendingItem = null;
let menuBgm = null;
let audioUnlocked = false;

const startScreen = document.getElementById("startScreen");
const shopScreen = document.getElementById("shopScreen");
const shopConfirm = document.getElementById("shopConfirm");
const shopGrid = document.getElementById("shopGrid");
const shopPointsDisplay = document.getElementById("shopPointsDisplay");
const shopConfirmText = document.getElementById("shopConfirmText");
const shopClosedToast = document.getElementById("shopClosedToast");
const bgmSlider = document.getElementById("bgmVolSlider");

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function ensureMenuBgm() {
  if (menuBgm) return menuBgm;
  menuBgm = new Audio(BGM_MENU_URL);
  menuBgm.loop = true;
  menuBgm.preload = "auto";
  menuBgm.volume = meta.bgmVolume;
  return menuBgm;
}

function syncVolume(nextValue) {
  const volume = Math.max(0, Math.min(1, Number(nextValue) / 100));
  bgmSlider.value = String(Math.round(volume * 100));
  meta.bgmVolume = volume;
  meta = saveMeta(meta);
  if (menuBgm) menuBgm.volume = volume;
}

function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  const audio = ensureMenuBgm();
  audio.play().catch(() => {
    audioUnlocked = false;
  });
}

function openShop() {
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
}

function updateShopPointsDisplay() {
  shopPointsDisplay.textContent = String(meta.totalPoints || 0);
}

function renderShop() {
  updateShopPointsDisplay();
  const shopClosed = meta.purchasedItemId !== null;
  const items = [...SHOP_ITEMS];
  if (currentMysteryItem) items.push(currentMysteryItem);

  shopGrid.innerHTML = items.map(item => {
    const canAfford = (meta.totalPoints || 0) >= item.price;
    let desc = item.desc;
    if (item.id === "mystery") {
      desc = shopClosed ? (meta.purchasedItemLabel || "惊喜") : "???";
    }

    let btnClass = "cant-buy";
    let btnText = shopClosed ? "已下架" : `差${item.price - (meta.totalPoints || 0)}分`;
    if (!shopClosed && canAfford) {
      btnClass = "can-buy";
      btnText = "购买";
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
      const item = itemId === "mystery" ? currentMysteryItem : SHOP_ITEMS.find(entry => entry.id === itemId);
      if (!item || meta.purchasedItemId !== null || meta.totalPoints < item.price) return;
      shopPendingItem = item;
      shopConfirmText.textContent = `是否花费 ${item.price} 积分购买「${item.name}」？\n购买后商店将关闭，效果在下局游戏生效`;
      shopConfirm.style.display = "flex";
    });
  });
}

function showShopClosedToast() {
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
    meta.purchasedItemLabel = item.label || "惊喜";
  } else {
    meta.purchasedItemId = item.id;
    meta.purchasedItemLabel = null;
  }

  meta = saveMeta(meta);
  renderShop();
  showShopClosedToast();
}

function init() {
  bgmSlider.value = String(Math.round((meta.bgmVolume || 0.5) * 100));
  renderAchievementPanel("startAchievementPanel", meta, { isGameover: false, newList: [] });
  ensureMenuBgm();

  document.getElementById("startBtn").addEventListener("click", () => {
    if (menuBgm) {
      menuBgm.pause();
      menuBgm.currentTime = 0;
    }
    location.href = "game.html";
  });
  document.getElementById("shopEntryBtn").addEventListener("click", openShop);
  document.getElementById("shopBackBtn").addEventListener("click", closeShop);
  document.getElementById("shopConfirmYes").addEventListener("click", confirmPurchase);
  document.getElementById("shopConfirmNo").addEventListener("click", () => {
    shopPendingItem = null;
    shopConfirm.style.display = "none";
  });

  bgmSlider.addEventListener("input", event => syncVolume(event.target.value));
  window.addEventListener("pointerdown", unlockAudio, { once: true });
  window.addEventListener("keydown", unlockAudio, { once: true });
  window.addEventListener("beforeunload", () => {
    if (menuBgm) menuBgm.pause();
  });
}

init();

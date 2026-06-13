import { ECONOMY } from '../data/stages';
import type { SaveData } from '../types';

export type AdRewardType =
  | 'stage_double'
  | 'sweep_double'
  | 'box_skip'
  | 'extra_opens'
  | 'boss_revive'
  | 'daily_ticket'
  | 'shop_discount';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function ensureToday(save: SaveData): void {
  if (save.adUsage.date !== todayKey()) {
    save.adUsage = {
      date: todayKey(),
      total: 0,
      stageDouble: {},
      sweepDouble: 0,
      boxSkip: 0,
      extraOpens: 0,
      bossRevive: {},
      dailyTicket: 0,
      shopDiscount: 0,
    };
  }
}

export function getRemainingAds(save: SaveData): number {
  ensureToday(save);
  return Math.max(0, ECONOMY.dailyAdLimit - save.adUsage.total);
}

export function canShowAd(save: SaveData, type: AdRewardType, stageId?: number): boolean {
  ensureToday(save);
  if (save.adUsage.total >= ECONOMY.dailyAdLimit) return false;

  const limits = ECONOMY.adRewards;
  switch (type) {
    case 'stage_double':
      return stageId ? (save.adUsage.stageDouble[stageId] ?? 0) < limits.stageDoublePerDay : false;
    case 'sweep_double':
      return save.adUsage.sweepDouble < limits.sweepDoublePerDay;
    case 'box_skip':
      return save.adUsage.boxSkip < limits.boxSkipPerDay;
    case 'extra_opens':
      return save.adUsage.extraOpens < limits.extraOpensPerDay;
    case 'boss_revive':
      return stageId ? (save.adUsage.bossRevive[stageId] ?? 0) < 1 : false;
    case 'daily_ticket':
      return save.adUsage.dailyTicket < limits.dailyTicketPerDay;
    case 'shop_discount':
      return save.adUsage.shopDiscount < limits.shopDiscountPerDay;
    default:
      return false;
  }
}

export function showRewardedAd(save: SaveData, type: AdRewardType, stageId?: number): Promise<boolean> {
  return new Promise((resolve) => {
    ensureToday(save);
    if (!canShowAd(save, type, stageId)) {
      resolve(false);
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'ad-overlay';
    overlay.innerHTML = `
      <div class="ad-modal">
        <h3>📺 激励视频广告</h3>
        <p>模拟广告播放中…（接入时可替换为 AdSense / AdMob）</p>
        <div class="ad-progress"><div class="ad-bar"></div></div>
        <button class="btn btn-primary ad-skip">观看完成 (+1)</button>
      </div>
    `;
    document.body.appendChild(overlay);

    const bar = overlay.querySelector('.ad-bar') as HTMLElement;
    let progress = 0;
    const timer = setInterval(() => {
      progress += 5;
      bar.style.width = `${progress}%`;
      if (progress >= 100) clearInterval(timer);
    }, 100);

    overlay.querySelector('.ad-skip')?.addEventListener('click', () => {
      clearInterval(timer);
      save.adUsage.total += 1;
      switch (type) {
        case 'stage_double':
          if (stageId) save.adUsage.stageDouble[stageId] = (save.adUsage.stageDouble[stageId] ?? 0) + 1;
          break;
        case 'sweep_double':
          save.adUsage.sweepDouble += 1;
          break;
        case 'box_skip':
          save.adUsage.boxSkip += 1;
          break;
        case 'extra_opens':
          save.adUsage.extraOpens += 1;
          break;
        case 'boss_revive':
          if (stageId) save.adUsage.bossRevive[stageId] = (save.adUsage.bossRevive[stageId] ?? 0) + 1;
          break;
        case 'daily_ticket':
          save.adUsage.dailyTicket += 1;
          save.tickets += 1;
          break;
        case 'shop_discount':
          save.adUsage.shopDiscount += 1;
          break;
      }
      overlay.remove();
      resolve(true);
    });
  });
}

export function hasShopDiscount(save: SaveData): boolean {
  ensureToday(save);
  return save.adUsage.shopDiscount > 0;
}

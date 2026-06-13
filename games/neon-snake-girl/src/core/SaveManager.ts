import type { SaveData, AdUsage, PlayerStats } from '../types';
import { ECONOMY, STARTER } from '../data/stages';

const SAVE_KEY = 'rust-belt-era-save-v1';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function freshAdUsage(): AdUsage {
  return {
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

export function createDefaultSave(): SaveData {
  return {
    version: 1,
    gold: ECONOMY.startGold,
    tickets: ECONOMY.startTickets,
    gachaPity: 0,
    armoryLevel: 1,
    armoryUpgradeEnd: null,
    ownedCharacters: STARTER.characters.map((c) => ({
      characterId: c.characterId,
      weaponId: c.weaponId,
      giftCount: 0,
    })),
    ownedWeaponIds: ['w01', 'w02'],
    squad: [...STARTER.squad],
    clearedStages: [],
    achievementsClaimed: [],
    stats: {
      stagesCleared: 0,
      totalKills: 0,
      charactersOwned: STARTER.characters.length,
      giftsSent: 0,
      legendariesEquipped: 0,
      highestStage: 0,
    },
    adUsage: freshAdUsage(),
    tutorialFlags: { combatDone: false },
  };
}

export class SaveManager {
  private data: SaveData;

  constructor() {
    this.data = this.load();
  }

  private load(): SaveData {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return createDefaultSave();
      const parsed = JSON.parse(raw) as SaveData;
      if (parsed.adUsage?.date !== todayKey()) {
        parsed.adUsage = freshAdUsage();
      }
      return parsed;
    } catch {
      return createDefaultSave();
    }
  }

  save(): void {
    localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
  }

  reset(): void {
    this.data = createDefaultSave();
    this.save();
  }

  get(): SaveData {
    return this.data;
  }

  mutate(fn: (d: SaveData) => void): void {
    fn(this.data);
    this.syncStats();
    this.save();
  }

  private syncStats(): void {
    const d = this.data;
    d.stats.charactersOwned = d.ownedCharacters.length;
    d.stats.stagesCleared = d.clearedStages.length;
    d.stats.highestStage = d.clearedStages.length ? Math.max(...d.clearedStages) : 0;
  }

  updateStats(partial: Partial<PlayerStats>): void {
    Object.assign(this.data.stats, partial);
    this.save();
  }
}

export const saveManager = new SaveManager();

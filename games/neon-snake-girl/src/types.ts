export type Rarity = 'SR' | 'SSR' | 'UR';
export type WeaponRarity = 'N' | 'R' | 'E' | 'L';

export interface CharacterDef {
  id: string;
  name: string;
  rarity: Rarity;
  basePower: number;
  icon: string;
  tag: string;
  skillName?: string;
  skillDesc?: string;
  skillId?: string;
  bio: string;
  age: string;
  giftPreference: string;
}

export interface WeaponDef {
  id: string;
  name: string;
  rarity: WeaponRarity;
  power: number;
  icon: string;
  sellPrice: number;
  desc: string;
}

export interface StageDef {
  id: number;
  chapter: number;
  chapterIndex: number;
  name: string;
  recommendedTcp: number;
  isBoss: boolean;
  type: 'normal' | 'door' | 'barrel' | 'boss';
  firstClearGold: number;
  sweepGold: number;
  timer: number;
  waves: number;
  enemyHp: number;
  enemyDamage: number;
}

export interface ChapterDef {
  id: number;
  name: string;
  desc: string;
  theme: string;
}

export interface OwnedCharacter {
  characterId: string;
  weaponId: string | null;
  giftCount: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  check: (stats: PlayerStats) => boolean;
  rewardGold: number;
  rewardTickets: number;
}

export interface PlayerStats {
  stagesCleared: number;
  totalKills: number;
  charactersOwned: number;
  giftsSent: number;
  legendariesEquipped: number;
  highestStage: number;
}

export interface AdUsage {
  date: string;
  total: number;
  stageDouble: Record<number, number>;
  sweepDouble: number;
  boxSkip: number;
  extraOpens: number;
  bossRevive: Record<number, number>;
  dailyTicket: number;
  shopDiscount: number;
}

export interface SaveData {
  version: number;
  gold: number;
  tickets: number;
  gachaPity: number;
  armoryLevel: number;
  armoryUpgradeEnd: number | null;
  ownedCharacters: OwnedCharacter[];
  ownedWeaponIds: string[];
  squad: string[];
  clearedStages: number[];
  achievementsClaimed: string[];
  stats: PlayerStats;
  adUsage: AdUsage;
  tutorialFlags: {
    combatDone: boolean;
  };
}

export interface CombatModifiers {
  attackSpeedBonus: number;
  bossCritBonus: number;
  shieldBonus: number;
  tripleShotReady: boolean;
  tripleShotCooldown: number;
}

export interface CombatResult {
  victory: boolean;
  kills: number;
  goldEarned: number;
  firstClear: boolean;
  reason: string;
}

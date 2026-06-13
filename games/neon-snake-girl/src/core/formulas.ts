import { CHARACTER_MAP, CHARACTERS, GACHA_PITY, GACHA_RATES, DUPLICATE_GOLD } from '../data/characters';
import { WEAPON_MAP } from '../data/weapons';
import type { CharacterDef, Rarity, SaveData } from '../types';
import { squadSlotsForStage } from '../data/chapters';

export function getCharacterPower(characterId: string, weaponId: string | null): number {
  const c = CHARACTER_MAP[characterId];
  if (!c) return 0;
  const w = weaponId ? WEAPON_MAP[weaponId] : null;
  return c.basePower + (w?.power ?? 0);
}

export function getTeamTcp(save: SaveData, stageId?: number): number {
  const slots = stageId ? squadSlotsForStage(stageId) : save.squad.length;
  const active = save.squad.slice(0, slots);
  return active.reduce((sum, cid) => {
    const owned = save.ownedCharacters.find((o) => o.characterId === cid);
    if (!owned) return sum;
    return sum + getCharacterPower(owned.characterId, owned.weaponId);
  }, 0);
}

export function canAutoBattle(save: SaveData, stageId: number, recommended: number): boolean {
  const unlocked = save.stats.highestStage >= 8;
  if (!unlocked) return false;
  const tcp = getTeamTcp(save, stageId);
  return tcp >= recommended * 0.95;
}

export function canManualWin(tcp: number, recommended: number, isBoss: boolean): boolean {
  const ratio = isBoss ? 0.88 : 0.82;
  return tcp >= recommended * ratio;
}

export function rollRarity(pity: number): Rarity {
  if (pity >= GACHA_PITY - 1) return 'UR';
  const roll = Math.random();
  if (roll < GACHA_RATES.UR) return 'UR';
  if (roll < GACHA_RATES.UR + GACHA_RATES.SSR) return 'SSR';
  return 'SR';
}

export function pickCharacterByRarity(rarity: Rarity, owned: string[]): CharacterDef {
  const pool = CHARACTERS.filter((c) => c.rarity === rarity);
  const notOwned = pool.filter((c) => !owned.includes(c.id));
  const source = notOwned.length ? notOwned : pool;
  return source[Math.floor(Math.random() * source.length)];
}

export interface GachaResult {
  characterId: string;
  rarity: Rarity;
  duplicate: boolean;
  goldRefund: number;
  pityReset: boolean;
}

export function performGachaPull(save: SaveData): GachaResult {
  const owned = save.ownedCharacters.map((c) => c.characterId);
  const rarity = rollRarity(save.gachaPity);
  const char = pickCharacterByRarity(rarity, owned);
  const duplicate = owned.includes(char.id);

  let goldRefund = 0;
  if (duplicate) goldRefund = DUPLICATE_GOLD;

  return {
    characterId: char.id,
    rarity: char.rarity,
    duplicate,
    goldRefund,
    pityReset: rarity === 'UR',
  };
}

export function applyGachaResult(save: SaveData, result: GachaResult): void {
  if (result.duplicate) {
    save.gold += result.goldRefund;
  } else {
    save.ownedCharacters.push({
      characterId: result.characterId,
      weaponId: null,
      giftCount: 0,
    });
    if (!save.squad.includes(result.characterId) && save.squad.length < 3) {
      save.squad.push(result.characterId);
    }
  }
  if (result.pityReset) save.gachaPity = 0;
  else save.gachaPity += 1;
}

export function updateLegendaryStat(save: SaveData): void {
  let count = 0;
  for (const oc of save.ownedCharacters) {
    if (oc.weaponId && WEAPON_MAP[oc.weaponId]?.rarity === 'L') count++;
  }
  save.stats.legendariesEquipped = count;
}

export function getSkillModifiers(characterIds: string[]): {
  attackSpeedBonus: number;
  bossCritBonus: number;
  shieldBonus: number;
} {
  let attackSpeedBonus = 0;
  let bossCritBonus = 0;
  let shieldBonus = 0;

  for (const id of characterIds) {
    const c = CHARACTER_MAP[id];
    if (!c?.skillId) continue;
    switch (c.skillId) {
      case 'frost_overload':
        attackSpeedBonus += 0.18;
        shieldBonus += 0.1;
        break;
      case 'resonance_burst':
        attackSpeedBonus += 0.08;
        break;
      case 'sand_pierce':
        attackSpeedBonus += 0.1;
        break;
      case 'iron_rain':
        attackSpeedBonus += 0.05;
        break;
      case 'stellar_judgment':
        attackSpeedBonus += 0.25;
        bossCritBonus += 0.15;
        break;
    }
  }

  return { attackSpeedBonus, bossCritBonus, shieldBonus };
}

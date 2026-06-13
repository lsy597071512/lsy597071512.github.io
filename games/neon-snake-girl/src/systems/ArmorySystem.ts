import { ARMORY_UPGRADE_COST, ARMORY_UPGRADE_MINUTES, ARMORY_WEIGHTS, WEAPONS, openCost } from '../data/weapons';
import type { SaveData, WeaponDef, WeaponRarity } from '../types';

function rollRarity(level: number): WeaponRarity {
  const weights = ARMORY_WEIGHTS[Math.min(level, 8)] ?? ARMORY_WEIGHTS[8];
  const entries = Object.entries(weights).filter(([, w]) => w > 0) as [WeaponRarity, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let roll = Math.random() * total;
  for (const [r, w] of entries) {
    roll -= w;
    if (roll <= 0) return r;
  }
  return 'N';
}

function pickWeapon(rarity: WeaponRarity): WeaponDef {
  const pool = WEAPONS.filter((w) => w.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function rollWeapon(level: number): WeaponDef {
  return pickWeapon(rollRarity(level));
}

export function rollPack(type: 'normal' | 'advanced' | 'legendary'): WeaponDef {
  if (type === 'normal') {
    return Math.random() < 0.7 ? pickWeapon('N') : pickWeapon('R');
  }
  if (type === 'advanced') {
    return Math.random() < 0.75 ? pickWeapon('R') : pickWeapon('E');
  }
  return Math.random() < 0.7 ? pickWeapon('E') : pickWeapon('L');
}

export function getOpenCost(save: SaveData, discounted: boolean): number {
  const base = openCost(save.armoryLevel);
  return discounted ? Math.floor(base * 0.8) : base;
}

export function canUpgradeArmory(save: SaveData): boolean {
  return save.armoryLevel < 8 && save.armoryUpgradeEnd === null;
}

export function startArmoryUpgrade(save: SaveData): { ok: boolean; msg: string } {
  if (save.armoryLevel >= 8) return { ok: false, msg: '军械箱已达最高等级' };
  if (save.armoryUpgradeEnd) return { ok: false, msg: '升级进行中' };
  const cost = ARMORY_UPGRADE_COST[save.armoryLevel];
  if (save.gold < cost) return { ok: false, msg: `锈币不足，需要 ${cost}` };
  save.gold -= cost;
  save.armoryUpgradeEnd = Date.now() + ARMORY_UPGRADE_MINUTES[save.armoryLevel] * 60 * 1000;
  return { ok: true, msg: '升级开始' };
}

export function finishArmoryUpgradeIfReady(save: SaveData): boolean {
  if (!save.armoryUpgradeEnd) return false;
  if (Date.now() >= save.armoryUpgradeEnd) {
    save.armoryLevel += 1;
    save.armoryUpgradeEnd = null;
    return true;
  }
  return false;
}

export function skipArmoryUpgrade(save: SaveData): void {
  if (save.armoryUpgradeEnd) {
    save.armoryLevel += 1;
    save.armoryUpgradeEnd = null;
  }
}

export function getUpgradeRemainingMs(save: SaveData): number {
  if (!save.armoryUpgradeEnd) return 0;
  return Math.max(0, save.armoryUpgradeEnd - Date.now());
}

export function equipWeapon(save: SaveData, characterId: string, weaponId: string): void {
  const oc = save.ownedCharacters.find((c) => c.characterId === characterId);
  if (!oc) return;
  if (!save.ownedWeaponIds.includes(weaponId)) return;
  oc.weaponId = weaponId;
}

export function sellWeapon(save: SaveData, weaponId: string): { ok: boolean; gold: number; msg: string } {
  const def = WEAPONS.find((w) => w.id === weaponId);
  if (!def) return { ok: false, gold: 0, msg: '武器不存在' };

  const equipped = save.ownedCharacters.some((c) => c.weaponId === weaponId);
  if (equipped) return { ok: false, gold: 0, msg: '请先卸下该武器' };

  save.ownedWeaponIds = save.ownedWeaponIds.filter((id) => id !== weaponId);
  save.gold += def.sellPrice;
  return { ok: true, gold: def.sellPrice, msg: `出售获得 ${def.sellPrice} 锈币` };
}

export function addWeapon(save: SaveData, weapon: WeaponDef): void {
  if (!save.ownedWeaponIds.includes(weapon.id)) {
    save.ownedWeaponIds.push(weapon.id);
  }
}

export function compareAndMaybeEquip(save: SaveData, characterId: string, newWeapon: WeaponDef): string {
  addWeapon(save, newWeapon);
  const oc = save.ownedCharacters.find((c) => c.characterId === characterId);
  if (!oc) return `获得 ${newWeapon.name}`;

  const current = oc.weaponId ? WEAPONS.find((w) => w.id === oc.weaponId) : null;
  if (!current || newWeapon.power > current.power) {
    oc.weaponId = newWeapon.id;
    return `装备 ${newWeapon.name}（战力 ${newWeapon.power}）`;
  }
  return `获得 ${newWeapon.name}，当前装备更优`;
}

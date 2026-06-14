import { CHARACTER_MAP } from '../data/characters';

const UI = './ui';
const TEX = './tex';

export type PortraitSide = 'front' | 'back';

export const UI_ASSETS = {
  kanbanBg: `${TEX}/beijing01.png`,
  stageHex: `${UI}/stage-hex.svg`,
  gachaBanner: `${UI}/gacha-banner.svg`,
  nav: {
    map: `${UI}/nav-map.svg`,
    home: `${UI}/nav-home.svg`,
    shop: `${UI}/nav-shop.svg`,
    squad: `${UI}/nav-squad.svg`,
  },
  res: {
    gold: `${UI}/res-gold.svg`,
    ticket: `${UI}/res-ticket.svg`,
  },
  frame: {
    SR: `${UI}/frame-sr.svg`,
    SSR: `${UI}/frame-ssr.svg`,
    UR: `${UI}/frame-ur.svg`,
  },
};

export function rarityFrame(rarity: string): string {
  return UI_ASSETS.frame[rarity as keyof typeof UI_ASSETS.frame] ?? UI_ASSETS.frame.SR;
}

export function featuredCharacterId(squad: string[]): string {
  return squad[0] ?? 'ashcrow';
}

export function getCharPortraitSrc(charId: string, side: PortraitSide): string | null {
  const c = CHARACTER_MAP[charId];
  if (!c) return null;
  return side === 'front' ? (c.portraitFront ?? null) : (c.portraitBack ?? null);
}

/** 战斗关卡固定使用背面立绘 */
export function getCombatPortraitSrc(charId: string): string | null {
  const c = CHARACTER_MAP[charId];
  if (!c) return null;
  return c.portraitBack ?? null;
}

export function hasPortraitFlip(charId: string): boolean {
  const c = CHARACTER_MAP[charId];
  return !!(c?.portraitFront && c?.portraitBack);
}

export function renderCharPortrait(
  charId: string,
  side: PortraitSide,
  imgClass: string,
  emojiClass: string,
): string {
  const src = getCharPortraitSrc(charId, side);
  if (src) return `<img class="${imgClass}" src="${src}" alt="" />`;
  const c = CHARACTER_MAP[charId];
  return `<span class="${emojiClass}">${c?.icon ?? '?'}</span>`;
}

export function featuredCharDisplay(squad: string[]): {
  id: string;
  icon: string;
  name: string;
  rarity: string;
  tag: string;
  tagShort: string;
} {
  const id = featuredCharacterId(squad);
  const c = CHARACTER_MAP[id];
  const tagShort = c.tag.split('/')[0]?.trim() ?? c.tag;
  return { id, icon: c.icon, name: c.name, rarity: c.rarity, tag: c.tag, tagShort };
}

import type { ChapterDef } from '../types';

export const CHAPTERS: ChapterDef[] = [
  { id: 1, name: '零号月台', desc: '教程与基础战斗', theme: 'station' },
  { id: 2, name: '锈带走廊', desc: '数字门与沙尘机械', theme: 'corridor' },
  { id: 3, name: '白棺谷', desc: '冰冻废墟与护盾机兵', theme: 'frost' },
  { id: 4, name: '熔炉城废墟', desc: '高血量工业敌人', theme: 'forge' },
  { id: 5, name: '星核禁区', desc: '终局混合波次', theme: 'core' },
];

export function recommendedTcp(n: number): number {
  const boss = n % 8 === 0;
  const base = 110 + 28 * n + Math.floor(Math.pow(n, 1.25) * 2.8);
  return boss ? Math.floor(base * 1.15) : base;
}

export function firstClearGold(n: number): number {
  return 40 + 10 * n + Math.floor(n / 5) * 25;
}

export function sweepGold(n: number): number {
  return Math.floor(firstClearGold(n) * 0.55);
}

export function squadSlotsForStage(stageId: number): number {
  if (stageId <= 5) return 1;
  if (stageId <= 15) return 2;
  return 3;
}

export function stageType(chapterIndex: number): 'normal' | 'door' | 'barrel' | 'boss' {
  if (chapterIndex === 8) return 'boss';
  if (chapterIndex === 3) return 'door';
  if (chapterIndex === 6) return 'barrel';
  return 'normal';
}

export function stageName(chapter: number, chapterIndex: number): string {
  const prefix = ['侦察', '推进', '门选', '压制', '清扫', '打桶', '决战', 'Boss'][chapterIndex - 1];
  return `${CHAPTERS[chapter - 1].name} · ${prefix}-${chapterIndex}`;
}

export function combatParams(n: number) {
  return {
    timer: Math.max(60, 90 - Math.floor(n / 5) * 3),
    waves: Math.min(8, 3 + Math.floor(n / 8)),
    enemyHp: 30 + n * 8 + Math.floor(n * n * 0.15),
    enemyDamage: 5 + Math.floor(n / 3) * 2,
  };
}

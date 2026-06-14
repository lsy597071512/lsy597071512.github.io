import type { StageDef } from '../types';
import {
  CHAPTERS,
  recommendedTcp,
  firstClearGold,
  sweepGold,
  stageType,
  stageName,
  combatParams,
} from './chapters';

export const STAGES: StageDef[] = [];

for (let n = 1; n <= 40; n++) {
  const chapter = Math.ceil(n / 8);
  const chapterIndex = ((n - 1) % 8) + 1;
  const type = stageType(chapterIndex);
  const params = combatParams(n);
  const bossBonus = chapterIndex === 8 ? 150 : 0;

  STAGES.push({
    id: n,
    chapter,
    chapterIndex,
    name: stageName(chapter, chapterIndex),
    recommendedTcp: recommendedTcp(n),
    isBoss: chapterIndex === 8,
    type,
    firstClearGold: firstClearGold(n) + bossBonus,
    sweepGold: sweepGold(n),
    timer: params.timer,
    waves: params.waves,
    enemyHp: params.enemyHp,
    enemyDamage: params.enemyDamage,
  });
}

export const STAGE_MAP = Object.fromEntries(STAGES.map((s) => [s.id, s]));

export { CHAPTERS };

export const ECONOMY = {
  startGold: 800,
  startTickets: 3,
  singlePullGold: 900,
  tenPullGold: 8000,
  autoBattleUnlockStage: 8,
  manualWinRatio: 0.82,
  autoWinRatio: 0.95,
  bossManualRatio: 0.88,
  dailyAdLimit: 15,
  adRewards: {
    stageDoublePerDay: 1,
    sweepDoublePerDay: 8,
    boxSkipPerDay: 5,
    extraOpensPerDay: 6,
    shopDiscountPerDay: 3,
    dailyTicketPerDay: 1,
  },
};

export const STARTER = {
  characters: [
    { characterId: 'ashcrow', weaponId: 'w01' },
    { characterId: 'heartforge', weaponId: 'w02' },
  ],
  squad: ['ashcrow'],
  bonusTickets: [{ stage: 3, amount: 1 }, { stage: 8, amount: 2 }],
};

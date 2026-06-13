import Phaser from 'phaser';
import { CombatScene } from './CombatScene';

export function createPhaserGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 720,
    height: 1280,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [CombatScene],
    backgroundColor: '#1a1520',
  });
}

export { startCombat } from './CombatScene';
export type { CombatSceneData } from './CombatScene';

import Phaser from 'phaser';
import type { StageDef } from '../types';
import { getSkillModifiers } from '../core/formulas';

export interface CombatSceneData {
  stage: StageDef;
  tcp: number;
  squadIds: string[];
  autoMode: boolean;
  onComplete: (result: { victory: boolean; kills: number }) => void;
}

const LANES = [180, 360, 540];
const COLORS = {
  bg: 0x1a1520,
  lane: 0x2a2438,
  player: 0x7ec8e3,
  enemy: 0xff6b4a,
  barrel: 0xffaa00,
  door: 0x9b59b6,
  bullet: 0xffe066,
};

export class CombatScene extends Phaser.Scene {
  private stage!: StageDef;
  private tcp = 0;
  private squadIds: string[] = [];
  private autoMode = false;
  private onComplete!: CombatSceneData['onComplete'];

  private laneIndex = 1;
  private player!: Phaser.GameObjects.Rectangle;
  private bullets!: Phaser.GameObjects.Group;
  private enemies!: Phaser.GameObjects.Group;
  private hazards!: Phaser.GameObjects.Group;

  private kills = 0;
  private timeLeft = 0;
  private wave = 0;
  private maxWaves = 0;
  private spawnTimer = 0;
  private fireTimer = 0;
  private hp = 100;
  private maxHp = 100;
  private comboKills = 0;
  private tripleCooldown = 0;
  private finished = false;

  private timerText!: Phaser.GameObjects.Text;
  private hpText!: Phaser.GameObjects.Text;
  private infoText!: Phaser.GameObjects.Text;
  private skillMods = { attackSpeedBonus: 0, bossCritBonus: 0, shieldBonus: 0 };

  constructor() {
    super('CombatScene');
  }

  init(data: CombatSceneData): void {
    this.stage = data.stage;
    this.tcp = data.tcp;
    this.squadIds = data.squadIds;
    this.autoMode = data.autoMode;
    this.onComplete = data.onComplete;
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(COLORS.bg);

    this.skillMods = getSkillModifiers(this.squadIds);
    this.maxHp = 100 + Math.floor(this.tcp / 20);
    this.hp = this.maxHp;
    this.timeLeft = this.stage.timer;
    this.maxWaves = this.stage.waves;
    this.wave = 1;

    for (let i = 0; i < 3; i++) {
      this.add.rectangle(LANES[i], height / 2, 100, height, COLORS.lane, 0.35);
    }

    this.player = this.add.rectangle(LANES[this.laneIndex], height - 120, 56, 56, COLORS.player);
    this.player.setStrokeStyle(3, 0xffffff);

    this.bullets = this.add.group();
    this.enemies = this.add.group();
    this.hazards = this.add.group();

    this.timerText = this.add.text(16, 16, '', { fontSize: '20px', color: '#ff6b4a' });
    this.hpText = this.add.text(16, 44, '', { fontSize: '18px', color: '#7ec8e3' });
    this.infoText = this.add.text(width / 2, 16, this.stage.name, {
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5, 0);

    this.add.text(width - 16, 16, `TCP ${this.tcp}`, {
      fontSize: '16px',
      color: '#ffe066',
    }).setOrigin(1, 0);

    if (this.stage.type === 'door') this.spawnDoors();
    if (this.stage.type === 'barrel') this.spawnBarrels();

    this.setupInput();
    this.spawnWave();

    if (this.autoMode) {
      this.infoText.setText(`${this.stage.name} [自动]`).setColor('#90ee90');
    }
  }

  private setupInput(): void {
    this.input.keyboard?.on('keydown-LEFT', () => this.moveLane(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.moveLane(1));
    this.input.keyboard?.on('keydown-A', () => this.moveLane(-1));
    this.input.keyboard?.on('keydown-D', () => this.moveLane(1));

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.x < this.scale.width / 2) this.moveLane(-1);
      else this.moveLane(1);
    });
  }

  private moveLane(dir: number): void {
    if (this.finished) return;
    this.laneIndex = Phaser.Math.Clamp(this.laneIndex + dir, 0, 2);
    this.tweens.add({
      targets: this.player,
      x: LANES[this.laneIndex],
      duration: 120,
      ease: 'Power2',
    });
  }

  private spawnWave(): void {
    const count = 4 + this.wave + Math.floor(this.stage.id / 10);
    for (let i = 0; i < count; i++) {
      this.time.delayedCall(i * 300, () => this.spawnEnemy());
    }
    if (this.stage.isBoss && this.wave === this.maxWaves) {
      this.time.delayedCall(1500, () => this.spawnBoss());
    }
  }

  private spawnEnemy(): void {
    const lane = Phaser.Math.Between(0, 2);
    const e = this.add.rectangle(
      LANES[lane],
      -30,
      40,
      40,
      COLORS.enemy,
    ) as Phaser.GameObjects.Rectangle & { hp: number; lane: number };
    e.hp = this.stage.enemyHp;
    e.lane = lane;
    this.enemies.add(e);
  }

  private spawnBoss(): void {
    const e = this.add.rectangle(
      LANES[1],
      -60,
      100,
      80,
      0xcc0044,
    ) as Phaser.GameObjects.Rectangle & { hp: number; lane: number; boss: boolean };
    e.hp = this.stage.enemyHp * 8;
    e.lane = 1;
    e.boss = true;
    this.enemies.add(e);
    this.infoText.setText('⚠ BOSS').setColor('#ff4444');
  }

  private spawnDoors(): void {
    const opts = [
      { label: '+20% 攻', bonus: 0.2 },
      { label: '+35% 攻', bonus: 0.35 },
    ];
    opts.forEach((o, i) => {
      const door = this.add.rectangle(LANES[i === 0 ? 0 : 2], 200, 80, 100, COLORS.door, 0.8);
      const txt = this.add.text(door.x, door.y, o.label, { fontSize: '14px', color: '#fff' }).setOrigin(0.5);
      door.setInteractive();
      door.on('pointerdown', () => {
        this.skillMods.attackSpeedBonus += o.bonus;
        txt.setText('✓').setColor('#90ee90');
        door.disableInteractive();
      });
      this.hazards.add(door);
    });
  }

  private spawnBarrels(): void {
    for (let i = 0; i < 3; i++) {
      const lane = i;
      const barrel = this.add.rectangle(LANES[lane], 150 + i * 80, 50, 50, COLORS.barrel);
      const hp = 3;
      (barrel as any).hits = hp;
      barrel.setInteractive();
      barrel.on('pointerdown', () => {
        (barrel as any).hits -= 1;
        if ((barrel as any).hits <= 0) {
          this.skillMods.attackSpeedBonus += 0.15;
          barrel.destroy();
          this.add.text(LANES[lane], 150 + i * 80, '💥', { fontSize: '24px' }).setOrigin(0.5);
        }
      });
      this.hazards.add(barrel);
    }
  }

  private fire(): void {
    const b = this.add.circle(this.player.x, this.player.y - 30, 6, COLORS.bullet);
    this.bullets.add(b);
  }

  private autoMove(): void {
    const nearest = this.getNearestEnemyLane();
    if (nearest !== null && nearest !== this.laneIndex) {
      this.moveLane(nearest > this.laneIndex ? 1 : -1);
    }
  }

  private getNearestEnemyLane(): number | null {
    let best: Phaser.GameObjects.Rectangle | null = null;
    let bestY = -1;
    this.enemies.children.each((child) => {
      const e = child as Phaser.GameObjects.Rectangle;
      if (e.y > bestY) {
        bestY = e.y;
        best = e;
      }
      return true;
    });
    return best ? (best as any).lane : null;
  }

  update(_time: number, delta: number): void {
    if (this.finished) return;

    this.timeLeft -= delta / 1000;
    this.timerText.setText(`⏱ ${Math.ceil(this.timeLeft)}s`);
    this.hpText.setText(`HP ${Math.ceil(this.hp)}/${this.maxHp}`);

    if (this.timeLeft <= 0) {
      this.endCombat(false);
      return;
    }

    if (this.autoMode) this.autoMove();

    const fireRate = 350 / (1 + this.skillMods.attackSpeedBonus);
    this.fireTimer += delta;
    if (this.fireTimer >= fireRate) {
      this.fireTimer = 0;
      this.fire();
      if (this.tripleCooldown <= 0 && this.comboKills >= 3) {
        this.time.delayedCall(100, () => this.fire());
        this.time.delayedCall(200, () => this.fire());
        this.tripleCooldown = 8000;
        this.comboKills = 0;
      }
    }
    if (this.tripleCooldown > 0) this.tripleCooldown -= delta;

    this.bullets.children.each((child) => {
      const b = child as Phaser.GameObjects.Arc;
      b.y -= 8;
      if (b.y < -20) b.destroy();
      return true;
    });

    this.enemies.children.each((child) => {
      const e = child as Phaser.GameObjects.Rectangle & { hp: number; lane: number; boss?: boolean };
      e.y += this.stage.isBoss && e.boss ? 1.2 : 2.5;

      if (Math.abs(e.x - this.player.x) < 40 && Math.abs(e.y - this.player.y) < 40) {
        const dmg = this.stage.enemyDamage * (1 - this.skillMods.shieldBonus * 0.5);
        this.hp -= dmg * (delta / 1000) * 3;
      }

      if (e.y > this.scale.height + 50) e.destroy();
      return true;
    });

    this.physicsOverlap();

    if (this.enemies.countActive() === 0 && this.wave < this.maxWaves) {
      this.wave++;
      this.spawnWave();
    }

    if (this.enemies.countActive() === 0 && this.wave >= this.maxWaves) {
      this.endCombat(true);
    }

    if (this.hp <= 0) this.endCombat(false);
  }

  private physicsOverlap(): void {
    const dmgBase = this.tcp / 10;
    const crit = this.stage.isBoss ? 1 + this.skillMods.bossCritBonus : 1;

    this.bullets.children.each((bChild) => {
      const bullet = bChild as Phaser.GameObjects.Arc;
      this.enemies.children.each((eChild) => {
        const e = eChild as Phaser.GameObjects.Rectangle & { hp: number };
        if (!e.active || !bullet.active) return true;
        if (Phaser.Math.Distance.Between(bullet.x, bullet.y, e.x, e.y) < 30) {
          e.hp -= dmgBase * crit;
          bullet.destroy();
          if (e.hp <= 0) {
            e.destroy();
            this.kills++;
            this.comboKills++;
          }
        }
        return true;
      });
      return true;
    });
  }

  private endCombat(victory: boolean): void {
    if (this.finished) return;
    this.finished = true;

    const overlay = this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      this.scale.width,
      this.scale.height,
      0x000000,
      0.7,
    );
    const msg = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2,
      victory ? '✅ 胜利' : '❌ 失败',
      { fontSize: '36px', color: victory ? '#90ee90' : '#ff6b4a' },
    ).setOrigin(0.5);

    this.time.delayedCall(1200, () => {
      overlay.destroy();
      msg.destroy();
      this.onComplete({ victory, kills: this.kills });
      this.scene.stop();
    });
  }
}

export function startCombat(
  game: Phaser.Game,
  data: CombatSceneData,
): void {
  game.scene.start('CombatScene', data);
}

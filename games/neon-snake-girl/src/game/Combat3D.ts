import * as THREE from 'three';
import type { StageDef } from '../types';
import { CHARACTER_MAP } from '../data/characters';
import { getSkillModifiers } from '../core/formulas';
import {
  WastelandEnvironment,
  LANE_X,
  PLAYER_Z,
  SPAWN_Z,
  billboardScale,
  roadY,
  setupCombatCamera,
  getPlayerCombatLayout,
} from './WastelandEnvironment';
import { createEmojiTexture } from './textureUtils';
import { getCombatPortraitSrc } from '../ui/uiAssets';
import { nextWaveAfterClear, shouldEndVictory } from './combatWaveLogic';

export interface CombatSceneData {
  stage: StageDef;
  tcp: number;
  squadIds: string[];
  autoMode: boolean;
  onComplete: (result: { victory: boolean; kills: number }) => void;
}

interface Entity3D {
  sprite: THREE.Sprite;
  lane: number;
  hp: number;
  boss?: boolean;
  active: boolean;
}

interface Bullet3D {
  sprite: THREE.Sprite;
  active: boolean;
}

export class Combat3D {
  private readonly parent: HTMLElement;
  private readonly data: CombatSceneData;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private env!: WastelandEnvironment;
  private hudEl!: HTMLDivElement;
  private clock = new THREE.Clock();
  private raf = 0;
  private disposed = false;

  private laneIndex = 1;
  private player!: THREE.Sprite;
  /** 初始占位，每帧由 getPlayerCombatLayout 按屏幕比例重算 */
  private playerBaseScale = { w: 4.03, h: 5.43 };
  private enemies: Entity3D[] = [];
  private bullets: Bullet3D[] = [];

  private kills = 0;
  private timeLeft = 0;
  private wave = 1;
  private maxWaves = 0;
  private pendingSpawns = 0;
  private everSpawned = false;
  private fireTimer = 0;
  private hp = 100;
  private maxHp = 100;
  private comboKills = 0;
  private tripleCooldown = 0;
  private finished = false;
  private skillMods = { attackSpeedBonus: 0, bossCritBonus: 0, shieldBonus: 0 };
  private scrollSpeed = 6;

  private timerEl!: HTMLElement;
  private hpEl!: HTMLElement;
  private infoEl!: HTMLElement;
  private onResize!: () => void;
  private spawnTimers: ReturnType<typeof setTimeout>[] = [];

  constructor(parent: HTMLElement, data: CombatSceneData) {
    this.parent = parent;
    this.data = data;
  }

  start(): void {
    this.parent.innerHTML = '';
    this.initThree();
    this.initHUD();
    this.initGameState();
    this.setupInput();
    this.spawnWave();
    if (this.data.stage.type === 'door') this.spawnDoors();
    if (this.data.stage.type === 'barrel') this.spawnBarrels();
    this.clock.start();
    this.animate();
  }

  private initThree(): void {
    const { squadIds } = this.data;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(68, 720 / 1280, 0.1, 280);
    setupCombatCamera(this.camera);

    this.env = new WastelandEnvironment(this.scene, this.camera);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.domElement.className = 'combat-canvas';
    this.parent.appendChild(this.renderer.domElement);

    this.onResize = () => {
      const w = this.parent.clientWidth || 720;
      const h = this.parent.clientHeight || 1280;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h, false);
    };
    window.addEventListener('resize', this.onResize);
    this.onResize();

    const leadId = squadIds[0] ?? 'ashcrow';
    const leadChar = CHARACTER_MAP[leadId];
    const combatPortrait = getCombatPortraitSrc(leadId);
    if (combatPortrait) {
      this.player = this.makeImageSprite(combatPortrait, this.playerBaseScale.w, this.playerBaseScale.h);
    } else {
      this.player = this.makeSprite(leadChar.icon, '#1a4060', '#2ecbff', this.playerBaseScale.w, this.playerBaseScale.h);
    }
    this.player.center.set(0.5, 0);
    this.updatePlayerTransform();
    this.scene.add(this.player);

    this.scrollSpeed = this.data.stage.isBoss ? 5 : 7;
  }

  private initHUD(): void {
    const { stage, tcp, autoMode } = this.data;
    this.hudEl = document.createElement('div');
    this.hudEl.className = 'combat-hud';
    this.hudEl.innerHTML = `
      <div class="combat-hud-top">
        <div class="combat-hud-left">
          <div class="combat-timer" data-hud="timer">⏱ ${stage.timer}s</div>
          <div class="combat-hp" data-hud="hp">HP 100/100</div>
          <div class="combat-wave" data-hud="wave">波次 1/${stage.waves}</div>
        </div>
        <div class="combat-stage" data-hud="info">${stage.name}</div>
        <div class="combat-tcp">TCP ${tcp}</div>
      </div>
      <div class="combat-hint">◀ 左半屏换道 &nbsp;|&nbsp; 右半屏换道 ▶</div>
    `;
    this.parent.appendChild(this.hudEl);

    this.timerEl = this.hudEl.querySelector('[data-hud="timer"]')!;
    this.hpEl = this.hudEl.querySelector('[data-hud="hp"]')!;
    this.infoEl = this.hudEl.querySelector('[data-hud="info"]')!;

    if (autoMode) {
      this.infoEl.textContent = `${stage.name} [自动]`;
      this.infoEl.classList.add('auto');
    }
  }

  private initGameState(): void {
    const { stage, tcp, squadIds } = this.data;
    this.skillMods = getSkillModifiers(squadIds);
    this.maxHp = 100 + Math.floor(tcp / 20);
    this.hp = this.maxHp;
    this.timeLeft = stage.timer;
    this.maxWaves = stage.waves;
    this.wave = 1;
  }

  private updateEntityTransform(sprite: THREE.Sprite, lane: number, z: number): void {
    if (sprite === this.player) {
      this.updatePlayerTransform();
      return;
    }
    const camZ = this.camera.position.z;
    const s = billboardScale(z, camZ);
    sprite.center.set(0.5, 0.5);
    sprite.position.set(LANE_X[lane], roadY(z, camZ), z);
    sprite.scale.set(1.8 * s, 2.4 * s, 1);
  }

  /** 参考图 1:1：脚底锚点 + 屏高 29% + 底边 4.2% 间距 */
  private updatePlayerTransform(): void {
    const layout = getPlayerCombatLayout(this.camera, this.laneIndex, PLAYER_Z);
    this.player.center.set(0.5, 0);
    this.player.position.set(layout.x, layout.y, PLAYER_Z);
    this.player.scale.set(layout.scaleW, layout.scaleH, 1);
    this.playerBaseScale = {
      w: layout.scaleW / billboardScale(PLAYER_Z, this.camera.position.z),
      h: layout.scaleH / billboardScale(PLAYER_Z, this.camera.position.z),
    };
  }

  private makeSprite(emoji: string, bg: string, border: string, w: number, h: number): THREE.Sprite {
    const tex = createEmojiTexture(emoji, bg, border);
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: true,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(w, h, 1);
    return sprite;
  }

  private makeImageSprite(url: string, w: number, h: number): THREE.Sprite {
    const tex = new THREE.TextureLoader().load(url);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: true,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(w, h, 1);
    return sprite;
  }

  private setupInput(): void {
    const move = (dir: number) => this.moveLane(dir);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') move(-1);
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') move(1);
    };
    window.addEventListener('keydown', onKey);
    (this as any)._onKey = onKey;

    const canvas = this.renderer.domElement;
    const onPointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      if (x < rect.width / 2) move(-1);
      else move(1);
    };
    canvas.addEventListener('pointerdown', onPointer);
    (this as any)._onPointer = onPointer;
  }

  private moveLane(dir: number): void {
    if (this.finished) return;
    this.laneIndex = Math.max(0, Math.min(2, this.laneIndex + dir));
    this.updatePlayerTransform();
  }

  private spawnWave(): void {
    const { stage } = this.data;
    const count = 4 + this.wave + Math.floor(stage.id / 10);
    this.pendingSpawns += count;

    for (let i = 0; i < count; i++) {
      const t = setTimeout(() => {
        this.spawnEnemy();
        this.pendingSpawns = Math.max(0, this.pendingSpawns - 1);
      }, i * 320);
      this.spawnTimers.push(t);
    }

    if (stage.isBoss && this.wave === this.maxWaves) {
      this.pendingSpawns++;
      const t = setTimeout(() => {
        this.spawnBoss();
        this.pendingSpawns = Math.max(0, this.pendingSpawns - 1);
      }, 1600);
      this.spawnTimers.push(t);
    }

    this.updateWaveHUD();
  }

  private updateWaveHUD(): void {
    const el = this.hudEl.querySelector('[data-hud="wave"]');
    if (el) el.textContent = `波次 ${this.wave}/${this.maxWaves}`;
  }

  private spawnEnemy(): void {
    if (this.disposed || this.finished) return;
    const lane = Math.floor(Math.random() * 3);
    const z = SPAWN_Z - Math.random() * 25;
    const sprite = this.makeSprite('☠️', '#2a3040', '#5a6478', 1.8, 2.4);
    this.updateEntityTransform(sprite, lane, z);
    this.scene.add(sprite);
    this.enemies.push({ sprite, lane, hp: this.data.stage.enemyHp, active: true });
    this.everSpawned = true;
  }

  private spawnBoss(): void {
    if (this.disposed || this.finished) return;
    const z = SPAWN_Z - 8;
    const sprite = this.makeSprite('👹', '#401818', '#ff4757', 3, 4);
    this.updateEntityTransform(sprite, 1, z);
    sprite.scale.multiplyScalar(1.35);
    this.scene.add(sprite);
    this.enemies.push({
      sprite,
      lane: 1,
      hp: this.data.stage.enemyHp * 8,
      boss: true,
      active: true,
    });
    this.everSpawned = true;
    this.infoEl.textContent = '⚠ BOSS';
    this.infoEl.classList.add('boss');
  }

  private spawnDoors(): void {
    const opts = [
      { label: '+20% 攻', bonus: 0.2, lane: 0 },
      { label: '+35% 攻', bonus: 0.35, lane: 2 },
    ];
    opts.forEach((o) => {
      const z = -35;
      const sprite = this.makeSprite('🚪', '#302050', '#b57dff', 2, 2.5);
      this.updateEntityTransform(sprite, o.lane, z);
      this.scene.add(sprite);
      const handler = () => {
        this.skillMods.attackSpeedBonus += o.bonus;
        sprite.material.color.set('#5dffa8');
      };
      this.renderer.domElement.addEventListener('pointerdown', handler, { once: true });
    });
  }

  private spawnBarrels(): void {
    for (let i = 0; i < 3; i++) {
      const lane = i;
      const z = -30 - i * 12;
      const sprite = this.makeSprite('🛢️', '#402818', '#ff8c42', 1.6, 2);
      this.updateEntityTransform(sprite, lane, z);
      this.scene.add(sprite);
      let hits = 3;
      const handler = () => {
        hits--;
        if (hits <= 0) {
          this.skillMods.attackSpeedBonus += 0.15;
          this.scene.remove(sprite);
        }
      };
      this.renderer.domElement.addEventListener('pointerdown', handler);
    }
  }

  private fire(): void {
    const tex = createEmojiTexture('●', '#003344', '#2ecbff', 64);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(this.player.position.x, this.player.position.y + this.player.scale.y * 0.72, PLAYER_Z - 1);
    sprite.scale.set(0.25, 0.25, 1);
    this.scene.add(sprite);
    this.bullets.push({ sprite, active: true });
  }

  private autoMove(): void {
    let best: Entity3D | null = null;
    let bestZ = -Infinity;
    for (const e of this.enemies) {
      if (!e.active) continue;
      if (e.sprite.position.z > bestZ) {
        bestZ = e.sprite.position.z;
        best = e;
      }
    }
    if (best && best.lane !== this.laneIndex) {
      this.moveLane(best.lane > this.laneIndex ? 1 : -1);
    }
  }

  private animate = (): void => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.animate);
    const deltaMs = Math.min(this.clock.getDelta() * 1000, 50);
    this.update(deltaMs);
    this.renderer.render(this.scene, this.camera);
  };

  private update(delta: number): void {
    if (this.finished) return;
    const { stage, autoMode } = this.data;
    const dt = delta / 1000;
    const camZ = this.camera.position.z;

    this.timeLeft -= dt;
    this.timerEl.textContent = `⏱ ${Math.ceil(Math.max(0, this.timeLeft))}s`;
    this.hpEl.textContent = `HP ${Math.ceil(this.hp)}/${this.maxHp}`;

    if (this.timeLeft <= 0) {
      this.endCombat(false);
      return;
    }

    if (autoMode) this.autoMove();
    this.env.update(dt, this.scrollSpeed);

    const fireRate = 350 / (1 + this.skillMods.attackSpeedBonus);
    this.fireTimer += delta;
    if (this.fireTimer >= fireRate) {
      this.fireTimer = 0;
      this.fire();
      if (this.tripleCooldown <= 0 && this.comboKills >= 3) {
        setTimeout(() => !this.finished && this.fire(), 100);
        setTimeout(() => !this.finished && this.fire(), 200);
        this.tripleCooldown = 8000;
        this.comboKills = 0;
      }
    }
    if (this.tripleCooldown > 0) this.tripleCooldown -= delta;

    const approachSpeed = (stage.isBoss ? 7 : 10) * (1 + this.scrollSpeed * 0.04);
    for (const e of this.enemies) {
      if (!e.active) continue;
      e.sprite.position.z += approachSpeed * dt;
      this.updateEntityTransform(e.sprite, e.lane, e.sprite.position.z);

      const dx = Math.abs(e.sprite.position.x - this.player.position.x);
      const dz = Math.abs(e.sprite.position.z - PLAYER_Z);
      if (dx < 1.6 && dz < 2.8) {
        const dmg = stage.enemyDamage * (1 - this.skillMods.shieldBonus * 0.5);
        this.hp -= dmg * dt * 3;
      }

      if (e.sprite.position.z > PLAYER_Z + 6) {
        this.removeEnemy(e);
      }
    }

    const bulletSpeed = 28;
    for (const b of this.bullets) {
      if (!b.active) continue;
      b.sprite.position.z -= bulletSpeed * dt;
      if (b.sprite.position.z < SPAWN_Z - 20) {
        b.active = false;
        this.scene.remove(b.sprite);
        this.disposeSprite(b.sprite);
      }
    }

    this.checkHits();
    this.updatePlayerTransform();

    const alive = this.enemies.filter((e) => e.active).length;

    const nextWave = nextWaveAfterClear(alive, this.pendingSpawns, this.wave, this.maxWaves);
    if (nextWave !== null) {
      this.wave = nextWave;
      this.spawnWave();
    } else if (
      shouldEndVictory(alive, this.pendingSpawns, this.wave, this.maxWaves, this.everSpawned)
    ) {
      this.endCombat(true);
    }

    if (this.hp <= 0) this.endCombat(false);

    this.camera.position.y = 7.5 + Math.sin(Date.now() * 0.0018) * 0.03;
  }

  private checkHits(): void {
    const { stage, tcp } = this.data;
    const dmgBase = tcp / 10;
    const crit = stage.isBoss ? 1 + this.skillMods.bossCritBonus : 1;

    for (const b of this.bullets) {
      if (!b.active) continue;
      for (const e of this.enemies) {
        if (!e.active) continue;
        const dx = Math.abs(b.sprite.position.x - e.sprite.position.x);
        const dz = Math.abs(b.sprite.position.z - e.sprite.position.z);
        if (dx < 1.4 && dz < 2.2) {
          e.hp -= dmgBase * crit;
          b.active = false;
          this.scene.remove(b.sprite);
          this.disposeSprite(b.sprite);

          if (e.hp <= 0) {
            this.removeEnemy(e);
            this.kills++;
            this.comboKills++;
          }
          break;
        }
      }
    }
  }

  private removeEnemy(e: Entity3D): void {
    e.active = false;
    this.scene.remove(e.sprite);
    this.disposeSprite(e.sprite);
  }

  private disposeSprite(sprite: THREE.Sprite): void {
    const mat = sprite.material as THREE.SpriteMaterial;
    mat.map?.dispose();
    mat.dispose();
  }

  private endCombat(victory: boolean): void {
    if (this.finished) return;
    this.finished = true;
    this.spawnTimers.forEach(clearTimeout);

    const overlay = document.createElement('div');
    overlay.className = 'combat-result';
    overlay.innerHTML = `<div class="${victory ? 'win' : 'lose'}">${victory ? '✅ 胜利' : '❌ 失败'}</div>
      <div class="combat-result-sub">击杀 ${this.kills}</div>`;
    this.parent.appendChild(overlay);

    setTimeout(() => {
      this.data.onComplete({ victory, kills: this.kills });
      this.dispose();
    }, 1400);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.spawnTimers.forEach(clearTimeout);
    cancelAnimationFrame(this.raf);

    const onKey = (this as any)._onKey;
    if (onKey) window.removeEventListener('keydown', onKey);
    if (this.onResize) window.removeEventListener('resize', this.onResize);

    this.env?.dispose();
    this.renderer?.dispose();
    this.parent.innerHTML = '';
  }
}

export function startCombat3D(parent: HTMLElement, data: CombatSceneData): Combat3D {
  const combat = new Combat3D(parent, data);
  combat.start();
  return combat;
}

export type { CombatSceneData as Combat3DData };

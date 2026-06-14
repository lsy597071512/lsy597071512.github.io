import { saveManager } from '../core/SaveManager';
import { STAGES, STAGE_MAP, ECONOMY, STARTER, CHAPTERS } from '../data/stages';
import { CHARACTER_MAP, CHARACTERS, GACHA_PITY } from '../data/characters';
import { WEAPON_MAP, WEAPONS, PACK_PRICES, GIFT_PRICES, ARMORY_UPGRADE_COST, ARMORY_UPGRADE_MINUTES } from '../data/weapons';
import { ACHIEVEMENTS, rankingScore } from '../data/achievements';
import {
  getTeamTcp,
  getFullSquadTcp,
  getDeployIds,
  canAutoBattle,
  canManualWin,
  performGachaPull,
  applyGachaResult,
  updateLegendaryStat,
  getCharacterPower,
} from '../core/formulas';
import {
  rollWeapon,
  rollPack,
  getOpenCost,
  canUpgradeArmory,
  startArmoryUpgrade,
  finishArmoryUpgradeIfReady,
  skipArmoryUpgrade,
  getUpgradeRemainingMs,
  equipWeapon,
  sellWeapon,
  compareAndMaybeEquip,
} from '../systems/ArmorySystem';
import { showRewardedAd, canShowAd, getRemainingAds, hasShopDiscount } from '../systems/AdSystem';
import { claimAchievement, sendGift, getClaimableAchievements } from '../systems/AchievementSystem';
import { startCombat } from '../game/Game';
import { squadSlotsForStage } from '../data/chapters';
import {
  UI_ASSETS,
  rarityFrame,
  featuredCharDisplay,
  renderCharPortrait,
  hasPortraitFlip,
  type PortraitSide,
} from './uiAssets';
import type { SaveData } from '../types';

type Module = 'map' | 'home' | 'shop' | 'squad';
type View = 'hub' | Module;

interface RewardPopup {
  title: string;
  lines: string[];
}

export class App {
  private uiRoot: HTMLElement;
  private gameRoot: HTMLElement;
  private view: View = 'hub';
  private selectedStage = 1;
  private lastRollMsg = '';
  private rewardPopup: RewardPopup | null = null;
  private inCombat = false;
  private portraitSide: PortraitSide = 'front';

  constructor() {
    this.uiRoot = document.getElementById('ui-root')!;
    this.gameRoot = document.getElementById('game-root')!;
    finishArmoryUpgradeIfReady(saveManager.get());
    this.render();
  }

  private save(): SaveData {
    return saveManager.get();
  }

  private refresh(): void {
    finishArmoryUpgradeIfReady(saveManager.get());
    updateLegendaryStat(saveManager.get());
    saveManager.save();
    if (!this.inCombat) this.render();
  }

  private render(): void {
    const s = this.save();
    this.uiRoot.innerHTML = `
      <div class="shell ${this.view === 'hub' ? 'shell-hub' : ''}">
        <div class="bg-layer" aria-hidden="true"></div>
        <div class="scanlines" aria-hidden="true"></div>
        <header class="top-bar hud-bar cc-header ${this.view === 'hub' ? 'cc-header-hub' : ''}">
          <div class="brand cc-brand">
            <img class="brand-emblem" src="${UI_ASSETS.nav.squad}" alt="" />
            <div>
              <span class="brand-tag">${this.view === 'hub' ? 'COMMANDER · 总控制' : 'COMMANDER · 总队长'}</span>
              <span class="brand-name">锈带纪元</span>
            </div>
          </div>
          <div class="resources cc-resources">
            <div class="res-pill res-gold"><img src="${UI_ASSETS.res.gold}" alt="" /><span class="res-val">${s.gold}</span></div>
            <div class="res-pill res-ticket"><img src="${UI_ASSETS.res.ticket}" alt="" /><span class="res-val">${s.tickets}</span></div>
            <div class="res-pill res-ad"><span class="res-icon">📺</span><span class="res-val">${getRemainingAds(s)}/${ECONOMY.dailyAdLimit}</span></div>
          </div>
        </header>
        <main class="content cc-content ${this.view === 'hub' ? 'content-hub' : 'content-sub'}">${this.renderContent()}</main>
      </div>
      ${this.renderRewardPopup()}
    `;
    this.bindEvents();
  }

  private renderRewardPopup(): string {
    if (!this.rewardPopup) return '';
    const lines = this.rewardPopup.lines.map((l) => `<li>${l}</li>`).join('');
    return `
      <div class="reward-overlay" data-reward-overlay>
        <div class="reward-modal card hud-card">
          <div class="modal-corner tl"></div><div class="modal-corner tr"></div>
          <div class="modal-corner bl"></div><div class="modal-corner br"></div>
          <h3>${this.rewardPopup.title}</h3>
          <ul class="reward-list">${lines}</ul>
          <button class="btn btn-primary" data-close-reward>确认领取</button>
        </div>
      </div>
    `;
  }

  private sectionHead(title: string, sub: string): string {
    return `<div class="section-head"><span class="section-line"></span><h2>${title}</h2><span class="section-sub">${sub}</span></div>`;
  }

  private hubNavBtn(
    id: Module,
    iconSrc: string,
    label: string,
    sub: string,
    primary = false,
    badge = 0,
  ): string {
    if (primary) {
      return `<button class="hub-nav-btn hub-nav-ops" data-goto="${id}">
        <img class="hub-nav-ops-icon" src="${iconSrc}" alt="" />
        <span class="hub-nav-ops-body">
          <span class="hub-nav-label">${label}</span>
          <span class="hub-nav-sub">${sub}</span>
        </span>
      </button>`;
    }
    return `<button class="hub-nav-btn hub-nav-square" data-goto="${id}">
      ${badge > 0 ? `<span class="hub-badge">${badge}</span>` : ''}
      <img src="${iconSrc}" alt="" />
      <span class="hub-nav-label">${label}</span>
      <span class="hub-nav-sub">${sub}</span>
    </button>`;
  }

  private wrapSub(title: string, sub: string, inner: string): string {
    return `
      <div class="sub-screen">
        <button class="hub-back" data-back-hub>
          <span class="hub-back-arrow">←</span>
          <span>返回指挥部</span>
        </button>
        ${this.sectionHead(title, sub)}
        ${inner}
      </div>
    `;
  }

  private portraitFlipBtn(charId: string): string {
    if (!hasPortraitFlip(charId)) return '';
    const label = this.portraitSide === 'front' ? '背面' : '正面';
    return `<button class="portrait-flip-btn" data-flip-portrait type="button">${label}</button>`;
  }

  private renderHub(): string {
    const s = this.save();
    const feat = featuredCharDisplay(s.squad);
    const tcp = getFullSquadTcp(s);
    const claimable = getClaimableAchievements(s).length;
    const highest = s.stats.highestStage;

    return `
      <section class="hub-screen">
        <div class="hub-stage">
          <img class="hub-bg" src="${UI_ASSETS.kanbanBg}" alt="" />
          <div class="hub-char-zone">
            ${renderCharPortrait(feat.id, this.portraitSide, 'hub-char-portrait', 'hub-char-icon')}
          </div>
          <div class="hub-meta-tr">
            <span class="hub-kanban-tag">看板娘 · KANBAN</span>
            <h2 class="hub-char-title">${feat.name}</h2>
            <div class="hub-char-pills">
              <span class="hub-pill hub-pill-rarity ${feat.rarity}">${feat.rarity}</span>
              <span class="hub-pill hub-pill-tag">${feat.tagShort}</span>
              ${this.portraitFlipBtn(feat.id)}
            </div>
          </div>
          <nav class="hub-menu-rail">
            ${this.hubNavBtn('map', UI_ASSETS.nav.map, '作战出击', 'OPS', true)}
            ${this.hubNavBtn('home', UI_ASSETS.nav.home, '总控', 'BASE', false, claimable)}
            ${this.hubNavBtn('squad', UI_ASSETS.nav.squad, '编队', 'UNIT')}
            ${this.hubNavBtn('shop', UI_ASSETS.nav.shop, '构建', 'BUILD')}
          </nav>
          <footer class="hub-status-bar">
            <div class="hub-stat"><small>TCP</small><b>${tcp}</b></div>
            <div class="hub-stat"><small>最高关卡</small><b>${highest || '—'}</b></div>
            <div class="hub-stat"><small>构装体</small><b>${s.stats.charactersOwned}</b></div>
          </footer>
        </div>
      </section>
    `;
  }

  private renderContent(): string {
    if (this.view === 'hub') return this.renderHub();
    switch (this.view) {
      case 'map':
        return this.wrapSub('星系作战', 'OPERATION', this.renderMap());
      case 'home':
        return this.wrapSub('零号月台', 'HOME BASE', this.renderHome());
      case 'shop':
        return this.wrapSub('构建中心', 'BUILD', this.renderShop());
      case 'squad':
        return this.wrapSub(
          `战术编队 · TCP ${getFullSquadTcp(this.save())}`,
          'COMBAT UNIT',
          this.renderSquad(),
        );
    }
  }

  private renderMap(): string {
    const s = this.save();
    const stage = STAGE_MAP[this.selectedStage];
    const slots = squadSlotsForStage(this.selectedStage);
    const battleTcp = getTeamTcp(s, this.selectedStage);
    const squadTcp = getFullSquadTcp(s);
    const deployIds = getDeployIds(s, this.selectedStage);
    const cleared = s.clearedStages.includes(this.selectedStage);
    const canAuto = canAutoBattle(s, this.selectedStage, stage.recommendedTcp);
    const winnable = canManualWin(battleTcp, stage.recommendedTcp, stage.isBoss);

    const deployList = deployIds
      .map((cid) => {
        const c = CHARACTER_MAP[cid];
        const oc = s.ownedCharacters.find((o) => o.characterId === cid);
        const p = oc ? getCharacterPower(cid, oc.weaponId) : 0;
        return `${c.icon}${c.name}(${p})`;
      })
      .join('、');

    const chapterStages = STAGES.filter((st) => st.chapter === stage.chapter);

    return `
      <section class="panel panel-map cc-panel">
        <div class="chapter-tabs cc-chapters">
          ${CHAPTERS.map(
            (c) =>
              `<button class="chip ${c.id === stage.chapter ? 'active' : ''}" data-chapter="${c.id}">${c.name}</button>`,
          ).join('')}
        </div>
        <div class="stage-grid">
          ${chapterStages
            .map((st) => {
              const done = s.clearedStages.includes(st.id);
              const cur = st.id === this.selectedStage;
              return `<button class="stage-btn cc-hex ${done ? 'done' : ''} ${cur ? 'cur' : ''} ${st.isBoss ? 'boss' : ''}" data-stage="${st.id}">
                <img class="stage-hex-bg" src="${UI_ASSETS.stageHex}" alt="" />
                <span class="stage-num">${st.id}${st.isBoss ? '★' : ''}</span>
              </button>`;
            })
            .join('')}
        </div>
        <div class="stage-detail card hud-card stage-brief">
          <div class="card-shine"></div>
          <h3>${stage.name}</h3>
          <p>本关可出战 <strong>${slots}</strong> 人 · 推荐 TCP <strong>${stage.recommendedTcp}</strong></p>
          <p>出战 TCP：<strong class="${battleTcp >= stage.recommendedTcp ? 'good' : 'warn'}">${battleTcp}</strong>
            ${squadTcp !== battleTcp ? ` · 编队总战力 <strong>${squadTcp}</strong>（本关仅计前 ${slots} 人）` : ''}
          </p>
          <p class="muted">出战：${deployList || '未编队'}</p>
          <p>类型：${stage.type} · 限时 ${stage.timer}s · ${stage.waves} 波</p>
          <p>首通 ${stage.firstClearGold} 币 · 扫荡 ${stage.sweepGold} 币</p>
          ${cleared ? '<span class="badge done-badge">已通关</span>' : winnable ? '<span class="badge ok-badge">可挑战</span>' : '<span class="badge bad-badge">战力不足</span>'}
        </div>
        <div class="actions">
          ${
            cleared
              ? `<button class="btn btn-primary" data-action="fight">手动战斗</button>
                 <button class="btn btn-secondary" data-action="sweep">扫荡</button>`
              : `<button class="btn btn-primary" data-action="fight" ${!winnable ? 'disabled' : ''}>${canAuto ? '自动战斗' : '手动战斗'}</button>`
          }
          <button class="btn btn-ad" data-action="ad-stage" ${!canShowAd(s, 'stage_double', this.selectedStage) ? 'disabled' : ''}>📺 双倍奖励</button>
        </div>
      </section>
    `;
  }

  private renderHome(): string {
    const s = this.save();
    const score = rankingScore(s.stats);
    const claimable = getClaimableAchievements(s);
    const feat = featuredCharDisplay(s.squad);

    return `
      <section class="panel panel-home cc-panel">
        <div class="home-featured card hud-card">
          <div class="home-featured-portrait">
            <img class="char-frame-bg" src="${rarityFrame(feat.rarity)}" alt="" />
            ${renderCharPortrait(feat.id, this.portraitSide, 'home-char-portrait', 'home-char-icon')}
          </div>
          <div class="home-featured-meta">
            <span class="kanban-label">看板构装体 · ${this.portraitSide === 'front' ? '正面' : '背面'}</span>
            <strong>${feat.name}</strong>
            <span class="rarity ${feat.rarity}">${feat.rarity}</span>
            ${this.portraitFlipBtn(feat.id)}
          </div>
        </div>
        <div class="stats-row card hud-card">
          <div><b>${score}</b><small>排行积分</small></div>
          <div><b>${s.stats.stagesCleared}</b><small>通关数</small></div>
          <div><b>${s.stats.totalKills}</b><small>击杀数</small></div>
          <div><b>${s.stats.charactersOwned}</b><small>角色数</small></div>
        </div>

        <h3 class="sub-head">◈ 机械少女档案</h3>
        <div class="char-list">
          ${s.ownedCharacters
            .map((oc) => {
              const c = CHARACTER_MAP[oc.characterId];
              const w = oc.weaponId ? WEAPON_MAP[oc.weaponId] : null;
              const power = getCharacterPower(oc.characterId, oc.weaponId);
              return `
                <div class="card char-card hud-card cc-char-card">
                  <div class="char-portrait">
                    <img class="char-frame-bg" src="${rarityFrame(c.rarity)}" alt="" />
                    ${renderCharPortrait(
                      oc.characterId,
                      oc.characterId === feat.id ? this.portraitSide : 'front',
                      'char-portrait-img',
                      'char-icon-frame',
                    )}
                  </div>
                  <div class="char-info">
                    <strong>${c.name}</strong>
                    <span class="rarity ${c.rarity}">${c.rarity}</span>
                    <p>战力 ${power} ${w ? `· ${w.icon}${w.name}` : '· 无武器'}</p>
                    <p class="bio">${c.bio}</p>
                    <p class="muted">${c.age} · 礼物 ${oc.giftCount}</p>
                    ${c.skillName ? `<p class="skill">⚡ ${c.skillName}：${c.skillDesc}</p>` : ''}
                    <div class="gift-row">
                      ${GIFT_PRICES.map(
                        (p, i) =>
                          `<button class="btn btn-sm" data-gift="${oc.characterId}" data-price="${p}">🎁${p}</button>`,
                      ).join('')}
                    </div>
                  </div>
                </div>`;
            })
            .join('')}
        </div>

        <h3 class="sub-head">◈ 成就系统 ${claimable.length ? `<em class="highlight">${claimable.length} 可领</em>` : ''}</h3>
        <div class="ach-list">
          ${ACHIEVEMENTS.map((a) => {
            const done = a.check(s.stats);
            const claimed = s.achievementsClaimed.includes(a.id);
            return `<div class="card ach-card ${claimed ? 'claimed' : done ? 'ready' : ''}">
              <strong>${a.name}</strong>
              <p>${a.desc}</p>
              <small>🪙${a.rewardGold} 🎫${a.rewardTickets}</small>
              ${done && !claimed ? `<button class="btn btn-sm btn-primary" data-claim="${a.id}">领取</button>` : claimed ? '✅' : '🔒'}
            </div>`;
          }).join('')}
        </div>

        <div class="actions">
          <button class="btn btn-danger" data-action="reset">重置存档</button>
        </div>
      </section>
    `;
  }

  private renderShop(): string {
    const s = this.save();
    finishArmoryUpgradeIfReady(s);
    const upgrading = s.armoryUpgradeEnd !== null;
    const remain = getUpgradeRemainingMs(s);
    const mins = Math.ceil(remain / 60000);
    const openPrice = getOpenCost(s, hasShopDiscount(s));
    const nextCost = s.armoryLevel < 8 ? ARMORY_UPGRADE_COST[s.armoryLevel] : 0;

    return `
      <section class="panel panel-shop cc-panel">
        <img class="gacha-banner" src="${UI_ASSETS.gachaBanner}" alt="构建" />
        ${this.lastRollMsg ? `<div class="toast hud-toast">${this.lastRollMsg}</div>` : ''}

        <div class="card shop-block hud-card cc-build-card">
          <h3 class="block-title"><span class="block-icon">◆</span>唤醒协议 · 构装体招募</h3>
          <p>SR 86% · SSR 12.5% · UR 1.5% · 保底 ${GACHA_PITY}（当前 ${s.gachaPity}）</p>
          <div class="actions">
            <button class="btn btn-primary" data-action="pull1">单抽 900🪙 / 1🎫</button>
            <button class="btn btn-primary" data-action="pull10">十连 8000🪙 / 10🎫</button>
            <button class="btn btn-ad" data-action="ad-ticket" ${!canShowAd(s, 'daily_ticket') ? 'disabled' : ''}>📺 广告领券</button>
          </div>
        </div>

        <div class="card shop-block hud-card">
          <h3 class="block-title"><span class="block-icon">📦</span>军械箱 · ARMORY Lv.${s.armoryLevel}</h3>
          <p>开箱 ${openPrice}🪙 ${hasShopDiscount(s) ? '（九折已激活）' : ''}</p>
          ${
            upgrading
              ? `<p>升级中… 剩余约 ${mins} 分钟</p>
                 <button class="btn btn-ad" data-action="ad-skip" ${!canShowAd(s, 'box_skip') ? 'disabled' : ''}>📺 跳过等待</button>`
              : s.armoryLevel < 8
                ? `<p>升级至 Lv.${s.armoryLevel + 1}：${nextCost}🪙 · ${ARMORY_UPGRADE_MINUTES[s.armoryLevel]} 分钟</p>
                   <button class="btn btn-secondary" data-action="upgrade-box" ${!canUpgradeArmory(s) || s.gold < nextCost ? 'disabled' : ''}>升级军械箱</button>`
                : '<p>已满级</p>'
          }
          <div class="actions">
            <button class="btn btn-primary" data-action="open-box" ${s.gold < openPrice ? 'disabled' : ''}>开启军械箱</button>
            <button class="btn btn-ad" data-action="ad-opens" ${!canShowAd(s, 'extra_opens') ? 'disabled' : ''}>📺 +2 免费开箱</button>
            <button class="btn btn-ad" data-action="ad-discount" ${!canShowAd(s, 'shop_discount') ? 'disabled' : ''}>📺 九折券</button>
          </div>
        </div>

        <div class="card shop-block hud-card">
          <h3 class="block-title"><span class="block-icon">🎁</span>前线补给 · SUPPLY</h3>
          <div class="actions">
            <button class="btn btn-secondary" data-action="pack-normal">普通 ${PACK_PRICES.normal}🪙</button>
            <button class="btn btn-secondary" data-action="pack-advanced">高级 ${PACK_PRICES.advanced}🪙</button>
            <button class="btn btn-secondary" data-action="pack-legend">传说 ${PACK_PRICES.legendary}🪙</button>
          </div>
        </div>

        <h3 class="sub-head">◈ 武器背包</h3>
        <div class="weapon-grid">
          ${s.ownedWeaponIds
            .map((wid) => {
              const w = WEAPON_MAP[wid];
              const equipped = s.ownedCharacters.some((c) => c.weaponId === wid);
              return `<div class="card weapon-card ${w.rarity}">
                <div>${w.icon}</div>
                <strong>${w.name}</strong>
                <span>战力 ${w.power}</span>
                <small>${w.rarity} · 售 ${w.sellPrice}</small>
                ${equipped ? '<em>已装备</em>' : `<button class="btn btn-sm" data-sell="${wid}">出售</button>`}
              </div>`;
            })
            .join('')}
        </div>
      </section>
    `;
  }

  private renderSquad(): string {
    const s = this.save();
    const stageSlots = squadSlotsForStage(this.selectedStage);
    const battleTcp = getTeamTcp(s, this.selectedStage);

    return `
      <section class="panel panel-squad cc-panel">
        <p class="muted">关 1-5 出战 1 人 · 6-15 出战 2 人 · 16+ 出战 3 人</p>
        <p class="muted">当前选中关 ${this.selectedStage}：可出战 ${stageSlots} 人 · 出战 TCP <strong>${battleTcp}</strong></p>
        <div class="squad-slots">
          ${[0, 1, 2]
            .map((i) => {
              const cid = s.squad[i];
              const deploysThisStage = i < stageSlots;
              if (!cid) return `<div class="card slot empty">空槽 ${i + 1}</div>`;
              const c = CHARACTER_MAP[cid];
              const oc = s.ownedCharacters.find((o) => o.characterId === cid)!;
              const w = oc.weaponId ? WEAPON_MAP[oc.weaponId] : null;
              return `<div class="card slot ${deploysThisStage ? 'deploy-active' : 'deploy-bench'}">
                <span>${c.icon} ${c.name} ${deploysThisStage ? '<em class="deploy-tag">本关出战</em>' : '<em class="deploy-tag bench">替补</em>'}</span>
                <span>战力 ${getCharacterPower(cid, oc.weaponId)}</span>
                <span>${w ? w.icon + w.name : '无武器'}</span>
                <button class="btn btn-sm" data-remove-squad="${cid}">移除</button>
              </div>`;
            })
            .join('')}
        </div>
        <h3 class="sub-head">◈ 可用机体</h3>
        <div class="char-pick">
          ${s.ownedCharacters
            .map((oc) => {
              const c = CHARACTER_MAP[oc.characterId];
              const inSquad = s.squad.includes(oc.characterId);
              return `<button class="btn ${inSquad ? 'active' : ''}" data-add-squad="${oc.characterId}" ${inSquad ? 'disabled' : ''}>
                ${c.icon} ${c.name}
              </button>`;
            })
            .join('')}
        </div>
        <h3 class="sub-head">◈ 快速武装</h3>
        <div class="equip-list">
          ${s.ownedCharacters
            .map((oc) => {
              const c = CHARACTER_MAP[oc.characterId];
              return `<div class="equip-row">
                <span>${c.icon} ${c.name}</span>
                <select data-equip-char="${oc.characterId}">
                  <option value="">无武器</option>
                  ${s.ownedWeaponIds
                    .map((wid) => {
                      const w = WEAPON_MAP[wid];
                      return `<option value="${wid}" ${oc.weaponId === wid ? 'selected' : ''}>${w.icon} ${w.name} (${w.power})</option>`;
                    })
                    .join('')}
                </select>
              </div>`;
            })
            .join('')}
        </div>
      </section>
    `;
  }

  private bindEvents(): void {
    this.uiRoot.querySelectorAll('[data-goto]').forEach((el) => {
      el.addEventListener('click', () => {
        this.view = (el as HTMLElement).dataset.goto as Module;
        this.lastRollMsg = '';
        this.render();
      });
    });

    this.uiRoot.querySelector('[data-back-hub]')?.addEventListener('click', () => {
      this.view = 'hub';
      this.lastRollMsg = '';
      this.render();
    });

    this.uiRoot.querySelector('[data-flip-portrait]')?.addEventListener('click', () => {
      this.portraitSide = this.portraitSide === 'front' ? 'back' : 'front';
      this.render();
    });

    this.uiRoot.querySelectorAll('[data-chapter]').forEach((el) => {
      el.addEventListener('click', () => {
        const ch = Number((el as HTMLElement).dataset.chapter);
        this.selectedStage = (ch - 1) * 8 + 1;
        this.render();
      });
    });

    this.uiRoot.querySelectorAll('[data-stage]').forEach((el) => {
      el.addEventListener('click', () => {
        this.selectedStage = Number((el as HTMLElement).dataset.stage);
        this.render();
      });
    });

    this.uiRoot.querySelector('[data-action="fight"]')?.addEventListener('click', () => {
      const s = this.save();
      const stage = STAGE_MAP[this.selectedStage];
      const auto = canAutoBattle(s, this.selectedStage, stage.recommendedTcp);
      this.startFight(auto);
    });
    this.uiRoot.querySelector('[data-action="sweep"]')?.addEventListener('click', () => this.sweep());
    this.uiRoot.querySelector('[data-action="ad-stage"]')?.addEventListener('click', () => this.adStageDouble());
    this.uiRoot.querySelector('[data-action="reset"]')?.addEventListener('click', () => {
      if (confirm('确定重置存档？')) {
        saveManager.reset();
        this.render();
      }
    });

    this.uiRoot.querySelectorAll('[data-claim]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = (el as HTMLElement).dataset.claim!;
        saveManager.mutate((d) => claimAchievement(d, id));
        this.render();
      });
    });

    this.uiRoot.querySelectorAll('[data-gift]').forEach((el) => {
      el.addEventListener('click', () => {
        const char = (el as HTMLElement).dataset.gift!;
        const price = Number((el as HTMLElement).dataset.price);
        saveManager.mutate((d) => sendGift(d, char, price));
        this.render();
      });
    });

    this.uiRoot.querySelector('[data-action="pull1"]')?.addEventListener('click', () => this.gacha(1));
    this.uiRoot.querySelector('[data-action="pull10"]')?.addEventListener('click', () => this.gacha(10));
    this.uiRoot.querySelector('[data-action="open-box"]')?.addEventListener('click', () => this.openBox(1));
    this.uiRoot.querySelector('[data-action="upgrade-box"]')?.addEventListener('click', () => {
      saveManager.mutate((d) => startArmoryUpgrade(d));
      this.render();
    });
    this.uiRoot.querySelector('[data-action="pack-normal"]')?.addEventListener('click', () => this.buyPack('normal'));
    this.uiRoot.querySelector('[data-action="pack-advanced"]')?.addEventListener('click', () => this.buyPack('advanced'));
    this.uiRoot.querySelector('[data-action="pack-legend"]')?.addEventListener('click', () => this.buyPack('legendary'));

    this.uiRoot.querySelectorAll('[data-sell]').forEach((el) => {
      el.addEventListener('click', () => {
        const wid = (el as HTMLElement).dataset.sell!;
        saveManager.mutate((d) => {
          const r = sellWeapon(d, wid);
          this.lastRollMsg = r.msg;
        });
        this.render();
      });
    });

    this.uiRoot.querySelectorAll('[data-add-squad]').forEach((el) => {
      el.addEventListener('click', () => {
        const cid = (el as HTMLElement).dataset.addSquad!;
        saveManager.mutate((d) => {
          if (d.squad.length < 3 && !d.squad.includes(cid)) d.squad.push(cid);
        });
        this.render();
      });
    });

    this.uiRoot.querySelectorAll('[data-remove-squad]').forEach((el) => {
      el.addEventListener('click', () => {
        const cid = (el as HTMLElement).dataset.removeSquad!;
        saveManager.mutate((d) => {
          d.squad = d.squad.filter((id) => id !== cid);
        });
        this.render();
      });
    });

    this.uiRoot.querySelectorAll('[data-equip-char]').forEach((el) => {
      el.addEventListener('change', () => {
        const char = (el as HTMLElement).dataset.equipChar!;
        const wid = (el as HTMLSelectElement).value;
        saveManager.mutate((d) => {
          if (wid) equipWeapon(d, char, wid);
          else {
            const oc = d.ownedCharacters.find((c) => c.characterId === char);
            if (oc) oc.weaponId = null;
          }
          updateLegendaryStat(d);
        });
        this.render();
      });
    });

    this.uiRoot.querySelector('[data-action="ad-ticket"]')?.addEventListener('click', () => this.runAd('daily_ticket'));
    this.uiRoot.querySelector('[data-action="ad-skip"]')?.addEventListener('click', () => this.runAd('box_skip', () => {
      saveManager.mutate((d) => skipArmoryUpgrade(d));
    }));
    this.uiRoot.querySelector('[data-action="ad-opens"]')?.addEventListener('click', () => this.runAd('extra_opens', () => this.openBox(2, true)));
    this.uiRoot.querySelector('[data-action="ad-discount"]')?.addEventListener('click', () => this.runAd('shop_discount'));

    this.uiRoot.querySelector('[data-close-reward]')?.addEventListener('click', () => {
      this.rewardPopup = null;
      this.render();
    });
    this.uiRoot.querySelector('[data-reward-overlay]')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).dataset.rewardOverlay) {
        this.rewardPopup = null;
        this.render();
      }
    });
  }

  private async runAd(type: Parameters<typeof showRewardedAd>[1], cb?: () => void): Promise<void> {
    const ok = await showRewardedAd(saveManager.get(), type);
    if (ok) {
      cb?.();
      saveManager.save();
      this.render();
    }
  }

  private gacha(count: number): void {
    saveManager.mutate((d) => {
      const goldCost = count === 1 ? ECONOMY.singlePullGold : ECONOMY.tenPullGold;
      const useTicket = d.tickets >= count;
      if (!useTicket && d.gold < goldCost) {
        this.lastRollMsg = '锈币/抽卡券不足';
        return;
      }
      if (useTicket) d.tickets -= count;
      else d.gold -= goldCost;

      const results: string[] = [];
      for (let i = 0; i < count; i++) {
        const r = performGachaPull(d);
        applyGachaResult(d, r);
        const c = CHARACTER_MAP[r.characterId];
        results.push(`${c.icon}${c.name}${r.duplicate ? '(重复+' + r.goldRefund + ')' : ''}`);
      }
      this.lastRollMsg = results.join(' · ');
    });
    this.render();
  }

  private openBox(times: number, free = false): void {
    saveManager.mutate((d) => {
      const char = d.squad[0] ?? d.ownedCharacters[0]?.characterId;
      if (!char) return;
      for (let i = 0; i < times; i++) {
        if (!free) {
          const cost = getOpenCost(d, hasShopDiscount(d));
          if (d.gold < cost) {
            this.lastRollMsg = '锈币不足';
            return;
          }
          d.gold -= cost;
        }
        const weapon = rollWeapon(d.armoryLevel);
        this.lastRollMsg = compareAndMaybeEquip(d, char, weapon);
      }
      updateLegendaryStat(d);
    });
    this.render();
  }

  private buyPack(type: 'normal' | 'advanced' | 'legendary'): void {
    saveManager.mutate((d) => {
      const price = PACK_PRICES[type];
      if (d.gold < price) {
        this.lastRollMsg = '锈币不足';
        return;
      }
      d.gold -= price;
      const char = d.squad[0] ?? d.ownedCharacters[0]?.characterId;
      const weapon = rollPack(type);
      this.lastRollMsg = compareAndMaybeEquip(d, char!, weapon);
      updateLegendaryStat(d);
    });
    this.render();
  }

  private sweep(): void {
    const stage = STAGE_MAP[this.selectedStage];
    saveManager.mutate((d) => {
      d.gold += stage.sweepGold;
    });
    this.rewardPopup = {
      title: '扫荡完成',
      lines: [
        `关卡：${stage.name}`,
        `🪙 锈币 +${stage.sweepGold}`,
        `当前锈币：${saveManager.get().gold}`,
      ],
    };
    this.render();
  }

  private async adStageDouble(): Promise<void> {
    const stage = STAGE_MAP[this.selectedStage];
    const ok = await showRewardedAd(saveManager.get(), 'stage_double', this.selectedStage);
    if (ok) {
      saveManager.mutate((d) => {
        d.gold += stage.firstClearGold;
      });
      this.lastRollMsg = `广告双倍 +${stage.firstClearGold} 锈币`;
      saveManager.save();
      this.render();
    }
  }

  private startFight(auto: boolean): void {
    const s = this.save();
    const stage = STAGE_MAP[this.selectedStage];
    const tcp = getTeamTcp(s, this.selectedStage);
    const cleared = s.clearedStages.includes(this.selectedStage);

    const slots = squadSlotsForStage(this.selectedStage);
    const squadIds = s.squad.slice(0, slots);
    if (!squadIds.length) {
      alert('请先编队');
      this.view = 'squad';
      this.render();
      return;
    }

    const useAuto =
      !cleared && (auto || canAutoBattle(s, this.selectedStage, stage.recommendedTcp));

    if (useAuto && canAutoBattle(s, this.selectedStage, stage.recommendedTcp)) {
      this.resolveInstantWin(stage, tcp);
      return;
    }

    if (!cleared && !canManualWin(tcp, stage.recommendedTcp, stage.isBoss)) {
      alert('战力不足，请升级武器或抽卡');
      return;
    }

    this.inCombat = true;
    this.uiRoot.classList.add('hidden');
    this.gameRoot.classList.add('visible');

    startCombat(this.gameRoot, {
      stage,
      tcp,
      squadIds,
      autoMode: false,
      onComplete: (result) => this.onCombatDone(result.victory, result.kills, stage),
    });
  }

  private resolveInstantWin(stage: typeof STAGE_MAP[number], tcp: number): void {
    saveManager.mutate((d) => {
      d.clearedStages.push(stage.id);
      d.gold += stage.firstClearGold;
      d.stats.totalKills += stage.waves * 6;
      for (const bonus of STARTER.bonusTickets) {
        if (bonus.stage === stage.id) d.tickets += bonus.amount;
      }
    });
    alert(`自动战斗胜利！+${stage.firstClearGold} 锈币`);
    this.render();
  }

  private async onCombatDone(victory: boolean, kills: number, stage: typeof STAGE_MAP[number]): Promise<void> {
    this.inCombat = false;
    this.gameRoot.classList.remove('visible');
    this.uiRoot.classList.remove('hidden');

    if (!victory && stage.isBoss && canShowAd(saveManager.get(), 'boss_revive', stage.id)) {
      const ok = await showRewardedAd(saveManager.get(), 'boss_revive', stage.id);
      if (ok) {
        this.startFight(false);
        return;
      }
    }

    if (victory) {
      const wasCleared = saveManager.get().clearedStages.includes(stage.id);
      saveManager.mutate((d) => {
        if (!d.clearedStages.includes(stage.id)) {
          d.clearedStages.push(stage.id);
          d.gold += stage.firstClearGold;
          for (const bonus of STARTER.bonusTickets) {
            if (bonus.stage === stage.id) d.tickets += bonus.amount;
          }
        }
        d.stats.totalKills += kills;
        updateLegendaryStat(d);
      });
      alert(
        wasCleared
          ? `胜利！击杀 ${kills}（重复通关无首通奖励）`
          : `胜利！+${stage.firstClearGold} 锈币 · 击杀 ${kills}`,
      );
    } else {
      alert('战斗失败，升级武器后再来');
    }

    this.render();
  }
}

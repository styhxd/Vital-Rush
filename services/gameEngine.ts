

/**
 * ------------------------------------------------------------------
 * COPYRIGHT (c) 2026 ESTÚDIO CRIA
 * DIRETOR: PAULO GABRIEL DE L. S.
 * ------------------------------------------------------------------
 * 
 * A BESTA (GAME ENGINE) - PROTOCOLO "NEON LITE" (GRADIENT EDITION)
 * 
 * ATUALIZAÇÃO V4.8: MUTAÇÕES PROCEDURAIS DE ELITE
 */

import { Entity, EntityType, Vector2, PlayerStats, WaveConfig, PatientProfile, Difficulty, ViralStrain, ThemePalette, Language } from '../types';
import { COLORS_PLATINUM, CANVAS_WIDTH, CANVAS_HEIGHT, WAVES, DIFFICULTY_MODIFIERS, INITIAL_LIVES, ADRENALINE_MAX_DURATION, TEXTS } from '../constants';
import { audioManager, type DrumHit } from './audioManager';
import { buzz } from './haptics';
import { achievementManager } from './achievementManager';
import { bossFor, drawBossShape, mutationFrom } from './bosses';
import { OrganDirector, cellBudget, cellColor, cellRises, organBg, rollCellStyle } from './organDirector';
const BOSS_GRACE = 1.15;

export interface BossCard {
  name: string;
  disease: string;
  line: string;
  color: string;
  shown: number;
}
const SIN_TABLE = new Float32Array(360);
const COS_TABLE = new Float32Array(360);
for (let i = 0; i < 360; i++) {
    SIN_TABLE[i] = Math.sin(i * Math.PI / 180);
    COS_TABLE[i] = Math.cos(i * Math.PI / 180);
}
const getSin = (idx: number) => SIN_TABLE[Math.floor(Math.abs(idx)) % 360];
const getCos = (idx: number) => COS_TABLE[Math.floor(Math.abs(idx)) % 360];

const distSq = (v1: Vector2, v2: Vector2) => {
    const dx = v2.x - v1.x;
    const dy = v2.y - v1.y;
    return dx * dx + dy * dy;
};

// Os primeiros abates rendem o mesmo de antes (+10% de dano por kill).
// Depois a cepa acostuma: o bônus ainda sobe, mas encosta perto de 6.3x
// em vez de crescer para sempre. Um combo de 3000 não pode valer 300x.
export const COMBO_RAMP_KILLS = 40;
const COMBO_TAIL = 1.35;
const COMBO_TAIL_SPAN = 140;

export function comboDamageMultiplier(combo: number): number {
    const chain = Math.max(0, combo);
    const ramp = Math.min(chain, COMBO_RAMP_KILLS) * 0.1;
    const beyond = chain - COMBO_RAMP_KILLS;
    if (beyond <= 0) return 1 + ramp;
    return 1 + ramp + COMBO_TAIL * (1 - Math.exp(-beyond / COMBO_TAIL_SPAN));
}

export function comboScoreMultiplier(combo: number): number {
    const chain = Math.max(0, combo);
    if (chain <= 0) return 1;
    return 1 + Math.sqrt(chain) * 0.5;
}

// A parede infinita só abre depois da onda 30 (índice 29), já dentro do cérebro.
const CAMPAIGN_LAST_INDEX = 29;

function wavesPastTheWall(waveIndex: number): number {
    return Math.max(0, waveIndex - CAMPAIGN_LAST_INDEX);
}

// 0 na onda 1, 1 na onda 30. A vida dos inimigos no máximo triplica, não decuplica.
function campaignPressure(waveIndex: number): number {
    const t = Math.min(Math.max(waveIndex, 0), CAMPAIGN_LAST_INDEX) / CAMPAIGN_LAST_INDEX;
    return Math.pow(t, 1.15);
}

// O mesmo chefe anda e ataca mais conforme a onda sobe. Onda 1 fica em 86% do passo escrito; a 30, em 118%.
function bossPace(waveIndex: number): number {
    const pressure = campaignPressure(waveIndex);
    return 0.86 + pressure * 0.32 + Math.min(0.1, wavesPastTheWall(waveIndex) * 0.008);
}

// Acima de 1 o chefe espera mais entre golpes. Onda 1 é 14% mais lenta; a 30, 8% mais rápida.
function bossHaste(waveIndex: number): number {
    const pressure = campaignPressure(waveIndex);
    return 1.14 - pressure * 0.22 - Math.min(0.06, wavesPastTheWall(waveIndex) * 0.005);
}

const GRID_CELL_SIZE = 150;
const GRID_COLS = Math.ceil(CANVAS_WIDTH / GRID_CELL_SIZE);
const GRID_ROWS = Math.ceil(CANVAS_HEIGHT / GRID_CELL_SIZE);
const MINE_FLOW = 0.7;
const MINE_WIND = 0.18;
const MINE_COAST = 0.986;

function hexToRgba(hex: string, alpha: number): string {
    if (hex.startsWith('#')) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return hex; 
}

export class GameEngine {
  public entities: Entity[] = [];
  public particles: Entity[] = []; 
  public player: Entity;
  
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private colors: ThemePalette;
  
  public score: number = 0;
  public biomass: number = 0;
  public time: number = 0;
  public energy: number = 0;
  public lives: number = INITIAL_LIVES;
  public language: Language = 'EN';
  
  public sessionStats = {
      enemiesKilled: 0,
      bossesKilled: 0,
      dashKills: 0,
      surgeKills: 0,
      mineKills: 0,
      critHits: 0,
      damageTaken: 0,
      maxCombo: 0,
      biomassCollected: 0,
      upgradesBought: 0,
      timePlayed: 0,
      bulletsFired: 0,
      idleTime: 0
  };
  
  private patient: PatientProfile;
  private difficultyMods: any;
  private currentDifficulty: Difficulty;

  public comboCount: number = 0;
  public comboTimer: number = 0;
  private readonly COMBO_DURATION = 2.5;
  private strainAdapted: boolean = false;
  
  public dashCooldownTimer: number = 0;
  public isDashing: boolean = false;
  public dashDuration: number = 0;
  private dashVector: Vector2 = { x: 0, y: 0 };
  private dashTrailTimer: number = 0;
  private dashStruck = new Set<string>();
  
  public currentWaveIndex: number = -1; 
  public waveTimer: number = 0;
  public waveActive: boolean = false;
  public bossSpawned: boolean = false;
  
  // NOVO: Controle de atraso inicial da onda (para tutoriais)
  public waveStartDelay: number = 0;

  public inputVector: Vector2 = { x: 0, y: 0 };
  private bloodFlow: Vector2 = { x: -0.35, y: 0 };
  public readonly organ = new OrganDirector();
  private bgR = 28;
  private bgG = 20;
  private bgB = 12;
  private bgFill = '#1c140c';
  private bgOrgan = ''; 
  private spawnTimer: number = 0;
  private regenTimer: number = 0;
  private leechLock: number = 0;
  private screenShake: Vector2 = { x: 0, y: 0 };
  private shakeIntensity: number = 0;
  
  private surgeActive: boolean = false;
  private deathSurgeActive: boolean = false; 
  private surgeRadius: number = 0;
  private surgeTouch = new Set<string>();
  private surgeZapAt = 0;
  public adrenalineActive: boolean = false;
  public adrenalineTimer: number = 0;
  public adrenalineExhausted: boolean = false;
  
  public invulnerabilityTimer: number = 0;
  public bossCard: BossCard | null = null;
  private bossCardAge = 0;
  private hitStopTimer: number = 0;
  private acidContact: number = 0;
  private acidBite: number = 0;
  private acidCue: number = 0;
  private acidDrip: number = 0;
  private bgGap: number = 0.6;
  private systemGlitchActive: boolean = false; // SURPRESA 2: Disparo falha após levar dano

  private clearBufferTimer: number = 0; 
  private isVacuuming: boolean = false; 
  private vacuumingTimer: number = 0; 
  
  public isLowQuality: boolean = false; 
  public forceHighQuality: boolean = false;
  public leanGraphics: boolean = false;
  public allowSerum: boolean = true;

  private serumClock: number = 72;
  private serumIntroduced: boolean = false;
  private serumReady: boolean = false;
  private hpMilestoneSent: boolean = false;

  private frameTimes: number[] = [];
  private perfCheckTimer: number = 0;
  
  private maxEntities = 350; 
  private grid: Map<number, Entity[]> = new Map();

  constructor(canvas: HTMLCanvasElement, initialStats: PlayerStats, patient: PatientProfile, difficulty: Difficulty, theme: ThemePalette) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false, desynchronized: true })!;
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    this.patient = patient;
    this.organ.setRoute(patient.route);
    this.currentDifficulty = difficulty;
    this.difficultyMods = DIFFICULTY_MODIFIERS[difficulty];
    this.colors = theme;
    const platinum = theme.BG === COLORS_PLATINUM.BG;
    this.bgFill = organBg('molar', platinum);
    this.bgR = parseInt(this.bgFill.slice(1, 3), 16);
    this.bgG = parseInt(this.bgFill.slice(3, 5), 16);
    this.bgB = parseInt(this.bgFill.slice(5, 7), 16);
    this.bgOrgan = 'molar';
    
    this.player = this.createPlayer(initialStats);
    this.forceHighQuality = true;
    
    for (let i = 0; i < cellBudget(this.organ.id); i++) this.spawnBackgroundCell(true);
  }

  public setLanguage(lang: Language) {
      this.language = lang;
      this.organ.setLanguage(lang);
  }

  private configFor(waveIndex: number): WaveConfig {
      const base = WAVES[waveIndex % WAVES.length];
      const lap = Math.floor(waveIndex / WAVES.length);
      if (lap <= 0) return { ...base, waveNumber: waveIndex + 1 };
      const tighten = Math.pow(0.9, lap);
      return {
          ...base,
          waveNumber: waveIndex + 1,
          spawnRate: Math.max(460, Math.round(base.spawnRate * tighten)),
          flowSpeed: base.flowSpeed * (1 + Math.min(0.35, lap * 0.06)),
      };
  }
  private t(key: string): string { return TEXTS[this.language][key] || key; }

  public consumeSerum(): boolean {
      if (!this.serumReady) return false;
      this.serumReady = false;
      return true;
  }

  private createPlayer(stats: PlayerStats): Entity {
    return {
      id: 'player',
      type: EntityType.PLAYER,
      pos: { x: CANVAS_WIDTH / 6, y: CANVAS_HEIGHT / 2 },
      vel: { x: 0, y: 0 },
      radius: 25,
      health: stats.maxHealth,
      maxHealth: stats.maxHealth,
      color: this.colors.PLAYER,
      damage: 0,
      active: true,
      drag: 0.92 
    };
  }

  public spawnBackgroundCell(init: boolean = false) {
      if (this.isLowQuality) return;

      const style = rollCellStyle(this.organ.id);
      const y = Math.random() * CANVAS_HEIGHT;
      const x = init ? Math.random() * CANVAS_WIDTH : CANVAS_WIDTH + 12 + Math.random() * 80;
      const big = Math.random() < (style === 7 ? 0.4 : 0.16);
      const size = style === 8 ? 1.6 + Math.random() * 1.8
          : style === 1 ? 2 + Math.random() * 2.2
          : big ? 8 + Math.random() * 6 : 3.2 + Math.random() * 4.2;
      const speed = (this.organ.id === 'heart' ? 1.4 : this.organ.id === 'brain' ? 0.35 : 0.7) + Math.random() * (this.organ.id === 'heart' ? 2.4 : 1.4);

      this.particles.push({
          id: 'bg',
          type: EntityType.PARTICLE,
          pos: { x, y },
          vel: { x: -speed, y: Math.random() * Math.PI * 2 },
          radius: size,
          health: 1, maxHealth: 1,
          color: cellColor(style, this.organ.id),
          damage: 0, active: true, ttl: 999999,
          value: style
      });
  }

  public spawnText(pos: Vector2, text: string, color: string, fontSize: number = 20) {
      let popups = 0;
      for (let i = 0; i < this.entities.length; i++) {
          if (this.entities[i].type === EntityType.TEXT_POPUP) popups++;
      }
      if (popups > 8) return;
      if (this.isLowQuality && popups > 3) return;

      this.entities.push({
          id: text, 
          type: EntityType.TEXT_POPUP,
          pos: { ...pos },
          vel: { x: 0, y: -1.5 },
          radius: fontSize,
          health: 1, maxHealth: 1,
          color: color,
          damage: 0, active: true, ttl: 40
      });
  }

  public spawnEnemy(config: WaveConfig) {
      if (this.waveTimer >= config.duration) return;

      const type = config.enemyTypes[Math.floor(Math.random() * config.enemyTypes.length)];
      const y = Math.random() * (CANVAS_HEIGHT - 100) + 50;
      const strain = this.patient.strain;
      
      let hp = 35;
      let dmg = 10;
      let speed = 0.6;
      let radius = 35;
      let color = this.colors.BACTERIA;
      let val = 10;
      let shootTimer = undefined;
      
      if (type === EntityType.BACTERIA) {
          hp = 35; dmg = 10; radius = 35; color = this.colors.BACTERIA; val = 10; speed = 0.6;
      } else if (type === EntityType.FUNGI) { 
          hp = 20; dmg = 15; radius = 25; color = this.colors.FUNGI; val = 15; speed = 2.2;
      } else if (type === EntityType.PARASITE) {
          hp = 108; dmg = 25; radius = 42; color = this.colors.PARASITE; val = 30; speed = 0.25;
      } else if (type === EntityType.VIRUS) { 
          hp = 90; dmg = 15; radius = 28; 
          color = this.colors.VIRUS; val = 45; speed = 0.1; 
          shootTimer = 3.5; 
      }

      if (strain === ViralStrain.TITAN) { hp *= 2.0; radius *= 1.2; speed *= 0.7; val *= 1.5; }
      if (strain === ViralStrain.SWARM) { hp *= 0.6; speed *= 1.1; val = Math.max(1, Math.floor(val * 0.7)); }
      if (strain === ViralStrain.VOLATILE) { speed *= 1.3; dmg *= 1.5; }

      hp *= this.difficultyMods.hp;
      dmg *= this.difficultyMods.dmg;
      val *= this.difficultyMods.score;
      radius *= this.difficultyMods.bulk ?? 1;
      
      // A rampa vai até a onda 30. O expoente da parede só entra depois do cérebro.
      const pastTheWall = wavesPastTheWall(this.currentWaveIndex);
      const pressure = campaignPressure(this.currentWaveIndex);
      const isElite = Math.random() < (0.04 + pressure * 0.08 + Math.min(0.06, pastTheWall * 0.008));
      if (isElite) {
          hp *= 2.4;
          dmg *= 1.5;
          val *= 3;
          radius *= 1.45;
          speed *= 0.85;
      }

      hp *= (1 + pressure * 2.35) * Math.pow(1.04, pastTheWall);
      dmg *= (1 + pressure * 0.75) * Math.pow(1.025, pastTheWall);
      val *= 1 + pressure * 0.9;

      this.entities.push({
          id: `e_${Date.now()}_${Math.random()}`,
          type: type,
          pos: { x: CANVAS_WIDTH + 50, y },
          vel: { x: -speed * (Math.random() * 0.5 + 0.5), y: (Math.random() - 0.5) * 0.5 },
          radius,
          health: hp, maxHealth: hp,
          color,
          damage: dmg,
          active: true,
          value: Math.floor(val),
          isElite,
          drag: type === EntityType.VIRUS ? 0.2 : 0.1, 
          hitFlash: 0,
          shootTimer
      });
  }

  private spawnMine() {
      const roll = Math.random();
      const side = roll < 1 / 3 ? 'left' : roll < 2 / 3 ? 'top' : 'bottom';
      const off = 28 + Math.random() * 36;
      const toss = 8.2 + Math.random() * 2.6;
      const driftX = this.bloodFlow.x * 0.9 * MINE_FLOW + this.organ.wind.x * MINE_WIND;
      const headwind = Math.max(0, -driftX);
      let x = 0;
      let y = 0;
      let vx = 0;
      let vy = 0;
      if (side === 'left') {
          x = -off;
          y = CANVAS_HEIGHT * (0.14 + Math.random() * 0.72);
          vx = toss + headwind * 3.4;
          vy = (Math.random() - 0.5) * 1.7;
      } else {
          const along = 0.1 + Math.random() * 0.74;
          x = CANVAS_WIDTH * along;
          y = side === 'top' ? -off : CANVAS_HEIGHT + off;
          const drop = toss * (0.9 + Math.random() * 0.22);
          vy = side === 'top' ? drop : -drop;
          vx = along < 0.24
              ? headwind * 2.6 + toss * 0.24
              : (Math.random() - 0.45) * toss * 0.2;
      }
      this.entities.push({
          id: `mine_${Date.now()}_${Math.random()}`, type: EntityType.BIO_MINE,
          pos: { x, y }, vel: { x: vx, y: vy },
          radius: 20, health: 10, maxHealth: 10, color: this.colors.BIO_MINE, damage: 150, active: true, drag: 0.1
      });
  }
  
  public spawnBoss(_config: WaveConfig) {
      const spec = bossFor(this.organ.id, this.organ.nextOrgan(this.currentWaveIndex));
      const mutation = mutationFrom(spec);
      const haste = bossHaste(this.currentWaveIndex);
      mutation.dashTimer *= haste;
      mutation.shootTimer *= haste;
      mutation.acidTimer *= haste;
      const pastTheWall = wavesPastTheWall(this.currentWaveIndex);
      const pressure = campaignPressure(this.currentWaveIndex);
      const hp = 1200 * spec.hp * this.difficultyMods.hp * (1 + pressure * 2.6) * Math.pow(1.05, pastTheWall);
      const dmg = 28 * this.difficultyMods.dmg * (1 + pressure * 0.7) * Math.pow(1.03, pastTheWall);

      this.entities.push({
          id: `boss_${spec.id}_${Date.now()}`,
          type: EntityType.BOSS,
          pos: { x: CANVAS_WIDTH + 200, y: CANVAS_HEIGHT / 2 },
          vel: { x: -0.5, y: 0 },
          radius: spec.radius,
          health: hp, maxHealth: hp,
          color: spec.color,
          damage: dmg,
          active: true,
          value: 1000 * this.difficultyMods.score,
          hitFlash: 0,
          drag: 0.1,
          isElite: true,
          mutation
      });

      audioManager.playSurge({ x: CANVAS_WIDTH * 0.82, y: CANVAS_HEIGHT / 2 });
      this.openBossCard(spec);
  }

  private openBossCard(spec: { short: Record<Language, string>; disease: Record<Language, string>; intro: Record<Language, string>; color: string }) {
      const lang = this.language;
      const line = spec.intro[lang];
      this.bossCard = {
          name: spec.short[lang],
          disease: spec.disease[lang],
          line,
          color: spec.color,
          shown: 0,
      };
      this.bossCardAge = 0;
      this.hitStopTimer = 0;
      this.shakeIntensity = 0;
      this.isDashing = false;
      this.inputVector.x = 0;
      this.inputVector.y = 0;
      for (const e of this.entities) {
          if (e.type === EntityType.ENEMY_PROJECTILE || e.type === EntityType.BIO_MINE) e.active = false;
      }
  }

  public advanceBossCard(): boolean {
      const card = this.bossCard;
      if (!card) return false;
      if (!Number.isFinite(card.shown) || card.shown < card.line.length) {
          card.shown = card.line.length;
          audioManager.playPage();
          return true;
      }
      this.closeBossCard();
      audioManager.playPage();
      return true;
  }

  private closeBossCard() {
      this.bossCard = null;
      this.bossCardAge = 0;
      this.invulnerabilityTimer = Math.max(this.invulnerabilityTimer, BOSS_GRACE);
  }

  private tickBossCard(dt: number) {
      const card = this.bossCard;
      if (!card) return;
      if (!card.line) card.line = '';
      if (!Number.isFinite(card.shown) || card.shown < 0) card.shown = 0;
      if (card.shown > card.line.length) card.shown = card.line.length;
      this.bossCardAge += dt;
      if (card.shown < card.line.length) {
          const next = Math.min(card.line.length, card.shown + dt * 34);
          if (Math.floor(next / 3) !== Math.floor(card.shown / 3)) audioManager.playGlyph();
          card.shown = next;
      }
      if (this.bossCardAge > 90) this.closeBossCard();
  }

  private tickPresentation(dtMs: number) {
      const dt = Math.min(0.05, Math.max(0, dtMs / 1000));
      this.hitStopTimer = 0;
      this.shakeIntensity = 0;
      this.isDashing = false;
      this.inputVector.x = 0;
      this.inputVector.y = 0;
      this.time += dtMs;
      if (this.bossCard) {
          this.tickBossCard(dt);
          return;
      }
      if (!this.organ.charting()) return;
      this.organ.begin(dt, dt / 0.016, false, {
          entities: this.entities,
          player: this.player,
          low: this.isLowQuality,
          time: this.time,
          t: (key: string) => this.t(key),
          hurt: () => {},
          heal: () => {},
          strike: () => {},
          shake: () => {},
          popup: () => {},
          spawn: () => {},
      });
      this.organ.placePlayer(this.player);
      if (this.player.health <= 0 && this.lives > 0) {
          this.player.health = this.player.maxHealth;
          this.player.active = true;
      }
      this.approachBg(dt);
  }

  private bossShot(e: Entity, angle: number, speed: number, radius: number, damage: number) {
      if (e.mutation) e.mutation.attack = Math.max(e.mutation.attack, 0.9);
      const shotSpeed = speed * bossPace(this.currentWaveIndex) * 0.92;
      this.entities.push({
          id: `bproj_${this.time}_${Math.random()}`,
          type: EntityType.ENEMY_PROJECTILE,
          pos: { ...e.pos },
          vel: { x: Math.cos(angle) * shotSpeed, y: Math.sin(angle) * shotSpeed },
          radius, health: 1, maxHealth: 1,
          color: e.color, damage, active: true, drag: 0
      });
  }

  private bossPool(e: Entity, radius: number, ttl: number) {
      if (e.mutation) e.mutation.attack = Math.max(e.mutation.attack, 0.9);
      this.entities.push({
          id: `acid_${this.time}_${Math.random()}`,
          type: EntityType.ACID_POOL,
          pos: { ...e.pos },
          vel: { x: 0, y: 0 },
          radius, health: 1, maxHealth: 1,
          color: e.mutation?.accent || e.color,
          damage: 0, active: true, ttl, value: ttl
      });
  }

  public damageEnemy(target: Entity, amount: number, canCrit: boolean, stats: PlayerStats): boolean {
      if (!target.active) return false;
      
      let finalDamage = amount;
      let isCrit = false;
      
      if (canCrit && Math.random() < Math.min(0.85, stats.critChance + this.organ.critAdd)) {
          isCrit = true;
          finalDamage *= stats.critMultiplier;
          this.sessionStats.critHits++;
          achievementManager.track('crit_master', 1);
      }

      // ARMOR LOGIC PARA PARASITAS (Tanky bois)
      if (target.type === EntityType.PARASITE) {
          finalDamage *= 0.9;
      }
      
      if (finalDamage > 500) achievementManager.track('overkill', 1);

      target.health -= finalDamage;
      target.hitFlash = 5;
      
      const knockback = target.type === EntityType.BOSS || target.type === EntityType.VIRUS ? 0.1 : 2; 
      target.pos.x += knockback; 

      const txtColor = isCrit ? '#ffff00' : '#fff';
      const txtSize = isCrit ? (finalDamage > 30 ? 40 : 28) : (finalDamage > 20 ? 32 : 20);
      this.spawnText({x: target.pos.x + (Math.random()-0.5)*20, y: target.pos.y - 20}, Math.floor(finalDamage).toString() + (isCrit ? "!" : ""), txtColor, txtSize);

      if (target.health <= 0) {
          target.active = false;
          
          if (!this.isLowQuality) {
              const count = (target.type === EntityType.BOSS ? 20 : 4); 
              for(let i=0; i<count; i++) {
                  this.particles.push({
                      id: 'blood', type: EntityType.PARTICLE,
                      pos: { ...target.pos },
                      vel: { x: (Math.random()-0.5)*10, y: (Math.random()-0.5)*10 },
                      radius: Math.random() * 4 + 1,
                      health: 1, maxHealth: 1,
                      color: target.color,
                      damage: 0, active: true, ttl: 30
                  });
              }
          }
          
          if (target.type === EntityType.BOSS) {
              this.sessionStats.bossesKilled++;
              // Boss-down stays on the organ card. A canvas popup here flashed and died before the chart.
              achievementManager.track('boss_1', 1);
              achievementManager.track('boss_10', 1);
              achievementManager.track('boss_50', 1);
          } else {
              this.sessionStats.enemiesKilled++;
              achievementManager.track('kill_100', 1);
              achievementManager.track('kill_1000', 1);
              achievementManager.track('kill_5000', 1);
              achievementManager.track('kill_10000', 1);
          }
          
          if (target.isElite) {
              this.entities.push({
                  id: `acid_${Date.now()}`,
                  type: EntityType.ACID_POOL,
                  pos: { ...target.pos },
                  vel: { x: 0, y: 0 },
                  radius: 60,
                  health: 1, maxHealth: 1, color: this.colors.ACID_POOL, damage: 0, active: true, 
                  ttl: 8, value: 8
              });
          }

          this.comboCount++;
          if (this.comboCount >= 50) achievementManager.track('combo_50', 50);
          this.comboTimer = this.COMBO_DURATION;
          if (this.comboCount > this.sessionStats.maxCombo) this.sessionStats.maxCombo = this.comboCount;
          
          if (this.comboCount % 10 === 0) {
              this.spawnText(this.player.pos, `${this.comboCount}x ${this.t('COMBO')}`, this.colors.COMBO, 30);
          }

          if (!this.strainAdapted && this.comboCount > COMBO_RAMP_KILLS) {
              this.strainAdapted = true;
              this.spawnText(this.player.pos, this.t('MSG_STRAIN_ADAPTED'), '#ff8aa8', 26);
          }

          const comboPower = comboDamageMultiplier(this.comboCount);
          const scoreGain = Math.floor((target.value || 10) * comboScoreMultiplier(this.comboCount));
          this.score += scoreGain;
          if (this.score >= 50000) achievementManager.track('score_50k', 50000);
          
          if (isCrit && stats.lifesteal > 0 && this.leechLock <= 0) {
              const heal = Math.max(1, Math.round(stats.lifesteal * 0.5));
              this.player.health = Math.min(this.player.maxHealth, this.player.health + heal);
              this.spawnText(this.player.pos, `+${heal}`, '#00ff00', 18);
              this.leechLock = 1.15;
          }

          audioManager.playExplosion(target.pos);

          // O power-up voando cobre parte da progressão, então a biomassa cai um pouco.
          const dnaYield = 1.15;
          const total = Math.max(1, Math.ceil((target.value || 10) * Math.min(3, comboPower) * dnaYield));
          const shards = Math.min(total, Math.min(6, Math.max(3, Math.ceil(total / 12))));
          const base = Math.floor(total / shards);
          let leftover = total - base * shards;
          for (let i = 0; i < shards; i++) {
              const ang = (i / shards) * Math.PI * 2 + Math.random() * 0.4;
              const kick = 1.7 + Math.random() * 1.35;
              const share = base + (leftover > 0 ? 1 : 0);
              if (leftover > 0) leftover--;
              this.entities.push({
                  id: `dna_${Date.now()}_${i}`,
                  type: EntityType.DNA_FRAGMENT,
                  pos: { x: target.pos.x, y: target.pos.y },
                  vel: { x: Math.cos(ang) * kick, y: Math.sin(ang) * kick },
                  radius: 7,
                  health: 1, maxHealth: 1,
                  color: this.colors.DNA,
                  damage: 0, active: true,
                  drag: 0.05,
                  value: Math.max(1, share),
                  isElite: target.isElite
              });
          }
          
          return true;
      }
      
      return false;
  }

  // --- REVISED: DAMAGE PLAYER LOGIC ---
  private damagePlayer(amount: number, sourcePos: Vector2, onGameOver: () => void, onLifeLost: () => void, stats: PlayerStats, isEnvironmental: boolean = false, sourceEntity?: Entity) {
      if (this.invulnerabilityTimer > 0 || this.isDashing) return;
      if (this.organ.shield > 0) amount *= (1 - this.organ.shield);
      if (stats.guard > 0) amount *= (1 - Math.min(0.45, stats.guard));

      this.player.health = Math.max(0, this.player.health - amount);
      this.sessionStats.damageTaken += amount;
      
      // Feedback: Screen Shake
      this.shakeIntensity = amount > 15 ? 20 : 10;
      this.screenShake = { x: (Math.random()-0.5)*15, y: (Math.random()-0.5)*15 };
      
      // Reset Combo
      if (this.comboCount > 5) this.spawnText(this.player.pos, this.t('MSG_COMBO_LOST'), this.colors.PARASITE, 20);
      this.comboCount = 0;

      // New Mechanics: Escape Feedback (Entity Collision only)
          if (!isEnvironmental) {
          if (sourceEntity && sourceEntity.active && sourceEntity.type !== EntityType.BOSS) {
              sourceEntity.radius = Math.min(240, sourceEntity.radius * 1.1);
              sourceEntity.damage *= 1.1;
              this.spawnText(sourceEntity.pos, this.t('MSG_GREW'), sourceEntity.color, 15);
          }

          // SURPRESA 2: CHOQUE DE SISTEMA
          // Ativa falha no próximo disparo
          this.systemGlitchActive = true;

          this.invulnerabilityTimer = 0.4; // Short window to avoid multi-hits
          this.dashCooldownTimer = 0; // Instant recharge for escape
          
          // Knockback calculation
          const dx = this.player.pos.x - sourcePos.x;
          const dy = this.player.pos.y - sourcePos.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist > 0) {
              const force = 12;
              this.player.vel.x = (dx / dist) * force;
              this.player.vel.y = (dy / dist) * force;
          }
      }

      if (!isEnvironmental || amount >= 2) audioManager.playHit(sourcePos);

      if (this.player.health <= 0) {
          this.handlePlayerDeath(onGameOver, onLifeLost, stats);
      }
  }

  private environmentalHit(amount: number, pos: Vector2, iframe: number, stats: PlayerStats, onGameOver: () => void, onLifeLost: () => void) {
      if (this.invulnerabilityTimer > 0 || this.isDashing || !this.player.active) return;
      this.damagePlayer(amount, pos, onGameOver, onLifeLost, stats, true);
      if (iframe > 0 && this.player.health > 0) this.invulnerabilityTimer = iframe;
  }

  public handlePlayerDeath(onGameOver: () => void, onLifeLost: () => void, currentStats: PlayerStats) {
      if (this.lives > 0) {
          this.lives--;
          audioManager.playCrack();
          onLifeLost(); 
          this.hitStopTimer = 0.2; 
          achievementManager.track('die_10', 1);
          
          if (this.lives === 0) {
              this.player.health = 0;
              this.player.active = false;
              this.waveActive = false; 
              const pCount = this.isLowQuality ? 10 : 30;
              for(let i=0; i<pCount; i++) {
                   this.particles.push({
                      id: 'p_death', type: EntityType.PARTICLE,
                      pos: { ...this.player.pos },
                      vel: { x: (Math.random()-0.5)*15, y: (Math.random()-0.5)*15 },
                      radius: Math.random() * 5 + 2,
                      health: 1, maxHealth: 1,
                      color: this.colors.PLAYER,
                      damage: 0, active: true, ttl: 60
                  });
              }
              onGameOver();
          } else {
              this.triggerSurge(currentStats, true);

              this.player.health = this.player.maxHealth;
              this.energy = 0; 
              this.invulnerabilityTimer = 3.0;
              this.spawnText(this.player.pos, this.t('MSG_CRITICAL'), '#ff0000', 50);
              
              this.screenShake = {x: 40, y: 40}; 
              this.shakeIntensity = 40;

              const pCount = this.isLowQuality ? 10 : 40;
              for(let i=0; i<pCount; i++) {
                  const angle = Math.random() * Math.PI * 2;
                  const speed = Math.random() * 15 + 5;
                  this.particles.push({
                      id: 'blood_surge', type: EntityType.PARTICLE,
                      pos: { ...this.player.pos },
                      vel: { x: Math.cos(angle)*speed, y: Math.sin(angle)*speed },
                      radius: Math.random() * 4 + 2,
                      health: 1, maxHealth: 1,
                      color: '#ff0000',
                      damage: 0, active: true, ttl: 40
                  });
              }
              
              const killRadiusSq = 500 * 500;
              this.entities.forEach(e => {
                  if ((this.isEnemy(e.type) || e.type === EntityType.BOSS) && distSq(this.player.pos, e.pos) < killRadiusSq) {
                      if (e.type !== EntityType.BOSS) { 
                          e.health = -9999;
                          e.active = false;
                          e.pos.x = -10000; 
                      }
                  }
              });
          }
      } else if (this.player.active) {
          this.player.health = 0;
          this.player.active = false;
          this.waveActive = false;
          onGameOver();
      }
  }

  public prepareWave() {
      this.particles = this.particles.filter(p => p.id === 'bg');
      this.entities = this.entities.filter(e => e.active && e.type === EntityType.PLAYER);
      this.spawnTimer = 0;
      this.regenTimer = 0;
      this.grid.clear(); 
      this.vacuumingTimer = 0; 
  }

  public beginPassage(): boolean {
      if (this.lives <= 0 || !this.player.active) return false;
      if (this.player.health <= 0) this.player.health = this.player.maxHealth;
      if (this.currentWaveIndex < 0 || !this.organ.willLeave(this.currentWaveIndex)) return false;
      this.organ.openVoyage(this.currentWaveIndex + 1, (key) => this.t(key));
      if (!this.organ.charting()) return false;
      this.hitStopTimer = 0;
      this.shakeIntensity = 0;
      this.isDashing = false;
      this.surgeActive = false;
      this.inputVector.x = 0;
      this.inputVector.y = 0;
      for (const e of this.entities) {
          if (e.type !== EntityType.PLAYER) e.active = false;
      }
      this.particles = this.particles.filter(p => p.id === 'bg');
      return true;
  }

  public startWave(waveIndex: number, delay: number = 0) {
    this.prepareWave();
    this.currentWaveIndex = waveIndex;
    this.waveTimer = 0;
    this.waveActive = true;
    this.bossSpawned = false;
    this.spawnTimer = 0;
    this.clearBufferTimer = 0; 
    this.isVacuuming = false;  
    this.vacuumingTimer = 0;
    const waveNum = waveIndex + 1;
    audioManager.setGameState(waveNum, 1.0);
    const config = this.configFor(waveIndex);
    this.bloodFlow.x = config.flowSpeed;
    const changed = this.organ.onWave(waveIndex, (key) => this.t(key));
    this.waveStartDelay = Math.max(delay, this.organ.transitLeft());
    if (changed) {
        for (const p of this.particles) {
            if (p.id === 'bg') { p.damage = 1; p.health = 1; }
        }
    }
    let have = 0;
    for (const p of this.particles) if (p.id === 'bg' && p.damage !== 1) have++;
    const budget = cellBudget(this.organ.id);
    for (let i = have; i < budget; i++) this.spawnBackgroundCell(true); 
    if (waveIndex === 4) achievementManager.track('wave_5', 5);
    if (waveIndex === 9) achievementManager.track('wave_10', 10);
  }

  public triggerSurge(stats: PlayerStats, force: boolean = false) {
    if (force || this.energy >= stats.maxEnergy) {
      if (!force) this.energy = 0;
      this.surgeActive = true;
      this.deathSurgeActive = force; 
      this.surgeRadius = 0;
      this.surgeTouch.clear();
      this.shakeIntensity = force ? 40 : 30;
      if (!force) {
          this.spawnText(this.player.pos, this.t('MSG_SURGE'), this.colors.PLAYER_CORE, 45);
      }
      audioManager.playSurge(this.player.pos);
      this.entities.forEach(e => {
          if (e.type === EntityType.DNA_FRAGMENT && e.active) {
              const dx = this.player.pos.x - e.pos.x;
              const dy = this.player.pos.y - e.pos.y;
              const dist = Math.sqrt(dx*dx + dy*dy);
              
              if (dist > 0) {
                  const speed = 25; 
                  e.vel.x = (dx / dist) * speed;
                  e.vel.y = (dy / dist) * speed;
              }
          }
      });
    }
  }

  private surgeFate(id: string): number {
      let h = 2166136261;
      for (let i = 0; i < id.length; i++) {
          h ^= id.charCodeAt(i);
          h = Math.imul(h, 16777619);
      }
      return (h >>> 0) % 10;
  }

  private holdOnScreen(e: Entity) {
      const pad = e.radius + 48;
      const roomX = e.vel.x < 0 ? e.pos.x - pad : CANVAS_WIDTH - pad - e.pos.x;
      const roomY = e.vel.y < 0 ? e.pos.y - pad : CANVAS_HEIGHT - pad - e.pos.y;
      const capX = Math.max(0, roomX) * 0.045;
      const capY = Math.max(0, roomY) * 0.045;
      if (e.vel.x < -capX) e.vel.x = -capX;
      if (e.vel.x > capX) e.vel.x = capX;
      if (e.vel.y < -capY) e.vel.y = -capY;
      if (e.vel.y > capY) e.vel.y = capY;
  }

  private sparkShock(e: Entity) {
      const now = performance.now();
      if (now - this.surgeZapAt > 90) {
          this.surgeZapAt = now;
          audioManager.playZap(e.pos);
      }
  }

  public triggerDash(stats: PlayerStats) {
      if (this.dashCooldownTimer <= 0 && !this.isDashing) {
          this.dashCooldownTimer = stats.dashCooldown / 1000;
          this.isDashing = true;
          this.dashStruck.clear();
          this.dashDuration = 0.2; 
          let dx = this.inputVector.x;
          let dy = this.inputVector.y;
          if (dx === 0 && dy === 0) dx = 1;
          const mag = Math.sqrt(dx*dx + dy*dy);
          this.dashVector = { x: (dx / mag), y: (dy / mag) };
          this.player.vel.x = this.dashVector.x * stats.dashSpeed;
          this.player.vel.y = this.dashVector.y * stats.dashSpeed;
          this.shakeIntensity = 10;
          this.screenShake = { x: -this.dashVector.x * 5, y: -this.dashVector.y * 5 };
          audioManager.playDash();
      }
  }

  private manageOrbitals(stats: PlayerStats, dtSeconds: number) {
      let orbitalCount = 0;
      for(const e of this.entities) if (e.type === EntityType.ORBITAL) orbitalCount++;

      if (orbitalCount < stats.orbitals) {
          for (let i = orbitalCount; i < stats.orbitals; i++) {
              this.entities.push({
                  id: `orb_${Date.now()}_${i}`,
                  type: EntityType.ORBITAL,
                  pos: { ...this.player.pos },
                  vel: { x: 0, y: 0 },
                  radius: 14,
                  health: 1, maxHealth: 1, color: this.colors.ORBITAL,
                  damage: stats.damage * 0.9, 
                  active: true,
                  orbitOffset: (i / stats.orbitals) * 360 
              });
          }
      }
      
      for(const e of this.entities) {
          if (e.type === EntityType.ORBITAL && e.active) {
              const radius = 92 + Math.min(3, stats.orbitals - 1) * 8;
              const speed = 3; 
              const angleIdx = ((this.time / 10 * speed) + (e.orbitOffset || 0));
              e.pos.x = this.player.pos.x + getCos(angleIdx) * radius;
              e.pos.y = this.player.pos.y + getSin(angleIdx) * radius;
              e.damage = stats.damage * 0.9;
              if (e.shootTimer && e.shootTimer > 0) e.shootTimer = Math.max(0, e.shootTimer - dtSeconds);
          }
      }
  }

  private collisionScratch: Entity[] = [];

  private clearGrid() {
      for (const cell of this.grid.values()) cell.length = 0;
  }
  private addToGrid(e: Entity) {
      const col = Math.floor(e.pos.x / GRID_CELL_SIZE);
      const row = Math.floor(e.pos.y / GRID_CELL_SIZE);
      if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return;
      const idx = row * GRID_COLS + col;
      let cell = this.grid.get(idx);
      if (!cell) {
          cell = [];
          this.grid.set(idx, cell);
      }
      cell.push(e);
  }
  private getPotentialCollisions(e: Entity): Entity[] {
      const col = Math.floor(e.pos.x / GRID_CELL_SIZE);
      const row = Math.floor(e.pos.y / GRID_CELL_SIZE);
      const candidates = this.collisionScratch;
      candidates.length = 0;
      for (let r = row - 1; r <= row + 1; r++) {
          for (let c = col - 1; c <= col + 1; c++) {
              if (c >= 0 && c < GRID_COLS && r >= 0 && r < GRID_ROWS) {
                  const idx = r * GRID_COLS + c;
                  const cell = this.grid.get(idx);
                  if (cell) for (let i = 0; i < cell.length; i++) candidates.push(cell[i]);
              }
          }
      }
      return candidates;
  }
  private compactInactive(list: Entity[]) {
      let write = 0;
      for (let i = 0; i < list.length; i++) {
          if (list[i].active) list[write++] = list[i];
      }
      list.length = write;
  }
  private killAllEnemies() {
      this.entities.forEach(e => {
          if (e.type === EntityType.BOSS && e.health > 0) return;
          if (this.isEnemy(e.type) || e.type === EntityType.BOSS) {
              e.health = 0; e.active = false; e.pos.x = -10000; 
              if (!this.isLowQuality) {
                  for(let i=0; i<3; i++) {
                      this.particles.push({
                          id: 'force_kill', type: EntityType.PARTICLE, pos: {x: CANVAS_WIDTH/2 + (Math.random()-0.5)*CANVAS_WIDTH, y: CANVAS_HEIGHT/2},
                          vel: {x: 0, y: -5}, radius: 3, health:1, maxHealth:1, color: e.color, damage:0, active:true, ttl: 15
                      });
                  }
              }
          }
      });
  }

  private updateBoss(e: Entity, dtSeconds: number, _stats: PlayerStats) {
      if (!e.mutation) return;
      const m = e.mutation;
      if (m.attack > 0) m.attack = Math.max(0, m.attack - dtSeconds);
      m.phase += dtSeconds;
      const dx = this.player.pos.x - e.pos.x;
      const dy = this.player.pos.y - e.pos.y;
      const dMag = Math.max(1, Math.hypot(dx, dy));
      const nx = dx / dMag;
      const ny = dy / dMag;
      const pace = bossPace(this.currentWaveIndex);
      const haste = bossHaste(this.currentWaveIndex);
      const speed = m.baseSpeed * this.difficultyMods.speed * pace;
      const aim = Math.atan2(dy, dx);
      const shot = Math.max(5, e.damage * 0.22);
      const chase = (mul = 1) => {
          e.vel.x += nx * speed * mul;
          e.vel.y += ny * speed * mul;
      };
      const lunge = (power: number, side = 0, sidePower = 0) => {
          e.vel.x = (nx * power + (-ny) * side * sidePower) * pace;
          e.vel.y = (ny * power + nx * side * sidePower) * pace;
      };

      if (m.play === 'bud' && !m.split && e.health < e.maxHealth * 0.5) {
          m.split = true;
          e.radius *= 0.78;
          m.baseSpeed *= 1.3;
          for (let i = 0; i < 8; i++) this.bossShot(e, (i / 8) * Math.PI * 2, 7, 12, shot * 0.7);
          audioManager.playEnemyShoot(e.pos);
      }
      if (m.play === 'cyst' && !m.open && e.health < e.maxHealth * 0.45) {
          m.open = true;
          m.baseSpeed *= 1.5;
          if (e.mutation) e.mutation.attack = Math.max(e.mutation.attack, 0.9);
          audioManager.playBossDash(e.pos);
      }

      if (m.play === 'coil') {
          const orbit = 170 + Math.sin(m.phase * 0.7) * 90;
          const ang = m.phase * 1.05;
          const tx = this.player.pos.x + Math.cos(ang) * orbit;
          const ty = this.player.pos.y + Math.sin(ang) * orbit;
          const ox = tx - e.pos.x;
          const oy = ty - e.pos.y;
          const od = Math.max(1, Math.hypot(ox, oy));
          e.vel.x += (ox / od) * speed * 1.25;
          e.vel.y += (oy / od) * speed * 1.25;
          return;
      }

      if (m.play === 'flagellum') {
          const sway = Math.sin(m.phase * 2.1);
          e.vel.x += nx * speed + (-ny) * sway * speed * 0.7;
          e.vel.y += ny * speed + nx * sway * speed * 0.7;
          return;
      }

      if (m.play === 'cord') {
          const spin = Math.sin(m.phase * 1.2);
          e.vel.x += nx * speed * 1.05 + (-ny) * speed * 0.8 * spin;
          e.vel.y += ny * speed * 1.05 + nx * speed * 0.8 * spin;
          m.dashTimer -= dtSeconds;
          if (m.dashTimer <= 0) {
              e.vel.x += nx * 6 * pace;
              e.vel.y += ny * 6 * pace;
              m.dashTimer = 3.1 * haste;
              if (e.mutation) e.mutation.attack = Math.max(e.mutation.attack, 0.75);
          }
          return;
      }

      if (m.play === 'crescent') {
          chase(0.28);
          m.dashTimer -= dtSeconds;
          if (m.dashTimer <= 0) {
              const side = m.phase % 2 > 1 ? 1 : -1;
              lunge(8, side, 4);
              m.dashTimer = 2.05 * haste;
          }
          return;
      }

      if (m.play === 'pseudopod') {
          m.dashTimer -= dtSeconds;
          if (m.dashTimer > 0.55) chase(0.15);
          if (m.dashTimer <= 0) {
              lunge(12);
              this.bossPool(e, 78, 4);
              m.dashTimer = 3.8 * haste;
              if (e.mutation) e.mutation.attack = Math.max(e.mutation.attack, 0.9);
              audioManager.playBossDash(e.pos);
          }
          return;
      }

      if (m.play === 'reactivate') {
          m.shootTimer -= dtSeconds;
          if (m.shootTimer > 0.7) chase(0.2);
          if (m.shootTimer <= 0) {
              for (let i = 0; i < 8; i++) this.bossShot(e, (i / 8) * Math.PI * 2, 5.6, 12, shot * 0.6);
              m.shootTimer = 3.8 * haste;
              audioManager.playEnemyShoot(e.pos);
          }
          return;
      }

      chase(m.play === 'adhere' ? 1.05 : m.play === 'capsid' ? 1 : m.play === 'capsule' ? 0.65 : 1);

      if (m.play === 'abscess' || m.play === 'filament') {
          m.acidTimer -= dtSeconds;
          if (m.acidTimer <= 0) {
              this.bossPool(e, m.play === 'filament' ? 46 : 72, m.play === 'filament' ? 3.6 : 5);
              m.acidTimer = (m.play === 'filament' ? 3.05 : 2.55) * haste;
          }
      }

      if (m.play === 'embolus') {
          m.dashTimer -= dtSeconds;
          if (m.dashTimer <= 0) {
              lunge(11);
              for (let i = -2; i <= 2; i++) this.bossShot(e, aim + i * 0.24, 6.6, 11, shot * 0.8);
              m.dashTimer = 4.4 * haste;
              if (e.mutation) e.mutation.attack = Math.max(e.mutation.attack, 0.9);
              audioManager.playBossDash(e.pos);
          }
      }

      if (m.play === 'cluster') {
          m.shootTimer -= dtSeconds;
          if (m.shootTimer <= 0) {
              for (let i = -2; i <= 2; i++) this.bossShot(e, aim + i * 0.26, 6.2, 11, shot * 0.68);
              m.shootTimer = 3.05 * haste;
              audioManager.playEnemyShoot(e.pos);
          }
      }

      if (m.play === 'capsid') {
          m.shootTimer -= dtSeconds;
          if (m.shootTimer <= 0) {
              this.bossShot(e, aim, 7.4, 10, shot * 0.6);
              m.shootTimer = 1.55 * haste;
          }
      }

      if (m.play === 'capsule') {
          m.shootTimer -= dtSeconds;
          if (m.shootTimer <= 0) {
              for (let i = 0; i < 8; i++) this.bossShot(e, (i / 8) * Math.PI * 2 + m.phase, 3.6, 12, shot * 0.55);
              m.shootTimer = 5.2 * haste;
              audioManager.playEnemyShoot(e.pos);
          }
      }

      if (m.play === 'adhere') {
          m.dashTimer -= dtSeconds;
          if (m.dashTimer <= 0 && dMag > 240) {
              lunge(9);
              m.dashTimer = 3.4 * haste;
          }
      }

      if (m.play === 'cyst' && m.open) {
          m.dashTimer -= dtSeconds;
          if (m.dashTimer <= 0) {
              lunge(11);
              m.dashTimer = 2.8 * haste;
              if (e.mutation) e.mutation.attack = Math.max(e.mutation.attack, 0.9);
              audioManager.playBossDash(e.pos);
          }
      }
  }

  public getDashProgress(stats: PlayerStats): number {
      if (this.dashCooldownTimer <= 0) return 1;
      const totalCooldown = stats.dashCooldown / 1000;
      return Math.max(0, Math.min(1, 1 - (this.dashCooldownTimer / totalCooldown)));
  }

  public update(dt: number, stats: PlayerStats, onWaveClear: () => void, onGameOver: () => void, onLifeLost: () => void, onBossSpawn?: () => void) {
    if (dt > 32) dt = 32;
    if (this.bossCard || this.organ.charting()) {
        this.tickPresentation(dt);
        return;
    }

    this.isLowQuality = this.leanGraphics;

    if (this.hitStopTimer > 0) {
        this.hitStopTimer -= (dt / 1000);
        return;
    }

    let timeScale = 1.0;
    if (this.player.active && this.player.health < this.player.maxHealth * 0.3 && !this.adrenalineExhausted) {
        this.adrenalineActive = true;
        this.adrenalineTimer += (dt / 1000); 
        if (this.adrenalineTimer > ADRENALINE_MAX_DURATION) {
            this.adrenalineExhausted = true; 
            this.spawnText(this.player.pos, this.t('MSG_ADRENALINE_EMPTY'), "#ff0000", 30);
        } else {
            timeScale = 0.4;
        }
        } else {
            this.adrenalineActive = false;
        }
        if (this.organ.charting()) timeScale = 1;
    
    if (this.player.active) {
        const healthRatio = Math.max(0, this.player.health / this.player.maxHealth);
        audioManager.setGameState(this.currentWaveIndex + 1, healthRatio);
    }

    const safeDt = dt * timeScale;
    this.time += safeDt;
    const tick = safeDt / 16; 
    const dtSeconds = safeDt / 1000;
    
    if (this.waveActive) this.sessionStats.timePlayed += dtSeconds;
    
    if (this.invulnerabilityTimer > 0) {
        this.invulnerabilityTimer -= dtSeconds;
    } else {
        this.invulnerabilityTimer = 0; 
    }

    if (this.player.active && this.player.health <= 0.5) {
        this.handlePlayerDeath(onGameOver, onLifeLost, stats);
        return; 
    }
    
    if (isNaN(this.player.health)) this.player.health = 0;

    if (this.inputVector.x === 0 && this.inputVector.y === 0 && this.waveActive) {
        this.sessionStats.idleTime += dtSeconds;
        if (this.sessionStats.idleTime > 10) achievementManager.track('afk', 10);
    } else {
        this.sessionStats.idleTime = 0;
    }

    if (this.dashCooldownTimer > 0) this.dashCooldownTimer -= (dt / 1000); 
    if (this.comboTimer > 0) {
        this.comboTimer -= dtSeconds;
    } else {
        this.comboCount = 0; 
    }

      if (this.player.active) this.manageOrbitals(stats, dtSeconds);

    if (this.isDashing) {
        this.dashDuration -= dtSeconds;
        this.dashTrailTimer -= dtSeconds;
        this.player.vel.x *= 0.95; 
        this.player.vel.y *= 0.95;

        for (const e of this.entities) {
            if (e.type === EntityType.BIO_MINE && e.active) {
                if (distSq(this.player.pos, e.pos) < (this.player.radius + e.radius) ** 2) {
                    e.active = false;
                    this.sessionStats.mineKills++;
                    achievementManager.track('mine_pop_20', 1);
                    this.spawnText(e.pos, this.t('MSG_BURST'), '#ffcc00', 45);
                    // VARIETY: SOUND CALL FOR MINE EXPLOSION (DASH)
                    audioManager.playMineExplosionDash(e.pos);
                    audioManager.playSurge(e.pos);
                    buzz('boom'); 

                    this.particles.push({
                        id: 'mine_expl_dash', type: EntityType.PARTICLE, pos: {...e.pos},
                        vel: {x:0, y:0}, radius: 350, health:1, maxHealth:1, color: 'rgba(0, 255, 255, 0.5)', damage:0, active:true, ttl: 20
                    });

                    this.entities.forEach(victim => {
                        if ((this.isEnemy(victim.type) || victim.type === EntityType.BOSS) && victim.active) {
                            if (distSq(victim.pos, e.pos) < 350*350) {
                                this.damageEnemy(victim, 25, true, stats); 
                                const dx = victim.pos.x - e.pos.x;
                                const dy = victim.pos.y - e.pos.y;
                                const d = Math.sqrt(dx*dx + dy*dy);
                                if (d > 0) {
                                    victim.vel.x += (dx/d) * 15;
                                    victim.vel.y += (dy/d) * 15;
                                }
                            }
                        }
                    });
                }
            }
        }

        if (stats.dashDamage > 0) {
            for (const e of this.entities) {
                if ((this.isEnemy(e.type) || e.type === EntityType.BOSS) && e.active && !this.dashStruck.has(e.id)) {
                    if (distSq(this.player.pos, e.pos) < (this.player.radius + e.radius) ** 2) {
                        this.dashStruck.add(e.id);
                        if (this.damageEnemy(e, stats.dashDamage, false, stats)) {
                            this.sessionStats.dashKills++;
                            achievementManager.track('dash_kill_50', 1);
                        }
                         this.particles.push({
                              id: 'plasma', type: EntityType.PARTICLE, pos: {...e.pos}, 
                              vel: { x: (Math.random()-0.5)*10, y: (Math.random()-0.5)*10 },
                              radius: 4, health: 1, maxHealth: 1, color: this.colors.PLAYER_CORE, damage: 0, active: true, ttl: 10
                          });
                    }
                }
            }
        }

        if (this.dashTrailTimer <= 0 && !this.isLowQuality) {
            this.particles.push({
                id: 'ghost', type: EntityType.PARTICLE,
                pos: { ...this.player.pos }, vel: { x: 0, y: 0 },
                radius: this.player.radius, health: 1, maxHealth: 1, color: 'rgba(255, 255, 255, 0.3)',
                active: true, ttl: 10, damage: 0
            });
            this.dashTrailTimer = 0.05; 
        }

        if (this.dashDuration <= 0) {
            this.isDashing = false;
            this.player.vel.x *= 0.5;
            this.player.vel.y *= 0.5;
        }
    }

    if (this.waveActive && this.currentWaveIndex >= 0) {
      if (this.waveStartDelay > 0) {
          this.waveStartDelay -= dtSeconds;
      } else {
          this.waveTimer += dtSeconds;
          const config = this.configFor(this.currentWaveIndex);
          const targetFlow = config.flowSpeed; 
          this.bloodFlow.x = this.bloodFlow.x * 0.95 + targetFlow * 0.05;
          
          let spawnRateMod = 1.0;
          if (this.patient.strain === ViralStrain.SWARM) spawnRateMod = 0.72;
          if (this.patient.strain === ViralStrain.TITAN) spawnRateMod = 1.35;
          const crowd = this.difficultyMods.crowd ?? 1;
          const foeCap = this.difficultyMods.cap ?? 16;
          let foes = 0;
          for (const ent of this.entities) {
              if (ent.active && this.isEnemy(ent.type)) foes++;
          }

          if (this.waveTimer < config.duration) {
              this.spawnTimer += safeDt;
              if (this.spawnTimer >= (config.spawnRate * spawnRateMod * crowd) && foes < foeCap && this.entities.length < this.maxEntities) {
                this.spawnEnemy(config);
                this.spawnTimer = 0;
              }
          } else if (config.hasBoss && !this.bossSpawned) {
              this.spawnBoss(config);
              this.bossSpawned = true;
              if (onBossSpawn) onBossSpawn();
              this.tickPresentation(dt);
              return;
          }
          
          const bossActive = this.entities.some(e => e.type === EntityType.BOSS && e.active);
          const shouldSpawnMines = this.waveTimer < config.duration || bossActive;

          if (shouldSpawnMines && Math.random() < 0.005) this.spawnMine();

          if (this.allowSerum && this.waveStartDelay <= 0 && !this.isVacuuming && this.waveTimer > 1) {
              const serumLive = this.entities.some(e => e.type === EntityType.SERUM && e.active);
              if (!serumLive) {
                  this.serumClock -= dtSeconds;
                  if (this.serumClock <= 0) {
                      this.spawnSerum();
                      this.serumClock = 168 + Math.random() * 50;
                  }
              }
          }

          const enemiesRemaining = this.entities.some(e => e.active && (this.isEnemy(e.type) || e.type === EntityType.BOSS));
          const bossRemaining = this.entities.some(e => e.active && e.type === EntityType.BOSS);
          
          if (this.waveTimer >= config.duration) {
              const bossStillDue = config.hasBoss && (!this.bossSpawned || bossRemaining);
              if (!bossStillDue && !enemiesRemaining) {
                  this.isVacuuming = true;
              } else if (!bossStillDue) {
                  const hasVisibleEnemies = this.entities.some(e =>
                      this.isEnemy(e.type) && e.active &&
                      e.pos.x > -50 && e.pos.x < CANVAS_WIDTH + 50 &&
                      e.pos.y > -50 && e.pos.y < CANVAS_HEIGHT + 50
                  );
                  if (!hasVisibleEnemies) {
                      this.clearBufferTimer += dtSeconds;
                      if (this.clearBufferTimer > 2.4) {
                          this.killAllEnemies();
                          this.isVacuuming = true;
                      }
                  } else {
                      this.clearBufferTimer = 0;
                  }
              }
          }
      }
      
      if (this.isVacuuming) {
          this.vacuumingTimer += dtSeconds;
          let dnaLeft = 0;
          for (const e of this.entities) {
              if (!e.active || e.type !== EntityType.DNA_FRAGMENT) continue;
              if (this.vacuumingTimer > 2.2 && !this.player.active) {
                  e.active = false;
                  const val = e.value || 1;
                  this.biomass += val;
                  this.sessionStats.biomassCollected += val;
                  continue;
              }
              dnaLeft++;
              if (this.vacuumingTimer > 2.2) {
                  e.pos.x = this.player.pos.x;
                  e.pos.y = this.player.pos.y;
              }
          }
          
          if (dnaLeft === 0) {
              this.waveActive = false;
              this.isVacuuming = false;
              if (this.currentWaveIndex === 0 && this.sessionStats.damageTaken === 0) achievementManager.track('perfect_wave', 1);
              if (this.player.health < this.player.maxHealth * 0.2) achievementManager.track('low_hp_survive', 1);
              if (this.currentWaveIndex === 4 && this.currentDifficulty === Difficulty.APEX) achievementManager.track('win_apex', 1);
              onWaveClear();
          }
      }
    }

    if (this.surgeActive) {
      this.surgeRadius += 35 * tick;
      const effectiveRadius = this.surgeRadius * stats.surgeRadiusMult;
      const effectiveRadiusSq = effectiveRadius * effectiveRadius;
      
      this.entities.forEach(e => {
        if ((this.isEnemy(e.type) || e.type === EntityType.BOSS) && e.active) {
           const d = distSq(this.player.pos, e.pos);
           if (d < effectiveRadiusSq && d > (effectiveRadius - 150) * (effectiveRadius - 150)) {
              const dx = e.pos.x - this.player.pos.x;
              const dy = e.pos.y - this.player.pos.y;
              const dist = Math.sqrt(d);
              
              if (dist > 0.1) {
                  if (this.deathSurgeActive) {
                      if (e.type !== EntityType.BOSS) {
                          e.vel.x += (dx / dist) * 25;
                          e.vel.y += (dy / dist) * 25;
                      }
                      if (this.damageEnemy(e, 8, false, stats)) {
                          this.sessionStats.surgeKills++;
                          achievementManager.track('surge_kill_100', 1);
                      }
                  } else if (!this.surgeTouch.has(e.id)) {
                      this.surgeTouch.add(e.id);
                      const fate = this.surgeFate(e.id);
                      const boss = e.type === EntityType.BOSS;
                      const shock = !boss && fate < 4;
                      const shove = !boss && fate >= 4 && fate < 8;
                      const portion = boss ? 0.02 : shock ? 0.28 : shove ? 0.12 : 0.06;
                      const flat = boss ? 16 : shock ? 54 : shove ? 26 : 16;
                      const kick = boss ? 1.4 : shock ? 0.35 : shove ? 3.2 : 0.3;
                      const cap = boss ? 1.8 : shock ? 0.7 : shove ? 3.2 : 0.8;
                      e.stun = boss ? 0.22 : shock ? 0.55 : shove ? 0.4 : 0.32;
                      e.vel.x *= boss ? 0.4 : 0.1;
                      e.vel.y *= boss ? 0.4 : 0.1;
                      e.hitFlash = shock ? 16 : 8;
                      this.sparkShock(e);
                      e.vel.x += (dx / dist) * kick;
                      e.vel.y += (dy / dist) * kick;
                      const mag = Math.hypot(e.vel.x, e.vel.y);
                      if (mag > cap) {
                          e.vel.x *= cap / mag;
                          e.vel.y *= cap / mag;
                      }
                      this.holdOnScreen(e);
                      if (this.damageEnemy(e, flat + e.maxHealth * portion, false, stats)) {
                          this.sessionStats.surgeKills++;
                          achievementManager.track('surge_kill_100', 1);
                      }
                  }
              }
           }
        }
      });
      if (this.surgeRadius > CANVAS_WIDTH * 1.5) {
          this.surgeActive = false;
          this.deathSurgeActive = false;
          this.surgeTouch.clear();
      }
    }

    const organHooks = {
        entities: this.entities,
        player: this.player,
        low: this.isLowQuality,
        time: this.time,
        t: (key: string) => this.t(key),
        hurt: (amount: number, pos: Vector2, iframe: number) => this.environmentalHit(amount, pos, iframe, stats, onGameOver, onLifeLost),
        heal: (amount: number) => {
            this.player.health = Math.min(this.player.maxHealth, this.player.health + amount);
        },
        strike: (e: Entity, amount: number) => {
            if (!e.active) return;
            const hit = e.type === EntityType.BOSS && amount >= e.health ? e.maxHealth * 0.06 : amount;
            this.damageEnemy(e, hit, false, stats);
        },
        shake: (n: number) => { this.shakeIntensity = Math.max(this.shakeIntensity, n); },
        popup: (pos: Vector2, text: string, color: string, size?: number) => this.spawnText(pos, text, color, size ?? 22),
        spawn: (e: Entity) => { this.entities.push(e); },
    };
    const organLive = this.waveActive && this.waveStartDelay <= 0 && !this.isVacuuming && this.currentWaveIndex >= 0;
    this.organ.begin(dtSeconds, tick, organLive, organHooks);
    if (this.organ.charting() && this.waveTimer <= 0 && !this.isVacuuming) {
        this.waveStartDelay = Math.max(0.05, this.organ.transitLeft());
    }
    this.approachBg(dtSeconds);

      if (this.player.active) {
      audioManager.setEar(this.player.pos.x, this.player.pos.y);
      if (this.player.maxHealth !== stats.maxHealth) {
          this.player.maxHealth = stats.maxHealth;
          this.player.health = Math.min(this.player.health, this.player.maxHealth);
      }
      if (!this.hpMilestoneSent && this.player.maxHealth >= 200) {
          this.hpMilestoneSent = true;
          achievementManager.track('max_hp_200', Math.floor(this.player.maxHealth));
      }
      if (this.organ.charting()) {
          this.inputVector.x = 0;
          this.inputVector.y = 0;
          this.shakeIntensity = 0;
      }
      if (this.organ.placePlayer(this.player)) {
          this.isDashing = false;
      } else {
      if (!this.isDashing && !this.organ.charting()) {
          const moveScale = this.adrenalineActive ? tick * 1.5 : tick;
          const pace = this.organ.speedMul;
          this.player.vel.x += this.inputVector.x * stats.speed * 0.2 * moveScale * pace;
          this.player.vel.y += this.inputVector.y * stats.speed * 0.2 * moveScale * pace;
          this.player.vel.x *= this.player.drag!;
          this.player.vel.y *= this.player.drag!;
          this.player.pos.x += (this.bloodFlow.x * 0.1 + this.organ.wind.x * 0.75) * tick;
          this.player.pos.y += this.organ.wind.y * 0.75 * tick;
      } else {
          this.player.pos.x += this.organ.wind.x * 0.4 * tick;
          this.player.pos.y += this.organ.wind.y * 0.4 * tick;
      }

      this.player.pos.x += this.player.vel.x * tick;
      this.player.pos.y += this.player.vel.y * tick;

      if (this.player.pos.x < this.player.radius) this.player.pos.x = this.player.radius;
      if (this.player.pos.x > CANVAS_WIDTH - this.player.radius) this.player.pos.x = CANVAS_WIDTH - this.player.radius;
      if (this.player.pos.y < this.player.radius) this.player.pos.y = this.player.radius;
      if (this.player.pos.y > CANVAS_HEIGHT - this.player.radius) this.player.pos.y = CANVAS_HEIGHT - this.player.radius;
      }

      if (this.leechLock > 0) this.leechLock -= dtSeconds;
      this.regenTimer += safeDt;
      if (this.regenTimer > 11000 && stats.regen > 0) {
        this.player.health = Math.min(this.player.health + stats.regen, this.player.maxHealth);
        this.regenTimer = 0;
      }
      
      audioManager.armGun(stats.fireRate * this.organ.fireMul);
      const drum = audioManager.takeDrum();
      if (drum && !this.isDashing && this.waveStartDelay <= 0 && !this.organ.charting()) {
        const target = this.findTarget();
        if (target) {
          this.shoot(target, stats, drum);
        } else if (this.sessionStats.timePlayed > 30 && this.sessionStats.bulletsFired === 0) {
            achievementManager.track('pacifist', 30);
        }
      }
      
      this.entities.forEach(e => {
          if (e.type === EntityType.ACID_POOL && e.active && !e.id.startsWith('plaque_') && !e.id.startsWith('bile_')) {
              const full = e.value && e.value > 0 ? e.value : 6;
              const left = Math.max(0, e.ttl || 0);
              const life = Math.min(1, left / full);
              const grown = 1 - life;
              const settled = !!(e.angle && e.angle > 0);
              const appear = settled ? 1 : (grown < 0.18 ? grown / 0.18 : 1);
              const pad = this.player.radius - 10;
              let hit = false;
              if (e.lobes && e.lobes.length > 1) {
                  for (const l of e.lobes) {
                      const rx = l.rx + pad;
                      const ry = l.ry + pad;
                      if (rx <= 1 || ry <= 1) continue;
                      const dx = this.player.pos.x - e.pos.x - l.x;
                      const dy = this.player.pos.y - e.pos.y - l.y;
                      if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) < 1) { hit = true; break; }
                  }
              } else {
                  const hitR = settled ? e.angle! : e.radius * (0.28 + 0.72 * appear);
                  hit = distSq(this.player.pos, e.pos) < (hitR + pad) ** 2;
              }
              if (hit) {
                  this.acidContact = 0.45;
                  if (this.acidBite <= 0) {
                      const pressure = campaignPressure(this.currentWaveIndex);
                      const bite = (3.5 + pressure * 5.5) * (this.difficultyMods.dmg / 1.65);
                      this.damagePlayer(bite, e.pos, onGameOver, onLifeLost, stats, true);
                      this.acidBite = 0.4;
                      this.acidDrip += bite;
                  }
                  this.acidCue -= dtSeconds;
                  if (this.acidCue <= 0) {
                      this.acidCue = 0.42;
                      const shown = Math.max(1, Math.round(this.acidDrip));
                      this.acidDrip = 0;
                      this.spawnText(
                          { x: this.player.pos.x, y: this.player.pos.y - 16 },
                          `${this.t('MSG_ACID')} -${shown}`,
                          '#e7d4ff',
                          22
                      );
                      audioManager.playHit(this.player.pos);
                      this.shakeIntensity = Math.max(this.shakeIntensity, 14);
                      const sparks = this.isLowQuality ? 2 : 5;
                      for (let k = 0; k < sparks; k++) {
                          const ang = Math.random() * Math.PI * 2;
                          this.particles.push({
                              id: 'spark', type: EntityType.PARTICLE, pos: { ...this.player.pos },
                              vel: { x: Math.cos(ang) * 2.2, y: -1.5 - Math.random() * 2.5 },
                              radius: 2.5, health: 1, maxHealth: 1, color: '#d7b4ff', damage: 0, active: true, ttl: 16
                          });
                      }
                  }
              }
          } else if (e.type === EntityType.ENEMY_PROJECTILE && e.active) {
              if (distSq(this.player.pos, e.pos) < (e.radius + this.player.radius)**2) {
                  // environmental=true removes knockback/protection logic
                  this.damagePlayer(e.damage, e.pos, onGameOver, onLifeLost, stats, true);
                  e.active = false; 
              }
          }
      });
    }

    this.clearGrid();
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      if (!e.active) continue;

      if (e.type === EntityType.SERUM) {
          this.updateSerum(e, tick);
          continue;
      }

      if (e.hitFlash && e.hitFlash > 0) e.hitFlash--;
      if (e.stun && e.stun > 0) {
          e.stun = Math.max(0, e.stun - dtSeconds);
          e.hitFlash = Math.max(e.hitFlash || 0, 3);
          e.pos.x += Math.sin(this.time * 0.09 + e.pos.y) * 0.7;
          e.pos.y += Math.cos(this.time * 0.11 + e.pos.x) * 0.5;
      }

      if (e.type !== EntityType.TEXT_POPUP) {
        const drag = e.drag ?? 0.5;
        const isMagnetized = e.type === EntityType.DNA_FRAGMENT && (this.surgeActive || this.isVacuuming);
        const flowInfluence = e.type === EntityType.BIO_MINE
          ? MINE_FLOW
          : (e.type === EntityType.ANTIBODY || e.type === EntityType.ACID_POOL || e.type === EntityType.ENEMY_PROJECTILE || isMagnetized) ? 0 : (e.type === EntityType.BOSS ? 0.1 : 1);
        let windScale = 1;
        if (e.type === EntityType.BOSS) windScale = 0.18;
        else if (e.type === EntityType.BIO_MINE) windScale = MINE_WIND;
        else if (e.type === EntityType.ACID_POOL) windScale = e.id.startsWith('bile_') ? 0.45 : 0;
        else if (e.type === EntityType.ANTIBODY || e.type === EntityType.ENEMY_PROJECTILE) windScale = 0.8;
        else if (e.type === EntityType.ORGAN_PICKUP) windScale = 1.15;
        else if (e.type === EntityType.PLAYER) windScale = 0;

        e.pos.x += (e.vel.x + (this.bloodFlow.x * (1 - drag) * flowInfluence) + this.organ.wind.x * windScale) * tick;
        e.pos.y += (e.vel.y + (this.bloodFlow.y * (1 - drag) * flowInfluence) + this.organ.wind.y * windScale) * tick;
        
        // VARIETY INJECTION: ZIG-ZAG FUNGI
        if (e.type === EntityType.FUNGI && this.player.active) {
            e.vel.y += Math.sin(this.time * 0.005 + e.pos.x * 0.01) * 0.5;
        }

        if (e.type === EntityType.BOSS) {
            if ((e.stun ?? 0) <= 0) this.updateBoss(e, dtSeconds, stats); 
            e.vel.x *= 0.95; 
            e.vel.y *= 0.95; 
            const margin = e.radius + 10;
            e.pos.x = Math.max(margin, Math.min(CANVAS_WIDTH - margin, e.pos.x));
            e.pos.y = Math.max(margin, Math.min(CANVAS_HEIGHT - margin, e.pos.y));
        }

        if (e.type === EntityType.VIRUS && this.player.active && (e.stun ?? 0) <= 0 && e.pos.x < CANVAS_WIDTH + 100) {
            if (e.shootTimer !== undefined) {
                e.shootTimer -= dtSeconds;
                if (e.shootTimer <= 0) {
                    const angle = Math.atan2(this.player.pos.y - e.pos.y, this.player.pos.x - e.pos.x);
                    const speed = 8.2;
                    this.entities.push({
                        id: `eproj_${Date.now()}`, type: EntityType.ENEMY_PROJECTILE,
                        pos: { ...e.pos },
                        vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
                        radius: 12, health: 1, maxHealth: 1, color: this.colors.ENEMY_PROJECTILE,
                        damage: Math.max(6, e.damage * 0.36), active: true, drag: 0
                    });
                    
                    e.shootTimer = 3.5; 
                    // VARIETY: SOUND CALL FOR ENEMY SHOOT
                    audioManager.playEnemyShoot(e.pos);
                }
            }
        }
        
        // VARIETY INJECTION: TRACKING PROJECTILES (WEAK HOMING)
        if (e.type === EntityType.ENEMY_PROJECTILE && this.player.active) {
            const dx = this.player.pos.x - e.pos.x;
            const dy = this.player.pos.y - e.pos.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > 0 && dist < 320) {
                const before = Math.hypot(e.vel.x, e.vel.y);
                const steer = 0.055;
                e.vel.x += (dx / dist) * steer;
                e.vel.y += (dy / dist) * steer;
                const next = Math.hypot(e.vel.x, e.vel.y);
                if (before > 0.01 && next > before) {
                    e.vel.x *= before / next;
                    e.vel.y *= before / next;
                }
            }
        }

        if (e.type === EntityType.BIO_MINE) {
            e.vel.x *= MINE_COAST;
            e.vel.y *= MINE_COAST;
        } else if (e.type !== EntityType.ANTIBODY && e.type !== EntityType.ACID_POOL && e.type !== EntityType.ENEMY_PROJECTILE && e.type !== EntityType.BOSS) {
          e.vel.x *= 0.95;
          e.vel.y *= 0.95;
        }

        if (e.type !== EntityType.BOSS && e.type !== EntityType.PLAYER && this.isOutOfBoundsExtended(e.pos)) {
            if (!(this.isVacuuming && e.type === EntityType.DNA_FRAGMENT)) {
                e.active = false;
                continue;
            }
        }
      } else {
        e.pos.y -= 1 * tick;
        e.vel.x *= 0.9;
        e.pos.x += e.vel.x;
        e.ttl = (e.ttl || 0) - 1;
        if (e.ttl <= 0) e.active = false;
      }
      
      if (e.type === EntityType.ACID_POOL) {
          e.ttl = (e.ttl || 0) - (dt/1000);
          if (e.ttl <= 0) e.active = false;
      }

      if (this.isEnemy(e.type) || e.type === EntityType.BOSS || e.type === EntityType.BIO_MINE) {
          this.addToGrid(e);
      }
    }

    for (const e of this.entities) {
      if (!e.active) continue;

      if (e.type === EntityType.ANTIBODY || e.type === EntityType.ORBITAL) {
         const candidates = this.getPotentialCollisions(e);
         
         for (const other of candidates) {
           if (!other.active) continue;

           if (other.type === EntityType.BIO_MINE && e.type === EntityType.ANTIBODY) {
               if (distSq(e.pos, other.pos) < (e.radius + other.radius * 2.5)**2) {
                   e.active = false;
                   other.active = false;
                   this.sessionStats.mineKills++;
                   achievementManager.track('mine_pop_20', 1);
                   this.shakeIntensity = 25;
                   this.spawnText(other.pos, this.t('MSG_BURST'), '#ffcc00', 55); 
                   // VARIETY: SOUND CALL FOR MINE EXPLOSION (SHOT)
                   audioManager.playMineExplosionShot(other.pos);
                   audioManager.playSurge(other.pos);
                   buzz('boom'); 
                   
                   this.particles.push({
                        id: 'mine_expl', type: EntityType.PARTICLE, pos: {...other.pos},
                        vel: {x:0, y:0}, radius: 350, health:1, maxHealth:1, color: 'rgba(255, 170, 0, 0.6)', damage:0, active:true, ttl: 25
                   });
                   
                   // REDUZIDO DE 18 PARA 5 NO MODO LOW QUALITY PRA GARANTIR QUE A EXPLOSAO GRANDE APARECA
                   const sparkCount = this.isLowQuality ? 5 : 18;
                   for(let k=0; k<sparkCount; k++) {
                       const ang = Math.random() * Math.PI * 2;
                       const spd = Math.random() * 20 + 10;
                       this.particles.push({
                           id: 'spark', type: EntityType.PARTICLE, pos: {...other.pos},
                           vel: { x: Math.cos(ang)*spd, y: Math.sin(ang)*spd },
                           radius: 5, health:1, maxHealth:1, color: '#ffeeaa', damage:0, active:true, ttl: 35
                       });
                   }

                   const explosionRadiusSq = 350 * 350;
                   this.entities.forEach(victim => {
                       if ((this.isEnemy(victim.type) || victim.type === EntityType.BOSS) && victim.active) {
                           const d = distSq(victim.pos, other.pos);
                           if (d < explosionRadiusSq) {
                               this.damageEnemy(victim, 800, true, stats);
                               const dist = Math.sqrt(d);
                               if (dist > 0) {
                                   const force = 40; 
                                   const dx = victim.pos.x - other.pos.x;
                                   const dy = victim.pos.y - other.pos.y;
                                   victim.vel.x += (dx/dist) * force;
                                   victim.vel.y += (dy/dist) * force;
                               }
                           }
                       }
                   });
                   break;
               }
           }

           if (this.isEnemy(other.type) || other.type === EntityType.BOSS) {
             if (e.type === EntityType.ORBITAL && (e.shootTimer ?? 0) > 0) break;
             const rSum = e.radius + other.radius;
             if (Math.abs(e.pos.x - other.pos.x) < rSum && Math.abs(e.pos.y - other.pos.y) < rSum) {
                 if (distSq(e.pos, other.pos) < rSum * rSum) {
                   if (e.type === EntityType.ANTIBODY) e.active = false;
                   if (e.type === EntityType.ORBITAL) e.shootTimer = 0.5;
                   
                   const comboPower = comboDamageMultiplier(this.comboCount);
                   this.damageEnemy(other, e.damage * (e.type === EntityType.ORBITAL ? 1 : comboPower), e.type === EntityType.ANTIBODY, stats);
                   
                   if (e.type === EntityType.ANTIBODY) {
                       audioManager.playHit(e.pos);
                       if (!this.isLowQuality) {
                           const angle = Math.atan2(e.vel.y, e.vel.x);
                           for(let j=0; j<2; j++) { 
                               this.particles.push({
                                   id: 'spark', type: EntityType.PARTICLE, pos: {...e.pos}, 
                                   vel: { x: Math.cos(angle + (Math.random()-0.5)) * 5, y: Math.sin(angle + (Math.random()-0.5)) * 5 },
                                   radius: 2, health: 1, maxHealth: 1, color: '#fff', damage: 0, active: true, ttl: 10
                               });
                           }
                       }
                   }
                   break; 
                 }
             }
           }
         }

      } else if (this.isEnemy(e.type) || e.type === EntityType.BOSS) {
        if (this.player.active) {
          const dx = this.player.pos.x - e.pos.x;
          const dy = this.player.pos.y - e.pos.y;
          if (e.pos.x > -200 && e.pos.x < CANVAS_WIDTH + 200) {
              const dMag = Math.sqrt(dx*dx + dy*dy);
              
              if (dMag > 0) {
                const climb = Math.min(1, Math.max(0, this.currentWaveIndex) / CAMPAIGN_LAST_INDEX);
                const wall = Math.min(0.18, wavesPastTheWall(this.currentWaveIndex) * 0.015);
                let speed = (0.2 + climb * 0.08 + wall) * this.difficultyMods.speed;
                if (this.patient.strain === ViralStrain.VOLATILE) speed *= 1.18;
                if (this.patient.strain === ViralStrain.TITAN) speed *= 0.75;
                if (e.type === EntityType.VIRUS) speed *= 0.82;
                if (e.isElite) speed *= 0.72;
                if (e.type === EntityType.FUNGI) speed = 0.16; 

                if (e.type !== EntityType.BOSS && (e.stun ?? 0) <= 0) {
                    e.vel.x += (dx / dMag) * speed * tick;
                    e.vel.y += (dy / dMag) * speed * tick;
                }
              }

              const pSum = e.radius + this.player.radius;
              if (dMag < pSum * 0.8 && (e.stun ?? 0) <= 0) {
                 if (this.invulnerabilityTimer <= 0 && !this.isDashing) {
                     if (stats.thorns > 0) this.damageEnemy(e, stats.thorns, false, stats);
                     let damage = e.isElite ? 2.5 : 0.6;
                     damage *= this.difficultyMods.dmg;
                     if (e.type === EntityType.BOSS) damage = Math.max(3, e.damage * 0.11);
                     if (e.type === EntityType.VIRUS) damage = Math.max(damage, e.damage * (e.isElite ? 0.62 : 0.55));
                     // Damage from enemy collision uses protection logic
                     this.damagePlayer(damage, e.pos, onGameOver, onLifeLost, stats, false, e);
                 }
              }
          }
        }
      } else if (e.type === EntityType.DNA_FRAGMENT) {
        if (this.player.active) {
          const dx = this.player.pos.x - e.pos.x;
          const dy = this.player.pos.y - e.pos.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          const isVacuuming = this.isVacuuming;
          
          if (dist < stats.magnetRadius || this.surgeActive || isVacuuming) {
            const speed = isVacuuming ? Math.max(140, dist * 0.55) : (this.surgeActive ? 50 : 28);
            // Sem o teto, o vácuo do fim da onda passa do corpo e a moeda
            // fica orbitando colada no personagem até ele se mexer.
            const step = Math.min(dist, speed * tick);
            if (dist > 0.001) {
                e.pos.x += (dx / dist) * step;
                e.pos.y += (dy / dist) * step;
            }

            if (dist - step < this.player.radius + e.radius) {
              e.active = false;
              const energyGain = e.isElite ? 12 : 3;
              this.energy = Math.min(this.energy + energyGain, stats.maxEnergy);
              const val = (e.value || 1);
              this.biomass += val; 
              this.sessionStats.biomassCollected += val;
              achievementManager.track('biomass_10k', val);
              if (this.biomass >= 3000) achievementManager.track('rich', 3000);
              audioManager.playCoin(e.pos);
              if (!this.isLowQuality && this.particles.length < 180) {
                  for (let k = 0; k < 6; k++) {
                      const a = (k / 6) * Math.PI * 2;
                      this.particles.push({
                          id: 'coin',
                          type: EntityType.PARTICLE,
                          pos: { x: e.pos.x, y: e.pos.y },
                          vel: { x: Math.cos(a) * 2.1, y: Math.sin(a) * 2.1 - 0.8 },
                          radius: k % 2 === 0 ? 2.4 : 1.3,
                          health: 1, maxHealth: 1,
                          color: k % 3 === 0 ? '#fff6d0' : '#f0c14a',
                          damage: 0, active: true, ttl: 14,
                      });
                  }
              }
            }
          }
        }
      }
    }

    let particleWrite = 0;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (p.id === 'mine_expl' || p.id === 'mine_expl_dash' || p.id === 'system_glitch') {
          p.ttl = (p.ttl || 0) - 1;
          if ((p.ttl || 0) <= 0) continue;
          this.particles[particleWrite++] = p;
          continue;
      }
      
      if (p.id === 'bg') {
          if (p.damage === 1) {
              p.health -= dtSeconds * 0.85;
              if (p.health <= 0) continue;
          }
          if (!this.isLowQuality) {
              const style = p.value || 0;
              const rise = cellRises(style) ? -0.55 : 0;
              const wander = Math.sin(this.time * 0.0011 + p.vel.y) * (0.22 + p.radius * 0.03);
              p.pos.x += (p.vel.x + this.bloodFlow.x * 0.28 + this.organ.wind.x * 0.35) * tick;
              p.pos.y += (wander + rise + this.organ.wind.y * 0.35) * tick;
              if (p.pos.y < -40 || p.pos.y > CANVAS_HEIGHT + 40) p.pos.y = Math.random() * CANVAS_HEIGHT;
              if (p.pos.x < -80) {
                  p.pos.x = CANVAS_WIDTH + 12 + Math.random() * 80;
                  p.pos.y = Math.random() * CANVAS_HEIGHT;
              }
          }
      } else if (p.id === 'zap') {
          p.ttl = (p.ttl || 0) - 1;
          if ((p.ttl || 0) <= 0) continue;
      } else {
          p.pos.x += (p.vel.x + this.bloodFlow.x) * tick;
          p.pos.y += (p.vel.y + this.bloodFlow.y) * tick;
          p.vel.x *= 0.9; 
          p.vel.y *= 0.9;
          
          p.ttl = (p.ttl || 0) - 1;
          if ((p.ttl || 0) <= 0) continue;
      }
      this.particles[particleWrite++] = p;
    }
    this.particles.length = particleWrite;
    
    const currentMaxParticles = this.isLowQuality ? 30 : 250;
    if (this.particles.length > currentMaxParticles) {
        // MUDANÇA: Protege as particulas de explosao de minas de serem deletadas pelo limite de low quality
        const removableIndex = this.particles.findIndex(p => p.id !== 'bg' && p.id !== 'mine_expl' && p.id !== 'mine_expl_dash');
        if (removableIndex !== -1) this.particles.splice(removableIndex, 1);
        else {
             // Se só temos particulas criticas, removemos BG como ultimo recurso
             const bgIndex = this.particles.findIndex(p => p.id === 'bg');
             if (bgIndex !== -1) this.particles.splice(bgIndex, 1);
             else this.particles.pop();
        }
    }
    
    if (!this.isLowQuality) {
        this.bgGap -= dt / 1000;
        const bgCount = this.particles.reduce((n, p) => n + (p.id === 'bg' && p.damage !== 1 ? 1 : 0), 0);
        if (this.bgGap <= 0 && bgCount < cellBudget(this.organ.id)) {
            const cluster = 1 + Math.floor(Math.random() * 3);
            for (let i = 0; i < cluster; i++) this.spawnBackgroundCell(false);
            this.bgGap = 0.35 + Math.random() * 1.7;
        }
    }
    if (this.acidContact > 0) this.acidContact -= dt / 1000;
    if (this.acidBite > 0) this.acidBite -= dt / 1000;
    else {
        this.acidDrip = 0;
        this.acidCue = 0;
    }
    
    this.nudgeFoes();
    this.organ.end(dtSeconds, organHooks);

    this.shakeIntensity *= 0.9;
    if (this.shakeIntensity < 0.5) this.shakeIntensity = 0;
    this.compactInactive(this.entities);
  }

  private isOutOfBoundsExtended(pos: Vector2) {
      return pos.x < -400 || pos.x > CANVAS_WIDTH + 400 || pos.y < -400 || pos.y > CANVAS_HEIGHT + 400;
  }
  
  private nudgeFoes() {
      const list = this.entities;
      for (let i = 0; i < list.length; i++) {
          const a = list[i];
          if (!a.active || !this.isEnemy(a.type)) continue;
          for (let j = i + 1; j < list.length; j++) {
              const b = list[j];
              if (!b.active || !this.isEnemy(b.type)) continue;
              let dx = b.pos.x - a.pos.x;
              let dy = b.pos.y - a.pos.y;
              const bothParasites = a.type === EntityType.PARASITE && b.type === EntityType.PARASITE;
              const min = bothParasites
                  ? (a.radius + b.radius) * 0.82
                  : Math.max(18, Math.min(a.radius, b.radius) * 0.42);
              const d2 = dx * dx + dy * dy;
              if (d2 >= min * min) continue;
              if (d2 < 0.04) { dx = 1; dy = 0; }
              const d = Math.sqrt(dx * dx + dy * dy) || 1;
              const push = (min - Math.min(d, min)) * (bothParasites ? 0.55 : 0.45);
              const nx = dx / d;
              const ny = dy / d;
              a.pos.x -= nx * push;
              a.pos.y -= ny * push;
              b.pos.x += nx * push;
              b.pos.y += ny * push;
          }
      }
  }

  private isEnemy(t: EntityType) {
    return t === EntityType.BACTERIA || t === EntityType.VIRUS || t === EntityType.PARASITE || t === EntityType.FUNGI;
  }

  private spawnSerum() {
      const intro = !this.serumIntroduced;
      this.serumIntroduced = true;
      const y = intro
          ? this.player.pos.y
          : 140 + Math.random() * (CANVAS_HEIGHT - 280);
      this.entities.push({
          id: `serum_${Date.now()}`,
          type: EntityType.SERUM,
          pos: { x: CANVAS_WIDTH + 70, y },
          vel: { x: 0, y: 0 },
          radius: 48,
          health: 1,
          maxHealth: 1,
          color: '#ff4ad4',
          damage: intro ? 18 : 76,
          active: true,
          value: y,
          orbitOffset: Math.random() * Math.PI * 2
      });
  }

  private updateSerum(e: Entity, tick: number) {
      const anchor = e.value || e.pos.y;
      const amp = e.damage || 0;
      e.pos.x -= 3.55 * tick;
      e.pos.y = anchor + Math.sin(this.time / 240 + (e.orbitOffset || 0)) * amp;

      if (!this.isLowQuality && Math.random() < 0.28) {
          this.particles.push({
              id: 'spark',
              type: EntityType.PARTICLE,
              pos: { x: e.pos.x + 14, y: e.pos.y + (Math.random() - 0.4) * 10 },
              vel: { x: 0.8 + Math.random() * 1.4, y: (Math.random() - 0.5) * 1.2 },
              radius: 1.4 + Math.random() * 1.6,
              health: 1, maxHealth: 1,
              color: Math.random() < 0.55 ? '#7af7ff' : '#ffe14a',
              damage: 0, active: true, ttl: 16
          });
      }

      if (this.player.active) {
          const reach = this.player.radius + e.radius;
          if (distSq(this.player.pos, e.pos) < reach * reach) {
              e.active = false;
              this.serumReady = true;
              audioManager.playPowerUp(e.pos);
              return;
          }
      }
      if (e.pos.x < -140) e.active = false;
  }

  private drawSerum(e: Entity) {
      const x = e.pos.x;
      const y = e.pos.y;
      const spin = this.time / 420;
      const height = 108;
      const amp = 26;
      const turns = 1.55;
      const steps = this.isLowQuality ? 18 : 36;
      const sample = (phase: number, i: number) => {
          const t = i / steps;
          const ang = spin + phase + t * Math.PI * 2 * turns;
          return { x: Math.sin(ang) * amp, y: (t - 0.5) * height, z: Math.cos(ang) };
      };

      this.ctx.save();
      this.ctx.translate(x, y - 10);
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';

      if (!this.isLowQuality) {
          this.ctx.globalCompositeOperation = 'screen';
          this.drawGlow('#ffd36a', 54, 0.5, 0.14, 0.1);
          this.ctx.globalCompositeOperation = 'source-over';
      }

      const strand = (phase: number, front: boolean, color: string, dim: string) => {
          for (let i = 0; i < steps; i++) {
              const p = sample(phase, i);
              const n = sample(phase, i + 1);
              const z = (p.z + n.z) * 0.5;
              if ((z > 0) !== front) continue;
              this.ctx.strokeStyle = front ? color : dim;
              this.ctx.lineWidth = front ? 5.4 + z * 2.6 : 2.7;
              this.ctx.beginPath();
              this.ctx.moveTo(p.x, p.y);
              this.ctx.lineTo(n.x, n.y);
              this.ctx.stroke();
          }
      };

      strand(0, false, '#ffe7a3', 'rgba(196, 140, 42, 0.42)');
      strand(Math.PI, false, '#d7fbff', 'rgba(64, 148, 168, 0.38)');

      for (let i = 3; i < steps - 2; i += 4) {
          const p = sample(0, i);
          const q = sample(Math.PI, i);
          const z = (p.z + q.z) * 0.5;
          if (Math.hypot(q.x - p.x, q.y - p.y) < 10) continue;
          this.ctx.strokeStyle = z > 0.12 ? 'rgba(255, 250, 236, 0.96)' : 'rgba(186, 146, 68, 0.32)';
          this.ctx.lineWidth = z > 0.12 ? 3.2 : 1.7;
          this.ctx.beginPath();
          this.ctx.moveTo(p.x, p.y);
          this.ctx.lineTo(q.x, q.y);
          this.ctx.stroke();
      }

      strand(0, true, '#ffe7a3', 'rgba(196, 140, 42, 0.42)');
      strand(Math.PI, true, '#d7fbff', 'rgba(64, 148, 168, 0.38)');

      if (!this.isLowQuality) {
          for (let i = 1; i < steps; i += 2) {
              const p = sample(0, i);
              if (p.z < 0.7) continue;
              this.ctx.fillStyle = '#fffaf0';
              this.ctx.beginPath();
              this.ctx.arc(p.x, p.y, 2.2 + p.z * 1.4, 0, Math.PI * 2);
              this.ctx.fill();
          }
      }

      this.ctx.restore();

      const tag = this.t('SERUM_TAG');
      this.ctx.save();
      this.ctx.font = '700 22px "Chakra Petch", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      const plateW = this.ctx.measureText(tag).width + 22;
      const lyLabel = y + 58;
      this.ctx.fillStyle = 'rgba(22, 12, 4, 0.9)';
      this.ctx.strokeStyle = 'rgba(255, 214, 120, 0.95)';
      this.ctx.lineWidth = 1.6;
      this.ctx.beginPath();
      this.ctx.roundRect(x - plateW / 2, lyLabel - 13, plateW, 26, 13);
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.fillStyle = '#ffe7a8';
      this.ctx.fillText(tag, x, lyLabel + 1);
      this.ctx.restore();
  }

  private findTarget(): Entity | null {
    let closest: Entity | null = null;
    let minDistSq = Infinity;
    
    let checks = 0;
    for (const e of this.entities) {
      if (checks > 50) break; 
      if ((this.isEnemy(e.type) || e.type === EntityType.BOSS) && e.active) {
         if (e.pos.x > -200) { 
             const d = distSq(this.player.pos, e.pos);
             if (d < minDistSq) {
                 minDistSq = d;
                 closest = e;
                 if (minDistSq < 40000) return closest; 
             }
             checks++;
         }
      }
    }
    return closest;
  }

  private shoot(target: Entity, stats: PlayerStats, drum: DrumHit) {
      // SURPRESA 2: CHOQUE DE SISTEMA
      if (this.systemGlitchActive) {
          this.systemGlitchActive = false;
          // Spawn "Error Smoke" particles instead of bullets
          for (let i = 0; i < 5; i++) {
              this.particles.push({
                  id: 'system_glitch', type: EntityType.PARTICLE,
                  pos: { ...this.player.pos },
                  vel: { x: (Math.random()-0.5)*10, y: (Math.random()-0.5)*10 },
                  radius: 5 + Math.random()*5,
                  health: 1, maxHealth: 1, color: '#888', active: true, ttl: 15, damage: 0
              });
          }
          audioManager.playHit(); // Som de falha
          return;
      }

      const angle = Math.atan2(target.pos.y - this.player.pos.y, target.pos.x - this.player.pos.x);
      const count = stats.bulletCount;
      const spread = 0.15; 
      const startAngle = angle - ((count - 1) * spread) / 2;

      for (let i = 0; i < count; i++) {
          const a = startAngle + (i * spread) + (Math.random() - 0.5) * 0.05;
          this.entities.push({
              id: `p_${Date.now()}_${i}`,
              type: EntityType.ANTIBODY,
              pos: { ...this.player.pos },
              vel: { x: Math.cos(a) * stats.bulletSpeed, y: Math.sin(a) * stats.bulletSpeed },
              radius: 5, health: 1, maxHealth: 1, color: this.colors.ANTIBODY,
              damage: stats.damage, active: true, ttl: 120 
          });
      }
      this.sessionStats.bulletsFired += count;
      audioManager.playDrum(drum);
      this.player.vel.x -= Math.cos(angle) * 0.5;
      this.player.vel.y -= Math.sin(angle) * 0.5;
  }

  private glowSprites = new Map<string, HTMLCanvasElement>();

  private glowSprite(color: string, innerAlpha: number, midAlpha: number | null, innerRatio: number): HTMLCanvasElement {
      const key = `${color}|${innerAlpha}|${midAlpha ?? 'x'}|${innerRatio}`;
      const cached = this.glowSprites.get(key);
      if (cached) return cached;

      const size = 256;
      const sprite = document.createElement('canvas');
      sprite.width = size;
      sprite.height = size;
      const g = sprite.getContext('2d')!;
      const c = size / 2;
      const grad = g.createRadialGradient(c, c, c * innerRatio, c, c, c);
      grad.addColorStop(0, hexToRgba(color, innerAlpha));
      if (midAlpha !== null) grad.addColorStop(0.5, hexToRgba(color, midAlpha));
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(c, c, c, 0, Math.PI * 2);
      g.fill();
      this.glowSprites.set(key, sprite);
      return sprite;
  }

  private drawGlow(color: string, radius: number, innerAlpha: number, midAlpha: number | null, innerRatio: number, x = 0, y = 0) {
      const sprite = this.glowSprite(color, innerAlpha, midAlpha, innerRatio);
      const d = radius * 2;
      this.ctx.drawImage(sprite, x - radius, y - radius, d, d);
  }

  private approachBg(dtSeconds: number) {
      const target = organBg(this.organ.id, this.colors.BG === COLORS_PLATINUM.BG);
      const tr = parseInt(target.slice(1, 3), 16);
      const tg = parseInt(target.slice(3, 5), 16);
      const tb = parseInt(target.slice(5, 7), 16);
      const changed = this.bgOrgan !== this.organ.id;
      this.bgOrgan = this.organ.id;
      if (changed && this.organ.charting()) {
          this.bgR = tr;
          this.bgG = tg;
          this.bgB = tb;
      } else {
          const k = 1 - Math.exp(-dtSeconds / 0.45);
          this.bgR += (tr - this.bgR) * k;
          this.bgG += (tg - this.bgG) * k;
          this.bgB += (tb - this.bgB) * k;
      }
      this.bgFill = `rgb(${this.bgR | 0},${this.bgG | 0},${this.bgB | 0})`;
  }

  private drawPuddleUnion(e: Entity, kind: 'plaque' | 'bile' | 'acid', alpha: number, scale: number) {
      const lobes = e.lobes;
      if (!lobes || lobes.length < 2 || alpha <= 0.01) return;
      const ctx = this.ctx;
      const liquid = kind === 'acid';
      const phase = this.time / (liquid ? 480 : 700);
      let cx = 0;
      let cy = 0;
      for (const l of lobes) {
          cx += l.x;
          cy += l.y;
      }
      cx = e.pos.x + cx / lobes.length;
      cy = e.pos.y + cy / lobes.length;
      let reach = 48;
      for (const l of lobes) {
          const d = Math.hypot(e.pos.x + l.x - cx, e.pos.y + l.y - cy) + Math.max(l.rx, l.ry) * scale;
          if (d > reach) reach = d;
      }
      const path = () => {
          ctx.beginPath();
          const n = liquid ? (this.isLowQuality ? 14 : 20) : 16;
          for (const l of lobes) {
              const ox = e.pos.x + l.x;
              const oy = e.pos.y + l.y;
              const seed = l.x * 0.017 + l.y * 0.013;
              for (let i = 0; i <= n; i++) {
                  const a = (i / n) * Math.PI * 2;
                  let px: number;
                  let py: number;
                  if (liquid) {
                      const base = Math.max(l.rx, l.ry) * scale;
                      const wob = Math.sin(a * 3 + phase + seed) * base * 0.14
                          + Math.cos(a * 5 - phase + seed) * base * 0.05;
                      px = ox + Math.cos(a) * (l.rx * scale + wob);
                      py = oy + Math.sin(a) * (l.ry * scale + wob);
                  } else {
                      const wob = 1 + 0.03 * Math.sin(a * 3 + phase + l.x * 0.01);
                      px = ox + Math.cos(a) * l.rx * scale * wob;
                      py = oy + Math.sin(a) * l.ry * scale * wob;
                  }
                  if (i === 0) ctx.moveTo(px, py);
                  else ctx.lineTo(px, py);
              }
              ctx.closePath();
          }
      };
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      if (kind === 'acid') {
          ctx.globalAlpha = alpha * 0.55;
          ctx.lineWidth = 20;
          ctx.strokeStyle = 'rgba(226, 196, 255, 0.95)';
          path();
          ctx.stroke();
      } else {
          ctx.globalAlpha = alpha;
          ctx.lineWidth = 2.4;
          ctx.strokeStyle = kind === 'plaque' ? 'rgba(74, 58, 28, 0.85)' : 'rgba(36, 42, 10, 0.55)';
          path();
          ctx.stroke();
      }
      ctx.globalAlpha = alpha;
      const flowX = liquid ? Math.sin(this.time / 1100) * reach * 0.08 : 0;
      const flowY = liquid ? Math.cos(this.time / 1400) * reach * 0.06 : 0;
      const g = ctx.createRadialGradient(cx - reach * 0.12 + flowX, cy - reach * 0.1 + flowY, reach * 0.08, cx, cy, reach);
      if (kind === 'plaque') {
          g.addColorStop(0, '#e4d09a');
          g.addColorStop(0.55, '#c2a45c');
          g.addColorStop(1, '#8d7340');
      } else if (kind === 'bile') {
          g.addColorStop(0, 'rgba(255, 250, 186, 0.98)');
          g.addColorStop(0.22, 'rgba(206, 210, 72, 0.96)');
          g.addColorStop(0.7, 'rgba(148, 158, 36, 0.94)');
          g.addColorStop(1, 'rgba(70, 78, 18, 0.92)');
      } else {
          g.addColorStop(0, 'rgba(244, 226, 255, 0.98)');
          g.addColorStop(0.22, 'rgba(196, 112, 255, 0.96)');
          g.addColorStop(0.68, 'rgba(122, 43, 181, 0.96)');
          g.addColorStop(1, 'rgba(58, 12, 92, 0.94)');
      }
      ctx.fillStyle = g;
      path();
      ctx.fill();
      if (liquid) {
          ctx.save();
          path();
          ctx.clip();
          const drift = Math.sin(this.time / 860) * Math.min(10, reach * 0.05);
          ctx.globalAlpha = alpha * 0.5;
          ctx.fillStyle = 'rgba(244, 228, 255, 0.78)';
          ctx.beginPath();
          ctx.ellipse(cx - reach * 0.1 + drift, cy - reach * 0.08, Math.max(6, reach * 0.07), Math.max(2.4, reach * 0.026), -0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = alpha * 0.9;
          ctx.fillStyle = '#f6ecff';
          const bubbles = Math.min(this.isLowQuality ? 5 : 8, lobes.length * 2 + 1);
          for (let i = 0; i < bubbles; i++) {
              const l = lobes[i % lobes.length];
              const bob = (this.time / 900 + i * 0.37) % 1;
              const span = Math.max(l.rx, l.ry) * scale;
              const bx = e.pos.x + l.x + Math.cos(i * 2.1) * l.rx * scale * 0.32;
              const by = e.pos.y + l.y + Math.sin(i * 1.6) * l.ry * scale * 0.22 - bob * span * 0.12;
              ctx.beginPath();
              ctx.arc(bx, by, Math.max(2, Math.min(l.rx, l.ry) * scale * (0.03 + (i % 3) * 0.012)), 0, Math.PI * 2);
              ctx.fill();
          }
          ctx.restore();
      } else {
          ctx.globalAlpha = alpha * (kind === 'plaque' ? 0.55 : 0.8);
          ctx.fillStyle = kind === 'plaque' ? 'rgba(74, 58, 28, 0.7)' : 'rgba(255, 252, 220, 0.85)';
          ctx.beginPath();
          ctx.ellipse(cx - reach * 0.1, cy - reach * 0.08, Math.max(5, reach * 0.055), Math.max(2, reach * 0.022), -0.45, 0, Math.PI * 2);
          ctx.fill();
          const spots = Math.min(4, lobes.length + 1);
          for (let i = 0; i < spots; i++) {
              const l = lobes[i % lobes.length];
              const bx = e.pos.x + l.x + Math.cos(i * 2.2) * l.rx * scale * 0.22;
              const by = e.pos.y + l.y + Math.sin(i * 1.7) * l.ry * scale * 0.18;
              ctx.beginPath();
              ctx.arc(bx, by, kind === 'plaque' ? 3 : Math.max(2, l.rx * scale * 0.055), 0, Math.PI * 2);
              ctx.fill();
          }
      }
      ctx.restore();
  }

  private drawOrganPool(e: Entity) {
      if (e.lobes && e.lobes.length > 1) {
          const full = e.value && e.value > 0 ? e.value : 6;
          const left = Math.max(0, e.ttl || 0);
          const age = Math.max(0, full - left);
          const fade = left < 1.15 ? left / 1.15 : 1;
          const veil = Math.min(1, age / 0.35) * fade;
          const kind = e.id.startsWith('plaque_') ? 'plaque' : 'bile';
          this.drawPuddleUnion(e, kind, veil, fade);
          return;
      }
      const plaque = e.id.startsWith('plaque_');
      const full = e.value && e.value > 0 ? e.value : 6;
      const left = Math.max(0, e.ttl || 0);
      const age = Math.max(0, full - left);
      const settle = Math.min(1, age / 1.25);
      const fade = left < 1.15 ? left / 1.15 : 1;
      const veil = Math.min(1, age / 0.35) * fade;
      if (plaque) {
          this.drawPlaque(e, veil, settle);
          return;
      }
      this.drawBile(e, veil, settle);
  }

  private drawBile(e: Entity, veil: number, settle: number) {
      this.ctx.save();
      this.ctx.translate(e.pos.x, e.pos.y);
      this.ctx.globalAlpha = 0.92 * veil;
      const r = e.radius;
      const flat = 0.92 - 0.34 * settle;
      const phase = this.time / 680;
      this.ctx.beginPath();
      const n = 18;
      for (let i = 0; i <= n; i++) {
          const a = (i / n) * Math.PI * 2;
          const wob = 1 + 0.035 * Math.sin(a * 3 + phase) + 0.02 * Math.cos(a * 2 - phase * 0.6);
          const px = Math.cos(a) * r * 1.02 * wob;
          const py = Math.sin(a) * r * flat * wob;
          if (i === 0) this.ctx.moveTo(px, py);
          else this.ctx.lineTo(px, py);
      }
      this.ctx.closePath();
      const g = this.ctx.createRadialGradient(-r * 0.22, -r * 0.14, r * 0.04, 0, 0, r);
      g.addColorStop(0, 'rgba(255, 250, 186, 0.95)');
      g.addColorStop(0.16, 'rgba(206, 210, 72, 0.9)');
      g.addColorStop(0.62, 'rgba(148, 158, 36, 0.82)');
      g.addColorStop(1, 'rgba(46, 54, 12, 0.55)');
      this.ctx.fillStyle = g;
      this.ctx.fill();

      this.ctx.fillStyle = 'rgba(255, 252, 220, 0.85)';
      this.ctx.beginPath();
      this.ctx.ellipse(-r * 0.24, -r * 0.12, r * 0.07, r * 0.028, -0.5, 0, Math.PI * 2);
      this.ctx.fill();

      const spots: Array<[number, number, number]> = [
          [-0.28, 0.02, 0.09],
          [0.18, -0.06, 0.07],
          [0.02, 0.1, 0.055],
          [-0.08, -0.04, 0.04],
      ];
      for (let i = 0; i < spots.length; i++) {
          const [sx, sy, sr] = spots[i];
          const rise = ((this.time / 1400 + i * 0.23) % 1) * r * 0.08;
          const bx = sx * r;
          const by = sy * r - rise;
          const br = sr * r;
          this.ctx.fillStyle = 'rgba(255, 252, 210, 0.22)';
          this.ctx.beginPath();
          this.ctx.arc(bx, by, br, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.strokeStyle = 'rgba(255, 252, 220, 0.55)';
          this.ctx.lineWidth = 1.5;
          this.ctx.stroke();
          this.ctx.fillStyle = 'rgba(255, 255, 245, 0.8)';
          this.ctx.beginPath();
          this.ctx.arc(bx - br * 0.28, by - br * 0.3, br * 0.22, 0, Math.PI * 2);
          this.ctx.fill();
      }
      if (settle < 1) {
          const rest = e.angle && e.angle > 0 ? e.angle : r;
          this.ctx.globalAlpha = 0.4 * (1 - settle * 0.35) * veil;
          this.ctx.strokeStyle = 'rgba(255, 248, 186, 0.9)';
          this.ctx.lineWidth = 2;
          this.ctx.beginPath();
          this.ctx.ellipse(0, 0, rest * (0.45 + settle * 0.62), rest * 0.58 * (0.45 + settle * 0.62), 0, 0, Math.PI * 2);
          this.ctx.stroke();
      }
      this.ctx.restore();
  }

  private drawPlaque(e: Entity, veil: number, settle: number) {
      this.ctx.save();
      this.ctx.translate(e.pos.x, e.pos.y);
      this.ctx.globalAlpha = 0.9 * veil;

      if (settle < 1) {
          const rest = e.angle && e.angle > 0 ? e.angle : e.radius;
          this.ctx.fillStyle = 'rgba(92, 74, 36, 0.55)';
          for (let i = 0; i < 6; i++) {
              const ang = i * 1.17 + rest * 0.02;
              const dist = rest * (1.55 - settle * 0.85);
              this.ctx.beginPath();
              this.ctx.arc(Math.cos(ang) * dist, Math.sin(ang) * dist * 0.72, 2.4 + (i % 3), 0, Math.PI * 2);
              this.ctx.fill();
          }
      }

      this.ctx.beginPath();
      const n = 12;
      for (let i = 0; i <= n; i++) {
          const a = (i / n) * Math.PI * 2;
          const wob = 1 + 0.08 * Math.sin(a * 3 + this.time / 500);
          const px = Math.cos(a) * e.radius * 0.62 * wob;
          const py = Math.sin(a) * e.radius * 0.48 * wob;
          if (i === 0) this.ctx.moveTo(px, py);
          else this.ctx.lineTo(px, py);
      }
      this.ctx.closePath();
      this.ctx.fillStyle = '#c2a45c';
      this.ctx.fill();
      this.ctx.lineWidth = 2;
      this.ctx.strokeStyle = 'rgba(92, 74, 36, 0.8)';
      this.ctx.stroke();

      this.ctx.fillStyle = 'rgba(74, 58, 28, 0.55)';
      for (let i = 0; i < 3; i++) {
          this.ctx.beginPath();
          this.ctx.arc(
              Math.cos(i * 2.1) * e.radius * 0.18,
              Math.sin(i * 1.6) * e.radius * 0.12,
              3.5 + (i % 2) * 1.5,
              0, Math.PI * 2
          );
          this.ctx.fill();
      }
      this.ctx.restore();
  }

  private drawCoin(e: Entity) {
      const spin = Math.cos(this.time / 280 + e.pos.x * 0.01);
      const sx = Math.max(0.16, Math.abs(spin));
      const bob = Math.sin(this.time / 260 + e.pos.y * 0.02) * 1.8;
      const r = e.radius * 1.15;
      const x = e.pos.x;
      const y = e.pos.y + bob;
      const gold = e.isElite ? '#ffe08a' : '#ffd56a';
      this.ctx.save();
      this.ctx.fillStyle = gold;
      this.ctx.globalAlpha = 0.28;
      this.ctx.beginPath();
      this.ctx.arc(x, y, r * 1.7, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();

      this.ctx.save();
      this.ctx.translate(x, y);
      this.ctx.scale(sx, 1);
      const g = this.ctx.createRadialGradient(-r * 0.32, -r * 0.38, r * 0.05, 0, 0, r);
      g.addColorStop(0, '#fffef4');
      g.addColorStop(0.34, e.isElite ? '#ffe7a0' : '#ffd15a');
      g.addColorStop(0.74, '#f0a018');
      g.addColorStop(1, '#a85a08');
      this.ctx.fillStyle = g;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, r, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = '#6a3808';
      this.ctx.lineWidth = Math.max(1.5, r * 0.11);
      this.ctx.stroke();
      this.ctx.strokeStyle = 'rgba(255, 250, 220, 0.95)';
      this.ctx.lineWidth = Math.max(1, r * 0.065);
      this.ctx.beginPath();
      this.ctx.arc(0, 0, r * 0.74, 0, Math.PI * 2);
      this.ctx.stroke();
      if (sx > 0.42) {
          this.ctx.strokeStyle = '#5c320c';
          this.ctx.lineWidth = Math.max(1.6, r * 0.13);
          this.ctx.lineCap = 'round';
          this.ctx.beginPath();
          this.ctx.moveTo(0, -r * 0.4);
          this.ctx.bezierCurveTo(r * 0.32, -r * 0.06, -r * 0.32, r * 0.06, 0, r * 0.4);
          this.ctx.moveTo(0, -r * 0.4);
          this.ctx.bezierCurveTo(-r * 0.32, -r * 0.06, r * 0.32, r * 0.06, 0, r * 0.4);
          this.ctx.stroke();
      }
      this.ctx.save();
      this.ctx.rotate(this.time / 380 + e.pos.x * 0.01);
      this.ctx.fillStyle = 'rgba(255, 255, 248, 0.92)';
      this.ctx.beginPath();
      this.ctx.ellipse(r * 0.08, 0, r * 0.1, r * 0.62, 0.35, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
      const tw = 0.35 + 0.65 * Math.abs(Math.sin(this.time / 160 + e.pos.y * 0.02));
      this.ctx.globalAlpha = tw;
      this.ctx.fillStyle = '#fffef8';
      this.ctx.beginPath();
      this.ctx.moveTo(r * 0.42, -r * 0.55);
      this.ctx.lineTo(r * 0.48, -r * 0.34);
      this.ctx.lineTo(r * 0.68, -r * 0.28);
      this.ctx.lineTo(r * 0.48, -r * 0.22);
      this.ctx.lineTo(r * 0.42, 0);
      this.ctx.lineTo(r * 0.36, -r * 0.22);
      this.ctx.lineTo(r * 0.16, -r * 0.28);
      this.ctx.lineTo(r * 0.36, -r * 0.34);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.restore();
  }

  private drawOrganPickup(e: Entity) {
      const kind = e.value || 1;
      const base = e.angle && e.angle > 0 ? e.angle : e.radius;
      const scale = base > 0 ? e.radius / base : 1;
      const full = e.maxHealth > 2 ? e.maxHealth : 12;
      const left = Math.max(0, e.ttl || 0);
      const age = Math.max(0, full - left);
      let alpha = 0.95;
      if (age < 0.4) alpha = 0.95 * (age / 0.4);
      else if (left < 0.9) alpha = 0.95 * (left / 0.9);
      this.ctx.save();
      this.ctx.translate(e.pos.x, e.pos.y);
      this.ctx.scale(scale, scale);
      this.ctx.globalAlpha = alpha;
      if (kind === 1) {
          const pulse = 0.5 + 0.5 * Math.sin(this.time / 180);
          this.ctx.fillStyle = `rgba(150, 255, 230, ${0.08 + pulse * 0.08})`;
          this.ctx.beginPath();
          this.ctx.arc(0, -4, 48 + pulse * 6, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.strokeStyle = `rgba(170, 255, 236, ${0.45 + pulse * 0.45})`;
          this.ctx.lineWidth = 3;
          this.ctx.stroke();

          this.ctx.fillStyle = '#f6fffc';
          this.ctx.strokeStyle = '#9dffef';
          this.ctx.lineWidth = 4;
          this.ctx.beginPath();
          this.ctx.moveTo(0, -34);
          this.ctx.bezierCurveTo(28, -28, 30, 2, 0, 22);
          this.ctx.bezierCurveTo(-30, 2, -28, -28, 0, -34);
          this.ctx.closePath();
          this.ctx.fill();
          this.ctx.stroke();

          this.ctx.fillStyle = '#7eead4';
          this.ctx.beginPath();
          this.ctx.ellipse(-7, -10, 6, 10, -0.4, 0, Math.PI * 2);
          this.ctx.fill();

          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.lineWidth = 5;
          this.ctx.strokeStyle = 'rgba(8, 28, 26, 0.7)';
          this.ctx.fillStyle = '#f3fffb';
          this.ctx.font = '800 22px "Chakra Petch", sans-serif';
          this.ctx.strokeText(this.t('MSG_FLUORIDE'), 0, 46);
          this.ctx.fillText(this.t('MSG_FLUORIDE'), 0, 46);
          this.ctx.font = '700 15px "Chakra Petch", sans-serif';
          this.ctx.fillStyle = '#b8fff0';
          this.ctx.strokeText(this.t('FLUORIDE_HINT'), 0, 66);
          this.ctx.fillText(this.t('FLUORIDE_HINT'), 0, 66);
          this.ctx.restore();
          return;
      }
      if (kind === 2) {
          const pulse = 0.5 + 0.5 * Math.sin(this.time / 200);
          this.ctx.fillStyle = `rgba(255, 214, 120, ${0.1 + pulse * 0.1})`;
          this.ctx.beginPath();
          this.ctx.arc(0, -2, 42 + pulse * 6, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.strokeStyle = `rgba(255, 220, 140, ${0.35 + pulse * 0.4})`;
          this.ctx.lineWidth = 2.5;
          this.ctx.stroke();

          this.ctx.fillStyle = '#ffe7a3';
          this.ctx.strokeStyle = '#fff6d4';
          this.ctx.lineWidth = 3;
          this.ctx.beginPath();
          this.ctx.moveTo(0, -28);
          this.ctx.bezierCurveTo(20, -18, 18, 8, 0, 22);
          this.ctx.bezierCurveTo(-18, 8, -20, -18, 0, -28);
          this.ctx.closePath();
          this.ctx.fill();
          this.ctx.stroke();

          this.ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
          this.ctx.beginPath();
          this.ctx.ellipse(-5, -8, 4, 7, -0.5, 0, Math.PI * 2);
          this.ctx.fill();

          this.ctx.strokeStyle = '#6a4a10';
          this.ctx.lineWidth = 3;
          this.ctx.lineCap = 'round';
          this.ctx.beginPath();
          this.ctx.moveTo(0, -2);
          this.ctx.lineTo(0, 12);
          this.ctx.moveTo(-7, 5);
          this.ctx.lineTo(7, 5);
          this.ctx.stroke();

          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.lineWidth = 5;
          this.ctx.strokeStyle = 'rgba(48, 32, 8, 0.65)';
          this.ctx.fillStyle = '#fff4d0';
          this.ctx.font = '800 22px "Chakra Petch", sans-serif';
          this.ctx.strokeText(this.t('GLYCOGEN_WORD'), 0, 40);
          this.ctx.fillText(this.t('GLYCOGEN_WORD'), 0, 40);
          this.ctx.font = '700 15px "Chakra Petch", sans-serif';
          this.ctx.fillStyle = '#ffe7a8';
          this.ctx.strokeText(this.t('GLYCOGEN_HINT'), 0, 58);
          this.ctx.fillText(this.t('GLYCOGEN_HINT'), 0, 58);
          this.ctx.restore();
          return;
      }
      if (kind === 3) {
          const pulse = 0.5 + 0.5 * Math.sin(this.time / 180);
          this.ctx.fillStyle = `rgba(168, 228, 244, ${0.08 + pulse * 0.08})`;
          this.ctx.beginPath();
          this.ctx.arc(0, -6, 48 + pulse * 5, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.strokeStyle = `rgba(198, 244, 255, ${0.35 + pulse * 0.4})`;
          this.ctx.lineWidth = 2.5;
          this.ctx.stroke();

          this.ctx.strokeStyle = 'rgba(236, 252, 255, 0.95)';
          this.ctx.lineWidth = 3;
          this.ctx.lineCap = 'round';
          this.ctx.beginPath();
          this.ctx.moveTo(-7, -12);
          this.ctx.lineTo(7, -12);
          this.ctx.moveTo(-7, -6);
          this.ctx.lineTo(7, -6);
          this.ctx.stroke();

          const atom = (x: number, y: number) => {
              const g = this.ctx.createRadialGradient(x - 5, y - 6, 2, x, y, 16);
              g.addColorStop(0, '#ffffff');
              g.addColorStop(0.38, '#b7f2ff');
              g.addColorStop(1, '#2f93ad');
              this.ctx.fillStyle = g;
              this.ctx.beginPath();
              this.ctx.arc(x, y, 15, 0, Math.PI * 2);
              this.ctx.fill();
              this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
              this.ctx.lineWidth = 1.5;
              this.ctx.stroke();
              this.ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
              this.ctx.beginPath();
              this.ctx.ellipse(x - 4, y - 5, 3.2, 2, -0.6, 0, Math.PI * 2);
              this.ctx.fill();
          };
          atom(-18, -8);
          atom(18, -8);

          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.lineWidth = 5;
          this.ctx.strokeStyle = 'rgba(8, 28, 36, 0.72)';
          this.ctx.fillStyle = '#f4fdff';
          this.ctx.font = '800 18px "Chakra Petch", sans-serif';
          this.ctx.strokeText(this.t('OXYGEN_WORD'), 0, 26);
          this.ctx.fillText(this.t('OXYGEN_WORD'), 0, 26);
          this.ctx.font = '700 14px "Chakra Petch", sans-serif';
          this.ctx.fillStyle = '#b6f4ff';
          this.ctx.strokeText(this.t('OXYGEN_HINT'), 0, 46);
          this.ctx.fillText(this.t('OXYGEN_HINT'), 0, 46);
          this.ctx.restore();
          return;
      }
      const pulse = 0.5 + 0.5 * Math.sin(this.time / 190);
      this.ctx.fillStyle = `rgba(196, 150, 255, ${0.08 + pulse * 0.08})`;
      this.ctx.beginPath();
      this.ctx.arc(0, -4, 46 + pulse * 5, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = `rgba(226, 198, 255, ${0.35 + pulse * 0.4})`;
      this.ctx.lineWidth = 2.5;
      this.ctx.stroke();

      const drop = this.ctx.createRadialGradient(-6, -12, 3, 0, -2, 28);
      drop.addColorStop(0, '#fff8ff');
      drop.addColorStop(0.35, '#d7b4ff');
      drop.addColorStop(1, '#6a34a8');
      this.ctx.fillStyle = drop;
      this.ctx.beginPath();
      this.ctx.moveTo(0, -32);
      this.ctx.bezierCurveTo(24, -10, 20, 14, 0, 24);
      this.ctx.bezierCurveTo(-20, 14, -24, -10, 0, -32);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.strokeStyle = 'rgba(255, 248, 255, 0.75)';
      this.ctx.lineWidth = 1.6;
      this.ctx.stroke();
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      this.ctx.beginPath();
      this.ctx.ellipse(-6, -12, 4, 7, -0.5, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.lineWidth = 5;
      this.ctx.strokeStyle = 'rgba(28, 10, 42, 0.72)';
      this.ctx.fillStyle = '#f7f0ff';
      this.ctx.font = '800 16px "Chakra Petch", sans-serif';
      this.ctx.strokeText(this.t('DOPAMINE_WORD'), 0, 42);
      this.ctx.fillText(this.t('DOPAMINE_WORD'), 0, 42);
      this.ctx.font = '700 13px "Chakra Petch", sans-serif';
      this.ctx.fillStyle = '#e2c6ff';
      this.ctx.strokeText(this.t('DOPAMINE_HINT'), 0, 60);
      this.ctx.fillText(this.t('DOPAMINE_HINT'), 0, 60);
      this.ctx.restore();
  }

  private drawVital() {
      if (!this.player.active) return;
      if (!this.isLowQuality) {
          const boosted = this.isDashing || this.invulnerabilityTimer > 0;
          const glowRadius = this.player.radius * (boosted ? 3 : 2.5);
          this.ctx.globalCompositeOperation = 'screen';
          this.drawGlow(
              this.colors.PLAYER_CORE,
              glowRadius,
              boosted ? 0.8 : 0.6,
              null,
              boosted ? 0.067 : 0.08,
              this.player.pos.x,
              this.player.pos.y
          );
      }
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.globalAlpha = 1.0;
      const burning = this.acidContact > 0;
      this.ctx.fillStyle = burning
          ? (Math.floor(this.time / 70) % 2 === 0 ? '#e7d4ff' : '#ffffff')
          : (this.isDashing || this.invulnerabilityTimer > 0 ? this.colors.PLAYER_CORE : this.colors.PLAYER);
      if (this.invulnerabilityTimer > 0 && Math.floor(this.time / 100) % 2 === 0) {
          this.ctx.globalAlpha = 0.5;
      }
      this.ctx.beginPath();
      const wobbleX = Math.cos(this.time/150) * 3;
      const wobbleY = Math.sin(this.time/150) * 3;
      const rx = this.isDashing ? this.player.radius * 2.0 : this.player.radius+wobbleX;
      const ry = this.isDashing ? this.player.radius * 0.5 : this.player.radius+wobbleY;
      this.ctx.save();
      this.ctx.translate(this.player.pos.x, this.player.pos.y);
      if (this.isDashing) {
          const angle = Math.atan2(this.player.vel.y, this.player.vel.x);
          this.ctx.rotate(angle);
      }
      this.ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI*2);
      this.ctx.fill();
      this.ctx.restore();
      this.ctx.fillStyle = this.colors.PLAYER_CORE;
      this.ctx.beginPath();
      this.ctx.arc(this.player.pos.x, this.player.pos.y, this.player.radius*0.4, 0, Math.PI*2);
      this.ctx.fill();
      if (burning) {
          this.ctx.globalAlpha = 0.9;
          this.ctx.strokeStyle = '#d7b4ff';
          this.ctx.lineWidth = 4;
          this.ctx.beginPath();
          this.ctx.arc(this.player.pos.x, this.player.pos.y, this.player.radius + 12 + Math.sin(this.time / 55) * 4, 0, Math.PI * 2);
          this.ctx.stroke();
          this.ctx.globalAlpha = 0.16 + Math.sin(this.time / 50) * 0.06;
          this.ctx.fillStyle = '#9a3ad4';
          this.ctx.fillRect(0, 0, CANVAS_WIDTH, 36);
          this.ctx.fillRect(0, CANVAS_HEIGHT - 36, CANVAS_WIDTH, 36);
          this.ctx.fillRect(0, 0, 36, CANVAS_HEIGHT);
          this.ctx.fillRect(CANVAS_WIDTH - 36, 0, 36, CANVAS_HEIGHT);
      }
      this.ctx.globalAlpha = 1.0;
  }

  public draw() {
    if (this.organ.charting()) this.organ.placePlayer(this.player);
    const ride = this.organ.riding();
    this.ctx.fillStyle = this.bgFill;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.organ.drawBackdrop(this.ctx, this.time, this.isLowQuality);

    const aberration = (this.adrenalineActive || this.surgeActive) && !this.isLowQuality;
    if (aberration) {
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'screen';
        const shiftX = this.deathSurgeActive ? -8 : -2;
        this.ctx.translate(shiftX, 0); 
        this.ctx.fillStyle = this.deathSurgeActive ? 'rgba(255,0,0,0.3)' : 'rgba(255,0,0,0.1)';
        this.ctx.fillRect(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);
        this.ctx.restore();
    }

    this.ctx.save();
    
    if (this.shakeIntensity > 0) {
      const sx = (Math.random() - 0.5) * this.shakeIntensity;
      const sy = (Math.random() - 0.5) * this.shakeIntensity;
      this.ctx.translate(sx, sy);
    }

    if (this.surgeActive) {
      const r = this.surgeRadius;
      const px = this.player.pos.x;
      const py = this.player.pos.y;
      const hot = this.deathSurgeActive;
      const bands = hot ? [1, 0.72, 0.46] : [1, 0.74, 0.5, 0.28];
      this.ctx.save();
      this.ctx.lineJoin = 'round';
      for (let i = 0; i < bands.length; i++) {
          const rr = Math.max(6, r * bands[i]);
          const fade = 1 - i * 0.16;
          this.ctx.beginPath();
          this.ctx.arc(px, py, rr, 0, Math.PI * 2);
          this.ctx.globalAlpha = (hot ? 0.28 : 0.2) * fade;
          this.ctx.lineWidth = (hot ? 26 : 20) - i * 3;
          this.ctx.strokeStyle = hot ? '#ff4d62' : '#5eefff';
          this.ctx.stroke();
          this.ctx.globalAlpha = 0.92 * fade;
          this.ctx.lineWidth = Math.max(2.2, 4.6 - i * 0.7);
          this.ctx.strokeStyle = hot ? '#ffe7ea' : '#f7feff';
          this.ctx.stroke();
      }
      this.ctx.restore();
    }

    if (!this.isLowQuality) {
        this.ctx.globalCompositeOperation = 'source-over';
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            if (p.id !== 'bg') continue;
            const fade = p.damage === 1 ? Math.max(0, p.health) : 1;
            const style = p.value || 0;
            const bubble = style === 0 || style === 3 || style === 5 || style === 6 || style === 8 || style === 1;
            this.ctx.globalAlpha = (bubble ? 0.34 : 0.16) * fade;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            if (style === 7) this.ctx.ellipse(p.pos.x, p.pos.y, p.radius * 2.1, p.radius * 0.55, p.vel.y, 0, Math.PI * 2);
            else if (bubble) this.ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
            else this.ctx.ellipse(p.pos.x, p.pos.y, p.radius * 1.45, p.radius * 0.62, p.vel.y, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1;
    }

    this.particles.forEach(p => {
      if (p.id === 'bg' && !this.isLowQuality) return;
      if (p.id === 'mine_expl' || p.id === 'mine_expl_dash') {
          this.ctx.save();
          this.ctx.globalCompositeOperation = 'screen';
          const maxLife = p.id === 'mine_expl' ? 25 : 20; 
          const life = p.ttl || 0;
          const progress = 1 - (life / maxLife);
          const isDashExpl = p.id === 'mine_expl_dash';
          const radius = p.radius;
          this.ctx.beginPath();
          this.ctx.arc(p.pos.x, p.pos.y, radius * (1-Math.pow(1-progress, 3)), 0, Math.PI*2);
          this.ctx.lineWidth = (isDashExpl ? 40 : 60) * (1 - progress); 
          if (isDashExpl) {
              this.ctx.strokeStyle = `rgba(0, 255, 255, ${life/maxLife})`;
              this.ctx.setLineDash([10, 20]);
          } else {
              this.ctx.strokeStyle = `rgba(110, 243, 255, ${life/maxLife})`;
              this.ctx.setLineDash([]);
          }
          this.ctx.stroke();
          this.ctx.setLineDash([]); 
          this.ctx.beginPath();
          this.ctx.arc(p.pos.x, p.pos.y, radius * 0.5 * (1-progress), 0, Math.PI*2);
          this.ctx.fillStyle = isDashExpl ? `rgba(200, 255, 255, ${life/maxLife})` : `rgba(220, 255, 255, ${life/maxLife})`;
          this.ctx.fill();
          this.ctx.restore();
      } else if (p.id === 'ghost') {
          this.ctx.fillStyle = p.color;
          this.ctx.beginPath();
          this.ctx.ellipse(p.pos.x, p.pos.y, p.radius * 1.5, p.radius * 0.6, 0, 0, Math.PI*2);
          this.ctx.fill();
      } else if (p.id === 'ring') {
          const life = Math.max(0, (p.ttl || 0) / Math.max(1, p.maxHealth || 14));
          const grow = p.radius * (1 + (1 - life) * 1.35);
          this.ctx.save();
          this.ctx.globalAlpha = life;
          this.ctx.strokeStyle = p.color;
          this.ctx.lineWidth = 2.4 + life * 2.2;
          this.ctx.beginPath();
          this.ctx.arc(p.pos.x, p.pos.y, grow, 0, Math.PI * 2);
          this.ctx.stroke();
          this.ctx.restore();
      } else if (p.id === 'zap') {
          const life = Math.max(0, (p.ttl || 0) / 10);
          this.ctx.save();
          this.ctx.globalCompositeOperation = 'screen';
          this.ctx.lineCap = 'round';
          this.ctx.globalAlpha = life * 0.35;
          this.ctx.strokeStyle = '#e8fbff';
          this.ctx.lineWidth = 5.5;
          this.ctx.beginPath();
          this.ctx.moveTo(p.pos.x, p.pos.y);
          this.ctx.lineTo(p.pos.x + p.vel.x, p.pos.y + p.vel.y);
          this.ctx.stroke();
          this.ctx.globalAlpha = life;
          this.ctx.strokeStyle = p.color;
          this.ctx.lineWidth = 1.7;
          this.ctx.stroke();
          this.ctx.restore();
      } else if (p.id === 'system_glitch') {
          this.ctx.fillStyle = p.color;
          this.ctx.globalAlpha = p.ttl! / 15;
          this.ctx.beginPath();
          this.ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI*2);
          this.ctx.fill();
      } else {
        this.ctx.globalAlpha = p.id === 'bg' ? 0.3 : (p.ttl! / 20); 
        this.ctx.fillStyle = p.color;
        if (this.isLowQuality) {
            const size = p.radius * 2;
            this.ctx.fillRect(p.pos.x - p.radius, p.pos.y - p.radius, size, size);
        } else {
            this.ctx.beginPath();
            this.ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
            this.ctx.fill();
        }
      }
    });
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.globalAlpha = 1.0;

    // --- LASER RENDERER V2 (HIGH VISIBILITY) ---
    // Pass 1: Glow / Bloom (Screen Blend)
    if (!this.isLowQuality) {
        this.ctx.globalCompositeOperation = 'screen';
        this.ctx.lineCap = 'round';
        this.ctx.strokeStyle = this.colors.PLAYER_CORE;
        this.ctx.shadowBlur = 0;
        this.ctx.beginPath();
        this.entities.forEach(e => {
            if (!e.active || e.type !== EntityType.ANTIBODY) return;
            this.ctx.moveTo(e.pos.x, e.pos.y);
            this.ctx.lineTo(e.pos.x - e.vel.x * 0.8, e.pos.y - e.vel.y * 0.8);
        });
        this.ctx.globalAlpha = 0.1;
        this.ctx.lineWidth = 34;
        this.ctx.stroke();
        this.ctx.globalAlpha = 0.22;
        this.ctx.lineWidth = 22;
        this.ctx.stroke();
        this.ctx.globalAlpha = 0.5;
        this.ctx.lineWidth = 14;
        this.ctx.stroke(); 
    }
    
    // Pass 2: Solid Core (Source Over)
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.globalAlpha = 1.0;
    
    // Draw Antibodies (Laser Core)
    this.ctx.beginPath();
    this.ctx.lineWidth = 4; // Thicker core
    this.ctx.strokeStyle = '#ffffff'; 
    this.ctx.lineCap = 'round';
    
    this.entities.forEach(e => {
        if (!e.active) return;
        if (e.type === EntityType.ANTIBODY) {
             this.ctx.moveTo(e.pos.x, e.pos.y);
             const tailX = e.pos.x - e.vel.x * 0.8; 
             const tailY = e.pos.y - e.vel.y * 0.8;
             this.ctx.lineTo(tailX, tailY);
             
             // "Head" flare
             this.ctx.moveTo(e.pos.x, e.pos.y);
             this.ctx.lineTo(e.pos.x + e.vel.x * 0.1, e.pos.y + e.vel.y * 0.1);
        }
    });
    this.ctx.stroke();

    // Draw Enemy Projectiles (Separated Loop)
    this.ctx.lineWidth = 3; 
    this.ctx.strokeStyle = '#fff';
    this.entities.forEach(e => {
        if (!e.active) return;
        if (e.type === EntityType.ENEMY_PROJECTILE) {
            this.ctx.fillStyle = e.color;
            this.ctx.beginPath();
            const spikes = 8;
            for(let i=0; i<spikes*2; i++) {
                const r = i % 2 === 0 ? e.radius : e.radius * 0.5;
                const angle = (i / (spikes*2)) * Math.PI * 2 + (this.time/50);
                this.ctx.lineTo(e.pos.x + Math.cos(angle)*r, e.pos.y + Math.sin(angle)*r);
            }
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
        }
    });

    this.entities.forEach(e => {
        if (!e.active) return;
        if (e.type === EntityType.ORBITAL) {
             if (!this.isLowQuality) {
                 this.ctx.globalCompositeOperation = 'screen';
                 this.drawGlow(this.colors.ORBITAL, e.radius * 2, 0.6, null, 0.1, e.pos.x, e.pos.y);
             }
             this.ctx.globalCompositeOperation = 'source-over';
             this.ctx.strokeStyle = this.colors.ORBITAL;
             this.ctx.lineWidth = 2;
             this.ctx.beginPath();
             this.ctx.arc(e.pos.x, e.pos.y, e.radius, 0, Math.PI*2);
             this.ctx.stroke();
             this.ctx.fillStyle = '#fff';
             this.ctx.beginPath();
             this.ctx.arc(e.pos.x, e.pos.y, e.radius/2, 0, Math.PI*2);
             this.ctx.fill();
        }
        else if (e.type === EntityType.ACID_POOL) {
            if (e.id.startsWith('plaque_') || e.id.startsWith('bile_')) {
                this.drawOrganPool(e);
            } else if (e.lobes && e.lobes.length > 1) {
                const full = e.value && e.value > 0 ? e.value : 6;
                const left = Math.max(0, e.ttl || 0);
                const life = Math.min(1, left / full);
                const vanish = life < 0.22 ? life / 0.22 : 1;
                this.drawPuddleUnion(e, 'acid', 0.92 * vanish, 1);
            } else {
            this.ctx.save();
            this.ctx.translate(e.pos.x, e.pos.y);
            const full = e.value && e.value > 0 ? e.value : 6;
            const left = Math.max(0, e.ttl || 0);
            const life = Math.min(1, left / full);
            const grown = 1 - life;
            const settled = !!(e.angle && e.angle > 0);
            const appear = settled ? 1 : (grown < 0.18 ? grown / 0.18 : 1);
            const vanish = life < 0.22 ? life / 0.22 : 1;
            const veil = (settled ? 1 : appear) * vanish;
            const r = settled ? e.angle! : e.radius * (0.28 + 0.72 * appear);
            const phase = this.time / 480;
            const blob = (radius: number) => {
                this.ctx.beginPath();
                const n = 20;
                for (let i = 0; i <= n; i++) {
                    const a = (i / n) * Math.PI * 2;
                    const wobble = Math.sin(a * 3 + phase) * radius * 0.14 + Math.cos(a * 5 - phase) * radius * 0.05;
                    const px = Math.cos(a) * (radius + wobble);
                    const py = Math.sin(a) * (radius * 0.78 + wobble);
                    if (i === 0) this.ctx.moveTo(px, py);
                    else this.ctx.lineTo(px, py);
                }
                this.ctx.closePath();
            };
            this.ctx.globalAlpha = 0.32 * veil;
            this.ctx.fillStyle = '#e6ccff';
            blob(r * 1.2);
            this.ctx.fill();
            this.ctx.globalAlpha = 0.94 * veil;
            const body = this.ctx.createRadialGradient(-r * 0.2, -r * 0.12, r * 0.05, 0, 0, r);
            body.addColorStop(0, '#f3e4ff');
            body.addColorStop(0.2, '#c47bff');
            body.addColorStop(0.66, '#7a2bb5');
            body.addColorStop(1, '#3a0c5c');
            this.ctx.fillStyle = body;
            blob(r * 0.9);
            this.ctx.fill();
            this.ctx.lineWidth = Math.max(2.5, r * 0.05);
            this.ctx.strokeStyle = 'rgba(236, 214, 255, 0.62)';
            this.ctx.stroke();
            this.ctx.globalAlpha = 0.45 * veil;
            this.ctx.fillStyle = 'rgba(244, 228, 255, 0.7)';
            this.ctx.beginPath();
            this.ctx.ellipse(-r * 0.1, -r * 0.06, r * 0.34, r * 0.16, -0.5, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 0.85 * veil;
            this.ctx.fillStyle = '#f6ecff';
            for (let i = 0; i < 5; i++) {
                const bob = (this.time / 900 + i * 0.37) % 1;
                const bx = Math.cos(i * 2.1) * r * 0.32;
                const by = Math.sin(i * 1.6) * r * 0.22 - bob * r * 0.12;
                this.ctx.beginPath();
                this.ctx.arc(bx, by, Math.max(2, r * (0.03 + (i % 3) * 0.012)), 0, Math.PI * 2);
                this.ctx.fill();
            }
            this.ctx.restore();
            }
        }
        else if (e.type === EntityType.ORGAN_PICKUP) {
            this.drawOrganPickup(e);
        }
        else if (e.type === EntityType.BIO_MINE) {
            this.ctx.save();
            this.ctx.translate(e.pos.x, e.pos.y);
            const r = e.radius;
            const body = (e.hitFlash && e.hitFlash > 0) ? '#ffffff' : this.colors.BIO_MINE;
            const spark = 0.55 + Math.sin(this.time / 90) * 0.45;

            if (!this.isLowQuality) {
                this.ctx.globalCompositeOperation = 'screen';
                this.drawGlow(this.colors.BIO_MINE, r * 2, 0.5, null, 0.1, 0, r * 0.1);
            }

            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.lineCap = 'round';
            this.ctx.beginPath();
            this.ctx.moveTo(0, -r * 0.5);
            this.ctx.lineTo(0, -r * 1.35);
            this.ctx.strokeStyle = '#10282c';
            this.ctx.lineWidth = Math.max(7, r * 0.34);
            this.ctx.stroke();
            this.ctx.strokeStyle = '#f6f1e4';
            this.ctx.lineWidth = Math.max(3, r * 0.16);
            this.ctx.stroke();

            const sparkR = r * (0.34 + spark * 0.08);
            this.ctx.fillStyle = `rgba(255, 214, 80, ${0.7 + spark * 0.3})`;
            this.ctx.beginPath();
            this.ctx.arc(0, -r * 1.48, sparkR, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = '#10282c';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            this.ctx.fillStyle = '#fffaf0';
            this.ctx.beginPath();
            this.ctx.arc(0, -r * 1.48, sparkR * 0.4, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.fillStyle = body;
            this.ctx.strokeStyle = '#10282c';
            this.ctx.lineWidth = Math.max(3, r * 0.14);
            this.ctx.beginPath();
            this.ctx.arc(0, r * 0.12, r * 0.9, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();

            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = Math.max(3, r * 0.16);
            const arm = r * 0.32;
            this.ctx.beginPath();
            this.ctx.moveTo(-arm, r * 0.12);
            this.ctx.lineTo(arm, r * 0.12);
            this.ctx.moveTo(0, r * 0.12 - arm);
            this.ctx.lineTo(0, r * 0.12 + arm);
            this.ctx.stroke();

            this.ctx.restore();
        }
        else if (e.type === EntityType.DNA_FRAGMENT) {
            this.drawCoin(e);
        }
    });

    this.entities.forEach(e => {
      if (!e.active) return;
      if (this.isEnemy(e.type) || e.type === EntityType.BOSS) {
        this.ctx.translate(e.pos.x, e.pos.y);
        let spin = 0;
        const glowColor = e.isElite || e.type === EntityType.BOSS 
            ? (e.type === EntityType.BOSS ? e.color : this.colors.ELITE_GLOW)
            : e.color;
        if (!this.isLowQuality && glowColor.startsWith('#')) {
            const isBoss = e.type === EntityType.BOSS;
            const glowRadius = e.radius * (isBoss ? 2.5 : 2.0);
            this.ctx.globalCompositeOperation = 'screen';
            this.drawGlow(glowColor, glowRadius, 0.6, 0.2, isBoss ? 0.08 : 0.1);
        } else if (!this.isLowQuality) {
            this.ctx.globalCompositeOperation = 'screen';
            this.ctx.fillStyle = glowColor;
            this.ctx.globalAlpha = 0.2;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, e.radius * 2, 0, Math.PI*2);
            this.ctx.fill();
        }
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.globalAlpha = 1.0;
        this.ctx.fillStyle = (e.hitFlash && e.hitFlash > 0) ? '#ffffff' : e.color;
        this.ctx.strokeStyle = '#220000';
        this.ctx.lineWidth = 2;
        let drawn = false;
        this.ctx.beginPath();
        if (e.type === EntityType.BOSS && e.mutation) {
            drawBossShape(
                this.ctx,
                e.mutation.shape,
                e.color,
                e.mutation.accent,
                e.radius,
                this.time,
                !!(e.hitFlash && e.hitFlash > 0),
                e.mutation.open,
                e.mutation.split,
                e.mutation.attack,
            );
            drawn = true;
        } else if (e.type === EntityType.BACTERIA) {
          spin = this.time / 500;
          this.ctx.rotate(spin);
          this.ctx.roundRect(-e.radius, -e.radius/2, e.radius*2, e.radius, 10);
        } else if (e.type === EntityType.FUNGI) { 
           const r = e.radius;
           for(let i=0; i<6; i++) {
             const a = (i/6)*Math.PI*2 + (this.time/200);
             const vx = Math.cos(a)*r;
             const vy = Math.sin(a)*r;
             if (i === 0) this.ctx.moveTo(vx, vy);
             else this.ctx.lineTo(vx, vy);
           }
           this.ctx.closePath();
        } else if (e.type === EntityType.VIRUS) { 
            const r = e.radius;
            spin = this.time / 900;
            this.ctx.rotate(spin); 
            this.ctx.fillStyle = (e.hitFlash && e.hitFlash > 0) ? '#ffffff' : '#00aa00';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, r, 0, Math.PI*2);
            this.ctx.fill();
            this.ctx.stroke();
            const spikes = 8;
            this.ctx.fillStyle = '#00ff00';
            for(let i=0; i<spikes; i++) {
                const angle = (i/spikes) * Math.PI*2;
                const sx = Math.cos(angle) * (r * 1.2);
                const sy = Math.sin(angle) * (r * 1.2);
                this.ctx.beginPath();
                this.ctx.arc(sx, sy, r*0.3, 0, Math.PI*2);
                this.ctx.fill();
                this.ctx.stroke();
            }
            if (e.shootTimer !== undefined && e.shootTimer < 0.5) {
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                this.ctx.beginPath();
                this.ctx.arc(0, 0, r, 0, Math.PI*2);
                this.ctx.fill();
            }
        } else {
           const pulses = Math.sin(this.time/100) * 5;
           this.ctx.arc(0, 0, e.radius + pulses, 0, Math.PI*2);
        }
        if (!drawn) {
            this.ctx.fill();
            this.ctx.stroke();
        }
        if (spin) this.ctx.rotate(-spin);
        if ((e.stun ?? 0) > 0) {
            this.ctx.save();
            const flick = Math.floor(this.time / 42) % 3;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.strokeStyle = '#f4feff';
            this.ctx.lineWidth = 1.4;
            this.ctx.globalAlpha = 0.85;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, e.radius * 1.2, 0, Math.PI * 2);
            this.ctx.stroke();
            const bolts = this.isLowQuality ? 2 : 3;
            for (let i = 0; i < bolts; i++) {
                const a = i * 2.15 + flick * 0.55 + (e.radius % 5);
                const reach = e.radius * (1.05 + (i === flick ? 0.28 : 0));
                this.ctx.globalAlpha = i === flick ? 1 : 0.72;
                this.ctx.strokeStyle = i === flick ? '#ffffff' : '#8ef6ff';
                this.ctx.lineWidth = i === flick ? 2 : 1.3;
                this.ctx.beginPath();
                this.ctx.moveTo(Math.cos(a) * e.radius * 0.15, Math.sin(a) * e.radius * 0.15);
                this.ctx.lineTo(Math.cos(a + 0.7) * e.radius * 0.62, Math.sin(a + 0.35) * e.radius * 0.48);
                this.ctx.lineTo(Math.cos(a + 1.15) * reach, Math.sin(a + 1.05) * reach);
                this.ctx.stroke();
            }
            this.ctx.restore();
        }
        this.ctx.translate(-e.pos.x, -e.pos.y);
        this.ctx.globalAlpha = 1;
        this.ctx.globalCompositeOperation = 'source-over';
      }
    });

    if (!ride) this.drawVital();

    this.entities.forEach(e => {
      if (e.type === EntityType.SERUM && e.active) this.drawSerum(e);
    });

    this.entities.forEach(e => {
      if (e.type === EntityType.TEXT_POPUP) {
        this.ctx.font = `700 ${e.radius || 24}px "Chakra Petch", sans-serif`;
        this.ctx.fillStyle = e.color;
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.strokeText(e.id, e.pos.x, e.pos.y);
        this.ctx.fillText(e.id, e.pos.x, e.pos.y);
      }
    });

    this.organ.drawHazards(this.ctx, this.player, this.isLowQuality);

    this.ctx.restore();
    this.organ.drawTransit(this.ctx);
    if (ride) this.drawVital();
  }
}
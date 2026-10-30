

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
import { COIN_BEAT_MS, showerPlan } from './coinFeel';
import { buzz, hum } from './haptics';
import { HURT_BLOOM, hurtBruise, hurtGrade, hurtKick, hurtPunch, hurtShake, hurtShove, hurtStop, type HurtGrade } from './hurtFeel';
import { achievementManager } from './achievementManager';
import { bossFor, drawBossShape, mutationFrom } from './bosses';
import { OrganDirector, cellBudget, cellColor, cellRises, organBg, rollCellStyle } from './organDirector';
const BOSS_GRACE = 1.15;
/** Primeira cura do linfonodo. Cada uso sobe este preço. */
const NODE_BASE = 52;
const NODE_REST = { x: 0, y: -6, w: 124, h: 112 };
const NODE_LEAVE = { x: 0, y: 142, w: 196, h: 42 };
/** O nódulo aberto ocupa a arena o bastante para o dedo acertar o que está escrito nele. */
const NODE_OPEN = 2.05;
/** O que a moeda paga de DNA, em relação ao que pagava. A bolsa da onda multiplica por cima. */
const COIN_WORTH = 0.46;
/** O chefe continua o maior prêmio da noite, mas não compra o laboratório inteiro. */
const BOSS_PURSE = 0.74;
const NODE_WIND = 0.46;

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

// 0 na onda 1, 1 na onda 30.
function campaignPressure(waveIndex: number): number {
    const t = Math.min(Math.max(waveIndex, 0), CAMPAIGN_LAST_INDEX) / CAMPAIGN_LAST_INDEX;
    return Math.pow(t, 1.15);
}

// A onda 1 usa 55% da rampa antiga: o bicho morre e a moeda existe.
// A onda 30 a rampa volta inteira. O golpe não entra nessa conta.
function trashBody(pressure: number): number {
    const full = 1 + pressure * 2.35;
    const ease = 0.55 + 0.45 * Math.pow(pressure, 0.72);
    return full * ease;
}
function dnaPurse(waveIndex: number): number {
    const t = Math.min(1, Math.max(0, waveIndex) / 29);
    return 0.96 - t * 0.1;
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
const MINE_FLOW = 0.32;
const MINE_WIND = 0.22;
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

interface BoothCoin {
  born: number;
  dur: number;
  fan: number;
  lift: number;
  r: number;
}

interface BoothDeal {
  age: number;
  price: number;
  heal: number;
  paid: number;
  granted: boolean;
  grantAt: number;
  flyEnd: number;
  popEnd: number;
  done: number;
  coins: BoothCoin[];
  sparks: { x: number; y: number; vx: number; vy: number; life: number; max: number }[];
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
  private dashPhased = new Map<string, number>();
  private shotSerial = 0;
  private squad = { n: 0, above: 0, below: 0, behind: 0 };
  
  public currentWaveIndex: number = -1; 
  public waveTimer: number = 0;
  public waveActive: boolean = false;
  public bossSpawned: boolean = false;
  private shinyOrgan = -1;
  private shinySpawned = false;
  private shinyWave = 1;
  public star = false;
  private swarmRolled = false;
  private swarmAt = -1;
  private waveHurt = 0;
  private pillOffers = 0;
  private pillGap = 0;
  private starTaken = false;
  private starGhost = 0;
  private starHue = 0;
  
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
  private hurt = 0;
  private hurtFlash = 0;
  private hurtBloom = 0;
  private hurtEase = 0;
  private lifeCut = 0;
  private lifeRumble = 0;
  private hurtSerious = false;
  private hurtKickX = 0;
  private hurtKickY = 0;
  private hurtAngle = 0;
  private acidContact: number = 0;
  private acidBite: number = 0;
  private acidCue: number = 0;
  private acidDrip: number = 0;
  private bgGap: number = 0.6;
  private systemGlitchActive: boolean = false; // SURPRESA 2: Disparo falha após levar dano

  private clearBufferTimer: number = 0; 
  private isVacuuming: boolean = false; 
  private vacuumingTimer: number = 0;
  private coinCascade = false;
  private coinShowerAt = 0;
  private coinRingAt = 0;
  private mineClock = 0;
  private sweepMines = false;
  private fusoEchoIn = -1;
  private fusoVeilLeft = 0;
  private fusoVeilHold = false;
  private fusoShown = 0;
  private bossLeash: { x: number; y: number; until: number; reach: number } | null = null;
  private bossMarkUntil = 0;
  public lymphOpen = false;
  public nodeFeed = false;
  public nodeLeave = false;

  public lymphFeel() {
      const drain = Math.round(this.lymphPressure * 20) / 20;
      const spent = this.nodeSpending ? Math.round(this.lymphSpent) : 0;
      return { drain, spent, spending: this.nodeSpending, gulp: this.lymphGulp };
  }

  public beginRest() {
      this.nodeFeed = true;
  }

  private nodeChunk(): number {
      return Math.max(12, Math.round(this.player.maxHealth * 0.14));
  }

  private nodeHeal(): number {
      const chunk = this.nodeChunk();
      const missing = this.player.maxHealth - this.player.health;
      if (missing >= chunk || missing <= 0) return chunk;
      return Math.max(1, Math.ceil(missing));
  }

  private nodePrice(): number {
      const n = Math.max(0, this.currentWaveIndex - 5);
      const waveMark = 1 + n * 0.04;
      const full = Math.max(40, Math.round(NODE_BASE * this.nodeTariff * waveMark));
      const chunk = this.nodeChunk();
      const heal = this.nodeHeal();
      if (heal >= chunk) return full;
      return Math.max(8, Math.round(full * heal / chunk));
  }

  public lymphPads(): { rest: { x: number; y: number; w: number; h: number }; leave: { x: number; y: number; w: number; h: number } } | null {
      if (!this.lymphOpen || this.lymphPhase !== 'hold') return null;
      const s = Math.max(0.02, this.lymphScale) * NODE_OPEN;
      const cx = CANVAS_WIDTH * 0.5;
      const cy = CANVAS_HEIGHT * 0.52;
      const box = (b: { x: number; y: number; w: number; h: number }) => ({
          x: cx + (b.x - b.w / 2) * s,
          y: cy + (b.y - b.h / 2) * s,
          w: b.w * s,
          h: b.h * s,
      });
      return { rest: box(NODE_REST), leave: box(NODE_LEAVE) };
  }
  public nodeSpending = false;
  private nodeWasFeeding = false;
  private lymphPhase: 'in' | 'hold' | 'out' = 'hold';
  private lymphT = 0;
  private lymphScale = 0;
  private lymphCoin = 0;
  private lymphPop = 0;
  private lymphSpent = 0;
  private lymphShow = 0;
  private lymphPressure = 0;
  private lymphWind = 0;
  private lymphClock = 0;
  private lymphGulp = 0;
  private lymphRelief = 0;
  private deal: BoothDeal | null = null;
  private dealWait = 0;
  private boothPurse = { x: 0, y: 0 };
  private boothTip = { x: 0, y: 0 };
  private boothMarks = false;
  private heartGlyph = new Path2D('M12 20.5l-1.45-1.32C5.4 14.36 2 11.28 2 7.5 2 4.42 4.42 2 7.5 2c1.74 0 3.41.81 4.5 2.09C13.09 2.81 14.76 2 16.5 2 19.58 2 22 4.42 22 7.5c0 3.78-3.4 6.86-8.55 11.68L12 20.5z');
  /** Multiplicador do preço. Sobe a cada gole e de novo ao soltar. */
  private nodeTariff = 1;
  private nodeVisits = 0;
  private lymphPricePop = 0;
  /** Segundos de luta até a próxima leitura do chefe. */
  private bossClock = 0;
  private bossSnapHp = 0;
  private bossSnapAt = 0;
  private bossBombDue = 0;
  /** O linfonodo cruza a arena. Não espera a onda anterior ao chefe. */
  private nodePass = 52; 
  
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
      const spawnRate = Math.max(360, Math.round(base.spawnRate * Math.pow(0.9, lap) * 0.82));
      if (lap <= 0) return { ...base, waveNumber: waveIndex + 1, spawnRate };
      return {
          ...base,
          waveNumber: waveIndex + 1,
          spawnRate,
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
          shootTimer = 0.7 + Math.random() * 2.4;
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
      const swarm = this.swarmHere();
      const eliteChance = swarm ? 0.025 : (0.04 + pressure * 0.08 + Math.min(0.06, pastTheWall * 0.008));
      const isElite = Math.random() < eliteChance;
      if (isElite) {
          hp *= 2.4;
          dmg *= 1.5;
          val *= 3;
          radius *= 1.45;
          speed *= 0.85;
      }

      // Onda 1: 55% da rampa antiga, para a moeda existir. Onda 30: a rampa inteira.
      hp *= trashBody(pressure) * Math.pow(1.04, pastTheWall);
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
          shootTimer,
          intent: Math.random()
      });
  }

  private screenSpread(): number {
      const a = Math.random();
      const b = Math.random();
      const edge = Math.abs(a - 0.5) >= Math.abs(b - 0.5) ? a : b;
      return Math.random() < 0.7 ? edge : Math.random();
  }

  private mineKind(mine: Entity): 'cyan' | 'iris' | 'amber' | 'bile' | 'leash' | 'mark' {
      if (mine.id.startsWith('mine_leash')) return 'leash';
      if (mine.id.startsWith('mine_mark')) return 'mark';
      if (mine.id.startsWith('mine_bile')) return 'bile';
      if (mine.id.startsWith('mine_iris')) return 'iris';
      if (mine.id.startsWith('mine_amber')) return 'amber';
      return 'cyan';
  }

  private detonateMine(mine: Entity, stats: PlayerStats, power: number, hooks?: { over: () => void; lost: () => void }) {
      const kind = this.mineKind(mine);
      const cyan = kind === 'cyan';
      const radius = cyan ? 350 : kind === 'leash' ? 168 : kind === 'bile' ? 96 : kind === 'mark' ? 120 : kind === 'iris' ? 300 : 240;
      const color = kind === 'leash' ? 'rgba(192, 132, 252, 0.72)'
          : kind === 'bile' ? 'rgba(182, 232, 106, 0.55)'
          : kind === 'mark' ? 'rgba(255, 224, 138, 0.72)'
          : cyan ? 'rgba(110, 243, 255, 0.55)'
          : kind === 'iris' ? 'rgba(192, 132, 252, 0.66)'
          : 'rgba(255, 176, 48, 0.66)';
      this.sessionStats.mineKills++;
      achievementManager.track('mine_pop_20', 1);
      this.shakeIntensity = Math.max(this.shakeIntensity, cyan ? 25 : 12);
      const label = kind === 'leash' ? this.t('MSG_LEASH')
          : kind === 'bile' ? this.t('MSG_BILE')
          : kind === 'mark' ? this.t('MSG_MARK')
          : cyan ? this.t('MSG_BURST')
          : kind === 'iris' ? this.t('MSG_IRIS')
          : this.t('MSG_AMBER');
      const labelColor = kind === 'leash' ? '#e9d5ff' : kind === 'bile' ? '#d6ff8a' : kind === 'mark' ? '#ffe08a' : cyan ? '#ffcc00' : kind === 'iris' ? '#e9d5ff' : '#ffd27a';
      this.spawnText(mine.pos, label, labelColor, cyan ? 50 : 36);
      if (cyan) {
          audioManager.playMineExplosionShot(mine.pos);
          audioManager.playSurge(mine.pos);
          buzz('boom');
      } else {
          audioManager.playMineExplosionDash(mine.pos);
          buzz('thud');
      }
      this.particles.push({
          id: power > 100 ? 'mine_expl' : 'mine_expl_dash',
          type: EntityType.PARTICLE,
          pos: { ...mine.pos },
          vel: { x: 0, y: 0 },
          radius,
          health: 1, maxHealth: 22,
          color, damage: 0, active: true, ttl: 22,
      });
      const sparkCount = this.isLowQuality ? 4 : cyan ? 14 : 8;
      const spark = cyan ? '#ffeeaa' : kind === 'iris' ? '#f3e8ff' : '#ffe0a0';
      for (let k = 0; k < sparkCount; k++) {
          const ang = Math.random() * Math.PI * 2;
          const spd = Math.random() * 16 + 6;
          this.particles.push({
              id: 'spark', type: EntityType.PARTICLE, pos: { ...mine.pos },
              vel: { x: Math.cos(ang) * spd, y: Math.sin(ang) * spd },
              radius: 4, health: 1, maxHealth: 1, color: spark, damage: 0, active: true, ttl: 28,
          });
      }
      if (kind === 'leash') {
          const boss = this.entities.find(e => e.active && e.type === EntityType.BOSS);
          const at = boss ? { x: (mine.pos.x + boss.pos.x) * 0.5, y: (mine.pos.y + boss.pos.y) * 0.5 } : mine.pos;
          this.bossLeash = { x: at.x, y: at.y, until: this.time + 4200, reach: 168 };
      } else if (kind === 'mark') {
          this.bossMarkUntil = this.time + 5600;
      } else if (kind === 'bile') {
          const bite = 1.15;
          this.player.health = Math.max(0, this.player.health - bite);
          this.sessionStats.damageTaken += bite;
          this.invulnerabilityTimer = Math.max(this.invulnerabilityTimer, 0.28);
          this.sting(bite, mine.pos, 1);
          this.spawnText(this.player.pos, `-${bite.toFixed(1)}`, '#d6ff8a', 26);
          if (this.player.health <= 0 && hooks) this.handlePlayerDeath(hooks.over, hooks.lost, stats);
      }
      const r2 = radius * radius;
      if (kind === 'leash' || kind === 'mark' || kind === 'bile') return;
      for (const victim of this.entities) {
          if (!(this.isEnemy(victim.type) || victim.type === EntityType.BOSS) || !victim.active) continue;
          const d2 = distSq(victim.pos, mine.pos);
          if (d2 >= r2) continue;
          const d = Math.sqrt(d2) || 1;
          const nx = (victim.pos.x - mine.pos.x) / d;
          const ny = (victim.pos.y - mine.pos.y) / d;
          if (kind === 'iris') {
              victim.stun = Math.max(victim.stun ?? 0, victim.type === EntityType.BOSS ? 0.45 : 1.35);
              victim.hitFlash = 10;
              victim.vel.x += nx * 6;
              victim.vel.y += ny * 6;
              continue;
          }
          const dmg = kind === 'amber' ? Math.min(70, power * 0.09) : power;
          this.damageEnemy(victim, dmg, true, stats);
          const force = cyan ? (power > 100 ? 40 : 15) : 8;
          victim.vel.x += nx * force;
          victim.vel.y += ny * force;
      }
      if (kind === 'amber' && this.player.active && distSq(this.player.pos, mine.pos) < r2) {
          const heal = Math.max(1, Math.round(this.player.maxHealth * 0.07));
          this.player.health = Math.min(this.player.maxHealth, this.player.health + heal);
          this.spawnText(this.player.pos, `+${heal}`, '#ffe08a', 22);
      }
  }

  /**
   * A luta já vai longe e a vida do chefe quase não desce: entra uma das bombas
   * dele. O relógio antigo morria quando a onda acabava, então a ferramenta
   * nunca chegava a aparecer.
   */
  private feedBossBombs(boss: Entity, dt: number, live: number) {
      if (this.bossClock <= 0) {
          this.bossClock = 0.001;
          this.bossSnapHp = boss.health;
          this.bossSnapAt = 0;
          this.bossBombDue = 12.5;
      }
      this.bossClock += dt;
      if (live >= 2) return;
      this.bossBombDue -= dt;
      if (this.bossBombDue > 0) return;
      const span = Math.max(0.4, this.bossClock - this.bossSnapAt);
      const dropped = (this.bossSnapHp - boss.health) / Math.max(1, boss.maxHealth);
      const pace = dropped / span;
      const stalled = this.bossClock > 16 && pace < 0.011;
      this.bossSnapHp = boss.health;
      this.bossSnapAt = this.bossClock;
      if (!stalled) {
          this.bossBombDue = 3.2;
          return;
      }
      this.bossBombDue = 6.2 + Math.random() * 2;
      const cycle = ['leash', 'amber', 'mark', 'bile'] as const;
      this.spawnMine(cycle[Math.floor(this.bossClock / 8) % cycle.length]);
  }

  private openLymph() {
      if (this.star) return;
      this.lymphOpen = true;
      this.lymphPhase = 'in';
      this.lymphT = 0;
      this.lymphScale = 0;
      this.nodeFeed = false;
      this.nodeLeave = false;
      this.nodeWasFeeding = false;
      this.lymphCoin = 0;
      this.lymphPop = 0;
      this.lymphSpent = 0;
      this.lymphShow = 0;
      this.lymphPressure = 0;
      this.lymphWind = 0;
      this.lymphClock = 0;
      this.lymphGulp = 0;
      this.lymphRelief = 0;
      this.deal = null;
      this.dealWait = 0;
      this.boothMarks = false;
      this.isDashing = false;
      this.inputVector.x = 0;
      this.inputVector.y = 0;
      this.invulnerabilityTimer = Math.max(this.invulnerabilityTimer, 1.2);
      audioManager.playPowerUp(this.player.pos);
  }

  private mineSpot() {
      const inset = 70;
      const w = CANVAS_WIDTH - inset * 2;
      const h = CANVAS_HEIGHT - inset * 2;
      if (Math.random() < 0.46) {
          const edge = Math.floor(Math.random() * 4);
          const along = Math.random();
          const depth = 0.04 + Math.random() * 0.2;
          if (edge === 0) return { x: inset + along * w, y: inset + depth * h };
          if (edge === 1) return { x: inset + along * w, y: inset + (1 - depth) * h };
          if (edge === 2) return { x: inset + depth * w, y: inset + along * h };
          return { x: inset + (1 - depth) * w, y: inset + along * h };
      }
      return { x: inset + Math.random() * w, y: inset + Math.random() * h };
  }

  private settleMine(e: Entity) {
      const tx = e.value;
      const ty = e.orbitOffset;
      if (tx !== undefined && ty !== undefined) {
          const dx = tx - e.pos.x;
          const dy = ty - e.pos.y;
          const dist = Math.hypot(dx, dy);
          const cap = 10;
          if (dist < 24) {
              e.vel.x *= 0.7;
              e.vel.y *= 0.7;
              e.pos.x += dx * 0.4;
              e.pos.y += dy * 0.4;
          } else {
              const aim = Math.min(cap, 4.8 + dist * 0.006);
              e.vel.x = e.vel.x * 0.84 + (dx / dist) * aim * 0.16;
              e.vel.y = e.vel.y * 0.84 + (dy / dist) * aim * 0.16;
              const mag = Math.hypot(e.vel.x, e.vel.y);
              if (mag > cap) {
                  e.vel.x *= cap / mag;
                  e.vel.y *= cap / mag;
              }
          }
      } else {
          e.vel.x *= 0.94;
          e.vel.y *= 0.94;
      }
      const box = 42;
      if (e.pos.x < box) { e.pos.x = box; if (e.vel.x < 0) e.vel.x = 0; }
      if (e.pos.x > CANVAS_WIDTH - box) { e.pos.x = CANVAS_WIDTH - box; if (e.vel.x > 0) e.vel.x = 0; }
      if (e.pos.y < box) { e.pos.y = box; if (e.vel.y < 0) e.vel.y = 0; }
      if (e.pos.y > CANVAS_HEIGHT - box) { e.pos.y = CANVAS_HEIGHT - box; if (e.vel.y > 0) e.vel.y = 0; }
  }

  private spawnMine(kind: 'cyan' | 'iris' | 'amber' | 'bile' | 'leash' | 'mark' = 'cyan') {
      const spot = this.mineSpot();
      const tx = spot.x;
      const ty = spot.y;
      const roll = Math.random();
      let x = 0;
      let y = 0;
      if (roll < 0.5) {
          x = tx < CANVAS_WIDTH * 0.5 ? -40 : CANVAS_WIDTH + 40;
          y = Math.max(48, Math.min(CANVAS_HEIGHT - 48, ty + (Math.random() - 0.5) * 180));
      } else {
          y = ty < CANVAS_HEIGHT * 0.5 ? -40 : CANVAS_HEIGHT + 40;
          x = Math.max(48, Math.min(CANVAS_WIDTH - 48, tx + (Math.random() - 0.5) * 180));
      }
      const dx = tx - x;
      const dy = ty - y;
      const dist = Math.hypot(dx, dy) || 1;
      const speed = Math.min(8.2, 3.6 + dist * 0.0022);
      const tint = kind === 'leash' || kind === 'iris' ? '#c084fc'
          : kind === 'mark' ? '#ffe08a'
          : kind === 'amber' ? '#ffb020'
          : kind === 'bile' ? '#b6e86a'
          : this.colors.BIO_MINE;
      const tag = kind === 'cyan' ? 'mine' : `mine_${kind}`;
      this.entities.push({
          id: `${tag}_${Date.now()}_${Math.random()}`, type: EntityType.BIO_MINE,
          pos: { x, y }, vel: { x: (dx / dist) * speed, y: (dy / dist) * speed },
          radius: 20, health: 10, maxHealth: 10, color: tint, damage: 150, active: true, drag: 0.1,
          value: tx, orbitOffset: ty,
      });
  }

  private spillCoins(pos: Vector2, total: number, want: number, elite: boolean, energyBudget: number, carpet = false) {
      const room = this.maxEntities - this.entities.length - 16;
      const shards = carpet
          ? Math.max(1, Math.min(want, total))
          : Math.max(1, Math.min(want, total, Math.max(1, room)));
      const base = Math.floor(total / shards);
      let leftover = total - base * shards;
      const energy = Math.max(0, energyBudget) / shards;
      const toCx = CANVAS_WIDTH * 0.5 - pos.x;
      const toCy = CANVAS_HEIGHT * 0.5 - pos.y;
      const inward = Math.atan2(toCy, toCx);
      const edge = Math.min(pos.x, pos.y, CANVAS_WIDTH - pos.x, CANVAS_HEIGHT - pos.y);
      const pull = edge < 280 ? (1 - edge / 280) * 0.85 : 0;
      // Shiny e leucógeno soltam o carpete no chão. Enquanto voa, o ímã não pega.
      const loft = carpet || this.star;
      for (let i = 0; i < shards; i++) {
          let ang = (i / shards) * Math.PI * 2 + Math.random() * 0.4;
          if (pull > 0) ang += Math.atan2(Math.sin(inward - ang), Math.cos(inward - ang)) * pull;
          const burst = shards > 50;
          const kick = loft
              ? 9 + Math.random() * 11
              : (burst ? 3.6 : 2.05) + Math.random() * (burst ? 5.2 : shards > 20 ? 3.1 : 2.2);
          const share = base + (leftover > 0 ? 1 : 0);
          if (leftover > 0) leftover--;
          this.entities.push({
              id: carpet ? `dna_shiny_${this.time}_${i}_${Math.random()}` : `dna_${this.time}_${i}_${Math.random()}`,
              type: EntityType.DNA_FRAGMENT,
              pos: { x: pos.x, y: pos.y },
              vel: { x: Math.cos(ang) * kick, y: Math.sin(ang) * kick },
              radius: shards > 50 ? 4.4 : shards > 20 ? 5.1 : 6.15,
              health: 1, maxHealth: 1,
              color: carpet ? '#ffe08a' : this.colors.DNA,
              damage: energy, active: true,
              drag: 0.05,
              value: Math.max(1, share),
              isElite: elite || carpet,
              ttl: loft ? 0.72 : undefined,
          });
      }
  }

  private syncCoinShower() {
      const pull = this.surgeActive || this.isVacuuming;
      if (pull && !this.coinCascade) {
          this.coinCascade = true;
          this.coinShowerAt = this.time;
      }
      if (!this.coinCascade) return;
      const waiting: Entity[] = [];
      let busy = 0;
      for (const e of this.entities) {
          if (!e.active || e.type !== EntityType.DNA_FRAGMENT) continue;
          if (e.angle === 1 || (e.orbitOffset ?? 0) > 0) {
              busy++;
              continue;
          }
          waiting.push(e);
      }
      if (waiting.length) {
          waiting.sort((a, b) => {
              const da = (a.pos.x - this.player.pos.x) ** 2 + (a.pos.y - this.player.pos.y) ** 2;
              const db = (b.pos.x - this.player.pos.x) ** 2 + (b.pos.y - this.player.pos.y) ** 2;
              return da - db;
          });
          const kind = this.isVacuuming && !this.surgeActive ? 'vacuum' : 'surge';
          const plan = showerPlan(waiting.length, kind);
          const origin = this.coinShowerAt;
          const late = plan.span > 0 && this.time >= origin + plan.span;
          for (let i = 0; i < waiting.length; i++) {
              const when = late ? this.time : origin + plan.slot(i) * COIN_BEAT_MS;
              waiting[i].orbitOffset = Math.max(0.001, Math.max(this.time, when));
              waiting[i].angle = 0;
              busy++;
          }
      }
      if (!pull && busy === 0) {
          this.coinCascade = false;
          this.coinShowerAt = 0;
      }
  }

  private coinTrail(e: Entity) {
      if (this.isLowQuality || this.particles.length > 150) return;
      const gate = (e.shootTimer ?? 0) - 1;
      if (gate > 0) {
          e.shootTimer = gate;
          return;
      }
      e.shootTimer = 1;
      this.particles.push({
          id: 'coin_trail',
          type: EntityType.PARTICLE,
          pos: { x: e.pos.x, y: e.pos.y },
          vel: { x: (Math.random() - 0.5) * 0.35, y: (Math.random() - 0.5) * 0.35 },
          radius: 3.1,
          health: 1, maxHealth: 1,
          color: '#ffd56a',
          damage: 0, active: true, ttl: 16,
      });
  }

  private reflectShot(shot: Entity, foe: Entity) {
      const dx = shot.pos.x - foe.pos.x;
      const dy = shot.pos.y - foe.pos.y;
      const d = Math.hypot(dx, dy) || 1;
      const spd = Math.max(12, Math.hypot(shot.vel.x, shot.vel.y));
      shot.type = EntityType.ENEMY_PROJECTILE;
      shot.id = `echo_${shot.id}`;
      shot.color = '#d6ff3a';
      shot.radius = Math.max(11, shot.radius);
      shot.damage = Math.max(8, this.player.maxHealth * 0.09);
      shot.vel.x = (dx / d) * spd;
      shot.vel.y = (dy / d) * spd;
      shot.pos.x = foe.pos.x + (dx / d) * (foe.radius + shot.radius + 6);
      shot.pos.y = foe.pos.y + (dy / d) * (foe.radius + shot.radius + 6);
      audioManager.playEnemyShoot(shot.pos);
  }

  private lymphHome() {
      return { x: CANVAS_WIDTH * 0.5 - 28, y: CANVAS_HEIGHT * 0.52 + 6 };
  }

  private tickLymph(dt: number) {
      this.player.vel.x = 0;
      this.player.vel.y = 0;
      this.isDashing = false;
      this.lymphT += dt;
      if (this.lymphPhase === 'in') this.lymphScale = Math.min(1, this.lymphT / 0.85);
      else if (this.lymphPhase === 'out') this.lymphScale = Math.max(0, 1 - this.lymphT / 0.48);
      else this.lymphScale = 1;
      const home = this.lymphHome();
      const glide = Math.min(1, dt * (1.6 + this.lymphScale * 2.4));
      this.player.pos.x += (home.x - this.player.pos.x) * glide;
      this.player.pos.y += (home.y - this.player.pos.y) * glide;
      if (this.lymphPhase === 'in' && this.lymphT >= 0.85) {
          this.lymphPhase = 'hold';
          this.lymphT = 0;
      }
      if (this.lymphPhase === 'hold' && this.nodeLeave) {
          this.nodeLeave = false;
          this.nodeFeed = false;
          this.lymphPhase = 'out';
          this.lymphT = 0;
      }
      this.nodeSpending = this.deal !== null;
      if (this.lymphPhase === 'hold' && this.nodeFeed) {
          this.nodeWasFeeding = true;
          this.lymphWind = Math.min(NODE_WIND, this.lymphWind + dt);
          this.lymphPressure = Math.min(1, this.lymphPressure + dt * 3.4);
          const canTrade = this.player.maxHealth - this.player.health >= 1 && this.biomass >= this.nodePrice();
          if (canTrade) {
              const heavy = Math.min(1, this.lymphSpent / (this.nodePrice() * 12));
              hum(this.lymphWind < NODE_WIND ? 0.16 : 0.24 + heavy * 0.76);
          }
      } else if (this.nodeWasFeeding && !this.deal) {
          this.nodeWasFeeding = false;
          this.lymphWind = 0;
          this.lymphClock = 0;
          if (this.lymphSpent > 0) {
              this.nodeVisits += 1;
              this.nodeTariff *= 1.18;
              this.lymphPricePop = 1;
              this.lymphShow = this.lymphSpent;
              this.lymphRelief = 1;
              audioManager.stopCoins();
              audioManager.playSigh(this.player.pos, Math.min(1.4, this.lymphSpent / (this.nodePrice() * 6)));
              this.spawnText(
                  { x: this.player.pos.x, y: this.player.pos.y - 64 },
                  `-${Math.round(this.lymphSpent)} DNA`,
                  '#ffd27a',
                  34
              );
          }
          this.lymphSpent = 0;
      }
      if (!this.nodeFeed) {
          this.lymphPressure = Math.max(0, this.lymphPressure - dt * 1.5);
          this.lymphWind = 0;
      }
      if (this.deal) this.stepDeal(dt);
      else if (this.dealWait > 0) this.dealWait = Math.max(0, this.dealWait - dt);
      else if (this.lymphPhase === 'hold' && this.nodeFeed && this.lymphWind >= NODE_WIND && this.boothMarks) {
          const missing = this.player.maxHealth - this.player.health;
          if (missing >= 1 && this.biomass >= this.nodePrice()) this.beginDeal();
      }
      this.nodeSpending = this.deal !== null;
      if (this.lymphRelief > 0) this.lymphRelief = Math.max(0, this.lymphRelief - dt * 0.42);
      if (this.lymphPricePop > 0) this.lymphPricePop = Math.max(0, this.lymphPricePop - dt * 1.7);
          if (this.lymphPhase === 'out' && this.lymphT >= 0.48 && !this.deal) {
          this.deal = null;
          this.dealWait = 0;
          this.boothMarks = false;
          this.invulnerabilityTimer = Math.max(this.invulnerabilityTimer, 0.7);
          this.lymphOpen = false;
          this.nodeFeed = false;
          this.nodeLeave = false;
          this.nodeSpending = false;
          this.nodeWasFeeding = false;
          this.lymphScale = 0;
          this.lymphPressure = 0;
          this.lymphWind = 0;
          this.lymphClock = 0;
          this.lymphGulp = 0;
          this.lymphSpent = 0;
      }
  }

  public setBoothMarks(purse: { x: number; y: number }, tip: { x: number; y: number }) {
      this.boothPurse = purse;
      this.boothTip = tip;
      this.boothMarks = true;
  }

  private beginDeal() {
      const price = this.nodePrice();
      const heal = this.nodeHeal();
      const depart = 0.3;
      const flight = 0.46;
      const coins: BoothCoin[] = [];
      for (let i = 0; i < price; i++) {
          const u = price <= 1 ? 0.5 : i / (price - 1);
          coins.push({
              born: u * depart,
              dur: flight,
              fan: (u - 0.5) * 18,
              lift: 54 + ((i % 3) - 1) * 3,
              r: 4.2 + (i % 3) * 0.35,
          });
      }
      this.deal = {
          age: 0,
          price,
          heal,
          paid: 0,
          granted: false,
          grantAt: -1,
          flyEnd: depart + flight,
          popEnd: depart + flight + 0.16,
          done: depart + flight + 0.16 + 0.32,
          coins,
          sparks: [],
      };
      this.dealWait = 0;
      this.lymphGulp += 1;
      this.nodeSpending = true;
      audioManager.playSpend();
  }

  private stepDeal(dt: number) {
      const d = this.deal;
      if (!d) return;
      d.age += dt;
      while (d.paid < d.price && d.age >= d.coins[d.paid].born) {
          this.biomass = Math.max(0, this.biomass - 1);
          this.lymphSpent += 1;
          d.paid += 1;
      }
      const enter = d.popEnd + (d.done - d.popEnd) * 0.62;
      if (!d.granted && d.age >= enter) {
          d.granted = true;
          d.grantAt = d.age;
          const room = Math.max(0, this.player.maxHealth - this.player.health);
          const give = Math.min(d.heal, room);
          if (give > 0) this.player.health += give;
          this.nodeTariff *= 1.34;
          this.lymphPricePop = 1;
          audioManager.playMend();
          const tip = this.boothTip;
          for (let i = 0; i < 8; i++) {
              const a = -Math.PI * 0.15 + (i / 7) * Math.PI * 1.15;
              d.sparks.push({
                  x: tip.x,
                  y: tip.y,
                  vx: Math.cos(a) * (28 + (i % 3) * 10),
                  vy: Math.sin(a) * 18 - 10,
                  life: 0.32,
                  max: 0.32,
              });
          }
      }
      for (const s of d.sparks) {
          s.life -= dt;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          s.vy += 40 * dt;
      }
      if (d.age >= d.done) {
          this.deal = null;
          this.dealWait = 0.12;
      }
  }

  private drawHeartGlyph(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, tone: 'live' | 'held' | 'quiet') {
      const s = h / 18.5;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(s, s);
      ctx.translate(-12, -11.25);
      const g = ctx.createLinearGradient(12, 1.5, 12, 20.5);
      if (tone === 'quiet') {
          g.addColorStop(0, '#f3b4bc');
          g.addColorStop(0.5, '#d85a6a');
          g.addColorStop(1, '#a83848');
      } else if (tone === 'held') {
          g.addColorStop(0, '#fff0f2');
          g.addColorStop(0.38, '#ff5a70');
          g.addColorStop(1, '#e01834');
      } else {
          g.addColorStop(0, '#ffd5db');
          g.addColorStop(0.4, '#ff2f48');
          g.addColorStop(1, '#d0102c');
      }
      ctx.fillStyle = g;
      ctx.fill(this.heartGlyph);
      ctx.globalAlpha = tone === 'quiet' ? 0.35 : 0.62;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(8.3, 6.4, 2.15, 1.2, -0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
  }

  public paintBoothTransfer(ctx: CanvasRenderingContext2D) {
      const d = this.deal;
      if (!d || !this.boothMarks) return;
      const purse = this.boothPurse;
      const tip = this.boothTip;
      const gatherX = tip.x + 18;
      const gatherY = tip.y;
      ctx.save();
      const spots: { x: number; y: number; r: number; a: number; u: number }[] = [];
      for (const c of d.coins) {
          const t = (d.age - c.born) / c.dur;
          if (t <= 0 || t >= 1) continue;
          const u = 1 - (1 - t) * (1 - t);
          const x = purse.x + c.fan * (1 - u) + (gatherX - purse.x) * u;
          const y = purse.y + (gatherY - purse.y) * u + Math.sin(Math.PI * u) * c.lift * (1 - u * 0.35);
          const fade = t < 0.04 ? t / 0.04 : t > 0.9 ? (1 - t) / 0.1 : 1;
          const shrink = u > 0.78 ? Math.max(0.15, 1 - (u - 0.78) / 0.22) : 1;
          spots.push({ x, y, r: c.r * shrink, a: Math.max(0, fade), u });
      }
      spots.sort((a, b) => a.u - b.u);
      if (spots.length > 1) {
          ctx.beginPath();
          ctx.moveTo(spots[0].x, spots[0].y);
          for (let i = 1; i < spots.length; i++) ctx.lineTo(spots[i].x, spots[i].y);
          ctx.strokeStyle = 'rgba(255, 196, 70, 0.28)';
          ctx.lineWidth = 8;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();
      }
      for (const s of spots) {
          ctx.globalAlpha = s.a;
          ctx.fillStyle = '#b87a14';
          ctx.beginPath();
          ctx.arc(s.x + 0.5, s.y + 0.7, s.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#f2b423';
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fff4c4';
          ctx.beginPath();
          ctx.arc(s.x - s.r * 0.28, s.y - s.r * 0.3, s.r * 0.34, 0, Math.PI * 2);
          ctx.fill();
      }
      ctx.globalAlpha = 1;
      const heartStart = d.flyEnd - 0.12;
      if (d.age >= heartStart && d.age < d.done) {
          const pop = Math.min(1, (d.age - heartStart) / (d.popEnd - heartStart));
          const slide = d.age <= d.popEnd ? 0 : Math.min(1, (d.age - d.popEnd) / (d.done - d.popEnd));
          const e = slide * slide * (3 - 2 * slide);
          const over = Math.sin(Math.min(1, pop) * Math.PI) * 0.12;
          const x = gatherX + (tip.x - gatherX) * e;
          const y = gatherY + (tip.y - gatherY) * e;
          const fade = slide < 0.72 ? 1 : Math.max(0, 1 - (slide - 0.72) / 0.28);
          ctx.globalAlpha = fade;
          this.drawHeartGlyph(ctx, x, y - 2, 28 * (pop + over) * (1 - e * 0.45), 'held');
      }
      if (d.granted && d.grantAt >= 0) {
          const since = d.age - d.grantAt;
          if (since < 0.24) {
              const a = 1 - since / 0.24;
              const glow = ctx.createRadialGradient(tip.x, tip.y, 1, tip.x, tip.y, 34);
              glow.addColorStop(0, `rgba(255, 236, 240, ${0.9 * a})`);
              glow.addColorStop(0.45, `rgba(255, 70, 96, ${0.35 * a})`);
              glow.addColorStop(1, 'rgba(255, 40, 60, 0)');
              ctx.globalAlpha = 1;
              ctx.fillStyle = glow;
              ctx.beginPath();
              ctx.arc(tip.x, tip.y, 34, 0, Math.PI * 2);
              ctx.fill();
          }
      }
      for (const s of d.sparks) {
          if (s.life <= 0) continue;
          ctx.globalAlpha = Math.max(0, s.life / s.max);
          ctx.fillStyle = '#ff5a70';
          ctx.beginPath();
          ctx.arc(s.x, s.y, 2.4, 0, Math.PI * 2);
          ctx.fill();
      }
      ctx.restore();
  }

  private drawNodeMenu() {
      const price = this.nodePrice();
      const heat = Math.min(1, Math.max(0, this.nodeTariff - 1) / 1.15);
      const pop = this.lymphPricePop;
      const full = this.player.health >= this.player.maxHealth - 0.5;
      const broke = this.biomass < price;
      const idle = full || broke;
      const beat = idle ? 0.15 : 0.45 + 0.55 * Math.sin(this.time / 180);
      const hold = this.lymphPressure;
      const pressing = hold > 0.08;
      const hx = NODE_REST.x;
      const hy = NODE_REST.y;

      this.ctx.save();
      this.ctx.fillStyle = 'rgba(20, 7, 9, 0.96)';
      this.ctx.strokeStyle = pressing ? '#fff1d6' : '#f0c2b4';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.roundRect(-188, -124, 376, 308, 22);
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillStyle = '#f6d5cc';
      this.ctx.font = '700 12px "Chakra Petch", sans-serif';
      this.ctx.fillText(this.t('NODE_TITLE'), 0, -104);

      this.ctx.fillStyle = '#fff8f3';
      let head = 20;
      const swap = this.t('NODE_TRADE');
      this.ctx.font = `700 ${head}px "Chakra Petch", sans-serif`;
      while (head > 14 && this.ctx.measureText(swap).width > 332) {
          head -= 1;
          this.ctx.font = `700 ${head}px "Chakra Petch", sans-serif`;
      }
      this.ctx.fillText(swap, 0, -76);

      const ring = 40;
      this.ctx.beginPath();
      this.ctx.arc(hx, hy, ring, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(255, 214, 206, ${0.28 + beat * 0.35})`;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      if (hold > 0.02) {
          this.ctx.beginPath();
          this.ctx.arc(hx, hy, ring, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * hold);
          this.ctx.strokeStyle = '#fff6e8';
          this.ctx.lineWidth = 3.5;
          this.ctx.lineCap = 'round';
          this.ctx.stroke();
      }

      const tone = idle ? 'quiet' : pressing ? 'held' : 'live';
      const bob = 1 + (pressing ? 0.06 : beat * 0.04);
      this.drawHeartGlyph(this.ctx, hx, hy + 1, 36 * bob, tone);

      const cue = pressing ? this.t('NODE_LET') : this.t('NODE_HERE');
      this.ctx.font = '700 15px "Chakra Petch", sans-serif';
      this.ctx.fillStyle = pressing ? '#fff6e8' : '#ffe8e2';
      this.ctx.fillText(cue, 0, 52);

      this.ctx.save();
      this.ctx.translate(0, 80);
      this.ctx.scale(1 + pop * 0.06, 1 + pop * 0.06);
      this.ctx.font = '700 17px "Chakra Petch", sans-serif';
      const hot = Math.round(214 - heat * 55);
      this.ctx.fillStyle = pop > 0.2 ? '#fff6d4' : `rgb(255, ${hot}, 128)`;
      this.ctx.fillText(`${price}  ${this.t('NODE_RATE')} ${this.nodeHeal()}`, 0, 0);
      this.ctx.restore();

      let note = '';
      if (full && broke) note = `${this.t('NODE_FULL')}  ·  ${this.t('NODE_EMPTY')}`;
      else if (full) note = this.t('NODE_FULL');
      else if (broke) note = this.t('NODE_EMPTY');
      else if (this.nodeTariff > 1.04) note = this.t('NODE_CLIMB');
      if (note) {
          this.ctx.font = '700 12px "Chakra Petch", sans-serif';
          this.ctx.fillStyle = full || broke ? '#ffb4b4' : '#ffb07a';
          this.ctx.fillText(note, 0, 104);
      }

      const ly = NODE_LEAVE.y;
      const label = this.t('NODE_LEAVE');
      this.ctx.font = '700 14px "Chakra Petch", sans-serif';
      this.ctx.fillStyle = '#fff3e8';
      this.ctx.beginPath();
      this.ctx.roundRect(-98, ly - 18, 196, 36, 18);
      this.ctx.fill();
      this.ctx.fillStyle = '#4a141c';
      this.ctx.fillText(label, 0, ly);
      this.ctx.restore();
  }
  private drawLymph(front: boolean) {
      const s = Math.max(0.02, this.lymphScale);
      const breath = front ? 1 : 1 + this.lymphPressure * 0.045 * Math.sin(this.time / 46);
      const pump = breath * NODE_OPEN;
      const cx = CANVAS_WIDTH * 0.5;
      const cy = CANVAS_HEIGHT * 0.52;
      this.ctx.save();
      this.ctx.translate(cx, cy);
      this.ctx.scale(s * pump, s * pump);
      const bean = () => {
          this.ctx.beginPath();
          this.ctx.moveTo(24, -156);
          this.ctx.bezierCurveTo(168, -176, 206, -78, 138, -6);
          this.ctx.bezierCurveTo(78, 36, 92, 18, 140, 70);
          this.ctx.bezierCurveTo(204, 132, 184, 176, 36, 162);
          this.ctx.bezierCurveTo(-168, 186, -248, 78, -224, -18);
          this.ctx.bezierCurveTo(-208, -158, -78, -186, 24, -156);
          this.ctx.closePath();
      };
      if (!front) {
          this.ctx.shadowColor = 'rgba(80, 16, 24, 0.45)';
          this.ctx.shadowBlur = 28;
          const flesh = this.ctx.createRadialGradient(-30, -10, 20, 0, 10, 230);
          flesh.addColorStop(0, '#fff0e4');
          flesh.addColorStop(0.45, '#f3b7a4');
          flesh.addColorStop(1, '#c47468');
          this.ctx.fillStyle = flesh;
          bean();
          this.ctx.fill();
          if (this.lymphPressure > 0.04) {
              this.ctx.globalAlpha = 0.42 * this.lymphPressure;
              this.ctx.fillStyle = '#7a1428';
              bean();
              this.ctx.fill();
              this.ctx.globalAlpha = 1;
          }
          if (this.lymphRelief > 0.04) {
              this.ctx.globalAlpha = 0.48 * this.lymphRelief;
              this.ctx.fillStyle = '#ffe6c4';
              bean();
              this.ctx.fill();
              this.ctx.globalAlpha = 1;
          }
          this.ctx.shadowBlur = 0;
          this.ctx.save();
          this.ctx.clip();
          const glow = 0.28 + 0.12 * Math.sin(this.time / 220);
          const well = this.ctx.createRadialGradient(-20, 8, 10, -10, 8, 150);
          well.addColorStop(0, `rgba(255, 228, 186, ${0.55 + glow})`);
          well.addColorStop(1, 'rgba(255, 210, 170, 0)');
          this.ctx.fillStyle = well;
          this.ctx.fillRect(-260, -200, 520, 400);
          this.ctx.strokeStyle = 'rgba(122, 42, 48, 0.35)';
          this.ctx.lineWidth = 3;
          this.ctx.beginPath();
          this.ctx.moveTo(-150, -40);
          this.ctx.bezierCurveTo(-40, -90, 40, 20, 90, 48);
          this.ctx.moveTo(-120, 50);
          this.ctx.bezierCurveTo(-10, 10, 60, 80, 110, 36);
          this.ctx.stroke();
          this.ctx.restore();
          this.ctx.strokeStyle = 'rgba(92, 28, 32, 0.55)';
          this.ctx.lineWidth = 8;
          bean();
          this.ctx.stroke();
      } else {
          this.drawNodeMenu();
      }
      this.ctx.restore();
  }

  private drawBossTools() {
      const boss = this.chief();
      const leash = this.bossLeash;
      if (leash && this.time <= leash.until) {
          const life = Math.max(0, Math.min(1, (leash.until - this.time) / 4200));
          this.ctx.save();
          this.ctx.strokeStyle = `rgba(214, 176, 255, ${0.28 + life * 0.35})`;
          this.ctx.lineWidth = 2;
          this.ctx.beginPath();
          this.ctx.arc(leash.x, leash.y, leash.reach, 0, Math.PI * 2);
          this.ctx.stroke();
          this.ctx.strokeStyle = `rgba(244, 228, 255, ${0.18 + life * 0.2})`;
          this.ctx.lineWidth = 1;
          this.ctx.beginPath();
          this.ctx.arc(leash.x, leash.y, leash.reach - 10, 0, Math.PI * 2);
          this.ctx.stroke();

          this.ctx.fillStyle = '#1a1024';
          this.ctx.strokeStyle = '#f3e8ff';
          this.ctx.lineWidth = 3;
          this.ctx.beginPath();
          this.ctx.arc(leash.x, leash.y, 11, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.stroke();
          this.ctx.fillStyle = '#d8b4fe';
          this.ctx.beginPath();
          this.ctx.arc(leash.x, leash.y, 4, 0, Math.PI * 2);
          this.ctx.fill();

          const end = boss ? { x: boss.pos.x, y: boss.pos.y } : { x: leash.x, y: leash.y - 36 };
          const dx = end.x - leash.x;
          const dy = end.y - leash.y;
          const dist = Math.hypot(dx, dy) || 1;
          const ang = Math.atan2(dy, dx);
          const links = Math.max(3, Math.round(dist / 18));
          this.ctx.strokeStyle = `rgba(243, 232, 255, ${0.75 + life * 0.2})`;
          this.ctx.lineWidth = 3.5;
          for (let i = 0; i < links; i++) {
              const t = (i + 0.5) / links;
              const cx = leash.x + dx * t;
              const cy = leash.y + dy * t;
              this.ctx.save();
              this.ctx.translate(cx, cy);
              this.ctx.rotate(ang + (i % 2 === 0 ? 0.5 : -0.5));
              this.ctx.beginPath();
              this.ctx.ellipse(0, 0, 7.5, 4.2, 0, 0, Math.PI * 2);
              this.ctx.stroke();
              this.ctx.restore();
          }
          if (boss) {
              this.ctx.save();
              this.ctx.translate(boss.pos.x, boss.pos.y);
              this.ctx.rotate(ang);
              this.ctx.strokeStyle = '#f6edff';
              this.ctx.lineWidth = 5;
              this.ctx.beginPath();
              this.ctx.arc(0, 0, boss.radius * 0.62, -0.9, 0.9);
              this.ctx.stroke();
              this.ctx.fillStyle = '#c084fc';
              this.ctx.beginPath();
              this.ctx.roundRect(boss.radius * 0.48, -7, 16, 14, 3);
              this.ctx.fill();
              this.ctx.restore();
              this.drawToolPlate(boss.pos.x, boss.pos.y - boss.radius - 36, this.t('MSG_LEASH_ON'), '#f3e8ff');
          }
          this.ctx.restore();
      }
      if (!boss || this.time >= this.bossMarkUntil) return;
      const life = Math.max(0, Math.min(1, (this.bossMarkUntil - this.time) / 5600));
      this.ctx.save();
      this.ctx.translate(boss.pos.x, boss.pos.y);
      this.ctx.strokeStyle = `rgba(255, 214, 120, ${0.55 + life * 0.4})`;
      this.ctx.lineWidth = 4;
      const arm = boss.radius + 18;
      const cut = 16;
      const corner = (sx: number, sy: number) => {
          this.ctx.beginPath();
          this.ctx.moveTo(sx * (arm - cut), sy * arm);
          this.ctx.lineTo(sx * arm, sy * arm);
          this.ctx.lineTo(sx * arm, sy * (arm - cut));
          this.ctx.stroke();
      };
      corner(1, 1);
      corner(1, -1);
      corner(-1, 1);
      corner(-1, -1);
      this.ctx.strokeStyle = 'rgba(255, 236, 180, 0.9)';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 18, 0, Math.PI * 1.35);
      this.ctx.stroke();
      this.ctx.beginPath();
      this.ctx.moveTo(16, -6);
      this.ctx.lineTo(6, -2);
      this.ctx.lineTo(12, 8);
      this.ctx.stroke();
      this.ctx.restore();
      this.drawToolPlate(boss.pos.x, boss.pos.y - boss.radius - 36 - (this.bossLeash && this.time <= this.bossLeash.until ? 42 : 0), this.t('MSG_MARK_ON'), '#ffe7a8');
  }

  private drawToolPlate(x: number, y: number, text: string, color: string) {
      this.ctx.save();
      this.ctx.font = '700 18px "Chakra Petch", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      const w = Math.min(520, this.ctx.measureText(text).width + 28);
      this.ctx.fillStyle = 'rgba(16, 10, 8, 0.88)';
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.roundRect(x - w / 2, y - 16, w, 32, 10);
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.fillStyle = color;
      this.ctx.fillText(text, x, y + 1);
      this.ctx.restore();
  }

  private rollSwarm() {
      if (this.swarmRolled) return;
      this.swarmRolled = true;
      if (Math.random() > 0.78) {
          this.swarmAt = -1;
          return;
      }
      const early: number[] = [];
      const late: number[] = [];
      for (let i = 1; i < WAVES.length; i++) {
          if (WAVES[i].hasBoss) continue;
          if (i < 12) early.push(i);
          else late.push(i);
      }
      const bag = Math.random() < 0.62 ? early : late;
      this.swarmAt = bag[Math.floor(Math.random() * bag.length)];
  }

  private swarmHere(): boolean {
      if (this.currentWaveIndex < 0 || this.swarmAt < 0) return false;
      const config = this.configFor(this.currentWaveIndex);
      if (config.hasBoss) return false;
      return (this.currentWaveIndex % WAVES.length) === this.swarmAt;
  }

  private watchLeucogen(dtSeconds: number) {
      if (this.star || this.starTaken || !this.player.active || this.waveTimer < 2.1) return;
      for (const e of this.entities) {
          if (e.active && e.type === EntityType.LEUCOGEN) return;
      }
      if (this.pillOffers >= 2) return;
      if (this.pillGap > 0) {
          this.pillGap -= dtSeconds;
          return;
      }
      const max = Math.max(1, this.player.maxHealth);
      const hurting = this.waveHurt >= max * 0.12 || this.player.health <= max * 0.74;
      if (!hurting) return;
      if (this.pillOffers >= 1 && this.player.health > max * 0.58) return;
      this.spawnPill();
  }

  private spawnPill() {
      if (this.entities.length > this.maxEntities - 8) return;
      this.pillOffers++;
      const side = Math.random() < 0.5 ? -1 : 1;
      const y = Math.max(140, Math.min(CANVAS_HEIGHT - 140, this.player.pos.y + side * (100 + Math.random() * 180)));
      this.entities.push({
          id: `leucogen_${Date.now()}`,
          type: EntityType.LEUCOGEN,
          pos: { x: CANVAS_WIDTH + 60, y },
          vel: { x: -4.4, y: 0 },
          radius: 28,
          health: 1, maxHealth: 1,
          color: '#ff2a32',
          damage: 0, active: true,
          value: y,
          orbitOffset: Math.random() * Math.PI * 2,
      });
      audioManager.starOffer({ x: CANVAS_WIDTH - 80, y });
  }

  private tickPill(e: Entity, tick: number) {
      const anchor = e.value || e.pos.y;
      e.pos.x -= 4.4 * tick;
      e.pos.y = anchor + Math.sin(this.time / 220 + (e.orbitOffset || 0)) * 26;
      if (this.player.active) {
          const reach = this.player.radius + e.radius;
          if (distSq(this.player.pos, e.pos) < reach * reach) {
              this.takePill(e);
              return;
          }
      }
      if (e.pos.x < -140) {
          e.active = false;
          if (!this.starTaken) this.pillGap = 7;
      }
  }

  private takePill(e: Entity) {
      e.active = false;
      this.star = true;
      this.starTaken = true;
      this.starGhost = 0;
      this.adrenalineActive = false;
      this.surgeActive = false;
      this.coinCascade = false;
      this.dashCooldownTimer = 0;
      this.isDashing = false;
      for (const ent of this.entities) {
          if (ent.active && ent.type === EntityType.ANTIBODY) ent.active = false;
      }
      this.spawnText(this.player.pos, this.t('LEUCOGEN'), '#fff1a8', 44);
      this.shakeIntensity = Math.max(this.shakeIntensity, 14);
      audioManager.beginStar();
  }

  private maybeSpawnShiny() {
      if (this.shinySpawned || this.currentWaveIndex !== this.shinyWave) return;
      if (this.waveTimer < 6.5) return;
      if (this.waveTimer < 15 && Math.random() >= 0.012) return;
      if (this.entities.length > this.maxEntities - 40) return;
      this.shinySpawned = true;
      this.spawnShiny();
  }

  private spawnShiny() {
      const config = this.configFor(this.currentWaveIndex);
      const type = config.enemyTypes[Math.floor(Math.random() * config.enemyTypes.length)] ?? EntityType.BACTERIA;
      const pressure = campaignPressure(this.currentWaveIndex);
      const hp = 1;
      const jackpot = Math.round(860 * (this.difficultyMods.score ?? 1) * (1 + pressure * 0.35));
      const y = 180 + Math.random() * (CANVAS_HEIGHT - 360);
      this.entities.push({
          id: `shiny_${Date.now()}_${Math.random()}`,
          type,
          pos: { x: CANVAS_WIDTH - 420, y },
          vel: { x: -1.6, y: (Math.random() - 0.5) * 1.4 },
          radius: 28,
          health: hp, maxHealth: hp,
          color: '#ffe27a',
          damage: 6,
          active: true,
          value: jackpot,
          isElite: false,
          drag: 0.1,
          hitFlash: 0,
          ttl: 13.2,
      });
      this.spawnText({ x: CANVAS_WIDTH - 420, y: y - 36 }, this.t('SHINY'), '#ffe08a', 30);
      audioManager.playShiny({ x: CANVAS_WIDTH - 420, y });
  }

  private tickShiny(e: Entity, dtSeconds: number) {
      if (!e.active || e.health <= 0) return;
      e.ttl = (e.ttl ?? 8) - dtSeconds;
      const desperate = (e.ttl ?? 0) < 2.2;
      const hue = (this.time / (desperate ? 3.2 : 8)) % 360;
      e.color = `hsl(${Math.floor(hue)}, 90%, ${desperate ? 68 : 62}%)`;
      const dx = e.pos.x - this.player.pos.x;
      const dy = e.pos.y - this.player.pos.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      const weave = Math.sin(this.time * 0.006 + e.pos.y * 0.01);
      const push = desperate ? 0.92 : 0.3;
      e.vel.x += ((dx / dist) * push + (-dy / dist) * weave * 0.9);
      e.vel.y += ((dy / dist) * push + (dx / dist) * weave * 0.9);
      if (!desperate) {
          const m = 170;
          if (e.pos.x < m) { e.pos.x = m; e.vel.x = Math.abs(e.vel.x) + 1.2; }
          if (e.pos.x > CANVAS_WIDTH - m) { e.pos.x = CANVAS_WIDTH - m; e.vel.x = -Math.abs(e.vel.x) - 1.2; }
          if (e.pos.y < m) { e.pos.y = m; e.vel.y = Math.abs(e.vel.y) + 1.2; }
          if (e.pos.y > CANVAS_HEIGHT - m) { e.pos.y = CANVAS_HEIGHT - m; e.vel.y = -Math.abs(e.vel.y) - 1.2; }
          return;
      }
      const outside = e.pos.x < 24 || e.pos.x > CANVAS_WIDTH - 24 || e.pos.y < 24 || e.pos.y > CANVAS_HEIGHT - 24;
      if ((e.ttl ?? 0) <= 0 || outside) {
          e.active = false;
          this.spawnText(e.pos, this.t('SHINY_LOST'), '#ffb4c4', 26);
          audioManager.playSlip(e.pos);
      }
  }

  private drawShinyGlint(radius: number) {
      const n = this.isLowQuality ? 3 : 5;
      const hue = (this.time / 8) % 360;
      this.ctx.save();
      this.ctx.globalCompositeOperation = 'screen';
      this.ctx.strokeStyle = `hsla(${hue}, 95%, 78%, 0.9)`;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, radius * 1.32, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.fillStyle = '#fff8d8';
      for (let i = 0; i < n; i++) {
          const a = this.time / 260 + (i / n) * Math.PI * 2;
          const x = Math.cos(a) * radius * 1.05;
          const y = Math.sin(a) * radius * 0.72;
          this.ctx.beginPath();
          this.ctx.arc(x, y, i % 2 ? 2.2 : 3.1, 0, Math.PI * 2);
          this.ctx.fill();
      }
      this.ctx.restore();
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
      if (target.id.startsWith('fuso_echo')) {
          target.hitFlash = 4;
          return false;
      }
      
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
      
      this.flinch(target); 

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
              for (const other of this.entities) {
                  if (other.id.startsWith('fuso_echo')) other.active = false;
              }
              this.fusoShown = 0;
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

          const shiny = target.id.startsWith('shiny_');
          if (shiny) {
              // A fortuna cai no chão e espera. Passar por cima e puxar é que é a graça.
              const jackpot = Math.max(1, Math.floor(target.value || 1));
              this.spillCoins({ x: target.pos.x, y: target.pos.y }, jackpot, 72, true, 48, true);
              audioManager.playPowerUp(target.pos);
              this.spawnText(target.pos, this.t('SHINY'), '#ffe08a', 34);
          } else {
          const dnaYield = 1.15;
          const gross = Math.max(1, Math.ceil((target.value || 10) * Math.min(3, comboPower) * dnaYield));
          const oldShards = Math.min(gross, Math.min(6, Math.max(3, Math.ceil(gross / 12))));
          const purse = dnaPurse(this.currentWaveIndex);
          const bossCut = target.type === EntityType.BOSS ? BOSS_PURSE : 1;
          const total = Math.max(1, Math.round(gross * COIN_WORTH * purse * bossCut));
          const want = Math.min(25, total, Math.max(5, Math.round(5 + Math.sqrt(total) * 1.38)));
          const energyBudget = oldShards * (target.isElite ? 12 : 3);
          this.spillCoins(target.pos, total, want, !!target.isElite, energyBudget);
          }
          
          return true;
      }
      
      return false;
  }

  private sting(amount: number, source: Vector2, force?: HurtGrade) {
      const grade = force ?? hurtGrade(amount);
      const dx = this.player.pos.x - source.x;
      const dy = this.player.pos.y - source.y;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = dx / dist;
      const ny = dy / dist;
      this.hurt = Math.max(this.hurt, hurtPunch(grade));
      this.hurtFlash = Math.max(this.hurtFlash, hurtBruise(grade));
      this.hurtBloom = HURT_BLOOM;
      this.hurtAngle = Math.atan2(-ny, -nx);
      const kick = hurtKick(grade);
      this.hurtKickX = nx * kick;
      this.hurtKickY = ny * kick;
      const shove = hurtShove(grade);
      this.player.vel.x = nx * shove;
      this.player.vel.y = ny * shove;
      this.shakeIntensity = Math.max(this.shakeIntensity, hurtShake(grade));
      const stop = hurtStop(grade);
      if (stop > 0) {
          this.hitStopTimer = Math.max(this.hitStopTimer, stop);
          this.hurtSerious = true;
      }
      audioManager.playHurt(grade, this.player.pos);
      this.ripMembrane(nx, ny, grade);
      if (grade === 0) buzz('nick');
      else if (grade === 1) buzz('tap');
      else buzz('sting');
  }

  /** Pedaços da membrana saem para o lado oposto de quem bateu. */
  private ripMembrane(nx: number, ny: number, grade: HurtGrade) {
      const base = Math.atan2(ny, nx);
      const count = (this.isLowQuality ? 4 : 7) + grade;
      for (let i = 0; i < count; i++) {
          const ang = base + (Math.random() - 0.5) * 1.15;
          const spd = 6 + Math.random() * (7 + grade * 3);
          this.particles.push({
              id: 'membrane',
              type: EntityType.PARTICLE,
              pos: {
                  x: this.player.pos.x + nx * this.player.radius * 0.35,
                  y: this.player.pos.y + ny * this.player.radius * 0.35,
              },
              vel: { x: Math.cos(ang) * spd, y: Math.sin(ang) * spd },
              radius: 2.1 + Math.random() * 2.3,
              health: 1,
              maxHealth: 1,
              color: i % 3 === 0 ? '#fff4f2' : '#ff2438',
              damage: 0,
              active: true,
              ttl: 14 + Math.floor(Math.random() * 8),
          });
      }
      this.particles.push({
          id: 'ring',
          type: EntityType.PARTICLE,
          pos: { x: this.player.pos.x, y: this.player.pos.y },
          vel: { x: 0, y: 0 },
          radius: this.player.radius + 4,
          health: 1,
          maxHealth: 14,
          color: '#ff3044',
          damage: 0,
          active: true,
          ttl: 14,
      });
  }

  // --- REVISED: DAMAGE PLAYER LOGIC ---
  private damagePlayer(amount: number, sourcePos: Vector2, onGameOver: () => void, onLifeLost: () => void, stats: PlayerStats, isEnvironmental: boolean = false, sourceEntity?: Entity) {
      if (this.star || this.invulnerabilityTimer > 0 || this.isDashing) return;
      if (this.organ.shield > 0) amount *= (1 - this.organ.shield);
      if (stats.guard > 0) amount *= (1 - Math.min(0.45, stats.guard));

      this.player.health = Math.max(0, this.player.health - amount);
      this.sessionStats.damageTaken += amount;
      this.waveHurt += amount;
      this.sting(amount, sourcePos);
      
      // Reset Combo
      if (this.comboCount > 5) this.spawnText(this.player.pos, this.t('MSG_COMBO_LOST'), this.colors.PARASITE, 20);
      this.comboCount = 0;

      // New Mechanics: Escape Feedback (Entity Collision only)
          if (!isEnvironmental) {
          if (sourceEntity && sourceEntity.active && sourceEntity.type !== EntityType.BOSS && !sourceEntity.id.startsWith('shiny_')) {
              sourceEntity.radius = Math.min(240, sourceEntity.radius * 1.1);
              sourceEntity.damage *= 1.1;
              this.spawnText(sourceEntity.pos, this.t('MSG_GREW'), sourceEntity.color, 15);
          }

          // SURPRESA 2: CHOQUE DE SISTEMA
          // Ativa falha no próximo disparo
          this.systemGlitchActive = true;

          this.invulnerabilityTimer = 0.4;
          this.dashCooldownTimer = 0;
      }

      if (this.player.health <= 0) {
          this.handlePlayerDeath(onGameOver, onLifeLost, stats);
      }
  }

  private phagocytose(e: Entity, stats: PlayerStats) {
      if (!this.star || !e.active || !this.isEnemy(e.type)) return;
      if (e.id.startsWith('shiny_')) {
          this.damageEnemy(e, 9999, false, stats);
      } else {
          e.health = 0;
          e.active = false;
          this.sessionStats.enemiesKilled++;
          achievementManager.track('kill_100', 1);
          achievementManager.track('kill_1000', 1);
          achievementManager.track('kill_5000', 1);
          achievementManager.track('kill_10000', 1);
          this.comboCount++;
          if (this.comboCount >= 50) achievementManager.track('combo_50', 50);
          this.comboTimer = this.COMBO_DURATION;
          if (this.comboCount > this.sessionStats.maxCombo) this.sessionStats.maxCombo = this.comboCount;
          this.score += Math.floor((e.value || 10) * comboScoreMultiplier(this.comboCount));
          if (this.score >= 50000) achievementManager.track('score_50k', 50000);
          const purse = dnaPurse(this.currentWaveIndex);
          const gross = Math.max(4, Math.ceil((e.value || 10) * 1.2));
          const total = Math.max(2, Math.round(gross * COIN_WORTH * purse * 1.2));
          const want = Math.min(12, Math.max(6, Math.round(5 + Math.sqrt(total))));
          this.spillCoins(e.pos, total, want, true, 5);
          const sparks = this.isLowQuality ? 4 : 9;
          for (let i = 0; i < sparks; i++) {
              const ang = (i / sparks) * Math.PI * 2;
              const spd = 5 + Math.random() * 7;
              this.particles.push({
                  id: 'star_pop', type: EntityType.PARTICLE, pos: { ...e.pos },
                  vel: { x: Math.cos(ang) * spd, y: Math.sin(ang) * spd },
                  radius: 3.5, health: 1, maxHealth: 1,
                  color: i % 2 ? '#fff6d0' : '#ff3355',
                  damage: 0, active: true, ttl: 16,
              });
          }
      }
      audioManager.starKill();
      this.hitStopTimer = Math.max(this.hitStopTimer, 0.035);
      const mag = Math.hypot(this.player.vel.x, this.player.vel.y) || 1;
      this.hurtKickX = (this.player.vel.x / mag) * 6.5;
      this.hurtKickY = (this.player.vel.y / mag) * 6.5;
      this.shakeIntensity = Math.max(this.shakeIntensity, 8);
  }

  private environmentalHit(amount: number, pos: Vector2, iframe: number, stats: PlayerStats, onGameOver: () => void, onLifeLost: () => void) {
      if (this.invulnerabilityTimer > 0 || this.isDashing || !this.player.active) return;
      this.damagePlayer(amount, pos, onGameOver, onLifeLost, stats, true);
      if (iframe > 0 && this.player.health > 0) this.invulnerabilityTimer = iframe;
  }

  public handlePlayerDeath(onGameOver: () => void, onLifeLost: () => void, currentStats: PlayerStats) {
      if (this.lives > 0) {
          this.lives--;
          audioManager.playLifeLost(this.player.pos);
          buzz('life');
          onLifeLost();
          this.hitStopTimer = 0;
          this.hurt = 1;
          this.lifeCut = 1;
          this.lifeRumble = 34;
          this.hurtFlash = Math.max(this.hurtFlash, 1.15);
          this.hurtBloom = 0.24;
          this.hurtKickX *= 2.6;
          this.hurtKickY *= 2.6; 
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
              this.shakeIntensity = Math.max(this.shakeIntensity, 34);
              this.ripMembrane(0, -1, 2);
              this.ripMembrane(1, 0, 2);
              const rings = [
                  { color: '#fff6f6', radius: this.player.radius + 6, ttl: 18 },
                  { color: '#ff2438', radius: this.player.radius + 18, ttl: 28 },
                  { color: '#ffd0d4', radius: this.player.radius + 34, ttl: 36 },
              ];
              for (const ring of rings) {
                  this.particles.push({
                      id: 'ring', type: EntityType.PARTICLE,
                      pos: { x: this.player.pos.x, y: this.player.pos.y },
                      vel: { x: 0, y: 0 },
                      radius: ring.radius,
                      health: 1, maxHealth: ring.ttl,
                      color: ring.color,
                      damage: 0, active: true, ttl: ring.ttl,
                  });
              }
              const drops = this.isLowQuality ? 12 : 26;
              for (let i = 0; i < drops; i++) {
                  const angle = (i / drops) * Math.PI * 2;
                  const speed = 7 + (i % 3) * 3;
                  this.particles.push({
                      id: 'blood_surge', type: EntityType.PARTICLE,
                      pos: { x: this.player.pos.x, y: this.player.pos.y },
                      vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
                      radius: 4.5 + (i % 4),
                      health: 1, maxHealth: 1,
                      color: i % 2 ? '#ff2030' : '#fff1f3',
                      damage: 0, active: true, ttl: 28,
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
    this.coinCascade = false;
    this.coinShowerAt = 0;
    this.mineClock = 0;
    this.sweepMines = false;
    this.fusoEchoIn = -1;
    this.fusoVeilLeft = 0;
    this.fusoVeilHold = false;
    this.fusoShown = 0;
    this.bossClock = 0;
    this.bossBombDue = 0;
    this.bossLeash = null;
    this.bossMarkUntil = 0;
    this.hurt = 0;
    this.hurtFlash = 0;
    this.hurtBloom = 0;
    this.hurtEase = 0;
    this.lifeCut = 0;
    this.lifeRumble = 0;
    this.hurtSerious = false;
    this.hurtKickX = 0;
    this.hurtKickY = 0;
    this.rollSwarm();
    this.waveHurt = 0;
    this.pillOffers = 0;
    this.pillGap = 0;
    this.starTaken = false;
    if (this.star) {
        this.star = false;
        audioManager.endStar(true);
    }
    audioManager.stopCoins();
    this.lymphOpen = false;
    this.nodeFeed = false;
    this.nodeLeave = false;
    this.nodeSpending = false;
    const waveNum = waveIndex + 1;
    audioManager.setGameState(waveNum, 1.0, false);
    const organIx = Math.floor(waveIndex / 6);
    if (organIx !== this.shinyOrgan) {
        this.shinyOrgan = organIx;
        this.shinySpawned = false;
        this.shinyWave = organIx * 6 + Math.floor(Math.random() * 4);
    }
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
    if (this.star && !force) return;
    // O HUD arredonda. 99.6 aparece cheio e o botão acende; o pulso tem que sair.
    const meterFull = Math.round(this.energy) >= Math.round(Math.max(1, stats.maxEnergy));
    if (force || meterFull) {
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
      if (!this.coinCascade) this.coinShowerAt = this.time;
      this.coinCascade = true;
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

  private launchDash(stats: PlayerStats) {
      let dx = this.inputVector.x;
      let dy = this.inputVector.y;
      if (dx === 0 && dy === 0) dx = 1;
      const mag = Math.hypot(dx, dy) || 1;
      this.dashVector = { x: dx / mag, y: dy / mag };
      const mul = this.star ? 1.85 : 1;
      this.player.vel.x = this.dashVector.x * stats.dashSpeed * mul;
      this.player.vel.y = this.dashVector.y * stats.dashSpeed * mul;
      this.shakeIntensity = Math.max(this.shakeIntensity, this.star ? 6 : 10);
      this.screenShake = { x: -this.dashVector.x * 5, y: -this.dashVector.y * 5 };
      audioManager.playDash();
  }

  public triggerDash(stats: PlayerStats) {
      if (this.star && this.isDashing) {
          this.dashDuration = 0.22;
          this.dashCooldownTimer = 0;
          this.dashStruck.clear();
          this.launchDash(stats);
          return;
      }
      if (!this.star && (this.dashCooldownTimer > 0 || this.isDashing)) return;
      if (this.isDashing) return;
      this.dashCooldownTimer = this.star ? 0 : stats.dashCooldown / 1000;
      this.isDashing = true;
      this.dashStruck.clear();
      this.dashDuration = this.star ? 0.24 : 0.2;
      this.launchDash(stats);
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
          if (e.id.startsWith('fuso_echo')) { e.active = false; return; }
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

  private markEnrage(e: Entity, shot: number) {
      const m = e.mutation;
      if (!m || m.enraged || e.health <= 0 || e.health >= e.maxHealth * 0.5) return;
      m.enraged = true;
      m.attack = Math.max(m.attack, 1.2);
      if (m.play === 'bud' && !m.split) {
          m.split = true;
          e.radius *= 0.78;
          m.baseSpeed *= 1.3;
          m.shootTimer = 1.35;
          for (let i = 0; i < 8; i++) this.bossShot(e, (i / 8) * Math.PI * 2, 7, 12, shot * 0.7);
          audioManager.playEnemyShoot(e.pos);
          return;
      }
      if (m.play === 'cyst' && !m.open) {
          m.open = true;
          m.baseSpeed *= 1.5;
          m.dashTimer = 0.55;
          audioManager.playBossDash(e.pos);
          return;
      }
      m.baseSpeed *= 1.08;
      audioManager.playBossDash(e.pos);
      if (m.play === 'abscess' || m.play === 'filament') m.acidTimer = 0;
      else if (m.play === 'cluster' || m.play === 'capsid' || m.play === 'capsule' || m.play === 'reactivate' || m.play === 'coil') m.shootTimer = 0.18;
      else if (m.play === 'cord') {
          m.dashTimer = 0.12;
          m.shootTimer = 0.22;
      } else m.dashTimer = 0.12;
  }

  private reelBoss(e: Entity, m: NonNullable<Entity['mutation']>, dtSeconds: number) {
      const leash = this.bossLeash;
      if (leash && this.time > leash.until) this.bossLeash = null;
      const live = this.bossLeash;
      if (live) {
          const dx = e.pos.x - live.x;
          const dy = e.pos.y - live.y;
          const dist = Math.hypot(dx, dy) || 1;
          if (dist > live.reach) {
              e.pos.x = live.x + (dx / dist) * live.reach;
              e.pos.y = live.y + (dy / dist) * live.reach;
              const outward = (e.vel.x * dx + e.vel.y * dy) / dist;
              if (outward > 0) {
                  e.vel.x -= (dx / dist) * outward;
                  e.vel.y -= (dy / dist) * outward;
              }
          }
          if (m.dashTimer < 0.4) m.dashTimer = 0.4;
      }
      if (this.time > this.bossMarkUntil) return;
      const drag = dtSeconds * 0.45;
      if (m.shootTimer > 0) m.shootTimer += drag;
      if (m.dashTimer > 0) m.dashTimer += drag;
      if (m.acidTimer > 0) m.acidTimer += drag;
  }

  private chief(): Entity | undefined {
      return this.entities.find(e => e.active && e.type === EntityType.BOSS && !e.id.startsWith('fuso_echo'));
  }

  private tickFusoShade(m: NonNullable<Entity['mutation']>, dt: number, hot: boolean, winding: boolean) {
      if (!hot) {
          m.veil = Math.max(0, m.veil - dt * 1.8);
          this.fusoShown = m.veil;
          this.fusoEchoIn = -1;
          this.fusoVeilLeft = 0;
          this.fusoVeilHold = false;
          return;
      }
      if (this.fusoEchoIn < 0) {
          this.fusoEchoIn = 4.6;
          this.fusoVeilHold = false;
          this.fusoVeilLeft = 2.6;
      }
      this.fusoEchoIn -= dt;
      const echoes = this.entities.some(x => x.active && x.id.startsWith('fuso_echo'));
      if (!echoes && this.fusoEchoIn <= 0) {
          const boss = this.chief();
          if (boss) this.spawnFusoEchoes(boss);
          this.fusoEchoIn = 12;
      }
      if (this.fusoVeilLeft <= 0) {
          this.fusoVeilHold = !this.fusoVeilHold;
          this.fusoVeilLeft = this.fusoVeilHold ? 2.15 : 4.6;
      }
      this.fusoVeilLeft -= dt;
      const target = winding ? 0.12 : (this.fusoVeilHold ? 1 : 0);
      m.veil += (target - m.veil) * Math.min(1, dt * 2.6);
      this.fusoShown = m.veil;
  }

  private spawnFusoEchoes(boss: Entity) {
      const m = boss.mutation;
      if (!m) return;
      audioManager.playBossDash(boss.pos);
      for (let i = 0; i < 2; i++) {
          const ang = (i === 0 ? -0.9 : 0.55) + (Math.random() - 0.5) * 0.25;
          this.entities.push({
              id: `fuso_echo_${this.time}_${i}`,
              type: EntityType.BOSS,
              pos: {
                  x: Math.max(90, Math.min(CANVAS_WIDTH - 90, boss.pos.x + Math.cos(ang) * 130)),
                  y: Math.max(90, Math.min(CANVAS_HEIGHT - 90, boss.pos.y + Math.sin(ang) * 100)),
              },
              vel: { x: Math.cos(ang) * 3.4, y: Math.sin(ang) * 3.4 },
              radius: boss.radius * 0.92,
              health: boss.maxHealth,
              maxHealth: boss.maxHealth,
              color: boss.color,
              damage: Math.max(8, boss.damage * 0.28),
              active: true,
              value: 0,
              drag: 0.12,
              ttl: 6.6,
              mutation: {
                  ...m,
                  veil: 0,
                  dashTimer: 1.15 + i * 0.75,
                  acidTimer: 99,
                  shootTimer: 99,
                  attack: 0,
                  phase: m.phase + i * 1.3,
              },
          });
      }
  }

  private bossPresence(e: Entity): number {
      if (e.id.startsWith('fuso_echo')) {
          const life = e.ttl ?? 0;
          const fadeIn = Math.min(1, (6.6 - life) / 0.35);
          const fadeOut = life < 0.8 ? Math.max(0, life / 0.8) : 1;
          return (0.5 + this.fusoShown * 0.36) * fadeIn * fadeOut;
      }
      if (e.mutation?.id !== 'molar>liver') return 1;
      const veiled = 1 - (e.mutation.veil ?? 0) * 0.82;
      if ((e.hitFlash ?? 0) > 0) return Math.max(veiled, 0.72);
      return veiled;
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
      const aim = Math.atan2(dy, dx);
      const shot = Math.max(5, e.damage * 0.22);
      this.markEnrage(e, shot);
      const hot = m.enraged;
      this.reelBoss(e, m, dtSeconds);
      const speed = m.baseSpeed * this.difficultyMods.speed * pace;
      const chase = (mul = 1) => {
          e.vel.x += nx * speed * mul;
          e.vel.y += ny * speed * mul;
      };
      const lunge = (power: number, side = 0, sidePower = 0) => {
          e.vel.x = (nx * power + (-ny) * side * sidePower) * pace;
          e.vel.y = (ny * power + nx * side * sidePower) * pace;
      };

      if (e.id.startsWith('fuso_echo')) {
          e.ttl = (e.ttl ?? 0) - dtSeconds;
          if ((e.ttl ?? 0) <= 0 || !this.chief()) {
              e.active = false;
              return;
          }
          e.vel.x += nx * speed * 0.9;
          e.vel.y += ny * speed * 0.9;
          m.dashTimer -= dtSeconds;
          if (m.dashTimer <= 0) {
              lunge(8.5);
              m.dashTimer = 2.9;
              m.attack = Math.max(m.attack, 0.65);
          }
          return;
      }

      if (m.play === 'coil') {
          const tight = hot ? 0.7 : 1;
          const orbit = (150 + Math.sin(m.phase * (hot ? 1.15 : 0.7)) * (hot ? 48 : 90)) * tight;
          const ang = m.phase * (hot ? 1.42 : 1.05);
          const tx = this.player.pos.x + Math.cos(ang) * orbit;
          const ty = this.player.pos.y + Math.sin(ang) * orbit;
          const ox = tx - e.pos.x;
          const oy = ty - e.pos.y;
          const od = Math.max(1, Math.hypot(ox, oy));
          e.vel.x += (ox / od) * speed * (hot ? 1.45 : 1.25);
          e.vel.y += (oy / od) * speed * (hot ? 1.45 : 1.25);
          if (hot) {
              m.shootTimer -= dtSeconds;
              if (m.shootTimer <= 0) {
                  for (let i = 0; i < 6; i++) this.bossShot(e, (i / 6) * Math.PI * 2 + m.phase, 3.4, 11, shot * 0.42);
                  m.shootTimer = 3.6 * haste;
                  audioManager.playEnemyShoot(e.pos);
              }
          }
          return;
      }

      if (m.play === 'flagellum') {
          const sway = Math.sin(m.phase * (hot ? 3.3 : 2.15));
          const swim = hot ? 1.22 : 1;
          e.vel.x += nx * speed * swim + (-ny) * sway * speed * (hot ? 0.95 : 0.75);
          e.vel.y += ny * speed * swim + nx * sway * speed * (hot ? 0.95 : 0.75);
          m.dashTimer -= dtSeconds;
          if (m.dashTimer <= 0) {
              const side = sway >= 0 ? 1 : -1;
              lunge(hot ? 13 : 10, side, hot ? 7 : 5.2);
              this.bossShot(e, aim + side * 0.85, hot ? 6.5 : 5.5, 12, shot * 0.55);
              if (hot) this.bossShot(e, aim - side * 0.85, 6.5, 12, shot * 0.5);
              m.dashTimer = (hot ? 1.65 : 2.65) * haste;
              m.attack = Math.max(m.attack, 0.7);
              audioManager.playBossDash(e.pos);
          }
          return;
      }

      if (m.play === 'cord') {
          const spin = Math.sin(m.phase * (hot ? 1.85 : 1.2));
          e.vel.x += nx * speed * 1.05 + (-ny) * speed * (hot ? 1.05 : 0.8) * spin;
          e.vel.y += ny * speed * 1.05 + nx * speed * (hot ? 1.05 : 0.8) * spin;
          m.dashTimer -= dtSeconds;
          if (m.dashTimer <= 0) {
              const kick = hot ? 8.2 : 6;
              e.vel.x += nx * kick * pace;
              e.vel.y += ny * kick * pace;
              m.dashTimer = (hot ? 2.35 : 3.1) * haste;
              m.attack = Math.max(m.attack, 0.75);
          }
          if (hot && m.shootTimer < 30) {
              m.shootTimer -= dtSeconds;
              if (m.shootTimer <= 0) {
                  for (let i = 0; i < 6; i++) this.bossShot(e, (i / 6) * Math.PI * 2 + m.phase, 3.2, 11, shot * 0.4);
                  m.shootTimer = 100;
                  audioManager.playEnemyShoot(e.pos);
              }
          }
          return;
      }

      if (m.play === 'crescent') {
          chase(hot ? 1.12 : 0.7);
          m.dashTimer -= dtSeconds;
          if (m.dashTimer <= 0) {
              const side = m.phase % 2 > 1 ? 1 : -1;
              lunge(hot ? 15 : 12, side, hot ? 8 : 6);
              const fan = hot ? 5 : 3;
              const spread = hot ? 0.2 : 0.15;
              for (let i = 0; i < fan; i++) {
                  const a = aim + (i - (fan - 1) / 2) * spread;
                  this.bossShot(e, a, hot ? 7.1 : 6.1, 11, shot * (hot ? 0.58 : 0.48));
              }
              m.dashTimer = (hot ? 1.22 : 1.72) * haste;
              m.attack = Math.max(m.attack, 0.85);
              audioManager.playBossDash(e.pos);
          }
          return;
      }

      if (m.play === 'pseudopod') {
          m.dashTimer -= dtSeconds;
          if (m.dashTimer > (hot ? 0.36 : 0.55)) chase(0.15);
          if (m.dashTimer <= 0) {
              lunge(hot ? 14 : 12);
              this.bossPool(e, hot ? 86 : 78, hot ? 4.3 : 4);
              m.dashTimer = (hot ? 2.65 : 3.8) * haste;
              m.attack = Math.max(m.attack, 0.9);
              audioManager.playBossDash(e.pos);
          }
          return;
      }

      if (m.play === 'reactivate') {
          m.shootTimer -= dtSeconds;
          if (m.shootTimer > (hot ? 0.42 : 0.7)) chase(hot ? 0.52 : 0.2);
          if (m.shootTimer <= 0) {
              const n = hot ? 10 : 8;
              const bite = shot * (hot ? 0.5 : 0.6);
              for (let i = 0; i < n; i++) this.bossShot(e, (i / n) * Math.PI * 2, hot ? 6.3 : 5.6, 12, bite);
              m.shootTimer = (hot ? 2.65 : 3.8) * haste;
              audioManager.playEnemyShoot(e.pos);
          }
          return;
      }

      const chaseMul = m.play === 'adhere' ? (hot ? 1.28 : 1.05)
          : m.play === 'capsid' ? 1
          : m.play === 'capsule' ? (hot ? 0.95 : 0.65)
          : m.play === 'bud' ? (hot ? 1.18 : 1)
          : 1;
      chase(chaseMul);
      if (hot && m.play === 'capsid') {
          const sway = Math.sin(m.phase * 3);
          e.vel.x += -ny * speed * 0.55 * sway;
          e.vel.y += nx * speed * 0.55 * sway;
      }

      if (m.play === 'bud' && hot) {
          m.shootTimer -= dtSeconds;
          if (m.shootTimer <= 0) {
              this.bossShot(e, aim, 8, 14, shot * 0.72);
              m.shootTimer = 2.45 * haste;
              audioManager.playEnemyShoot(e.pos);
          }
      }

      if (m.play === 'abscess' || m.play === 'filament') {
          if (hot && m.play === 'filament') {
              e.vel.x += -ny * speed * 0.85;
              e.vel.y += nx * speed * 0.85;
          }
          m.acidTimer -= dtSeconds;
          if (m.acidTimer <= 0) {
              const grain = m.play === 'filament';
              this.bossPool(e, (grain ? 46 : 72) * (hot ? 1.12 : 1), grain ? 3.6 : 5);
              if (hot && !grain && m.id !== 'molar>liver') lunge(7);
              m.acidTimer = (grain ? 3.05 : 2.55) * (hot ? 0.64 : 1) * haste;
          }
          if (m.id === 'molar>liver') {
              m.dashTimer -= dtSeconds;
              const wind = hot ? 0.38 : 0.5;
              const winding = m.dashTimer > 0 && m.dashTimer < wind;
              if (winding) {
                  e.vel.x *= 0.82;
                  e.vel.y *= 0.82;
              }
              if (m.dashTimer <= 0) {
                  lunge(hot ? 14.5 : 12);
                  m.dashTimer = (hot ? 2.55 : 3.35) * haste;
                  m.attack = Math.max(m.attack, 0.8);
                  audioManager.playBossDash(e.pos);
              }
              this.tickFusoShade(m, dtSeconds, hot, winding);
          }
      }

      if (m.play === 'embolus') {
          m.dashTimer -= dtSeconds;
          if (m.dashTimer <= 0) {
              lunge(hot ? 13 : 11);
              const n = hot ? 3 : 2;
              const bite = shot * (hot ? 0.7 : 0.8);
              for (let i = -n; i <= n; i++) this.bossShot(e, aim + i * (hot ? 0.2 : 0.24), hot ? 7.1 : 6.6, 11, bite);
              m.dashTimer = (hot ? 3.15 : 4.4) * haste;
              m.attack = Math.max(m.attack, 0.9);
              audioManager.playBossDash(e.pos);
          }
      }

      if (m.play === 'cluster') {
          m.shootTimer -= dtSeconds;
          if (m.shootTimer <= 0) {
              const n = hot ? 3 : 2;
              for (let i = -n; i <= n; i++) this.bossShot(e, aim + i * (hot ? 0.18 : 0.26), hot ? 6.8 : 6.2, 11, shot * 0.62);
              m.shootTimer = (hot ? 2.4 : 3.05) * haste;
              audioManager.playEnemyShoot(e.pos);
          }
      }

      if (m.play === 'capsid') {
          m.shootTimer -= dtSeconds;
          if (m.shootTimer <= 0) {
              this.bossShot(e, aim, 7.4, 10, shot * 0.6);
              if (hot) this.bossShot(e, aim + (m.phase % 2 > 1 ? 0.18 : -0.18), 6.5, 10, shot * 0.42);
              m.shootTimer = (hot ? 1.22 : 1.55) * haste;
          }
      }

      if (m.play === 'capsule') {
          m.shootTimer -= dtSeconds;
          if (m.shootTimer <= 0) {
              const kick = hot ? 4.6 : 3.6;
              for (let i = 0; i < 8; i++) this.bossShot(e, (i / 8) * Math.PI * 2 + m.phase, kick, 12, shot * 0.55);
              m.shootTimer = (hot ? 3.45 : 5.2) * haste;
              audioManager.playEnemyShoot(e.pos);
          }
      }

      if (m.play === 'adhere') {
          m.dashTimer -= dtSeconds;
          if (m.dashTimer <= 0 && dMag > (hot ? 150 : 240)) {
              lunge(hot ? 11 : 9);
              if (hot) {
                  for (let i = -1; i <= 1; i++) this.bossShot(e, aim + Math.PI + i * 0.32, 4.1, 11, shot * 0.42);
              }
              m.dashTimer = (hot ? 2.25 : 3.4) * haste;
          }
      }

      if (m.play === 'cyst' && m.open) {
          m.dashTimer -= dtSeconds;
          if (m.dashTimer <= 0) {
              lunge(hot ? 13 : 11);
              if (hot) {
                  for (let i = -1; i <= 1; i++) this.bossShot(e, aim + i * 0.28, 6, 11, shot * 0.48);
              }
              m.dashTimer = (hot ? 2.15 : 2.8) * haste;
              m.attack = Math.max(m.attack, 0.9);
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
        audioManager.pumpCoins();
        this.tickPresentation(dt);
        return;
    }

    if (this.lymphOpen) {
        this.isLowQuality = this.leanGraphics;
        this.time += dt;
        this.adrenalineActive = false;
        this.isDashing = false;
        this.tickLymph(Math.min(0.05, dt / 1000));
        audioManager.pumpCoins();
        return;
    }

    if (this.star && !audioManager.starLive()) {
        this.star = false;
        this.invulnerabilityTimer = Math.max(this.invulnerabilityTimer, 0.45);
    }

    this.isLowQuality = this.leanGraphics;

    if (this.hitStopTimer > 0) {
        this.hitStopTimer -= (dt / 1000);
        audioManager.pumpCoins();
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
    if (this.star) {
        timeScale = 1;
        this.adrenalineActive = false;
    }
    
    if (this.player.active) {
        const healthRatio = this.star ? 1 : Math.max(0, this.player.health / this.player.maxHealth);
        audioManager.setGameState(this.currentWaveIndex + 1, healthRatio, this.adrenalineActive);
    } else {
        audioManager.setGameState(this.currentWaveIndex + 1, 1, false);
    }
    audioManager.pumpCoins();

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

    if (this.dashCooldownTimer > 0 && !this.star) this.dashCooldownTimer -= (dt / 1000);
    if (this.star) this.dashCooldownTimer = 0; 
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
                    if (this.star) {
                        this.particles.push({
                            id: 'spark', type: EntityType.PARTICLE, pos: { ...e.pos },
                            vel: { x: 0, y: 0 },
                            radius: 10, health: 1, maxHealth: 1, color: '#fff4ea', damage: 0, active: true, ttl: 10,
                        });
                    } else {
                        this.detonateMine(e, stats, 25, { over: onGameOver, lost: onLifeLost });
                    }
                }
            }
        }

        if (this.star || stats.dashDamage > 0) {
            for (const e of this.entities) {
                if ((this.isEnemy(e.type) || e.type === EntityType.BOSS) && e.active && !this.dashStruck.has(e.id)) {
                    if (distSq(this.player.pos, e.pos) < (this.player.radius + e.radius) ** 2) {
                        this.dashStruck.add(e.id);
                        if (this.star && e.type !== EntityType.BOSS) {
                            this.phagocytose(e, stats);
                            continue;
                        }
                        if (e.type === EntityType.BOSS && this.bossMarkUntil > this.time && e.mutation) {
                            e.mutation.dashTimer = Math.max(e.mutation.dashTimer, 0.85);
                            e.mutation.shootTimer = Math.max(e.mutation.shootTimer, 0.7);
                            e.mutation.attack = Math.max(e.mutation.attack, 0.6);
                        }
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

        if (!this.star && this.dashTrailTimer <= 0 && !this.isLowQuality) {
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
          const foeCap = (this.difficultyMods.cap ?? 16) + 4;
          let foes = 0;
          for (const ent of this.entities) {
              if (ent.active && this.isEnemy(ent.type)) foes++;
          }

          if (this.waveTimer < config.duration) {
              this.spawnTimer += safeDt;
              const swarm = this.swarmHere();
              let spawnEvery = config.spawnRate * spawnRateMod * crowd;
              let cap = foeCap;
              if (swarm) {
                  spawnEvery *= 0.4;
                  cap = Math.min(58, Math.round(foeCap * 2.4));
              }
              if (this.spawnTimer >= spawnEvery && foes < cap && this.entities.length < this.maxEntities) {
                this.spawnEnemy(config);
                if (swarm && foes + 1 < cap && foes < cap * 0.55 && this.entities.length < this.maxEntities - 2) {
                    this.spawnEnemy(config);
                }
                this.spawnTimer = 0;
              }
              this.maybeSpawnShiny();
              if (swarm) this.watchLeucogen(dtSeconds);
          } else if (config.hasBoss && !this.bossSpawned) {
              this.spawnBoss(config);
              this.bossSpawned = true;
              if (onBossSpawn) onBossSpawn();
              this.tickPresentation(dt);
              return;
          }
          
          if (!this.isVacuuming) {
              let liveMines = 0;
              for (const ent of this.entities) {
                  if (ent.active && ent.type === EntityType.BIO_MINE) liveMines++;
              }
              const boss = this.chief();
              const organ = Math.floor(Math.max(0, this.currentWaveIndex) / 6);
              if (boss) {
                  this.feedBossBombs(boss, dtSeconds, liveMines);
              } else {
                  this.bossClock = 0;
                  const cleaning = this.waveTimer >= config.duration;
                  if (!cleaning) this.sweepMines = false;
                  else if (!this.sweepMines) {
                      this.sweepMines = true;
                      this.mineClock = Math.min(this.mineClock, 1.05);
                  }
                  const arm = cleaning ? this.currentWaveIndex >= 0 : this.currentWaveIndex >= 1;
                  if (arm) {
                      const cap = cleaning ? (organ >= 1 ? 3 : 2) : (organ >= 2 ? 3 : 2);
                      const interval = cleaning ? 4.2 : Math.max(6.2, 13.2 - organ * 1.7);
                      const grace = organ === 0 ? 8 : 5.2;
                      this.mineClock -= dtSeconds;
                      if ((cleaning || this.waveTimer > grace) && this.mineClock <= 0 && liveMines < cap) {
                          this.mineClock = interval;
                          this.spawnMine('cyan');
                      }
                  }
              }
          }

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

          if (this.waveStartDelay <= 0 && !this.isVacuuming && !this.lymphOpen && this.waveTimer > 1.4 && this.player.active) {
              const nodeLive = this.entities.some(e => e.active && e.type === EntityType.LYMPH_NODE);
              const serumLive = this.entities.some(e => e.active && e.type === EntityType.SERUM);
              if (!nodeLive && !serumLive) {
                  this.nodePass -= dtSeconds;
                  if (this.nodePass <= 0) {
                      this.spawnLymph();
                      this.nodePass = 170 + Math.random() * 60;
                  }
              }
          }

          const enemiesRemaining = this.entities.some(e => e.active && !e.id.startsWith('fuso_echo') && (this.isEnemy(e.type) || e.type === EntityType.BOSS));
          const bossRemaining = !!this.chief();
          
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
              if (this.vacuumingTimer > 6.4 && !this.player.active) {
                  e.active = false;
                  const val = e.value || 1;
                  this.biomass += val;
                  this.sessionStats.biomassCollected += val;
                  audioManager.playCoin(e.pos);
                  continue;
              }
              dnaLeft++;
          }
          
          if (dnaLeft === 0) {
              if (this.star) {
                  this.star = false;
                  audioManager.endStar(true);
                  this.invulnerabilityTimer = Math.max(this.invulnerabilityTimer, 0.45);
              }
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
      if (this.lymphOpen) {
          this.inputVector.x = 0;
          this.inputVector.y = 0;
          this.tickLymph(dtSeconds);
      } else if (this.organ.placePlayer(this.player)) {
          this.isDashing = false;
      } else {
      if (!this.isDashing && !this.organ.charting()) {
          const moveScale = this.adrenalineActive ? tick * 1.5 : tick;
          const pace = this.organ.speedMul * (this.star ? 2.2 : 1);
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
      if (this.star) {
          this.starGhost -= dtSeconds;
          if (this.starGhost <= 0) {
              this.starGhost = this.isLowQuality ? 0.07 : 0.038;
              const hues = ['#39ff14', '#ff2bd6', '#ffe600', '#3dfff3', '#ffffff', '#ff3b3b'];
              this.particles.push({
                  id: 'star_ghost', type: EntityType.PARTICLE,
                  pos: { x: this.player.pos.x, y: this.player.pos.y },
                  vel: { x: 0, y: 0 },
                  radius: this.player.radius,
                  health: 1, maxHealth: 1,
                  color: hues[this.starHue % hues.length],
                  damage: 0, active: true, ttl: 12,
              });
              this.starHue++;
          }
      }
      }

      if (this.leechLock > 0) this.leechLock -= dtSeconds;
      this.regenTimer += safeDt;
      if (this.regenTimer > 11000 && stats.regen > 0) {
        const before = this.player.health;
        this.player.health = Math.min(this.player.health + stats.regen, this.player.maxHealth);
        const got = Math.round(this.player.health - before);
        if (got > 0) this.spawnText(this.player.pos, `+${got}`, '#7dffb0', 18);
        this.regenTimer = 0;
      }
      
      if (!this.star) {
      audioManager.armGun(stats.fireRate * this.organ.fireMul, this.organ.fireMul < 0.6);
      const drum = audioManager.takeDrum();
      if (drum && !this.isDashing && this.waveStartDelay <= 0 && !this.organ.charting()) {
        const target = this.findTarget();
        if (target) {
          this.shoot(target, stats, drum);
        } else if (this.sessionStats.timePlayed > 30 && this.sessionStats.bulletsFired === 0) {
            achievementManager.track('pacifist', 30);
        }
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
              const reach = e.radius + this.player.radius;
              const touching = distSq(this.player.pos, e.pos) < reach * reach;
              if (this.isDashing) {
                  if (touching) this.dashPhased.set(e.id, this.time + 380);
              } else if (this.dashPhased.has(e.id)) {
                  const until = this.dashPhased.get(e.id) ?? 0;
                  if (!touching || this.time > until) this.dashPhased.delete(e.id);
              } else if (touching) {
                  this.damagePlayer(e.damage, e.pos, onGameOver, onLifeLost, stats, true);
                  e.active = false;
              }
          }
      });
    }

    this.syncCoinShower();
    this.clearGrid();
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      if (!e.active) continue;

      if (e.type === EntityType.SERUM) {
          this.updateSerum(e, tick);
          continue;
      }

      if (e.type === EntityType.LEUCOGEN) {
          this.tickPill(e, tick);
          continue;
      }

      if (e.type === EntityType.LYMPH_NODE) {
          this.updateLymph(e, tick);
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
        const isMagnetized = e.type === EntityType.DNA_FRAGMENT && (this.surgeActive || this.isVacuuming || this.coinCascade);
        const flowInfluence = e.type === EntityType.BIO_MINE
          ? MINE_FLOW
          : (e.type === EntityType.ANTIBODY || e.type === EntityType.ACID_POOL || e.type === EntityType.ENEMY_PROJECTILE || isMagnetized) ? 0 : (e.type === EntityType.BOSS ? 0.1 : 1);
        let windScale = 1;
        if (e.type === EntityType.BOSS) windScale = 0.18;
        else if (e.type === EntityType.BIO_MINE) windScale = MINE_WIND;
        else if (e.type === EntityType.ACID_POOL) windScale = e.id.startsWith('bile_') ? 0.45 : 0;
        else if (e.type === EntityType.ANTIBODY || e.type === EntityType.ENEMY_PROJECTILE) windScale = 0.8;
        else if (e.type === EntityType.ORGAN_PICKUP) windScale = 1.15;
        else if (e.type === EntityType.DNA_FRAGMENT && this.coinCascade) windScale = 0;
        else if (e.type === EntityType.PLAYER) windScale = 0;

        if (e.type === EntityType.DNA_FRAGMENT && this.coinCascade && e.angle !== 1) {
            const due = (e.orbitOffset ?? 0) > 0 && (e.orbitOffset ?? 0) <= this.time;
            if (due) {
                e.angle = 1;
                const dx = this.player.pos.x - e.pos.x;
                const dy = this.player.pos.y - e.pos.y;
                const dist = Math.hypot(dx, dy);
                // A velocidade fica guardada no offset: o tempo do turno já passou.
                // Longe, cruza em ~11 quadros. Perto, não fica mais lenta que o ímã.
                e.orbitOffset = Math.max(28, dist / 11);
                e.vel.x = 0;
                e.vel.y = 0;
            } else {
                e.vel.x *= 0.82;
                e.vel.y *= 0.82;
            }
        }

        e.pos.x += (e.vel.x + (this.bloodFlow.x * (1 - drag) * flowInfluence) + this.organ.wind.x * windScale) * tick;
        e.pos.y += (e.vel.y + (this.bloodFlow.y * (1 - drag) * flowInfluence) + this.organ.wind.y * windScale) * tick;

        // VARIETY INJECTION: ZIG-ZAG FUNGI
        if (e.type === EntityType.FUNGI && this.player.active && !e.id.startsWith('shiny_')) {
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

        if (e.type === EntityType.VIRUS && !e.id.startsWith('shiny_') && this.player.active && (e.stun ?? 0) <= 0 && e.pos.x < CANVAS_WIDTH + 100) {
            if (e.shootTimer !== undefined) {
                e.shootTimer -= dtSeconds;
                if (e.shootTimer <= 0) {
                    const lead = this.isDashing ? 4 : 12;
                    const seed = e.intent ?? 0.5;
                    let aimX = this.player.pos.x + this.player.vel.x * lead;
                    let aimY = this.player.pos.y + this.player.vel.y * lead;
                    if (seed < 0.33) aimY -= 84;
                    else if (seed < 0.66) aimY += 84;
                    const angle = Math.atan2(aimY - e.pos.y, aimX - e.pos.x);
                    const speed = 8.2;
                    this.entities.push({
                        id: `eproj_${this.shotSerial++}`, type: EntityType.ENEMY_PROJECTILE,
                        pos: { ...e.pos },
                        vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
                        radius: 12, health: 1, maxHealth: 1, color: this.colors.ENEMY_PROJECTILE,
                        damage: Math.max(6, e.damage * 0.36), active: true, drag: 0
                    });

                    e.shootTimer = 3.3 + seed * 0.55; 
                    // VARIETY: SOUND CALL FOR ENEMY SHOOT
                    audioManager.playEnemyShoot(e.pos);
                }
            }
        }
        
        // VARIETY INJECTION: TRACKING PROJECTILES (WEAK HOMING)
        if (e.type === EntityType.ENEMY_PROJECTILE && !e.id.startsWith('echo_') && this.player.active && !this.isDashing && !this.dashPhased.has(e.id)) {
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
            const leash = this.bossLeash;
            if (leash && this.time <= leash.until) {
                const lx = e.pos.x - leash.x;
                const ly = e.pos.y - leash.y;
                if (lx * lx + ly * ly < leash.reach * leash.reach) {
                    e.vel.x *= 0.93;
                    e.vel.y *= 0.93;
                }
            }
        }

        if (e.type === EntityType.BIO_MINE) {
            this.settleMine(e);
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

    if (this.player.active) this.noteSquad();
    let coinSparks = 0;
    for (const e of this.entities) {
      if (!e.active) continue;

      if (e.type === EntityType.ANTIBODY || e.type === EntityType.ORBITAL) {
         if (this.star) continue;
         const candidates = this.getPotentialCollisions(e);
         
         for (const other of candidates) {
           if (!other.active) continue;

           if (other.type === EntityType.BIO_MINE && e.type === EntityType.ANTIBODY) {
               if (distSq(e.pos, other.pos) < (e.radius + other.radius * 2.5)**2) {
                   e.active = false;
                   other.active = false;
                   this.detonateMine(other, stats, 800, { over: onGameOver, lost: onLifeLost });
                   break;
               }
           }

           if ((this.isEnemy(other.type) || other.type === EntityType.BOSS) && !other.id.startsWith('fuso_echo')) {
             if (e.type === EntityType.ANTIBODY && (other.reflect ?? 0) > 0) {
                 if (distSq(e.pos, other.pos) < (e.radius + other.radius) * (e.radius + other.radius)) {
                     this.reflectShot(e, other);
                     break;
                 }
             }
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
        if ((e.reflect ?? 0) > 0) e.reflect = Math.max(0, (e.reflect ?? 0) - dtSeconds);
        if (e.id.startsWith('shiny_')) this.tickShiny(e, dtSeconds);
        if (this.player.active && e.active) {
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

                if (!e.id.startsWith('shiny_') && e.type !== EntityType.BOSS && (e.stun ?? 0) <= 0) {
                    const aim = this.foeAim(e);
                    let ax = aim.x - e.pos.x;
                    let ay = aim.y - e.pos.y;
                    let aMag = Math.hypot(ax, ay);
                    if (aMag < 12) {
                        ax = dx;
                        ay = dy;
                        aMag = dMag;
                    }
                    e.vel.x += (ax / aMag) * speed * tick;
                    e.vel.y += (ay / aMag) * speed * tick;
                }
              }

              const pSum = e.radius + this.player.radius;
              if (dMag < pSum * 0.8 && (e.stun ?? 0) <= 0) {
                 if (this.star && e.type !== EntityType.BOSS) {
                     this.phagocytose(e, stats);
                 } else if (this.invulnerabilityTimer <= 0 && !this.isDashing) {
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
        const pad = 48;
        if (e.pos.x < pad) { e.pos.x = pad; if (e.vel.x < 0) e.vel.x *= -0.45; }
        if (e.pos.x > CANVAS_WIDTH - pad) { e.pos.x = CANVAS_WIDTH - pad; if (e.vel.x > 0) e.vel.x *= -0.45; }
        if (e.pos.y < pad) { e.pos.y = pad; if (e.vel.y < 0) e.vel.y *= -0.45; }
        if (e.pos.y > CANVAS_HEIGHT - pad) { e.pos.y = CANVAS_HEIGHT - pad; if (e.vel.y > 0) e.vel.y *= -0.45; }
        if ((e.ttl ?? 0) > 0) e.ttl = Math.max(0, (e.ttl ?? 0) - dtSeconds);
        if (this.player.active) {
          const dx = this.player.pos.x - e.pos.x;
          const dy = this.player.pos.y - e.pos.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          const reeling = e.angle === 1;
          const airborne = (e.ttl ?? 0) > 0;
          const touching = !airborne && dist < this.player.radius + e.radius + 10;
          const magnetReach = stats.magnetRadius * (this.star ? 1.15 : 1);
          const magnet = !airborne && !this.coinCascade && dist < magnetReach;
          if (!airborne && (magnet || reeling || touching)) {
            const speed = reeling ? Math.max(28, e.orbitOffset || 28) : (this.star ? 54 : 28);
            // Sem o teto, o vácuo do fim da onda passa do corpo e a moeda
            // fica orbitando colada no personagem até ele se mexer.
            const step = Math.min(dist, speed * tick);
            if (dist > 0.001) {
                e.pos.x += (dx / dist) * step;
                e.pos.y += (dy / dist) * step;
            }
            if (reeling) this.coinTrail(e);

            if (dist - step < this.player.radius + e.radius) {
              e.active = false;
              const energyGain = e.damage > 0 ? e.damage : (e.isElite ? 12 : 3);
              this.energy = Math.min(this.energy + energyGain, stats.maxEnergy);
              const val = (e.value || 1);
              this.biomass += val; 
              this.sessionStats.biomassCollected += val;
              achievementManager.track('biomass_10k', val);
              if (this.biomass >= 3000) achievementManager.track('rich', 3000);
              audioManager.playCoin(e.pos);
              if (this.time - this.coinRingAt > 90 && this.particles.length < 180) {
                  this.coinRingAt = this.time;
                  this.particles.push({
                      id: 'ring',
                      type: EntityType.PARTICLE,
                      pos: { x: this.player.pos.x, y: this.player.pos.y },
                      vel: { x: 0, y: 0 },
                      radius: this.player.radius + 8,
                      health: 1, maxHealth: 10,
                      color: '#ffe29a',
                      damage: 0, active: true, ttl: 10,
                  });
              }
              if (!this.isLowQuality && coinSparks < 2 && this.particles.length < 120) {
                  coinSparks++;
                  for (let k = 0; k < 3; k++) {
                      const a = (k / 3) * Math.PI * 2;
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
      } else if (p.id === 'ring') {
          p.ttl = (p.ttl || 0) - 1;
          if ((p.ttl || 0) <= 0) continue;
      } else if (p.id === 'coin_trail') {
          p.pos.x += p.vel.x;
          p.pos.y += p.vel.y;
          p.vel.x *= 0.9;
          p.vel.y *= 0.9;
          p.ttl = (p.ttl || 0) - 1;
          if ((p.ttl || 0) <= 0) continue;
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
    this.hurtKickX *= 0.86;
    this.hurtKickY *= 0.86;
    const hurtWas = this.hurt;
    const step = dt / 1000;
    this.hurt = Math.max(0, this.hurt - step * 1.35);
    this.hurtFlash = Math.max(0, this.hurtFlash - step);
    this.hurtBloom = Math.max(0, this.hurtBloom - step);
    if (hurtWas > 0.22 && this.hurt <= 0.22 && this.hurtSerious) {
        this.hurtSerious = false;
        this.hurtEase = 0.55;
        audioManager.playHurtClear(this.player.pos);
    }
    this.hurtEase = Math.max(0, this.hurtEase - step * 1.6);
    this.lifeCut = Math.max(0, this.lifeCut - step * 0.46);
    this.lifeRumble *= 0.972;
    if (this.lifeRumble < 0.35) this.lifeRumble = 0;
    this.compactInactive(this.entities);
    this.forgetPhased();
  }

  private noteSquad() {
      let n = 0;
      let above = 0;
      let below = 0;
      let behind = 0;
      const px = this.player.pos.x;
      const py = this.player.pos.y;
      for (let i = 0; i < this.entities.length; i++) {
          const e = this.entities[i];
          if (!e.active || e.id.startsWith('shiny_') || !this.isEnemy(e.type)) continue;
          n++;
          if (e.pos.y < py - 48) above++;
          else if (e.pos.y > py + 48) below++;
          if (e.pos.x < px - 36) behind++;
      }
      this.squad.n = n;
      this.squad.above = above;
      this.squad.below = below;
      this.squad.behind = behind;
  }

  private park(x: number, y: number): Vector2 {
      const pad = 46;
      return {
          x: Math.max(pad, Math.min(CANVAS_WIDTH - pad, x)),
          y: Math.max(pad, Math.min(CANVAS_HEIGHT - pad, y)),
      };
  }

  // O passo (velocidade, fluxo, zigue-zague) fica. Muda o ponto que ele busca.
  private foeAim(e: Entity): Vector2 {
      const p = this.player.pos;
      const seed = e.intent ?? 0.5;
      const dist = Math.hypot(p.x - e.pos.x, p.y - e.pos.y);
      if (dist < e.radius + this.player.radius + 30) return { x: p.x, y: p.y };
      if (e.type === EntityType.BACTERIA) return this.bacteriaAim(e, seed, dist);
      if (e.type === EntityType.VIRUS) return this.virusAim(e, seed, dist);
      if (e.type === EntityType.FUNGI) return this.fungiAim(e, seed, dist);
      return this.parasiteAim(e, seed, dist);
  }

  private bacteriaAim(e: Entity, seed: number, dist: number): Vector2 {
      const p = this.player.pos;
      let role: 'high' | 'low' | 'back' | 'face' =
          seed < 0.3 ? 'high' : seed < 0.58 ? 'low' : seed < 0.84 ? 'back' : 'face';
      if (role === 'face' && this.squad.behind === 0 && this.squad.n >= 4 && seed > 0.9) role = 'back';
      if (role === 'back' && e.pos.x > p.x + 48 && this.squad.behind >= 3) role = 'face';
      if (role === 'face') return this.park(p.x, p.y + (seed - 0.92) * 90);
      if (role === 'high' || role === 'low') {
          const sign = role === 'high' ? -1 : 1;
          const arc = dist < 260 ? 28 : 168;
          return this.park(p.x + (dist < 260 ? 0 : 36), p.y + sign * arc);
      }
      const sign = seed < 0.7 ? -1 : 1;
      if (e.pos.x < p.x - 16) return this.park(p.x - 12, p.y + sign * 22);
      return this.park(Math.max(48, p.x - 118), p.y + sign * 172);
  }

  private virusAim(e: Entity, seed: number, dist: number): Vector2 {
      const p = this.player.pos;
      const lane = seed < 0.33 ? CANVAS_HEIGHT * 0.2 : seed < 0.66 ? CANVAS_HEIGHT * 0.8 : p.y;
      const blend = Math.min(1, Math.max(0, (dist - 150) / 460));
      let y = p.y * (1 - blend) + lane * blend;
      let x = p.x;
      if (seed >= 0.84 && e.pos.x > p.x - 8 && this.squad.behind < 3) {
          x = Math.max(48, p.x - 108);
          y = p.y + (seed < 0.92 ? -1 : 1) * 156 * Math.min(1, dist / 280);
      } else if (e.pos.x < p.x - 24) {
          x = p.x - 20;
          y = p.y;
      }
      return this.park(x, y);
  }

  private fungiAim(e: Entity, seed: number, dist: number): Vector2 {
      const p = this.player.pos;
      const sign = seed < 0.5 ? -1 : 1;
      if (Math.abs(e.pos.x - p.x) < 100) return { x: p.x, y: p.y };
      if (seed >= 0.82 && e.pos.x > p.x && this.squad.behind < 3) {
          return this.park(Math.max(48, p.x - 96), p.y + sign * 158);
      }
      const arc = dist < 240 ? 42 : 124;
      return this.park(p.x + 20, p.y + sign * arc);
  }

  private parasiteAim(e: Entity, seed: number, dist: number): Vector2 {
      const p = this.player.pos;
      const ix = p.x + this.player.vel.x * 12;
      const iy = p.y + this.player.vel.y * 12;
      if (seed < 0.4) return this.park(ix, iy);
      if (seed < 0.7) {
          if (dist > 210) return this.park(p.x + 28, p.y - 150);
          return this.park(ix, iy);
      }
      if (e.pos.x > p.x + 36 && this.squad.behind < 4) {
          return this.park(Math.max(48, p.x - 72), p.y + 148);
      }
      return this.park(ix, p.y + (seed - 0.85) * 40);
  }

  // Empurrão de tiro não abre distância. Senão a rajada estaciona a onda na borda
  // e o player ganha a luta sem sair do lugar.
  private flinch(target: Entity) {
      if (target.type === EntityType.BOSS || target.type === EntityType.VIRUS) {
          target.pos.x += 0.1;
          return;
      }
      const dx = target.pos.x - this.player.pos.x;
      const dy = target.pos.y - this.player.pos.y;
      const d = Math.hypot(dx, dy) || 1;
      const side = (target.intent ?? 0) < 0.5 ? 1 : -1;
      let mag = 0.95;
      if (target.type === EntityType.PARASITE) mag = 0.2;
      else if (target.type === EntityType.FUNGI) mag = 0.55;
      target.pos.x += (-dy / d) * side * mag;
      target.pos.y += (dx / d) * side * mag;
  }

  private forgetPhased() {
      if (this.dashPhased.size === 0) return;
      for (const id of this.dashPhased.keys()) {
          let live = false;
          for (let i = 0; i < this.entities.length; i++) {
              const e = this.entities[i];
              if (e.active && e.id === id) { live = true; break; }
          }
          if (!live) this.dashPhased.delete(id);
      }
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

  private spawnLymph() {
      const first = this.nodeVisits === 0 && this.nodeTariff < 1.05;
      const y = first
          ? Math.max(160, Math.min(CANVAS_HEIGHT - 160, this.player.pos.y + (Math.random() - 0.5) * 90))
          : 150 + Math.random() * (CANVAS_HEIGHT - 300);
      this.entities.push({
          id: `lymphpass_${Date.now()}`,
          type: EntityType.LYMPH_NODE,
          pos: { x: CANVAS_WIDTH + 90, y },
          vel: { x: 0, y: 0 },
          radius: 42,
          health: 1,
          maxHealth: 1,
          color: '#f0b7a8',
          damage: 72,
          active: true,
          value: y,
          orbitOffset: Math.random() * Math.PI * 2,
      });
  }

  private updateLymph(e: Entity, tick: number) {
      const anchor = e.value || e.pos.y;
      const amp = e.damage || 0;
      const phase = this.time / 260 + (e.orbitOffset || 0);
      const firstPass = this.nodeVisits === 0 && this.nodeTariff < 1.05;
      e.pos.x -= (firstPass ? 1.65 : 3.15) * tick;
      e.pos.y = anchor + Math.sin(phase) * amp + Math.sin(this.time / 130 + 1.4) * amp * 0.22;
      if (!this.isLowQuality && Math.random() < 0.55) {
          this.particles.push({
              id: 'lymph_wake',
              type: EntityType.PARTICLE,
              pos: { x: e.pos.x + 28 + Math.random() * 18, y: e.pos.y + (Math.random() - 0.5) * 28 },
              vel: { x: 1.1 + Math.random() * 0.8, y: (Math.random() - 0.5) * 0.45 },
              radius: 1.8 + Math.random() * 2.4,
              health: 1, maxHealth: 1,
              color: Math.random() < 0.5 ? '#ffd0c4' : '#fff1ea',
              damage: 0, active: true, ttl: 18,
          });
      }
      if (this.player.active && !this.lymphOpen) {
          const reach = this.player.radius + e.radius * 0.82;
          if (distSq(this.player.pos, e.pos) < reach * reach) {
              e.active = false;
              this.openLymph();
              return;
          }
      }
      if (e.pos.x < -160) e.active = false;
  }

  private drawLymphPass(e: Entity) {
      const x = e.pos.x;
      const y = e.pos.y;
      const beat = Math.sin(this.time / 150);
      const pulse = 1 + beat * 0.07;
      const squash = 1 + beat * 0.08;
      const rock = Math.sin(this.time / 240 + (e.orbitOffset || 0)) * 0.22;
      this.ctx.save();
      this.ctx.translate(x, y);
      this.ctx.rotate(rock);
      this.ctx.scale(pulse * squash, pulse * (2 - squash));
      if (!this.isLowQuality) {
          this.ctx.save();
          this.ctx.globalCompositeOperation = 'screen';
          this.drawGlow('#ffb0b8', 64, 0.4, 0.12, 0.08);
          this.ctx.restore();
      }
      this.ctx.lineCap = 'round';
      this.ctx.strokeStyle = '#e8c4c6';
      this.ctx.lineWidth = 5.5;
      this.ctx.beginPath();
      const wag = Math.sin(this.time / 160) * 7;
      this.ctx.moveTo(36, 8);
      this.ctx.bezierCurveTo(54, -8 + wag, 74, 16 - wag, 96, 2 + wag * 0.4);
      this.ctx.stroke();
      this.ctx.strokeStyle = 'rgba(255, 240, 232, 0.9)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(36, 8);
      this.ctx.bezierCurveTo(54, -8 + wag, 74, 16 - wag, 96, 2 + wag * 0.4);
      this.ctx.stroke();
      const bean = () => {
          this.ctx.beginPath();
          this.ctx.moveTo(10, -30);
          this.ctx.bezierCurveTo(42, -40, 50, -8, 30, 4);
          this.ctx.bezierCurveTo(16, 12, 24, 6, 34, 18);
          this.ctx.bezierCurveTo(48, 36, 28, 48, 2, 40);
          this.ctx.bezierCurveTo(-38, 48, -54, 16, -46, -6);
          this.ctx.bezierCurveTo(-40, -36, -14, -42, 10, -30);
          this.ctx.closePath();
      };
      const flesh = this.ctx.createRadialGradient(-10, -8, 8, 0, 4, 54);
      flesh.addColorStop(0, '#fff6f0');
      flesh.addColorStop(0.42, '#f4b8aa');
      flesh.addColorStop(1, '#c25660');
      this.ctx.fillStyle = flesh;
      this.ctx.strokeStyle = 'rgba(92, 28, 36, 0.78)';
      this.ctx.lineWidth = 3.2;
      bean();
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.save();
      bean();
      this.ctx.clip();
      this.ctx.fillStyle = 'rgba(255, 232, 220, 0.92)';
      this.ctx.beginPath();
      this.ctx.arc(-10, -8, 12, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.arc(6, 14, 8, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = 'rgba(255, 250, 244, 0.95)';
      this.ctx.beginPath();
      this.ctx.arc(-12, -10, 4.2, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = 'rgba(110, 32, 44, 0.55)';
      const dots = this.isLowQuality ? 6 : 11;
      for (let i = 0; i < dots; i++) {
          const spin = i % 2 ? 1 : -1;
          const a = spin * this.time / (420 + (i % 3) * 80) + (i / dots) * Math.PI * 2;
          const ring = 12 + (i % 4) * 6;
          const bob = 1 + Math.sin(this.time / 180 + i) * 0.18;
          this.ctx.beginPath();
          this.ctx.arc(Math.cos(a) * ring * 0.78, Math.sin(a) * ring * 0.5, (i % 3 === 0 ? 3.1 : 1.8) * bob, 0, Math.PI * 2);
          this.ctx.fill();
      }
      this.ctx.restore();
      this.ctx.strokeStyle = 'rgba(255, 236, 220, 0.85)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(28, 10, 7.5, 0.4 + Math.sin(this.time / 200) * 0.2, 2.6);
      this.ctx.stroke();
      const gleam = (this.time / 420) % 1;
      this.ctx.fillStyle = `rgba(255, 252, 244, ${0.35 + gleam * 0.4})`;
      this.ctx.beginPath();
      this.ctx.ellipse(-18 + gleam * 36, -16 + Math.sin(gleam * Math.PI) * 10, 8, 4, -0.4, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();

      if (!this.isLowQuality) {
          this.ctx.save();
          for (let i = 1; i <= 4; i++) {
              const drift = Math.sin(this.time / 180 + i) * 7;
              this.ctx.globalAlpha = 0.34 - i * 0.07;
              this.ctx.fillStyle = i % 2 ? '#ffd4cc' : '#fff4ee';
              this.ctx.beginPath();
              this.ctx.arc(x + i * 24, y + drift, 8 - i, 0, Math.PI * 2);
              this.ctx.fill();
          }
          this.ctx.restore();
      }

      const tag = this.t('NODE_TITLE');
      const price = this.nodePrice();
      const dna = this.language === 'ES' ? 'ADN' : 'DNA';
      const fare = `${price} ${dna}`;
      const climb = this.nodeVisits > 0 || this.nodeTariff > 1.03;
      this.ctx.save();
      this.ctx.font = '700 15px "Chakra Petch", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      const plateW = Math.max(108, this.ctx.measureText(tag).width + 28, this.ctx.measureText(fare).width + 28);
      const ly = y + 62;
      const plateH = 40;
      this.ctx.fillStyle = 'rgba(42, 12, 16, 0.9)';
      this.ctx.beginPath();
      this.ctx.roundRect(x - plateW / 2, ly - 16, plateW, plateH, 12);
      this.ctx.fill();
      this.ctx.strokeStyle = climb ? 'rgba(255, 186, 120, 0.9)' : 'rgba(255, 214, 176, 0.75)';
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();
      this.ctx.fillStyle = '#ffe8d6';
      this.ctx.fillText(tag, x, ly - 2);
      this.ctx.font = '700 16px "Chakra Petch", sans-serif';
      this.ctx.fillStyle = '#ffe08a';
      this.ctx.fillText(fare, x, ly + 16);
      this.ctx.restore();
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
      if (e.id.startsWith('fuso_echo')) continue;
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
      const carpet = e.id.startsWith('dna_shiny');
      const gold = carpet ? '#fff1a8' : e.isElite ? '#ffe08a' : '#ffd56a';
      const reeling = e.angle === 1;
      const queued = !reeling && (e.orbitOffset ?? 0) > 0;
      this.ctx.save();
      this.ctx.fillStyle = gold;
      this.ctx.globalAlpha = carpet ? 0.62 : reeling ? 0.5 : queued ? 0.38 : 0.28;
      this.ctx.beginPath();
      this.ctx.arc(x, y, r * (reeling ? 2.05 : 1.7), 0, Math.PI * 2);
      this.ctx.fill();
      if (reeling) {
          const dx = e.pos.x - this.player.pos.x;
          const dy = e.pos.y - this.player.pos.y;
          const mag = Math.hypot(dx, dy) || 1;
          const tail = Math.min(36, mag * 0.45);
          this.ctx.globalAlpha = 0.55;
          this.ctx.strokeStyle = '#fff4c8';
          this.ctx.lineWidth = 2.4;
          this.ctx.lineCap = 'round';
          this.ctx.beginPath();
          this.ctx.moveTo(x, y);
          this.ctx.lineTo(x + (dx / mag) * tail, y + (dy / mag) * tail);
          this.ctx.stroke();
      }
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
      if (!reeling) {
          const wink = Math.pow(Math.max(0, Math.sin(this.time / 420 + e.pos.x * 0.02)), 8);
          if (wink > 0.2) {
              this.ctx.globalAlpha = wink;
              this.ctx.fillStyle = '#fffef8';
              this.ctx.beginPath();
              this.ctx.arc(-r * 0.32, -r * 0.16, r * 0.09, 0, Math.PI * 2);
              this.ctx.fill();
          }
      }
      if (carpet) {
          this.ctx.globalAlpha = 0.85;
          this.ctx.strokeStyle = '#fff8d4';
          this.ctx.lineWidth = 1.4;
          this.ctx.beginPath();
          this.ctx.arc(0, 0, r * 1.18, this.time / 300, this.time / 300 + 1.4);
          this.ctx.stroke();
      }
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

  private drawPill(e: Entity) {
      const w = 52;
      const h = 24;
      this.ctx.save();
      this.ctx.translate(e.pos.x, e.pos.y);
      this.ctx.rotate(this.time / 170);
      if (!this.isLowQuality) {
          this.ctx.shadowColor = 'rgba(255, 36, 48, 0.85)';
          this.ctx.shadowBlur = 18;
      }
      this.ctx.beginPath();
      this.ctx.roundRect(-w / 2, -h / 2, w, h, h / 2);
      this.ctx.fillStyle = '#fff7f4';
      this.ctx.fill();
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.rect(-w / 2, -h / 2, w / 2, h);
      this.ctx.clip();
      this.ctx.beginPath();
      this.ctx.roundRect(-w / 2, -h / 2, w, h, h / 2);
      this.ctx.fillStyle = '#ff2430';
      this.ctx.fill();
      this.ctx.restore();
      this.ctx.shadowBlur = 0;
      this.ctx.strokeStyle = '#2a0c10';
      this.ctx.lineWidth = 2.4;
      this.ctx.beginPath();
      this.ctx.roundRect(-w / 2, -h / 2, w, h, h / 2);
      this.ctx.stroke();
      this.ctx.beginPath();
      this.ctx.moveTo(0, -h / 2 + 3);
      this.ctx.lineTo(0, h / 2 - 3);
      this.ctx.strokeStyle = 'rgba(40, 10, 14, 0.4)';
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.62)';
      this.ctx.beginPath();
      this.ctx.ellipse(-9, -4, 8, 3.2, -0.45, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();

      this.ctx.save();
      this.ctx.font = '700 15px "Chakra Petch", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.lineWidth = 4;
      this.ctx.strokeStyle = 'rgba(40, 8, 12, 0.85)';
      this.ctx.fillStyle = '#fff4ea';
      this.ctx.strokeText(this.t('LEUCOGEN'), e.pos.x, e.pos.y - 32);
      this.ctx.fillText(this.t('LEUCOGEN'), e.pos.x, e.pos.y - 32);
      this.ctx.restore();
  }

  private drawVital() {
      if (!this.player.active) return;
      const neon = ['#39ff14', '#ff2bd6', '#ffe600', '#3dfff3', '#ffffff', '#ff3b3b'];
      const neonColor = neon[Math.floor(this.time / 46) % neon.length];
      if (this.star && !this.isLowQuality) {
          this.ctx.globalCompositeOperation = 'screen';
          this.drawGlow(neonColor, this.player.radius * 3.6, 0.95, null, 0.045, this.player.pos.x, this.player.pos.y);
      } else if (!this.isLowQuality) {
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
      const bruised = !this.star && this.hurtFlash > 0.02;
      const impact = bruised && this.hurtBloom > 0.012;
      const pulse = Math.floor(this.time / 42) % 2 === 0;
      this.ctx.fillStyle = this.star
          ? neonColor
          : impact
          ? '#fff6f6'
          : bruised
          ? (pulse ? '#ff1c30' : '#ff5562')
          : burning
          ? (Math.floor(this.time / 70) % 2 === 0 ? '#e7d4ff' : '#ffffff')
          : (this.isDashing || this.invulnerabilityTimer > 0 ? this.colors.PLAYER_CORE : this.colors.PLAYER);
      if (!this.star && !bruised && this.invulnerabilityTimer > 0 && Math.floor(this.time / 100) % 2 === 0) {
          this.ctx.globalAlpha = 0.5;
      }
      const dent = !this.isDashing && bruised ? Math.min(0.32, this.hurt * 0.5) : 0;
      const wobbleX = this.isDashing || bruised ? 0 : Math.cos(this.time / 150) * 3;
      const wobbleY = this.isDashing || bruised ? 0 : Math.sin(this.time / 150) * 3;
      const rx = this.isDashing ? this.player.radius * 2.0 : (this.player.radius + wobbleX) * (1 - dent);
      const ry = this.isDashing ? this.player.radius * 0.5 : (this.player.radius + wobbleY) * (1 + dent * 0.72);
      this.ctx.save();
      this.ctx.translate(this.player.pos.x, this.player.pos.y);
      if (this.isDashing) {
          this.ctx.rotate(Math.atan2(this.player.vel.y, this.player.vel.x));
      } else if (dent > 0.02) {
          this.ctx.rotate(this.hurtAngle);
      }
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, Math.max(4, rx), Math.max(4, ry), 0, 0, Math.PI * 2);
      this.ctx.fill();
      if (bruised && !impact) {
          this.ctx.strokeStyle = 'rgba(255, 236, 236, 0.9)';
          this.ctx.lineWidth = 2.6;
          this.ctx.stroke();
      }
      this.ctx.fillStyle = this.star ? '#ffffff' : impact ? '#ffffff' : bruised ? '#ffe8ea' : this.colors.PLAYER_CORE;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, this.player.radius * 0.4 * (impact ? 0.72 : 1), 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
      if (this.star) {
          this.ctx.strokeStyle = neon[(Math.floor(this.time / 46) + 2) % neon.length];
          this.ctx.lineWidth = 3;
          this.ctx.beginPath();
          this.ctx.arc(this.player.pos.x, this.player.pos.y, this.player.radius + 12 + Math.sin(this.time / 40) * 3, 0, Math.PI * 2);
          this.ctx.stroke();
      }
      if (this.hurt > 0.12) {
          const a = Math.min(1, this.hurt);
          this.ctx.strokeStyle = `rgba(255, 244, 242, ${0.9 * a})`;
          this.ctx.lineWidth = 4.5;
          this.ctx.beginPath();
          this.ctx.arc(this.player.pos.x, this.player.pos.y, this.player.radius + 8, this.hurtAngle - 0.85, this.hurtAngle + 0.85);
          this.ctx.stroke();
          this.ctx.strokeStyle = `rgba(255, 36, 52, ${0.95 * a})`;
          this.ctx.lineWidth = 2.2;
          this.ctx.beginPath();
          this.ctx.arc(this.player.pos.x, this.player.pos.y, this.player.radius + 14, this.hurtAngle - 0.45, this.hurtAngle + 0.45);
          this.ctx.stroke();
      }
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

  public recoverDraw() {
      this.paintReset();
      this.ctx.fillStyle = this.bgFill;
      this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  private paintReset() {
      const ctx = this.ctx as CanvasRenderingContext2D & { reset?: () => void };
      if (ctx.reset) {
          ctx.reset();
          return;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;
  }

  public draw() {
    if (this.organ.charting()) this.organ.placePlayer(this.player);
    const ride = this.organ.riding();
    this.paintReset();
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
    
    if (this.shakeIntensity > 0 || this.lifeRumble > 0.4 || Math.abs(this.hurtKickX) > 0.2 || Math.abs(this.hurtKickY) > 0.2) {
      const amp = this.shakeIntensity + this.lifeRumble;
      const sx = (Math.random() - 0.5) * amp + this.hurtKickX;
      const sy = (Math.random() - 0.5) * amp + this.hurtKickY;
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

    if (this.star && !this.isLowQuality) {
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'screen';
        const glow = this.ctx.createRadialGradient(this.player.pos.x, this.player.pos.y, 18, this.player.pos.x, this.player.pos.y, 320);
        glow.addColorStop(0, 'rgba(255, 250, 210, 0.2)');
        glow.addColorStop(0.45, 'rgba(255, 50, 140, 0.08)');
        glow.addColorStop(1, 'rgba(255, 40, 160, 0)');
        this.ctx.fillStyle = glow;
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
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
          const maxLife = Math.max(1, p.maxHealth > 1 ? p.maxHealth : (p.id === 'mine_expl' ? 25 : 20));
          const life = Math.max(0, p.ttl || 0);
          const progress = Math.max(0, Math.min(1, 1 - (life / maxLife)));
          const isDashExpl = p.id === 'mine_expl_dash';
          const radius = Math.max(0, p.radius * (1 - Math.pow(1 - progress, 3)));
          this.ctx.beginPath();
          this.ctx.arc(p.pos.x, p.pos.y, Math.max(0.01, radius), 0, Math.PI*2);
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
          this.ctx.arc(p.pos.x, p.pos.y, Math.max(0.01, radius * 0.5 * (1 - progress)), 0, Math.PI * 2);
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
      } else if (p.id === 'membrane') {
          const life = Math.max(0, (p.ttl || 0) / 18);
          this.ctx.save();
          this.ctx.translate(p.pos.x, p.pos.y);
          this.ctx.rotate(Math.atan2(p.vel.y, p.vel.x));
          this.ctx.globalAlpha = Math.min(1, life * 1.35);
          this.ctx.fillStyle = p.color;
          this.ctx.beginPath();
          this.ctx.ellipse(0, 0, p.radius * 1.7, p.radius * 0.42, 0, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.restore();
      } else if (p.id === 'star_ghost') {
          this.ctx.save();
          this.ctx.globalCompositeOperation = 'screen';
          this.ctx.globalAlpha = Math.max(0, (p.ttl || 0) / 14) * 0.55;
          this.ctx.fillStyle = p.color;
          this.ctx.beginPath();
          this.ctx.ellipse(p.pos.x, p.pos.y, p.radius * 1.05, p.radius * 0.9, 0, 0, Math.PI * 2);
          this.ctx.fill();
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
            if (e.id.startsWith('echo_')) {
                this.ctx.save();
                this.ctx.globalCompositeOperation = 'screen';
                this.ctx.fillStyle = 'rgba(214, 255, 58, 0.45)';
                this.ctx.beginPath();
                this.ctx.arc(e.pos.x, e.pos.y, e.radius * 2.1, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
            }
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
            const mineKind = this.mineKind(e);
            const body = (e.hitFlash && e.hitFlash > 0) ? '#ffffff' : e.color;
            const spark = 0.55 + Math.sin(this.time / 90) * 0.45;
            const fuse = mineKind === 'bile' ? '#243010' : mineKind === 'leash' ? '#f3e8ff' : mineKind === 'mark' ? '#fff6c8' : '#ffd650';

            if (!this.isLowQuality) {
                this.ctx.globalCompositeOperation = 'screen';
                this.drawGlow(e.color, r * 2, 0.5, null, 0.1, 0, r * 0.1);
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
            this.ctx.fillStyle = fuse;
            this.ctx.beginPath();
            this.ctx.arc(0, -r * 1.48, sparkR, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = '#10282c';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            if (mineKind !== 'bile') {
                this.ctx.fillStyle = '#fffaf0';
                this.ctx.beginPath();
                this.ctx.arc(0, -r * 1.48, sparkR * 0.4, 0, Math.PI * 2);
                this.ctx.fill();
            }

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
            if (mineKind === 'leash') {
                this.ctx.beginPath();
                this.ctx.arc(0, r * 0.12, r * 0.46, 0.4, Math.PI * 2 - 0.2);
                this.ctx.stroke();
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fillRect(r * 0.28, r * 0.02, r * 0.22, r * 0.2);
            } else if (mineKind === 'bile') {
                this.ctx.moveTo(0, r * 0.12 - arm);
                this.ctx.bezierCurveTo(arm * 0.8, r * 0.12, arm * 0.35, r * 0.12 + arm, 0, r * 0.12 + arm * 1.15);
                this.ctx.bezierCurveTo(-arm * 0.35, r * 0.12 + arm, -arm * 0.8, r * 0.12, 0, r * 0.12 - arm);
            } else if (mineKind === 'mark') {
                this.ctx.beginPath();
                this.ctx.arc(0, r * 0.1, r * 0.34, 0, Math.PI * 1.4);
                this.ctx.stroke();
                this.ctx.beginPath();
                this.ctx.moveTo(r * 0.22, r * 0.02);
                this.ctx.lineTo(r * 0.02, r * 0.08);
                this.ctx.lineTo(r * 0.1, r * 0.28);
                this.ctx.stroke();
            } else {
                this.ctx.moveTo(-arm, r * 0.12);
                this.ctx.lineTo(arm, r * 0.12);
                this.ctx.moveTo(0, r * 0.12 - arm);
                this.ctx.lineTo(0, r * 0.12 + arm);
            }
            this.ctx.stroke();
            if (mineKind === 'mark' || mineKind === 'leash') {
                const tag = mineKind === 'mark' ? this.t('MSG_MARK') : this.t('MSG_LEASH');
                const ink = mineKind === 'mark' ? '#ffe7a8' : '#f3e8ff';
                this.ctx.font = '700 14px "Chakra Petch", sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                const tw = this.ctx.measureText(tag).width + 18;
                this.ctx.fillStyle = 'rgba(16, 10, 8, 0.9)';
                this.ctx.strokeStyle = ink;
                this.ctx.lineWidth = 1.6;
                this.ctx.beginPath();
                this.ctx.roundRect(-tw / 2, -r * 2.7, tw, 24, 8);
                this.ctx.fill();
                this.ctx.stroke();
                this.ctx.fillStyle = ink;
                this.ctx.fillText(tag, 0, -r * 2.7 + 12);
            }

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
        const presence = this.bossPresence(e);
        this.ctx.globalAlpha = presence;
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
        this.ctx.globalAlpha = presence;
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
            if (!e.id.startsWith('fuso_echo') && (e.mutation.veil ?? 0) > 0.4) {
                this.ctx.globalAlpha = 0.26 + (1 - e.mutation.veil) * 0.2;
                this.ctx.strokeStyle = '#f6d2c4';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.ellipse(0, 0, e.radius * 0.24, e.radius * 0.9, Math.sin(this.time / 240) * 0.35, 0, Math.PI * 2);
                this.ctx.stroke();
            }
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
            this.ctx.fillStyle = (e.hitFlash && e.hitFlash > 0) ? '#ffffff' : (e.id.startsWith('shiny_') ? e.color : '#00aa00');
            this.ctx.beginPath();
            this.ctx.arc(0, 0, r, 0, Math.PI*2);
            this.ctx.fill();
            this.ctx.stroke();
            const spikes = 8;
            this.ctx.fillStyle = e.id.startsWith('shiny_') ? '#fff6c2' : '#00ff00';
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
        if (e.id.startsWith('shiny_')) this.drawShinyGlint(e.radius);
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

    for (const e of this.entities) {
        if (!e.active || (e.reflect ?? 0) <= 0) continue;
        if (!this.isEnemy(e.type) && e.type !== EntityType.BOSS) continue;
        const pulse = 0.55 + 0.45 * Math.sin(this.time / 70 + e.pos.x);
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'screen';
        this.ctx.strokeStyle = `rgba(214, 255, 70, ${0.55 + pulse * 0.4})`;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(e.pos.x, e.pos.y, e.radius + 8 + pulse * 4, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.restore();
    }

    if (this.lymphOpen) {
        this.ctx.fillStyle = `rgba(8, 2, 4, ${0.86 * this.lymphScale})`;
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        this.drawLymph(false);
    }

    this.drawBossTools();
    if (!ride) this.drawVital();
    if (this.lymphOpen) {
        this.drawLymph(true);
        if (this.lymphRelief > 0.02) {
            const a = this.lymphRelief;
            const home = this.lymphHome();
            const reach = 90 + (1 - a) * 340;
            this.ctx.save();
            this.ctx.globalCompositeOperation = 'screen';
            const glow = this.ctx.createRadialGradient(home.x, home.y, 16, home.x, home.y, 320);
            glow.addColorStop(0, `rgba(255, 236, 206, ${0.72 * a})`);
            glow.addColorStop(0.45, `rgba(255, 196, 140, ${0.22 * a})`);
            glow.addColorStop(1, 'rgba(255, 210, 160, 0)');
            this.ctx.fillStyle = glow;
            this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.strokeStyle = `rgba(255, 228, 196, ${0.85 * a})`;
            this.ctx.lineWidth = 10 * a;
            this.ctx.beginPath();
            this.ctx.arc(home.x, home.y, reach, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.restore();
        }
    }

    this.entities.forEach(e => {
      if (e.type === EntityType.SERUM && e.active) this.drawSerum(e);
      if (e.type === EntityType.LEUCOGEN && e.active) this.drawPill(e);
      if (e.type === EntityType.LYMPH_NODE && e.active) this.drawLymphPass(e);
    });

    this.entities.forEach(e => {
      if (e.type === EntityType.TEXT_POPUP && !this.lymphOpen) {
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
    this.drawHurt();
    this.organ.drawTransit(this.ctx);
    if (ride) this.drawVital();
  }

  private drawHurt() {
      const edge = Math.max(this.hurt, this.lifeCut);
      const ease = this.hurtEase;
      if (edge < 0.02 && ease < 0.02 && this.lifeCut < 0.02) return;
      const w = CANVAS_WIDTH;
      const h = CANVAS_HEIGHT;
      this.ctx.save();
      if (edge >= 0.02) {
          const reach = Math.min(w, h) * 0.72;
          const veil = this.ctx.createRadialGradient(w * 0.5, h * 0.5, reach * 0.42, w * 0.5, h * 0.5, reach);
          veil.addColorStop(0, 'rgba(120, 0, 16, 0)');
          veil.addColorStop(0.7, `rgba(120, 0, 16, ${0.04 * edge})`);
          veil.addColorStop(1, `rgba(86, 0, 14, ${0.62 * edge})`);
          this.ctx.fillStyle = veil;
          this.ctx.fillRect(0, 0, w, h);
          if (this.lifeCut > 0.04) {
              const cut = this.lifeCut;
              const beat = (cut > 0.9 ? (cut - 0.9) / 0.1 : 0)
                  + (cut < 0.8 && cut > 0.66 ? (cut - 0.66) / 0.14 : 0);
              if (beat > 0.02) {
                  this.ctx.fillStyle = `rgba(255, 244, 244, ${0.5 * Math.min(1, beat)})`;
                  this.ctx.fillRect(0, 0, w, h);
              }
              const age = 1 - cut;
              this.ctx.save();
              this.ctx.strokeStyle = `rgba(255, 246, 246, ${Math.max(0, 0.85 - age * 1.7)})`;
              this.ctx.lineWidth = 10;
              this.ctx.beginPath();
              this.ctx.arc(w * 0.5, h * 0.5, age * Math.max(w, h) * 0.95, 0, Math.PI * 2);
              this.ctx.stroke();
              if (cut < 0.8) {
                  const age2 = 0.8 - cut;
                  this.ctx.strokeStyle = `rgba(255, 48, 58, ${Math.max(0, 0.7 - age2 * 2.2)})`;
                  this.ctx.lineWidth = 7;
                  this.ctx.beginPath();
                  this.ctx.arc(w * 0.5, h * 0.5, age2 * Math.max(w, h) * 1.15, 0, Math.PI * 2);
                  this.ctx.stroke();
              }
              this.ctx.translate(w * 0.5, h * 0.47);
              this.ctx.rotate(-0.12);
              const slash = cut > 0.72 ? Math.min(1, (cut - 0.72) / 0.28) : 0;
              this.ctx.globalAlpha = slash * 0.92;
              this.ctx.fillStyle = '#fff7f7';
              this.ctx.fillRect(-w * 0.62, -2.2, w * 1.24, 4);
              this.ctx.globalAlpha = slash * 0.5;
              this.ctx.fillStyle = '#ff2436';
              this.ctx.fillRect(-w * 0.62, 5, w * 1.24, 11);
              this.ctx.restore();
          }
          const cx = w * 0.5 + Math.cos(this.hurtAngle) * w * 0.4;
          const cy = h * 0.5 + Math.sin(this.hurtAngle) * h * 0.38;
          this.ctx.save();
          this.ctx.translate(cx, cy);
          this.ctx.rotate(this.hurtAngle);
          this.ctx.fillStyle = `rgba(255, 48, 42, ${Math.min(0.92, 0.78 * edge)})`;
          this.ctx.beginPath();
          this.ctx.moveTo(36, 0);
          this.ctx.lineTo(-18, 22);
          this.ctx.lineTo(-6, 0);
          this.ctx.lineTo(-18, -22);
          this.ctx.closePath();
          this.ctx.fill();
          this.ctx.restore();
      }
      if (ease >= 0.02) {
          const veil = this.ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.2, w * 0.5, h * 0.5, Math.min(w, h) * 0.62);
          veil.addColorStop(0, 'rgba(210, 255, 236, 0)');
          veil.addColorStop(1, `rgba(186, 255, 226, ${0.16 * ease})`);
          this.ctx.fillStyle = veil;
          this.ctx.fillRect(0, 0, w, h);
      }
      this.ctx.restore();
  }
}
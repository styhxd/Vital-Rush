

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

import { Entity, EntityType, Vector2, PlayerStats, GameState, WaveConfig, PatientProfile, Difficulty, ViralStrain, ThemePalette, Language } from '../types';
import { COLORS_DEFAULT, CANVAS_WIDTH, CANVAS_HEIGHT, WAVES, DIFFICULTY_MODIFIERS, INITIAL_LIVES, ADRENALINE_MAX_DURATION, TEXTS } from '../constants';
import { audioManager } from './audioManager';
import { achievementManager } from './achievementManager';
import { BossArchitect, BossTrait } from './bossArchitect';

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

const GRID_CELL_SIZE = 150;
const GRID_COLS = Math.ceil(CANVAS_WIDTH / GRID_CELL_SIZE);
const GRID_ROWS = Math.ceil(CANVAS_HEIGHT / GRID_CELL_SIZE);

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
  
  private lastInputTime: number = 0;
  private patient: PatientProfile;
  private difficultyMods: any;
  private currentDifficulty: Difficulty;

  public comboCount: number = 0;
  public comboTimer: number = 0;
  private readonly COMBO_DURATION = 2.5;
  
  public dashCooldownTimer: number = 0;
  public isDashing: boolean = false;
  public dashDuration: number = 0;
  private dashVector: Vector2 = { x: 0, y: 0 };
  private dashTrailTimer: number = 0;
  
  public currentWaveIndex: number = -1; 
  public waveTimer: number = 0;
  public waveActive: boolean = false;
  public bossSpawned: boolean = false;
  
  // NOVO: Controle de atraso inicial da onda (para tutoriais)
  public waveStartDelay: number = 0;

  public inputVector: Vector2 = { x: 0, y: 0 };
  private bloodFlow: Vector2 = { x: -3.5, y: 0 }; 
  private lastShotTime: number = 0;
  private spawnTimer: number = 0;
  private regenTimer: number = 0;
  private screenShake: Vector2 = { x: 0, y: 0 };
  private shakeIntensity: number = 0;
  
  private surgeActive: boolean = false;
  private deathSurgeActive: boolean = false; 
  private surgeRadius: number = 0;
  public adrenalineActive: boolean = false;
  public adrenalineTimer: number = 0;
  public adrenalineExhausted: boolean = false;
  
  public invulnerabilityTimer: number = 0;
  private hitStopTimer: number = 0;
  private acidContact: number = 0;
  private acidCue: number = 0;
  private acidDrip: number = 0;
  private bgGap: number = 0.6;
  private systemGlitchActive: boolean = false; // SURPRESA 2: Disparo falha após levar dano

  private clearBufferTimer: number = 0; 
  private isVacuuming: boolean = false; 
  private vacuumingTimer: number = 0; 
  
  public isLowQuality: boolean = false; 
  public forceHighQuality: boolean = false; // Override flag
  public allowSerum: boolean = true;

  private serumClock: number = 8;
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
    this.currentDifficulty = difficulty;
    this.difficultyMods = DIFFICULTY_MODIFIERS[difficulty];
    this.colors = theme;
    
    this.player = this.createPlayer(initialStats);
    this.lastInputTime = Date.now();
    this.forceHighQuality = true;
    
    for(let i=0; i<30; i++) this.spawnBackgroundCell(true);
  }

  public setLanguage(lang: Language) { this.language = lang; }
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

      const y = Math.random() * CANVAS_HEIGHT;
      const x = init ? Math.random() * CANVAS_WIDTH : CANVAS_WIDTH + 40 + Math.random() * 280;
      const big = Math.random() < 0.18;
      const size = big ? 6 + Math.random() * 5 : 1.6 + Math.random() * 3.4;
      const speed = 0.25 + Math.random() * 2.9;
      
      this.particles.push({
          id: 'bg',
          type: EntityType.PARTICLE,
          pos: { x, y },
          vel: { x: -speed, y: Math.random() * Math.PI * 2 },
          radius: size,
          health: 1, maxHealth: 1,
          color: this.colors.BLOOD_PARTICLE,
          damage: 0, active: true, ttl: 999999
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
          hp = 120; dmg = 25; radius = 55; color = this.colors.PARASITE; val = 30; speed = 0.25;
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
      
      const isElite = Math.random() < 0.12; 
      if (isElite) {
          hp *= 3.5;
          dmg *= 2;
          val *= 5;
          radius *= 1.6;
          speed *= 0.85;
      }

      // SCALING AJUSTADO PELO ARQUITETO
      // HP Escala: 12% por wave
      // Dano Escala: 15% por wave (Aumento de letalidade progressiva)
      hp *= (1 + this.currentWaveIndex * 0.12);
      dmg *= (1 + this.currentWaveIndex * 0.15);

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
  
  public spawnBoss(config: WaveConfig) {
      const mutation = BossArchitect.mutate();
      // SCALING AJUSTADO: Bosses agora escalam 25% por wave ao invés de 50%
      let hp = 1500 * this.difficultyMods.hp * (1 + this.currentWaveIndex * 0.25);
      if (mutation.traits.includes(BossTrait.JUGGERNAUT)) hp *= 2.5;

      const dmg = 50 * this.difficultyMods.dmg * (1 + this.currentWaveIndex * 0.1);
      
      this.entities.push({
          id: `boss_${Date.now()}`,
          type: EntityType.BOSS,
          pos: { x: CANVAS_WIDTH + 200, y: CANVAS_HEIGHT / 2 },
          vel: { x: -0.5, y: 0 },
          radius: 120,
          health: hp, maxHealth: hp,
          color: mutation.color,
          damage: dmg,
          active: true,
          value: 1000 * this.difficultyMods.score,
          hitFlash: 0,
          drag: 0.1,
          isElite: true,
          mutation: mutation
      });
      
      audioManager.playSurge(); 
  }

  public damageEnemy(target: Entity, amount: number, canCrit: boolean, stats: PlayerStats): boolean {
      if (!target.active) return false;
      
      let finalDamage = amount;
      let isCrit = false;
      
      if (canCrit && Math.random() < stats.critChance) {
          isCrit = true;
          finalDamage *= stats.critMultiplier;
          this.sessionStats.critHits++;
          achievementManager.track('crit_master', 1);
      }

      // ARMOR LOGIC PARA PARASITAS (Tanky bois)
      if (target.type === EntityType.PARASITE) {
          finalDamage *= 0.8; // 20% redução de dano nativa
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
              this.spawnText(target.pos, this.t('MSG_BOSS_DOWN'), '#f00', 50);
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

          const comboMult = 1 + (this.comboCount * 0.1);
          const scoreGain = Math.floor((target.value || 10) * comboMult);
          this.score += scoreGain;
          if (this.score >= 50000) achievementManager.track('score_50k', 50000);
          
          if (isCrit && stats.lifesteal > 0) {
              const heal = stats.lifesteal;
              this.player.health = Math.min(this.player.maxHealth, this.player.health + heal);
              this.spawnText(this.player.pos, `+${heal}`, '#00ff00', 18);
          }

          audioManager.playExplosion();

          // O power-up voando cobre parte da progressão, então a biomassa cai um pouco.
          const dnaYield = 0.8;
          this.entities.push({
              id: `dna_${Date.now()}`,
              type: EntityType.DNA_FRAGMENT,
              pos: { ...target.pos },
              vel: { x: (Math.random()-0.5)*8, y: (Math.random()-0.5)*8 },
              radius: 6,
              health: 1, maxHealth: 1,
              color: this.colors.DNA,
              damage: 0, active: true,
              drag: 0.05,
              value: Math.max(1, Math.ceil((target.value || 10) * Math.min(3, comboMult) * dnaYield)),
              isElite: target.isElite
          });
          
          return true;
      }
      
      return false;
  }

  // --- REVISED: DAMAGE PLAYER LOGIC ---
  private damagePlayer(amount: number, sourcePos: Vector2, onGameOver: () => void, onLifeLost: () => void, stats: PlayerStats, isEnvironmental: boolean = false, sourceEntity?: Entity) {
      if (this.invulnerabilityTimer > 0 || this.isDashing) return;

      this.player.health -= amount;
      this.sessionStats.damageTaken += amount;
      
      // Feedback: Screen Shake
      this.shakeIntensity = amount > 15 ? 20 : 10;
      this.screenShake = { x: (Math.random()-0.5)*15, y: (Math.random()-0.5)*15 };
      
      // Reset Combo
      if (this.comboCount > 5) this.spawnText(this.player.pos, this.t('MSG_COMBO_LOST'), this.colors.PARASITE, 20);
      this.comboCount = 0;

      // New Mechanics: Escape Feedback (Entity Collision only)
      if (!isEnvironmental) {
          // SURPRESA 1: DANO ADAPTATIVO (Inimigo evolui no contato)
          if (sourceEntity && sourceEntity.active) {
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

      if (!isEnvironmental || amount >= 2) audioManager.playHit();

      if (this.player.health <= 0) {
          this.handlePlayerDeath(onGameOver, onLifeLost, stats);
      }
  }

  public handlePlayerDeath(onGameOver: () => void, onLifeLost: () => void, currentStats: PlayerStats) {
      if (this.lives > 0) {
          this.lives--;
          onLifeLost(); 
          this.hitStopTimer = 0.2; 
          achievementManager.track('die_10', 1);
          
          if (this.lives === 0) {
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
      }
  }

  public prepareWave() {
      this.particles = []; 
      this.entities = this.entities.filter(e => e.active && e.type === EntityType.PLAYER);
      this.lastShotTime = performance.now();
      this.spawnTimer = 0;
      this.regenTimer = 0;
      this.grid.clear(); 
      this.vacuumingTimer = 0; 
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
    this.waveStartDelay = delay;

    const waveNum = waveIndex + 1; 
    audioManager.setGameState(waveNum, 1.0);
    // SCALING AJUSTADO: Antes acelerava 0.5 por Wave. Agora 0.12 para não ficar incontrolável.
    this.bloodFlow.x = -2.5 - (waveIndex * 0.12); 
    if (waveIndex === 4) achievementManager.track('wave_5', 5);
    if (waveIndex === 9) achievementManager.track('wave_10', 10);
  }

  public triggerSurge(stats: PlayerStats, force: boolean = false) {
    if (force || this.energy >= stats.maxEnergy) {
      if (!force) this.energy = 0;
      this.surgeActive = true;
      this.deathSurgeActive = force; 
      this.surgeRadius = 0;
      this.shakeIntensity = force ? 40 : 30;
      if (!force) {
          this.spawnText(this.player.pos, this.t('MSG_SURGE'), this.colors.PLAYER_CORE, 45);
      }
      audioManager.playSurge();
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

  public triggerDash(stats: PlayerStats) {
      if (this.dashCooldownTimer <= 0 && !this.isDashing) {
          this.dashCooldownTimer = stats.dashCooldown / 1000;
          this.isDashing = true;
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
          audioManager.playShoot(); 
      }
  }

  private manageOrbitals(stats: PlayerStats) {
      let orbitalCount = 0;
      for(const e of this.entities) if (e.type === EntityType.ORBITAL) orbitalCount++;

      if (orbitalCount < stats.orbitals) {
          for (let i = orbitalCount; i < stats.orbitals; i++) {
              this.entities.push({
                  id: `orb_${Date.now()}_${i}`,
                  type: EntityType.ORBITAL,
                  pos: { ...this.player.pos },
                  vel: { x: 0, y: 0 },
                  radius: 8,
                  health: 1, maxHealth: 1, color: this.colors.ORBITAL,
                  damage: stats.damage * 0.5, 
                  active: true,
                  orbitOffset: (i / stats.orbitals) * 360 
              });
          }
      }
      
      for(const e of this.entities) {
          if (e.type === EntityType.ORBITAL && e.active) {
              const radius = 60;
              const speed = 3; 
              const angleIdx = ((this.time / 10 * speed) + (e.orbitOffset || 0));
              e.pos.x = this.player.pos.x + getCos(angleIdx) * radius;
              e.pos.y = this.player.pos.y + getSin(angleIdx) * radius;
              e.damage = stats.damage * 0.5;
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
          if (this.isEnemy(e.type) || e.type === EntityType.BOSS) {
              e.health = -999; e.active = false; e.pos.x = -10000; 
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

  private updateBoss(e: Entity, dtSeconds: number, stats: PlayerStats) {
      if (!e.mutation) return;
      const m = e.mutation;
      const dx = this.player.pos.x - e.pos.x;
      const dy = this.player.pos.y - e.pos.y;
      const dMag = Math.sqrt(dx*dx + dy*dy);
      
      if (dMag > 0) {
          const speed = m.baseSpeed * this.difficultyMods.speed;
          e.vel.x += (dx / dMag) * speed;
          e.vel.y += (dy / dMag) * speed;
      }

      if (m.traits.includes(BossTrait.SPRINTER)) {
          m.dashTimer -= dtSeconds;
          if (m.dashTimer <= 0) {
              const dashMag = 35; 
              e.vel.x = (dx / dMag) * dashMag;
              e.vel.y = (dy / dMag) * dashMag;
              m.dashTimer = 4.0;
              // VARIETY: SOUND CALL FOR BOSS DASH
              audioManager.playBossDash();
          }
      }

      if (m.traits.includes(BossTrait.TOXIC)) {
          m.acidTimer -= dtSeconds;
          if (m.acidTimer <= 0) {
              this.entities.push({
                  id: `acid_${Date.now()}`, type: EntityType.ACID_POOL,
                  pos: { ...e.pos }, vel: { x: 0, y: 0 }, radius: 80,
                  health: 1, maxHealth: 1, color: this.colors.ACID_POOL, damage: 0, active: true, ttl: 6, value: 6
              });
              m.acidTimer = 2.0;
          }
      }

      if (m.traits.includes(BossTrait.GUNNER)) {
          m.shootTimer -= dtSeconds;
          if (m.shootTimer <= 0) {
              const angle = Math.atan2(dy, dx);
              const count = 3;
              for(let i=0; i<count; i++) {
                  const a = angle - 0.2 + (i * 0.2);
                  this.entities.push({
                      id: `bproj_${Date.now()}_${i}`, type: EntityType.ENEMY_PROJECTILE,
                      pos: { ...e.pos }, vel: { x: Math.cos(a)*8, y: Math.sin(a)*8 },
                      radius: 15, health: 1, maxHealth: 1, color: e.color, damage: 20, active: true
                  });
              }
              m.shootTimer = 2.5;
              // VARIETY: SOUND CALL FOR ENEMY SHOOT (BOSS)
              audioManager.playEnemyShoot();
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

    if (!this.forceHighQuality) {
        this.perfCheckTimer += dt;
        if (this.perfCheckTimer > 500) { 
            const avgFrameTime = this.frameTimes.reduce((a,b) => a+b, 0) / (this.frameTimes.length || 1);
            if (avgFrameTime > 20) {
                this.isLowQuality = true;
            } else if (avgFrameTime < 14) {
                this.isLowQuality = false;
            }
            this.frameTimes = [];
            this.perfCheckTimer = 0;
        }
    } else {
        this.isLowQuality = false;
    }
    
    this.frameTimes.push(dt);

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

    if (this.player.active) this.manageOrbitals(stats);

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
                    audioManager.playMineExplosionDash();
                    audioManager.playSurge(); 

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
                if ((this.isEnemy(e.type) || e.type === EntityType.BOSS) && e.active) {
                    if (distSq(this.player.pos, e.pos) < (this.player.radius + e.radius) ** 2) {
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
          const config = WAVES[Math.min(this.currentWaveIndex, WAVES.length - 1)];
          const targetFlow = config.flowSpeed - (this.currentWaveIndex * 0.2); 
          this.bloodFlow.x = this.bloodFlow.x * 0.95 + targetFlow * 0.05;
          
          let spawnRateMod = 1.0;
          if (this.patient.strain === ViralStrain.SWARM) spawnRateMod = 0.5; 
          if (this.patient.strain === ViralStrain.TITAN) spawnRateMod = 1.5; 

          if (this.waveTimer < config.duration) {
              this.spawnTimer += safeDt;
              if (this.spawnTimer >= (config.spawnRate * spawnRateMod) && this.entities.length < this.maxEntities) {
                this.spawnEnemy(config);
                this.spawnTimer = 0;
              }
          } else {
              if (config.hasBoss && !this.bossSpawned) {
                  this.spawnBoss(config);
                  this.bossSpawned = true;
                  if (onBossSpawn) onBossSpawn();
              }
          }
          
          const bossActive = this.entities.some(e => e.type === EntityType.BOSS && e.active);
          const shouldSpawnMines = this.waveTimer < config.duration || bossActive;

          if (shouldSpawnMines && Math.random() < 0.005) { 
              const y = Math.random() * CANVAS_HEIGHT;
              this.entities.push({
                  id: `mine_${Date.now()}`, type: EntityType.BIO_MINE,
                  pos: { x: CANVAS_WIDTH + 50, y }, vel: { x: -0.5, y: 0 },
                  radius: 20, health: 10, maxHealth: 10, color: this.colors.BIO_MINE, damage: 150, active: true, drag: 0.1
              });
          }

          if (this.allowSerum && this.waveStartDelay <= 0 && !this.isVacuuming && this.waveTimer > 1) {
              const serumLive = this.entities.some(e => e.type === EntityType.SERUM && e.active);
              if (!serumLive) {
                  this.serumClock -= dtSeconds;
                  if (this.serumClock <= 0) {
                      this.spawnSerum();
                      this.serumClock = 46 + Math.random() * 16;
                  }
              }
          }

          const enemiesRemaining = this.entities.some(e => e.active && (this.isEnemy(e.type) || e.type === EntityType.BOSS));
          const bossRemaining = this.entities.some(e => e.active && e.type === EntityType.BOSS);
          
          if (this.waveTimer >= config.duration) {
              if (!enemiesRemaining && (!config.hasBoss || (this.bossSpawned && !bossRemaining))) {
                  this.isVacuuming = true; 
              } else if (!config.hasBoss && !bossRemaining) {
                  const hasVisibleEnemies = this.entities.some(e => 
                      (this.isEnemy(e.type) || e.type === EntityType.BOSS) && e.active &&
                      e.pos.x > -50 && e.pos.x < CANVAS_WIDTH + 50 &&
                      e.pos.y > -50 && e.pos.y < CANVAS_HEIGHT + 50
                  );

                  if (!hasVisibleEnemies) {
                      this.clearBufferTimer += dtSeconds;
                      if (this.clearBufferTimer > 3.0) {
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
          const dnaFragments = this.entities.filter(e => e.type === EntityType.DNA_FRAGMENT && e.active);
          
          if (dnaFragments.length === 0 || this.vacuumingTimer > 5.0) {
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
                  if (e.type !== EntityType.BOSS) {
                      e.vel.x += (dx/dist) * 25; 
                      e.vel.y += (dy/dist) * 25;
                  }
                  
                  if (this.damageEnemy(e, 8, false, stats)) {
                      this.sessionStats.surgeKills++;
                      achievementManager.track('surge_kill_100', 1);
                  }
              }
           }
        }
      });
      if (this.surgeRadius > CANVAS_WIDTH * 1.5) {
          this.surgeActive = false;
          this.deathSurgeActive = false;
      }
    }

      if (this.player.active) {
      if (this.player.maxHealth !== stats.maxHealth) {
          this.player.maxHealth = stats.maxHealth;
          this.player.health = Math.min(this.player.health, this.player.maxHealth);
      }
      if (!this.hpMilestoneSent && this.player.maxHealth >= 200) {
          this.hpMilestoneSent = true;
          achievementManager.track('max_hp_200', Math.floor(this.player.maxHealth));
      }
      if (!this.isDashing) {
          const moveScale = this.adrenalineActive ? tick * 1.5 : tick; 
          this.player.vel.x += this.inputVector.x * stats.speed * 0.2 * moveScale; 
          this.player.vel.y += this.inputVector.y * stats.speed * 0.2 * moveScale;
          this.player.vel.x *= this.player.drag!;
          this.player.vel.y *= this.player.drag!;
          this.player.pos.x += this.bloodFlow.x * 0.1 * tick;
      }

      this.player.pos.x += this.player.vel.x * tick;
      this.player.pos.y += this.player.vel.y * tick;

      if (this.player.pos.x < this.player.radius) this.player.pos.x = this.player.radius;
      if (this.player.pos.x > CANVAS_WIDTH - this.player.radius) this.player.pos.x = CANVAS_WIDTH - this.player.radius;
      if (this.player.pos.y < this.player.radius) this.player.pos.y = this.player.radius;
      if (this.player.pos.y > CANVAS_HEIGHT - this.player.radius) this.player.pos.y = CANVAS_HEIGHT - this.player.radius;

      this.regenTimer += safeDt;
      if (this.regenTimer > 2000 && stats.regen > 0) {
        this.player.health = Math.min(this.player.health + stats.regen, this.player.maxHealth);
        this.regenTimer = 0;
      }
      
      const now = performance.now();
      if (now - this.lastShotTime > stats.fireRate) {
        const target = this.findTarget();
        if (target) {
          this.shoot(target, stats);
          this.lastShotTime = now;
        } else if (this.sessionStats.timePlayed > 30 && this.sessionStats.bulletsFired === 0) {
            achievementManager.track('pacifist', 30);
        }
      }
      
      this.entities.forEach(e => {
          if (e.type === EntityType.ACID_POOL && e.active) {
              const full = e.value && e.value > 0 ? e.value : 6;
              const left = Math.max(0, e.ttl || 0);
              const grown = 1 - Math.min(1, left / full);
              const appear = grown < 0.18 ? grown / 0.18 : 1;
              const hitR = e.radius * (0.28 + 0.72 * appear);
              if (distSq(this.player.pos, e.pos) < (hitR + this.player.radius - 10)**2) {
                  this.damagePlayer(0.5 * tick, e.pos, onGameOver, onLifeLost, stats, true);
                  this.acidContact = 0.45;
                  this.acidDrip += 0.5 * tick;
                  this.acidCue -= dtSeconds;
                  if (this.acidCue <= 0) {
                      this.acidCue = 0.42;
                      const shown = Math.max(1, Math.round(this.acidDrip));
                      this.acidDrip = 0;
                      this.spawnText(
                          { x: this.player.pos.x, y: this.player.pos.y - 16 },
                          `${this.t('MSG_ACID')} -${shown}`,
                          '#e8ff8a',
                          22
                      );
                      audioManager.playHit();
                      this.shakeIntensity = Math.max(this.shakeIntensity, 14);
                      const sparks = this.isLowQuality ? 2 : 5;
                      for (let k = 0; k < sparks; k++) {
                          const ang = Math.random() * Math.PI * 2;
                          this.particles.push({
                              id: 'spark', type: EntityType.PARTICLE, pos: { ...this.player.pos },
                              vel: { x: Math.cos(ang) * 2.2, y: -1.5 - Math.random() * 2.5 },
                              radius: 2.5, health: 1, maxHealth: 1, color: '#d4ff6a', damage: 0, active: true, ttl: 16
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

      if (e.type !== EntityType.TEXT_POPUP) {
        const drag = e.drag ?? 0.5;
        const isMagnetized = e.type === EntityType.DNA_FRAGMENT && (this.surgeActive || this.isVacuuming);
        const flowInfluence = (e.type === EntityType.ANTIBODY || e.type === EntityType.ACID_POOL || e.type === EntityType.ENEMY_PROJECTILE || isMagnetized) ? 0 : (e.type === EntityType.BOSS ? 0.1 : 1);
        
        e.pos.x += (e.vel.x + (this.bloodFlow.x * (1 - drag) * flowInfluence)) * tick;
        e.pos.y += (e.vel.y + (this.bloodFlow.y * (1 - drag) * flowInfluence)) * tick;
        
        // VARIETY INJECTION: ZIG-ZAG FUNGI
        if (e.type === EntityType.FUNGI && this.player.active) {
            e.vel.y += Math.sin(this.time * 0.005 + e.pos.x * 0.01) * 0.5;
        }

        if (e.type === EntityType.BOSS) {
            this.updateBoss(e, dtSeconds, stats); 
            e.vel.x *= 0.95; 
            e.vel.y *= 0.95; 
            const margin = e.radius + 10;
            e.pos.x = Math.max(margin, Math.min(CANVAS_WIDTH - margin, e.pos.x));
            e.pos.y = Math.max(margin, Math.min(CANVAS_HEIGHT - margin, e.pos.y));
        }

        if (e.type === EntityType.VIRUS && this.player.active && e.pos.x < CANVAS_WIDTH + 100) {
            if (e.shootTimer !== undefined) {
                e.shootTimer -= dtSeconds;
                if (e.shootTimer <= 0) {
                    const angle = Math.atan2(this.player.pos.y - e.pos.y, this.player.pos.x - e.pos.x);
                    const speed = 7;
                    this.entities.push({
                        id: `eproj_${Date.now()}`, type: EntityType.ENEMY_PROJECTILE,
                        pos: { ...e.pos },
                        vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
                        radius: 12, health: 1, maxHealth: 1, color: this.colors.ENEMY_PROJECTILE,
                        damage: 15 * this.difficultyMods.dmg, active: true, drag: 0
                    });
                    
                    e.shootTimer = 3.5; 
                    // VARIETY: SOUND CALL FOR ENEMY SHOOT
                    audioManager.playEnemyShoot();
                }
            }
        }
        
        // VARIETY INJECTION: TRACKING PROJECTILES (WEAK HOMING)
        if (e.type === EntityType.ENEMY_PROJECTILE && this.player.active) {
            const dx = this.player.pos.x - e.pos.x;
            const dy = this.player.pos.y - e.pos.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > 0 && dist < 400) { // Só curva se estiver perto
                const homingForce = 0.2;
                e.vel.x += (dx/dist) * homingForce;
                e.vel.y += (dy/dist) * homingForce;
            }
        }

        if (e.type !== EntityType.BOSS && e.type !== EntityType.PLAYER && this.isOutOfBoundsExtended(e.pos)) {
            e.active = false;
            continue;
        }

        if (e.type !== EntityType.ANTIBODY && e.type !== EntityType.ACID_POOL && e.type !== EntityType.ENEMY_PROJECTILE && e.type !== EntityType.BOSS) {
          e.vel.x *= 0.95;
          e.vel.y *= 0.95;
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
                   audioManager.playMineExplosionShot();
                   audioManager.playSurge(); 
                   
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
             const rSum = e.radius + other.radius;
             if (Math.abs(e.pos.x - other.pos.x) < rSum && Math.abs(e.pos.y - other.pos.y) < rSum) {
                 if (distSq(e.pos, other.pos) < rSum * rSum) {
                   if (e.type === EntityType.ANTIBODY) e.active = false;
                   
                   const comboMult = 1 + (this.comboCount * 0.1); 
                   this.damageEnemy(other, e.damage * (e.type === EntityType.ORBITAL ? 1 : comboMult), e.type === EntityType.ANTIBODY, stats);
                   
                   if (e.type === EntityType.ANTIBODY) {
                       audioManager.playHit();
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
                // SCALING FIX: Speed Cap
                let waveSpeedFactor = Math.min(1.2, this.currentWaveIndex * 0.05); // Cap em +1.2
                let speed = (0.5 + waveSpeedFactor);
                
                speed *= 0.7; 
                speed *= this.difficultyMods.speed;
                if (this.patient.strain === ViralStrain.VOLATILE) speed *= 1.3;
                if (this.patient.strain === ViralStrain.TITAN) speed *= 0.7;
                if (e.type === EntityType.VIRUS) speed *= 0.8; 
                if (e.isElite) speed *= 0.7;
                if (e.type === EntityType.FUNGI) speed = 0.2; 

                if (e.type !== EntityType.BOSS) {
                    e.vel.x += (dx / dMag) * speed * tick;
                    e.vel.y += (dy / dMag) * speed * tick;
                }
              }

              const pSum = e.radius + this.player.radius;
              if (dMag < pSum * 0.8) {
                 if (this.invulnerabilityTimer <= 0 && !this.isDashing) {
                     if (stats.thorns > 0) this.damageEnemy(e, stats.thorns, false, stats);
                     let damage = e.type === EntityType.BOSS ? 25 : (e.isElite ? 2.5 : 0.6); // Aumentado ~20%
                     damage *= this.difficultyMods.dmg;
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
            const speed = isVacuuming ? 80 : (this.surgeActive ? 50 : 28);
            
            if (dist > 1) {
                e.pos.x += (dx / dist) * speed * tick;
                e.pos.y += (dy / dist) * speed * tick;
            } else {
                e.pos.x = this.player.pos.x;
                e.pos.y = this.player.pos.y;
            }
            
            if (dist < this.player.radius + e.radius) {
              e.active = false;
              const energyGain = e.isElite ? 20 : 5;
              this.energy = Math.min(this.energy + energyGain, stats.maxEnergy);
              const val = (e.value || 1);
              this.biomass += val; 
              this.sessionStats.biomassCollected += val;
              achievementManager.track('biomass_10k', val);
              if (this.biomass >= 3000) achievementManager.track('rich', 3000);
              audioManager.playPowerUp();
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
          if (!this.isLowQuality) {
              const wander = Math.sin(this.time * 0.0011 + p.vel.y) * (0.22 + p.radius * 0.03);
              p.pos.x += (p.vel.x + this.bloodFlow.x * 0.28) * tick;
              p.pos.y += wander * tick;
              if (p.pos.y < -40 || p.pos.y > CANVAS_HEIGHT + 40) p.pos.y = Math.random() * CANVAS_HEIGHT;
              if (p.pos.x < -80) {
                  p.pos.x = CANVAS_WIDTH + 60 + Math.random() * 640;
                  p.pos.y = Math.random() * CANVAS_HEIGHT;
              }
          }
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
        const bgCount = this.particles.reduce((n, p) => n + (p.id === 'bg' ? 1 : 0), 0);
        if (this.bgGap <= 0 && bgCount < 36) {
            const cluster = 1 + Math.floor(Math.random() * 3);
            for (let i = 0; i < cluster; i++) this.spawnBackgroundCell(false);
            this.bgGap = 0.35 + Math.random() * 1.7;
        }
    }
    if (this.acidContact > 0) this.acidContact -= dt / 1000;
    else {
        this.acidDrip = 0;
        this.acidCue = 0;
    }
    
    this.shakeIntensity *= 0.9;
    if (this.shakeIntensity < 0.5) this.shakeIntensity = 0;
    this.compactInactive(this.entities);
  }

  private isOutOfBoundsExtended(pos: Vector2) {
      return pos.x < -400 || pos.x > CANVAS_WIDTH + 400 || pos.y < -400 || pos.y > CANVAS_HEIGHT + 400;
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
          radius: 36,
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
              audioManager.playPowerUp();
              return;
          }
      }
      if (e.pos.x < -140) e.active = false;
  }

  private drawSerum(e: Entity) {
      const pulse = 0.97 + 0.03 * Math.sin(this.time / 160);
      const s = 21 * pulse;
      const x = e.pos.x;
      const y = e.pos.y;
      const ring = s * 1.48;

      this.ctx.save();
      this.ctx.translate(x, y);

      if (!this.isLowQuality) {
          this.ctx.globalCompositeOperation = 'screen';
          this.drawGlow('#7af7ff', s * 2.15, 0.45, null, 0.16);
          this.drawGlow('#ff4ad4', s * 1.35, 0.28, null, 0.3);
          this.ctx.globalCompositeOperation = 'source-over';
      }

      this.ctx.save();
      this.ctx.rotate(this.time / 1400);
      this.ctx.strokeStyle = 'rgba(244, 251, 255, 0.92)';
      this.ctx.lineWidth = 2.4;
      this.ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
          const a0 = (i / 6) * Math.PI * 2 + 0.28;
          this.ctx.beginPath();
          this.ctx.arc(0, 0, ring, a0, a0 + 0.52);
          this.ctx.stroke();
      }
      this.ctx.restore();

      if (!this.isLowQuality) {
          const a = this.time / 320;
          this.ctx.fillStyle = '#ffe14a';
          this.ctx.beginPath();
          this.ctx.arc(Math.cos(a) * ring, Math.sin(a) * ring, 2.6, 0, Math.PI * 2);
          this.ctx.fill();
      }

      const bob = Math.sin(this.time / 170) * 2.4;
      this.ctx.save();
      this.ctx.translate(0, -ring - 8 + bob);
      this.ctx.fillStyle = '#fffaf2';
      this.ctx.strokeStyle = '#1a0614';
      this.ctx.lineWidth = 2;
      this.ctx.lineJoin = 'round';
      this.ctx.beginPath();
      this.ctx.moveTo(0, -6);
      this.ctx.lineTo(6.5, 2);
      this.ctx.lineTo(2.4, 2);
      this.ctx.lineTo(2.4, 7);
      this.ctx.lineTo(-2.4, 7);
      this.ctx.lineTo(-2.4, 2);
      this.ctx.lineTo(-6.5, 2);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.restore();

      const vw = s * 0.72;
      const vh = s * 1.28;
      const top = -vh * 0.42;
      const rad = vw * 0.38;

      this.ctx.beginPath();
      this.ctx.roundRect(-vw * 0.46, top - s * 0.34, vw * 0.92, s * 0.36, 3);
      const cap = this.ctx.createLinearGradient(0, top - s * 0.34, 0, top);
      cap.addColorStop(0, '#f7fbff');
      cap.addColorStop(1, '#8ea4b8');
      this.ctx.fillStyle = cap;
      this.ctx.strokeStyle = '#102028';
      this.ctx.lineWidth = 2.5;
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.roundRect(-vw, top, vw * 2, vh, rad);
      const glass = this.ctx.createLinearGradient(-vw, 0, vw, 0);
      glass.addColorStop(0, '#1c0c30');
      glass.addColorStop(0.5, '#3a1868');
      glass.addColorStop(1, '#140818');
      this.ctx.fillStyle = glass;
      this.ctx.strokeStyle = '#f4fbff';
      this.ctx.lineWidth = 2.8;
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.roundRect(-vw + 3.5, top + 3.5, vw * 2 - 7, vh - 7, rad * 0.62);
      this.ctx.clip();
      const liquid = this.ctx.createLinearGradient(0, top, 0, top + vh);
      liquid.addColorStop(0, '#d8fffb');
      liquid.addColorStop(0.42, '#3ad8ff');
      liquid.addColorStop(1, '#ff3ad0');
      this.ctx.fillStyle = liquid;
      this.ctx.fillRect(-vw, top + vh * 0.16, vw * 2, vh);
      const by = top + vh * (0.58 + 0.1 * Math.sin(this.time / 220));
      this.ctx.fillStyle = 'rgba(255,255,255,0.8)';
      this.ctx.beginPath();
      this.ctx.arc(-vw * 0.28, by, 2.3, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();

      this.ctx.beginPath();
      const lx = 0.5;
      const ly = top + vh * 0.55;
      this.ctx.moveTo(lx - 1, ly - 8);
      this.ctx.lineTo(lx + 6, ly - 1);
      this.ctx.lineTo(lx + 1.2, ly - 1);
      this.ctx.lineTo(lx + 5, ly + 8);
      this.ctx.lineTo(lx - 5, ly + 1.2);
      this.ctx.lineTo(lx - 0.4, ly + 1.2);
      this.ctx.closePath();
      this.ctx.fillStyle = '#ffffff';
      this.ctx.strokeStyle = '#1a0614';
      this.ctx.lineWidth = 1.7;
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
      this.ctx.beginPath();
      this.ctx.roundRect(-vw + 5, top + 6, vw * 0.26, vh * 0.48, 3);
      this.ctx.fill();
      this.ctx.restore();

      const tag = this.t('SERUM_TAG');
      this.ctx.save();
      this.ctx.font = '700 18px "Chakra Petch", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      const plateW = this.ctx.measureText(tag).width + 18;
      const lyLabel = y + s * 1.72;
      this.ctx.fillStyle = 'rgba(8, 2, 14, 0.9)';
      this.ctx.strokeStyle = '#7af7ff';
      this.ctx.lineWidth = 1.8;
      this.ctx.beginPath();
      this.ctx.roundRect(x - plateW / 2, lyLabel - 11, plateW, 22, 11);
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.fillStyle = '#f4fbff';
      this.ctx.fillText(tag, x, lyLabel + 0.5);
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

  private shoot(target: Entity, stats: PlayerStats) {
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
      audioManager.playShoot();
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

  public draw() {
    this.ctx.fillStyle = this.colors.BG;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

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
      const r = this.deathSurgeActive ? this.surgeRadius * (0.9 + Math.random()*0.2) : this.surgeRadius;
      
      // VISUAL UPGRADE: Inner ripple
      this.ctx.beginPath();
      this.ctx.arc(this.player.pos.x, this.player.pos.y, r * 0.6, 0, Math.PI * 2);
      this.ctx.strokeStyle = this.deathSurgeActive ? 'rgba(255, 0, 0, 0.5)' : 'rgba(0, 255, 255, 0.5)';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // VISUAL UPGRADE: Outer echo
      this.ctx.beginPath();
      this.ctx.arc(this.player.pos.x, this.player.pos.y, r * 1.1, 0, Math.PI * 2);
      this.ctx.strokeStyle = this.deathSurgeActive ? 'rgba(255, 0, 0, 0.2)' : 'rgba(0, 255, 255, 0.2)';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();

      // Main Ring
      this.ctx.beginPath();
      this.ctx.arc(this.player.pos.x, this.player.pos.y, r, 0, Math.PI * 2);
      
      this.ctx.globalAlpha = 0.3;
      this.ctx.lineWidth = this.deathSurgeActive ? 60 : 30;
      this.ctx.strokeStyle = this.deathSurgeActive ? '#ff0000' : this.colors.SURGE;
      this.ctx.stroke();
      
      this.ctx.globalAlpha = 1.0;
      this.ctx.lineWidth = 5;
      this.ctx.stroke();
      
      this.ctx.fillStyle = this.deathSurgeActive ? `rgba(255, 0, 0, 0.2)` : `rgba(0, 255, 255, 0.1)`;
      this.ctx.fill();
    }

    if (!this.isLowQuality) {
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.globalAlpha = 0.22;
        this.ctx.fillStyle = '#9a2428';
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            if (p.id !== 'bg') continue;
            this.ctx.beginPath();
            this.ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
            this.ctx.fill();
        }
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
            this.ctx.save();
            this.ctx.translate(e.pos.x, e.pos.y);
            const full = e.value && e.value > 0 ? e.value : 6;
            const left = Math.max(0, e.ttl || 0);
            const life = Math.min(1, left / full);
            const grown = 1 - life;
            const appear = grown < 0.18 ? grown / 0.18 : 1;
            const vanish = life < 0.22 ? life / 0.22 : 1;
            const veil = appear * vanish;
            const r = e.radius * (0.28 + 0.72 * appear);
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
            this.ctx.globalAlpha = 0.22 * veil;
            this.ctx.fillStyle = '#6d8c18';
            blob(r * 1.18);
            this.ctx.fill();
            this.ctx.globalAlpha = 0.92 * veil;
            this.ctx.fillStyle = '#c6f542';
            blob(r * 0.9);
            this.ctx.fill();
            this.ctx.lineWidth = Math.max(2.5, r * 0.045);
            this.ctx.strokeStyle = '#243808';
            this.ctx.stroke();
            this.ctx.globalAlpha = 0.4 * veil;
            this.ctx.fillStyle = '#f3ffb0';
            this.ctx.beginPath();
            this.ctx.ellipse(-r * 0.1, -r * 0.06, r * 0.34, r * 0.16, -0.5, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 0.85 * veil;
            this.ctx.fillStyle = '#f7ffd2';
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
            this.ctx.save();
            this.ctx.translate(e.pos.x, e.pos.y);
            this.ctx.globalCompositeOperation = 'screen';
            this.ctx.fillStyle = e.isElite ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 215, 0, 0.4)';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, e.radius * 2.5, 0, Math.PI*2);
            this.ctx.fill();
            this.ctx.globalCompositeOperation = 'source-over';
            const scaleX = Math.cos(this.time / 150);
            this.ctx.scale(Math.abs(scaleX), 1);
            this.ctx.fillStyle = e.isElite ? '#ffeeb0' : this.colors.DNA;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, e.radius, 0, Math.PI*2);
            this.ctx.fill();
            this.ctx.strokeStyle = '#b8860b';
            this.ctx.lineWidth = 1.5;
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.arc(0, 0, e.radius * 0.6, 0, Math.PI*2);
            this.ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
            this.ctx.restore();
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
        this.ctx.beginPath();
        if (e.type === EntityType.BOSS) {
            const pulses = Math.sin(this.time / 200) * 10;
            this.ctx.arc(0, 0, e.radius + pulses, 0, Math.PI*2);
            this.ctx.fillStyle = '#000';
            this.ctx.fill();
            this.ctx.stroke();
            this.ctx.fillStyle = (e.hitFlash && e.hitFlash > 0) ? '#ffffff' : e.color;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, e.radius * 0.6, 0, Math.PI*2);
            if (e.mutation && e.mutation.traits.includes(BossTrait.SPRINTER) && Math.abs(e.vel.x) > 5) {
                 this.ctx.globalAlpha = 0.3;
                 this.ctx.fillStyle = e.color;
                 this.ctx.fill();
                 this.ctx.globalAlpha = 1.0;
            }
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
        this.ctx.fill();
        this.ctx.stroke();
        if (spin) this.ctx.rotate(-spin);
        this.ctx.translate(-e.pos.x, -e.pos.y);
        this.ctx.globalAlpha = 1;
        this.ctx.globalCompositeOperation = 'source-over';
      }
    });

    if (this.player.active) {
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
          ? (Math.floor(this.time / 70) % 2 === 0 ? '#e8ff8a' : '#ffffff')
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
          this.ctx.strokeStyle = '#d4ff6a';
          this.ctx.lineWidth = 4;
          this.ctx.beginPath();
          this.ctx.arc(this.player.pos.x, this.player.pos.y, this.player.radius + 12 + Math.sin(this.time / 55) * 4, 0, Math.PI * 2);
          this.ctx.stroke();
          this.ctx.globalAlpha = 0.16 + Math.sin(this.time / 50) * 0.06;
          this.ctx.fillStyle = '#c6f542';
          this.ctx.fillRect(0, 0, CANVAS_WIDTH, 36);
          this.ctx.fillRect(0, CANVAS_HEIGHT - 36, CANVAS_WIDTH, 36);
          this.ctx.fillRect(0, 0, 36, CANVAS_HEIGHT);
          this.ctx.fillRect(CANVAS_WIDTH - 36, 0, 36, CANVAS_HEIGHT);
      }
      this.ctx.globalAlpha = 1.0;
    }

    this.entities.forEach(e => {
      if (e.type === EntityType.SERUM && e.active) this.drawSerum(e);
    });

    this.entities.forEach(e => {
      if (e.type === EntityType.TEXT_POPUP) {
        this.ctx.font = `bold ${e.radius || 24}px monospace`;
        this.ctx.fillStyle = e.color;
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.strokeText(e.id, e.pos.x, e.pos.y);
        this.ctx.fillText(e.id, e.pos.x, e.pos.y);
      }
    });

    this.ctx.restore();
  }
}
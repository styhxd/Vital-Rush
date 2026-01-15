/**
 * ------------------------------------------------------------------
 * COPYRIGHT (c) 2026 ESTÚDIO CRIA
 * DIRETOR: PAULO GABRIEL DE L. S.
 * ------------------------------------------------------------------
 * 
 * A BESTA (GAME ENGINE) - PROTOCOLO "NEON LITE" (GRADIENT EDITION)
 * 
 * ATUALIZAÇÃO V4.7: A TROCA VISUAL (THE GREAT SWAP)
 * 
 * - Biomassa agora é uma Estrela (menor).
 * - Bombas (Minas) agora são Losangos/Diamantes.
 * - Projéteis inimigos agora são Espinhos.
 * - Fungi reduzido de tamanho.
 */

import { Entity, EntityType, Vector2, PlayerStats, GameState, WaveConfig, PatientProfile, Difficulty, ViralStrain, ThemePalette, Language } from '../types';
import { COLORS_DEFAULT, CANVAS_WIDTH, CANVAS_HEIGHT, WAVES, DIFFICULTY_MODIFIERS, INITIAL_LIVES, ADRENALINE_MAX_DURATION, TEXTS } from '../constants';
import { audioManager } from './audioManager';
import { achievementManager } from './achievementManager';

const SIN_TABLE = new Float32Array(360);
const COS_TABLE = new Float32Array(360);
for (let i = 0; i < 360; i++) {
    SIN_TABLE[i] = Math.sin(i * Math.PI / 180);
    COS_TABLE[i] = Math.cos(i * Math.PI / 180);
}
const getSin = (idx: number) => SIN_TABLE[Math.floor(Math.abs(idx)) % 360];
const getCos = (idx: number) => COS_TABLE[Math.floor(Math.abs(idx)) % 360];

const distSq = (v1: Vector2, v2: Vector2) => Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2);

const GRID_CELL_SIZE = 150;
const GRID_COLS = Math.ceil(CANVAS_WIDTH / GRID_CELL_SIZE);
const GRID_ROWS = Math.ceil(CANVAS_HEIGHT / GRID_CELL_SIZE);

// Helper para criar cores transparentes para gradientes
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

  private clearBufferTimer: number = 0; 
  private isVacuuming: boolean = false; 
  private vacuumTimer: number = 0; // Failsafe timer
  
  // --- PERFORMANCE MONITORING VARIABLES ---
  public isLowQuality: boolean = false; 
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
    
    if (window.innerWidth < 768) {
        this.isLowQuality = true;
    }
    
    for(let i=0; i<30; i++) this.spawnBackgroundCell(true);
  }

  public setLanguage(lang: Language) { this.language = lang; }
  private t(key: string): string { return TEXTS[this.language][key] || key; }

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
      if (Math.random() > 0.4) return; 

      const y = Math.random() * CANVAS_HEIGHT;
      const x = init ? Math.random() * CANVAS_WIDTH : CANVAS_WIDTH + 50;
      const size = Math.random() * 4 + 2; 
      const speed = Math.random() * 2 + 1;
      
      this.particles.push({
          id: 'bg',
          type: EntityType.PARTICLE,
          pos: { x, y },
          vel: { x: -speed, y: 0 },
          radius: size,
          health: 1, maxHealth: 1,
          color: this.colors.BLOOD_PARTICLE,
          damage: 0, active: true, ttl: 999999
      });
  }

  public spawnText(pos: Vector2, text: string, color: string, fontSize: number = 20) {
      if (this.isLowQuality && this.entities.filter(e => e.type === EntityType.TEXT_POPUP).length > 3) return;
      if (this.entities.filter(e => e.type === EntityType.TEXT_POPUP).length > 8) return;

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
      } else if (type === EntityType.VIRUS) {
          hp = 20; dmg = 15; radius = 25; color = this.colors.VIRUS; val = 15; speed = 2.2;
      } else if (type === EntityType.PARASITE) {
          hp = 120; dmg = 25; radius = 55; color = this.colors.PARASITE; val = 30; speed = 0.25;
      } else if (type === EntityType.FUNGI) {
          hp = 90; dmg = 15; radius = 28; // MENOR (era 40)
          color = this.colors.FUNGI; val = 45; speed = 0.15;
          shootTimer = 2.0; 
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

      hp *= (1 + this.currentWaveIndex * 0.35);

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
          drag: type === EntityType.FUNGI ? 0.2 : 0.1, 
          hitFlash: 0,
          shootTimer
      });
  }
  
  public spawnBoss(config: WaveConfig) {
      const hp = 1500 * this.difficultyMods.hp * (1 + this.currentWaveIndex * 0.5);
      const dmg = 50 * this.difficultyMods.dmg;
      
      this.entities.push({
          id: `boss_${Date.now()}`,
          type: EntityType.BOSS,
          pos: { x: CANVAS_WIDTH + 200, y: CANVAS_HEIGHT / 2 },
          vel: { x: -0.5, y: 0 },
          radius: 120,
          health: hp, maxHealth: hp,
          color: this.colors.BOSS,
          damage: dmg,
          active: true,
          value: 1000 * this.difficultyMods.score,
          hitFlash: 0,
          drag: 0.1,
          isElite: true
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
      
      if (finalDamage > 500) achievementManager.track('overkill', 1);

      target.health -= finalDamage;
      target.hitFlash = 5;
      
      const knockback = target.type === EntityType.BOSS || target.type === EntityType.FUNGI ? 0.1 : 2;
      target.pos.x += knockback; 

      if (isCrit && stats.lifesteal > 0) {
          this.player.health = Math.min(this.player.health + 2, this.player.maxHealth);
          this.spawnText(this.player.pos, this.t('MSG_HP_PLUS'), '#00ff00', 16);
      }

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
              this.spawnText(target.pos, "BOSS DOWN", '#f00', 50);
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
                  ttl: 8 
              });
          }

          this.comboCount++;
          if (this.comboCount >= 50) achievementManager.track('combo_50', 50);
          this.comboTimer = this.COMBO_DURATION;
          if (this.comboCount > this.sessionStats.maxCombo) this.sessionStats.maxCombo = this.comboCount;
          
          if (this.comboCount % 10 === 0) {
              this.spawnText(this.player.pos, `${this.comboCount}X COMBO`, this.colors.COMBO, 30);
          }

          const comboMult = 1 + (this.comboCount * 0.1);
          const scoreGain = Math.floor((target.value || 10) * comboMult);
          this.score += scoreGain;
          if (this.score >= 50000) achievementManager.track('score_50k', 50000);
          
          audioManager.playExplosion();

          this.entities.push({
              id: `dna_${Date.now()}`,
              type: EntityType.DNA_FRAGMENT,
              pos: { ...target.pos },
              vel: { x: (Math.random()-0.5)*8, y: (Math.random()-0.5)*8 },
              radius: 6, // MENOR (era 12)
              health: 1, maxHealth: 1,
              color: this.colors.DNA,
              damage: 0, active: true,
              drag: 0.05,
              value: Math.ceil((target.value || 10) * Math.min(3, comboMult)),
              isElite: target.isElite
          });
          
          return true;
      }
      
      return false;
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
              this.spawnText(this.player.pos, "CRITICAL FAILURE", '#ff0000', 50);
              
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
      // LIMPEZA AGRESSIVA: Remove qualquer entidade inativa ou bugada
      this.particles = []; 
      this.entities = this.entities.filter(e => e.active && e.type === EntityType.PLAYER);
      
      this.lastShotTime = performance.now();
      this.spawnTimer = 0;
      this.regenTimer = 0;
      this.grid.clear(); 
      this.vacuumTimer = 0; // Reset failsafe timer
  }

  public startWave(waveIndex: number) {
    this.prepareWave();
    this.currentWaveIndex = waveIndex;
    this.waveTimer = 0;
    this.waveActive = true;
    this.bossSpawned = false;
    this.spawnTimer = 0;
    this.clearBufferTimer = 0; 
    this.isVacuuming = false;  
    this.vacuumTimer = 0;
    const waveNum = waveIndex + 1; 
    audioManager.setGameState(waveNum, 1.0);
    this.bloodFlow.x = -2.5 - (waveIndex * 0.5); 
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
              e.vel.x = (this.player.pos.x - e.pos.x) * 0.5; 
              e.vel.y = (this.player.pos.y - e.pos.y) * 0.5;
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
          }
      }
  }

  private clearGrid() { this.grid.clear(); }
  private addToGrid(e: Entity) {
      const col = Math.floor(e.pos.x / GRID_CELL_SIZE);
      const row = Math.floor(e.pos.y / GRID_CELL_SIZE);
      if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return;
      const idx = row * GRID_COLS + col;
      if (!this.grid.has(idx)) this.grid.set(idx, []);
      this.grid.get(idx)!.push(e);
  }
  private getPotentialCollisions(e: Entity): Entity[] {
      const col = Math.floor(e.pos.x / GRID_CELL_SIZE);
      const row = Math.floor(e.pos.y / GRID_CELL_SIZE);
      const candidates: Entity[] = [];
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

  // --- UPDATE: Agora com onBossSpawn opcional e verificação ---
  public update(dt: number, stats: PlayerStats, onWaveClear: () => void, onGameOver: () => void, onLifeLost: () => void, onBossSpawn?: () => void) {
    if (dt > 32) dt = 32; 

    // --- 2. MONITOR DE PERFORMANCE ---
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
        if (this.invulnerabilityTimer > 5) this.invulnerabilityTimer = 3; 
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
            this.dashTrailTimer = 0.05; // Menos rastro
        }

        if (this.dashDuration <= 0) {
            this.isDashing = false;
            this.player.vel.x *= 0.5;
            this.player.vel.y *= 0.5;
        }
    }

    if (this.waveActive && this.currentWaveIndex >= 0) {
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
      
      if (this.waveTimer < config.duration + 10 && Math.random() < 0.005) { 
          const y = Math.random() * CANVAS_HEIGHT;
          this.entities.push({
              id: `mine_${Date.now()}`, type: EntityType.BIO_MINE,
              pos: { x: CANVAS_WIDTH + 50, y }, vel: { x: -0.5, y: 0 },
              radius: 20, health: 10, maxHealth: 10, color: this.colors.BIO_MINE, damage: 150, active: true, drag: 0.1
          });
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
      
      if (this.isVacuuming) {
          // FAILSAFE: Timeout de 5 segundos para o vacuum.
          // Se a biomassa estiver bugada (NaN ou off-screen), forçamos o fim da wave.
          this.vacuumTimer += dtSeconds;
          
          const dnaFragments = this.entities.filter(e => e.type === EntityType.DNA_FRAGMENT && e.active);
          
          if (dnaFragments.length === 0 || this.vacuumTimer > 5.0) {
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
              
              if (dist > 0.1) { // PROTEÇÃO CONTRA DIVISÃO POR ZERO
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
              if (distSq(this.player.pos, e.pos) < (e.radius + this.player.radius - 10)**2) {
                  if (!this.isDashing && this.invulnerabilityTimer <= 0) {
                      this.player.health -= 0.5 * tick; 
                      this.sessionStats.damageTaken += 0.5 * tick;
                      if (!this.isLowQuality && Math.random() < 0.1) {
                          this.particles.push({
                              id: 'acid_burn', type: EntityType.PARTICLE, pos: {...this.player.pos},
                              vel: {x: 0, y: -2}, radius: 2, health: 1, maxHealth: 1, color: this.colors.ACID_POOL, damage: 0, active: true, ttl: 20
                          });
                      }
                  }
              }
          } else if (e.type === EntityType.ENEMY_PROJECTILE && e.active) {
              // COLISÃO COM PROJÉTIL INIMIGO
              if (distSq(this.player.pos, e.pos) < (e.radius + this.player.radius)**2) {
                  if (!this.isDashing && this.invulnerabilityTimer <= 0) {
                      this.player.health -= e.damage;
                      this.sessionStats.damageTaken += e.damage;
                      this.shakeIntensity = 10;
                      this.screenShake = { x: (Math.random()-0.5)*5, y: (Math.random()-0.5)*5 };
                      
                      if (this.comboCount > 5) this.spawnText(this.player.pos, this.t('MSG_COMBO_LOST'), this.colors.PARASITE, 20);
                      this.comboCount = 0;
                      
                      e.active = false; // Destrói o projétil
                      
                      if (this.player.health <= 0) this.handlePlayerDeath(onGameOver, onLifeLost, stats);
                  }
              }
          }
      });
    }

    this.clearGrid();
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      if (!e.active) {
        this.entities.splice(i, 1);
        continue;
      }

      if (e.hitFlash && e.hitFlash > 0) e.hitFlash--;

      if (e.type !== EntityType.TEXT_POPUP) {
        const drag = e.drag ?? 0.5;
        const flowInfluence = (e.type === EntityType.ANTIBODY || e.type === EntityType.ACID_POOL || e.type === EntityType.ENEMY_PROJECTILE) ? 0 : (e.type === EntityType.BOSS ? 0.1 : 1);
        
        e.pos.x += (e.vel.x + (this.bloodFlow.x * (1 - drag) * flowInfluence)) * tick;
        e.pos.y += (e.vel.y + (this.bloodFlow.y * (1 - drag) * flowInfluence)) * tick;
        
        if (e.type === EntityType.BOSS) {
            const margin = e.radius + 10;
            e.pos.x = Math.max(margin, Math.min(CANVAS_WIDTH - margin, e.pos.x));
            e.pos.y = Math.max(margin, Math.min(CANVAS_HEIGHT - margin, e.pos.y));
        }

        // LÓGICA DE TIRO DO FUNGI
        if (e.type === EntityType.FUNGI && this.player.active && e.pos.x < CANVAS_WIDTH + 100) {
            if (e.shootTimer !== undefined) {
                e.shootTimer -= dtSeconds;
                if (e.shootTimer <= 0) {
                    // ATIRAR
                    const angle = Math.atan2(this.player.pos.y - e.pos.y, this.player.pos.x - e.pos.x);
                    const speed = 7;
                    this.entities.push({
                        id: `eproj_${Date.now()}`, type: EntityType.ENEMY_PROJECTILE,
                        pos: { ...e.pos },
                        vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
                        radius: 12, health: 1, maxHealth: 1, color: this.colors.ENEMY_PROJECTILE,
                        damage: 15 * this.difficultyMods.dmg, active: true, drag: 0
                    });
                    
                    e.shootTimer = 3.0; // Recarrega
                }
            }
        }

        if (e.type !== EntityType.BOSS && e.type !== EntityType.PLAYER && this.isOutOfBoundsExtended(e.pos)) {
            e.active = false;
            continue;
        }

        if (e.type !== EntityType.ANTIBODY && e.type !== EntityType.ACID_POOL && e.type !== EntityType.ENEMY_PROJECTILE) {
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
               if (distSq(e.pos, other.pos) < (e.radius + other.radius)**2) {
                   e.active = false;
                   other.active = false;
                   this.sessionStats.mineKills++;
                   achievementManager.track('mine_pop_20', 1);
                   this.spawnText(other.pos, this.t('MSG_BOOM'), this.colors.BIO_MINE, 40);
                   audioManager.playExplosion();
                   
                   // UPDATE: MELHORIA VISUAL DA BOMBA (SISTEMA DE PARTÍCULAS)
                   this.particles.push({
                        id: 'mine_expl', type: EntityType.PARTICLE, pos: {...other.pos},
                        vel: {x:0, y:0}, radius: 150, health:1, maxHealth:1, color: 'rgba(0, 255, 100, 0.4)', damage:0, active:true, ttl: 15
                   });
                   
                   // ADICIONA SPARKS SE NÃO ESTIVER EM LOW QUALITY
                   if (!this.isLowQuality) {
                       for(let k=0; k<8; k++) {
                           const ang = Math.random() * Math.PI * 2;
                           const spd = Math.random() * 10 + 5;
                           this.particles.push({
                               id: 'spark', type: EntityType.PARTICLE, pos: {...other.pos},
                               vel: { x: Math.cos(ang)*spd, y: Math.sin(ang)*spd },
                               radius: 3, health:1, maxHealth:1, color: '#aaffaa', damage:0, active:true, ttl: 20
                           });
                       }
                   }

                   this.entities.forEach(victim => {
                       if ((this.isEnemy(victim.type) || victim.type === EntityType.BOSS) && victim.active) {
                           if (distSq(victim.pos, other.pos) < 150*150) {
                               this.damageEnemy(victim, 200, true, stats);
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
                let speed = (0.5 + (this.currentWaveIndex * 0.1));
                speed *= 0.7; 
                speed *= this.difficultyMods.speed;
                if (this.patient.strain === ViralStrain.VOLATILE) speed *= 1.3;
                if (this.patient.strain === ViralStrain.TITAN) speed *= 0.7;
                if (e.type === EntityType.VIRUS) speed *= 1.4;
                if (e.isElite) speed *= 0.7;
                if (e.type === EntityType.BOSS) speed = 0.3; 
                if (e.type === EntityType.FUNGI) speed = 0.2; // Fungi quase parado

                e.vel.x += (dx / dMag) * speed * tick;
                e.vel.y += (dy / dMag) * speed * tick;
              }

              const pSum = e.radius + this.player.radius;
              const isInvulnerable = this.isDashing || this.invulnerabilityTimer > 0; 
              
              if (dMag < pSum * 0.8 && !isInvulnerable) {
                 if (stats.thorns > 0) this.damageEnemy(e, stats.thorns, false, stats);

                 let damage = e.type === EntityType.BOSS ? 20 : (e.isElite ? 2 : 0.5);
                 damage *= this.difficultyMods.dmg;
                 
                 this.player.health -= damage;
                 this.sessionStats.damageTaken += damage;
                 this.shakeIntensity = e.type === EntityType.BOSS ? 20 : 8;
                 this.screenShake = { x: (Math.random()-0.5)*10, y: (Math.random()-0.5)*10 };
                 if (this.comboCount > 5) this.spawnText(this.player.pos, this.t('MSG_COMBO_LOST'), this.colors.PARASITE, 20);
                 this.comboCount = 0;

                 if (e.type === EntityType.BOSS) {
                     e.vel.x = -1; 
                 } else {
                     e.vel.x = -5; 
                 }

                 if (this.player.health <= 0) this.handlePlayerDeath(onGameOver, onLifeLost, stats);
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
            
            // NaN PROTECTION: Se a distância for minúscula, coletar imediatamente
            // para evitar divisão por zero ou coordenadas infinitas.
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

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (p.id === 'mine_expl') {
          p.ttl = (p.ttl || 0) - 1;
          if (p.ttl <= 0) this.particles.splice(i, 1);
          continue;
      }
      
      if (p.id === 'bg') {
          if (!this.isLowQuality) {
              p.pos.x += (p.vel.x + this.bloodFlow.x * 2) * tick; 
              if (p.pos.x < -50) p.pos.x = CANVAS_WIDTH + 50; 
          }
      } else {
          p.pos.x += (p.vel.x + this.bloodFlow.x) * tick;
          p.pos.y += (p.vel.y + this.bloodFlow.y) * tick;
          p.vel.x *= 0.9; 
          p.vel.y *= 0.9;
          
          p.ttl = (p.ttl || 0) - 1;
          if (p.ttl <= 0) this.particles.splice(i, 1);
      }
    }
    
    const currentMaxParticles = this.isLowQuality ? 60 : 250;
    if (this.particles.length > currentMaxParticles) {
        const nonBg = this.particles.findIndex(p => p.id !== 'bg');
        if (nonBg !== -1) this.particles.splice(nonBg, 1);
        else this.particles.pop();
    }
    
    // Adjusted particle spawning logic for background static mode
    // We want fewer new particles if the background is static
    if (!this.isLowQuality && this.particles.length < 30) this.spawnBackgroundCell();
    
    this.shakeIntensity *= 0.9;
    if (this.shakeIntensity < 0.5) this.shakeIntensity = 0;
  }

  // Helper
  private isOutOfBounds(pos: Vector2) {
    return pos.x < -100 || pos.x > CANVAS_WIDTH + 100 || pos.y < -100 || pos.y > CANVAS_HEIGHT + 100;
  }

  private isOutOfBoundsExtended(pos: Vector2) {
      return pos.x < -400 || pos.x > CANVAS_WIDTH + 400 || pos.y < -400 || pos.y > CANVAS_HEIGHT + 400;
  }
  
  private isEnemy(t: EntityType) {
    return t === EntityType.BACTERIA || t === EntityType.VIRUS || t === EntityType.PARASITE || t === EntityType.FUNGI;
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

  // --- DRAWING: OTIMIZADO PARA IGNORAR ENTIDADES INATIVAS ---
  public draw() {
    this.ctx.fillStyle = this.colors.BG;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const aberration = this.adrenalineActive || this.surgeActive;
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

    // SURGE
    if (this.surgeActive) {
      this.ctx.beginPath();
      const r = this.deathSurgeActive ? this.surgeRadius * (0.9 + Math.random()*0.2) : this.surgeRadius;
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

    // PARTICLES
    this.ctx.globalCompositeOperation = 'screen';
    this.particles.forEach(p => {
      if (p.id === 'ghost') {
          this.ctx.fillStyle = p.color;
          this.ctx.beginPath();
          this.ctx.ellipse(p.pos.x, p.pos.y, p.radius * 1.5, p.radius * 0.6, 0, 0, Math.PI*2);
          this.ctx.fill();
      } else if (p.id === 'mine_expl') {
          // UPDATE: EXPLOSÃO DA MINA MELHORADA (Shockwave & Core)
          const maxLife = 15; // Combina com o novo TTL definido no update
          const life = p.ttl || 0;
          const progress = 1 - (life / maxLife);
          const easeOut = 1 - Math.pow(1 - progress, 3); // Cubic Ease Out para "pop" rápido

          // Shockwave (Anel)
          this.ctx.beginPath();
          this.ctx.arc(p.pos.x, p.pos.y, p.radius * easeOut, 0, Math.PI*2);
          this.ctx.lineWidth = 20 * (1 - progress); // Afina conforme expande
          this.ctx.strokeStyle = `rgba(50, 255, 100, ${life/maxLife})`;
          this.ctx.stroke();

          // Núcleo Brilhante
          this.ctx.beginPath();
          this.ctx.arc(p.pos.x, p.pos.y, p.radius * 0.5 * (1-progress), 0, Math.PI*2);
          this.ctx.fillStyle = `rgba(200, 255, 200, ${life/maxLife})`;
          this.ctx.fill();
      } else {
        this.ctx.globalAlpha = p.id === 'bg' ? 0.3 : (p.ttl! / 20); 
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
        this.ctx.fill();
      }
    });
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.globalAlpha = 1.0;

    // --- PROJÉTEIS ---
    this.ctx.globalCompositeOperation = 'screen';
    this.ctx.beginPath();
    this.ctx.strokeStyle = this.colors.ANTIBODY;
    this.ctx.lineWidth = 10; 
    this.ctx.lineCap = 'round';
    this.ctx.globalAlpha = 0.15; 
    this.entities.forEach(e => {
        if (!e.active) return; // SKIP INACTIVE
        if (e.type === EntityType.ANTIBODY) {
             this.ctx.moveTo(e.pos.x, e.pos.y);
             const tailX = e.pos.x - e.vel.x * 0.4; 
             const tailY = e.pos.y - e.vel.y * 0.4;
             this.ctx.lineTo(tailX, tailY);
        }
    });
    this.ctx.stroke();
    
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.beginPath();
    this.ctx.lineWidth = 3; 
    this.ctx.globalAlpha = 1.0;
    this.ctx.strokeStyle = '#fff';
    this.entities.forEach(e => {
        if (!e.active) return; // SKIP INACTIVE
        if (e.type === EntityType.ANTIBODY) {
             this.ctx.moveTo(e.pos.x, e.pos.y);
             const tailX = e.pos.x - e.vel.x * 0.4; 
             const tailY = e.pos.y - e.vel.y * 0.4;
             this.ctx.lineTo(tailX, tailY);
        }
        else if (e.type === EntityType.ENEMY_PROJECTILE) {
            // NEW: ESPINHOS (Antiga Mina) para projéteis inimigos
            this.ctx.fillStyle = e.color;
            this.ctx.beginPath();
            const spikes = 8; // Mais pontas
            for(let i=0; i<spikes*2; i++) {
                const r = i % 2 === 0 ? e.radius : e.radius * 0.5;
                const angle = (i / (spikes*2)) * Math.PI * 2 + (this.time/50); // Gira mais rápido
                this.ctx.lineTo(e.pos.x + Math.cos(angle)*r, e.pos.y + Math.sin(angle)*r);
            }
            this.ctx.closePath();
            this.ctx.fill();
        }
    });
    this.ctx.stroke();

    // --- ENTIDADES ---
    this.entities.forEach(e => {
        if (!e.active) return; // SKIP INACTIVE
        if (e.type === EntityType.ORBITAL) {
             const grad = this.ctx.createRadialGradient(e.pos.x, e.pos.y, e.radius * 0.2, e.pos.x, e.pos.y, e.radius * 2.0);
             grad.addColorStop(0, hexToRgba(this.colors.ORBITAL, 0.6));
             grad.addColorStop(1, 'rgba(0,0,0,0)');
             
             this.ctx.globalCompositeOperation = 'screen';
             this.ctx.fillStyle = grad;
             this.ctx.beginPath();
             this.ctx.arc(e.pos.x, e.pos.y, e.radius * 2.0, 0, Math.PI*2);
             this.ctx.fill();
             
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
            this.ctx.fillStyle = this.colors.ACID_POOL;
            this.ctx.globalAlpha = 0.3 + Math.sin(this.time/200)*0.1;
            this.ctx.beginPath();
            
            const r = e.radius;
            const segments = 12;
            for(let i=0; i<=segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                const wobble = Math.sin(this.time/150 + i) * 5;
                const px = e.pos.x + Math.cos(angle) * (r + wobble);
                const py = e.pos.y + Math.sin(angle) * (r + wobble);
                if (i===0) this.ctx.moveTo(px, py);
                else this.ctx.lineTo(px, py);
            }
            this.ctx.closePath();
            this.ctx.fill();
            
            this.ctx.strokeStyle = '#ffff00';
            this.ctx.lineWidth = 2;
            this.ctx.globalAlpha = 0.6 + Math.sin(this.time/100)*0.4; 
            this.ctx.stroke();
            
            this.ctx.globalAlpha = 0.8;
            this.ctx.font = `${e.radius * 1.6}px var(--font-tech)`; 
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText("💀", e.pos.x, e.pos.y);
            
            this.ctx.globalAlpha = 1.0;
        }
        else if (e.type === EntityType.BIO_MINE) {
            // NEW: BIO-MINE AGORA É UM DIAMANTE/LOSANGO PULSANTE (Antiga Biomassa)
            this.ctx.save();
            this.ctx.translate(e.pos.x, e.pos.y);
            
            // Halo de Luz (Screen)
            this.ctx.globalCompositeOperation = 'screen';
            const pulse = 1 + Math.sin(this.time / 50) * 0.4; // Pulsa rápido, é uma bomba
            const grad = this.ctx.createRadialGradient(0, 0, e.radius * 0.2, 0, 0, e.radius * 2.0);
            grad.addColorStop(0, hexToRgba(this.colors.BIO_MINE, 0.8));
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            
            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, e.radius * 2 * pulse, 0, Math.PI*2);
            this.ctx.fill();
            
            // Corpo Principal (Losango Giratório)
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.rotate(this.time / 50); // Gira rápido
            this.ctx.fillStyle = this.colors.BIO_MINE;
            this.ctx.beginPath();
            this.ctx.moveTo(0, -e.radius);
            this.ctx.lineTo(e.radius, 0);
            this.ctx.lineTo(0, e.radius);
            this.ctx.lineTo(-e.radius, 0);
            this.ctx.closePath();
            this.ctx.fill();
            
            // Borda de Alerta
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            this.ctx.restore();
        }
        else if (e.type === EntityType.DNA_FRAGMENT) {
            // NEW: BIOMASSA AGORA É UMA ESTRELA (Menor)
            this.ctx.save();
            this.ctx.translate(e.pos.x, e.pos.y);
            
            this.ctx.globalCompositeOperation = 'screen';
            // Brilho
            this.ctx.fillStyle = e.isElite ? 'rgba(255, 215, 0, 0.6)' : 'rgba(0, 255, 204, 0.5)';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, e.radius * 3, 0, Math.PI*2);
            this.ctx.fill();
            
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.rotate(this.time / 150); // Gira suave
            
            // Desenha Estrela
            const spikes = 5;
            const outerRadius = e.radius;
            const innerRadius = e.radius * 0.4;
            
            this.ctx.beginPath();
            this.ctx.fillStyle = e.isElite ? this.colors.ELITE_GLOW : this.colors.DNA;
            
            for(let i=0; i<spikes*2; i++) {
                const r = i % 2 === 0 ? outerRadius : innerRadius;
                const a = (i / (spikes*2)) * Math.PI * 2;
                this.ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
            }
            this.ctx.closePath();
            this.ctx.fill();
            
            this.ctx.restore();
        }
    });

    // --- INIMIGOS ---
    this.entities.forEach(e => {
      if (!e.active) return; // SKIP INACTIVE
      if (this.isEnemy(e.type) || e.type === EntityType.BOSS) {
        this.ctx.save();
        this.ctx.translate(e.pos.x, e.pos.y);
        
        const glowColor = e.isElite || e.type === EntityType.BOSS 
            ? (e.type === EntityType.BOSS ? this.colors.BOSS : this.colors.ELITE_GLOW)
            : e.color;
            
        if (glowColor.startsWith('#')) {
            const glowRadius = e.radius * (e.type === EntityType.BOSS ? 2.5 : 2.0);
            const grad = this.ctx.createRadialGradient(0, 0, e.radius * 0.2, 0, 0, glowRadius);
            grad.addColorStop(0, hexToRgba(glowColor, 0.6)); 
            grad.addColorStop(0.5, hexToRgba(glowColor, 0.2)); 
            grad.addColorStop(1, 'rgba(0,0,0,0)'); 
            
            this.ctx.globalCompositeOperation = 'screen';
            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, glowRadius, 0, Math.PI*2);
            this.ctx.fill();
        } else {
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
            this.ctx.fillStyle = (e.hitFlash && e.hitFlash > 0) ? '#ffffff' : this.colors.BOSS;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, e.radius * 0.6, 0, Math.PI*2);
        } else if (e.type === EntityType.BACTERIA) {
          this.ctx.rotate(this.time / 500);
          this.ctx.roundRect(-e.radius, -e.radius/2, e.radius*2, e.radius, 10);
        } else if (e.type === EntityType.VIRUS) {
           const r = e.radius;
           for(let i=0; i<6; i++) {
             const a = (i/6)*Math.PI*2 + (this.time/200);
             const vx = Math.cos(a)*r;
             const vy = Math.sin(a)*r;
             if (i === 0) this.ctx.moveTo(vx, vy);
             else this.ctx.lineTo(vx, vy);
           }
           this.ctx.closePath();
        } else if (e.type === EntityType.FUNGI) {
            // FUNGI VISUAL: Pentágono pulsante com núcleo
            const r = e.radius;
            const sides = 5;
            this.ctx.beginPath();
            for(let i=0; i<sides; i++) {
                const angle = (i/sides) * Math.PI*2 + Math.sin(this.time/300);
                this.ctx.lineTo(Math.cos(angle)*r, Math.sin(angle)*r);
            }
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
            
            // Núcleo que indica tiro
            if (e.shootTimer !== undefined && e.shootTimer < 0.5) {
                this.ctx.fillStyle = '#fff'; // Brilha antes de atirar
            } else {
                this.ctx.fillStyle = '#000';
            }
            this.ctx.beginPath();
            this.ctx.arc(0, 0, r*0.4, 0, Math.PI*2);
            this.ctx.fill();
        } else {
           const pulses = Math.sin(this.time/100) * 5;
           this.ctx.arc(0, 0, e.radius + pulses, 0, Math.PI*2);
        }
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.restore();
      }
    });

    // --- PLAYER ---
    if (this.player.active) {
      const glowRadius = this.isDashing ? this.player.radius * 3 : this.player.radius * 2.5;
      const grad = this.ctx.createRadialGradient(this.player.pos.x, this.player.pos.y, this.player.radius * 0.2, this.player.pos.x, this.player.pos.y, glowRadius);
      grad.addColorStop(0, hexToRgba(this.colors.PLAYER_CORE, this.isDashing ? 0.8 : 0.6));
      grad.addColorStop(1, 'rgba(0,0,0,0)');

      this.ctx.globalCompositeOperation = 'screen';
      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(this.player.pos.x, this.player.pos.y, glowRadius, 0, Math.PI*2);
      this.ctx.fill();
      
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.globalAlpha = 1.0;
      this.ctx.fillStyle = this.isDashing || this.invulnerabilityTimer > 0 ? this.colors.PLAYER_CORE : this.colors.PLAYER;
      
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
      this.ctx.globalAlpha = 1.0;
    }

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
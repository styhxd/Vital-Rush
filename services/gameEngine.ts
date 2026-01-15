/**
 * ------------------------------------------------------------------
 * COPYRIGHT (c) 2026 ESTÚDIO CRIA
 * DIRETOR: PAULO GABRIEL DE L. S.
 * ------------------------------------------------------------------
 * 
 * A BESTA (GAME ENGINE)
 * 
 * Este arquivo é onde a matemática acontece. Colisão, vetores, renderização.
 * Não usamos Unity. Não usamos Godot. Usamos puro ódio e JavaScript.
 * 
 * A MATEMÁTICA DA DOR:
 * Alteramos o loop de regeneração e ganho de recursos para garantir
 * que o jogador nunca se sinta seguro.
 */

import { Entity, EntityType, Vector2, PlayerStats, GameState, WaveConfig, PatientProfile, Difficulty, ViralStrain, ThemePalette } from '../types';
import { COLORS_DEFAULT, CANVAS_WIDTH, CANVAS_HEIGHT, WAVES, DIFFICULTY_MODIFIERS } from '../constants';
import { audioManager } from './audioManager';
import { achievementManager } from './achievementManager';

// Distância ao quadrado (pra não usar Math.sqrt toda hora e fritar a CPU)
const distSq = (v1: Vector2, v2: Vector2) => Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2);

export class GameEngine {
  // Arrayzão com tudo que existe no jogo.
  public entities: Entity[] = [];
  public particles: Entity[] = []; // Separado pra não checar colisão em purpurina
  public player: Entity;
  
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private colors: ThemePalette; // Cores Dinâmicas (Ascended Mode)
  
  public score: number = 0;
  public biomass: number = 0; // Dinheiro
  public time: number = 0;
  public energy: number = 0; // Mana da ult
  
  // Stats da Sessão (Contabilidade pra Conquistas)
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
      timePlayed: 0, // Segundos
      bulletsFired: 0,
      idleTime: 0
  };
  
  private lastInputTime: number = 0;

  // Contexto do Paciente (Flavor Text que afeta mecânicas)
  private patient: PatientProfile;
  private difficultyMods: any;
  private currentDifficulty: Difficulty;

  // Sistema de Combo
  public comboCount: number = 0;
  public comboTimer: number = 0;
  private readonly COMBO_DURATION = 2.5; // Segundos pra matar outro bicho antes de perder o combo
  
  // Sistema de Dash (Reconstruído 3 vezes porque ficava bugado)
  public dashCooldownTimer: number = 0;
  public isDashing: boolean = false;
  public dashDuration: number = 0;
  private dashVector: Vector2 = { x: 0, y: 0 };
  private dashTrailTimer: number = 0;
  
  public currentWaveIndex: number = -1; 
  public waveTimer: number = 0;
  public waveActive: boolean = false;
  public bossSpawned: boolean = false;
  
  public inputVector: Vector2 = { x: 0, y: 0 }; // Input vindo do React
  private bloodFlow: Vector2 = { x: -2, y: 0 }; // A correnteza que empurra tudo pra esquerda
  private lastShotTime: number = 0;
  private spawnTimer: number = 0;
  private regenTimer: number = 0;
  private screenShake: Vector2 = { x: 0, y: 0 };
  private shakeIntensity: number = 0;
  
  // Mecânicas Novas
  private surgeActive: boolean = false; // A "Ult"
  private surgeRadius: number = 0;
  public adrenalineActive: boolean = false; // Câmera lenta quando vai morrer
  
  // Limites pra não travar o browser
  private readonly MAX_PARTICLES = 250;
  private readonly MAX_ENTITIES = 400;

  constructor(canvas: HTMLCanvasElement, initialStats: PlayerStats, patient: PatientProfile, difficulty: Difficulty, theme: ThemePalette) {
    this.canvas = canvas;
    // 'desynchronized: true' tenta reduzir latência removendo v-sync do browser (perigoso, mas rápido)
    // 'alpha: false' diz pro browser que não tem transparência no fundo, otimizando rendering
    this.ctx = canvas.getContext('2d', { alpha: false, desynchronized: true })!;
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    this.patient = patient;
    this.currentDifficulty = difficulty;
    this.difficultyMods = DIFFICULTY_MODIFIERS[difficulty];
    this.colors = theme;
    
    this.player = this.createPlayer(initialStats);
    this.lastInputTime = Date.now();
    
    // Pré-popula o fundo com glóbulos pra não parecer vazio no começo
    for(let i=0; i<30; i++) this.spawnBackgroundCell(true);
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
      drag: 0.92 // Fricção do fluido
    };
  }

  public startWave(waveIndex: number) {
    this.currentWaveIndex = waveIndex;
    this.waveTimer = 0;
    this.waveActive = true;
    this.bossSpawned = false;
    this.spawnTimer = 0;
    
    // Checks de Conquista
    if (waveIndex === 4) achievementManager.track('wave_5', 5);
    if (waveIndex === 9) achievementManager.track('wave_10', 10);
  }

  public triggerSurge(stats: PlayerStats) {
    if (this.energy >= stats.maxEnergy) {
      this.energy = 0;
      this.surgeActive = true;
      this.surgeRadius = 0;
      this.shakeIntensity = 25;
      this.spawnText(this.player.pos, "SURGE!", this.colors.PLAYER_CORE, 40);
      audioManager.playSurge();
      
      // Puxa todo o dinheiro da tela (Magnetismo global)
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
          this.dashDuration = 0.2; // 200ms de invencibilidade
          
          let dx = this.inputVector.x;
          let dy = this.inputVector.y;
          // Se não tiver input, dash pra frente
          if (dx === 0 && dy === 0) dx = 1;
          
          const mag = Math.sqrt(dx*dx + dy*dy);
          this.dashVector = { x: (dx / mag), y: (dy / mag) };
          
          this.player.vel.x = this.dashVector.x * stats.dashSpeed;
          this.player.vel.y = this.dashVector.y * stats.dashSpeed;
          
          this.shakeIntensity = 10;
          this.screenShake = { x: -this.dashVector.x * 5, y: -this.dashVector.y * 5 };

          audioManager.playShoot(); // Som de swoosh
      }
  }

  // Gerencia os drones orbitais (se o jogador comprou o upgrade)
  private manageOrbitals(stats: PlayerStats) {
      const currentOrbitals = this.entities.filter(e => e.type === EntityType.ORBITAL);
      // Spawna os que faltam
      if (currentOrbitals.length < stats.orbitals) {
          for (let i = currentOrbitals.length; i < stats.orbitals; i++) {
              this.entities.push({
                  id: `orb_${Date.now()}_${i}`,
                  type: EntityType.ORBITAL,
                  pos: { ...this.player.pos },
                  vel: { x: 0, y: 0 },
                  radius: 8,
                  health: 1, maxHealth: 1, color: this.colors.ORBITAL,
                  damage: stats.damage * 0.5, 
                  active: true,
                  orbitOffset: (i / stats.orbitals) * Math.PI * 2
              });
          }
      }
      
      // Atualiza posição (Gira em torno do player)
      this.entities.forEach(e => {
          if (e.type === EntityType.ORBITAL && e.active) {
              const radius = 60;
              const speed = 3;
              const angle = (this.time / 1000 * speed) + (e.orbitOffset || 0);
              e.pos.x = this.player.pos.x + Math.cos(angle) * radius;
              e.pos.y = this.player.pos.y + Math.sin(angle) * radius;
              
              // Colisão do Orbital (Ele é um escudo de dano)
              for (const other of this.entities) {
                  if ((this.isEnemy(other.type) || other.type === EntityType.BOSS) && other.active) {
                      if (distSq(e.pos, other.pos) < (e.radius + other.radius + 10) ** 2) {
                          this.damageEnemy(other, e.damage, false, stats); // Orbitais não critam
                          // Faíscas
                          this.particles.push({
                              id: 'spark', type: EntityType.PARTICLE, pos: {...other.pos}, 
                              vel: { x: (Math.random()-0.5)*5, y: (Math.random()-0.5)*5 },
                              radius: 2, health: 1, maxHealth: 1, color: this.colors.ORBITAL, damage: 0, active: true, ttl: 5
                          });
                      }
                  }
              }
          }
      });
  }

  // --- O LOOP PRINCIPAL ---
  // Chamado ~60 vezes por segundo. Não coloque console.log aqui se tiver amor à vida.
  public update(dt: number, stats: PlayerStats, onWaveClear: () => void, onGameOver: () => void) {
    let timeScale = 1.0;

    // Efeito Adrenalina (Slow Motion quando quase morrendo)
    if (this.player.active && this.player.health < this.player.maxHealth * 0.3) {
        this.adrenalineActive = true;
        timeScale = 0.4; // O tempo passa a 40% da velocidade
    } else {
        this.adrenalineActive = false;
    }

    const safeDt = Math.min(dt, 50) * timeScale; // Capa o delta time pra evitar bugs de física se o PC travar
    this.time += safeDt;
    const tick = safeDt / 16; // Normaliza para ~1.0 em 60fps
    const dtSeconds = safeDt / 1000;
    
    // Stats Update
    if (!this.waveActive) {
        // Nada acontece feijoada
    } else {
        this.sessionStats.timePlayed += dtSeconds;
    }
    
    // Check Idle Achievement (AFK Strategy)
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
        this.comboCount = 0; // Perdeu o combo, noob
    }

    if (this.player.active) {
        this.manageOrbitals(stats);
    }

    // --- LÓGICA DE DASH ---
    if (this.isDashing) {
        this.dashDuration -= dtSeconds;
        this.dashTrailTimer -= dtSeconds;
        
        // Fricção monstra durante o dash pra parar rápido no final
        this.player.vel.x *= 0.95; 
        this.player.vel.y *= 0.95;

        // Dash Damage (Atropelamento)
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

        // Rastro fantasma
        if (this.dashTrailTimer <= 0) {
            this.particles.push({
                id: 'ghost',
                type: EntityType.PARTICLE,
                pos: { ...this.player.pos },
                vel: { x: 0, y: 0 },
                radius: this.player.radius,
                health: 1, maxHealth: 1,
                color: 'rgba(255, 255, 255, 0.3)',
                active: true,
                ttl: 10,
                damage: 0
            });
            this.dashTrailTimer = 0.03;
        }

        if (this.dashDuration <= 0) {
            this.isDashing = false;
            this.player.vel.x *= 0.5; // Freia no final
            this.player.vel.y *= 0.5;
        }
    }

    // Lógica da Onda (Spawn e Controle)
    if (this.waveActive && this.currentWaveIndex >= 0) {
      this.waveTimer += dtSeconds;
      const config = WAVES[Math.min(this.currentWaveIndex, WAVES.length - 1)];
      
      // Corrente sanguínea acelera com o tempo
      this.bloodFlow.x = this.bloodFlow.x * 0.95 + config.flowSpeed * 0.05;
      
      let spawnRateMod = 1.0;
      if (this.patient.strain === ViralStrain.SWARM) spawnRateMod = 0.5; 
      if (this.patient.strain === ViralStrain.TITAN) spawnRateMod = 1.5; 

      if (this.waveTimer < config.duration) {
          this.spawnTimer += safeDt;
          if (this.spawnTimer >= (config.spawnRate * spawnRateMod) && this.entities.length < this.MAX_ENTITIES) {
            this.spawnEnemy(config);
            this.spawnTimer = 0;
          }
      } else {
          // Hora do Boss
          if (config.hasBoss && !this.bossSpawned) {
              this.spawnBoss(config);
              this.bossSpawned = true;
              this.spawnText({x: CANVAS_WIDTH/2, y: CANVAS_HEIGHT/2}, "WARNING: BOSS", this.colors.BOSS, 60);
          }
      }
      
      // FEATURE: Minas Biológicas aleatórias (pra manter o jogador acordado)
      if (Math.random() < 0.005) { // 0.5% chance por tick
          const y = Math.random() * CANVAS_HEIGHT;
          this.entities.push({
              id: `mine_${Date.now()}`,
              type: EntityType.BIO_MINE,
              pos: { x: CANVAS_WIDTH + 50, y },
              vel: { x: -0.5, y: 0 },
              radius: 20,
              health: 10, maxHealth: 10, color: this.colors.BIO_MINE, damage: 150, active: true, drag: 0.1
          });
      }

      const enemiesRemaining = this.entities.some(e => this.isEnemy(e.type) || e.type === EntityType.BOSS);
      const bossRemaining = this.entities.some(e => e.type === EntityType.BOSS);
      
      // Wave Cleared Condition
      if (this.waveTimer >= config.duration && !enemiesRemaining && (!config.hasBoss || (this.bossSpawned && !bossRemaining))) {
        this.waveActive = false;
        
        // Verifica conquistas de performance na Wave
        if (this.currentWaveIndex === 0 && this.sessionStats.damageTaken === 0) {
            achievementManager.track('perfect_wave', 1);
        }
        if (this.player.health < this.player.maxHealth * 0.2) {
            achievementManager.track('low_hp_survive', 1);
        }
        if (this.currentWaveIndex === 4 && this.currentDifficulty === Difficulty.APEX) {
            achievementManager.track('win_apex', 1);
        }

        onWaveClear();
      }
    }

    // Lógica da ULT (Surge)
    if (this.surgeActive) {
      this.surgeRadius += 35 * tick;
      const effectiveRadius = this.surgeRadius * stats.surgeRadiusMult;
      
      // Empurra inimigos e dá dano
      this.entities.forEach(e => {
        if ((this.isEnemy(e.type) || e.type === EntityType.BOSS) && e.active) {
           const d = distSq(this.player.pos, e.pos);
           // Apenas na borda da explosão
           if (d < effectiveRadius * effectiveRadius && d > (effectiveRadius - 150) * (effectiveRadius - 150)) {
              const dx = e.pos.x - this.player.pos.x;
              const dy = e.pos.y - this.player.pos.y;
              const dist = Math.sqrt(d);
              e.vel.x += (dx/dist) * 25; // Knockback violento
              e.vel.y += (dy/dist) * 25;
              if (this.damageEnemy(e, 8, false, stats)) {
                  this.sessionStats.surgeKills++;
                  achievementManager.track('surge_kill_100', 1);
              }
           }
        }
      });
      if (this.surgeRadius > CANVAS_WIDTH * 1.5) this.surgeActive = false;
    }

    // Player Update
    if (this.player.active) {
      if (!this.isDashing) {
          const moveScale = this.adrenalineActive ? tick * 1.5 : tick; 

          this.player.vel.x += this.inputVector.x * stats.speed * 0.2 * moveScale; 
          this.player.vel.y += this.inputVector.y * stats.speed * 0.2 * moveScale;
          
          this.player.vel.x *= this.player.drag!;
          this.player.vel.y *= this.player.drag!;
          
          // Player também é afetado levemente pela correnteza
          this.player.pos.x += this.bloodFlow.x * 0.1 * tick;
      }

      this.player.pos.x += this.player.vel.x * tick;
      this.player.pos.y += this.player.vel.y * tick;

      // Paredes invisíveis (Boundaries)
      if (this.player.pos.x < this.player.radius) this.player.pos.x = this.player.radius;
      if (this.player.pos.x > CANVAS_WIDTH - this.player.radius) this.player.pos.x = CANVAS_WIDTH - this.player.radius;
      if (this.player.pos.y < this.player.radius) this.player.pos.y = this.player.radius;
      if (this.player.pos.y > CANVAS_HEIGHT - this.player.radius) this.player.pos.y = CANVAS_HEIGHT - this.player.radius;

      // Regeneração Passiva
      // NERF: Muito mais lento agora (2 segundos entre ticks, em vez de 1)
      this.regenTimer += safeDt;
      if (this.regenTimer > 2000 && stats.regen > 0) {
        this.player.health = Math.min(this.player.health + stats.regen, this.player.maxHealth);
        this.regenTimer = 0;
      }
      
      // Auto-Fire
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
      
      // Colisão com Poça de Ácido
      this.entities.forEach(e => {
          if (e.type === EntityType.ACID_POOL && e.active) {
              if (distSq(this.player.pos, e.pos) < (e.radius + this.player.radius - 10)**2) {
                  if (!this.isDashing) {
                      this.player.health -= 0.5 * tick; // DoT (Damage over Time)
                      this.sessionStats.damageTaken += 0.5 * tick;
                      if (Math.random() < 0.1) {
                          this.particles.push({
                              id: 'acid_burn', type: EntityType.PARTICLE, pos: {...this.player.pos},
                              vel: {x: 0, y: -2}, radius: 2, health: 1, maxHealth: 1, color: '#00ff00', damage: 0, active: true, ttl: 20
                          });
                      }
                  }
              }
          }
      });
    }

    // --- LOOP DE ENTIDADES ---
    // Aqui nós iteramos de trás pra frente pra poder deletar itens do array sem quebrar o índice.
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      if (!e.active) {
        this.entities.splice(i, 1);
        continue;
      }

      if (e.hitFlash && e.hitFlash > 0) e.hitFlash--;

      if (e.type !== EntityType.TEXT_POPUP) {
        const drag = e.drag ?? 0.5;
        // Boss resiste à correnteza
        const flowInfluence = (e.type === EntityType.ANTIBODY || e.type === EntityType.ACID_POOL) ? 0 : (e.type === EntityType.BOSS ? 0.1 : 1);
        
        e.pos.x += (e.vel.x + (this.bloodFlow.x * (1 - drag) * flowInfluence)) * tick;
        e.pos.y += (e.vel.y + (this.bloodFlow.y * (1 - drag) * flowInfluence)) * tick;
        
        if (e.type !== EntityType.ANTIBODY && e.type !== EntityType.ACID_POOL) {
          e.vel.x *= 0.95;
          e.vel.y *= 0.95;
        }
      } else {
        // Texto flutuante sobe e some
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

      // Colisões do Projétil
      if (e.type === EntityType.ANTIBODY) {
         if (this.isOutOfBounds(e.pos)) e.active = false;
         
         for (const other of this.entities) {
           // Acertou Mina?
           if (other.type === EntityType.BIO_MINE && other.active) {
               if (distSq(e.pos, other.pos) < (e.radius + other.radius)**2) {
                   e.active = false;
                   other.active = false;
                   this.sessionStats.mineKills++;
                   achievementManager.track('mine_pop_20', 1);
                   
                   // KABOOM
                   this.spawnText(other.pos, "BOOM!", this.colors.BIO_MINE, 40);
                   audioManager.playExplosion();
                   this.particles.push({
                        id: 'mine_expl', type: EntityType.PARTICLE, pos: {...other.pos},
                        vel: {x:0, y:0}, radius: 150, health:1, maxHealth:1, color: 'rgba(0, 255, 100, 0.4)', damage:0, active:true, ttl: 10
                   });
                   // Dano em Área (AoE)
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

           // Acertou Inimigo?
           if ((this.isEnemy(other.type) || other.type === EntityType.BOSS) && other.active) {
             const rSum = e.radius + other.radius;
             if (distSq(e.pos, other.pos) < rSum * rSum) {
               e.active = false;
               
               const comboMult = 1 + (this.comboCount * 0.1); 
               this.damageEnemy(other, e.damage * comboMult, true, stats);
               
               audioManager.playHit();
               
               // Partículas de impacto
               const angle = Math.atan2(e.vel.y, e.vel.x);
               for(let j=0; j<3; j++) {
                   this.particles.push({
                       id: 'spark', type: EntityType.PARTICLE, pos: {...e.pos}, 
                       vel: { x: Math.cos(angle + (Math.random()-0.5)) * 5, y: Math.sin(angle + (Math.random()-0.5)) * 5 },
                       radius: 2, health: 1, maxHealth: 1, color: '#fff', damage: 0, active: true, ttl: 10
                   });
               }
               break; 
             }
           }
         }

      } else if (this.isEnemy(e.type) || e.type === EntityType.BOSS) {
        // AI do Inimigo: Segue o jogador cegamente
        if (this.player.active) {
          const dx = this.player.pos.x - e.pos.x;
          const dy = this.player.pos.y - e.pos.y;
          const dMag = Math.sqrt(dx*dx + dy*dy);
          
          if (dMag > 0) {
            let speed = (0.5 + (this.currentWaveIndex * 0.1));
            speed *= 0.7; 
            
            // Modificadores de velocidade baseados na cepa viral
            speed *= this.difficultyMods.speed;
            if (this.patient.strain === ViralStrain.VOLATILE) speed *= 1.3;
            if (this.patient.strain === ViralStrain.TITAN) speed *= 0.7;
            
            if (e.type === EntityType.VIRUS) speed *= 1.4;
            if (e.isElite) speed *= 0.7;
            if (e.type === EntityType.BOSS) speed = 0.3; // Boss é lento mas mortal

            e.vel.x += (dx / dMag) * speed * tick;
            e.vel.y += (dy / dMag) * speed * tick;
          }

          // Colisão com o Jogador (Dano)
          const pSum = e.radius + this.player.radius;
          const isInvulnerable = this.isDashing; 
          
          if (dMag < pSum * 0.8 && !isInvulnerable) {
             // Dano de Espinhos (Thorns)
             if (stats.thorns > 0) {
                 this.damageEnemy(e, stats.thorns, false, stats);
             }

             let damage = e.type === EntityType.BOSS ? 20 : (e.isElite ? 2 : 0.5);
             damage *= this.difficultyMods.dmg;
             
             this.player.health -= damage;
             this.sessionStats.damageTaken += damage;
             
             this.shakeIntensity = e.type === EntityType.BOSS ? 20 : 8;
             this.screenShake = { x: (Math.random()-0.5)*10, y: (Math.random()-0.5)*10 };
             
             if (this.comboCount > 5) this.spawnText(this.player.pos, "COMBO LOST", this.colors.PARASITE, 20);
             this.comboCount = 0;

             // Empurra o inimigo levemente
             if (e.type === EntityType.BOSS) {
                 const dx = this.player.pos.x - e.pos.x;
                 const dy = this.player.pos.y - e.pos.y;
                 this.player.vel.x += dx * 0.1;
                 this.player.vel.y += dy * 0.1;
             }

             // Morte do Jogador
             if (this.player.health <= 0) {
               this.player.active = false;
               audioManager.stopMusic();
               achievementManager.track('die_10', 1);
               achievementManager.track('play_time_1h', Math.floor(this.sessionStats.timePlayed));
               achievementManager.track('play_time_5h', Math.floor(this.sessionStats.timePlayed));
               onGameOver();
             }
          }
        }
        
        // Remove inimigos que ficaram muito pra trás
        if (e.pos.x < -200 && e.type !== EntityType.BOSS) e.active = false; 

      } else if (e.type === EntityType.DNA_FRAGMENT) {
        // Coleta de Biomassa (Imã)
        if (this.player.active) {
          const dx = this.player.pos.x - e.pos.x;
          const dy = this.player.pos.y - e.pos.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          
          if (dist < stats.magnetRadius || this.surgeActive) {
            const speed = this.surgeActive ? 50 : 28;
            e.pos.x += (dx / dist) * speed * tick;
            e.pos.y += (dy / dist) * speed * tick;
            
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

    // Partículas (Purpurina digital)
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (p.id === 'mine_expl') {
          p.ttl = (p.ttl || 0) - 1;
          if (p.ttl <= 0) this.particles.splice(i, 1);
          continue;
      }
      
      p.pos.x += (p.vel.x + this.bloodFlow.x) * tick;
      p.pos.y += (p.vel.y + this.bloodFlow.y) * tick;
      p.vel.x *= 0.9; 
      p.vel.y *= 0.9;
      
      p.ttl = (p.ttl || 0) - 1;
      if (p.ttl <= 0) this.particles.splice(i, 1);
    }
    
    // Background infinito
    if (this.particles.length < 60) this.spawnBackgroundCell();
    
    this.shakeIntensity *= 0.9;
    if (this.shakeIntensity < 0.5) this.shakeIntensity = 0;
  }

  // --- LÓGICA DE SPAWN ---

  private spawnBoss(config: WaveConfig) {
      const x = CANVAS_WIDTH + 200;
      const y = CANVAS_HEIGHT / 2;
      
      let hp = 1500 * (1 + this.currentWaveIndex * 0.5);
      hp *= this.difficultyMods.hp;
      if (this.patient.strain === ViralStrain.TITAN) hp *= 1.5;

      this.entities.push({
          id: `BOSS_${Date.now()}`,
          type: EntityType.BOSS,
          pos: {x, y},
          vel: {x: -0.5, y: 0},
          radius: 120,
          health: hp,
          maxHealth: hp,
          color: this.colors.BOSS,
          damage: 50 * this.difficultyMods.dmg,
          active: true,
          drag: 0.1,
          isElite: true,
          value: 1000 * this.difficultyMods.score,
          hitFlash: 0
      });
  }

  private spawnEnemy(config: WaveConfig) {
    const type = config.enemyTypes[Math.floor(Math.random() * config.enemyTypes.length)];
    const x = CANVAS_WIDTH + 100; 
    const y = Math.random() * (CANVAS_HEIGHT - 100) + 50;
    const isElite = Math.random() < 0.12; 

    let stats = { r: 35, hp: 35, color: this.colors.BACTERIA, speed: 0.6 };
    if (type === EntityType.VIRUS) {
      stats = { r: 25, hp: 20, color: this.colors.VIRUS, speed: 2.2 };
    } else if (type === EntityType.PARASITE) {
      stats = { r: 55, hp: 120, color: this.colors.PARASITE, speed: 0.25 };
    }

    if (isElite) {
      stats.r *= 1.6;
      stats.hp *= 3.5;
      stats.speed *= 0.85;
    }

    stats.hp *= (1 + (this.currentWaveIndex * 0.35)); // Scaling da Wave
    
    // Scaling da dificuldade
    stats.hp *= this.difficultyMods.hp;
    if (this.patient.strain === ViralStrain.SWARM) stats.hp *= 0.6;
    if (this.patient.strain === ViralStrain.TITAN) { stats.hp *= 2.0; stats.r *= 1.2; }

    const initialVelX = -stats.speed * (Math.random() * 0.5 + 0.5);

    this.entities.push({
      id: `e_${Date.now()}_${Math.random()}`,
      type,
      pos: { x, y },
      vel: { x: initialVelX, y: 0 },
      radius: stats.r,
      health: stats.hp,
      maxHealth: stats.hp,
      color: stats.color,
      damage: (isElite ? 20 : 10) * this.difficultyMods.dmg,
      active: true,
      drag: 0.1, 
      isElite,
      value: (isElite ? 50 : 10) * this.difficultyMods.score,
      hitFlash: 0
    });
  }

  // A função que decide quem vive e quem morre
  private damageEnemy(enemy: Entity, dmg: number, canCrit: boolean, stats: PlayerStats): boolean {
    let finalDmg = dmg;
    let isCrit = false;

    // Rola o dado do Crítico
    if (canCrit && Math.random() < stats.critChance) {
        finalDmg *= stats.critMultiplier;
        isCrit = true;
        this.sessionStats.critHits++;
        achievementManager.track('crit_master', 1);
    }
    
    if (finalDmg > 500) achievementManager.track('overkill', 1);

    enemy.health -= finalDmg;
    enemy.hitFlash = 3; // Pisca branco por 3 frames
    enemy.vel.x += enemy.type === EntityType.BOSS ? 0.05 : 2; // Knockback

    // Números subindo (RPG style)
    const txtColor = isCrit ? '#ffff00' : '#fff';
    const txtSize = isCrit ? (finalDmg > 30 ? 40 : 28) : (finalDmg > 20 ? 32 : 20);
    this.spawnText({x: enemy.pos.x + (Math.random()-0.5)*20, y: enemy.pos.y - 20}, Math.floor(finalDmg).toString() + (isCrit ? "!" : ""), txtColor, txtSize);
    
    if (enemy.health <= 0) {
      enemy.active = false; // Morreu
      this.sessionStats.enemiesKilled++;
      
      // Farma conquistas
      achievementManager.track('kill_100', 1);
      achievementManager.track('kill_1000', 1);
      achievementManager.track('kill_5000', 1);
      achievementManager.track('kill_10000', 1);
      
      if (enemy.type === EntityType.BOSS) {
          this.sessionStats.bossesKilled++;
          achievementManager.track('boss_1', 1);
          achievementManager.track('boss_10', 1);
          achievementManager.track('boss_50', 1);
      }
      
      // FEATURE: Elite dropa ácido ao morrer
      if (enemy.isElite) {
          this.entities.push({
              id: `acid_${Date.now()}`,
              type: EntityType.ACID_POOL,
              pos: { ...enemy.pos },
              vel: { x: 0, y: 0 },
              radius: 60,
              health: 1, maxHealth: 1, color: this.colors.ACID_POOL, damage: 0, active: true, 
              ttl: 8 
          });
      }

      // Vampirismo
      if (isCrit && stats.lifesteal > 0) {
         this.player.health = Math.min(this.player.health + 2, this.player.maxHealth);
         this.spawnText(this.player.pos, "+HP", '#00ff00', 16);
      }

      this.comboCount++;
      if (this.comboCount > this.sessionStats.maxCombo) {
          this.sessionStats.maxCombo = this.comboCount;
          achievementManager.track('combo_50', this.comboCount);
      }
      this.comboTimer = this.COMBO_DURATION;
      const comboMult = 1 + (this.comboCount * 0.2); 

      this.score += Math.floor((enemy.isElite ? (enemy.type === EntityType.BOSS ? 5000 : 100) : 20) * comboMult);
      achievementManager.track('score_50k', this.score);
      
      audioManager.playExplosion();
      
      // Dropa dinheiro
      this.entities.push({
        id: `dna_${Math.random()}`,
        type: EntityType.DNA_FRAGMENT,
        pos: { ...enemy.pos },
        vel: { x: (Math.random()-0.5)*8, y: (Math.random()-0.5)*8 },
        radius: 12,
        health: 1, maxHealth: 1, color: this.colors.DNA, damage: 0, active: true, drag: 0.05, 
        // NERF: Limitando o ganho de biomassa com base no combo para evitar economia quebrada
        value: Math.ceil((enemy.value || 10) * Math.min(3, comboMult)), 
        isElite: enemy.isElite
      });
      
      // Sangue digital
      for(let i=0; i<12; i++) {
        const speed = Math.random() * 15;
        const angle = Math.random() * Math.PI * 2;
        this.particles.push({
          id: 'p', type: EntityType.PARTICLE,
          pos: { ...enemy.pos },
          vel: { x: Math.cos(angle)*speed, y: Math.sin(angle)*speed },
          radius: Math.random()*6, health: 1, maxHealth: 1, color: enemy.color, damage: 0, active: true, ttl: 40 + Math.random()*20
        });
      }
      
      if (this.comboCount % 10 === 0) {
          this.spawnText(this.player.pos, `${this.comboCount}X COMBO!`, this.colors.COMBO, 40);
      }
      return true;
    }
    return false;
  }

  private spawnBackgroundCell(randomX = false) {
    const startX = randomX ? Math.random() * CANVAS_WIDTH : CANVAS_WIDTH + 50;
    this.particles.push({
       id: 'bg', type: EntityType.PARTICLE,
       pos: { x: startX, y: Math.random() * CANVAS_HEIGHT },
       vel: { x: Math.random() * -3 - 1, y: 0 },
       radius: 20 + Math.random() * 60,
       health: 1, maxHealth: 1,
       color: this.colors.BLOOD_PARTICLE,
       damage: 0, active: true, ttl: 9999
    });
  }

  private spawnText(pos: Vector2, text: string, color: string, size: number = 24) {
    this.entities.push({
      id: text,
      type: EntityType.TEXT_POPUP,
      pos: { ...pos },
      vel: { x: (Math.random()-0.5)*2, y: -3 }, // Sobe devagar
      radius: size, health: 1, maxHealth: 1, color: color, damage: 0, active: true, ttl: 50
    });
  }
  
  private isOutOfBounds(pos: Vector2) {
    return pos.x < -100 || pos.x > CANVAS_WIDTH + 100 || pos.y < -100 || pos.y > CANVAS_HEIGHT + 100;
  }
  
  private isEnemy(t: EntityType) {
    return t === EntityType.BACTERIA || t === EntityType.VIRUS || t === EntityType.PARASITE;
  }

  private findTarget(): Entity | null {
    let closest: Entity | null = null;
    let minDistSq = Infinity;
    
    for (const e of this.entities) {
      if ((this.isEnemy(e.type) || e.type === EntityType.BOSS) && e.active) {
         if (e.pos.x > -200) { 
             const d = distSq(this.player.pos, e.pos);
             if (d < minDistSq) {
                 minDistSq = d;
                 closest = e;
             }
         }
      }
    }
    return closest;
  }

  private shoot(target: Entity, stats: PlayerStats) {
      const angle = Math.atan2(target.pos.y - this.player.pos.y, target.pos.x - this.player.pos.x);
      const count = stats.bulletCount;
      const spread = 0.15; // Em radianos
      
      const startAngle = angle - ((count - 1) * spread) / 2;

      for (let i = 0; i < count; i++) {
          const a = startAngle + (i * spread) + (Math.random() - 0.5) * 0.05;
          
          this.entities.push({
              id: `p_${Date.now()}_${i}`,
              type: EntityType.ANTIBODY,
              pos: { ...this.player.pos },
              vel: { 
                  x: Math.cos(a) * stats.bulletSpeed, 
                  y: Math.sin(a) * stats.bulletSpeed 
              },
              radius: 5,
              health: 1, 
              maxHealth: 1,
              color: this.colors.ANTIBODY,
              damage: stats.damage,
              active: true,
              ttl: 120 
          });
      }
      this.sessionStats.bulletsFired += count;
      audioManager.playShoot();
      
      // Recuo (Recoil)
      this.player.vel.x -= Math.cos(angle) * 0.5;
      this.player.vel.y -= Math.sin(angle) * 0.5;
  }

  // --- RENDERER (O Artista) ---
  public draw() {
    this.ctx.fillStyle = this.colors.BG;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Efeito de Aberração Cromática quando tem adrenalina
    const aberration = this.adrenalineActive || this.surgeActive;
    if (aberration) {
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'screen';
        this.ctx.translate(-2, 0); 
        this.ctx.fillStyle = 'rgba(255,0,0,0.1)';
        this.ctx.fillRect(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);
        this.ctx.restore();
    }

    this.ctx.save();
    
    // Screen Shake (Terremoto)
    if (this.shakeIntensity > 0) {
      const sx = (Math.random() - 0.5) * this.shakeIntensity;
      const sy = (Math.random() - 0.5) * this.shakeIntensity;
      this.ctx.translate(sx, sy);
    }

    // Desenha o Surge (Onda de choque)
    if (this.surgeActive) {
      this.ctx.beginPath();
      this.ctx.arc(this.player.pos.x, this.player.pos.y, this.surgeRadius, 0, Math.PI * 2);
      this.ctx.strokeStyle = this.colors.SURGE;
      this.ctx.lineWidth = 20;
      this.ctx.stroke();
      this.ctx.fillStyle = `rgba(0, 255, 255, 0.1)`;
      this.ctx.fill();
    }

    // Renderiza partículas
    this.particles.forEach(p => {
      if (p.id === 'ghost') {
          this.ctx.fillStyle = p.color;
          this.ctx.beginPath();
          this.ctx.ellipse(p.pos.x, p.pos.y, p.radius * 1.5, p.radius * 0.6, 0, 0, Math.PI*2);
          this.ctx.fill();
      } else if (p.id === 'mine_expl') {
          this.ctx.fillStyle = p.color;
          this.ctx.beginPath();
          this.ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI*2);
          this.ctx.fill();
      } else {
        this.ctx.globalAlpha = p.id === 'bg' ? 0.3 : (p.ttl! / 20); // Fade out
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
        this.ctx.fill();
      }
    });
    this.ctx.globalAlpha = 1.0;

    // Renderiza Entidades
    this.entities.forEach(e => {
      // Acid Pool
      if (e.type === EntityType.ACID_POOL) {
          this.ctx.fillStyle = this.colors.ACID_POOL;
          this.ctx.globalAlpha = 0.4 + Math.sin(this.time/200)*0.1;
          this.ctx.beginPath();
          this.ctx.arc(e.pos.x, e.pos.y, e.radius, 0, Math.PI*2);
          this.ctx.fill();
          
          this.ctx.strokeStyle = '#228800';
          this.ctx.lineWidth = 2;
          this.ctx.setLineDash([5, 5]);
          this.ctx.stroke();
          this.ctx.setLineDash([]);
          this.ctx.globalAlpha = 1.0;
      }
      // Bio Mine
      else if (e.type === EntityType.BIO_MINE) {
          this.ctx.fillStyle = this.colors.BIO_MINE;
          this.ctx.shadowBlur = 10;
          this.ctx.shadowColor = this.colors.BIO_MINE;
          this.ctx.beginPath();
          // Forma espinhosa
          const spikes = 8;
          for(let i=0; i<spikes*2; i++) {
              const r = i % 2 === 0 ? e.radius : e.radius * 0.6;
              const a = (i / (spikes*2)) * Math.PI*2 + (this.time/1000);
              this.ctx.lineTo(e.pos.x + Math.cos(a)*r, e.pos.y + Math.sin(a)*r);
          }
          this.ctx.closePath();
          this.ctx.fill();
          
          this.ctx.fillStyle = '#003300';
          this.ctx.beginPath();
          this.ctx.arc(e.pos.x, e.pos.y, e.radius*0.3, 0, Math.PI*2);
          this.ctx.fill();
          this.ctx.shadowBlur = 0;
      }
      // Dinheiro
      else if (e.type === EntityType.DNA_FRAGMENT) {
        this.ctx.fillStyle = e.isElite ? this.colors.ELITE_GLOW : this.colors.DNA;
        this.ctx.shadowBlur = e.isElite ? 20 : 5;
        this.ctx.shadowColor = this.ctx.fillStyle;
        this.ctx.beginPath();
        const s = e.radius;
        this.ctx.save();
        this.ctx.translate(e.pos.x, e.pos.y);
        this.ctx.rotate(this.time / 200);
        this.ctx.fillRect(-s/2, -s/2, s, s);
        this.ctx.restore();
        this.ctx.shadowBlur = 0;
      }
      
      // Orbitais
      if (e.type === EntityType.ORBITAL) {
          this.ctx.strokeStyle = this.colors.ORBITAL;
          this.ctx.lineWidth = 2;
          this.ctx.beginPath();
          this.ctx.arc(e.pos.x, e.pos.y, e.radius, 0, Math.PI*2);
          this.ctx.stroke();
          
          this.ctx.fillStyle = '#fff';
          this.ctx.beginPath();
          this.ctx.arc(e.pos.x, e.pos.y, e.radius/2, 0, Math.PI*2);
          this.ctx.fill();
          
          // Cordão umbilical de energia
          this.ctx.beginPath();
          this.ctx.moveTo(this.player.pos.x, this.player.pos.y);
          this.ctx.lineTo(e.pos.x, e.pos.y);
          this.ctx.strokeStyle = `rgba(0, 136, 255, 0.1)`;
          this.ctx.stroke();
      }
    });

    // Renderiza Inimigos
    this.entities.forEach(e => {
      if (this.isEnemy(e.type) || e.type === EntityType.BOSS) {
        this.ctx.save();
        this.ctx.translate(e.pos.x, e.pos.y);
        
        // Aura de Elite/Boss
        if (e.isElite || e.type === EntityType.BOSS) {
           const color = e.type === EntityType.BOSS ? this.colors.BOSS : this.colors.ELITE_GLOW;
           this.ctx.shadowBlur = 20;
           this.ctx.shadowColor = color;
           this.ctx.strokeStyle = color;
           this.ctx.lineWidth = 3;
           this.ctx.beginPath();
           this.ctx.arc(0, 0, e.radius + 5, 0, Math.PI*2);
           this.ctx.stroke();
        }

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
             this.ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
           }
           this.ctx.closePath();
        } else {
           const pulses = Math.sin(this.time/100) * 5;
           this.ctx.arc(0, 0, e.radius + pulses, 0, Math.PI*2);
        }
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.restore();
      }
    });

    // Renderiza Player
    if (this.player.active) {
      this.ctx.shadowBlur = this.isDashing ? 30 : 15;
      this.ctx.shadowColor = this.isDashing ? this.colors.PLAYER_CORE : this.colors.PLAYER;
      this.ctx.fillStyle = this.isDashing ? this.colors.PLAYER_CORE : this.colors.PLAYER;
      this.ctx.beginPath();
      // Efeito de "gelatina"
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
      this.ctx.shadowBlur = 0;
    }

    // Renderiza Projéteis (Rastros)
    this.ctx.strokeStyle = this.colors.ANTIBODY;
    this.ctx.lineWidth = 4;
    this.ctx.lineCap = 'round';
    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = this.colors.ANTIBODY;
    this.ctx.beginPath();
    this.entities.forEach(e => {
       if (e.type === EntityType.ANTIBODY) {
         this.ctx.moveTo(e.pos.x, e.pos.y);
         const tailX = e.pos.x - e.vel.x * 0.4; 
         const tailY = e.pos.y - e.vel.y * 0.4;
         this.ctx.lineTo(tailX, tailY);
       }
    });
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;

    // Renderiza Textos Flutuantes
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
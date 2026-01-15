/**
 * ------------------------------------------------------------------
 * COPYRIGHT (c) 2026 ESTÚDIO CRIA
 * DIRETOR: PAULO GABRIEL DE L. S.
 * ------------------------------------------------------------------
 * 
 * A LEI E A ORDEM (TYPES)
 * 
 * Aqui definimos o que é o quê. TypeScript é a única coisa impedindo 
 * este código de virar uma sopa de letrinhas caótica.
 * 
 * Se o TS reclamar, ele provavelmente está certo e você está errado.
 * Aceite a dor.
 */

// Geometria básica. Se você reprovou em matemática, sinto muito.
export type Vector2 = { x: number; y: number };

// O elenco do nosso show de horrores biológico.
export enum EntityType {
  PLAYER,         // Você (espero)
  BACTERIA,       // O mob básico, bucha de canhão
  VIRUS,          // Rápido e chato
  PARASITE,       // Tanque de carne
  ANTIBODY,       // Sua munição
  DNA_FRAGMENT,   // Dinheiro (biomassa)
  PARTICLE,       // Efeitos visuais para fritar a GPU
  TEXT_POPUP,     // Números de dano subindo
  BOSS,           // O cara que vai te matar
  ORBITAL,        // Seus amigos robôs
  BIO_MINE,       // Cabum
  ACID_POOL       // O chão é lava (ácido)
}

// A Máquina de Estados Finita (ou quase isso) do jogo.
export enum GameState {
  MENU,
  SETTINGS,
  CONTROLS,
  MANUAL,       // RTFM (Read The F* Manual)
  CREDITS,
  BRIEFING,     // Tela de "Prepare-se"
  BIO_LAB,      // Loja de Upgrades
  PLAYING,      // Onde o filho chora e a mãe não vê
  WAVE_CLEARED, // Respirar fundo
  PAUSED_UPGRADE, // (Depreciado? Talvez. Mas tá aqui)
  GAME_OVER,    // Tela de derrota
  LOADOUT,      // Menu in-game
  ACHIEVEMENTS  // Menu de vaidade
}

// Suporte a i18n (Internationalization).
// "Por que não usou uma lib pronta?" Porque eu gosto de sofrer.
export type Language = 'EN' | 'PT' | 'ES';

// Níveis de masoquismo.
export enum Difficulty {
  EASY = 'TRIAGE',       // Jornalista de games
  NORMAL = 'RESIDENT',   // Ser humano normal
  HARD = 'SPECIALIST',   // Gamer
  APEX = 'APEX'          // Psicopata
}

// As variantes do vírus. Muda a lógica de spawn e stats.
export enum ViralStrain {
  STANDARD = 'STANDARD', // Vanilla
  SWARM = 'SWARM',       // Zerg Rush (muitos fracos)
  TITAN = 'TITAN',       // Poucos fortes
  VOLATILE = 'VOLATILE'  // Tudo explode ou corre muito
}

// Ficha do paciente. Apenas flavor text pra dar profundidade.
export interface PatientProfile {
  id: string;
  name: string;
  age: number;
  symptoms: string;
  strain: ViralStrain;
  difficultyMultiplier: number;
}

// A paleta de cores dinâmica.
// Usada para quando o jogador "Platina" o jogo e desbloqueia o tema Dourado.
// É basicamente um CSS-in-JS glorificado e tipado.
export interface ThemePalette {
  BG: string;
  PLAYER: string;
  PLAYER_CORE: string;
  BACTERIA: string;
  VIRUS: string;
  PARASITE: string;
  BOSS: string;
  ELITE_GLOW: string;
  ANTIBODY: string;
  DNA: string;
  BLOOD_PARTICLE: string;
  UI_ACCENT: string;
  SURGE: string;
  COMBO: string;
  ORBITAL: string;
  BIO_MINE: string;
  ACID_POOL: string;
}

// A entidade genérica que popula o GameEngine.
// Tudo que se move (e algumas coisas que não) é uma Entity.
export interface Entity {
  id: string;
  type: EntityType;
  pos: Vector2;
  vel: Vector2;
  radius: number;
  health: number;
  maxHealth: number;
  color: string;
  damage: number;
  active: boolean; // Se false, o Garbage Collector do jogo deleta no próximo frame
  angle?: number;
  ttl?: number;    // Time To Live (para partículas)
  drag?: number;   // Fricção do fluido
  value?: number;  // Quanto vale em pontos/biomassa
  isElite?: boolean; // Se brilha e tem mais vida
  hitFlash?: number; // Frames restantes piscando branco
  orbitOffset?: number; // Para orbitais girarem bonitinho
}

// Os números que definem se você é um deus ou um inseto.
export interface PlayerStats {
  speed: number;
  fireRate: number; // Em ms (menor é mais rápido)
  damage: number;
  bulletSpeed: number;
  bulletCount: number; // Multishot
  magnetRadius: number;
  maxHealth: number;
  regen: number;
  maxEnergy: number;
  dashSpeed: number;
  dashCooldown: number;
  critChance: number;     // 0.0 a 1.0
  critMultiplier: number; // Ex: 1.5x
  orbitals: number;
  thorns: number;         // Dano ao contato
  lifesteal: number;      // Vampirismo
  dashDamage: number;     // Atropelamento
  surgeRadiusMult: number; // Tamanho da explosão da Ult
}

// Definição de um item da loja.
export interface Upgrade {
  id: string;
  nameKey: string; // Chave de tradução
  descKey: string;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'; // Cores e probabilidade (mentira, é fixo na loja por enquanto)
  baseCost: number;
  costMultiplier: number; // Inflação progressiva
  level: number;
  maxLevel: number;
  apply: (stats: PlayerStats) => PlayerStats; // A mágica que altera os stats
}

// Configuração de cada fase.
export interface WaveConfig {
  waveNumber: number;
  duration: number; // Segundos
  spawnRate: number; // Ms entre inimigos
  enemyTypes: EntityType[]; // Pool de spawn
  flowSpeed: number; // Velocidade da corrente sanguínea (empurra tudo pra esquerda)
  hasBoss: boolean; 
}

// Sistema de Conquistas (A cenoura na frente do burro).
export interface Achievement {
  id: string;
  icon: string; // Emoji ou char
  titleKey: string; // Chave de tradução
  descKey: string;  // Chave de tradução
  targetValue: number; // Meta (ex: 1000 kills)
  isCumulative: boolean; // true = acumula entre runs, false = tem que fazer numa só vida
  secret?: boolean; // Shhh
}

// O que salvamos no LocalStorage do navegador.
export interface AchievementProgress {
  [id: string]: {
    unlocked: boolean;
    currentValue: number;
    unlockedAt?: number;
  }
}
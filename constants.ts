/**
 * ------------------------------------------------------------------
 * COPYRIGHT (c) 2024 ESTÚDIO CRIA
 * DIRETOR: PAULO GABRIEL DE L. S.
 * ------------------------------------------------------------------
 * 
 * BEM-VINDO AO DNA DO JOGO.
 * 
 * Aqui residem as constantes universais. Se você mudar a gravidade aqui,
 * o jogo quebra. Se mudar as cores, o designer chora.
 * Mexa com cautela, ou o linter vai te julgar.
 */

import { Upgrade, EntityType, WaveConfig, Language, Difficulty, Achievement, ThemePalette } from './types';

// --- PALETA DE CORES ---
// O tema padrão é "Biopunk Sangrento". Vermelho, Ciano, Roxo.
// A vibe é: "Você está dentro de alguém e esse alguém não está tendo um bom dia".
export const COLORS_DEFAULT: ThemePalette = {
  BG: '#1a0505',
  PLAYER: '#ffffff', // O glóbulo branco herói
  PLAYER_CORE: '#00ffff', // O núcleo de nanotecnologia (porque sim)
  BACTERIA: '#77dd77', // Verde clássico de "coisa ruim"
  VIRUS: '#ff00ff', // Magenta pra ser irritante
  PARASITE: '#ff3333', // Vermelho "pare de me bater"
  BOSS: '#880000', 
  ELITE_GLOW: '#ffd700', // Brilho de elite (vulgo: inimigo bombado)
  ANTIBODY: '#00ffff', // Tiro
  DNA: '#ffeeaa', // Moedinha do jogo
  BLOOD_PARTICLE: '#3a0a0a', // Sangue ambiente
  UI_ACCENT: '#ff4444',
  SURGE: 'rgba(0, 255, 255, 0.3)', // A ult
  COMBO: '#ffaa00',
  ORBITAL: '#0088ff',
  BIO_MINE: '#00ff44',
  ACID_POOL: '#33ff00' // Aquele ácido de videogame dos anos 90
};

// --- MODO PLATINA (ASCENDED) ---
// Se o jogador for maluco o suficiente para platinar o jogo, ele ganha isso.
// É uma paleta "Divina/Real". Dourado, Roxo Profundo, Branco.
// Basicamente transformamos o jogo em um clipe de hip-hop ostentação sci-fi.
export const COLORS_PLATINUM: ThemePalette = {
  BG: '#0a0a1a', 
  PLAYER: '#ffffff',
  PLAYER_CORE: '#ffd700', // Ouro puro
  BACTERIA: '#b39ddb', 
  VIRUS: '#80deea', 
  PARASITE: '#f48fb1', 
  BOSS: '#ffd700', 
  ELITE_GLOW: '#ffffff', 
  ANTIBODY: '#ffd700', // Tiros de ouro
  DNA: '#e1bee7', 
  BLOOD_PARTICLE: '#1a1a2e', 
  UI_ACCENT: '#ffd700', 
  SURGE: 'rgba(255, 215, 0, 0.3)', 
  COMBO: '#ffffff',
  ORBITAL: '#ffd700',
  BIO_MINE: '#ff4081',
  ACID_POOL: '#7c4dff'
};

export const CANVAS_WIDTH = 1920; // Full HD é o padrão, o resto a gente escala na marreta
export const CANVAS_HEIGHT = 1080;

// Status iniciais do "Heroi". 
// Se deixar muito fraco, o jogador desiste. Se deixar muito forte, ele enjoa.
// O equilíbrio é uma arte (que eu chutei valores até ficar bom).
export const INITIAL_STATS = {
  speed: 4.5,
  fireRate: 280, // Milissegundos entre tiros
  damage: 25,
  bulletSpeed: 18, 
  bulletCount: 1,
  magnetRadius: 180, // Alcance pra pegar dinheiro sem encostar
  maxHealth: 100,
  regen: 1,
  maxEnergy: 100, // Pra ultar
  dashSpeed: 25, 
  dashCooldown: 1000,
  critChance: 0.05,
  critMultiplier: 1.5,
  orbitals: 0,
  thorns: 0,
  lifesteal: 0,
  dashDamage: 0,
  surgeRadiusMult: 1.0
};

// Multiplicadores de dificuldade.
// APEX é para quem gosta de sofrer.
export const DIFFICULTY_MODIFIERS = {
  [Difficulty.EASY]: { hp: 0.7, dmg: 0.6, speed: 0.8, score: 0.5 },
  [Difficulty.NORMAL]: { hp: 1.0, dmg: 1.0, speed: 1.0, score: 1.0 },
  [Difficulty.HARD]: { hp: 1.5, dmg: 1.5, speed: 1.2, score: 1.5 },
  [Difficulty.APEX]: { hp: 2.5, dmg: 2.0, speed: 1.4, score: 2.5 }
};

// Nomes procedurais para dar uma "personalidade" ao cadáver... digo, paciente.
export const PATIENT_NAMES_FIRST = ["J.", "A.", "M.", "K.", "R.", "S.", "T.", "L.", "C.", "B."];
export const PATIENT_NAMES_LAST = ["Doe", "Smith", "Neo", "Kovac", "Vane", "Ross", "Cole", "Drake", "Pike", "Ward"];

export const SYMPTOMS_KEYS = [
  "SYMPTOM_SEPTIC", "SYMPTOM_VIRAL", "SYMPTOM_NECROTIC", "SYMPTOM_CYTOKINE", 
  "SYMPTOM_FAILURE", "SYMPTOM_TOXICITY", "SYMPTOM_DECAY", "SYMPTOM_MUTATION"
];

// --- LISTA DE CONQUISTAS ---
// O vício em forma de lista JSON.
// Se adicionar mais, lembre de criar ícones bonitinhos.
export const ACHIEVEMENTS_LIST: Achievement[] = [
    // Kill Counts (Cumulative)
    { id: 'kill_100', icon: '🦠', title: 'Cleaner', desc: 'Eliminate 100 pathogens.', targetValue: 100, isCumulative: true },
    { id: 'kill_1000', icon: '🧹', title: 'Sterilizer', desc: 'Eliminate 1,000 pathogens.', targetValue: 1000, isCumulative: true },
    { id: 'kill_5000', icon: '🔥', title: 'Eradicator', desc: 'Eliminate 5,000 pathogens.', targetValue: 5000, isCumulative: true },
    { id: 'kill_10000', icon: '💀', title: 'Extinction Event', desc: 'Eliminate 10,000 pathogens.', targetValue: 10000, isCumulative: true },
    
    // Bosses
    { id: 'boss_1', icon: '👾', title: 'Anomaly Neutralized', desc: 'Defeat your first Boss.', targetValue: 1, isCumulative: true },
    { id: 'boss_10', icon: '👹', title: 'Titan Slayer', desc: 'Defeat 10 Bosses.', targetValue: 10, isCumulative: true },
    { id: 'boss_50', icon: '👑', title: 'King of Veins', desc: 'Defeat 50 Bosses.', targetValue: 50, isCumulative: true },

    // Mechanics
    { id: 'dash_kill_50', icon: '⚡', title: 'Roadkill', desc: 'Kill 50 enemies using Dash damage.', targetValue: 50, isCumulative: true },
    { id: 'surge_kill_100', icon: '🌊', title: 'Tsunami', desc: 'Kill 100 enemies with Surge blasts.', targetValue: 100, isCumulative: true },
    { id: 'mine_pop_20', icon: '💣', title: 'Minesweeper', desc: 'Detonate 20 Bio-Mines.', targetValue: 20, isCumulative: true },
    { id: 'biomass_10k', icon: '💎', title: 'Hoarder', desc: 'Collect 10,000 total Biomass.', targetValue: 10000, isCumulative: true },
    
    // Single Run Challenges
    { id: 'wave_5', icon: '🖐', title: 'Survivor', desc: 'Reach Wave 5.', targetValue: 5, isCumulative: false },
    { id: 'wave_10', icon: '🧗', title: 'Deep Dive', desc: 'Reach Wave 10 (Endless Mode).', targetValue: 10, isCumulative: false },
    { id: 'score_50k', icon: '📈', title: 'High Score', desc: 'Reach 50,000 Score in one run.', targetValue: 50000, isCumulative: false },
    { id: 'combo_50', icon: '⛓', title: 'Flow State', desc: 'Reach a 50x Combo.', targetValue: 50, isCumulative: false },
    { id: 'max_hp_200', icon: '❤️', title: 'Juggernaut', desc: 'Reach 200 Max HP in a run.', targetValue: 200, isCumulative: false },
    { id: 'fire_rate_max', icon: '🔫', title: 'Minigun', desc: 'Max out Fire Rate upgrade.', targetValue: 1, isCumulative: false }, // Special check
    
    // Skill / Specific
    { id: 'perfect_wave', icon: '✨', title: 'Untouchable', desc: 'Complete a wave without taking damage.', targetValue: 1, isCumulative: true },
    { id: 'low_hp_survive', icon: '🚑', title: 'Adrenaline Junkie', desc: 'Clear a wave with < 20% HP.', targetValue: 1, isCumulative: true },
    { id: 'crit_master', icon: '🎯', title: 'Surgical Precision', desc: 'Land 1,000 Critical Hits.', targetValue: 1000, isCumulative: true },
    
    // Collection
    { id: 'unlock_all_upgrades', icon: '🧬', title: 'Genetic Perfection', desc: 'Buy every type of upgrade at least once (Cumulative).', targetValue: 12, isCumulative: true },
    
    // Hardcore
    { id: 'win_apex', icon: '🏆', title: 'Apex Predator', desc: 'Clear Wave 5 on APEX difficulty.', targetValue: 1, isCumulative: false },
    { id: 'die_10', icon: '⚰️', title: 'Trial and Error', desc: 'Die 10 times.', targetValue: 10, isCumulative: true },
    
    // Secrets
    { id: 'afk', icon: '🗿', title: 'Statue', desc: 'Stand still for 10 seconds in combat.', targetValue: 10, isCumulative: false, secret: true },
    { id: 'pacifist', icon: '🕊', title: 'Pacifist', desc: 'Survive 30 seconds without shooting.', targetValue: 30, isCumulative: false, secret: true },
    { id: 'overkill', icon: '💥', title: 'Overkill', desc: 'Deal over 500 damage in a single hit.', targetValue: 1, isCumulative: true },
    { id: 'rich', icon: '💰', title: 'Tycoon', desc: 'Hold 3,000 Biomass at once.', targetValue: 3000, isCumulative: false },
    
    // The Big Ones
    { id: 'play_time_1h', icon: '⏳', title: 'Intern', desc: 'Play for 1 hour (Total).', targetValue: 3600, isCumulative: true },
    { id: 'play_time_5h', icon: '👨‍⚕️', title: 'Specialist', desc: 'Play for 5 hours (Total).', targetValue: 18000, isCumulative: true },
    { id: 'all_achievements', icon: '💠', title: 'THE APEX VIRUS', desc: 'Unlock all other achievements.', targetValue: 1, isCumulative: true, secret: true }
];

// --- TRADUÇÕES ---
// Porque o mundo não fala só Inglês.
// E meu portunhol é excelente.

type TranslationMap = {
  [key in Language]: {
    [key: string]: string;
  };
};

export const TEXTS: TranslationMap = {
  EN: {
    TITLE_MAIN: "VITAL",
    TITLE_SUB: "RUSH",
    START: "INJECT",
    SETTINGS: "CONFIG",
    CONTROLS: "CONTROLS",
    MANUAL: "DATABASE",
    CREDITS: "CREDITS",
    LANG: "LANGUAGE",
    BACK: "RETURN",
    PAUSED: "SYSTEM PAUSED",
    RESUME: "RESUME",
    ABORT: "ABORT MISSION",
    GAME_OVER: "PATIENT LOST",
    RETRY: "NEXT PATIENT",
    WAVE: "WAVE",
    SCORE: "SCORE",
    CLEARED: "STABILIZED",
    NEXT: "NEXT SECTOR",
    MUTATION: "BIO-LAB",
    SELECT_DNA: "SPEND BIOMASS TO EVOLVE",
    SURGE_READY: "SURGE",
    DEPLOY: "DEPLOY",
    BRIEFING: "PATIENT CHART",
    BOSS_WARNING: "ANOMALY DETECTED",
    OPEN_SHOP: "OPEN BIO-LAB",
    PURCHASE: "EVOLVE",
    COST: "COST",
    MAXED: "MAX",
    COMBO: "COMBO",
    DASH: "DASH",
    DIFFICULTY: "RISK LEVEL",
    PATIENT: "SUBJECT",
    STRAIN: "STRAIN",
    BIOMASS_AVAIL: "BIOMASS AVAILABLE",
    AUDIO_LINK: "AUDIO LINK",
    STATUS_TERM: "STATUS: TERMINATED",
    INTEGRITY: "INTEGRITY",
    ADRENALINE: "ADRENALINE ACTIVE",
    LOADOUT: "ACTIVE GENOME",
    ACHIEVEMENTS: "ACHIEVEMENTS",
    ACH_LOCKED: "LOCKED",
    ACH_PROGRESS: "PROGRESS",
    ACH_PLATINUM_MSG: "SYSTEM OVERRIDE: APEX MODE ENGAGED. VISUALS EVOLVED.",
    DIFF_TRIAGE: "TRIAGE",
    DIFF_RESIDENT: "RESIDENT",
    DIFF_SPECIALIST: "SPECIALIST",
    DIFF_APEX: "APEX",
    CTRL_MOVE: "MOVEMENT",
    CTRL_MOVE_DESC: "WASD / ARROWS / TOUCH JOYSTICK",
    CTRL_DASH: "DASH / EVADE",
    CTRL_DASH_DESC: "SHIFT / E / TOUCH BUTTON",
    CTRL_SURGE: "SURGE ULTIMATE",
    CTRL_SURGE_DESC: "SPACE / TOUCH BUTTON",
    CTRL_NOTE: "AUTO-FIRE IS ALWAYS ENGAGED",
    MANUAL_HOSTILES: "HOSTILES",
    MANUAL_STRAINS: "VIRAL STRAINS",
    MANUAL_MECHANICS: "BATTLE MECHANICS",
    MANUAL_BAC_DESC: "Standard pathogen. Common, predictable movement.",
    MANUAL_VIR_DESC: "Fast attacker. Low HP but swarms quickly.",
    MANUAL_PAR_DESC: "Heavy tank. Slow, high HP, absorbs damage.",
    MANUAL_BOSS_DESC: "Massive anomaly. Requires extreme firepower.",
    MANUAL_MECH_DASH_TITLE: "Evasive Dash",
    MANUAL_MECH_DASH_DESC: "Grants momentary invulnerability. Use to pass through enemies.",
    MANUAL_MECH_SURGE_TITLE: "Surge System",
    MANUAL_MECH_SURGE_DESC: "Push enemies back and MAGNETIZE all biomass instantly.",
    MANUAL_MECH_COMBO_TITLE: "Combo Chain",
    MANUAL_MECH_COMBO_DESC: "Kill fast to increase score multiplier. Taking damage resets combo.",
    STRAIN_STANDARD: "STANDARD PATHOGEN",
    STRAIN_SWARM: "SWARM CLUSTER",
    STRAIN_TITAN: "ARMORED TITAN",
    STRAIN_VOLATILE: "VOLATILE MUTATION",
    STRAIN_STD_DESC: "Baseline infection parameters.",
    STRAIN_SWM_DESC: "High enemy count, lower individual HP.",
    STRAIN_TTN_DESC: "Enemies have +100% HP. Slower spawns.",
    STRAIN_VOL_DESC: "Enemies move 30% faster. High aggression.",
    ROLE_DEV: "DEVELOPMENT",
    ROLE_DIR: "DIRECTOR",
    DEV_STUDIO: "ESTÚDIO CRIA",
    DIRECTOR: "PAULO GABRIEL DE L. S.",
    SYMPTOM_SEPTIC: "Septic Shock",
    SYMPTOM_VIRAL: "Unknown Viral Load",
    SYMPTOM_NECROTIC: "Necrotic Tissue",
    SYMPTOM_CYTOKINE: "Cytokine Storm",
    SYMPTOM_FAILURE: "Organ Failure",
    SYMPTOM_TOXICITY: "Blood Toxicity",
    SYMPTOM_DECAY: "Cellular Decay",
    SYMPTOM_MUTATION: "Rapid Mutation",
    // Upgrades
    UP_MITOSIS_NAME: "RAPID MITOSIS",
    UP_MITOSIS_DESC: "+10% Fire Rate",
    UP_MEMBRANE_NAME: "TITANIUM MEMBRANE",
    UP_MEMBRANE_DESC: "+30% Max HP & Full Heal",
    UP_ENZYME_NAME: "HYPER ENZYMES",
    UP_ENZYME_DESC: "+25% Damage",
    UP_MULTISHOT_NAME: "ADAPTIVE SPLIT",
    UP_MULTISHOT_DESC: "+1 Projectile, -10% Damage",
    UP_ENERGY_NAME: "MITOCHONDRIA BOOST",
    UP_ENERGY_DESC: "Surge & Dash recharge 20% faster",
    UP_GIGA_NAME: "CYTOKINE STORM",
    UP_GIGA_DESC: "+2 Proj, +20% Dmg, Full Heal",
    // NEW UPGRADES TRANSLATIONS
    UP_ORBITAL_NAME: "NANO-GUARDIANS",
    UP_ORBITAL_DESC: "Adds +1 Autonomous Defensive Drone",
    UP_DASH_NAME: "PLASMA TRAIL",
    UP_DASH_DESC: "Dash deals 50 Damage to enemies passed",
    UP_CRIT_NAME: "PRECISION OPTICS",
    UP_CRIT_DESC: "+15% Crit Chance, +0.5x Crit Dmg",
    UP_THORNS_NAME: "SPIKED CARAPACE",
    UP_THORNS_DESC: "Deals 10 Contact Dmg to attackers",
    UP_LIFE_NAME: "VAMPIRIC STRAIN",
    UP_LIFE_DESC: "Crit kills heal +2 HP",
    UP_MAGNET_NAME: "MAGNETIC FIELD",
    UP_MAGNET_DESC: "+30% Magnet Range & Surge Radius"
  },
  PT: {
    TITLE_MAIN: "VITAL",
    TITLE_SUB: "RUSH",
    START: "INJETAR",
    SETTINGS: "CONFIG",
    CONTROLS: "CONTROLES",
    MANUAL: "BANCO DE DADOS",
    CREDITS: "CRÉDITOS",
    LANG: "IDIOMA",
    BACK: "VOLTAR",
    PAUSED: "SISTEMA PAUSADO",
    RESUME: "RETOMAR",
    ABORT: "ABORTAR MISSÃO",
    GAME_OVER: "PACIENTE PERDIDO",
    RETRY: "PRÓXIMO PACIENTE",
    WAVE: "ONDA",
    SCORE: "PONTOS",
    CLEARED: "ESTABILIZADO",
    NEXT: "PRÓXIMO SETOR",
    MUTATION: "BIO-LABORATÓRIO",
    SELECT_DNA: "GASTAR BIOMASSA PARA EVOLUIR",
    SURGE_READY: "SURTO",
    DEPLOY: "IMPLANTAR",
    BRIEFING: "PRONTUÁRIO",
    BOSS_WARNING: "ANOMALIA DETECTADA",
    OPEN_SHOP: "ABRIR BIO-LAB",
    PURCHASE: "EVOLUIR",
    COST: "CUSTO",
    MAXED: "MÁX",
    COMBO: "COMBO",
    DASH: "ESQUIVA",
    DIFFICULTY: "NÍVEL DE RISCO",
    PATIENT: "SUJEITO",
    STRAIN: "CEPA",
    BIOMASS_AVAIL: "BIOMASSA DISPONÍVEL",
    AUDIO_LINK: "LINK DE ÁUDIO",
    STATUS_TERM: "STATUS: TERMINADO",
    INTEGRITY: "INTEGRIDADE",
    ADRENALINE: "ADRENALINA ATIVA",
    LOADOUT: "GENOMA ATIVO",
    ACHIEVEMENTS: "CONQUISTAS",
    ACH_LOCKED: "BLOQUEADO",
    ACH_PROGRESS: "PROGRESSO",
    ACH_PLATINUM_MSG: "SOBREPOSIÇÃO DE SISTEMA: MODO APEX ATIVADO. VISUAIS EVOLUÍDOS.",
    DIFF_TRIAGE: "TRIAGEM",
    DIFF_RESIDENT: "RESIDENTE",
    DIFF_SPECIALIST: "ESPECIALISTA",
    DIFF_APEX: "APEX",
    CTRL_MOVE: "MOVIMENTO",
    CTRL_MOVE_DESC: "WASD / SETAS / JOYSTICK NA TELA",
    CTRL_DASH: "ESQUIVA RÁPIDA",
    CTRL_DASH_DESC: "SHIFT / E / BOTÃO NA TELA",
    CTRL_SURGE: "SURTO SUPREMO",
    CTRL_SURGE_DESC: "ESPAÇO / BOTÃO NA TELA",
    CTRL_NOTE: "DISPARO AUTOMÁTICO SEMPRE ATIVO",
    MANUAL_HOSTILES: "HOSTIS",
    MANUAL_STRAINS: "CEPAS VIRAIS",
    MANUAL_MECHANICS: "MECÂNICAS DE COMBATE",
    MANUAL_BAC_DESC: "Patógeno padrão. Movimento comum e previsível.",
    MANUAL_VIR_DESC: "Atacante rápido. Pouca vida, mas ataca em enxame.",
    MANUAL_PAR_DESC: "Tanque pesado. Lento, muita vida, absorve dano.",
    MANUAL_BOSS_DESC: "Anomalia massiva. Requer poder de fogo extremo.",
    MANUAL_MECH_DASH_TITLE: "Esquiva (Dash)",
    MANUAL_MECH_DASH_DESC: "Concede invulnerabilidade momentânea. Use para atravessar inimigos.",
    MANUAL_MECH_SURGE_TITLE: "Sistema de Surto",
    MANUAL_MECH_SURGE_DESC: "Empurra inimigos e MAGNETIZA toda biomassa instantaneamente.",
    MANUAL_MECH_COMBO_TITLE: "Corrente de Combo",
    MANUAL_MECH_COMBO_DESC: "Mate rápido para aumentar multiplicador. Levar dano zera o combo.",
    STRAIN_STANDARD: "PATÓGENO PADRÃO",
    STRAIN_SWARM: "ENXAME MASSIVO",
    STRAIN_TITAN: "TITÃ BLINDADO",
    STRAIN_VOLATILE: "MUTAÇÃO VOLÁTIL",
    STRAIN_STD_DESC: "Parâmetros basais de infecção.",
    STRAIN_SWM_DESC: "Alto número de inimigos, menos vida individual.",
    STRAIN_TTN_DESC: "Inimigos com +100% Vida. Spawns mais lentos.",
    STRAIN_VOL_DESC: "Inimigos movem 30% mais rápido. Alta agressão.",
    ROLE_DEV: "DESENVOLVIMENTO",
    ROLE_DIR: "DIRETOR",
    DEV_STUDIO: "ESTÚDIO CRIA",
    DIRECTOR: "PAULO GABRIEL DE L. S.",
    SYMPTOM_SEPTIC: "Choque Séptico",
    SYMPTOM_VIRAL: "Carga Viral Desconhecida",
    SYMPTOM_NECROTIC: "Tecido Necrótico",
    SYMPTOM_CYTOKINE: "Tempestade de Citocina",
    SYMPTOM_FAILURE: "Falência de Órgãos",
    SYMPTOM_TOXICITY: "Toxicidade Sanguínea",
    SYMPTOM_DECAY: "Decaimento Celular",
    SYMPTOM_MUTATION: "Mutação Rápida",
    // Upgrades
    UP_MITOSIS_NAME: "MITOSE RÁPIDA",
    UP_MITOSIS_DESC: "+10% Cadência de Tiro",
    UP_MEMBRANE_NAME: "MEMBRANA DE TITÂNIO",
    UP_MEMBRANE_DESC: "+30% Vida Máx & Cura Total",
    UP_ENZYME_NAME: "HIPER ENZIMAS",
    UP_ENZYME_DESC: "+25% Dano",
    UP_MULTISHOT_NAME: "DIVISÃO ADAPTATIVA",
    UP_MULTISHOT_DESC: "+1 Projétil, -10% Dano",
    UP_ENERGY_NAME: "IMPULSO MITOCONDRIAL",
    UP_ENERGY_DESC: "Surto e Esquiva recarregam 20% mais rápido",
    UP_GIGA_NAME: "TEMPESTADE CITOCINA",
    UP_GIGA_DESC: "+2 Proj, +20% Dano, Cura Total",
    // NEW
    UP_ORBITAL_NAME: "NANO-GUARDIÕES",
    UP_ORBITAL_DESC: "Adiciona +1 Drone de Defesa Autônomo",
    UP_DASH_NAME: "RASTRO DE PLASMA",
    UP_DASH_DESC: "Dash causa 50 de Dano ao atravessar inimigos",
    UP_CRIT_NAME: "ÓPTICA DE PRECISÃO",
    UP_CRIT_DESC: "+15% Chance Crítica, +0.5x Dano Crítico",
    UP_THORNS_NAME: "CARAPAÇA DE ESPINHOS",
    UP_THORNS_DESC: "Causa 10 de Dano ao ser tocado",
    UP_LIFE_NAME: "CEPA VAMPÍRICA",
    UP_LIFE_DESC: "Abates críticos curam +2 Vida",
    UP_MAGNET_NAME: "CAMPO MAGNÉTICO",
    UP_MAGNET_DESC: "+30% Alcance do Ímã e Tamanho do Surto"
  },
  ES: {
    TITLE_MAIN: "VITAL",
    TITLE_SUB: "RUSH",
    START: "INYECTAR",
    SETTINGS: "CONFIG",
    CONTROLS: "CONTROLES",
    MANUAL: "BASE DE DATOS",
    CREDITS: "CRÉDITOS",
    LANG: "IDIOMA",
    BACK: "VOLVER",
    PAUSED: "SISTEMA PAUSADO",
    RESUME: "REANUDAR",
    ABORT: "ABORTAR MISIÓN",
    GAME_OVER: "PACIENTE PERDIDO",
    RETRY: "SIGUIENTE PACIENTE",
    WAVE: "OLEADA",
    SCORE: "PUNTUACIÓN",
    CLEARED: "ESTABILIZADO",
    NEXT: "PRÓXIMO SECTOR",
    MUTATION: "BIO-LABORATORIO",
    SELECT_DNA: "GASTAR BIOMASA PARA EVOLUCIONAR",
    SURGE_READY: "SURGE",
    DEPLOY: "DESPLEGAR",
    BRIEFING: "EXPEDIENTE",
    BOSS_WARNING: "ANOMALÍA DETECTADA",
    OPEN_SHOP: "ABRIR BIO-LAB",
    PURCHASE: "EVOLUCIONAR",
    COST: "COSTO",
    MAXED: "MÁX",
    COMBO: "COMBO",
    DASH: "ESQUIVA",
    DIFFICULTY: "NIVEL DE RIESGO",
    PATIENT: "SUJETO",
    STRAIN: "CEPA",
    BIOMASS_AVAIL: "BIOMASA DISPONIBLE",
    AUDIO_LINK: "ENLACE DE AUDIO",
    STATUS_TERM: "ESTADO: TERMINADO",
    INTEGRITY: "INTEGRIDAD",
    ADRENALINE: "ADRENALINA ACTIVA",
    LOADOUT: "GENOMA ACTIVO",
    ACHIEVEMENTS: "LOGROS",
    ACH_LOCKED: "BLOQUEADO",
    ACH_PROGRESS: "PROGRESO",
    ACH_PLATINUM_MSG: "ANULACIÓN DEL SISTEMA: MODO APEX ACTIVADO. VISUALES EVOLUCIONADOS.",
    DIFF_TRIAGE: "TRIAJE",
    DIFF_RESIDENT: "RESIDENTE",
    DIFF_SPECIALIST: "ESPECIALISTA",
    DIFF_APEX: "APEX",
    CTRL_MOVE: "MOVIMIENTO",
    CTRL_MOVE_DESC: "WASD / FLECHAS / JOYSTICK TÁCTIL",
    CTRL_DASH: "ESQUIVA",
    CTRL_DASH_DESC: "SHIFT / E / BOTÓN TÁCTIL",
    CTRL_SURGE: "SURGE DEFINITIVA",
    CTRL_SURGE_DESC: "ESPACIO / BOTÓN TÁCTIL",
    CTRL_NOTE: "DISPARO AUTOMÁTICO SIEMPRE ACTIVO",
    MANUAL_HOSTILES: "HOSTILES",
    MANUAL_STRAINS: "CEPAS VIRALES",
    MANUAL_MECHANICS: "MECÁNICA DE BATALLA",
    MANUAL_BAC_DESC: "Patógeno estándar. Movimiento común y predecible.",
    MANUAL_VIR_DESC: "Atacante rápido. Poca vida, pero ataca en enjambre.",
    MANUAL_PAR_DESC: "Tanque pesado. Lento, mucha vida, absorve daño.",
    MANUAL_BOSS_DESC: "Anomalía masiva. Requiere potencia de fuego extrema.",
    MANUAL_MECH_DASH_TITLE: "Evasión (Dash)",
    MANUAL_MECH_DASH_DESC: "Otorga invulnerabilidad momentánea. Úsalo para atravesar enemigos.",
    MANUAL_MECH_SURGE_TITLE: "Sistema Surge",
    MANUAL_MECH_SURGE_DESC: "Empuja enemigos y MAGNETIZA toda la biomasa al instante.",
    MANUAL_MECH_COMBO_TITLE: "Cadena de Combo",
    MANUAL_MECH_COMBO_DESC: "Mata rápido para aumentar multiplicador. Recibir daño reinicia el combo.",
    STRAIN_STANDARD: "PATÓGENO ESTÁNDAR",
    STRAIN_SWARM: "ENJAMBRE MASIVO",
    STRAIN_TITAN: "TITÁN BLINDADO",
    STRAIN_VOLATILE: "MUTACIÓN VOLÁTIL",
    STRAIN_STD_DESC: "Parámetros de infección basales.",
    STRAIN_SWM_DESC: "Alto número de enemigos, menos vida individual.",
    STRAIN_TTN_DESC: "Enemigos con +100% Vida. Spawns más lentos.",
    STRAIN_VOL_DESC: "Enemigos mueven 30% más rápido. Alta agresión.",
    ROLE_DEV: "DESARROLLO",
    ROLE_DIR: "DIRECTOR",
    DEV_STUDIO: "ESTÚDIO CRIA",
    DIRECTOR: "PAULO GABRIEL DE L. S.",
    SYMPTOM_SEPTIC: "Choque Séptico",
    SYMPTOM_VIRAL: "Carga Viral Desconocida",
    SYMPTOM_NECROTIC: "Tejido Necrótico",
    SYMPTOM_CYTOKINE: "Tormenta de Citocinas",
    SYMPTOM_FAILURE: "Fallo Orgánico",
    SYMPTOM_TOXICITY: "Toxicidad Sanguínea",
    SYMPTOM_DECAY: "Decadencia Celular",
    SYMPTOM_MUTATION: "Mutación Rápida",
    // Upgrades
    UP_MITOSIS_NAME: "MITOSIS RÁPIDA",
    UP_MITOSIS_DESC: "+10% Cadencia de Tiro",
    UP_MEMBRANE_NAME: "MEMBRANA DE TITANIO",
    UP_MEMBRANE_DESC: "+30% Vida Máx & Cura Total",
    UP_ENZYME_NAME: "HIPER ENZIMAS",
    UP_ENZYME_DESC: "+25% Daño",
    UP_MULTISHOT_NAME: "DIVISIÓN ADAPTATIVA",
    UP_MULTISHOT_DESC: "+1 Proyectil, -10% Daño",
    UP_ENERGY_NAME: "IMPULSO MITOCONDRIAL",
    UP_ENERGY_DESC: "Surge y Esquiva recarga 20% más rápido",
    UP_GIGA_NAME: "TORMENTA CITOCINA",
    UP_GIGA_DESC: "+2 Proy, +20% Daño, Cura Total",
    // NEW
    UP_ORBITAL_NAME: "NANO-GUARDIANES",
    UP_ORBITAL_DESC: "Añade +1 Dron de Defensa Autónomo",
    UP_DASH_NAME: "RASTRO DE PLASMA",
    UP_DASH_DESC: "Dash causa 50 de Daño al atravesar enemigos",
    UP_CRIT_NAME: "ÓPTICA DE PRECISIÓN",
    UP_CRIT_DESC: "+15% Prob. Crítica, +0.5x Daño Crítico",
    UP_THORNS_NAME: "CAPARAZÓN DE ESPINAS",
    UP_THORNS_DESC: "Causa 10 de Daño al ser tocado",
    UP_LIFE_NAME: "CEPA VAMPÍRICA",
    UP_LIFE_DESC: "Bajas críticas curan +2 Vida",
    UP_MAGNET_NAME: "CAMPO MAGNÉTICO",
    UP_MAGNET_DESC: "+30% Rango de Imán y Tamaño de Surge"
  }
};

// Configuração das Ondas.
// Se achar que a onda 5 tá fácil, você não jogou o suficiente.
export const WAVES: WaveConfig[] = [
  { waveNumber: 1, duration: 40, spawnRate: 1000, enemyTypes: [EntityType.BACTERIA], flowSpeed: -0.5, hasBoss: false },
  { waveNumber: 2, duration: 55, spawnRate: 900, enemyTypes: [EntityType.BACTERIA, EntityType.VIRUS], flowSpeed: -0.7, hasBoss: false },
  { waveNumber: 3, duration: 60, spawnRate: 800, enemyTypes: [EntityType.BACTERIA, EntityType.VIRUS], flowSpeed: -0.9, hasBoss: true }, // Boss de treino
  { waveNumber: 4, duration: 80, spawnRate: 700, enemyTypes: [EntityType.VIRUS, EntityType.PARASITE], flowSpeed: -1.2, hasBoss: false },
  { waveNumber: 5, duration: 999, spawnRate: 600, enemyTypes: [EntityType.BACTERIA, EntityType.VIRUS, EntityType.PARASITE], flowSpeed: -1.5, hasBoss: true }, // Modo Infinito basicamente
];

// O "Shopping" do jogo.
// Se mexer nos custos, a economia quebra e viramos a Venezuela digital.
export const UPGRADES: Upgrade[] = [
  {
    id: 'mitosis',
    nameKey: 'UP_MITOSIS_NAME',
    descKey: 'UP_MITOSIS_DESC',
    rarity: 'COMMON',
    baseCost: 100,
    costMultiplier: 1.5,
    level: 0,
    maxLevel: 10,
    apply: (s) => ({ ...s, fireRate: Math.max(50, s.fireRate * 0.90) })
  },
  {
    id: 'enzyme',
    nameKey: 'UP_ENZYME_NAME',
    descKey: 'UP_ENZYME_DESC',
    rarity: 'RARE',
    baseCost: 200,
    costMultiplier: 1.6,
    level: 0,
    maxLevel: 8,
    apply: (s) => ({ ...s, damage: s.damage * 1.25 })
  },
  {
    id: 'membrane',
    nameKey: 'UP_MEMBRANE_NAME',
    descKey: 'UP_MEMBRANE_DESC',
    rarity: 'COMMON',
    baseCost: 150,
    costMultiplier: 1.4,
    level: 0,
    maxLevel: 10,
    apply: (s) => ({ ...s, maxHealth: Math.floor(s.maxHealth * 1.3), health: Math.floor(s.maxHealth * 1.3) })
  },
  {
    id: 'multishot',
    nameKey: 'UP_MULTISHOT_NAME',
    descKey: 'UP_MULTISHOT_DESC',
    rarity: 'EPIC',
    baseCost: 500,
    costMultiplier: 2.0,
    level: 0,
    maxLevel: 5,
    apply: (s) => ({ ...s, bulletCount: s.bulletCount + 1, damage: s.damage * 0.9 })
  },
  {
    id: 'orbitals',
    nameKey: 'UP_ORBITAL_NAME',
    descKey: 'UP_ORBITAL_DESC',
    rarity: 'EPIC',
    baseCost: 600,
    costMultiplier: 2.5,
    level: 0,
    maxLevel: 4,
    apply: (s) => ({ ...s, orbitals: s.orbitals + 1 })
  },
  {
    id: 'crit',
    nameKey: 'UP_CRIT_NAME',
    descKey: 'UP_CRIT_DESC',
    rarity: 'RARE',
    baseCost: 300,
    costMultiplier: 1.5,
    level: 0,
    maxLevel: 5,
    apply: (s) => ({ ...s, critChance: s.critChance + 0.15, critMultiplier: s.critMultiplier + 0.5 })
  },
  {
    id: 'dash_dmg',
    nameKey: 'UP_DASH_NAME',
    descKey: 'UP_DASH_DESC',
    rarity: 'COMMON',
    baseCost: 200,
    costMultiplier: 1.5,
    level: 0,
    maxLevel: 5,
    apply: (s) => ({ ...s, dashDamage: s.dashDamage + 50 })
  },
  {
    id: 'thorns',
    nameKey: 'UP_THORNS_NAME',
    descKey: 'UP_THORNS_DESC',
    rarity: 'COMMON',
    baseCost: 150,
    costMultiplier: 1.5,
    level: 0,
    maxLevel: 5,
    apply: (s) => ({ ...s, thorns: s.thorns + 10 })
  },
  {
    id: 'lifesteal',
    nameKey: 'UP_LIFE_NAME',
    descKey: 'UP_LIFE_DESC',
    rarity: 'LEGENDARY',
    baseCost: 800,
    costMultiplier: 2.5,
    level: 0,
    maxLevel: 3,
    apply: (s) => ({ ...s, lifesteal: s.lifesteal + 0.05 }) // Vampirismo. Clássico.
  },
  {
    id: 'magnet',
    nameKey: 'UP_MAGNET_NAME',
    descKey: 'UP_MAGNET_DESC',
    rarity: 'COMMON',
    baseCost: 100,
    costMultiplier: 1.3,
    level: 0,
    maxLevel: 5,
    apply: (s) => ({ ...s, magnetRadius: s.magnetRadius * 1.3, surgeRadiusMult: s.surgeRadiusMult * 1.1 })
  },
  {
    id: 'energy_core',
    nameKey: 'UP_ENERGY_NAME',
    descKey: 'UP_ENERGY_DESC',
    rarity: 'RARE',
    baseCost: 150,
    costMultiplier: 1.5,
    level: 0,
    maxLevel: 5,
    apply: (s) => ({ ...s, maxEnergy: Math.max(50, s.maxEnergy * 0.8), dashCooldown: Math.max(400, s.dashCooldown * 0.8) })
  },
  {
    id: 'giga_blast',
    nameKey: 'UP_GIGA_NAME',
    descKey: 'UP_GIGA_DESC',
    rarity: 'LEGENDARY',
    baseCost: 1000,
    costMultiplier: 2.5,
    level: 0,
    maxLevel: 3,
    apply: (s) => ({ ...s, bulletCount: s.bulletCount + 2, damage: s.damage * 1.2, health: s.maxHealth })
  }
];
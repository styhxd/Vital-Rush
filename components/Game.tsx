import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from '../services/gameEngine';
import { audioManager } from '../services/audioManager';
import { achievementManager } from '../services/achievementManager';
import { GameState, PlayerStats, Upgrade, WaveConfig, Language, Difficulty, PatientProfile, ViralStrain, Achievement, ThemePalette, EntityType } from '../types';
import { INITIAL_STATS, UPGRADES, WAVES, TEXTS, PATIENT_NAMES_FIRST, PATIENT_NAMES_LAST, SYMPTOMS_KEYS, COLORS_DEFAULT, COLORS_PLATINUM, ACHIEVEMENTS_LIST, INITIAL_LIVES } from '../constants';
import { Joystick } from './Joystick';
import { PauseMenu } from './PauseMenu';
import { SettingsMenu } from './SettingsMenu';
import { LoadoutMenu } from './LoadoutMenu'; // NEW IMPORT

// --- UI COMPONENTS (Pequenos componentes auxiliares) ---

const StatBar = ({ value, max, colorClass, label, animate = false }: any) => (
  <div className="flex flex-col w-full">
    <div className="flex justify-between items-end mb-1 px-1">
        <span className="text-[10px] md:text-xs font-bold tracking-widest text-white/70">{label}</span>
        <span className="text-[10px] md:text-xs font-mono text-white/70">{Math.floor(value)}/{max}</span>
    </div>
    <div className="h-1.5 md:h-3 w-full bg-black/50 border border-white/10 rounded-sm skew-x-[-10deg] overflow-hidden backdrop-blur-sm relative">
      <div 
        className={`h-full ${colorClass} transition-all duration-200 origin-left ${animate && value >= max ? 'animate-pulse brightness-150' : ''}`}
        style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
      />
      <div className="absolute top-0 left-0 w-full h-[50%] bg-white/10"></div>
    </div>
  </div>
);

const IconButton = ({ onClick, icon }: any) => (
  <button 
    onClick={onClick} 
    className="p-2 md:p-3 bg-black/40 border border-white/20 rounded hover:bg-white/10 active:scale-95 transition-all text-white/80"
  >
    {icon}
  </button>
);

const MenuButton = ({ onClick, children, variant = 'primary', selected = false }: any) => {
  const base = "w-full py-3 md:py-4 font-bold text-base md:text-xl tracking-widest uppercase clip-path-polygon transition-all hover:scale-105 shadow-[0_0_20px_rgba(0,0,0,0.4)] relative overflow-hidden group";
  let colors = "";
  
  if (variant === 'primary') {
      colors = "bg-red-600 hover:bg-red-500 text-black shadow-[0_0_20px_rgba(255,0,0,0.4)]";
  } else if (variant === 'secondary') {
      colors = selected 
        ? "bg-white text-black border border-white shadow-[0_0_15px_white]"
        : "bg-white/10 hover:bg-white/20 text-white border border-white/10";
  } else if (variant === 'success') {
      colors = "bg-green-600 hover:bg-green-500 text-black shadow-[0_0_20px_rgba(0,255,0,0.4)]";
  }
  
  return (
    <button onClick={onClick} className={`${base} ${colors}`} style={{clipPath: 'polygon(5% 0, 100% 0, 100% 70%, 95% 100%, 0 100%, 0 30%)'}}>
      <span className="relative z-10">{children}</span>
      <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
    </button>
  );
};

const DatabaseCard = ({ title, desc, color }: any) => (
    <div className="bg-white/5 border border-white/10 p-2 md:p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full" style={{backgroundColor: color}}></div>
        <h3 className="text-sm md:text-lg font-bold mb-1" style={{color: color}}>{title}</h3>
        <p className="text-[10px] md:text-xs text-gray-400 leading-relaxed">{desc}</p>
    </div>
);

const IconSpeaker = ({ muted }: { muted: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        {muted ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        )}
        {muted && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9l-4 4m0-4l4 4" />}
    </svg>
);

const IconDNA = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
);

const IconTrophy = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
);

// --- TELA DE TUTORIAL (NOVA) ---
const TutorialOverlay = ({ isMobile }: { isMobile: boolean }) => {
    return (
        <div className="absolute inset-0 z-40 pointer-events-none flex flex-col items-center justify-center anim-tutorial-fade">
            <style>{`
                @keyframes tutorial-seq {
                    0% { opacity: 0; transform: scale(0.9); }
                    10% { opacity: 1; transform: scale(1); }
                    85% { opacity: 1; transform: scale(1); }
                    100% { opacity: 0; transform: scale(1.1); pointer-events: none; }
                }
                .anim-tutorial-fade {
                    animation: tutorial-seq 4.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
                }
            `}</style>
            
            <div className="flex gap-8 md:gap-24 items-center">
                {/* Movement */}
                <div className="flex flex-col items-center gap-2 opacity-80">
                    <div className="w-16 h-16 md:w-24 md:h-24 rounded-full border-2 border-cyan-500 flex items-center justify-center bg-cyan-900/20">
                        {isMobile ? (
                            <div className="w-8 h-8 rounded-full bg-cyan-400/50 shadow-[0_0_15px_cyan]"></div>
                        ) : (
                            <span className="text-2xl font-bold font-mono text-cyan-400">WASD</span>
                        )}
                    </div>
                    <span className="text-xs tracking-[0.2em] text-cyan-300 font-bold">MOVE</span>
                </div>

                {/* DASH - O DESTAQUE */}
                <div className="flex flex-col items-center gap-4 relative">
                    <div className="absolute inset-0 bg-white/10 blur-xl rounded-full animate-pulse"></div>
                    <div className="w-20 h-20 md:w-32 md:h-32 rounded-full border-4 border-white flex items-center justify-center bg-white/10 shadow-[0_0_30px_white] animate-bounce">
                        {isMobile ? (
                            <span className="text-2xl font-bold text-white">TAP</span>
                        ) : (
                            <span className="text-2xl font-bold font-mono text-white">SHIFT</span>
                        )}
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-lg md:text-2xl tracking-[0.3em] text-white font-black drop-shadow-[0_0_10px_white]">DASH</span>
                        <span className="text-[10px] md:text-xs text-yellow-300 uppercase tracking-widest bg-black/60 px-2 rounded mt-1">Invulnerability</span>
                    </div>
                </div>

                {/* Ultimate */}
                <div className="flex flex-col items-center gap-2 opacity-80">
                    <div className="w-16 h-16 md:w-24 md:h-24 rounded-full border-2 border-red-500 border-dashed flex items-center justify-center bg-red-900/20">
                         {isMobile ? (
                            <div className="w-10 h-10 border-2 border-red-500 rounded-full"></div>
                        ) : (
                            <span className="text-xl font-bold font-mono text-red-400">SPACE</span>
                        )}
                    </div>
                    <span className="text-xs tracking-[0.2em] text-red-300 font-bold">SURGE</span>
                </div>
            </div>
            
            <div className="mt-12 text-sm text-white/50 font-mono animate-pulse tracking-widest">
                SYSTEMS INITIALIZED... GOOD LUCK.
            </div>
        </div>
    );
}

// --- MAIN COMPONENT ---

export const Game: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const uiUpdateAccumulatorRef = useRef<number>(0); 
  
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [lastGameState, setLastGameState] = useState<GameState>(GameState.MENU);
  
  const [isPaused, setIsPaused] = useState(false);
  const [language, setLanguage] = useState<Language>('EN');
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.NORMAL);
  
  const [stats, setStats] = useState<PlayerStats>(INITIAL_STATS);
  const [upgrades, setUpgrades] = useState<Upgrade[]>(UPGRADES.map(u => ({...u}))); 
  
  const [uiData, setUiData] = useState({ 
    health: 100, maxHealth: 100, score: 0, biomass: 0, 
    wave: 0, waveTime: 0, waveDuration: 1, energy: 0, maxEnergy: 100,
    combo: 0, dashReady: true, adrenaline: false, lives: INITIAL_LIVES
  });
  
  const [isMobile, setIsMobile] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [isLowPerfMode, setIsLowPerfMode] = useState(false); 
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [audioSettings, setAudioSettings] = useState(audioManager.settings);
  const [isMuted, setIsMuted] = useState(false);
  const [activeAchievement, setActiveAchievement] = useState<Achievement | null>(null);
  const [isPlatinum, setIsPlatinum] = useState(false);
  const [colors, setColors] = useState<ThemePalette>(COLORS_DEFAULT);
  const [cheatInput, setCheatInput] = useState("");
  const [heartbreakAnim, setHeartbreakAnim] = useState(false); 
  
  // State para controlar o tutorial e eventos de Boss
  const [showTutorial, setShowTutorial] = useState(false);
  const [showBossIntro, setShowBossIntro] = useState(false);
  const [bossEntity, setBossEntity] = useState<{hp: number, max: number, name: string} | null>(null);

  const t = (key: string) => TEXTS[language][key] || key;

  useEffect(() => {
    const checkLayout = () => {
      const hasTouch = window.matchMedia('(pointer: coarse)').matches;
      const multiTouch = navigator.maxTouchPoints > 0;
      setIsMobile(hasTouch || multiTouch);
      
      // Detecção de orientação física
      if (window.innerHeight > window.innerWidth) {
          setIsPortrait(true);
      } else {
          setIsPortrait(false);
      }
    };
    checkLayout();
    window.addEventListener('resize', checkLayout);
    return () => window.removeEventListener('resize', checkLayout);
  }, []);

  useEffect(() => {
      if (engineRef.current) {
          engineRef.current.setLanguage(language);
      }
  }, [language]);

  useEffect(() => {
      const handleUnlock = (ach: Achievement) => {
          setActiveAchievement(ach); 
          setTimeout(() => setActiveAchievement(null), 4000);
          audioManager.playPowerUp(); 
      };
      
      const handlePlatinum = () => {
          setIsPlatinum(true);
          setColors(COLORS_PLATINUM);
      };

      achievementManager.setCallbacks(handleUnlock, handlePlatinum);
      if (achievementManager.isPlatinumUnlocked()) {
          setIsPlatinum(true);
          setColors(COLORS_PLATINUM);
      }
  }, []);

  const handleSystemPurge = useCallback(() => {
      // 1. Limpa o armazenamento persistente
      localStorage.clear();
      achievementManager.reset(); // Reseta memória do achievement manager

      // 2. Reseta estados visuais e de lógica
      setGameState(GameState.MENU);
      setIsPlatinum(false);
      setColors(COLORS_DEFAULT);
      setStats(INITIAL_STATS);
      setUpgrades(UPGRADES.map(u => ({...u})));
      setUiData({ 
        health: 100, maxHealth: 100, score: 0, biomass: 0, 
        wave: 0, waveTime: 0, waveDuration: 1, energy: 0, maxEnergy: 100,
        combo: 0, dashReady: true, adrenaline: false, lives: INITIAL_LIVES
      });
      setDifficulty(Difficulty.NORMAL);
      setPatient(null);
      setIsPaused(false);
      
      // 3. Reseta Áudio
      audioManager.stopMusic();
      audioManager.startMenuMusic();
      
      // 4. Force reload visual se estiver no menu de settings
      // (Isso é tratado pelo fechamento do menu ao mudar o state)
  }, []);

  const triggerUltimate = useCallback(() => {
    if (engineRef.current && gameState === GameState.PLAYING && !isPaused) {
      engineRef.current.triggerSurge(stats);
    }
  }, [gameState, isPaused, stats]);

  const triggerDash = useCallback(() => {
    if (engineRef.current && gameState === GameState.PLAYING && !isPaused) {
      engineRef.current.triggerDash(stats);
    }
  }, [gameState, isPaused, stats]);

  useEffect(() => {
    const keys = new Set<string>();
    const handleKey = (e: KeyboardEvent, isDown: boolean) => {
      if (isDown && e.code === 'Escape' && gameState === GameState.PLAYING) {
          togglePause();
          return;
      }
      
      if ((gameState !== GameState.PLAYING && gameState !== GameState.WAVE_CLEARED) || isPaused) return;
      
      if (isDown) {
        keys.add(e.code);
        if (e.code === 'Space') triggerUltimate();
        if (e.code === 'ShiftLeft' || e.code === 'KeyE') triggerDash();
      } else {
        keys.delete(e.code);
      }

      let x = 0;
      let y = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;

      if (x !== 0 && y !== 0) {
        const invLen = 1.0 / Math.sqrt(x * x + y * y);
        x *= invLen;
        y *= invLen;
      }

      if (engineRef.current) engineRef.current.inputVector = { x, y };
    };

    window.addEventListener('keydown', (e) => handleKey(e, true));
    window.addEventListener('keyup', (e) => handleKey(e, false));
    return () => {
       window.removeEventListener('keydown', (e) => handleKey(e, true));
       window.removeEventListener('keyup', (e) => handleKey(e, false));
    };
  }, [gameState, triggerUltimate, triggerDash, isPaused]);

  const handleBossSpawn = useCallback(() => {
      setShowBossIntro(true);
      setTimeout(() => setShowBossIntro(false), 3000);
  }, []);

  const deployToWave = useCallback(() => {
      if (engineRef.current) {
          lastTimeRef.current = performance.now();
          const nextWaveIdx = engineRef.current.currentWaveIndex === -1 ? 0 : engineRef.current.currentWaveIndex + 1;
          engineRef.current.startWave(nextWaveIdx);
          setGameState(GameState.PLAYING);
          audioManager.startGameMusic();
          // Tutorial só aparece na primeira onda da sessão
          if (nextWaveIdx === 0) {
              setShowTutorial(true);
              setTimeout(() => setShowTutorial(false), 4500);
          }
          setBossEntity(null);
      }
  }, []);

  const openShop = useCallback(() => setGameState(GameState.BIO_LAB), []);
  const closeShop = useCallback(() => setGameState(GameState.BRIEFING), []);
  
  const openLoadout = useCallback(() => {
      setIsPaused(true);
      setLastGameState(gameState);
      setGameState(GameState.LOADOUT);
  }, [gameState]);

  const closeLoadout = useCallback(() => {
      setIsPaused(false);
      lastTimeRef.current = performance.now();
      setGameState(lastGameState);
  }, [lastGameState]);

  const openAchievements = useCallback(() => {
      setLastGameState(gameState);
      setGameState(GameState.ACHIEVEMENTS);
  }, [gameState]);

  const generatePatient = () => {
      const fName = PATIENT_NAMES_FIRST[Math.floor(Math.random() * PATIENT_NAMES_FIRST.length)];
      const lName = PATIENT_NAMES_LAST[Math.floor(Math.random() * PATIENT_NAMES_LAST.length)];
      const symptomKey = SYMPTOMS_KEYS[Math.floor(Math.random() * SYMPTOMS_KEYS.length)];
      const strains = Object.values(ViralStrain);
      const strain = strains[Math.floor(Math.random() * strains.length)];
      
      return {
          id: Math.floor(Math.random() * 99999).toString(),
          name: `${fName} ${lName}`,
          age: Math.floor(Math.random() * 40) + 20,
          symptoms: symptomKey, 
          strain: strain,
          difficultyMultiplier: 1
      };
  }

  const handleCheatInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setCheatInput(val);
      if (val === 'j6t2hybt26fwxgy2hvxjttbdy') {
          achievementManager.unlockAll();
          audioManager.playExplosion();
          audioManager.playPowerUp();
          setCheatInput("");
          alert("SYSTEM OVERRIDE: APEX PRIVILEGES GRANTED");
      }
      // NEW CHEAT: BORA FICAR FORTE (RUN WITH ALL UPGRADES)
      else if (val === 'boraficarforte') {
          // 1. Calculate stats as if all upgrades were bought to max
          let godStats = { ...INITIAL_STATS };
          const maxedUpgrades = UPGRADES.map(u => {
              const def = UPGRADES.find(d => d.id === u.id);
              if (def) {
                  for(let i=0; i < u.maxLevel; i++) {
                      godStats = def.apply(godStats);
                  }
              }
              return { ...u, level: u.maxLevel };
          });

          // 2. Initialize Game immediately
          audioManager.init();
          const newPatient = generatePatient();
          setPatient(newPatient);

          if (canvasRef.current) {
              engineRef.current = new GameEngine(canvasRef.current, godStats, newPatient, difficulty, colors);
              engineRef.current.setLanguage(language);
              
              setStats(godStats);
              setUpgrades(maxedUpgrades);
              setUiData({ 
                health: godStats.maxHealth, maxHealth: godStats.maxHealth, score: 0, biomass: 0, 
                wave: 1, waveTime: 0, waveDuration: 1, energy: godStats.maxEnergy, maxEnergy: godStats.maxEnergy, 
                combo: 0, dashReady: true, adrenaline: false, lives: INITIAL_LIVES
              });
              
              engineRef.current.startWave(0); // Wave 1 start
              setGameState(GameState.PLAYING);
              setIsPaused(false);
              audioManager.startGameMusic();
              audioManager.playPowerUp();
              setCheatInput("");
          }
      }
  }

  const loop = useCallback((time: number) => {
    if (!engineRef.current) {
        animationFrameRef.current = requestAnimationFrame(loop);
        return;
    }

    if ((gameState !== GameState.PLAYING && gameState !== GameState.WAVE_CLEARED) || isPaused) {
        lastTimeRef.current = time;
        animationFrameRef.current = requestAnimationFrame(loop);
        return;
    }
    
    const dt = time - lastTimeRef.current;
    lastTimeRef.current = time;

    if (engineRef.current) {
      if (gameState === GameState.PLAYING) {
          engineRef.current.update(
            dt, 
            stats, 
            () => {
                setGameState(GameState.WAVE_CLEARED);
                audioManager.stopMusic(); 
            },
            () => {
                setGameState(GameState.GAME_OVER);
                audioManager.stopMusic();
            },
            () => {
                setHeartbreakAnim(true);
                setTimeout(() => setHeartbreakAnim(false), 2500); 
            },
            handleBossSpawn // New Callback passed to update
          );
      }
      
      engineRef.current.draw();
      
      uiUpdateAccumulatorRef.current += dt;
      if (uiUpdateAccumulatorRef.current > 100) {
          uiUpdateAccumulatorRef.current = 0;
          const eng = engineRef.current;
          
          if (eng.isLowQuality !== isLowPerfMode) {
              setIsLowPerfMode(eng.isLowQuality);
          }

          const waveIdx = Math.max(0, Math.min(eng.currentWaveIndex, WAVES.length - 1));
          const currentWaveConfig = WAVES[waveIdx];
          
          // Check for active boss for HP Bar
          const activeBoss = eng.entities.find(e => e.type === EntityType.BOSS && e.active);
          if (activeBoss) {
              setBossEntity({ hp: activeBoss.health, max: activeBoss.maxHealth, name: "ANOMALY // BOSS" });
          } else {
              setBossEntity(null);
          }
          
          setUiData({
            health: Math.floor(eng.player.health),
            maxHealth: eng.player.maxHealth,
            score: eng.score,
            biomass: eng.biomass,
            wave: currentWaveConfig.waveNumber,
            waveTime: eng.waveTimer,
            waveDuration: currentWaveConfig.duration,
            energy: eng.energy,
            maxEnergy: stats.maxEnergy,
            combo: eng.comboCount,
            dashReady: eng.dashCooldownTimer <= 0,
            adrenaline: eng.adrenalineActive,
            lives: eng.lives
          });
      }
    }
    
    animationFrameRef.current = requestAnimationFrame(loop);
  }, [gameState, stats, isPaused, isLowPerfMode, handleBossSpawn]);

  useEffect(() => {
    lastTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(loop);
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); }
  }, [loop]);

  const handleStartGame = () => {
     try {
         const elem = document.documentElement;
         if (!document.fullscreenElement) {
             if (elem.requestFullscreen) {
                 elem.requestFullscreen().then(() => {
                     // TENTATIVA DE TRAVA NATIVA APÓS FULLSCREEN
                     if ('orientation' in screen && 'lock' in screen.orientation) {
                         // @ts-ignore - TS as vezes reclama do lock
                         screen.orientation.lock('landscape').catch((err) => console.log('Orientation lock failed:', err));
                     }
                 }).catch((err) => {
                    console.log("Fullscreen blocked:", err);
                 });
             } else if ((elem as any).webkitRequestFullscreen) {
                 (elem as any).webkitRequestFullscreen();
             }
         }
     } catch (e) {}

     audioManager.init(); 
     
     const newPatient = generatePatient();
     setPatient(newPatient);

     if (canvasRef.current) {
         engineRef.current = new GameEngine(canvasRef.current, INITIAL_STATS, newPatient, difficulty, colors);
         engineRef.current.setLanguage(language);
         
         setStats(INITIAL_STATS);
         setUpgrades(UPGRADES.map(u => ({...u}))); 
         setUiData({ 
           health: 100, maxHealth: 100, score: 0, biomass: 0, 
           wave: 1, waveTime: 0, waveDuration: 1, energy: 0, maxEnergy: 100, combo: 0, dashReady: true, adrenaline: false, lives: INITIAL_LIVES
         });
         
         setGameState(GameState.BRIEFING);
         setIsPaused(false);
         setIsLowPerfMode(false); 
     }
  };

  const buyUpgrade = (upgradeId: string) => {
      if (!engineRef.current) return;
      const upgIdx = upgrades.findIndex(u => u.id === upgradeId);
      if (upgIdx === -1) return;
      
      const upgState = upgrades[upgIdx];
      const upgDef = UPGRADES.find(u => u.id === upgradeId);
      if (!upgDef) return;

      const cost = Math.floor(upgState.baseCost * Math.pow(upgState.costMultiplier, upgState.level));
      
      if (engineRef.current.biomass >= cost && upgState.level < upgState.maxLevel) {
          const prevStats = {...stats};
          try {
              engineRef.current.biomass -= cost;
              const newStats = upgDef.apply(stats);
              setStats(newStats);
              audioManager.playPowerUp();
              
              const newUpgrades = [...upgrades];
              newUpgrades[upgIdx] = {
                  ...newUpgrades[upgIdx],
                  level: newUpgrades[upgIdx].level + 1
              };
              setUpgrades(newUpgrades);
              setUiData(prev => ({...prev, biomass: engineRef.current!.biomass}));
              
              if (newUpgrades[upgIdx].level >= newUpgrades[upgIdx].maxLevel) {
                  if (upgradeId === 'mitosis') achievementManager.track('fire_rate_max', 1);
              }
              const boughtCount = newUpgrades.filter(u => u.level > 0).length;
              achievementManager.set('unlock_all_upgrades', boughtCount);
          } catch (e) {
              engineRef.current.biomass += cost;
              setStats(prevStats);
          }
      }
  };

  const handleJoystickMove = (vec: {x: number, y: number}) => {
    if (engineRef.current) engineRef.current.inputVector = vec;
  };

  const togglePause = () => {
      setIsPaused(p => !p);
      if (!isPaused) {
          audioManager.stopMusic();
      } else {
          lastTimeRef.current = performance.now();
          audioManager.startGameMusic();
      }
  };

  const toggleMute = () => {
      const newVal = !isMuted;
      setIsMuted(newVal);
      if (newVal) {
          audioManager.settings.master = 0;
      } else {
          audioManager.settings.master = audioSettings.master;
      }
      audioManager.updateVolumes();
  };
  
  const updateAudio = (type: 'master' | 'music' | 'sfx', val: number) => {
      const newSettings = { ...audioSettings, [type]: val };
      setAudioSettings(newSettings);
      audioManager.settings = newSettings;
      audioManager.updateVolumes();
  }
  
  const openControls = (fromMenu: boolean) => {
      setLastGameState(fromMenu ? GameState.MENU : GameState.PLAYING);
      setGameState(GameState.CONTROLS);
  }
  
  const goBackFromControls = () => {
      if (lastGameState === GameState.MENU) {
          setGameState(GameState.MENU);
      } else {
          lastTimeRef.current = performance.now();
          setGameState(GameState.PLAYING);
          if (!isPaused) setIsPaused(true); 
      }
  }

  // Novo Handler para Settings (Acessível do Menu e do Pause)
  const openSettings = () => {
      if (gameState === GameState.MENU) {
          setLastGameState(GameState.MENU);
      } else if (isPaused) {
          setLastGameState(GameState.PLAYING); // Vai voltar para o Pause (que é tecnicamente PLAYING + isPaused)
      } else {
          setLastGameState(gameState);
      }
      setGameState(GameState.SETTINGS);
  };

  const closeSettings = () => {
      if (lastGameState === GameState.MENU) {
          setGameState(GameState.MENU);
      } else {
          setGameState(GameState.PLAYING);
          // Se veio do pause, mantém pausado.
          if (!isPaused) setIsPaused(true);
      }
  };

  // --- ROTAÇÃO AUTOMÁTICA VISUAL ---
  // Se estiver em modo retrato, o estilo abaixo força o jogo a girar 90 graus
  // e ocupar a tela "deitada", forçando o usuário a girar o aparelho.
  const containerStyle: React.CSSProperties = isPortrait && isMobile ? {
      transform: 'rotate(90deg)',
      width: '100vh',
      height: '100vw',
      position: 'absolute',
      top: '50%',
      left: '50%',
      translate: '-50% -50%',
      overflow: 'hidden'
  } : {
      width: '100%',
      height: '100vh',
      position: 'relative',
      overflow: 'hidden'
  };

  return (
    <div 
        className={`select-none ${isPlatinum ? 'bg-[#0a0a1a]' : 'bg-[#0f0505]'} ${isLowPerfMode ? 'perf-mode-low' : ''}`} 
        style={{...containerStyle, fontFamily: 'var(--font-tech)'}}
    >
      <canvas ref={canvasRef} className="block w-full h-full object-contain" />
      
      {/* CSS Injection for Dynamic Keyframes */}
      <style>{`
        @keyframes heart-shake {
            0%, 100% { transform: translate(0, 0) scale(1); }
            10%, 30%, 50%, 70%, 90% { transform: translate(-8px, -8px) rotate(-3deg) scale(1.1); }
            20%, 40%, 60%, 80% { transform: translate(8px, 8px) rotate(3deg) scale(1.1); }
        }
        @keyframes crack-left {
            0% { transform: translate(0, 0) rotate(0); opacity: 0.3; }
            100% { transform: translate(-100px, 100px) rotate(-45deg); opacity: 0; }
        }
        @keyframes crack-right {
            0% { transform: translate(0, 0) rotate(0); opacity: 0.3; }
            100% { transform: translate(100px, 100px) rotate(45deg); opacity: 0; }
        }
        @keyframes glitch-text {
            0% { opacity: 1; transform: translate(0); clip-path: inset(0 0 0 0); }
            20% { clip-path: inset(20% 0 0 0); transform: translate(-2px, 2px); }
            40% { clip-path: inset(0 0 20% 0); transform: translate(2px, -2px); }
            60% { clip-path: inset(20% 0 20% 0); transform: translate(-2px, -2px); }
            80% { clip-path: inset(0 20% 0 20%); transform: translate(2px, 2px); }
            100% { opacity: 0; }
        }
        @keyframes pulse-red {
            0%, 100% { background-color: rgba(255, 0, 0, 0); }
            50% { background-color: rgba(255, 0, 0, 0.4); }
        }
        .anim-shake { animation: heart-shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
        .anim-break-left { animation: crack-left 1.5s ease-out forwards; animation-delay: 0.5s; }
        .anim-break-right { animation: crack-right 1.5s ease-out forwards; animation-delay: 0.5s; }
        .anim-glitch { animation: glitch-text 0.5s steps(5) infinite; }
        .anim-pulse-red { animation: pulse-red 0.5s ease-in-out infinite; }
      `}</style>

      <div className="vignette"></div>
      <div className="scanlines"></div>
      <div className="vein-overlay opacity-20" style={{filter: isPlatinum ? 'hue-rotate(240deg)' : 'none'}}></div>

      {heartbreakAnim && (
          <div className="absolute inset-0 flex items-center justify-center z-[150] pointer-events-none overflow-hidden">
              <div className="relative w-[500px] h-[500px]"> 
                  <div className="absolute inset-0 anim-shake anim-break-left opacity-30 mix-blend-screen text-red-600">
                      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_50px_rgba(255,0,0,0.8)]" style={{clipPath: 'polygon(0 0, 50% 0, 55% 25%, 45% 45%, 55% 65%, 45% 85%, 50% 100%, 0 100%)'}}>
                          <path fill="currentColor" d="M50 88.9L48.2 87.2C20.4 62 2 45.5 2 25.3 2 11.5 12.8 2 26.5 2c7.7 0 15.1 3.5 20 9.1C51.4 5.5 58.8 2 66.5 2 80.2 2 91 11.5 91 25.3c0 20.2-18.4 36.7-46.2 61.9L50 88.9z" />
                      </svg>
                  </div>
                  <div className="absolute inset-0 anim-shake anim-break-right opacity-30 mix-blend-screen text-red-600">
                      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_50px_rgba(255,0,0,0.8)]" style={{clipPath: 'polygon(100% 0, 50% 0, 55% 25%, 45% 45%, 55% 65%, 45% 85%, 50% 100%, 100% 100%)'}}>
                          <path fill="currentColor" d="M50 88.9L48.2 87.2C20.4 62 2 45.5 2 25.3 2 11.5 12.8 2 26.5 2c7.7 0 15.1 3.5 20 9.1C51.4 5.5 58.8 2 66.5 2 80.2 2 91 11.5 91 25.3c0 20.2-18.4 36.7-46.2 61.9L50 88.9z" />
                      </svg>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                      <h1 className="text-6xl font-black text-red-500 tracking-[1em] anim-glitch opacity-80 mix-blend-overlay">CRITICAL</h1>
                  </div>
              </div>
              <div className="absolute inset-0 bg-red-900/20 mix-blend-overlay animate-pulse"></div>
          </div>
      )}

      {/* TUTORIAL OVERLAY (FANTASMA) */}
      {showTutorial && gameState === GameState.PLAYING && (
          <TutorialOverlay isMobile={isMobile} />
      )}

      {/* BOSS WARNING OVERLAY */}
      {showBossIntro && (
          <div className="absolute inset-0 z-[60] pointer-events-none flex flex-col items-center justify-center anim-pulse-red">
              <div className="w-full bg-red-600/20 backdrop-blur-sm border-y-8 border-red-600 py-10 md:py-20 flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30 mix-blend-overlay"></div>
                  <h1 className="text-5xl md:text-9xl font-black text-red-500 tracking-[0.2em] anim-glitch drop-shadow-[0_0_20px_red]">
                      WARNING
                  </h1>
                  <h2 className="text-2xl md:text-4xl text-white font-mono tracking-widest mt-4 blink">
                      BIOLOGICAL THREAT DETECTED
                  </h2>
                  <div className="w-[200%] h-2 bg-red-500 absolute top-0 animate-[flow_2s_linear_infinite]"></div>
                  <div className="w-[200%] h-2 bg-red-500 absolute bottom-0 animate-[flow_2s_linear_infinite_reverse]"></div>
              </div>
          </div>
      )}

      {/* BOSS HEALTH BAR */}
      {bossEntity && !showBossIntro && (
          <div className="absolute top-16 md:top-8 left-1/2 -translate-x-1/2 z-30 w-[80%] md:w-[50%] flex flex-col items-center pointer-events-none anim-tutorial-fade" style={{animationDuration: '0.5s'}}>
              <div className="flex justify-between w-full text-red-500 font-bold font-mono text-[10px] md:text-xs mb-1 tracking-[0.3em]">
                  <span className="anim-glitch">ANOMALY // BOSS</span>
                  <span>{Math.ceil(bossEntity.hp)}/{bossEntity.max}</span>
              </div>
              <div className="w-full h-4 md:h-6 bg-black/80 border-2 border-red-900 relative skew-x-[-20deg] overflow-hidden">
                  <div 
                      className="h-full bg-red-600 transition-all duration-200"
                      style={{ width: `${(bossEntity.hp / bossEntity.max) * 100}%`, boxShadow: '0 0 20px rgba(255,0,0,0.5)' }}
                  >
                      <div className="absolute top-0 right-0 h-full w-2 bg-white/50 blur-[2px]"></div>
                  </div>
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
              </div>
          </div>
      )}

      <div className={`absolute top-4 left-1/2 transform -translate-x-1/2 z-[100] transition-all duration-500 ease-out ${activeAchievement ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0'}`}>
          {activeAchievement && (
              <div className={`flex items-center gap-4 p-4 rounded border-2 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-md min-w-[300px]
                  ${isPlatinum 
                      ? 'bg-purple-900/80 border-amber-400 shadow-[0_0_20px_rgba(255,215,0,0.3)]' 
                      : 'bg-black/90 border-cyan-500 shadow-[0_0_20px_rgba(0,255,255,0.3)]'}`}>
                  <div className="text-4xl animate-bounce">{activeAchievement.icon}</div>
                  <div>
                      <div className={`text-xs font-bold tracking-widest mb-1 ${isPlatinum ? 'text-amber-400' : 'text-cyan-400'}`}>{t('ACHIEVEMENTS')} UNLOCKED</div>
                      <div className="text-lg font-bold text-white">{t(activeAchievement.titleKey)}</div>
                      <div className="text-xs text-gray-400">{t(activeAchievement.descKey)}</div>
                  </div>
              </div>
          )}
      </div>

      {(gameState === GameState.PLAYING || gameState === GameState.WAVE_CLEARED || gameState === GameState.LOADOUT) && (
        <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-2 md:p-6">
           <div className="flex justify-between items-start">
             <div className="flex flex-col gap-3 w-32 md:w-64">
                <StatBar label={t('INTEGRITY')} value={uiData.health} max={uiData.maxHealth} colorClass={uiData.adrenaline ? "bg-red-600 animate-pulse" : (isPlatinum ? "bg-gradient-to-r from-purple-500 to-amber-400" : "bg-gradient-to-r from-red-600 to-red-400")} />
                <StatBar label={t('SURGE_READY')} value={uiData.energy} max={uiData.maxEnergy} colorClass={isPlatinum ? "bg-gradient-to-r from-amber-400 to-white" : "bg-gradient-to-r from-cyan-600 to-cyan-400"} animate={true}/>
                
                <div className="flex gap-1 mt-2">
                    {Array.from({length: INITIAL_LIVES}).map((_, i) => (
                        <div key={i} className={`w-3 h-3 md:w-4 md:h-4 rounded-full flex items-center justify-center transition-all duration-500
                            ${i < uiData.lives 
                                ? 'bg-red-500 shadow-[0_0_10px_red] border-white/20 border' 
                                : 'bg-black/50 border border-red-900/50 shadow-none'}`}>
                            {i < uiData.lives 
                                ? <span className="text-[6px] md:text-[8px]">♥</span> 
                                : <span className="text-[6px] md:text-[8px] text-red-900 font-bold">X</span>}
                        </div>
                    ))}
                </div>

                {uiData.adrenaline && (
                    <div className="text-red-500 font-bold tracking-widest text-[8px] md:text-xs animate-pulse text-glow border border-red-500/50 bg-red-900/20 px-2 py-1 mt-2">
                        ⚠ {t('ADRENALINE')} ⚠
                    </div>
                )}
             </div>

             <div className="flex flex-col items-center">
                 <div className="bg-black/50 border border-white/10 px-3 py-1 rounded-full backdrop-blur-md mb-1">
                     <span className={`font-bold tracking-widest text-base md:text-2xl text-glow ${isPlatinum ? 'text-amber-400' : 'text-red-400'}`}>{t('WAVE')} {uiData.wave}</span>
                 </div>
                 <div className="text-[10px] md:text-xs text-white/50 tracking-widest">{(uiData.waveDuration - uiData.waveTime).toFixed(0)}s</div>
                 
                 <div className={`mt-4 transition-all duration-200 ${uiData.combo > 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                     <div className="text-3xl md:text-4xl font-black italic text-yellow-400 text-glow" style={{textShadow: '0 0 20px orange'}}>
                         {uiData.combo}x
                     </div>
                     <div className="text-[8px] md:text-xs font-bold text-yellow-600 tracking-[0.5em] text-center">{t('COMBO')}</div>
                 </div>
             </div>

             <div className="flex flex-col items-end gap-2">
                 <div className="pointer-events-auto flex gap-2">
                     <IconButton onClick={openLoadout} icon={<IconDNA />} />
                     <IconButton onClick={toggleMute} icon={<IconSpeaker muted={isMuted} />} />
                     <IconButton onClick={togglePause} icon={<span className="font-bold text-lg md:text-xl">||</span>} />
                 </div>
                 <div className="text-right">
                    <div className="text-[8px] md:text-xs text-white/50 tracking-widest">{t('SCORE')}</div>
                    <div className="text-xl md:text-3xl font-bold font-mono text-white tracking-tighter cyan-glow">{uiData.score.toString().padStart(6, '0')}</div>
                    <div className="text-[8px] md:text-xs text-yellow-500 tracking-widest mt-1">{t('BIOMASS_AVAIL')}</div>
                    <div className="text-lg md:text-xl font-bold font-mono text-yellow-400 tracking-tighter">{uiData.biomass}</div>
                 </div>
             </div>
           </div>

           {isMobile && !isPaused && (
             <div className="absolute inset-0 z-10 pointer-events-none">
                 <div className="absolute bottom-8 right-8 pointer-events-auto flex gap-4 items-end">
                     <button 
                        onTouchStart={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            triggerDash();
                        }}
                        onClick={!isMobile ? triggerDash : undefined}
                        disabled={!uiData.dashReady}
                        className={`w-14 h-14 md:w-16 md:h-16 rounded-full border-2 flex items-center justify-center relative transition-all duration-100 active:scale-95
                            ${uiData.dashReady
                                ? 'border-white bg-white/20' 
                                : 'border-white/10 bg-black/40 opacity-50'}`}
                     >
                         <div className={`absolute inset-0 bg-white/30 rounded-full transition-all duration-500 ${uiData.dashReady ? 'scale-0' : 'scale-100'}`} style={{clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0% 100%)'}}></div>
                         <span className="font-bold text-[10px] md:text-xs">DASH</span>
                     </button>

                     <button 
                        onTouchStart={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            triggerUltimate();
                        }}
                        onClick={!isMobile ? triggerUltimate : undefined}
                        disabled={uiData.energy < uiData.maxEnergy}
                        className={`w-20 h-20 md:w-24 md:h-24 rounded-full border-4 flex items-center justify-center relative transition-all duration-100 active:scale-95
                            ${uiData.energy >= uiData.maxEnergy 
                                ? (isPlatinum ? 'border-amber-400 bg-amber-900/40 shadow-[0_0_30px_rgba(255,215,0,0.4)]' : 'border-cyan-400 bg-cyan-900/40 shadow-[0_0_30px_rgba(0,255,255,0.4)]')
                                : 'border-white/10 bg-black/40 grayscale opacity-50'}`}
                     >
                         <div className={`absolute inset-0 rounded-full border border-dashed border-white/20 ${uiData.energy >= uiData.maxEnergy ? 'animate-spin-slow' : ''}`}></div>
                         <span className={`font-bold text-xs md:text-sm tracking-widest ${uiData.energy >= uiData.maxEnergy ? (isPlatinum ? 'text-amber-200' : 'text-cyan-200') : 'text-white/30'}`}>SURGE</span>
                     </button>
                 </div>
             </div>
           )}
        </div>
      )}
      
      {gameState === GameState.WAVE_CLEARED && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-pulse">
           <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden">
               {/* DRAMATIC BACKGROUND */}
               <div className="absolute inset-0 bg-green-500/10 mix-blend-overlay animate-pulse"></div>
               <div className="absolute top-0 w-full h-32 bg-gradient-to-b from-green-500/20 to-transparent"></div>
               <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-green-500/20 to-transparent"></div>
               
               {/* HUGE TEXT */}
               <h1 className="text-6xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-green-300 to-green-600 tracking-[0.1em] mb-8 animate-bounce drop-shadow-[0_0_30px_rgba(0,255,0,0.5)] text-center">
                   {t('CLEARED')}
               </h1>
               
               <div className="w-full max-w-xs md:max-w-lg p-1 border-y-4 border-green-500 bg-black/80 relative backdrop-blur-md">
                   <div className="relative p-4 md:p-8 text-center">
                       <div className="w-full h-1 bg-green-500/50 mb-4 md:mb-8"></div>
                       
                       <div className="grid grid-cols-2 gap-2 md:gap-4 mb-4 md:mb-8 text-xs md:text-sm font-mono tracking-widest">
                           <div className="text-right text-gray-400">{t('WAVE')}:</div>
                           <div className="text-left text-white font-bold">{uiData.wave}</div>
                           <div className="text-right text-gray-400">{t('BIOMASS_AVAIL')}:</div>
                           <div className="text-left text-yellow-400 font-bold">{uiData.biomass}</div>
                       </div>

                       <div className="flex flex-col gap-2 md:gap-4">
                           <MenuButton variant="success" onClick={openShop}>
                               {t('MUTATION')}
                           </MenuButton>
                           <MenuButton variant="secondary" onClick={() => setGameState(GameState.BRIEFING)}>
                               {t('NEXT')}
                           </MenuButton>
                       </div>
                   </div>
               </div>
           </div>
        </div>
      )}

      {/* (MANTIDO O RESTANTE DOS MENUS) */}
      
      {gameState === GameState.MENU && (
        <div className="absolute inset-0 bg-black flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
          <div className="relative text-center p-4 md:p-8 max-w-md w-full">
            <h1 className={`text-6xl md:text-9xl font-bold mb-2 tracking-tighter mix-blend-screen leading-none ${isPlatinum ? 'text-amber-400 shadow-[0_0_30px_rgba(255,170,0,0.5)]' : 'text-red-600 red-glow'}`} style={{fontFamily: 'Impact, sans-serif'}}>{t('TITLE_MAIN')}</h1>
            <h2 className="text-3xl md:text-5xl font-light text-white mb-4 md:mb-8 tracking-[0.5em] -mt-2 opacity-80">{t('TITLE_SUB')}</h2>
            
            {isPlatinum && <div className="text-[8px] md:text-xs tracking-[0.5em] text-purple-400 mb-4 animate-pulse">{t('ACH_PLATINUM_MSG')}</div>}

            <div className="mb-4 md:mb-8">
                <div className="text-[10px] md:text-xs text-gray-500 tracking-widest mb-2">{t('DIFFICULTY')}</div>
                <div className="grid grid-cols-4 gap-1 md:gap-2">
                    {Object.values(Difficulty).map(d => (
                        <button 
                            key={d} 
                            onClick={() => setDifficulty(d)}
                            className={`text-[8px] md:text-[10px] font-bold py-2 border transition-all ${difficulty === d ? 'bg-red-600 text-black border-red-600' : 'bg-transparent text-gray-500 border-gray-800'}`}
                        >
                            {t(`DIFF_${d}`)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-2 md:space-y-4">
                <MenuButton onClick={() => { handleStartGame(); audioManager.startMenuMusic(); }}>{t('START')}</MenuButton>
                <div className="grid grid-cols-2 gap-2 md:gap-4">
                  <MenuButton variant="secondary" onClick={() => openControls(true)}>{t('CONTROLS')}</MenuButton>
                  <MenuButton variant="secondary" onClick={() => setGameState(GameState.MANUAL)}>{t('MANUAL')}</MenuButton>
                </div>
                <div className="grid grid-cols-2 gap-2 md:gap-4">
                  {/* CHANGED: Now uses openSettings handler */}
                  <MenuButton variant="secondary" onClick={openSettings}>{t('SETTINGS')}</MenuButton>
                  <MenuButton variant="secondary" onClick={openAchievements}>{t('ACHIEVEMENTS')}</MenuButton>
                </div>
                
                {/* REPLACED: Language Buttons now use FLAGS mapping and better styling */}
                <div className="flex justify-center gap-2 mt-4 md:mt-6">
                    {(['EN', 'PT', 'ES'] as Language[]).map(l => (
                      <button 
                        key={l}
                        onClick={() => setLanguage(l)} 
                        className={`text-xs md:text-sm font-bold tracking-widest px-3 py-2 border-b-2 transition-all flex items-center gap-2
                            ${language === l 
                                ? 'text-white border-red-500 bg-red-900/20' 
                                : 'text-gray-600 border-transparent hover:text-gray-400'}`}
                      >
                        {l}
                      </button>
                    ))}
                </div>
            </div>
            
            <div className="mt-8">
                <input 
                    type="text" 
                    value={cheatInput} 
                    onChange={handleCheatInput}
                    placeholder={t('PH_ACCESS_CODE')}
                    className="bg-transparent border-b border-gray-800 text-center text-xs text-gray-500 focus:outline-none focus:border-red-500 w-full font-mono tracking-widest uppercase"
                />
            </div>
          </div>
        </div>
      )}

      {/* REPLACED: New Settings Menu Component Rendering */}
      <SettingsMenu 
          isVisible={gameState === GameState.SETTINGS}
          language={language}
          audioSettings={audioSettings}
          onUpdateAudio={updateAudio}
          onLanguageChange={setLanguage}
          onSystemPurge={handleSystemPurge} // WIRING UP THE SOFT RESET
          onClose={closeSettings}
      />

      {/* New LoadoutMenu Component Rendering */}
      <LoadoutMenu
          isVisible={gameState === GameState.LOADOUT}
          stats={stats}
          upgrades={upgrades}
          language={language}
          onClose={closeLoadout}
      />

      {/* (RESTANTE DOS MENUS) */}
      
      {gameState === GameState.ACHIEVEMENTS && (
          <div className="absolute inset-0 bg-black flex items-center justify-center z-50">
              <div className={`w-full max-w-6xl h-full md:h-[90%] border p-4 md:p-8 relative flex flex-col ${isPlatinum ? 'border-amber-500/50 bg-purple-900/10' : 'border-white/10 bg-[#1a0a0a]'}`}>
                  <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2 flex-shrink-0">
                      <h2 className={`text-2xl md:text-4xl font-bold tracking-widest ${isPlatinum ? 'text-amber-400' : 'text-cyan-400'}`}>{t('ACHIEVEMENTS')}</h2>
                      <div className="flex items-center gap-2">
                          <IconTrophy />
                          <span className="text-lg md:text-xl font-mono">
                              {Object.values(achievementManager.getProgress()).filter(p => p.unlocked).length} / {ACHIEVEMENTS_LIST.length}
                          </span>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2 custom-scroll min-h-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 pb-4">
                          {ACHIEVEMENTS_LIST.map((ach) => {
                              const progress = achievementManager.getProgress()[ach.id] || { unlocked: false, currentValue: 0 };
                              const isLocked = !progress.unlocked;
                              if (ach.secret && isLocked) {
                                  return (
                                      <div key={ach.id} className="bg-black/60 border border-white/5 p-2 md:p-6 flex items-center justify-center opacity-50 min-h-[60px] md:min-h-[120px]">
                                          <span className="text-[10px] md:text-xs tracking-widest text-gray-600 font-mono">??? ENCRYPTED DATA ???</span>
                                      </div>
                                  )
                              }

                              return (
                                  <div key={ach.id} className={`p-3 md:p-6 border relative overflow-hidden transition-all group flex flex-col min-h-[80px] md:min-h-[140px]
                                      ${isLocked ? 'border-white/10 bg-black/80 grayscale opacity-70' : 
                                        (ach.id === 'all_achievements' ? 'border-amber-500 bg-amber-900/30 shadow-[0_0_20px_rgba(255,215,0,0.2)]' : 'border-cyan-500/30 bg-cyan-900/20')}`}>
                                      <div className="flex items-center md:items-start gap-4 z-10 relative h-full">
                                          <div className="text-2xl md:text-4xl filter drop-shadow-md">{ach.icon}</div>
                                          <div className="flex-1 flex flex-col h-full justify-center">
                                              <h4 className={`font-bold text-sm md:text-lg mb-1 ${isLocked ? 'text-gray-500' : 'text-white'}`}>{t(ach.titleKey)}</h4>
                                              <p className={`text-[10px] md:text-sm mb-1 leading-relaxed ${isLocked ? 'text-gray-600' : 'text-gray-300'}`}>{t(ach.descKey)}</p>
                                              
                                              <div className="mt-auto w-full">
                                                  {ach.isCumulative && !progress.unlocked && (
                                                      <div className="w-full h-1 bg-black rounded overflow-hidden mb-1 border border-white/5">
                                                          <div className="h-full bg-cyan-600" style={{width: `${Math.min(100, (progress.currentValue / ach.targetValue)*100)}%`}}></div>
                                                      </div>
                                                  )}
                                                  
                                                  <div className="flex justify-between text-[8px] md:text-xs tracking-widest font-mono">
                                                      <span className={progress.unlocked ? 'text-green-400 font-bold' : 'text-gray-600'}>
                                                          {progress.unlocked ? 'UNLOCKED' : t('ACH_LOCKED')}
                                                      </span>
                                                      {ach.isCumulative && (
                                                          <span className="text-gray-500">
                                                              {progress.currentValue > ach.targetValue ? ach.targetValue : progress.currentValue} / {ach.targetValue}
                                                          </span>
                                                      )}
                                                  </div>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              )
                          })}
                      </div>
                  </div>

                  <div className="mt-2 md:mt-6 pt-2 md:pt-4 border-t border-white/10 flex-shrink-0">
                      <MenuButton variant="secondary" onClick={() => setGameState(GameState.MENU)}>{t('BACK')}</MenuButton>
                  </div>
              </div>
          </div>
      )}

      {gameState === GameState.MANUAL && (
        <div className="absolute inset-0 bg-black flex items-center justify-center z-50">
           <div className="w-full max-w-4xl p-4 md:p-10 bg-[#1a0a0a] border border-white/10 relative h-[100vh] md:h-[90vh] flex flex-col">
              <h2 className="text-xl md:text-3xl text-white font-bold tracking-widest mb-4 border-b border-white/10 pb-2 flex justify-between">
                  <span>{t('MANUAL')}</span>
                  <span className="text-cyan-500 text-xs md:text-sm font-mono tracking-normal opacity-50">DB-V2.4</span>
              </h2>
              
              <div className="flex-1 overflow-y-auto custom-scroll pr-2 md:pr-4 space-y-4 md:space-y-8">
                  <section>
                      <h4 className="text-cyan-400 font-bold tracking-[0.2em] mb-2 text-xs md:text-sm border-l-2 border-cyan-500 pl-3">{t('MANUAL_HOSTILES')}</h4>
                      <div className="grid grid-cols-2 gap-2">
                          <DatabaseCard title="BACTERIA" desc={t('MANUAL_BAC_DESC')} color={COLORS_DEFAULT.BACTERIA} />
                          <DatabaseCard title="VIRUS" desc={t('MANUAL_VIR_DESC')} color={COLORS_DEFAULT.VIRUS} />
                          <DatabaseCard title="PARASITE" desc={t('MANUAL_PAR_DESC')} color={COLORS_DEFAULT.PARASITE} />
                          {/* ADDED FUNGI CARD */}
                          <DatabaseCard title="FUNGI" desc={t('MANUAL_FUNGI_DESC')} color={COLORS_DEFAULT.FUNGI} />
                          <DatabaseCard title="BOSS" desc={t('MANUAL_BOSS_DESC')} color={COLORS_DEFAULT.BOSS} />
                      </div>
                  </section>

                  <section>
                      <h4 className="text-white font-bold tracking-[0.2em] mb-2 text-xs md:text-sm border-l-2 border-white pl-3">{t('MANUAL_MECHANICS')}</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                           <DatabaseCard title={t('MANUAL_MECH_DASH_TITLE')} desc={t('MANUAL_MECH_DASH_DESC')} color="#fff" />
                           <DatabaseCard title={t('MANUAL_MECH_SURGE_TITLE')} desc={t('MANUAL_MECH_SURGE_DESC')} color={COLORS_DEFAULT.PLAYER_CORE} />
                           <DatabaseCard title={t('MANUAL_MECH_COMBO_TITLE')} desc={t('MANUAL_MECH_COMBO_DESC')} color={COLORS_DEFAULT.COMBO} />
                      </div>
                  </section>

                  <section>
                      <h4 className="text-yellow-400 font-bold tracking-[0.2em] mb-2 text-xs md:text-sm border-l-2 border-yellow-500 pl-3">{t('MANUAL_STRAINS')}</h4>
                      <div className="grid grid-cols-2 gap-2">
                           <DatabaseCard title={t('STRAIN_STANDARD')} desc={t('STRAIN_STD_DESC')} color="#fff" />
                           <DatabaseCard title={t('STRAIN_SWARM')} desc={t('STRAIN_SWM_DESC')} color="#ff00ff" />
                           <DatabaseCard title={t('STRAIN_TITAN')} desc={t('STRAIN_TTN_DESC')} color="#ffaa00" />
                           <DatabaseCard title={t('STRAIN_VOLATILE')} desc={t('STRAIN_VOL_DESC')} color="#ff4444" />
                      </div>
                  </section>
              </div>

              <div className="mt-2 md:mt-6 pt-2 border-t border-white/10">
                  <MenuButton variant="secondary" onClick={() => setGameState(GameState.MENU)}>{t('BACK')}</MenuButton>
              </div>
           </div>
        </div>
      )}

      {/* CONTROLS (Mantido compacto) */}
      {gameState === GameState.CONTROLS && (
        <div className="absolute inset-0 bg-black flex items-center justify-center z-[60]">
           <div className="w-full max-w-3xl p-4 md:p-8 bg-[#1a0a0a] border border-white/10 relative h-full md:h-auto overflow-y-auto">
              <h2 className="text-2xl md:text-3xl text-white font-bold tracking-widest mb-4 border-b border-white/10 pb-2">{t('CONTROLS')}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="p-3 md:p-4 border border-white/5 bg-white/5 rounded">
                      <div className="text-cyan-400 font-bold mb-1 tracking-widest text-sm">{t('CTRL_MOVE')}</div>
                      <div className="text-xs text-gray-400">{t('CTRL_MOVE_DESC')}</div>
                  </div>

                  <div className="p-3 md:p-4 border border-white/5 bg-white/5 rounded">
                      <div className="text-cyan-400 font-bold mb-1 tracking-widest text-sm">{t('CTRL_DASH')}</div>
                      <div className="text-xs text-gray-400">{t('CTRL_DASH_DESC')}</div>
                  </div>

                  <div className="p-3 md:p-4 border border-white/5 bg-white/5 rounded">
                      <div className="text-cyan-400 font-bold mb-1 tracking-widest text-sm">{t('CTRL_SURGE')}</div>
                      <div className="text-xs text-gray-400">{t('CTRL_SURGE_DESC')}</div>
                  </div>

                   <div className="p-3 md:p-4 border border-white/5 bg-white/5 rounded flex items-center justify-center">
                      <div className="text-xs text-yellow-500 font-mono text-center">{t('CTRL_NOTE')}</div>
                  </div>
              </div>

              <MenuButton variant="secondary" onClick={goBackFromControls}>{t('BACK')}</MenuButton>
           </div>
        </div>
      )}

      {gameState === GameState.BRIEFING && patient && (
         <div className="absolute inset-0 bg-black/95 flex items-center justify-center z-50">
             <div className="w-full max-w-2xl p-4 md:p-8 border border-cyan-500/20 bg-cyan-900/10 text-center relative overflow-hidden flex flex-col items-center">
                 <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500 shadow-[0_0_10px_#00ffff]"></div>
                 <h2 className="text-xl md:text-2xl text-cyan-400 tracking-[0.3em] mb-4 animate-pulse">{t('BRIEFING')}</h2>
                 
                 <div className="w-full bg-black/40 p-4 md:p-6 border-l-2 border-cyan-500 mb-4 md:mb-8 text-left font-mono text-xs md:text-base space-y-2">
                    <div className="flex justify-between">
                        <span className="text-gray-500">{t('PATIENT')}:</span>
                        <span className="text-white">{patient.name} [{patient.age}]</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">{t('LABEL_ID')}:</span>
                        <span className="text-white">#{patient.id}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">{t('LABEL_SYMPTOMS')}:</span>
                        <span className="text-red-400">{t(patient.symptoms)}</span>
                    </div>
                    <div className="flex justify-between border-t border-white/10 pt-2 mt-2">
                        <span className="text-gray-500">{t('STRAIN')}:</span>
                        <span className="text-yellow-400 font-bold">{t(`STRAIN_${patient.strain}`)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">{t('DIFFICULTY')}:</span>
                        <span className="text-red-500 font-bold">{t(`DIFF_${difficulty}`)}</span>
                    </div>
                 </div>

                 <div className="flex gap-2 md:gap-4 w-full">
                    <button onClick={openShop} className="flex-1 py-3 md:py-4 border border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10 font-bold text-xs md:text-base tracking-widest transition-all">
                        {t('OPEN_SHOP')}
                    </button>
                    <button onClick={deployToWave} className="flex-[2] py-3 md:py-4 bg-cyan-600 text-black font-bold text-xs md:text-base tracking-widest hover:bg-cyan-500 transition-all shadow-[0_0_20px_rgba(0,255,255,0.4)]">
                        {t('DEPLOY')}
                    </button>
                 </div>
                 
                 <button 
                    onClick={() => setGameState(GameState.MENU)}
                    className="mt-4 text-[10px] md:text-xs text-red-500/40 hover:text-red-500 tracking-[0.2em] border-b border-transparent hover:border-red-500 transition-all uppercase"
                 >
                    {t('ABORT')}
                 </button>
             </div>
         </div>
      )}

      {gameState === GameState.BIO_LAB && (
        <div className="absolute inset-0 bg-black/95 flex items-center justify-center z-50 p-2 md:p-4">
             <div className="w-full max-w-5xl h-full md:h-[90%] flex flex-col relative">
                <div className="flex justify-between items-center mb-2 md:mb-6 border-b border-white/10 pb-2 md:pb-4">
                    <h2 className="text-2xl md:text-4xl text-yellow-400 font-bold tracking-widest text-glow">{t('MUTATION')}</h2>
                    <div className="text-right">
                        <div className="text-[10px] md:text-xs text-gray-500 tracking-widest">{t('BIOMASS_AVAIL')}</div>
                        <div className="text-xl md:text-3xl font-mono text-yellow-400">{uiData.biomass}</div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4 overflow-y-auto pb-4 custom-scroll">
                    {upgrades.map((upgrade, idx) => {
                         const cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level));
                         const canAfford = uiData.biomass >= cost;
                         const isMaxed = upgrade.level >= upgrade.maxLevel;

                         return (
                            <div key={idx} className={`p-2 md:p-6 bg-[#151515] border ${upgrade.rarity === 'LEGENDARY' ? 'border-amber-500/30' : 'border-white/10'} relative group`}>
                                <div className="flex justify-between mb-1 md:mb-2">
                                    <span className={`text-[8px] md:text-[10px] px-1 md:px-2 py-0.5 border ${upgrade.rarity === 'LEGENDARY' ? 'text-amber-400 border-amber-400/30' : 'text-gray-400 border-gray-600'}`}>{upgrade.rarity}</span>
                                    <span className="text-[8px] md:text-xs text-gray-500">LVL {upgrade.level}/{upgrade.maxLevel}</span>
                                </div>
                                <h3 className="text-sm md:text-xl font-bold text-white mb-1 md:mb-2 leading-tight">{t(upgrade.nameKey)}</h3>
                                <p className="text-[10px] md:text-sm text-gray-400 mb-2 md:mb-4 h-8 md:h-10 leading-tight">{t(upgrade.descKey)}</p>
                                
                                <button 
                                    onClick={() => buyUpgrade(upgrade.id)}
                                    disabled={!canAfford || isMaxed}
                                    className={`w-full py-2 md:py-3 font-bold tracking-widest text-[10px] md:text-sm transition-all
                                        ${isMaxed 
                                            ? 'bg-green-900/20 text-green-500 border border-green-500/30 cursor-default' 
                                            : canAfford 
                                                ? 'bg-yellow-600 hover:bg-yellow-500 text-black shadow-[0_0_15px_rgba(255,170,0,0.3)]' 
                                                : 'bg-white/5 text-white/20 cursor-not-allowed'}`}
                                >
                                    {isMaxed ? t('MAXED') : `${t('PURCHASE')} [${cost}]`}
                                </button>
                            </div>
                         )
                    })}
                </div>

                <button onClick={closeShop} className="mt-auto py-3 md:py-4 w-full border-t border-white/10 text-white/50 hover:text-white hover:bg-white/5 transition-colors tracking-widest text-xs md:text-base">
                    {t('BACK')}
                </button>
             </div>
        </div>
      )}

      {/* (LOADOUT, SETTINGS, CREDITS, PAUSED, GAME_OVER) mantidos */}
      
      {gameState === GameState.GAME_OVER && (
        <div className="absolute inset-0 bg-red-950/95 flex items-center justify-center z-50">
           <div className="text-center p-4 md:p-8 border-y-2 border-red-600 w-full bg-black/50 backdrop-blur-md max-w-lg">
             <h2 className="text-3xl md:text-7xl font-bold text-red-500 mb-2 tracking-widest red-glow">{t('GAME_OVER')}</h2>
             
             <div className="grid grid-cols-2 gap-4 md:gap-8 mx-auto mb-4 md:mb-10 text-left mt-4 md:mt-8">
                 <div>
                     <div className="text-xs text-red-400/50">{t('SCORE')}</div>
                     <div className="text-xl md:text-3xl font-bold text-white">{uiData.score}</div>
                 </div>
                 <div>
                     <div className="text-xs text-red-400/50">{t('WAVE')}</div>
                     <div className="text-xl md:text-3xl font-bold text-white">{uiData.wave}</div>
                 </div>
             </div>
             
             {patient && (
                 <div className="mb-4 md:mb-8 text-xs md:text-sm font-mono text-gray-400">
                     {t('STATUS_TERM')}
                 </div>
             )}

             <MenuButton onClick={handleStartGame}>{t('RETRY')}</MenuButton>
           </div>
        </div>
      )}

      {isMobile && !isPaused && gameState === GameState.PLAYING && <Joystick onMove={handleJoystickMove} />}
      
      {/* NEW PAUSE MENU IMPLEMENTATION */}
      <PauseMenu 
          isPaused={isPaused} 
          language={language}
          gameState={gameState} // NEW: Passing game state
          onResume={togglePause} 
          onSettings={openSettings} // New Handler
          onQuit={() => {
              togglePause(); // Unpause logic
              setGameState(GameState.MENU);
          }}
      />
    </div>
  );
};
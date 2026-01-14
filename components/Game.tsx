/**
 * ------------------------------------------------------------------
 * COPYRIGHT (c) 2026 ESTÚDIO CRIA
 * DIRETOR: PAULO GABRIEL DE L. S.
 * ------------------------------------------------------------------
 * 
 * O CORAÇÃO PULSANTE (Game.tsx)
 * 
 * Bem-vindo à classe principal. Este arquivo é o ponto de encontro entre
 * a interface reativa do React (Menus, HUD, Botões) e a brutalidade imperativa
 * do GameEngine no Canvas HTML5.
 * 
 * ARQUITETURA "DUPLA CAMADA":
 * 1. Camada Canvas (Engine): Renderiza 60FPS, gerencia física, colisões e partículas.
 *    É "burra" para UI, mas rápida para matemática. Vive dentro do `engineRef`.
 * 
 * 2. Camada React (DOM): Gerencia estado do jogo (Menu, Playing, GameOver),
 *    inputs de UI, e renderiza textos/botões sobre o canvas. Vive nos `useState`.
 * 
 * CUIDADO:
 * Tentar renderizar o HUD do jogo (barra de vida, score) via React a cada frame (60fps)
 * vai derreter a CPU do mobile. Usamos um "throttle" (atualização espaçada) ou
 * desenhamos coisas críticas direto no Canvas.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from '../services/gameEngine';
import { audioManager } from '../services/audioManager';
import { achievementManager } from '../services/achievementManager';
import { GameState, PlayerStats, Upgrade, WaveConfig, Language, Difficulty, PatientProfile, ViralStrain, Achievement, ThemePalette } from '../types';
import { INITIAL_STATS, UPGRADES, WAVES, TEXTS, PATIENT_NAMES_FIRST, PATIENT_NAMES_LAST, SYMPTOMS_KEYS, COLORS_DEFAULT, COLORS_PLATINUM, ACHIEVEMENTS_LIST } from '../constants';
import { Joystick } from './Joystick';

// --- UI COMPONENTS (Pequenos componentes auxiliares) ---

/**
 * StatBar: Barra de progresso genérica com estilo Sci-Fi.
 * Aquele "skew-x" no CSS é o que faz ela parecer rápida.
 * O "animate-pulse" é pra quando a coisa fica crítica (ex: Adrenalina).
 */
const StatBar = ({ value, max, colorClass, label, animate = false }: any) => (
  <div className="flex flex-col w-full">
    <div className="flex justify-between items-end mb-1 px-1">
        <span className="text-[10px] md:text-xs font-bold tracking-widest text-white/70">{label}</span>
        <span className="text-[10px] md:text-xs font-mono text-white/70">{Math.floor(value)}/{max}</span>
    </div>
    <div className="h-2 md:h-3 w-full bg-black/50 border border-white/10 rounded-sm skew-x-[-10deg] overflow-hidden backdrop-blur-sm relative">
      <div 
        className={`h-full ${colorClass} transition-all duration-200 origin-left ${animate && value >= max ? 'animate-pulse brightness-150' : ''}`}
        style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
      />
      {/* Brilho fake no topo da barra */}
      <div className="absolute top-0 left-0 w-full h-[50%] bg-white/10"></div>
    </div>
  </div>
);

const IconButton = ({ onClick, icon }: any) => (
  <button 
    onClick={onClick} 
    className="p-3 bg-black/40 border border-white/20 rounded hover:bg-white/10 active:scale-95 transition-all text-white/80"
  >
    {icon}
  </button>
);

/**
 * MenuButton: O botão principal.
 * Usa `clip-path` para cortar o canto inferior direito. Estética Cyberpunk 101.
 * O efeito de hover (aquele brilho passando) é feito com uma div absoluta transformando no CSS.
 */
const MenuButton = ({ onClick, children, variant = 'primary', selected = false }: any) => {
  const base = "w-full py-4 font-bold text-xl tracking-widest uppercase clip-path-polygon transition-all hover:scale-105 shadow-[0_0_20px_rgba(0,0,0,0.4)] relative overflow-hidden group";
  let colors = "";
  
  if (variant === 'primary') {
      colors = "bg-red-600 hover:bg-red-500 text-black shadow-[0_0_20px_rgba(255,0,0,0.4)]";
  } else if (variant === 'secondary') {
      colors = selected 
        ? "bg-white text-black border border-white shadow-[0_0_15px_white]"
        : "bg-white/10 hover:bg-white/20 text-white border border-white/10";
  }
  
  return (
    <button onClick={onClick} className={`${base} ${colors}`} style={{clipPath: 'polygon(5% 0, 100% 0, 100% 70%, 95% 100%, 0 100%, 0 30%)'}}>
      <span className="relative z-10">{children}</span>
      <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
    </button>
  );
};

const VolumeSlider = ({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) => (
  <div className="mb-4">
    <div className="flex justify-between mb-1">
        <label className="text-gray-500 text-xs tracking-widest">{label}</label>
        <span className="text-cyan-400 text-xs font-mono">{(value * 100).toFixed(0)}%</span>
    </div>
    <input 
      type="range" min="0" max="1" step="0.05" 
      value={value} 
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-red-600"
    />
  </div>
);

const DatabaseCard = ({ title, desc, color }: any) => (
    <div className="bg-white/5 border border-white/10 p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full" style={{backgroundColor: color}}></div>
        <h3 className="text-lg font-bold mb-1" style={{color: color}}>{title}</h3>
        <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
    </div>
);

// --- ÍCONES SVG INLINE ---
// Porque baixar biblioteca de ícones é bloat. Desenhamos vetores na unha.

const IconSpeaker = ({ muted }: { muted: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        {muted ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        )}
        {muted && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9l-4 4m0-4l4 4" />}
    </svg>
);

const IconDNA = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
);

const IconTrophy = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
);

// --- MAIN COMPONENT ---

export const Game: React.FC = () => {
  // Referências Mutable para coisas que mudam rápido demais para o React.
  // Se colocássemos o Engine no State, o React tentaria re-renderizar a árvore inteira a cada frame.
  // O PC do usuário explodiria.
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  
  // --- STATE DO REACT (Gerenciamento de Fluxo) ---
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [lastGameState, setLastGameState] = useState<GameState>(GameState.MENU); // "Voltar"
  
  const [isPaused, setIsPaused] = useState(false);
  const [language, setLanguage] = useState<Language>('EN');
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.NORMAL);
  
  // Stats do jogador. Mudar isso aqui reflete na Engine e na UI.
  const [stats, setStats] = useState<PlayerStats>(INITIAL_STATS);
  
  // Loja de Upgrades. Clonamos o array inicial para não modificar a constante global por acidente.
  const [upgrades, setUpgrades] = useState<Upgrade[]>(UPGRADES.map(u => ({...u}))); 
  
  // Bridge State: Dados copiados da Engine para o React para exibir na HUD.
  // Não precisa ser perfeitamente sincronizado a 60fps.
  const [uiData, setUiData] = useState({ 
    health: 100, maxHealth: 100, score: 0, biomass: 0, 
    wave: 0, waveTime: 0, waveDuration: 1, energy: 0, maxEnergy: 100,
    combo: 0, dashReady: true, adrenaline: false
  });
  
  // Detecção de Mobile (pra mostrar o joystick virtual)
  const [isMobile, setIsMobile] = useState(false);
  
  // Dados do paciente procedural (flavor text)
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  
  // Áudio & Conquistas
  const [audioSettings, setAudioSettings] = useState(audioManager.settings);
  const [isMuted, setIsMuted] = useState(false);
  const [activeAchievement, setActiveAchievement] = useState<Achievement | null>(null);
  
  // O "Endgame": Se isPlatinum for true, o jogo vira um show de luzes douradas.
  const [isPlatinum, setIsPlatinum] = useState(false);
  const [colors, setColors] = useState<ThemePalette>(COLORS_DEFAULT);
  
  // Cheat Code Input: O segredo para os impacientes.
  const [cheatInput, setCheatInput] = useState("");

  // Helper de tradução
  const t = (key: string) => TEXTS[language][key] || key;

  // --- EFEITOS E INICIALIZAÇÃO ---

  // Detecta se é mobile no mount e no resize
  useEffect(() => {
    const checkMobile = () => {
      // Coarse pointer geralmente significa dedo.
      const hasTouch = window.matchMedia('(pointer: coarse)').matches;
      const multiTouch = navigator.maxTouchPoints > 0;
      setIsMobile(hasTouch || multiTouch);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Inicializa o Listener de Conquistas
  useEffect(() => {
      // Callback quando desbloqueia algo
      const handleUnlock = (ach: Achievement) => {
          setActiveAchievement(ach); // Mostra o popup
          setTimeout(() => setActiveAchievement(null), 4000); // Esconde depois de 4s
          audioManager.playPowerUp(); 
      };
      
      // Callback quando platina o jogo (The Apex Virus)
      const handlePlatinum = () => {
          setIsPlatinum(true);
          setColors(COLORS_PLATINUM); // Injeta a paleta dourada
      };

      achievementManager.setCallbacks(handleUnlock, handlePlatinum);
      
      // Verifica se já começou platinado (persistência)
      if (achievementManager.isPlatinumUnlocked()) {
          setIsPlatinum(true);
          setColors(COLORS_PLATINUM);
      }
  }, []);

  // Handlers para Ações de Jogo (Disparados por teclas ou botões virtuais)
  const triggerUltimate = useCallback(() => {
    // Só dispara se estiver jogando e não pausado. Lógica básica.
    if (engineRef.current && gameState === GameState.PLAYING && !isPaused) {
      engineRef.current.triggerSurge(stats);
    }
  }, [gameState, isPaused, stats]);

  const triggerDash = useCallback(() => {
    if (engineRef.current && gameState === GameState.PLAYING && !isPaused) {
      engineRef.current.triggerDash(stats);
    }
  }, [gameState, isPaused, stats]);

  // Listener de Teclado (WASD / Setas / Espaço / Shift)
  useEffect(() => {
    const keys = new Set<string>();
    const handleKey = (e: KeyboardEvent, isDown: boolean) => {
      // ESC pausa
      if (isDown && e.code === 'Escape' && gameState === GameState.PLAYING) {
          togglePause();
          return;
      }
      
      // Bloqueia input se não estiver jogando
      if ((gameState !== GameState.PLAYING && gameState !== GameState.WAVE_CLEARED) || isPaused) return;
      
      if (isDown) {
        keys.add(e.code);
        if (e.code === 'Space') triggerUltimate();
        if (e.code === 'ShiftLeft' || e.code === 'KeyE') triggerDash();
      } else {
        keys.delete(e.code);
      }

      // Calcula vetor de movimento baseado nas teclas pressionadas
      let x = 0;
      let y = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;

      // Normalização de vetor (para não andar mais rápido na diagonal)
      // Matemática de pitágoras: a hipotenusa de 1,1 é ~1.41. Temos que dividir por isso.
      if (x !== 0 && y !== 0) {
        const invLen = 1.0 / Math.sqrt(x * x + y * y);
        x *= invLen;
        y *= invLen;
      }

      // Envia o input vetorizado para a Engine
      if (engineRef.current) engineRef.current.inputVector = { x, y };
    };

    window.addEventListener('keydown', (e) => handleKey(e, true));
    window.addEventListener('keyup', (e) => handleKey(e, false));
    return () => {
       window.removeEventListener('keydown', (e) => handleKey(e, true));
       window.removeEventListener('keyup', (e) => handleKey(e, false));
    };
  }, [gameState, triggerUltimate, triggerDash, isPaused]);

  // Lógica de Deploy (Avançar Wave)
  const deployToWave = useCallback(() => {
      if (engineRef.current) {
          // Se currentWaveIndex for -1 (início), vai pra 0.
          const nextWaveIdx = engineRef.current.currentWaveIndex === -1 ? 0 : engineRef.current.currentWaveIndex + 1;
          engineRef.current.startWave(nextWaveIdx);
          setGameState(GameState.PLAYING);
          audioManager.startGameMusic();
      }
  }, []);

  // -- Navegação de Menus (Boilerplate) --
  const openShop = useCallback(() => setGameState(GameState.BIO_LAB), []);
  const closeShop = useCallback(() => setGameState(GameState.BRIEFING), []);
  
  const openLoadout = useCallback(() => {
      setIsPaused(true);
      setLastGameState(gameState);
      setGameState(GameState.LOADOUT);
  }, [gameState]);

  const closeLoadout = useCallback(() => {
      setIsPaused(false);
      setGameState(lastGameState);
  }, [lastGameState]);

  const openAchievements = useCallback(() => {
      setLastGameState(gameState);
      setGameState(GameState.ACHIEVEMENTS);
  }, [gameState]);

  // O famoso código Konami (adaptado para um hash maluco)
  const handleCheatInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setCheatInput(val);
      if (val === 'j6t2hybt26fwxgy2hvxjttbdy') { // Se alguém descobrir isso sem olhar o código, merece um prêmio.
          achievementManager.unlockAll();
          audioManager.playExplosion();
          audioManager.playPowerUp();
          setCheatInput("");
          alert("SYSTEM OVERRIDE: APEX PRIVILEGES GRANTED");
      }
  }

  // --- GAME LOOP (O Ciclo da Vida e Morte) ---
  const loop = useCallback((time: number) => {
    // Se a engine morreu (null), tenta reviver ou sai.
    if (!engineRef.current) {
        animationFrameRef.current = requestAnimationFrame(loop);
        return;
    }

    // Se não estamos jogando ou está pausado, apenas atualiza o tempo delta 
    // mas não roda a lógica de física.
    if ((gameState !== GameState.PLAYING && gameState !== GameState.WAVE_CLEARED) || isPaused) {
        lastTimeRef.current = time;
        animationFrameRef.current = requestAnimationFrame(loop);
        return;
    }
    
    // Delta Time: Tempo entre frames. Essencial para física frame-rate independent.
    const dt = time - lastTimeRef.current;
    lastTimeRef.current = time;

    if (engineRef.current) {
      if (gameState === GameState.PLAYING) {
          // Update da Engine: Move bichos, calcula colisão, mata o jogador.
          // Recebe callbacks para mudar o estado do React (WaveClear, GameOver).
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
            }
          );
      }
      
      // Renderiza o Canvas (Draw calls)
      engineRef.current.draw();
      
      // Sincronização Engine -> React UI
      // ATENÇÃO: Usamos Math.random() < 0.5 como um "Throttle" barato.
      // Atualizar o estado do React a 60fps é pedir pra travar.
      // Atualizar a ~30fps é suave e imperceptível pro olho humano na UI.
      if (Math.random() < 0.5) {
          const eng = engineRef.current;
          const waveIdx = Math.max(0, Math.min(eng.currentWaveIndex, WAVES.length - 1));
          const currentWaveConfig = WAVES[waveIdx];
          
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
            adrenaline: eng.adrenalineActive
          });
      }
    }
    
    // Agenda o próximo frame
    animationFrameRef.current = requestAnimationFrame(loop);
  }, [gameState, stats, isPaused]);

  // Inicia o Loop ao montar o componente
  useEffect(() => {
    lastTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(loop);
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); }
  }, [loop]);

  // --- LÓGICA DE PARTIDA ---

  const generatePatient = () => {
      // Cria um paciente aleatório pra você sentir pena antes de ele morrer.
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

  const handleStartGame = () => {
     audioManager.init(); // O navegador exige interação do usuário pra ligar o áudio.
     
     const newPatient = generatePatient();
     setPatient(newPatient);

     if (canvasRef.current) {
         // Instancia a Engine. Passamos a referência do canvas e as configurações.
         // É aqui que a "alma" do jogo é criada.
         engineRef.current = new GameEngine(canvasRef.current, INITIAL_STATS, newPatient, difficulty, colors);
         
         // Reseta estados
         setStats(INITIAL_STATS);
         setUpgrades(UPGRADES.map(u => ({...u}))); 
         setUiData({ 
           health: 100, maxHealth: 100, score: 0, biomass: 0, 
           wave: 1, waveTime: 0, waveDuration: 1, energy: 0, maxEnergy: 100, combo: 0, dashReady: true, adrenaline: false 
         });
         
         setGameState(GameState.BRIEFING);
         setIsPaused(false);
     }
  };

  const buyUpgrade = (upgradeId: string) => {
      // Transação segura de upgrades.
      // Valida tudo duas vezes pra evitar que o jogador quebre o jogo clicando rápido demais.
      if (!engineRef.current) {
          console.warn("CRITICAL: Engine instance is null during transaction.");
          return;
      }
      
      const upgIdx = upgrades.findIndex(u => u.id === upgradeId);
      if (upgIdx === -1) {
          console.error("CRITICAL: Invalid upgrade ID requested:", upgradeId);
          return;
      }
      
      const upgState = upgrades[upgIdx];
      // Fonte da verdade: CONSTANTS.
      const upgDef = UPGRADES.find(u => u.id === upgradeId);
      
      if (!upgDef) {
          console.error("CRITICAL: Upgrade Definition not found for ID:", upgradeId);
          return;
      }

      // Cálculo de custo exponencial (inflação gamer)
      const cost = Math.floor(upgState.baseCost * Math.pow(upgState.costMultiplier, upgState.level));
      
      // Validação de saldo
      if (isNaN(engineRef.current.biomass) || engineRef.current.biomass < 0) {
          engineRef.current.biomass = 0; 
          console.error("State Corruption: Biomass reset.");
          return;
      }

      if (engineRef.current.biomass >= cost && upgState.level < upgState.maxLevel) {
          // Backup do estado para rollback em caso de falha na aplicação
          const prevStats = {...stats};

          try {
              // Deduz saldo na Engine
              engineRef.current.biomass -= cost;
              
              // Aplica lógica de upgrade
              const newStats = upgDef.apply(stats);
              
              // Sanity check
              if (isNaN(newStats.damage) || isNaN(newStats.maxHealth)) {
                   throw new Error("Upgrade resulted in NaN stats.");
              }

              setStats(newStats);
              audioManager.playPowerUp();
              
              // Atualiza nível na UI
              const newUpgrades = [...upgrades];
              newUpgrades[upgIdx] = {
                  ...newUpgrades[upgIdx],
                  level: newUpgrades[upgIdx].level + 1
              };
              setUpgrades(newUpgrades);
              
              // Atualiza UI de Biomassa imediatamente
              setUiData(prev => ({...prev, biomass: engineRef.current!.biomass}));
              
              // Verifica Conquistas relacionadas a upgrades
              if (newUpgrades[upgIdx].level >= newUpgrades[upgIdx].maxLevel) {
                  if (upgradeId === 'mitosis') achievementManager.track('fire_rate_max', 1);
              }
              
              const boughtCount = newUpgrades.filter(u => u.level > 0).length;
              achievementManager.set('unlock_all_upgrades', boughtCount);

          } catch (e) {
              console.error("Upgrade transaction failed. Rolling back.", e);
              engineRef.current.biomass += cost; // Devolve o dinheiro
              setStats(prevStats); // Restaura stats
          }
      }
  };

  const handleJoystickMove = (vec: {x: number, y: number}) => {
    // Passa o input do componente React Joystick para a Engine
    if (engineRef.current) engineRef.current.inputVector = vec;
  };

  const togglePause = () => {
      setIsPaused(p => !p);
      if (!isPaused) audioManager.stopMusic();
      else audioManager.startGameMusic();
  };

  const toggleMute = () => {
      const newVal = !isMuted;
      setIsMuted(newVal);
      // Muta o master ou restaura
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
          setGameState(GameState.PLAYING);
          // Volta pausado pra não morrer instantaneamente
          if (!isPaused) setIsPaused(true); 
      }
  }

  // --- RENDERIZAÇÃO (JSX) ---
  // A parte onde misturamos HTML dentro do JS e chamamos de "Moderno".

  return (
    <div className={`relative w-full h-screen overflow-hidden text-white select-none ${isPlatinum ? 'bg-[#0a0a1a]' : 'bg-[#0f0505]'}`} style={{fontFamily: 'var(--font-tech)'}}>
      {/* O CANVAS: Onde o jogo realmente acontece */}
      <canvas ref={canvasRef} className="block w-full h-full object-contain" />
      
      {/* OVERLAYS: Efeitos visuais por cima do canvas */}
      <div className="vignette"></div>
      <div className="scanlines"></div>
      <div className="vein-overlay opacity-20" style={{filter: isPlatinum ? 'hue-rotate(240deg)' : 'none'}}></div>

      {/* --- TOAST DE CONQUISTA (A dopamina do jogador) --- */}
      <div className={`absolute top-4 left-1/2 transform -translate-x-1/2 z-[100] transition-all duration-500 ease-out ${activeAchievement ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0'}`}>
          {activeAchievement && (
              <div className={`flex items-center gap-4 p-4 rounded border-2 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-md min-w-[300px]
                  ${isPlatinum 
                      ? 'bg-purple-900/80 border-amber-400 shadow-[0_0_20px_rgba(255,215,0,0.3)]' 
                      : 'bg-black/90 border-cyan-500 shadow-[0_0_20px_rgba(0,255,255,0.3)]'}`}>
                  <div className="text-4xl animate-bounce">{activeAchievement.icon}</div>
                  <div>
                      <div className={`text-xs font-bold tracking-widest mb-1 ${isPlatinum ? 'text-amber-400' : 'text-cyan-400'}`}>{t('ACHIEVEMENTS')} UNLOCKED</div>
                      <div className="text-lg font-bold text-white">{activeAchievement.title}</div>
                      <div className="text-xs text-gray-400">{activeAchievement.desc}</div>
                  </div>
              </div>
          )}
      </div>

      {/* --- HUD (Heads Up Display) --- */}
      {(gameState === GameState.PLAYING || gameState === GameState.WAVE_CLEARED || gameState === GameState.LOADOUT) && (
        <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-2 md:p-6">
           {/* Top HUD */}
           <div className="flex justify-between items-start">
             <div className="flex flex-col gap-3 w-40 md:w-64">
                <StatBar label={t('INTEGRITY')} value={uiData.health} max={uiData.maxHealth} colorClass={uiData.adrenaline ? "bg-red-600 animate-pulse" : (isPlatinum ? "bg-gradient-to-r from-purple-500 to-amber-400" : "bg-gradient-to-r from-red-600 to-red-400")} />
                <StatBar label={t('SURGE_READY')} value={uiData.energy} max={uiData.maxEnergy} colorClass={isPlatinum ? "bg-gradient-to-r from-amber-400 to-white" : "bg-gradient-to-r from-cyan-600 to-cyan-400"} animate={true}/>
                
                {uiData.adrenaline && (
                    <div className="text-red-500 font-bold tracking-widest text-xs animate-pulse text-glow border border-red-500/50 bg-red-900/20 px-2 py-1">
                        ⚠ {t('ADRENALINE')} ⚠
                    </div>
                )}

                {!isMobile && (
                    <div className="flex gap-2 items-center mt-2">
                        <div className={`h-2 w-8 skew-x-[-10deg] transition-all duration-300 ${uiData.dashReady ? 'bg-white shadow-[0_0_10px_white]' : 'bg-white/20'}`}></div>
                        <span className="text-[10px] tracking-widest text-white/70">{t('DASH')}</span>
                    </div>
                )}
             </div>

             <div className="flex flex-col items-center">
                 <div className="bg-black/50 border border-white/10 px-4 py-1 rounded-full backdrop-blur-md mb-1">
                     <span className={`font-bold tracking-widest text-lg md:text-2xl text-glow ${isPlatinum ? 'text-amber-400' : 'text-red-400'}`}>{t('WAVE')} {uiData.wave}</span>
                 </div>
                 <div className="text-xs text-white/50 tracking-widest">{(uiData.waveDuration - uiData.waveTime).toFixed(0)}s</div>
                 
                 <div className={`mt-4 transition-all duration-200 ${uiData.combo > 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                     <div className="text-4xl font-black italic text-yellow-400 text-glow" style={{textShadow: '0 0 20px orange'}}>
                         {uiData.combo}x
                     </div>
                     <div className="text-xs font-bold text-yellow-600 tracking-[0.5em] text-center">{t('COMBO')}</div>
                 </div>
             </div>

             <div className="flex flex-col items-end gap-2">
                 <div className="pointer-events-auto flex gap-2">
                     <IconButton onClick={openLoadout} icon={<IconDNA />} />
                     <IconButton onClick={toggleMute} icon={<IconSpeaker muted={isMuted} />} />
                     <IconButton onClick={togglePause} icon={<span className="font-bold text-xl">||</span>} />
                 </div>
                 <div className="text-right">
                    <div className="text-xs text-white/50 tracking-widest">{t('SCORE')}</div>
                    <div className="text-2xl md:text-3xl font-bold font-mono text-white tracking-tighter cyan-glow">{uiData.score.toString().padStart(6, '0')}</div>
                    <div className="text-xs text-yellow-500 tracking-widest mt-1">{t('BIOMASS_AVAIL')}</div>
                    <div className="text-xl font-bold font-mono text-yellow-400 tracking-tighter">{uiData.biomass}</div>
                 </div>
             </div>
           </div>

           {/* Mobile Controls Layer (Botões Virtuais) */}
           {isMobile && !isPaused && (
             <div className="absolute inset-0 z-10 pointer-events-none">
                 <div className="absolute bottom-8 right-8 pointer-events-auto flex gap-4 items-end">
                     {/* Dash Button */}
                     <button 
                        onClick={triggerDash}
                        disabled={!uiData.dashReady}
                        className={`w-16 h-16 rounded-full border-2 flex items-center justify-center relative transition-all duration-100 active:scale-95
                            ${uiData.dashReady
                                ? 'border-white bg-white/20' 
                                : 'border-white/10 bg-black/40 opacity-50'}`}
                     >
                         <div className={`absolute inset-0 bg-white/30 rounded-full transition-all duration-500 ${uiData.dashReady ? 'scale-0' : 'scale-100'}`} style={{clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0% 100%)'}}></div>
                         <span className="font-bold text-xs">DASH</span>
                     </button>

                     {/* Surge Button */}
                     <button 
                        onClick={triggerUltimate}
                        disabled={uiData.energy < uiData.maxEnergy}
                        className={`w-24 h-24 rounded-full border-4 flex items-center justify-center relative transition-all duration-100 active:scale-95
                            ${uiData.energy >= uiData.maxEnergy 
                                ? (isPlatinum ? 'border-amber-400 bg-amber-900/40 shadow-[0_0_30px_rgba(255,215,0,0.4)]' : 'border-cyan-400 bg-cyan-900/40 shadow-[0_0_30px_rgba(0,255,255,0.4)]')
                                : 'border-white/10 bg-black/40 grayscale opacity-50'}`}
                     >
                         <div className={`absolute inset-0 rounded-full border border-dashed border-white/20 ${uiData.energy >= uiData.maxEnergy ? 'animate-spin-slow' : ''}`}></div>
                         <span className={`font-bold text-sm tracking-widest ${uiData.energy >= uiData.maxEnergy ? (isPlatinum ? 'text-amber-200' : 'text-cyan-200') : 'text-white/30'}`}>SURGE</span>
                     </button>
                 </div>
             </div>
           )}
        </div>
      )}
      
      {/* --- MENUS DO JOGO (States diferentes) --- */}

      {/* Main Menu */}
      {gameState === GameState.MENU && (
        <div className="absolute inset-0 bg-black flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
          <div className="relative text-center p-8 max-w-md w-full">
            <h1 className={`text-7xl md:text-9xl font-bold mb-2 tracking-tighter mix-blend-screen leading-none ${isPlatinum ? 'text-amber-400 shadow-[0_0_30px_rgba(255,170,0,0.5)]' : 'text-red-600 red-glow'}`} style={{fontFamily: 'Impact, sans-serif'}}>{t('TITLE_MAIN')}</h1>
            <h2 className="text-4xl md:text-5xl font-light text-white mb-8 tracking-[0.5em] -mt-2 opacity-80">{t('TITLE_SUB')}</h2>
            
            {isPlatinum && <div className="text-xs tracking-[0.5em] text-purple-400 mb-4 animate-pulse">{t('ACH_PLATINUM_MSG')}</div>}

            <div className="mb-8">
                <div className="text-xs text-gray-500 tracking-widest mb-2">{t('DIFFICULTY')}</div>
                <div className="grid grid-cols-4 gap-2">
                    {Object.values(Difficulty).map(d => (
                        <button 
                            key={d} 
                            onClick={() => setDifficulty(d)}
                            className={`text-[10px] font-bold py-2 border transition-all ${difficulty === d ? 'bg-red-600 text-black border-red-600' : 'bg-transparent text-gray-500 border-gray-800'}`}
                        >
                            {t(`DIFF_${d}`)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <MenuButton onClick={() => { handleStartGame(); audioManager.startMenuMusic(); }}>{t('START')}</MenuButton>
                <div className="grid grid-cols-2 gap-4">
                  <MenuButton variant="secondary" onClick={() => openControls(true)}>{t('CONTROLS')}</MenuButton>
                  <MenuButton variant="secondary" onClick={() => setGameState(GameState.MANUAL)}>{t('MANUAL')}</MenuButton>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <MenuButton variant="secondary" onClick={() => setGameState(GameState.SETTINGS)}>{t('SETTINGS')}</MenuButton>
                  <MenuButton variant="secondary" onClick={openAchievements}>{t('ACHIEVEMENTS')}</MenuButton>
                </div>
                
                <div className="flex justify-center gap-4 mt-6">
                    {(['EN', 'PT', 'ES'] as Language[]).map(l => (
                      <button 
                        key={l}
                        onClick={() => setLanguage(l)} 
                        className={`text-sm font-bold tracking-widest px-2 py-1 border-b-2 transition-all ${language === l ? 'text-white border-red-500' : 'text-gray-600 border-transparent'}`}
                      >
                        {l}
                      </button>
                    ))}
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Achievement Menu */}
      {gameState === GameState.ACHIEVEMENTS && (
          <div className="absolute inset-0 bg-black flex items-center justify-center z-50">
              <div className={`w-full max-w-6xl h-[90%] border p-8 relative flex flex-col ${isPlatinum ? 'border-amber-500/50 bg-purple-900/10' : 'border-white/10 bg-[#1a0a0a]'}`}>
                  <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4 flex-shrink-0">
                      <h2 className={`text-4xl font-bold tracking-widest ${isPlatinum ? 'text-amber-400' : 'text-cyan-400'}`}>{t('ACHIEVEMENTS')}</h2>
                      <div className="flex items-center gap-2">
                          <IconTrophy />
                          <span className="text-xl font-mono">
                              {Object.values(achievementManager.getProgress()).filter(p => p.unlocked).length} / {ACHIEVEMENTS_LIST.length}
                          </span>
                      </div>
                  </div>

                  {/* Scrollable Container */}
                  <div className="flex-1 overflow-y-auto pr-2 custom-scroll min-h-0">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-4">
                          {ACHIEVEMENTS_LIST.map((ach) => {
                              const progress = achievementManager.getProgress()[ach.id] || { unlocked: false, currentValue: 0 };
                              const isLocked = !progress.unlocked;
                              // Oculta conquistas secretas bloqueadas
                              if (ach.secret && isLocked) {
                                  return (
                                      <div key={ach.id} className="bg-black/60 border border-white/5 p-6 flex items-center justify-center opacity-50 min-h-[120px]">
                                          <span className="text-xs tracking-widest text-gray-600 font-mono">??? ENCRYPTED DATA ???</span>
                                      </div>
                                  )
                              }

                              return (
                                  <div key={ach.id} className={`p-6 border relative overflow-hidden transition-all group flex flex-col min-h-[140px]
                                      ${isLocked ? 'border-white/10 bg-black/80 grayscale opacity-70' : 
                                        (ach.id === 'all_achievements' ? 'border-amber-500 bg-amber-900/30 shadow-[0_0_20px_rgba(255,215,0,0.2)]' : 'border-cyan-500/30 bg-cyan-900/20')}`}>
                                      <div className="flex items-start gap-6 z-10 relative h-full">
                                          <div className="text-4xl filter drop-shadow-md pt-1">{ach.icon}</div>
                                          <div className="flex-1 flex flex-col h-full">
                                              <h4 className={`font-bold text-lg mb-2 ${isLocked ? 'text-gray-500' : 'text-white'}`}>{ach.title}</h4>
                                              <p className={`text-sm mb-4 leading-relaxed flex-1 ${isLocked ? 'text-gray-600' : 'text-gray-300'}`}>{ach.desc}</p>
                                              
                                              <div className="mt-auto w-full">
                                                  {/* Barra de Progresso cumulativa */}
                                                  {ach.isCumulative && !progress.unlocked && (
                                                      <div className="w-full h-1.5 bg-black rounded overflow-hidden mb-2 border border-white/5">
                                                          <div className="h-full bg-cyan-600" style={{width: `${Math.min(100, (progress.currentValue / ach.targetValue)*100)}%`}}></div>
                                                      </div>
                                                  )}
                                                  
                                                  <div className="flex justify-between text-xs tracking-widest font-mono">
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

                  <div className="mt-6 pt-4 border-t border-white/10 flex-shrink-0">
                      <MenuButton variant="secondary" onClick={() => setGameState(GameState.MENU)}>{t('BACK')}</MenuButton>
                  </div>
              </div>
          </div>
      )}

      {/* Manual / Database Screen */}
      {gameState === GameState.MANUAL && (
        <div className="absolute inset-0 bg-black flex items-center justify-center z-50">
           <div className="w-full max-w-4xl p-6 md:p-10 bg-[#1a0a0a] border border-white/10 relative h-[90vh] flex flex-col">
              <h2 className="text-3xl text-white font-bold tracking-widest mb-6 border-b border-white/10 pb-4 flex justify-between">
                  <span>{t('MANUAL')}</span>
                  <span className="text-cyan-500 text-sm font-mono tracking-normal opacity-50">DB-V2.4</span>
              </h2>
              
              <div className="flex-1 overflow-y-auto custom-scroll pr-4 space-y-8">
                  
                  {/* Hostiles Section */}
                  <section>
                      <h4 className="text-cyan-400 font-bold tracking-[0.2em] mb-4 text-sm border-l-2 border-cyan-500 pl-3">{t('MANUAL_HOSTILES')}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <DatabaseCard title="BACTERIA" desc={t('MANUAL_BAC_DESC')} color={COLORS_DEFAULT.BACTERIA} />
                          <DatabaseCard title="VIRUS" desc={t('MANUAL_VIR_DESC')} color={COLORS_DEFAULT.VIRUS} />
                          <DatabaseCard title="PARASITE" desc={t('MANUAL_PAR_DESC')} color={COLORS_DEFAULT.PARASITE} />
                          <DatabaseCard title="BOSS" desc={t('MANUAL_BOSS_DESC')} color={COLORS_DEFAULT.BOSS} />
                      </div>
                  </section>

                  {/* Mechanics Section */}
                  <section>
                      <h4 className="text-white font-bold tracking-[0.2em] mb-4 text-sm border-l-2 border-white pl-3">{t('MANUAL_MECHANICS')}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                           <DatabaseCard title={t('MANUAL_MECH_DASH_TITLE')} desc={t('MANUAL_MECH_DASH_DESC')} color="#fff" />
                           <DatabaseCard title={t('MANUAL_MECH_SURGE_TITLE')} desc={t('MANUAL_MECH_SURGE_DESC')} color={COLORS_DEFAULT.PLAYER_CORE} />
                           <DatabaseCard title={t('MANUAL_MECH_COMBO_TITLE')} desc={t('MANUAL_MECH_COMBO_DESC')} color={COLORS_DEFAULT.COMBO} />
                      </div>
                  </section>

                  {/* Strains Section */}
                  <section>
                      <h4 className="text-yellow-400 font-bold tracking-[0.2em] mb-4 text-sm border-l-2 border-yellow-500 pl-3">{t('MANUAL_STRAINS')}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <DatabaseCard title={t('STRAIN_STANDARD')} desc={t('STRAIN_STD_DESC')} color="#fff" />
                           <DatabaseCard title={t('STRAIN_SWARM')} desc={t('STRAIN_SWM_DESC')} color="#ff00ff" />
                           <DatabaseCard title={t('STRAIN_TITAN')} desc={t('STRAIN_TTN_DESC')} color="#ffaa00" />
                           <DatabaseCard title={t('STRAIN_VOLATILE')} desc={t('STRAIN_VOL_DESC')} color="#ff4444" />
                      </div>
                  </section>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10">
                  <MenuButton variant="secondary" onClick={() => setGameState(GameState.MENU)}>{t('BACK')}</MenuButton>
              </div>
           </div>
        </div>
      )}

      {/* Controls Screen */}
      {gameState === GameState.CONTROLS && (
        <div className="absolute inset-0 bg-black flex items-center justify-center z-[60]">
           <div className="w-full max-w-3xl p-8 bg-[#1a0a0a] border border-white/10 relative">
              <h2 className="text-3xl text-white font-bold tracking-widest mb-8 border-b border-white/10 pb-4">{t('CONTROLS')}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  {/* Movement */}
                  <div className="p-4 border border-white/5 bg-white/5 rounded">
                      <div className="text-cyan-400 font-bold mb-2 tracking-widest">{t('CTRL_MOVE')}</div>
                      <div className="text-sm text-gray-400">{t('CTRL_MOVE_DESC')}</div>
                      <div className="mt-4 flex gap-2 opacity-50">
                          <div className="w-8 h-8 border border-white flex items-center justify-center text-xs">W</div>
                          <div className="w-8 h-8 border border-white flex items-center justify-center text-xs">A</div>
                          <div className="w-8 h-8 border border-white flex items-center justify-center text-xs">S</div>
                          <div className="w-8 h-8 border border-white flex items-center justify-center text-xs">D</div>
                      </div>
                  </div>

                  {/* Dash */}
                  <div className="p-4 border border-white/5 bg-white/5 rounded">
                      <div className="text-cyan-400 font-bold mb-2 tracking-widest">{t('CTRL_DASH')}</div>
                      <div className="text-sm text-gray-400">{t('CTRL_DASH_DESC')}</div>
                      <div className="mt-4 opacity-50">
                           <div className="px-3 py-1 border border-white inline-block text-xs">SHIFT</div>
                      </div>
                  </div>

                  {/* Surge */}
                  <div className="p-4 border border-white/5 bg-white/5 rounded">
                      <div className="text-cyan-400 font-bold mb-2 tracking-widest">{t('CTRL_SURGE')}</div>
                      <div className="text-sm text-gray-400">{t('CTRL_SURGE_DESC')}</div>
                      <div className="mt-4 opacity-50">
                           <div className="px-6 py-1 border border-white inline-block text-xs">SPACE</div>
                      </div>
                  </div>

                   {/* Note */}
                   <div className="p-4 border border-white/5 bg-white/5 rounded flex items-center justify-center">
                      <div className="text-sm text-yellow-500 font-mono text-center">{t('CTRL_NOTE')}</div>
                  </div>
              </div>

              <MenuButton variant="secondary" onClick={goBackFromControls}>{t('BACK')}</MenuButton>
           </div>
        </div>
      )}

      {/* Briefing Screen (Gerado dinamicamente) */}
      {gameState === GameState.BRIEFING && patient && (
         <div className="absolute inset-0 bg-black/95 flex items-center justify-center z-50">
             <div className="w-full max-w-2xl p-8 border border-cyan-500/20 bg-cyan-900/10 text-center relative overflow-hidden flex flex-col items-center">
                 <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500 shadow-[0_0_10px_#00ffff]"></div>
                 <h2 className="text-2xl text-cyan-400 tracking-[0.3em] mb-4 animate-pulse">{t('BRIEFING')}</h2>
                 
                 <div className="w-full bg-black/40 p-6 border-l-2 border-cyan-500 mb-8 text-left font-mono text-sm md:text-base space-y-2">
                    <div className="flex justify-between">
                        <span className="text-gray-500">{t('PATIENT')}:</span>
                        <span className="text-white">{patient.name} [{patient.age}]</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">ID:</span>
                        <span className="text-white">#{patient.id}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">SYMPTOMS:</span>
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

                 <div className="flex gap-4 w-full">
                    <button onClick={openShop} className="flex-1 py-4 border border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10 font-bold tracking-widest transition-all">
                        {t('OPEN_SHOP')}
                    </button>
                    <button onClick={deployToWave} className="flex-[2] py-4 bg-cyan-600 text-black font-bold tracking-widest hover:bg-cyan-500 transition-all shadow-[0_0_20px_rgba(0,255,255,0.4)]">
                        {t('DEPLOY')}
                    </button>
                 </div>
             </div>
         </div>
      )}

      {/* Bio-Lab (Loja) */}
      {gameState === GameState.BIO_LAB && (
        <div className="absolute inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
             <div className="w-full max-w-5xl h-[90%] flex flex-col relative">
                <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                    <h2 className="text-4xl text-yellow-400 font-bold tracking-widest text-glow">{t('MUTATION')}</h2>
                    <div className="text-right">
                        <div className="text-xs text-gray-500 tracking-widest">{t('BIOMASS_AVAIL')}</div>
                        <div className="text-3xl font-mono text-yellow-400">{uiData.biomass}</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 overflow-y-auto pb-4">
                    {upgrades.map((upgrade, idx) => {
                         const cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level));
                         const canAfford = uiData.biomass >= cost;
                         const isMaxed = upgrade.level >= upgrade.maxLevel;

                         return (
                            <div key={idx} className={`p-6 bg-[#151515] border ${upgrade.rarity === 'LEGENDARY' ? 'border-amber-500/30' : 'border-white/10'} relative group`}>
                                <div className="flex justify-between mb-2">
                                    <span className={`text-[10px] px-2 py-0.5 border ${upgrade.rarity === 'LEGENDARY' ? 'text-amber-400 border-amber-400/30' : 'text-gray-400 border-gray-600'}`}>{upgrade.rarity}</span>
                                    <span className="text-xs text-gray-500">LVL {upgrade.level}/{upgrade.maxLevel}</span>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">{t(upgrade.nameKey)}</h3>
                                <p className="text-sm text-gray-400 mb-4 h-10">{t(upgrade.descKey)}</p>
                                
                                <button 
                                    onClick={() => buyUpgrade(upgrade.id)}
                                    disabled={!canAfford || isMaxed}
                                    className={`w-full py-3 font-bold tracking-widest text-sm transition-all
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

                <button onClick={closeShop} className="mt-auto py-4 w-full border-t border-white/10 text-white/50 hover:text-white hover:bg-white/5 transition-colors tracking-widest">
                    {t('BACK')}
                </button>
             </div>
        </div>
      )}

      {/* Loadout Menu (In-Game) */}
      {gameState === GameState.LOADOUT && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-6">
              <div className="w-full max-w-4xl h-[80%] border border-cyan-500/30 p-8 relative flex flex-col">
                  <h2 className="text-3xl text-cyan-400 font-bold tracking-widest mb-8 border-b border-cyan-500/30 pb-4">{t('LOADOUT')}</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto">
                      {upgrades.filter(u => u.level > 0).length === 0 && (
                          <div className="col-span-3 text-center text-white/30 py-10 font-mono">NO ACTIVE MUTATIONS DETECTED</div>
                      )}
                      
                      {upgrades.filter(u => u.level > 0).map((u, i) => (
                          <div key={i} className="bg-cyan-900/10 border border-cyan-500/20 p-4">
                              <div className="flex justify-between mb-1">
                                  <span className="text-xs text-cyan-500">{u.rarity}</span>
                                  <span className="text-xs font-mono text-white">LVL {u.level}</span>
                              </div>
                              <h3 className="font-bold text-white mb-1">{t(u.nameKey)}</h3>
                              <p className="text-xs text-gray-400">{t(u.descKey)}</p>
                          </div>
                      ))}
                  </div>

                  <div className="mt-auto pt-6">
                      <MenuButton variant="secondary" onClick={closeLoadout}>{t('RESUME')}</MenuButton>
                  </div>
              </div>
          </div>
      )}

      {/* Settings Menu */}
      {gameState === GameState.SETTINGS && (
        <div className="absolute inset-0 bg-black flex items-center justify-center z-50">
           <div className="w-full max-w-md p-8 bg-[#1a0a0a] border border-white/10 relative">
              <h2 className="text-3xl text-white font-bold tracking-widest mb-8 border-b border-white/10 pb-4">{t('SETTINGS')}</h2>
              
              <div className="space-y-6 mb-8">
                 <div>
                    <label className="block text-gray-500 text-xs tracking-widest mb-2">{t('LANG')}</label>
                    <div className="flex gap-2">
                       {(['EN', 'PT', 'ES'] as Language[]).map(l => (
                          <button key={l} onClick={() => setLanguage(l)} className={`flex-1 py-3 border border-white/10 ${language === l ? 'bg-red-600 text-white' : 'bg-black text-gray-400'}`}>{l}</button>
                       ))}
                    </div>
                 </div>
                 
                 <div>
                    <div className="text-xs text-gray-500 tracking-widest mb-4 border-b border-white/5 pb-2">AUDIO</div>
                    <VolumeSlider label="MASTER" value={audioSettings.master} onChange={(v) => updateAudio('master', v)} />
                    <VolumeSlider label="MUSIC" value={audioSettings.music} onChange={(v) => updateAudio('music', v)} />
                    <VolumeSlider label="SFX" value={audioSettings.sfx} onChange={(v) => updateAudio('sfx', v)} />
                 </div>

                 {/* Cheat Input (Easter Egg) */}
                 <div className="mt-8 pt-4 border-t border-white/5">
                     <label className="block text-gray-700 text-[10px] tracking-widest mb-2 text-center uppercase">System Override</label>
                     <input 
                        type="password" 
                        value={cheatInput} 
                        onChange={handleCheatInput}
                        className="w-full bg-black border border-white/10 p-2 text-center text-xs tracking-widest text-red-500 focus:outline-none focus:border-red-500/50 transition-colors"
                        placeholder="ACCESS CODE"
                     />
                 </div>
              </div>

              <MenuButton variant="secondary" onClick={() => setGameState(GameState.MENU)}>{t('BACK')}</MenuButton>
           </div>
        </div>
      )}

      {/* Credits */}
      {gameState === GameState.CREDITS && (
         <div className="absolute inset-0 bg-black flex items-center justify-center z-50">
            <div className="w-full max-w-md p-8 text-center">
               <h2 className="text-3xl text-white font-bold tracking-widest mb-8">{t('CREDITS')}</h2>
               <div className="space-y-4 text-gray-400 font-mono text-sm mb-8">
                  <p>{t('ROLE_DEV')}</p>
                  <p className="text-white text-xl">{t('DEV_STUDIO')}</p>
                  <div className="h-4"></div>
                  <p>{t('ROLE_DIR')}</p>
                  <p className="text-white">{t('DIRECTOR')}</p>
               </div>
               <MenuButton variant="secondary" onClick={() => setGameState(GameState.MENU)}>{t('BACK')}</MenuButton>
            </div>
         </div>
      )}

      {/* Pause Menu (Enhanced) */}
      {isPaused && gameState !== GameState.CONTROLS && gameState !== GameState.LOADOUT && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#1a0a0a] border border-white/10 p-10 text-center shadow-2xl relative overflow-hidden w-full max-w-md">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
                <h2 className="text-4xl text-white font-bold tracking-widest mb-8">{t('PAUSED')}</h2>
                
                {/* Audio Controls In-Game */}
                <div className="mb-8 text-left">
                    <div className="text-xs text-gray-500 tracking-widest mb-2 border-b border-white/5 pb-1">{t('AUDIO_LINK')}</div>
                    <VolumeSlider label="MASTER" value={audioSettings.master} onChange={(v) => updateAudio('master', v)} />
                    <VolumeSlider label="MUSIC" value={audioSettings.music} onChange={(v) => updateAudio('music', v)} />
                    <VolumeSlider label="SFX" value={audioSettings.sfx} onChange={(v) => updateAudio('sfx', v)} />
                </div>
                
                <div className="mb-8">
                   <MenuButton variant="secondary" onClick={() => openControls(false)}>{t('CONTROLS')}</MenuButton>
                </div>

                <div className="space-y-4 flex flex-col">
                    <MenuButton variant="secondary" onClick={togglePause}>{t('RESUME')}</MenuButton>
                    <MenuButton variant="secondary" onClick={() => {setGameState(GameState.MENU); setIsPaused(false); audioManager.stopMusic();}}>{t('ABORT')}</MenuButton>
                </div>
            </div>
        </div>
      )}

      {/* Wave Cleared */}
      {gameState === GameState.WAVE_CLEARED && (
         <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/40 backdrop-blur-sm pointer-events-none">
            <div className="text-center pointer-events-auto animate-in fade-in zoom-in duration-300">
               <h2 className="text-6xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-green-300 to-green-600 mb-4 drop-shadow-lg" style={{WebkitTextStroke: '1px rgba(255,255,255,0.2)'}}>{t('CLEARED')}</h2>
               <button onClick={openShop} className="bg-green-600 hover:bg-green-500 text-black font-bold py-4 px-12 text-xl clip-path-polygon hover:scale-105 transition-transform" style={{clipPath: 'polygon(10% 0, 100% 0, 100% 70%, 90% 100%, 0 100%, 0 30%)'}}>
                 {t('NEXT')}
               </button>
            </div>
         </div>
      )}

      {/* Game Over */}
      {gameState === GameState.GAME_OVER && (
        <div className="absolute inset-0 bg-red-950/95 flex items-center justify-center z-50">
           <div className="text-center p-8 border-y-2 border-red-600 w-full bg-black/50 backdrop-blur-md max-w-lg">
             <h2 className="text-5xl md:text-7xl font-bold text-red-500 mb-2 tracking-widest red-glow">{t('GAME_OVER')}</h2>
             
             <div className="grid grid-cols-2 gap-8 mx-auto mb-10 text-left mt-8">
                 <div>
                     <div className="text-xs text-red-400/50">{t('SCORE')}</div>
                     <div className="text-3xl font-bold text-white">{uiData.score}</div>
                 </div>
                 <div>
                     <div className="text-xs text-red-400/50">{t('WAVE')}</div>
                     <div className="text-3xl font-bold text-white">{uiData.wave}</div>
                 </div>
             </div>
             
             {patient && (
                 <div className="mb-8 text-sm font-mono text-gray-400">
                     {t('STATUS_TERM')}
                 </div>
             )}

             <MenuButton onClick={handleStartGame}>{t('RETRY')}</MenuButton>
           </div>
        </div>
      )}

      {/* Joystick (Só aparece no mobile) */}
      {isMobile && !isPaused && gameState === GameState.PLAYING && <Joystick onMove={handleJoystickMove} />}
    </div>
  );
};
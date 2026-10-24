

import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, comboDamageMultiplier, COMBO_RAMP_KILLS } from '../services/gameEngine';
import { organAccent, organNameKey, organVeinStyle, type OrganId } from '../services/organDirector';
import { audioManager } from '../services/audioManager';
import { bossById } from '../services/bosses';
import { achievementManager } from '../services/achievementManager';
import { GameState, PlayerStats, Upgrade, Language, Difficulty, PatientProfile, ViralStrain, Achievement, ThemePalette, EntityType } from '../types';
import { INITIAL_STATS, UPGRADES, WAVES, TEXTS, PATIENT_NAMES, COLORS_DEFAULT, COLORS_PLATINUM, ACHIEVEMENTS_LIST, INITIAL_LIVES, ADRENALINE_MAX_DURATION } from '../constants';
import { CANON_ROUTE, randomRoute } from '../services/casebook';
import { postRun } from '../services/board';
import { Joystick } from './Joystick';
import { PauseMenu } from './PauseMenu';
import { SettingsMenu } from './SettingsMenu';
import { LoadoutMenu } from './LoadoutMenu'; 
import { MainMenu } from './MainMenu';
import { OutcomeChart, PatientChart } from './PatientChart';
import { motionClass, ScreenPresence } from './screenPresence';
import { BioLab, SerumOffer, mutationCardStyles, rollSerumOffers, serumWeight, serumWindowMs } from './MutationCards';
import { Dossier } from './Dossier';
import { FieldGuide } from './FieldGuide';
import { RankingBoard } from './RankingBoard';

const systemLanguage = (): Language => {
  const tags = typeof navigator === 'undefined'
    ? []
    : (navigator.languages?.length ? Array.from(navigator.languages) : [navigator.language]);
  for (const tag of tags) {
    const base = (tag || '').toLowerCase().split('-')[0];
    if (base === 'pt') return 'PT';
    if (base === 'es') return 'ES';
    if (base === 'en') return 'EN';
  }
  return 'EN';
};

// --- UI COMPONENTS (Versão Compacta - Agora Aumentada para Mobile) ---

const StatBar = ({ value, max, colorClass, label, animate = false }: any) => (
  <div className="flex flex-col w-full">
    <div className="flex justify-between items-end mb-0.5 px-0.5">
        <span className="text-[9px] lg:text-xs font-bold tracking-widest text-white/70">{label}</span>
        <span className="text-[9px] lg:text-xs font-mono text-white/70">{Math.round(value)}/{Math.round(max)}</span>
    </div>
    <div className="h-1.5 lg:h-3 w-full bg-black/50 border border-white/10 rounded-sm skew-x-[-10deg] overflow-hidden backdrop-blur-sm relative">
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
    className="p-1.5 lg:p-3 bg-black/40 border border-white/20 rounded hover:bg-white/10 active:scale-95 transition-all text-white/80"
  >
    {icon}
  </button>
);

const IconSpeaker = ({ muted }: { muted: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 lg:h-6 lg:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        {muted ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        )}
        {muted && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9l-4 4m0-4l4 4" />}
    </svg>
);

const IconDNA = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 lg:h-6 lg:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <rect x="5" y="3.5" width="14" height="17" rx="2" strokeWidth={2} />
        <path strokeLinecap="round" strokeWidth={2} d="M8 3.5h8v2.5H8zM8 11h8M8 15h5" />
    </svg>
);

const TUTORIAL_MS = 5400;

// Each control is readable in the middle, then slides into the slot it occupies.
const PadMark = ({ kind }: { kind: 'dash' | 'pulse' }) => (
    kind === 'dash' ? (
        <svg viewBox="0 0 64 64" className="pad-ico" aria-hidden>
            <g transform="rotate(-32 32 32)">
                <ellipse cx="12" cy="32" rx="7" ry="2.4" fill="#7ef3ff" opacity="0.28" />
                <ellipse cx="24" cy="32" rx="9" ry="3.1" fill="#9aefff" opacity="0.55" />
                <ellipse cx="42" cy="32" rx="13" ry="5" fill="#7ef3ff" />
                <ellipse cx="42" cy="32" rx="3.6" ry="1.7" fill="#fff" />
            </g>
        </svg>
    ) : (
        <svg viewBox="0 0 64 64" className="pad-ico" aria-hidden>
            <circle cx="32" cy="32" r="24" fill="none" stroke="#5eefff" strokeWidth="2" opacity="0.55" />
            <circle cx="32" cy="32" r="15.5" fill="none" stroke="#8ef6ff" strokeWidth="3.1" />
            <circle cx="32" cy="32" r="15.5" fill="none" stroke="#ffffff" strokeWidth="1" />
            <circle cx="32" cy="32" r="7.2" fill="none" stroke="#f7feff" strokeWidth="2.2" />
            <circle cx="32" cy="32" r="2.6" fill="#fff" />
        </svg>
    )
);

const TutorialOverlay = ({ isMobile, t }: { isMobile: boolean; t: (key: string) => string }) => {
    const place = isMobile ? 'teach-mobile' : 'teach-desk';
    return (
        <div className="absolute inset-0 z-40 pointer-events-none">
            <style>{`
                .teach {
                    position: absolute;
                    left: 0;
                    top: 0;
                    transform-origin: center center;
                    animation: teach-flight 5.2s cubic-bezier(0.16, 1, 0.3, 1) both;
                }
                .teach-token {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 999px;
                    font-weight: 800;
                }
                .teach-move .teach-token { width: 72px; height: 72px; }
                .teach-caption {
                    position: absolute;
                    left: 50%;
                    top: calc(100% + 8px);
                    transform: translateX(-50%);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 2px;
                    white-space: nowrap;
                    animation: teach-caption 5.2s linear forwards;
                }
                .teach-caption strong {
                    font-weight: 800;
                    letter-spacing: 0.22em;
                    font-size: 13px;
                }
                .teach-caption em {
                    font-style: normal;
                    font-size: 10px;
                    letter-spacing: 0.14em;
                    text-transform: uppercase;
                    color: #fde68a;
                    background: rgba(0, 0, 0, 0.55);
                    border-radius: 999px;
                    padding: 1px 6px;
                }
                .teach-luck {
                    position: absolute;
                    left: 50%;
                    bottom: 16%;
                    transform: translateX(-50%);
                    font-family: ui-monospace, monospace;
                    font-size: 12px;
                    letter-spacing: 0.22em;
                    color: rgba(255, 255, 255, 0.62);
                    animation: teach-luck 5.2s linear forwards;
                }
                .teach-move { --cx: calc(50vw - 128px); --cy: 44vh; animation-delay: 0s; }
                .teach-dash { --cx: 50vw; --cy: 40vh; animation-delay: 0.06s; }
                .teach-surge { --cx: calc(50vw + 128px); --cy: 44vh; animation-delay: 0.12s; }
                .teach-mobile.teach-move { --x: 78px; --y: calc(100vh - 78px); }
                .teach-mobile.teach-dash { --x: calc(100vw - 132px); --y: calc(100vh - 52px); }
                .teach-mobile.teach-surge { --x: calc(100vw - 56px); --y: calc(100vh - 56px); }
                .teach-desk.teach-move { --x: calc(50vw - 240px); --y: 62vh; }
                .teach-desk.teach-dash { --x: 50vw; --y: 66vh; }
                .teach-desk.teach-surge { --x: calc(50vw + 240px); --y: 62vh; }
                @media (min-width: 1024px) {
                    .teach-move .teach-token { width: 96px; height: 96px; }
                    .teach-caption strong { font-size: 18px; }
                    .teach-mobile.teach-dash { --x: calc(100vw - 168px); --y: calc(100vh - 56px); }
                    .teach-mobile.teach-surge { --x: calc(100vw - 72px); --y: calc(100vh - 72px); }
                    .teach-mobile.teach-move { --x: 96px; --y: calc(100vh - 96px); }
                }
                @keyframes teach-flight {
                    0% { opacity: 0; transform: translate(calc(var(--cx) - 50%), calc(var(--cy) - 50%)) scale(0.78); }
                    12% { opacity: 1; transform: translate(calc(var(--cx) - 50%), calc(var(--cy) - 50%)) scale(1.42); }
                    40% { opacity: 1; transform: translate(calc(var(--cx) - 50%), calc(var(--cy) - 50%)) scale(1.42); }
                    68% { opacity: 1; transform: translate(calc(var(--x) - 50%), calc(var(--y) - 50%)) scale(1); }
                    86% { opacity: 1; transform: translate(calc(var(--x) - 50%), calc(var(--y) - 50%)) scale(1); }
                    100% { opacity: 0; transform: translate(calc(var(--x) - 50%), calc(var(--y) - 50%)) scale(1); }
                }
                @keyframes teach-caption {
                    0%, 38% { opacity: 1; }
                    56%, 100% { opacity: 0; }
                }
                @keyframes teach-luck {
                    0%, 10% { opacity: 0; }
                    20%, 36% { opacity: 1; }
                    50%, 100% { opacity: 0; }
                }
            `}</style>

            <div className={`teach teach-move ${place}`}>
                <div className="teach-token border-2 border-cyan-400/80 bg-cyan-950/50 shadow-[0_0_24px_rgba(34,211,238,0.35)]">
                    {isMobile ? (
                        <span className="w-7 h-7 rounded-full bg-cyan-300/80 shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
                    ) : (
                        <span className="font-mono text-sm text-cyan-200">WASD</span>
                    )}
                </div>
                <div className="teach-caption text-cyan-200">
                    <strong>{t('TUTORIAL_MOVE')}</strong>
                </div>
            </div>

            <div className={`teach teach-dash ${place}`}>
                <div className="pad-slot">
                    <span className="pad-name">{isMobile ? t('DASH') : 'SHIFT'}</span>
                    <div className="pad pad-dash is-hot">
                        <PadMark kind="dash" />
                        <span className="pad-shade" style={{ ['--p' as string]: 1 }} />
                    </div>
                </div>
                <div className="teach-caption text-white">
                    <strong>{t('DASH')}</strong>
                    <em>{t('TUTORIAL_SAFE')}</em>
                </div>
            </div>

            <div className={`teach teach-surge ${place}`}>
                <div className="pad-slot">
                    <span className="pad-name">{isMobile ? t('SURGE_READY') : 'SPACE'}</span>
                    <div className="pad pad-pulse is-hot">
                        <PadMark kind="pulse" />
                        <span className="pad-shade" style={{ ['--p' as string]: 1 }} />
                    </div>
                </div>
                <div className="teach-caption text-cyan-100">
                    <strong>{t('SURGE_READY')}</strong>
                </div>
            </div>

            <div className="teach-luck">{t('TUTORIAL_LUCK')}</div>
        </div>
    );
};

// --- MAIN COMPONENT ---

const PREFS_KEY = 'vr-prefs';

function readPrefs(): { master?: number; music?: number; sfx?: number; mono?: boolean; lean?: boolean } {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

export const Game: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const uiUpdateAccumulatorRef = useRef<number>(0);
  const upgradesRef = useRef<Upgrade[]>(UPGRADES.map(u => ({...u})));
  const statsRef = useRef<PlayerStats>(INITIAL_STATS);
  const levelRef = useRef<Record<string, number>>({});
  const serumLockRef = useRef(false);
  const serumResolvedRef = useRef(false);
  const intermissionRef = useRef(false);
  const grantRef = useRef<(id: string, free: boolean) => boolean>(() => false); 
  
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [lastGameState, setLastGameState] = useState<GameState>(GameState.MENU);
  
  const [isPaused, setIsPaused] = useState(false);
  const [language, setLanguage] = useState<Language>(systemLanguage);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.NORMAL);
  
  const [stats, setStats] = useState<PlayerStats>(INITIAL_STATS);
  const [upgrades, setUpgrades] = useState<Upgrade[]>(UPGRADES.map(u => ({...u}))); 
  
  const shownBiomassRef = useRef(0);
  const [uiData, setUiData] = useState({ 
    health: 100, maxHealth: 100, score: 0, biomass: 0, 
    wave: 0, waveTime: 0, waveDuration: 1, energy: 0, maxEnergy: 100,
    combo: 0, dashReady: true, dashProgress: 1, adrenaline: false, adrenalineLeft: ADRENALINE_MAX_DURATION, lives: INITIAL_LIVES,
    organId: 'molar' as OrganId
  });
  
  const [isMobile, setIsMobile] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [isLowPerfMode, setIsLowPerfMode] = useState(false); 
  const [leanGraphics, setLeanGraphics] = useState(() => readPrefs().lean === true);

  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const postedRef = useRef(false);
  const runMetaRef = useRef({ difficulty: Difficulty.NORMAL, route: [...CANON_ROUTE] });
  runMetaRef.current = {
      difficulty,
      route: patient?.route?.length === 5 ? patient.route : [...CANON_ROUTE],
  };
  const [audioSettings, setAudioSettings] = useState(() => {
    const prefs = readPrefs();
    const next = {
      master: typeof prefs.master === 'number' ? prefs.master : audioManager.settings.master,
      music: typeof prefs.music === 'number' ? prefs.music : audioManager.settings.music,
      sfx: typeof prefs.sfx === 'number' ? prefs.sfx : audioManager.settings.sfx,
      mono: prefs.mono === true,
    };
    audioManager.settings = { ...audioManager.settings, ...next };
    return next;
  });
  const [isMuted, setIsMuted] = useState(false);
  const heardMasterRef = useRef(audioManager.settings.master);
  const [activeAchievement, setActiveAchievement] = useState<Achievement | null>(null);
  const [isPlatinum, setIsPlatinum] = useState(false);
  const [colors, setColors] = useState<ThemePalette>(COLORS_DEFAULT);
  const [cheatInput, setCheatInput] = useState("");
  const [waveDeck, setWaveDeck] = useState(false);
  const [heartbreak, setHeartbreak] = useState<{ index: number; dx: number; dy: number } | null>(null);
  const heartTimer = useRef<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const vignetteRef = useRef<HTMLDivElement>(null);
  const marginFrameRef = useRef<HTMLDivElement>(null);
  const heartRefs = useRef<Array<SVGSVGElement | null>>([]);
  const [outcomeBeat, setOutcomeBeat] = useState<null | 'win' | 'lose' | 'organ' | 'campaign'>(null);
  const [outcomeLeaving, setOutcomeLeaving] = useState(false);
  const [passage, setPassage] = useState(false);
  const passageRef = useRef(false);
  const outcomeTimer = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...audioSettings, lean: leanGraphics }));
  }, [audioSettings, leanGraphics]);

  const paintLook = (eng: GameEngine) => {
    eng.leanGraphics = leanGraphics;
    eng.forceHighQuality = !leanGraphics;
    eng.isLowQuality = leanGraphics;
  };
  const outcomeLeaveTimer = useRef<number | null>(null); 
  
  // State para controlar o tutorial e eventos de Boss
  const [showTutorial, setShowTutorial] = useState(false);
  const [showBossIntro, setShowBossIntro] = useState(false);
  const [bossCard, setBossCard] = useState<{ name: string; disease: string; line: string; color: string; shown: number } | null>(null);
  const bossHoldRef = useRef<number | null>(null);
  const [bossEntity, setBossEntity] = useState<{hp: number, max: number, name: string} | null>(null);
  const [labPulse, setLabPulse] = useState<{id: string, kind: 'ok' | 'no', token: number, cost: number} | null>(null);
  const [serum, setSerum] = useState<{ids: string[], endsAt: number} | null>(null);
  const [serumNow, setSerumNow] = useState(0);
  const [serumCollapse, setSerumCollapse] = useState<string | null>(null);

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
    window.addEventListener('orientationchange', checkLayout);
    return () => {
      window.removeEventListener('resize', checkLayout);
      window.removeEventListener('orientationchange', checkLayout);
    };
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
        combo: 0, dashReady: true, dashProgress: 1, adrenaline: false, adrenalineLeft: ADRENALINE_MAX_DURATION, lives: INITIAL_LIVES,
        organId: 'molar'
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
        if (engineRef.current?.bossCard) {
          if (e.code === 'Space' || e.code === 'Enter') {
            e.preventDefault();
            engineRef.current.advanceBossCard();
          }
          return;
        }
        if (engineRef.current?.organ.charting()) {
          if (e.code === 'Space' || e.code === 'Enter') engineRef.current.organ.advanceTransit();
          return;
        }
        if ((e.code === 'Space' || e.code === 'Enter') && engineRef.current?.organ.advanceTransit()) return;
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
    const advanceChart = (e: Event) => {
      if (isPaused) return;
      const node = e.target;
      if (node instanceof Element && node.closest('.lab-screen, .serum-screen, .lab-card')) return;
      const eng = engineRef.current;
      if (!eng) return;
      if (eng.advanceBossCard()) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (eng.organ.advanceTransit()) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('pointerdown', advanceChart, true);
    return () => {
       window.removeEventListener('keydown', (e) => handleKey(e, true));
       window.removeEventListener('keyup', (e) => handleKey(e, false));
       window.removeEventListener('pointerdown', advanceChart, true);
    };
  }, [gameState, triggerUltimate, triggerDash, isPaused]);

  const handleBossSpawn = useCallback(() => {}, []);

  const deployToWave = useCallback(() => {
      if (engineRef.current) {
          intermissionRef.current = false;
          lastTimeRef.current = performance.now();
          const nextWaveIdx = engineRef.current.currentWaveIndex === -1 ? 0 : engineRef.current.currentWaveIndex + 1;
          
          // Sincroniza o atraso do spawn dos monstros com a duração do tutorial
          const TUTORIAL_DURATION = TUTORIAL_MS;
          
          if (nextWaveIdx === 0) {
              // Passa o delay para a engine (em segundos)
              engineRef.current.startWave(nextWaveIdx, TUTORIAL_DURATION / 1000);
              setShowTutorial(true);
              setTimeout(() => setShowTutorial(false), TUTORIAL_DURATION);
          } else {
              engineRef.current.startWave(nextWaveIdx, 0);
          }
          
          setGameState(GameState.PLAYING);
          setOutcomeBeat(null);
          setOutcomeLeaving(false);
          if (outcomeTimer.current) window.clearTimeout(outcomeTimer.current);
          if (outcomeLeaveTimer.current) window.clearTimeout(outcomeLeaveTimer.current);
          audioManager.startGameMusic();
          setBossEntity(null);
          setPassage(engineRef.current.organ.charting());
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

  const generatePatient = (canon = false) => {
      const book = PATIENT_NAMES[language];
      const fName = book.first[Math.floor(Math.random() * book.first.length)];
      const lName = book.last[Math.floor(Math.random() * book.last.length)];
      const strains = Object.values(ViralStrain);
      const strain = strains[Math.floor(Math.random() * strains.length)];
      
      return {
          id: Math.floor(Math.random() * 99999).toString(),
          name: `${fName} ${lName}`,
          age: Math.floor(Math.random() * 40) + 20,
          symptoms: 'ROUTE',
          route: canon ? [...CANON_ROUTE] : randomRoute(),
          strain: strain,
          difficultyMultiplier: 1
      };
  }

  const launchGodRun = (waveNum: number) => {
      if (waveNum < 1 || waveNum > WAVES.length || !canvasRef.current) return;
      let godStats = { ...INITIAL_STATS };
      const maxedUpgrades = UPGRADES.map(u => {
          const def = UPGRADES.find(d => d.id === u.id);
          if (def) {
              for (let i = 0; i < u.maxLevel; i++) godStats = def.apply(godStats);
          }
          return { ...u, level: u.maxLevel };
      });
      godStats = {
          ...godStats,
          maxHealth: Math.round(godStats.maxHealth),
          maxEnergy: Math.round(godStats.maxEnergy),
          damage: Math.round(godStats.damage),
          speed: Math.round(godStats.speed),
          fireRate: Math.round(godStats.fireRate),
          bulletSpeed: Math.round(godStats.bulletSpeed),
          magnetRadius: Math.round(godStats.magnetRadius),
          thorns: Math.round(godStats.thorns),
      };

      audioManager.init();
      const newPatient = generatePatient(true);
      postedRef.current = false;
      setPatient(newPatient);
      const jump = waveNum - 1;
      intermissionRef.current = false;
      engineRef.current = new GameEngine(canvasRef.current, godStats, newPatient, difficulty, colors);
      engineRef.current.setLanguage(language);
      paintLook(engineRef.current);
      setStats(godStats);
      setUpgrades(maxedUpgrades);
      engineRef.current.startWave(jump);
      setUiData({
          health: godStats.maxHealth, maxHealth: godStats.maxHealth, score: 0, biomass: 0,
          wave: waveNum, waveTime: 0, waveDuration: WAVES[jump].duration, energy: godStats.maxEnergy, maxEnergy: godStats.maxEnergy,
          combo: 0, dashReady: true, dashProgress: 1, adrenaline: false, adrenalineLeft: ADRENALINE_MAX_DURATION, lives: INITIAL_LIVES,
          organId: engineRef.current.organ.id
      });
      setWaveDeck(false);
      setGameState(GameState.PLAYING);
      setIsPaused(false);
      audioManager.startGameMusic();
      audioManager.playPowerUp();
      setCheatInput("");
  };

  const handleCheatInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setCheatInput(val);
      if (val === 'j6t2hybt26fwxgy2hvxjttbdy') {
          achievementManager.unlockAll();
          audioManager.playExplosion();
          audioManager.playPowerUp();
          setCheatInput("");
          alert("SYSTEM OVERRIDE: APEX PRIVILEGES GRANTED");
          return;
      }
      const code = val.trim().toLowerCase().replace(/\s+/g, '');
      if (code === 'boraficarforte') {
          setCheatInput("");
          setWaveDeck(true);
          audioManager.playPowerUp();
      }
  }

  const rememberRun = useCallback(() => {
      if (postedRef.current) return;
      const score = Math.round(engineRef.current?.score ?? 0);
      if (score <= 0) return;
      postedRef.current = true;
      postRun({
          at: Date.now(),
          score,
          difficulty: runMetaRef.current.difficulty,
          route: runMetaRef.current.route,
      });
  }, []);

  const finishWave = useCallback(() => {
      if (intermissionRef.current) return;
      const live = engineRef.current;
      if (live && (live.lives <= 0 || !live.player.active)) return;
      intermissionRef.current = true;
      setGameState(GameState.WAVE_CLEARED);
      audioManager.stopMusic();
      const organHop = engineRef.current?.organ.willLeave(engineRef.current.currentWaveIndex) ?? false;
      const campaign = engineRef.current?.currentWaveIndex === 29;
      if (campaign) audioManager.playCampaign();
      else if (organHop) audioManager.playTrophy();
      else audioManager.playWaveClear();
      setOutcomeBeat(campaign ? 'campaign' : organHop ? 'organ' : 'win');
      setOutcomeLeaving(false);
      if (outcomeTimer.current) window.clearTimeout(outcomeTimer.current);
      if (outcomeLeaveTimer.current) window.clearTimeout(outcomeLeaveTimer.current);
      const hold = campaign ? 8600 : organHop ? 5200 : 2100;
      const leave = campaign ? 1400 : organHop ? 1100 : 700;
      outcomeLeaveTimer.current = window.setTimeout(() => setOutcomeLeaving(true), hold);
      outcomeTimer.current = window.setTimeout(() => {
          setOutcomeBeat(null);
          setOutcomeLeaving(false);
          const eng = engineRef.current;
          if (organHop && eng?.beginPassage()) {
              passageRef.current = true;
              setPassage(true);
              lastTimeRef.current = performance.now();
              setGameState(GameState.PLAYING);
          }
      }, hold + leave);
  }, []);

  const loop = useCallback((time: number) => {
    if (!engineRef.current) {
        animationFrameRef.current = requestAnimationFrame(loop);
        return;
    }

    if (gameState !== GameState.PLAYING || isPaused || serumLockRef.current) {
        const live = Math.round(engineRef.current.biomass);
        if (live !== shownBiomassRef.current) {
            shownBiomassRef.current = live;
            setUiData(prev => ({ ...prev, biomass: live }));
        }
        lastTimeRef.current = time;
        animationFrameRef.current = requestAnimationFrame(loop);
        return;
    }
    
    const dt = time - lastTimeRef.current;
    lastTimeRef.current = time;

    if (engineRef.current) {
          engineRef.current.allowSerum = upgradesRef.current.some(u => u.level < u.maxLevel);
          engineRef.current.update(
            dt, 
            stats, 
            () => finishWave(),
            () => {
                setGameState(GameState.GAME_OVER);
                rememberRun();
                audioManager.stopMusic();
                setOutcomeBeat('lose');
                setOutcomeLeaving(false);
                if (outcomeTimer.current) window.clearTimeout(outcomeTimer.current);
                if (outcomeLeaveTimer.current) window.clearTimeout(outcomeLeaveTimer.current);
                outcomeLeaveTimer.current = window.setTimeout(() => setOutcomeLeaving(true), 900);
                outcomeTimer.current = window.setTimeout(() => {
                    setOutcomeBeat(null);
                    setOutcomeLeaving(false);
                }, 1550);
            },
            () => {
                const eng = engineRef.current;
                const index = Math.max(0, Math.min(INITIAL_LIVES - 1, eng ? eng.lives : 0));
                const stage = stageRef.current?.getBoundingClientRect();
                const heart = heartRefs.current[index]?.getBoundingClientRect();
                let dx = -220;
                let dy = -180;
                if (stage && heart && heart.width > 0) {
                    let vx = (heart.left + heart.width / 2) - (stage.left + stage.width / 2);
                    let vy = (heart.top + heart.height / 2) - (stage.top + stage.height / 2);
                    if (isPortrait && isMobile) {
                        dx = vy;
                        dy = -vx;
                    } else {
                        dx = vx;
                        dy = vy;
                    }
                }
                setHeartbreak({ index, dx, dy });
                if (heartTimer.current) window.clearTimeout(heartTimer.current);
                heartTimer.current = window.setTimeout(() => setHeartbreak(null), 2800);
            },
            handleBossSpawn
          );
      const card = engineRef.current.bossCard;
      if (card) {
          const shown = Math.floor(card.shown);
          if (bossHoldRef.current !== shown) {
              bossHoldRef.current = shown;
              setShowBossIntro(true);
              setBossCard({
                  name: card.name,
                  disease: card.disease,
                  line: card.line,
                  color: card.color,
                  shown,
              });
          }
      } else if (bossHoldRef.current !== null) {
          bossHoldRef.current = null;
          setShowBossIntro(false);
      }
      if (passageRef.current && !engineRef.current.organ.charting()) {
          passageRef.current = false;
          setPassage(false);
          intermissionRef.current = true;
          setGameState(GameState.WAVE_CLEARED);
      }

      if (engineRef.current.currentWaveIndex >= 0 && !engineRef.current.waveActive) finishWave();

      if (engineRef.current.consumeSerum()) {
          const ids = rollSerumOffers(upgradesRef.current);
          if (ids.length > 0) {
              serumResolvedRef.current = false;
              serumLockRef.current = true;
              setSerumCollapse(null);
              setSerum({ ids, endsAt: performance.now() + serumWindowMs(difficulty) });
              setSerumNow(performance.now());
          }
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
          if (activeBoss && !eng.bossCard) {
              const spec = activeBoss.mutation?.id ? bossById(activeBoss.mutation.id) : null;
              setBossEntity({
                  hp: activeBoss.health,
                  max: activeBoss.maxHealth,
                  name: spec ? spec.short[language] : 'BOSS',
              });
          } else {
              setBossEntity(null);
          }
          
          setUiData({
            health: Math.round(eng.player.health),
            maxHealth: Math.round(eng.player.maxHealth),
            score: Math.round(eng.score),
            biomass: (shownBiomassRef.current = Math.round(eng.biomass)),
            wave: eng.currentWaveIndex + 1,
            waveTime: eng.waveTimer,
            waveDuration: currentWaveConfig.duration,
            energy: Math.round(eng.energy),
            maxEnergy: Math.round(stats.maxEnergy),
            combo: eng.comboCount,
            dashReady: eng.dashCooldownTimer <= 0,
            dashProgress: eng.getDashProgress(stats),
            adrenaline: eng.adrenalineActive,
            adrenalineLeft: Math.max(0, ADRENALINE_MAX_DURATION - eng.adrenalineTimer),
            lives: eng.lives,
            organId: eng.organ.id
          });
          setPassage(passageRef.current || eng.organ.charting());
      }
    }
    
    animationFrameRef.current = requestAnimationFrame(loop);
  }, [gameState, stats, isPaused, isLowPerfMode, handleBossSpawn, difficulty, rememberRun, finishWave, language]);

  useEffect(() => {
    lastTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(loop);
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); }
  }, [loop]);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const fit = () => {
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      if (w < 2 || h < 2) return;
      const target = 16 / 9;
      const wide = w / h > target;
      const cw = wide ? h * target : w;
      const ch = wide ? h : w / target;
      canvas.style.width = `${cw}px`;
      canvas.style.height = `${ch}px`;
      canvas.style.left = `${(w - cw) / 2}px`;
      canvas.style.top = `${(h - ch) / 2}px`;
      const veil = vignetteRef.current;
      if (veil) {
        veil.style.left = canvas.style.left;
        veil.style.top = canvas.style.top;
        veil.style.width = canvas.style.width;
        veil.style.height = canvas.style.height;
      }
      const lip = marginFrameRef.current;
      if (lip) {
        lip.style.left = canvas.style.left;
        lip.style.top = canvas.style.top;
        lip.style.width = canvas.style.width;
        lip.style.height = canvas.style.height;
      }
    };
    fit();
    const watch = new ResizeObserver(fit);
    watch.observe(stage);
    window.addEventListener('resize', fit);
    return () => {
      watch.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, [isPortrait, isMobile]);

  const handleStartGame = () => {
     try {
         const elem = document.documentElement;
         if (!document.fullscreenElement) {
             if (elem.requestFullscreen) {
                 elem.requestFullscreen().catch((err) => {
                    console.log("Fullscreen blocked:", err);
                 });
             } else if ((elem as any).webkitRequestFullscreen) {
                 (elem as any).webkitRequestFullscreen();
             }
         }
     } catch (e) {}

     audioManager.init(); 
     
     const newPatient = generatePatient();
     postedRef.current = false;
     setPatient(newPatient);

     if (canvasRef.current) {
         intermissionRef.current = false;
         engineRef.current = new GameEngine(canvasRef.current, INITIAL_STATS, newPatient, difficulty, colors);
         engineRef.current.setLanguage(language);
         paintLook(engineRef.current);
         
         setStats(INITIAL_STATS);
         setUpgrades(UPGRADES.map(u => ({...u}))); 
         setUiData({ 
           health: 100, maxHealth: 100, score: 0, biomass: 0, 
           wave: 1, waveTime: 0, waveDuration: 1, energy: 0, maxEnergy: 100, combo: 0, dashReady: true, dashProgress: 1, adrenaline: false, adrenalineLeft: ADRENALINE_MAX_DURATION, lives: INITIAL_LIVES,
           organId: 'molar'
         });
         
         setGameState(GameState.BRIEFING);
         setIsPaused(false);
         setIsLowPerfMode(false); 
     }
  };

  statsRef.current = stats;
  levelRef.current = Object.fromEntries(upgrades.map(u => [u.id, u.level]));
  upgradesRef.current = upgrades;

  const grantUpgrade = (upgradeId: string, free: boolean) => {
      if (!engineRef.current) return false;
      const upgState = UPGRADES.find(u => u.id === upgradeId);
      if (!upgState) return false;

      const level = levelRef.current[upgradeId] ?? 0;
      if (level >= upgState.maxLevel) return false;

      const cost = Math.floor(upgState.baseCost * Math.pow(upgState.costMultiplier, level));
      if (!free && engineRef.current.biomass < cost) return false;

      const prevStats = {...statsRef.current};
      const prevLevels = {...levelRef.current};
      const prevBiomass = engineRef.current.biomass;
      try {
          if (!free) engineRef.current.biomass -= cost;
          const newStats = upgState.apply(statsRef.current);
          statsRef.current = newStats;
          const nextLevel = level + 1;
          levelRef.current = { ...levelRef.current, [upgradeId]: nextLevel };

          const eng = engineRef.current;
          eng.player.maxHealth = newStats.maxHealth;
          eng.player.health = Math.min(eng.player.health, newStats.maxHealth);
          if (eng.energy > newStats.maxEnergy) eng.energy = newStats.maxEnergy;
          if (eng.player.maxHealth >= 200) achievementManager.track('max_hp_200', Math.floor(eng.player.maxHealth));
          setStats(newStats);
          if (free) audioManager.playPowerUp();
          else audioManager.playBuy();

          const nextUpgrades = upgradesRef.current.map(u => u.id === upgradeId ? { ...u, level: nextLevel } : u);
          upgradesRef.current = nextUpgrades;
          setUpgrades(nextUpgrades);
          setUiData(prev => ({
              ...prev,
              biomass: (shownBiomassRef.current = Math.round(eng.biomass)),
              health: Math.round(eng.player.health),
              maxHealth: Math.round(eng.player.maxHealth),
              maxEnergy: Math.round(newStats.maxEnergy),
          }));

          if (nextLevel >= upgState.maxLevel && upgradeId === 'mitosis') {
              achievementManager.track('fire_rate_max', 1);
          }
          achievementManager.set('unlock_all_upgrades', nextUpgrades.filter(u => u.level > 0).length);
          eng.sessionStats.upgradesBought++;
          return true;
      } catch (e) {
          engineRef.current.biomass = prevBiomass;
          statsRef.current = prevStats;
          levelRef.current = prevLevels;
          setStats(prevStats);
          return false;
      }
  };
  grantRef.current = grantUpgrade;

  const buyUpgrade = (upgradeId: string) => {
      const current = UPGRADES.find(u => u.id === upgradeId);
      const level = levelRef.current[upgradeId] ?? 0;
      const cost = current ? Math.floor(current.baseCost * Math.pow(current.costMultiplier, level)) : 0;
      const ok = grantUpgrade(upgradeId, false);
      setLabPulse({ id: upgradeId, kind: ok ? 'ok' : 'no', token: Date.now(), cost });
  };

  const closeSerum = (id: string) => {
      grantRef.current(id, true);
      serumLockRef.current = false;
      serumResolvedRef.current = true;
      setSerum(null);
      setSerumCollapse(null);
      lastTimeRef.current = performance.now();
  };

  useEffect(() => {
      upgradesRef.current = upgrades;
  }, [upgrades]);

  useEffect(() => {
      if (gameState !== GameState.PLAYING && serumLockRef.current) {
          serumLockRef.current = false;
          setSerum(null);
          setSerumCollapse(null);
      }
  }, [gameState]);

  useEffect(() => {
      if (!serum) return;
      const timer = window.setInterval(() => {
          const now = performance.now();
          setSerumNow(now);
          if (now < serum.endsAt || serumResolvedRef.current) return;
          serumResolvedRef.current = true;
          const pool = serum.ids
            .map(id => upgradesRef.current.find(u => u.id === id))
            .filter((u): u is Upgrade => !!u);
          const total = pool.reduce((sum, u) => sum + serumWeight(u), 0);
          let roll = Math.random() * (total || 1);
          let id = pool[0]?.id || serum.ids[0];
          for (const u of pool) {
            roll -= serumWeight(u);
            if (roll <= 0) { id = u.id; break; }
          }
          setSerumCollapse(id);
          window.setTimeout(() => closeSerum(id), 420);
      }, 80);
      return () => window.clearInterval(timer);
  }, [serum]);

  const pickSerum = (id: string) => {
      if (!serum || serumResolvedRef.current) return;
      serumResolvedRef.current = true;
      closeSerum(id);
  };

  const handleJoystickMove = (vec: {x: number, y: number}) => {
    if (engineRef.current) {
        // CORREÇÃO CRÍTICA PARA ROTAÇÃO CSS NO IPHONE
        // Se estivermos em modo retrato E mobile, o jogo está rotacionado 90 graus via CSS.
        // O vetor de entrada "Cima" (Y negativo) na tela corresponde ao lado "Esquerdo" (X negativo) no jogo rotacionado.
        // Matriz de rotação -90 graus: x' = y, y' = -x
        if (isPortrait && isMobile) {
            engineRef.current.inputVector = { x: vec.y, y: -vec.x };
        } else {
            engineRef.current.inputVector = vec;
        }
    }
  };

  const waveFinished = () => {
      const eng = engineRef.current;
      return !!eng && eng.currentWaveIndex >= 0 && !eng.waveActive;
  };

  const togglePause = () => {
      if (!isPaused) {
          setIsPaused(true);
          audioManager.stopMusic();
          return;
      }
      lastTimeRef.current = performance.now();
      setIsPaused(false);
      if (waveFinished() || gameState === GameState.WAVE_CLEARED) {
          if (waveFinished()) {
              intermissionRef.current = true;
              setGameState(GameState.WAVE_CLEARED);
          }
          return;
      }
      if (gameState === GameState.PLAYING) audioManager.startGameMusic();
  };

  const toggleMute = () => {
      const next = !isMuted;
      if (next) {
          const live = audioManager.settings.master;
          if (live > 0.001) heardMasterRef.current = live;
          audioManager.settings = { ...audioManager.settings, master: 0 };
      } else {
          const master = heardMasterRef.current > 0.001 ? heardMasterRef.current : 0.82;
          const restored = { ...audioSettings, master };
          audioManager.settings = restored;
          setAudioSettings(restored);
          audioManager.resume();
      }
      setIsMuted(next);
      audioManager.updateVolumes();
  };
  
  const updateAudio = (type: 'master' | 'music' | 'sfx', val: number) => {
      const nextSettings = { ...audioSettings, [type]: val };
      setAudioSettings(nextSettings);
      if (type === 'master' && val > 0.001) heardMasterRef.current = val;
      audioManager.settings = isMuted ? { ...nextSettings, master: 0 } : nextSettings;
      audioManager.updateVolumes();
  }
  
  const goBackFromControls = () => {
      if (lastGameState === GameState.MENU) {
          setGameState(GameState.MENU);
          return;
      }
      lastTimeRef.current = performance.now();
      if (lastGameState === GameState.WAVE_CLEARED || waveFinished()) {
          intermissionRef.current = true;
          setIsPaused(false);
          setGameState(GameState.WAVE_CLEARED);
          return;
      }
      setGameState(GameState.PLAYING);
      if (!isPaused) setIsPaused(true);
  }

  const openSettings = () => {
      if (gameState === GameState.MENU) {
          setLastGameState(GameState.MENU);
      } else if (gameState === GameState.WAVE_CLEARED || (isPaused && waveFinished())) {
          setLastGameState(GameState.WAVE_CLEARED);
      } else if (isPaused) {
          setLastGameState(GameState.PLAYING);
      } else {
          setLastGameState(gameState);
      }
      setGameState(GameState.SETTINGS);
  };

  const closeSettings = () => {
      setWaveDeck(false);
      if (lastGameState === GameState.MENU) {
          setGameState(GameState.MENU);
      } else if (lastGameState === GameState.WAVE_CLEARED || waveFinished()) {
          intermissionRef.current = true;
          setIsPaused(false);
          setGameState(GameState.WAVE_CLEARED);
      } else {
          setGameState(GameState.PLAYING);
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

  const fieldAsleep = gameState === GameState.MENU
      || gameState === GameState.MANUAL
      || gameState === GameState.ACHIEVEMENTS
      || gameState === GameState.RANKING
      || (gameState === GameState.SETTINGS && lastGameState === GameState.MENU);

  return (
    <div 
        ref={stageRef}
        className={`select-none ${isPlatinum ? 'bg-[#0a0a1a]' : 'bg-[#0f0505]'} ${isLowPerfMode ? 'perf-mode-low' : ''} ${fieldAsleep ? 'field-asleep' : 'field-live'}`} 
        style={{...containerStyle, fontFamily: 'var(--font-tech)'}}
    >
      <div key={uiData.organId} className={`organ-margin is-${uiData.organId}`} aria-hidden />
      <div ref={marginFrameRef} className={`organ-margin-frame is-${uiData.organId}`} aria-hidden />
      <canvas ref={canvasRef} className="playfield" />
      
      {/* CSS Injection for Dynamic Keyframes */}
      <style>{`
        @keyframes heart-shake {
            0%, 100% { transform: translate(0, 0) scale(1); }
            10%, 30%, 50%, 70%, 90% { transform: translate(-8px, -8px) rotate(-3deg) scale(1.1); }
            20%, 40%, 60%, 80% { transform: translate(8px, 8px) rotate(3deg) scale(1.1); }
        }
        @keyframes crack-left {
            0% { transform: translate(0, 0) rotate(0); opacity: 1; }
            100% { transform: translate(-120px, 80px) rotate(-36deg); opacity: 0; }
        }
        @keyframes crack-right {
            0% { transform: translate(0, 0) rotate(0); opacity: 1; }
            100% { transform: translate(120px, 80px) rotate(36deg); opacity: 0; }
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
        .anim-break-left { animation: crack-left 0.75s ease-in forwards; animation-delay: 1.9s; }
        .anim-break-right { animation: crack-right 0.75s ease-in forwards; animation-delay: 1.9s; }
        .anim-glitch { animation: glitch-text 0.5s steps(5) infinite; }
        .anim-pulse-red { animation: pulse-red 0.5s ease-in-out infinite; }
        @keyframes heart-pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.14); }
        }
        .heart-live {
            color: #ff2d2d;
            filter: drop-shadow(0 0 6px rgba(255, 40, 40, 0.9));
            animation: heart-pulse 1.25s ease-in-out infinite;
        }
        .heart-gone { color: #4a1518; }
        @keyframes life-flight {
            0% { transform: translate(var(--dx), var(--dy)) scale(0.05); animation-timing-function: cubic-bezier(.45, .05, .25, 1); }
            40% { transform: translate(0, 0) scale(0.07); animation-timing-function: cubic-bezier(.2, .85, .25, 1); }
            66% { transform: translate(0, 0) scale(1); }
            100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes life-label {
            0%, 58% { opacity: 0; transform: translateX(-50%) translateY(8px); }
            70% { opacity: 1; transform: translateX(-50%) translateY(0); }
            88% { opacity: 1; }
            100% { opacity: 0; }
        }
        .life-stage {
            position: absolute;
            left: 50%;
            top: 50%;
            width: min(420px, 62vw);
            aspect-ratio: 1;
            margin-left: calc(min(420px, 62vw) / -2);
            margin-top: calc(min(420px, 62vw) / -2);
        }
        .life-flight {
            position: absolute;
            inset: 0;
            animation: life-flight 2.7s linear forwards;
        }
        .life-lost-label {
            position: absolute;
            left: 50%;
            top: calc(50% + min(188px, 24vh));
            transform: translateX(-50%);
            white-space: nowrap;
            font-family: "Chakra Petch", sans-serif;
            font-weight: 800;
            letter-spacing: 0.16em;
            font-size: clamp(16px, 2.6vw, 34px);
            color: #fff4f4;
            text-shadow: 0 0 18px rgba(255, 40, 50, 0.95);
            animation: life-label 2.7s ease forwards;
        }
        @keyframes adrenaline-blink {
            0%, 100% { opacity: 1; }
            45% { opacity: 0.35; }
            55% { opacity: 1; }
        }
        @keyframes adrenaline-vignette {
            0%, 100% { opacity: 0.72; }
            50% { opacity: 1; }
        }
        .adrenaline-hp { animation: adrenaline-blink 0.85s ease-in-out infinite; }
        .adrenaline-vignette {
            position: absolute;
            inset: 0;
            z-index: 15;
            pointer-events: none;
            background: radial-gradient(circle, transparent 38%, rgba(255, 70, 40, 0.22) 72%, rgba(180, 20, 20, 0.62) 100%);
            animation: adrenaline-vignette 1.15s ease-in-out infinite;
        }
        .adrenaline-call {
            margin-top: 8px;
            width: min(18rem, 72vw);
            padding: 7px 9px 8px;
            border: 1px solid rgba(255, 214, 120, 0.75);
            background: rgba(28, 14, 6, 0.78);
            box-shadow: 0 0 16px rgba(255, 180, 60, 0.28);
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .adrenaline-copy { min-width: 0; }
        .adrenaline-clock {
            position: relative;
            flex: none;
            width: 28px;
            height: 28px;
            color: #ffe08a;
        }
        .adrenaline-clock svg { width: 28px; height: 28px; display: block; }
        .adrenaline-clock .track { fill: none; stroke: rgba(255, 224, 138, 0.28); stroke-width: 1.15; }
        .adrenaline-clock .remain {
            fill: none;
            stroke: #ffe08a;
            stroke-width: 1.15;
            stroke-linecap: round;
            transform: rotate(-90deg);
            transform-origin: 16px 16px;
        }
        .adrenaline-clock span {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: "Chakra Petch", sans-serif;
            font-size: 9px;
            font-weight: 700;
            letter-spacing: 0;
            font-variant-numeric: tabular-nums;
        }
        .adrenaline-title {
            font-family: "Chakra Petch", sans-serif;
            font-weight: 800;
            letter-spacing: 0.18em;
            color: #ffe08a;
            font-size: 11px;
        }
        .adrenaline-hint {
            margin-top: 3px;
            font-family: "Chakra Petch", sans-serif;
            font-weight: 600;
            letter-spacing: 0.02em;
            color: #fff6e4;
            font-size: 11px;
            line-height: 1.3;
        }
        @media (min-width: 1024px) {
            .adrenaline-call { max-width: 22rem; padding: 10px 12px; }
            .adrenaline-title { font-size: 14px; letter-spacing: 0.22em; }
            .adrenaline-hint { font-size: 13px; }
        }
        .outcome-beat {
            position: absolute;
            inset: 0;
            z-index: 90;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
            overflow: hidden;
        }
        .outcome-leave { animation: outcome-leave 0.7s ease forwards; }
        .outcome-leave-slow { animation: outcome-leave 1.1s ease forwards; }
        .outcome-win { background: radial-gradient(circle at center, rgba(255, 226, 150, 0.42), rgba(0, 0, 0, 0.18) 46%, rgba(0, 0, 0, 0.62)); }
        .outcome-lose { background: radial-gradient(circle at center, rgba(160, 0, 20, 0.28), rgba(0, 0, 0, 0.78)); }
        .outcome-flash { position: absolute; inset: 0; background: #fff; animation: outcome-flash 0.5s ease-out forwards; }
        .outcome-lose .outcome-flash { background: #ff2438; }
        .outcome-ring {
            position: absolute;
            width: 240px;
            height: 240px;
            border-radius: 999px;
            border: 3px solid rgba(255, 226, 150, 0.9);
            animation: outcome-ring 0.9s ease-out forwards;
        }
        .outcome-lose .outcome-ring { border-color: rgba(255, 90, 90, 0.9); }
        .outcome-copy { position: relative; text-align: center; }
        .outcome-kicker {
            font-family: "Chakra Petch", sans-serif;
            font-weight: 900;
            font-size: clamp(40px, 7vw, 104px);
            letter-spacing: 0.14em;
            color: #fffaf0;
            text-shadow: 0 0 28px rgba(255, 210, 120, 0.95);
            animation: outcome-pop 0.55s cubic-bezier(.2, 1.45, .35, 1) both;
        }
        .outcome-lose .outcome-kicker { color: #ffd0d0; text-shadow: 0 0 28px rgba(255, 40, 50, 0.85); }
        .outcome-wave {
            margin-top: 8px;
            font-family: "Chakra Petch", sans-serif;
            font-weight: 700;
            letter-spacing: 0.42em;
            font-size: clamp(16px, 2vw, 28px);
            color: #ffe7a8;
        }
        .outcome-sub {
            margin-top: 10px;
            font-family: "Chakra Petch", sans-serif;
            letter-spacing: 0.46em;
            font-size: clamp(12px, 1.4vw, 18px);
            color: rgba(255, 250, 240, 0.82);
        }
        .outcome-spark {
            position: absolute;
            top: 46%;
            width: 9px;
            height: 9px;
            border-radius: 999px;
            animation: outcome-spark 1.15s ease-out forwards;
        }
        @keyframes outcome-flash { 0% { opacity: 0.8; } 100% { opacity: 0; } }
        @keyframes outcome-leave { from { opacity: 1; } to { opacity: 0; } }
        @keyframes outcome-ring { 0% { transform: scale(0.15); opacity: 1; } 100% { transform: scale(2.8); opacity: 0; } }
        @keyframes outcome-pop { 0% { transform: scale(0.35); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes outcome-spark { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-220px) scale(0.3); opacity: 0; } }
        .organ-margin { position: absolute; inset: 0; z-index: 0; background: #070605; overflow: hidden; pointer-events: none; }
        .organ-margin::before {
            content: "";
            position: absolute;
            inset: 0;
        }
        .organ-margin.is-molar::before {
            background:
                radial-gradient(ellipse 34% 78% at 6% 50%, rgba(236, 224, 198, 0.2), transparent 72%),
                radial-gradient(ellipse 34% 78% at 94% 50%, rgba(236, 224, 198, 0.2), transparent 72%);
        }
        .organ-margin.is-liver::before {
            background:
                radial-gradient(ellipse 30% 70% at 4% 42%, rgba(92, 24, 18, 0.55), transparent 70%),
                radial-gradient(ellipse 26% 60% at 96% 58%, rgba(168, 176, 64, 0.16), transparent 72%);
        }
        .organ-margin.is-heart::before {
            background:
                radial-gradient(ellipse 32% 80% at 5% 50%, rgba(120, 16, 28, 0.55), transparent 70%),
                radial-gradient(ellipse 32% 80% at 95% 50%, rgba(120, 16, 28, 0.55), transparent 70%);
        }
        .organ-margin.is-lung::before {
            background:
                radial-gradient(ellipse 36% 84% at 7% 50%, rgba(232, 186, 196, 0.16), transparent 74%),
                radial-gradient(ellipse 36% 84% at 93% 50%, rgba(232, 186, 196, 0.16), transparent 74%);
        }
        .organ-margin.is-brain::before {
            background:
                radial-gradient(ellipse 28% 64% at 8% 30%, rgba(168, 130, 230, 0.2), transparent 70%),
                radial-gradient(ellipse 24% 50% at 92% 70%, rgba(120, 210, 230, 0.12), transparent 72%);
        }
        .organ-margin-frame { position: absolute; z-index: 0; pointer-events: none; box-shadow: inset 0 0 0 10px rgba(0, 0, 0, 0.28); }
        .organ-margin-frame.is-molar { box-shadow: inset 0 0 0 10px rgba(232, 214, 186, 0.05); }
        .organ-margin-frame.is-liver { box-shadow: inset 0 0 0 10px rgba(92, 28, 18, 0.28); }
        .organ-margin-frame.is-heart { box-shadow: inset 0 0 0 10px rgba(140, 20, 32, 0.28); }
        .organ-margin-frame.is-lung { box-shadow: inset 0 0 0 10px rgba(232, 186, 196, 0.06); }
        .organ-margin-frame.is-brain { box-shadow: inset 0 0 0 10px rgba(150, 120, 210, 0.12); }
        .playfield { position: absolute; z-index: 1; display: block; }
        .playfield-vignette { right: auto; bottom: auto; z-index: 2; }
        .field-asleep .organ-margin,
        .field-asleep .organ-margin-frame,
        .field-asleep .playfield,
        .field-asleep .playfield-vignette { opacity: 0; }
        .field-live .organ-margin,
        .field-live .organ-margin-frame,
        .field-live .playfield,
        .field-live .playfield-vignette { animation: field-in 0.55s ease both; }
        @keyframes field-in { from { opacity: 0; } to { opacity: 1; } }
        .perf-mode-low .organ-margin-frame { box-shadow: none; }
        .outcome-stack { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .trophy-rays {
            position: absolute;
            width: min(72vh, 620px);
            height: min(72vh, 620px);
            border-radius: 50%;
            background: radial-gradient(circle, rgba(255, 214, 120, 0.28) 0%, rgba(255, 214, 120, 0.08) 42%, transparent 68%);
        }
        .trophy-mark {
            width: min(26vh, 168px);
            height: min(26vh, 168px);
            filter: drop-shadow(0 0 18px rgba(255, 210, 120, 0.9));
            animation: outcome-pop 0.7s cubic-bezier(.2, 1.45, .35, 1) both;
        }
        .outcome-campaign { background: radial-gradient(circle at 50% 42%, rgba(255, 214, 120, 0.38), rgba(40, 8, 4, 0.2) 36%, rgba(0, 0, 0, 0.78) 72%); }
        .outcome-leave-finale { animation: outcome-leave 1.4s ease forwards; }
        .finale-rig { width: min(34vh, 240px); height: min(34vh, 240px); perspective: 900px; }
        .finale-coin {
            width: 100%;
            height: 100%;
            position: relative;
            transform-style: preserve-3d;
            animation: cup-spin 3.8s linear infinite;
        }
        .finale-face {
            position: absolute;
            inset: 0;
            backface-visibility: hidden;
            filter: drop-shadow(0 18px 0 rgba(90, 40, 0, 0.45)) drop-shadow(0 0 22px rgba(255, 210, 110, 0.85));
        }
        .finale-face.back { transform: rotateY(180deg); }
        .finale-rays {
            position: absolute;
            width: min(92vh, 860px);
            height: min(92vh, 860px);
            border-radius: 50%;
            background: repeating-conic-gradient(from 0deg, rgba(255, 220, 140, 0.16) 0 8deg, transparent 8deg 18deg);
            animation: cup-spin 14s linear infinite;
            mask-image: radial-gradient(circle, #000 0 42%, transparent 70%);
        }
        @keyframes cup-spin { to { transform: rotateY(360deg); } }
        .finale-rays { animation-name: finale-spin; }
        @keyframes finale-spin { to { transform: rotate(360deg); } }
        ${mutationCardStyles}
      `}</style>

      <div ref={vignetteRef} className="vignette playfield-vignette"></div>
      {(gameState === GameState.PLAYING || gameState === GameState.WAVE_CLEARED) && uiData.adrenaline && (
          <div className="adrenaline-vignette" />
      )}
      <div className="scanlines"></div>
      {gameState !== GameState.MENU && (
      <div className="vein-overlay" style={organVeinStyle(uiData.organId, isPlatinum)}>
          <div className="vein-drift"></div>
          <div className="vein-drift-b"></div>
      </div>
      )}

      {heartbreak && (
          <div className="absolute inset-0 z-[150] pointer-events-none overflow-hidden">
              <div className="life-stage">
                  <div
                      className="life-flight"
                      style={{ ['--dx' as string]: `${heartbreak.dx}px`, ['--dy' as string]: `${heartbreak.dy}px` }}
                  >
                      <div className="absolute inset-0 anim-break-left text-red-600">
                          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_40px_rgba(255,40,50,0.85)]" style={{clipPath: 'polygon(0 0, 50% 0, 55% 25%, 45% 45%, 55% 65%, 45% 85%, 50% 100%, 0 100%)'}}>
                              <path fill="currentColor" d="M50 88.9L48.2 87.2C20.4 62 2 45.5 2 25.3 2 11.5 12.8 2 26.5 2c7.7 0 15.1 3.5 20 9.1C51.4 5.5 58.8 2 66.5 2 80.2 2 91 11.5 91 25.3c0 20.2-18.4 36.7-46.2 61.9L50 88.9z" />
                          </svg>
                      </div>
                      <div className="absolute inset-0 anim-break-right text-red-600">
                          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_40px_rgba(255,40,50,0.85)]" style={{clipPath: 'polygon(100% 0, 50% 0, 55% 25%, 45% 45%, 55% 65%, 45% 85%, 50% 100%, 100% 100%)'}}>
                              <path fill="currentColor" d="M50 88.9L48.2 87.2C20.4 62 2 45.5 2 25.3 2 11.5 12.8 2 26.5 2c7.7 0 15.1 3.5 20 9.1C51.4 5.5 58.8 2 66.5 2 80.2 2 91 11.5 91 25.3c0 20.2-18.4 36.7-46.2 61.9L50 88.9z" />
                          </svg>
                      </div>
                  </div>
              </div>
              <div className="life-lost-label">{t('MSG_CRITICAL')}</div>
          </div>
      )}

      {/* TUTORIAL OVERLAY (FANTASMA) */}
      {showTutorial && gameState === GameState.PLAYING && (
          <TutorialOverlay isMobile={isMobile} t={t} />
      )}

      {/* BOSS WARNING OVERLAY */}
      {showBossIntro && bossCard && !isPaused && (
          <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center">
              <div
                  className="w-full py-6 md:py-16 flex flex-col items-center justify-center relative overflow-hidden border-y-4"
                  style={{
                      background: 'rgba(8, 4, 6, 0.88)',
                      borderColor: bossCard.color || '#ff3355',
                      boxShadow: `inset 0 0 80px ${bossCard.color || '#ff3355'}33`,
                  }}
              >
                  <div className="text-[10px] lg:text-sm tracking-[0.55em] text-white/70 font-bold">{bossCard.disease || t('BOSS_BANNER')}</div>
                  <h1 className="text-3xl lg:text-8xl font-black tracking-[0.12em] text-center mt-2" style={{ color: bossCard.color || '#ff3355', textShadow: `0 0 24px ${bossCard.color || '#ff3355'}` }}>
                      {bossCard.name || t('BOSS_BANNER')}
                  </h1>
                  <h2 className="text-xs lg:text-2xl text-white/90 font-mono tracking-wide mt-3 lg:mt-5 text-center max-w-[80%] leading-snug">
                      {bossCard.line.slice(0, bossCard.shown)}
                      {bossCard.shown < bossCard.line.length ? '▌' : ''}
                  </h2>
                  {bossCard.shown >= bossCard.line.length && (
                      <div className="mt-4 text-[10px] lg:text-sm tracking-[0.45em] text-[#ffe7a8] font-bold animate-pulse">
                          {language === 'PT' ? 'CLIQUE' : language === 'ES' ? 'PULSA' : 'CLICK'} ▼
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* BOSS HEALTH BAR */}
      {bossEntity && !showBossIntro && (
          <div className="absolute top-14 lg:top-36 left-1/2 -translate-x-1/2 z-30 w-[60%] lg:w-[50%] flex flex-col items-center pointer-events-none anim-tutorial-fade" style={{animationDuration: '0.5s'}}>
              <div className="flex justify-between w-full text-red-500 font-bold font-mono text-[8px] lg:text-xs mb-1 tracking-[0.3em]">
                  <span className="anim-glitch">{bossEntity.name}</span>
                  <span>{Math.round(bossEntity.hp)}/{Math.round(bossEntity.max)}</span>
              </div>
              <div className="w-full h-2 lg:h-6 bg-black/80 border-2 border-red-900 relative skew-x-[-20deg] overflow-hidden">
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

      <div className="absolute left-1/2 z-[100] -translate-x-1/2 transition-all duration-500 ease-out" style={{ top: 'calc(12px + env(safe-area-inset-top, 0px))', transform: activeAchievement ? 'translate(-50%, 0)' : 'translate(-50%, -140%)' }}>
          {activeAchievement && (
              <div className={`flex items-center gap-2 lg:gap-4 p-2 lg:p-4 rounded border-2 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-md min-w-[220px] lg:min-w-[300px]
                  ${isPlatinum 
                      ? 'bg-purple-900/80 border-amber-400 shadow-[0_0_20px_rgba(255,215,0,0.3)]' 
                      : 'bg-black/90 border-cyan-500 shadow-[0_0_20px_rgba(0,255,255,0.3)]'}`}>
                  <div className="text-2xl lg:text-4xl animate-bounce">{activeAchievement.icon}</div>
                  <div>
                      <div className={`text-[10px] lg:text-xs font-bold tracking-widest mb-1 ${isPlatinum ? 'text-amber-400' : 'text-cyan-400'}`}>{t('UNLOCKED')}</div>
                      <div className="text-sm lg:text-lg font-bold text-white">{t(activeAchievement.titleKey)}</div>
                      <div className="text-[10px] lg:text-xs text-gray-400">{t(activeAchievement.descKey)}</div>
                  </div>
              </div>
          )}
      </div>

      {(gameState === GameState.PLAYING || gameState === GameState.WAVE_CLEARED || gameState === GameState.LOADOUT) && !passage && !showBossIntro && (
        <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between hud-safe" style={{ fontFamily: '"Chakra Petch", sans-serif' }}>
           <div className="flex justify-between items-start">
             <div className="flex flex-col gap-1 lg:gap-3 w-28 lg:w-64">
                <div className={uiData.adrenaline ? 'adrenaline-hp' : undefined}>
                <StatBar label={t('INTEGRITY')} value={uiData.health} max={uiData.maxHealth} colorClass={uiData.adrenaline ? "bg-red-500 shadow-[0_0_12px_rgba(255,40,40,0.85)]" : (isPlatinum ? "bg-gradient-to-r from-purple-500 to-amber-400" : "bg-gradient-to-r from-red-600 to-red-400")} />
                </div>
                <StatBar label={t('SURGE_READY')} value={uiData.energy} max={uiData.maxEnergy} colorClass={isPlatinum ? "bg-gradient-to-r from-amber-400 to-white" : "bg-gradient-to-r from-cyan-600 to-cyan-400"} animate={true}/>
                {/* GLOBAL DASH INDICATOR (NEW) */}
                <StatBar label={t('DASH')} value={uiData.dashProgress * 100} max={100} colorClass="bg-gradient-to-r from-cyan-300 to-white shadow-[0_0_12px_rgba(170,245,255,0.95)]" animate={uiData.dashReady} />

                <div className="flex gap-1.5 lg:gap-2 mt-1 lg:mt-2">
                    {Array.from({length: INITIAL_LIVES}).map((_, i) => {
                        const alive = i < uiData.lives && heartbreak?.index !== i;
                        return (
                            <svg
                                key={i}
                                ref={(node) => { heartRefs.current[i] = node; }}
                                viewBox="0 0 24 22"
                                aria-hidden
                                className={`w-4 h-4 lg:w-7 lg:h-7 ${alive ? 'heart-live' : 'heart-gone'}`}
                                style={alive ? { animationDelay: `${i * 0.18}s` } : undefined}
                            >
                                <path fill="currentColor" d="M12 20.5l-1.45-1.32C5.4 14.36 2 11.28 2 7.5 2 4.42 4.42 2 7.5 2c1.74 0 3.41.81 4.5 2.09C13.09 2.81 14.76 2 16.5 2 19.58 2 22 4.42 22 7.5c0 3.78-3.4 6.86-8.55 11.68L12 20.5z" />
                            </svg>
                        );
                    })}
                </div>

                {uiData.adrenaline && (
                    <div className="adrenaline-call">
                        <div className="adrenaline-copy">
                            <div className="adrenaline-title">{t('ADRENALINE')}</div>
                            <div className="adrenaline-hint">{t('ADRENALINE_HINT')}</div>
                        </div>
                        <div className="adrenaline-clock" aria-hidden>
                            <svg viewBox="0 0 32 32">
                                <circle className="track" cx="16" cy="16" r="11" />
                                <circle
                                    className="remain"
                                    cx="16"
                                    cy="16"
                                    r="11"
                                    strokeDasharray={69.1}
                                    strokeDashoffset={69.1 * (1 - Math.max(0, Math.min(1, uiData.adrenalineLeft / ADRENALINE_MAX_DURATION)))}
                                />
                            </svg>
                            <span>{Math.max(0, Math.ceil(uiData.adrenalineLeft))}</span>
                        </div>
                    </div>
                )}
             </div>

             <div className="flex flex-col items-center">
                 <div className="bg-black/50 border border-white/10 px-3 py-1 lg:px-3 lg:py-1 rounded-full backdrop-blur-md mb-1">
                     <span className={`font-bold tracking-widest text-sm lg:text-2xl text-glow ${isPlatinum ? 'text-amber-400' : 'text-red-400'}`}>{t('WAVE')} {uiData.wave}</span>
                 </div>
                 <div className="text-[10px] lg:text-sm font-bold tracking-[0.28em]" style={{ color: organAccent(uiData.organId) }}>{t(organNameKey(uiData.organId))}</div>
                 <div className="text-[11px] lg:text-xs text-white/50 tracking-widest">{Math.max(0, uiData.waveDuration - uiData.waveTime).toFixed(0)}s</div>
                 
                 <div className={`mt-2 lg:mt-4 text-center transition-all duration-200 ${uiData.combo > 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                     <div className="text-3xl lg:text-4xl font-bold not-italic leading-none text-yellow-400" style={{ fontFamily: 'Teko, sans-serif', textShadow: '0 0 16px rgba(255, 186, 64, 0.85)' }}>
                         {uiData.combo}x
                     </div>
                     <div className="text-[9px] lg:text-xs font-bold text-yellow-200/90 tracking-[0.18em]">{t('COMBO')}</div>
                     {uiData.combo > 1 && (
                         <div className={`mt-0.5 text-center text-[9px] lg:text-[11px] font-bold tracking-[0.16em] ${uiData.combo > COMBO_RAMP_KILLS ? 'text-rose-300' : 'text-amber-200/90'}`}>
                             {uiData.combo > COMBO_RAMP_KILLS ? t('COMBO_ADAPTED') : t('COMBO_POWER')} {comboDamageMultiplier(uiData.combo).toFixed(1)}x
                         </div>
                     )}
                 </div>
             </div>

             <div className="flex flex-col items-end gap-1 lg:gap-2">
                 <div className="pointer-events-auto flex gap-1.5 lg:gap-2">
                     <IconButton onClick={openLoadout} icon={<IconDNA />} />
                     <IconButton onClick={toggleMute} icon={<IconSpeaker muted={isMuted} />} />
                     <IconButton onClick={togglePause} icon={<span className="font-bold text-base lg:text-xl">||</span>} />
                 </div>
                 <div className="text-right">
                    <div className="text-[9px] lg:text-xs text-white/50 tracking-widest">{t('SCORE')}</div>
                    <div className="text-base lg:text-3xl font-bold text-white tracking-tighter cyan-glow" style={{ fontVariantNumeric: 'tabular-nums' }}>{uiData.score.toString().padStart(6, '0')}</div>
                    <div className="text-[9px] lg:text-xs text-yellow-500 tracking-widest mt-0.5 lg:mt-1">{t('BIOMASS_AVAIL')}</div>
                    <div className="text-base lg:text-xl font-bold text-yellow-400 tracking-tighter" style={{ fontVariantNumeric: 'tabular-nums' }}>{Math.round(uiData.biomass)}</div>
                 </div>
             </div>
           </div>

           {isMobile && !isPaused && (
             <div className="absolute inset-0 z-10 pointer-events-none">
                 <div
                    className="absolute flex gap-4 items-end"
                    style={{
                        opacity: showTutorial ? 0 : 1,
                        pointerEvents: showTutorial ? 'none' : 'auto',
                        transition: 'opacity 280ms ease',
                        right: 'calc(16px + env(safe-area-inset-right, 0px))',
                        bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
                    }}
                 >
                     <div className="pad-slot">
                         <span className="pad-name">{t('DASH')}</span>
                         <button
                            aria-label={t('DASH')}
                            onTouchStart={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                triggerDash();
                            }}
                            onClick={!isMobile ? triggerDash : undefined}
                            disabled={!uiData.dashReady}
                            className={`pad pad-dash ${uiData.dashReady ? 'is-hot' : ''}`}
                         >
                             <PadMark kind="dash" />
                             <span className="pad-shade" style={{ ['--p' as string]: uiData.dashProgress }} />
                         </button>
                     </div>

                     <div className="pad-slot">
                         <span className="pad-name">{t('SURGE_READY')}</span>
                         <button
                            aria-label={t('SURGE_READY')}
                            onTouchStart={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                triggerUltimate();
                            }}
                            onClick={!isMobile ? triggerUltimate : undefined}
                            disabled={uiData.energy < uiData.maxEnergy}
                            className={`pad pad-pulse ${uiData.energy >= uiData.maxEnergy ? 'is-hot' : ''} ${isPlatinum ? 'is-gold' : ''}`}
                         >
                             <PadMark kind="pulse" />
                             <span className="pad-shade" style={{ ['--p' as string]: uiData.energy / Math.max(1, uiData.maxEnergy) }} />
                         </button>
                     </div>
                 </div>
             </div>
           )}
        </div>
      )}
      
      {outcomeBeat && (
        <div className={`outcome-beat ${outcomeBeat === 'lose' ? 'outcome-lose' : outcomeBeat === 'campaign' ? 'outcome-campaign' : 'outcome-win'}${outcomeLeaving ? (outcomeBeat === 'campaign' ? ' outcome-leave-finale' : outcomeBeat === 'organ' ? ' outcome-leave-slow' : ' outcome-leave') : ''}`}>
          <div className="outcome-flash" />
          <div className="outcome-ring" />
          {outcomeBeat === 'campaign' && <div className="finale-rays" />}
          {outcomeBeat === 'organ' && <div className="trophy-rays" />}
          {outcomeBeat !== 'lose' && Array.from({ length: outcomeBeat === 'campaign' ? 42 : outcomeBeat === 'organ' ? 28 : 18 }).map((_, i) => (
            <span
              key={i}
              className="outcome-spark"
              style={{
                left: `${6 + ((i * 53) % 88)}%`,
                animationDelay: `${(i % 6) * 0.05}s`,
                background: i % 2 === 0 ? organAccent(uiData.organId) : '#ffe7a8',
              }}
            />
          ))}
          <div className="outcome-stack">
            {(outcomeBeat === 'organ' || outcomeBeat === 'campaign') && (
              outcomeBeat === 'campaign' ? (
                <div className="finale-rig">
                  <div className="finale-coin">
                    {['front', 'back'].map(face => (
                      <svg key={face} className={`finale-face ${face}`} viewBox="0 0 120 120" aria-hidden>
                        <circle cx="60" cy="60" r="54" fill="#3a2208" stroke="#ffe7a8" strokeWidth="4" />
                        <path d="M36 34h48v22c0 18-10 28-24 28S36 74 36 56V34z" fill="#ffe7a8" />
                        <path d="M36 40H22c0 16 8 22 16 22M84 40h14c0 16-8 22-16 22" fill="none" stroke="#ffe7a8" strokeWidth="6" strokeLinejoin="round" />
                        <path d="M50 84h20v8H50zM40 96h40v8H40z" fill="#ffe7a8" />
                        <circle cx="60" cy="48" r="8" fill="#fff8e4" />
                      </svg>
                    ))}
                  </div>
                </div>
              ) : (
              <svg className="trophy-mark" viewBox="0 0 120 120" aria-hidden>
                <circle cx="60" cy="60" r="50" fill="none" stroke="#ffe7a8" strokeWidth="3" />
                <circle cx="60" cy="60" r="40" fill="none" stroke="#fff4cc" strokeWidth="1" opacity="0.7" />
                <path d="M38 36h44v20c0 16-9 26-22 26s-22-10-22-26V36z" fill="#ffe7a8" />
                <path d="M38 42H26c0 14 7 20 14 20M82 42h12c0 14-7 20-14 20" fill="none" stroke="#ffe7a8" strokeWidth="5" strokeLinejoin="round" />
                <path d="M52 82h16v8H52zM42 94h36v7H42z" fill="#ffe7a8" />
                <circle cx="60" cy="48" r="7" fill="#fff8e4" />
              </svg>
              )
            )}
            <div className="outcome-copy">
              <div className="outcome-kicker">{outcomeBeat === 'lose' ? t('GAME_OVER') : outcomeBeat === 'campaign' ? t('CAMPAIGN_WIN') : outcomeBeat === 'organ' ? t('MSG_BOSS_DOWN') : t('WAVE_WIN')}</div>
              <div className="outcome-wave">{outcomeBeat === 'organ' ? t(organNameKey(uiData.organId)) : outcomeBeat === 'campaign' ? `${t('WAVE')} 30` : `${t('WAVE')} ${uiData.wave}`}</div>
              {outcomeBeat === 'win' && <div className="outcome-sub">{t('WAVE_WIN_SUB')}</div>}
              {outcomeBeat === 'campaign' && <div className="outcome-sub">{t('CAMPAIGN_WIN_SUB')}</div>}
              {outcomeBeat === 'organ' && <div className="outcome-sub">{t('ORGAN_CLEAR')}</div>}
              {outcomeBeat === 'organ' && <div className="outcome-sub">{t('ORGAN_CLEAR_SUB')}</div>}
            </div>
          </div>
        </div>
      )}

      <ScreenPresence show={gameState === GameState.WAVE_CLEARED && !outcomeBeat}>
        {(phase) => (
        <OutcomeChart
            variant="cleared"
            patient={patient}
            language={language}
            isPlatinum={isPlatinum}
            wave={uiData.wave}
            biomass={uiData.biomass}
            score={uiData.score}
            onPrimary={deployToWave}
            onSecondary={openShop}
            onAbandon={() => {
                if (outcomeTimer.current) window.clearTimeout(outcomeTimer.current);
                if (outcomeLeaveTimer.current) window.clearTimeout(outcomeLeaveTimer.current);
                setOutcomeBeat(null);
                setOutcomeLeaving(false);
                intermissionRef.current = false;
                setIsPaused(false);
                rememberRun();
                setGameState(GameState.MENU);
                audioManager.stopMusic();
                audioManager.startMenuMusic();
            }}
            motion={phase}
        />
        )}
      </ScreenPresence>

      {/* COMPONENTE MAIN MENU - SUBSTITUIU O BLOCO ANTERIOR */}
      <MainMenu 
          isVisible={gameState === GameState.MENU}
          language={language}
          difficulty={difficulty}
          isPlatinum={isPlatinum}
          onStart={() => { handleStartGame(); audioManager.startMenuMusic(); }}
          onManual={() => setGameState(GameState.MANUAL)}
          onSettings={openSettings}
          onAchievements={openAchievements}
          onRanking={() => setGameState(GameState.RANKING)}
          onLanguageChange={setLanguage}
          onDifficultyChange={setDifficulty}
      />

      {/* REPLACED: New Settings Menu Component Rendering */}
      <SettingsMenu 
          isVisible={gameState === GameState.SETTINGS}
          language={language}
          audioSettings={audioSettings}
          leanGraphics={leanGraphics}
          onUpdateAudio={updateAudio}
          onLanguageChange={setLanguage}
          onSystemPurge={handleSystemPurge}
          cheatInput={cheatInput}
          onCheatInput={handleCheatInput}
          waveDeck={waveDeck}
          onPickWave={launchGodRun}
          onCancelDeck={() => setWaveDeck(false)}
          onToggleLean={() => {
              const next = !leanGraphics;
              setLeanGraphics(next);
              if (engineRef.current) {
                  engineRef.current.leanGraphics = next;
                  engineRef.current.forceHighQuality = !next;
                  engineRef.current.isLowQuality = next;
              }
              if (next) audioManager.playHit(); else audioManager.playPowerUp();
          }}
          onToggleMono={() => {
              const next = { ...audioSettings, mono: !audioSettings.mono };
              setAudioSettings(next);
              audioManager.settings = isMuted ? { ...next, master: 0 } : next;
              if (!isMuted) audioManager.playFieldDemo();
          }}
          onClose={closeSettings}
      />

      {/* New LoadoutMenu Component Rendering */}
      <LoadoutMenu
          isVisible={gameState === GameState.LOADOUT}
          stats={stats}
          upgrades={upgrades}
          language={language}
          isPlatinum={isPlatinum}
          onClose={closeLoadout}
      />

      {/* (RESTANTE DOS MENUS) */}
      
      <ScreenPresence show={gameState === GameState.ACHIEVEMENTS}>
        {(phase) => (
          <div className={`absolute inset-0 z-50 ${motionClass(phase)}`}>
            <Dossier
              title={t('ACHIEVEMENTS')}
              meta={`${Object.values(achievementManager.getProgress()).filter(p => p.unlocked).length} / ${ACHIEVEMENTS_LIST.length}`}
              onBack={() => setGameState(GameState.MENU)}
              backLabel={t('BACK')}
            >
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pb-2">
                          {ACHIEVEMENTS_LIST.map((ach) => {
                              const progress = achievementManager.getProgress()[ach.id] || { unlocked: false, currentValue: 0 };
                              const isLocked = !progress.unlocked;
                              if (ach.secret && isLocked) {
                                  return (
                                      <div key={ach.id} className="dossier-card flex items-center justify-center opacity-45 min-h-[52px] lg:min-h-[72px]">
                                          <span className="text-[11px] tracking-[0.22em] text-[#e2b060]/70">??? ENCRYPTED DATA ???</span>
                                      </div>
                                  )
                              }

                              return (
                                  <div key={ach.id} className={`dossier-card relative overflow-hidden flex flex-col min-h-[64px] lg:min-h-[88px]
                                      ${isLocked ? 'opacity-55' : ''}`}>
                                      <div className="flex items-center lg:items-start gap-3 lg:gap-4 z-10 relative h-full">
                                          <div className="text-2xl lg:text-4xl filter drop-shadow-md">{ach.icon}</div>
                                          <div className="flex-1 flex flex-col h-full justify-center">
                                              <h4 className={`font-bold text-xs lg:text-lg mb-1 lg:mb-1 ${isLocked ? 'text-gray-500' : 'text-white'}`}>{t(ach.titleKey)}</h4>
                                              <p className={`text-[10px] lg:text-sm mb-1 lg:mb-1 leading-relaxed ${isLocked ? 'text-gray-600' : 'text-gray-300'}`}>{t(ach.descKey)}</p>
                                              
                                              <div className="mt-auto w-full">
                                                  {ach.isCumulative && !progress.unlocked && (
                                                      <div className="w-full h-1 bg-black rounded overflow-hidden mb-1 border border-white/5">
                                                          <div className="h-full bg-[#e2a01f]" style={{width: `${Math.min(100, (progress.currentValue / ach.targetValue)*100)}%`}}></div>
                                                      </div>
                                                  )}
                                                  
                                                  <div className="flex justify-between text-[8px] lg:text-xs tracking-widest font-mono">
                                                      <span className={progress.unlocked ? 'text-green-400 font-bold' : 'text-gray-600'}>
                                                          {progress.unlocked ? t('UNLOCKED') : t('ACH_LOCKED')}
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
            </Dossier>
          </div>
        )}
      </ScreenPresence>

      <ScreenPresence show={gameState === GameState.RANKING}>
        {(phase) => (
          <div className={`absolute inset-0 z-50 ${motionClass(phase)}`}>
            <RankingBoard
              language={language}
              title={t('MENU_RANKING')}
              backLabel={t('BACK')}
              onBack={() => setGameState(GameState.MENU)}
            />
          </div>
        )}
      </ScreenPresence>

      <ScreenPresence show={gameState === GameState.MANUAL}>
        {(phase) => (
        <div className={`absolute inset-0 z-50 ${motionClass(phase)}`}>
           <FieldGuide
              language={language}
              title={t('MENU_INFO')}
              backLabel={t('BACK')}
              onBack={() => setGameState(GameState.MENU)}
           />
        </div>
        )}
      </ScreenPresence>

      <ScreenPresence show={gameState === GameState.CONTROLS}>
        {(phase) => (
        <div className={`absolute inset-0 z-[60] ${motionClass(phase)}`}>
           <Dossier title={t('CONTROLS')} onBack={goBackFromControls} backLabel={t('BACK')}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="dossier-card">
                      <h3>{t('CTRL_MOVE')}</h3>
                      <p>{t('CTRL_MOVE_DESC')}</p>
                  </div>
                  <div className="dossier-card">
                      <h3>{t('CTRL_DASH')}</h3>
                      <p>{t('CTRL_DASH_DESC')}</p>
                  </div>
                  <div className="dossier-card">
                      <h3>{t('CTRL_SURGE')}</h3>
                      <p>{t('CTRL_SURGE_DESC')}</p>
                  </div>
                  <div className="dossier-card flex items-center justify-center">
                      <p className="text-center text-[#ffd84a]">{t('CTRL_NOTE')}</p>
                  </div>
              </div>
           </Dossier>
        </div>
        )}
      </ScreenPresence>

      <ScreenPresence show={gameState === GameState.BRIEFING && !!patient}>
        {(phase) => patient ? (
         <PatientChart
            patient={patient}
            language={language}
            difficulty={difficulty}
            isPlatinum={isPlatinum}
            onPlay={deployToWave}
            onLab={openShop}
            onBack={() => setGameState(GameState.MENU)}
            motion={phase}
         />
        ) : null}
      </ScreenPresence>

      <ScreenPresence show={gameState === GameState.BIO_LAB}>
        {(phase) => (
          <div className={`absolute inset-0 z-50 ${motionClass(phase)}`}>
            <BioLab
              upgrades={upgrades}
              biomass={uiData.biomass}
              language={language}
              t={t}
              pulse={labPulse}
              onBuy={buyUpgrade}
              onClose={closeShop}
            />
          </div>
        )}
      </ScreenPresence>

      {/* (LOADOUT, SETTINGS, CREDITS, PAUSED, GAME_OVER) mantidos */}
      
      <ScreenPresence show={gameState === GameState.GAME_OVER && (outcomeBeat !== 'lose' || outcomeLeaving)}>
        {(phase) => (
        <OutcomeChart
            variant="lost"
            patient={patient}
            language={language}
            isPlatinum={isPlatinum}
            wave={uiData.wave}
            biomass={uiData.biomass}
            score={uiData.score}
            onPrimary={handleStartGame}
            motion={phase}
        />
        )}
      </ScreenPresence>

      {serum && gameState === GameState.PLAYING && (
        <SerumOffer
          ids={serum.ids}
          upgrades={upgrades}
          language={language}
          t={t}
          now={serumNow}
          endsAt={serum.endsAt}
          collapseId={serumCollapse}
          windowMs={serumWindowMs(difficulty)}
          onPick={pickSerum}
        />
      )}

      {isMobile && !isPaused && !serum && !showTutorial && !passage && !showBossIntro && gameState === GameState.PLAYING && <Joystick onMove={handleJoystickMove} />}
      
      {/* NEW PAUSE MENU IMPLEMENTATION */}
      <PauseMenu 
          isPaused={isPaused} 
          language={language}
          isPlatinum={isPlatinum}
          gameState={gameState}
          onResume={togglePause} 
          onSettings={openSettings}
          onQuit={() => {
              rememberRun();
              togglePause();
              setGameState(GameState.MENU);
          }}
      />
    </div>
  );
};
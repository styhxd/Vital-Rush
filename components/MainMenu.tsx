
import React, { useEffect, useState } from 'react';
import { Difficulty, Language } from '../types';
import { TEXTS } from '../constants';
import { audioManager } from '../services/audioManager';
import { IntroSequence } from './IntroSequence';
import { useScreenPresence } from './screenPresence';

// --- ASSETS CONFIGURATION ---
const VITAL_HERO = new URL('../src/assets/vital.png', import.meta.url).href;
const VIRUS = new URL('../src/assets/virus.png', import.meta.url).href;
const BACKGROUND = new URL('../src/assets/background.jpg', import.meta.url).href;

const MenuButton = ({ onClick, children, variant = 'primary', selected = false }: any) => {
    const base = "w-full py-2 lg:py-4 font-bold text-[10px] lg:text-xl tracking-widest uppercase clip-path-polygon transition-all hover:scale-105 shadow-[0_0_10px_rgba(0,0,0,0.4)] lg:shadow-[0_0_20px_rgba(0,0,0,0.4)] relative overflow-hidden group";
    let colors = "";
    
    if (variant === 'primary') {
        colors = "bg-red-600 hover:bg-red-500 text-black shadow-[0_0_10px_rgba(255,0,0,0.4)]";
    } else if (variant === 'secondary') {
        colors = selected 
          ? "bg-white text-black border border-white shadow-[0_0_10px_white]"
          : "bg-white/10 hover:bg-white/20 text-white border border-white/10";
    } else if (variant === 'success') {
        colors = "bg-green-600 hover:bg-green-500 text-black shadow-[0_0_10px_rgba(0,255,0,0.4)]";
    }
    
    return (
      <button onClick={onClick} data-menu-hit={variant === 'secondary' ? '' : undefined} className={`${base} ${colors}`} style={{clipPath: 'polygon(5% 0, 100% 0, 100% 70%, 95% 100%, 0 100%, 0 30%)'}}>
        <span className="relative z-10">{children}</span>
        <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
      </button>
    );
};

type VirusSlot = { x: number; y: number };

const FALLBACK_SLOTS: VirusSlot[] = [
    { x: 58, y: 14 },
    { x: 90, y: 11 },
    { x: 56, y: 78 },
    { x: 95, y: 60 },
];

// Pockets around Vital: above the left gun, the top-right corner, the dark
// gap left of his hip, and the open flank beside his right arm. Measured from
// his sprite so the same composition holds on a phone and on a wide screen.
const layoutBox = (el: HTMLElement, stage: HTMLElement) => {
    let x = 0;
    let y = 0;
    let node: HTMLElement | null = el;
    while (node && node !== stage) {
        x += node.offsetLeft;
        y += node.offsetTop;
        node = node.offsetParent as HTMLElement | null;
    }
    return { left: x, top: y, width: el.offsetWidth, height: el.offsetHeight, right: x + el.offsetWidth };
};

const measureVirusSlots = (): VirusSlot[] | null => {
    const stage = document.querySelector('.menu-stage') as HTMLElement | null;
    const vital = document.querySelector('.vital-anchor') as HTMLElement | null;
    if (!stage || !vital) return null;
    const s = {
        left: 0,
        top: 0,
        width: stage.clientWidth,
        height: stage.clientHeight,
        right: stage.clientWidth,
        bottom: stage.clientHeight,
    };
    const v = layoutBox(vital, stage);
    if (s.width < 10 || v.width < 10) return null;

    const menuRight = [...document.querySelectorAll<HTMLElement>('[data-menu-hit]')]
        .reduce((max, el) => Math.max(max, layoutBox(el, stage).right), 0);
    const pct = (x: number, y: number): VirusSlot => ({
        x: ((x - s.left) / s.width) * 100,
        y: ((y - s.top) / s.height) * 100,
    });
    const radii = [0.09, 0.07, 0.06, 0.065].map((part) => s.height * part);
    const clearOfMenu = (x: number, radius: number) => Math.max(x, menuRight + radius + 10);
    const onScreen = (slot: VirusSlot, radius: number): VirusSlot => ({
        x: Math.min(98, Math.max((radius / s.width) * 100 + 1, slot.x)),
        y: Math.min(96, Math.max((radius / s.height) * 100 + 1, slot.y)),
    });

    const gap = v.left - menuRight;
    const sky = pct(
        clearOfMenu(menuRight + Math.max(gap * 0.72, radii[0]), radii[0]),
        Math.max(s.top + radii[0] * 0.45, v.top - radii[0] * 0.45)
    );
    const corner = pct(
        Math.min(s.right - radii[1] - 8, v.right - v.width * 0.18),
        Math.max(s.top + radii[1] * 0.4, v.top - s.height * 0.05)
    );
    const hip = pct(
        clearOfMenu((menuRight + v.left) / 2, radii[2]),
        v.top + v.height * 0.7
    );
    const flank = pct(
        Math.min(s.right - radii[3] - 6, v.left + v.width * 0.93),
        v.top + v.height * 0.48
    );

    return [sky, corner, hip, flank].map((slot, index) => onScreen(slot, radii[index]));
};

const useVirusSlots = (active: boolean) => {
    const [slots, setSlots] = useState<VirusSlot[]>(FALLBACK_SLOTS);
    const [placed, setPlaced] = useState(false);
    const [order, setOrder] = useState([0, 1, 2, 3]);

    useEffect(() => {
        if (!active) return;
        let frame = 0;
        const measure = () => {
            const next = measureVirusSlots();
            if (next) {
                setSlots(next);
                setPlaced(true);
            }
        };
        frame = requestAnimationFrame(() => requestAnimationFrame(measure));
        window.addEventListener('resize', measure);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('resize', measure);
        };
    }, [active]);

    useEffect(() => {
        if (!active) return;
        let timer = 0;
        const hop = () => {
            setOrder((prev) => {
                const next = [...prev];
                const a = Math.floor(Math.random() * next.length);
                let b = Math.floor(Math.random() * (next.length - 1));
                if (b >= a) b += 1;
                [next[a], next[b]] = [next[b], next[a]];
                return next;
            });
            timer = window.setTimeout(hop, 20000 + Math.random() * 16000);
        };
        timer = window.setTimeout(hop, 22000 + Math.random() * 8000);
        return () => window.clearTimeout(timer);
    }, [active]);

    return { slots: order.map((index) => slots[index]), placed };
};

interface MainMenuProps {
    isVisible: boolean;
    language: Language;
    difficulty: Difficulty;
    isPlatinum: boolean;
    onStart: () => void;
    onControls: () => void;
    onManual: () => void;
    onSettings: () => void;
    onAchievements: () => void;
    onLanguageChange: (lang: Language) => void;
    onDifficultyChange: (diff: Difficulty) => void;
}

export const MainMenu: React.FC<MainMenuProps> = (props) => {
    const { isVisible, language, isPlatinum } = props;
    
    const [showIntro, setShowIntro] = useState(true);
    const present = useScreenPresence(isVisible && !showIntro);
    const viruses = useVirusSlots(!showIntro);

    useEffect(() => {
        if (showIntro || !isVisible) return;
        let frame = 0;
        let last = 0;
        const tick = (now: number) => {
            frame = requestAnimationFrame(tick);
            if (now - last < 90) return;
            last = now;
            const viruses = document.querySelectorAll('.virus-route img');
            const buttons = document.querySelectorAll('[data-menu-hit]');
            const boxes: DOMRect[] = [];
            viruses.forEach((el) => boxes.push(el.getBoundingClientRect()));
            buttons.forEach((btn) => {
                const b = btn.getBoundingClientRect();
                const hit = boxes.some((v) => v.left < b.right - 6 && v.right > b.left + 6 && v.top < b.bottom - 6 && v.bottom > b.top + 6);
                btn.classList.toggle('menu-hit', hit);
            });
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [showIntro, isVisible]);

    // FAILSAFE: Trigger Fullscreen on Start
    const handleStartWithFullscreen = () => {
        // Tentativa de Modo Imersivo via Web API
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(() => {});
        } else if ((elem as any).webkitRequestFullscreen) {
            (elem as any).webkitRequestFullscreen();
        }
        
        audioManager.menuAccent('play');
        props.onStart();
        audioManager.startMenuMusic();
    };

    // Se a Intro estiver ativa, mostra ela e bloqueia o resto
    if (showIntro) {
        return <IntroSequence onComplete={() => setShowIntro(false)} />;
    }

    if (!present.alive) return null;

    return (
        <div className={`absolute inset-0 bg-black flex items-center justify-center z-50 overflow-hidden ${present.phase === 'out' ? 'screen-out' : ''}`}>
            <style>{`
                @keyframes vital-breath {
                    0%, 100% { transform: scaleX(1) scaleY(1); }
                    28% { transform: scaleX(0.982) scaleY(1.04); }
                    52% { transform: scaleX(1) scaleY(1); }
                    78% { transform: scaleX(1.035) scaleY(0.986); }
                }
                @keyframes vital-arrive {
                    from { opacity: 0; transform: translate3d(34%, 10%, 0); }
                    to { opacity: 1; transform: translate3d(0, 0, 0); }
                }
                @keyframes bg-arrive {
                    from { opacity: 0; transform: scale(1.06); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes menu-arrive {
                    from { opacity: 0; transform: translate3d(-96px, 18px, 0); }
                    to { opacity: 1; transform: translate3d(0, 0, 0); }
                }
                @keyframes virus-arrive {
                    from { opacity: 0; transform: scale(0.7); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes virus-idle-a {
                    0%, 68% { transform: translate(-50%, -50%) rotate(-3deg); }
                    84% { transform: translate(-50%, -50%) translate3d(5px, -7px, 0) rotate(2deg); }
                    100% { transform: translate(-50%, -50%) rotate(-3deg); }
                }
                @keyframes virus-idle-b {
                    0%, 74% { transform: translate(-50%, -50%) rotate(4deg); }
                    88% { transform: translate(-50%, -50%) translate3d(-6px, 5px, 0) rotate(-1deg); }
                    100% { transform: translate(-50%, -50%) rotate(4deg); }
                }
                @keyframes virus-idle-c {
                    0%, 62% { transform: translate(-50%, -50%) rotate(1deg); }
                    80% { transform: translate(-50%, -50%) translate3d(4px, 8px, 0) rotate(-3deg); }
                    100% { transform: translate(-50%, -50%) rotate(1deg); }
                }
                @keyframes virus-idle-d {
                    0%, 78% { transform: translate(-50%, -50%) rotate(-2deg); }
                    90% { transform: translate(-50%, -50%) translate3d(-4px, -6px, 0) rotate(3deg); }
                    100% { transform: translate(-50%, -50%) rotate(-2deg); }
                }
                .anim-vital { animation: vital-breath 6.5s linear infinite; transform-origin: center bottom; will-change: transform; }
                .vital-arrive { animation: vital-arrive 1.25s cubic-bezier(0.16, 1, 0.3, 1) 0.08s both; }
                .bg-arrive { animation: bg-arrive 1.2s cubic-bezier(0.16, 1, 0.3, 1) both; }
                .menu-arrive { animation: menu-arrive 0.95s cubic-bezier(0.16, 1, 0.3, 1) 0.22s both; }
                .virus-route {
                    position: absolute;
                    left: 0;
                    top: 0;
                    z-index: 16;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                }
                .virus-route.is-settled {
                    transition: transform 7.5s cubic-bezier(0.45, 0.02, 0.2, 1);
                }
                .virus-arrive {
                    animation: virus-arrive 1.15s cubic-bezier(0.16, 1, 0.3, 1) both;
                }
                .virus-idle-a { animation: virus-idle-a 11s ease-in-out infinite; }
                .virus-idle-b { animation: virus-idle-b 13.5s ease-in-out infinite; }
                .virus-idle-c { animation: virus-idle-c 9.5s ease-in-out infinite; }
                .virus-idle-d { animation: virus-idle-d 15s ease-in-out infinite; }
                [data-menu-hit] { transition: background-color 180ms ease, border-color 180ms ease, color 180ms ease; }
                [data-menu-hit].menu-hit {
                    background-color: rgba(12, 8, 10, 0.94) !important;
                    border-color: rgba(255, 255, 255, 0.38) !important;
                    color: #fff !important;
                }
            `}</style>

            <div className="menu-stage absolute inset-0 w-full h-full">
                    <div className="absolute inset-0 bg-cover bg-center z-0 bg-arrive" style={{ backgroundImage: `url(${BACKGROUND})` }} />
                    <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent z-10 bg-arrive"></div>

                    {([
                        { size: 'clamp(58px, 18vh, 210px)', idle: 'virus-idle-a', arriveDelay: '0.12s' },
                        { size: 'clamp(46px, 14vh, 160px)', idle: 'virus-idle-b', arriveDelay: '0.28s' },
                        { size: 'clamp(42px, 12vh, 142px)', idle: 'virus-idle-c', arriveDelay: '0.2s' },
                        { size: 'clamp(44px, 13vh, 150px)', idle: 'virus-idle-d', arriveDelay: '0.36s' },
                    ] as const).map((virus, index) => (
                        <div
                            key={virus.idle}
                            className={`virus-route${viruses.placed ? ' is-settled' : ''}`}
                            style={{ transform: `translate3d(${viruses.slots[index].x}%, ${viruses.slots[index].y}%, 0)` }}
                        >
                            <div className="virus-arrive" style={{ animationDelay: virus.arriveDelay }}>
                                <img
                                    src={VIRUS}
                                    alt=""
                                    style={{ width: virus.size }}
                                    className={`absolute left-0 top-0 max-w-none h-auto ${virus.idle} drop-shadow-[0_0_22px_rgba(0,255,0,0.5)]`}
                                />
                            </div>
                        </div>
                    ))}

                    <div className="vital-anchor absolute right-[2%] lg:right-[5%] bottom-0 lg:bottom-[-5%] h-[76%] lg:h-[90%] z-20 pointer-events-none flex items-end justify-end vital-arrive">
                         <div className="h-full anim-vital">
                         <img src={VITAL_HERO} alt="Vital" className="h-full w-auto max-w-none object-contain"
                            style={{ filter: isPlatinum ? 'drop-shadow(0 0 30px rgba(255, 215, 0, 0.4))' : 'drop-shadow(0 0 30px rgba(0, 255, 255, 0.3))' }}
                         />
                         </div>
                    </div>

                    <div className="absolute left-0 top-0 h-full w-full lg:w-[45%] z-30 flex flex-col justify-center p-4 lg:p-16 scale-90 lg:scale-100 origin-left">
                        <div className="menu-arrive w-full">
                            <MenuContent {...props} onStart={handleStartWithFullscreen} align="left" />
                        </div>
                    </div>
                </div>
        </div>
    );
};

const MenuContent = (props: MainMenuProps & { align: 'left' | 'center' }) => {
    const { 
        language, difficulty, isPlatinum, align,
        onStart, onControls, onManual, onSettings, onAchievements, 
        onLanguageChange, onDifficultyChange 
    } = props;
    
    const t = (key: string) => TEXTS[language][key] || key;
    const isLeft = align === 'left';

    return (
        <div className={`flex flex-col ${isLeft ? 'items-start text-left' : 'items-center text-center'}`}>
            <h1 className={`text-5xl lg:text-9xl font-bold mb-0 lg:mb-0 tracking-tighter mix-blend-screen leading-none ${isPlatinum ? 'text-amber-400 shadow-[0_0_30px_rgba(255,170,0,0.5)]' : 'text-red-600 red-glow'}`} style={{fontFamily: 'Impact, sans-serif'}}>
                {t('TITLE_MAIN')}
            </h1>
            <h2 className={`text-lg lg:text-5xl font-light text-white mb-2 lg:mb-8 tracking-[0.5em] -mt-1 lg:-mt-2 opacity-80 ${isLeft ? 'ml-1' : ''}`}>
                {t('TITLE_SUB')}
            </h2>
            
            {isPlatinum && <div className="text-[8px] lg:text-xs tracking-[0.5em] text-purple-400 mb-1 lg:mb-4 animate-pulse">{t('ACH_PLATINUM_MSG')}</div>}

            <div className={`mb-2 lg:mb-8 w-full ${isLeft ? 'max-w-md' : ''}`}>
                <div className={`text-[10px] lg:text-xs text-gray-500 tracking-widest mb-0.5 lg:mb-2 ${isLeft ? 'text-left' : 'text-center'}`}>{t('DIFFICULTY')}</div>
                <div className="grid grid-cols-4 gap-1.5 lg:gap-2">
                    {Object.values(Difficulty).map(d => (
                        <button key={d} data-menu-hit="" onClick={() => { audioManager.menuAccent('diff'); onDifficultyChange(d); }} className={`text-[9px] lg:text-[10px] font-bold py-1 lg:py-2 border transition-all ${difficulty === d ? 'bg-red-600 text-black border-red-600' : 'bg-transparent text-gray-500 border-gray-800'}`}>
                            {t(`DIFF_${d}`)}
                        </button>
                    ))}
                </div>
            </div>

            <div className={`space-y-1.5 lg:space-y-4 w-full ${isLeft ? 'max-w-md' : ''}`}>
                <MenuButton onClick={onStart}>{t('START')}</MenuButton>
                <div className="grid grid-cols-2 gap-2 lg:gap-4">
                  <MenuButton variant="secondary" onClick={() => { audioManager.menuAccent('config'); onSettings(); }}>{t('MENU_CONFIG')}</MenuButton>
                  <MenuButton variant="secondary" onClick={() => { audioManager.menuAccent('extras'); onManual(); }}>{t('MENU_EXTRAS')}</MenuButton>
                </div>
                <div className="grid grid-cols-2 gap-2 lg:gap-4">
                  <MenuButton variant="secondary" onClick={() => { audioManager.menuAccent('info'); onControls(); }}>{t('MENU_INFO')}</MenuButton>
                  <MenuButton variant="secondary" onClick={() => { audioManager.menuAccent('ranking'); onAchievements(); }}>{t('MENU_RANKING')}</MenuButton>
                </div>
                
                <div className={`flex gap-2 lg:gap-2 mt-2 lg:mt-6 ${isLeft ? 'justify-start' : 'justify-center'}`}>
                    {(['EN', 'PT', 'ES'] as Language[]).map(l => (
                      <button key={l} data-menu-hit="" onClick={() => { audioManager.menuAccent('lang'); onLanguageChange(l); }} className={`text-[10px] lg:text-sm font-bold tracking-widest px-3 lg:px-3 py-1 lg:py-2 border-b-2 transition-all flex items-center gap-2 ${language === l ? 'text-white border-red-500 bg-red-900/20' : 'text-gray-600 border-transparent hover:text-gray-400'}`}>
                        {l}
                      </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
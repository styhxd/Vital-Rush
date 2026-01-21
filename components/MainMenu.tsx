
import React, { useState, useEffect } from 'react';
import { Difficulty, Language } from '../types';
import { TEXTS } from '../constants';
import { audioManager } from '../services/audioManager';

// --- ASSETS CONFIGURATION ---
const ASSETS = {
    BG: "https://raw.githubusercontent.com/styhxd/Vital-Rush/main/src/assets/background.webp",
    HERO: "https://raw.githubusercontent.com/styhxd/Vital-Rush/main/src/assets/vital.png",
    VIRUS: "https://raw.githubusercontent.com/styhxd/Vital-Rush/main/src/assets/virus.png"
};

// --- SUB-COMPONENTS ---

const MenuButton = ({ onClick, children, variant = 'primary', selected = false }: any) => {
    const base = "w-full py-2.5 lg:py-4 font-bold text-xs lg:text-xl tracking-widest uppercase clip-path-polygon transition-all hover:scale-105 shadow-[0_0_10px_rgba(0,0,0,0.4)] lg:shadow-[0_0_20px_rgba(0,0,0,0.4)] relative overflow-hidden group";
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
      <button onClick={onClick} className={`${base} ${colors}`} style={{clipPath: 'polygon(5% 0, 100% 0, 100% 70%, 95% 100%, 0 100%, 0 30%)'}}>
        <span className="relative z-10">{children}</span>
        <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
      </button>
    );
};

interface MainMenuProps {
    isVisible: boolean;
    language: Language;
    difficulty: Difficulty;
    isPlatinum: boolean;
    cheatInput: string;
    onStart: () => void;
    onControls: () => void;
    onManual: () => void;
    onSettings: () => void;
    onAchievements: () => void;
    onLanguageChange: (lang: Language) => void;
    onDifficultyChange: (diff: Difficulty) => void;
    onCheatInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const MainMenu: React.FC<MainMenuProps> = (props) => {
    const { isVisible, language, isPlatinum } = props;
    
    // States for granular asset loading
    const [graphicMode, setGraphicMode] = useState(false);
    const [heroLoaded, setHeroLoaded] = useState(false);
    const [virusLoaded, setVirusLoaded] = useState(false);

    // ADAPTIVE LOADING: FAULT TOLERANT STRATEGY
    useEffect(() => {
        let isMounted = true;
        
        // 1. Critical: Background
        const bgImg = new Image();
        bgImg.src = ASSETS.BG;
        
        bgImg.onload = () => {
            if (!isMounted) return;
            console.log("[Vital Rush] Background Loaded. Enabling Graphic Mode.");
            setGraphicMode(true);

            // 2. Optional: Hero
            const heroImg = new Image();
            heroImg.src = ASSETS.HERO;
            heroImg.onload = () => isMounted && setHeroLoaded(true);
            heroImg.onerror = () => console.warn("[Vital Rush] Hero asset failed. Continuing without it.");

            // 3. Optional: Virus
            const virusImg = new Image();
            virusImg.src = ASSETS.VIRUS;
            virusImg.onload = () => isMounted && setVirusLoaded(true);
            virusImg.onerror = () => console.warn("[Vital Rush] Virus asset failed. Continuing without it.");
        };

        bgImg.onerror = (e) => {
            if (!isMounted) return;
            console.warn("[Vital Rush] Background Failed. Fallback to Classic Mode.", e);
            setGraphicMode(false);
        };

        return () => { isMounted = false; };
    }, []);

    if (!isVisible) return null;

    return (
        <div className="absolute inset-0 bg-black flex items-center justify-center z-50 overflow-hidden">
            <style>{`
                @keyframes vital-breath {
                    0%, 100% { transform: scale(1, 1) translateY(0); }
                    50% { transform: scale(1.02, 0.98) translateY(5px); }
                }
                @keyframes virus-float {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    50% { transform: translateY(-20px) rotate(5deg); }
                }
                .anim-vital { animation: vital-breath 4s ease-in-out infinite; }
                .anim-float-1 { animation: virus-float 5s ease-in-out infinite; }
                .anim-float-2 { animation: virus-float 7s ease-in-out infinite; animation-delay: 1s; }
                .anim-float-3 { animation: virus-float 6s ease-in-out infinite; animation-delay: 2s; }
            `}</style>

            {graphicMode ? (
                // --- GRAPHIC MODE (LEFT ALIGNED + ASSETS) ---
                <div className="absolute inset-0 w-full h-full">
                    {/* Background Layer */}
                    <div 
                        className="absolute inset-0 bg-cover bg-center z-0 transition-opacity duration-1000"
                        style={{ backgroundImage: `url(${ASSETS.BG})` }}
                    />
                    
                    {/* Gradient Overlay: Ensures text on left is readable */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent z-10"></div>

                    {/* VIRUSES LAYER (Conditional) */}
                    {virusLoaded && (
                        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
                            <img 
                                src={ASSETS.VIRUS} 
                                alt="virus"
                                className="absolute top-[20%] right-[30%] w-24 lg:w-48 opacity-80 anim-float-1 drop-shadow-[0_0_15px_rgba(0,255,0,0.5)]"
                            />
                            <img 
                                src={ASSETS.VIRUS} 
                                alt="virus"
                                className="absolute bottom-[30%] right-[10%] w-16 lg:w-32 opacity-60 anim-float-2 drop-shadow-[0_0_15px_rgba(0,255,0,0.5)] blur-[1px]"
                            />
                            <img 
                                src={ASSETS.VIRUS} 
                                alt="virus"
                                className="absolute top-[10%] right-[10%] w-32 lg:w-64 opacity-40 anim-float-3 drop-shadow-[0_0_15px_rgba(0,255,0,0.5)] blur-[2px]"
                            />
                        </div>
                    )}

                    {/* HERO LAYER (Conditional) */}
                    {heroLoaded && (
                        <div className="absolute right-[-5%] lg:right-[5%] bottom-[-5%] h-[70%] lg:h-[90%] z-20 pointer-events-none flex items-end justify-end">
                             <img 
                                src={ASSETS.HERO} 
                                alt="Vital Hero"
                                className="h-full object-contain anim-vital"
                                style={{ 
                                    filter: isPlatinum 
                                        ? 'drop-shadow(0 0 30px rgba(255, 215, 0, 0.4))' 
                                        : 'drop-shadow(0 0 30px rgba(0, 255, 255, 0.3))' 
                                }}
                             />
                        </div>
                    )}

                    {/* MENU CONTAINER (Left Aligned) */}
                    <div className="absolute left-0 top-0 h-full w-full lg:w-[45%] z-30 flex flex-col justify-center p-8 lg:p-16">
                        <MenuContent {...props} align="left" />
                    </div>
                </div>
            ) : (
                // --- CLASSIC MODE (CENTERED CSS FALLBACK) ---
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                    <div className="relative text-center p-6 lg:p-8 max-w-md lg:max-w-md w-full scale-90 lg:scale-100">
                        <MenuContent {...props} align="center" />
                    </div>
                </div>
            )}
        </div>
    );
};

// Extracted Content to reuse logic but change alignment style
const MenuContent = (props: MainMenuProps & { align: 'left' | 'center' }) => {
    const { 
        language, difficulty, isPlatinum, cheatInput, align,
        onStart, onControls, onManual, onSettings, onAchievements, 
        onLanguageChange, onDifficultyChange, onCheatInput 
    } = props;
    
    const t = (key: string) => TEXTS[language][key] || key;
    const isLeft = align === 'left';

    return (
        <div className={`flex flex-col ${isLeft ? 'items-start text-left' : 'items-center text-center'}`}>
            <h1 
                className={`text-6xl lg:text-9xl font-bold mb-0 lg:mb-0 tracking-tighter mix-blend-screen leading-none 
                ${isPlatinum ? 'text-amber-400 shadow-[0_0_30px_rgba(255,170,0,0.5)]' : 'text-red-600 red-glow'}`} 
                style={{fontFamily: 'Impact, sans-serif'}}
            >
                {t('TITLE_MAIN')}
            </h1>
            <h2 className={`text-xl lg:text-5xl font-light text-white mb-4 lg:mb-8 tracking-[0.5em] -mt-1 lg:-mt-2 opacity-80 ${isLeft ? 'ml-1' : ''}`}>
                {t('TITLE_SUB')}
            </h2>
            
            {isPlatinum && <div className="text-[8px] lg:text-xs tracking-[0.5em] text-purple-400 mb-2 lg:mb-4 animate-pulse">{t('ACH_PLATINUM_MSG')}</div>}

            <div className={`mb-4 lg:mb-8 w-full ${isLeft ? 'max-w-md' : ''}`}>
                <div className={`text-[10px] lg:text-xs text-gray-500 tracking-widest mb-1 lg:mb-2 ${isLeft ? 'text-left' : 'text-center'}`}>{t('DIFFICULTY')}</div>
                <div className="grid grid-cols-4 gap-1.5 lg:gap-2">
                    {Object.values(Difficulty).map(d => (
                        <button 
                            key={d} 
                            onClick={() => onDifficultyChange(d)}
                            className={`text-[9px] lg:text-[10px] font-bold py-1.5 lg:py-2 border transition-all ${difficulty === d ? 'bg-red-600 text-black border-red-600' : 'bg-transparent text-gray-500 border-gray-800'}`}
                        >
                            {t(`DIFF_${d}`)}
                        </button>
                    ))}
                </div>
            </div>

            <div className={`space-y-2 lg:space-y-4 w-full ${isLeft ? 'max-w-md' : ''}`}>
                <MenuButton onClick={() => { onStart(); audioManager.startMenuMusic(); }}>{t('START')}</MenuButton>
                <div className="grid grid-cols-2 gap-2 lg:gap-4">
                  <MenuButton variant="secondary" onClick={onControls}>{t('CONTROLS')}</MenuButton>
                  <MenuButton variant="secondary" onClick={onManual}>{t('MANUAL')}</MenuButton>
                </div>
                <div className="grid grid-cols-2 gap-2 lg:gap-4">
                  <MenuButton variant="secondary" onClick={onSettings}>{t('SETTINGS')}</MenuButton>
                  <MenuButton variant="secondary" onClick={onAchievements}>{t('ACHIEVEMENTS')}</MenuButton>
                </div>
                
                <div className={`flex gap-2 lg:gap-2 mt-4 lg:mt-6 ${isLeft ? 'justify-start' : 'justify-center'}`}>
                    {(['EN', 'PT', 'ES'] as Language[]).map(l => (
                      <button 
                        key={l}
                        onClick={() => onLanguageChange(l)} 
                        className={`text-[10px] lg:text-sm font-bold tracking-widest px-3 lg:px-3 py-1.5 lg:py-2 border-b-2 transition-all flex items-center gap-2
                            ${language === l 
                                ? 'text-white border-red-500 bg-red-900/20' 
                                : 'text-gray-600 border-transparent hover:text-gray-400'}`}
                      >
                        {l}
                      </button>
                    ))}
                </div>
            </div>
            
            <div className={`mt-6 lg:mt-8 w-full ${isLeft ? 'max-w-md' : ''}`}>
                <input 
                    type="text" 
                    value={cheatInput} 
                    onChange={onCheatInput}
                    placeholder={t('PH_ACCESS_CODE')}
                    className={`bg-transparent border-b border-gray-800 text-[10px] lg:text-xs text-gray-500 focus:outline-none focus:border-red-500 w-full font-mono tracking-widest uppercase ${isLeft ? 'text-left' : 'text-center'}`}
                />
            </div>
        </div>
    );
};

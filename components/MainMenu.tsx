
import React, { useState } from 'react';
import { Difficulty, Language } from '../types';
import { TEXTS } from '../constants';
import { audioManager } from '../services/audioManager';
import { IntroSequence } from './IntroSequence';

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
    
    const [showIntro, setShowIntro] = useState(true);

    // FAILSAFE: Trigger Fullscreen on Start
    const handleStartWithFullscreen = () => {
        // Tentativa de Modo Imersivo via Web API
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(() => {});
        } else if ((elem as any).webkitRequestFullscreen) {
            (elem as any).webkitRequestFullscreen();
        }
        
        props.onStart();
        audioManager.startMenuMusic();
    };

    // Se a Intro estiver ativa, mostra ela e bloqueia o resto
    if (showIntro) {
        return <IntroSequence onComplete={() => setShowIntro(false)} />;
    }

    if (!isVisible) return null;

    return (
        <div className="absolute inset-0 bg-black flex items-center justify-center z-50 overflow-hidden">
            <style>{`
                @keyframes vital-breath {
                    0%, 100% { transform: scale(1, 1) translateY(0); }
                    50% { transform: scale(1.02, 0.98) translateY(5px); }
                }
                @keyframes vital-arrive {
                    from { opacity: 0; transform: translateY(8%); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes bg-arrive {
                    from { opacity: 0; transform: scale(1.05); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes menu-arrive {
                    from { opacity: 0; transform: translateX(-28px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes virus-arrive {
                    from { opacity: 0; transform: scale(0.7); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes virus-route {
                    0%, 16%  { left: 44%; top: 7%; }
                    25%, 41% { left: 87%; top: 15%; }
                    50%, 66% { left: 92%; top: 84%; }
                    75%, 91% { left: 44%; top: 88%; }
                    100%     { left: 47%; top: 8%; }
                }
                @keyframes virus-depth {
                    0%, 43% { z-index: 24; }
                    43.01%, 48% { z-index: 15; }
                    48.01%, 68% { z-index: 24; }
                    68.01%, 74% { z-index: 15; }
                    74.01%, 100% { z-index: 24; }
                }
                @keyframes virus-hover-a {
                    0%, 100% { transform: translate(-50%, -50%) rotate(-6deg); }
                    50% { transform: translate(-50%, -50%) translate3d(10px, -18px, 0) rotate(8deg); }
                }
                @keyframes virus-hover-b {
                    0%, 100% { transform: translate(-50%, -50%) rotate(7deg); }
                    50% { transform: translate(-50%, -50%) translate3d(-14px, -16px, 0) rotate(-5deg); }
                }
                @keyframes virus-hover-c {
                    0%, 100% { transform: translate(-50%, -50%) rotate(4deg); }
                    50% { transform: translate(-50%, -50%) translate3d(12px, -14px, 0) rotate(-8deg); }
                }
                @keyframes virus-hover-d {
                    0%, 100% { transform: translate(-50%, -50%) rotate(-8deg); }
                    50% { transform: translate(-50%, -50%) translate3d(-8px, -20px, 0) rotate(6deg); }
                }
                .anim-vital { animation: vital-breath 4s ease-in-out infinite; }
                .vital-arrive { animation: vital-arrive 1.05s cubic-bezier(0.16, 1, 0.3, 1) both; }
                .bg-arrive { animation: bg-arrive 1.1s cubic-bezier(0.16, 1, 0.3, 1) both; }
                .menu-arrive { animation: menu-arrive 0.85s cubic-bezier(0.16, 1, 0.3, 1) 0.16s both; }
                .virus-route {
                    position: absolute;
                    width: 0;
                    height: 0;
                    pointer-events: none;
                    animation-name: virus-route, virus-depth;
                    animation-duration: 52s, 52s;
                    animation-timing-function: cubic-bezier(0.45, 0.02, 0.55, 0.98), step-end;
                    animation-iteration-count: infinite, infinite;
                    animation-delay: var(--route-delay), var(--route-delay);
                }
                .virus-arrive { animation: virus-arrive 0.9s cubic-bezier(0.16, 1, 0.3, 1) both; }
                .virus-hover-a { animation: virus-hover-a 5.4s ease-in-out infinite; }
                .virus-hover-b { animation: virus-hover-b 6.3s ease-in-out infinite; }
                .virus-hover-c { animation: virus-hover-c 5.8s ease-in-out infinite; }
                .virus-hover-d { animation: virus-hover-d 6.8s ease-in-out infinite; }
            `}</style>

            <div className="absolute inset-0 w-full h-full">
                    <div className="absolute inset-0 bg-cover bg-center z-0 bg-arrive" style={{ backgroundImage: `url(${BACKGROUND})` }} />
                    <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent z-10 bg-arrive"></div>

                    {([
                        { size: 'clamp(104px, 24vh, 230px)', delay: '0s', hover: 'virus-hover-a', arrive: '0.2s' },
                        { size: 'clamp(80px, 18vh, 175px)', delay: '-13s', hover: 'virus-hover-b', arrive: '0.34s' },
                        { size: 'clamp(72px, 16vh, 155px)', delay: '-26s', hover: 'virus-hover-c', arrive: '0.48s' },
                        { size: 'clamp(78px, 17vh, 165px)', delay: '-39s', hover: 'virus-hover-d', arrive: '0.4s' },
                    ] as const).map((virus) => (
                        <div key={virus.delay} className="virus-route" style={{ ['--route-delay' as string]: virus.delay }}>
                            <div className="virus-arrive" style={{ animationDelay: virus.arrive }}>
                                <img
                                    src={VIRUS}
                                    alt=""
                                    style={{ width: virus.size }}
                                    className={`absolute max-w-none h-auto ${virus.hover} drop-shadow-[0_0_22px_rgba(0,255,0,0.5)]`}
                                />
                            </div>
                        </div>
                    ))}

                    <div className="absolute right-[-5%] lg:right-[5%] bottom-[-5%] h-[70%] lg:h-[90%] z-20 pointer-events-none flex items-end justify-end vital-arrive">
                         <img src={VITAL_HERO} alt="Vital" className="h-full w-auto max-w-none object-contain anim-vital"
                            style={{ filter: isPlatinum ? 'drop-shadow(0 0 30px rgba(255, 215, 0, 0.4))' : 'drop-shadow(0 0 30px rgba(0, 255, 255, 0.3))' }}
                         />
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
        language, difficulty, isPlatinum, cheatInput, align,
        onStart, onControls, onManual, onSettings, onAchievements, 
        onLanguageChange, onDifficultyChange, onCheatInput 
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
                        <button key={d} onClick={() => onDifficultyChange(d)} className={`text-[9px] lg:text-[10px] font-bold py-1 lg:py-2 border transition-all ${difficulty === d ? 'bg-red-600 text-black border-red-600' : 'bg-transparent text-gray-500 border-gray-800'}`}>
                            {t(`DIFF_${d}`)}
                        </button>
                    ))}
                </div>
            </div>

            <div className={`space-y-1.5 lg:space-y-4 w-full ${isLeft ? 'max-w-md' : ''}`}>
                <MenuButton onClick={onStart}>{t('START')}</MenuButton>
                <div className="grid grid-cols-2 gap-2 lg:gap-4">
                  <MenuButton variant="secondary" onClick={onSettings}>{t('MENU_CONFIG')}</MenuButton>
                  <MenuButton variant="secondary" onClick={onManual}>{t('MENU_EXTRAS')}</MenuButton>
                </div>
                <div className="grid grid-cols-2 gap-2 lg:gap-4">
                  <MenuButton variant="secondary" onClick={onControls}>{t('MENU_INFO')}</MenuButton>
                  <MenuButton variant="secondary" onClick={onAchievements}>{t('MENU_RANKING')}</MenuButton>
                </div>
                
                <div className={`flex gap-2 lg:gap-2 mt-2 lg:mt-6 ${isLeft ? 'justify-start' : 'justify-center'}`}>
                    {(['EN', 'PT', 'ES'] as Language[]).map(l => (
                      <button key={l} onClick={() => onLanguageChange(l)} className={`text-[10px] lg:text-sm font-bold tracking-widest px-3 lg:px-3 py-1 lg:py-2 border-b-2 transition-all flex items-center gap-2 ${language === l ? 'text-white border-red-500 bg-red-900/20' : 'text-gray-600 border-transparent hover:text-gray-400'}`}>
                        {l}
                      </button>
                    ))}
                </div>
            </div>
            
            <div className={`mt-2 lg:mt-8 w-full ${isLeft ? 'max-w-md' : ''}`}>
                <input type="text" value={cheatInput} onChange={onCheatInput} placeholder={t('PH_ACCESS_CODE')} className={`bg-transparent border-b border-gray-800 text-[10px] lg:text-xs text-gray-500 focus:outline-none focus:border-red-500 w-full font-mono tracking-widest uppercase ${isLeft ? 'text-left' : 'text-center'}`} />
            </div>
        </div>
    );
};
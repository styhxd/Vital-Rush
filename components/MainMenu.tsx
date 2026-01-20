import React, { useEffect, useState } from 'react';
import { TEXTS } from '../constants';
import { Difficulty, Language, ThemePalette } from '../types';
import { audioManager } from '../services/audioManager';

// Importação segura dos Assets
// O Vite vai transformar isso em URLs finais no build
import bgImg from '../assets/background.webp';
import vitalImg from '../assets/vital.png';
import virusImg from '../assets/virus.png';

interface MainMenuProps {
    onStart: () => void;
    onSettings: () => void;
    onControls: () => void;
    onManual: () => void;
    onAchievements: () => void;
    difficulty: Difficulty;
    setDifficulty: (d: Difficulty) => void;
    language: Language;
    setLanguage: (l: Language) => void;
    cheatInput: string;
    setCheatInput: (s: string) => void;
    handleCheatInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isPlatinum: boolean;
}

// Botão estilizado localmente para manter o componente autocontido
const MenuButton = ({ onClick, children, variant = 'primary' }: any) => {
    const base = "w-full py-3 lg:py-4 font-bold text-xs lg:text-lg tracking-widest uppercase clip-path-polygon transition-all hover:translate-x-2 relative overflow-hidden group text-left px-6 border-l-4";
    
    let colors = "";
    if (variant === 'primary') {
        colors = "bg-red-600/90 hover:bg-red-500 text-black border-red-400 shadow-[0_0_15px_rgba(255,0,0,0.3)]";
    } else {
        colors = "bg-white/5 hover:bg-white/10 text-white border-white/20 hover:border-white/60";
    }
  
    return (
      <button onClick={onClick} className={`${base} ${colors}`} style={{clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0% 100%)'}}>
        <span className="relative z-10">{children}</span>
      </button>
    );
};

export const MainMenu: React.FC<MainMenuProps> = ({
    onStart, onSettings, onControls, onManual, onAchievements,
    difficulty, setDifficulty, language, setLanguage,
    cheatInput, setCheatInput, handleCheatInput, isPlatinum
}) => {
    const t = (key: string) => TEXTS[language][key] || key;
    
    // Estado para animação dos vírus flutuantes (posições aleatórias)
    const [viruses, setViruses] = useState<{id: number, x: number, y: number, scale: number, delay: number}[]>([]);

    useEffect(() => {
        // Gera vírus aleatórios apenas uma vez ao montar
        const v = Array.from({ length: 6 }).map((_, i) => ({
            id: i,
            x: 20 + Math.random() * 60, // Posição X relativa (20% a 80% da direita)
            y: 10 + Math.random() * 80, // Posição Y relativa
            scale: 0.5 + Math.random() * 0.8,
            delay: Math.random() * 5
        }));
        setViruses(v);
    }, []);

    return (
        <div className="absolute inset-0 z-50 overflow-hidden bg-black font-tech">
            {/* 1. BACKGROUND LAYER */}
            <div 
                className="absolute inset-0 bg-cover bg-center opacity-60 transition-transform duration-[20s] ease-in-out hover:scale-105"
                style={{ backgroundImage: `url(${bgImg})` }}
            ></div>
            
            {/* Overlay de grade e vinheta */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.5)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent"></div>

            {/* CSS Animations Injected Locally */}
            <style>{`
                @keyframes hero-breathe {
                    0%, 100% { transform: scale(1, 1) translateY(0); filter: drop-shadow(0 0 10px rgba(0,255,255,0.2)); }
                    50% { transform: scale(1.02, 0.98) translateY(5px); filter: drop-shadow(0 0 25px rgba(0,255,255,0.6)); }
                }
                @keyframes virus-float {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    50% { transform: translateY(-20px) rotate(5deg); }
                }
                .hero-anim { animation: hero-breathe 4s ease-in-out infinite; }
                .virus-anim { animation: virus-float 6s ease-in-out infinite; }
            `}</style>

            <div className="absolute inset-0 flex flex-col lg:flex-row">
                
                {/* 2. LEFT SIDE - UI & MENU */}
                <div className="w-full lg:w-[40%] h-full flex flex-col justify-center px-8 lg:px-16 relative z-20">
                    <div className="mb-8 lg:mb-12">
                        <h1 className={`text-6xl lg:text-9xl font-black italic tracking-tighter leading-none mb-2 ${isPlatinum ? 'text-amber-400 drop-shadow-[0_0_15px_rgba(255,200,0,0.5)]' : 'text-red-600 drop-shadow-[0_0_15px_rgba(255,0,0,0.6)]'}`}>
                            {t('TITLE_MAIN')}
                        </h1>
                        <h2 className="text-2xl lg:text-5xl font-light text-white tracking-[0.4em] opacity-80 pl-2">
                            {t('TITLE_SUB')}
                        </h2>
                        {isPlatinum && <div className="text-xs text-amber-300 font-mono mt-2 tracking-widest animate-pulse">{t('ACH_PLATINUM_MSG')}</div>}
                    </div>

                    <div className="space-y-4 max-w-md">
                        {/* Start Button */}
                        <div className="group relative">
                            <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-purple-600 rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                            <MenuButton onClick={() => { onStart(); audioManager.startMenuMusic(); }}>
                                {t('START')}
                            </MenuButton>
                        </div>

                        {/* Difficulty Selector */}
                        <div className="py-4">
                            <div className="text-[10px] text-gray-500 font-bold tracking-widest mb-2 uppercase">{t('DIFFICULTY')}</div>
                            <div className="flex gap-1">
                                {Object.values(Difficulty).map(d => (
                                    <button 
                                        key={d} 
                                        onClick={() => setDifficulty(d)}
                                        className={`flex-1 py-2 text-[9px] lg:text-[10px] font-bold border transition-all uppercase skew-x-[-10deg]
                                            ${difficulty === d 
                                                ? 'bg-red-600 text-black border-red-600 shadow-[0_0_10px_red]' 
                                                : 'bg-transparent text-gray-500 border-gray-800 hover:border-gray-500'}`}
                                    >
                                        {t(`DIFF_${d}`)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Secondary Options */}
                        <div className="grid grid-cols-2 gap-3">
                            <MenuButton variant="secondary" onClick={onControls}>{t('CONTROLS')}</MenuButton>
                            <MenuButton variant="secondary" onClick={onManual}>{t('MANUAL')}</MenuButton>
                            <MenuButton variant="secondary" onClick={onSettings}>{t('SETTINGS')}</MenuButton>
                            <MenuButton variant="secondary" onClick={onAchievements}>{t('ACHIEVEMENTS')}</MenuButton>
                        </div>

                        {/* Languages */}
                        <div className="flex gap-4 mt-6 pt-6 border-t border-white/10">
                            {(['EN', 'PT', 'ES'] as Language[]).map(l => (
                                <button 
                                    key={l}
                                    onClick={() => setLanguage(l)} 
                                    className={`text-xs font-bold tracking-widest transition-colors ${language === l ? 'text-white underline decoration-red-500 underline-offset-4' : 'text-gray-600 hover:text-gray-400'}`}
                                >
                                    {l}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    {/* Cheat Input */}
                    <input 
                        type="text" 
                        value={cheatInput} 
                        onChange={handleCheatInput}
                        placeholder="ACCESS CODE"
                        className="mt-8 bg-transparent border-b border-white/10 text-white/30 text-xs font-mono py-1 focus:outline-none focus:border-red-500 w-48 transition-colors"
                    />
                </div>

                {/* 3. RIGHT SIDE - VISUALS & CHARACTERS */}
                <div className="hidden lg:block w-[60%] h-full relative z-10 pointer-events-none">
                    
                    {/* Floating Viruses */}
                    {viruses.map((v) => (
                        <img 
                            key={v.id}
                            src={virusImg}
                            alt="Virus"
                            className="absolute virus-anim opacity-80"
                            style={{
                                top: `${v.y}%`,
                                left: `${v.x}%`,
                                width: `${v.scale * 80}px`,
                                animationDelay: `${v.delay}s`,
                                filter: 'drop-shadow(0 10px 10px rgba(0,0,0,0.5))'
                            }}
                        />
                    ))}

                    {/* Main Character (Vital) */}
                    <div className="absolute right-10 bottom-0 w-[600px] h-[600px] flex items-end justify-center">
                        {/* Glow Behind */}
                        <div className="absolute bottom-0 w-[400px] h-[400px] bg-cyan-500/20 blur-[100px] rounded-full"></div>
                        
                        <img 
                            src={vitalImg} 
                            alt="Vital Agent" 
                            className="relative w-full h-auto object-contain hero-anim origin-bottom"
                            style={{
                                filter: 'drop-shadow(0 0 5px rgba(0,0,0,0.5)) drop-shadow(10px 10px 20px rgba(0,0,0,0.8))'
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

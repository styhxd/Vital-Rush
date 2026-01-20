import React, { useEffect, useState } from 'react';
import { Difficulty, Language, ThemePalette } from '../types';
import { TEXTS, COLORS_DEFAULT, COLORS_PLATINUM } from '../constants';
import { audioManager } from '../services/audioManager';

// Importação dos Assets (Vite trata isso como URL string no build)
import bgImage from '../assets/background.webp';
import vitalChar from '../assets/vital.png';
import virusChar from '../assets/virus.png';

interface MainMenuProps {
  onStart: () => void;
  onSettings: () => void;
  onControls: () => void;
  onManual: () => void;
  onAchievements: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  difficulty: Difficulty;
  setDifficulty: (diff: Difficulty) => void;
  isPlatinum: boolean;
  cheatInput: string;
  onCheatInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const MenuButton = ({ onClick, children, variant = 'primary' }: any) => {
  const base = "w-full py-3 lg:py-4 font-bold text-xs lg:text-xl tracking-widest uppercase clip-path-polygon transition-all hover:scale-105 hover:translate-x-2 relative overflow-hidden group text-left px-6 lg:px-8";
  let colors = "";
  
  if (variant === 'primary') {
      colors = "bg-red-600 hover:bg-red-500 text-black shadow-[0_0_15px_rgba(255,0,0,0.4)] border-l-4 border-black hover:border-white";
  } else if (variant === 'secondary') {
      colors = "bg-black/60 hover:bg-white/10 text-white border-l-2 border-white/20 hover:border-cyan-400 backdrop-blur-sm";
  }
  
  return (
    <button onClick={onClick} className={`${base} ${colors}`} style={{clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0% 100%)'}}>
      <span className="relative z-10 flex items-center justify-between">
          {children}
          <span className="opacity-0 group-hover:opacity-100 transition-opacity">►</span>
      </span>
    </button>
  );
};

export const MainMenu: React.FC<MainMenuProps> = ({
  onStart, onSettings, onControls, onManual, onAchievements,
  language, setLanguage, difficulty, setDifficulty, isPlatinum,
  cheatInput, onCheatInput
}) => {
  const t = (key: string) => TEXTS[language][key] || key;
  const [viruses, setViruses] = useState<Array<{id: number, x: number, y: number, scale: number, delay: number, rotation: number}>>([]);

  // Setup dos Virus flutuantes aleatórios
  useEffect(() => {
    const v = [];
    for(let i = 0; i < 6; i++) {
        v.push({
            id: i,
            x: 40 + Math.random() * 50, // Posição X (lado direito da tela)
            y: 10 + Math.random() * 80, // Posição Y
            scale: 0.5 + Math.random() * 0.8,
            delay: Math.random() * 5,
            rotation: Math.random() * 360
        });
    }
    setViruses(v);
  }, []);

  return (
    <div className="absolute inset-0 z-50 overflow-hidden bg-black flex">
      
      {/* --- BACKGROUND LAYER --- */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-1000"
        style={{ 
            backgroundImage: `url(${bgImage})`,
            filter: isPlatinum ? 'hue-rotate(240deg) brightness(0.6)' : 'brightness(0.7)'
        }}
      ></div>
      
      {/* Overlay de Vinheta e Scanlines (Mantém a estética original) */}
      <div className="absolute inset-0 z-1 bg-gradient-to-r from-black via-black/80 to-transparent"></div>
      <div className="absolute inset-0 z-1 scanlines opacity-20"></div>

      {/* --- RIGHT SIDE: VISUALS (Personagens) --- */}
      <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
         {/* Vital Character (Protagonista) */}
         <div className="absolute right-[5%] bottom-[-5%] w-[40vh] h-[40vh] lg:w-[70vh] lg:h-[70vh] z-20">
             <style>{`
                @keyframes organic-breath {
                    0% { transform: scale(1) skew(0deg); filter: drop-shadow(0 0 20px rgba(0,255,255,0.2)); }
                    50% { transform: scale(1.03) skew(-1deg) translateY(-10px); filter: drop-shadow(0 0 35px rgba(0,255,255,0.5)); }
                    100% { transform: scale(1) skew(0deg); filter: drop-shadow(0 0 20px rgba(0,255,255,0.2)); }
                }
             `}</style>
             <img 
                src={vitalChar} 
                alt="Vital Unit" 
                className="w-full h-full object-contain"
                style={{
                    animation: 'organic-breath 6s ease-in-out infinite',
                    filter: isPlatinum ? 'hue-rotate(45deg) drop-shadow(0 0 20px gold)' : undefined
                }}
             />
         </div>

         {/* Floating Viruses */}
         {viruses.map((v) => (
             <div 
                key={v.id}
                className="absolute z-10 opacity-80"
                style={{
                    left: `${v.x}%`,
                    top: `${v.y}%`,
                    width: `${v.scale * 150}px`,
                    animation: `float-virus ${4 + v.delay}s ease-in-out infinite alternate`,
                    animationDelay: `-${v.delay}s`
                }}
             >
                 <style>{`
                    @keyframes float-virus {
                        from { transform: translateY(0) rotate(${v.rotation}deg); }
                        to { transform: translateY(-30px) rotate(${v.rotation + 10}deg); }
                    }
                 `}</style>
                 <img 
                    src={virusChar} 
                    alt="Virus" 
                    className="w-full h-full object-contain drop-shadow-lg"
                    style={{
                        filter: isPlatinum ? 'hue-rotate(180deg)' : 'none'
                    }}
                 />
             </div>
         ))}
      </div>

      {/* --- LEFT SIDE: MENU UI --- */}
      <div className="relative z-30 w-full lg:w-[40%] h-full flex flex-col justify-center p-8 lg:p-16 border-r border-white/5 bg-black/40 backdrop-blur-sm">
        
        {/* Title Section */}
        <div className="mb-8 lg:mb-12">
            <h1 className={`text-6xl lg:text-9xl font-bold tracking-tighter leading-none italic transform -skew-x-6 ${isPlatinum ? 'text-amber-400' : 'text-red-600 text-glow'}`} style={{fontFamily: 'Impact, sans-serif'}}>
                {t('TITLE_MAIN')}
            </h1>
            <h2 className="text-2xl lg:text-5xl font-light text-white tracking-[0.6em] ml-2 opacity-90">
                {t('TITLE_SUB')}
            </h2>
            {isPlatinum && (
                <div className="mt-2 text-xs lg:text-sm text-amber-300 font-mono tracking-widest animate-pulse border-l-2 border-amber-500 pl-2">
                    {t('ACH_PLATINUM_MSG')}
                </div>
            )}
        </div>

        {/* Difficulty Selector (Tab Style) */}
        <div className="mb-8">
            <div className="text-[10px] lg:text-xs text-gray-400 font-mono tracking-widest mb-2 flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                {t('DIFFICULTY')}
            </div>
            <div className="flex gap-1 bg-black/50 p-1 border border-white/10 rounded-sm">
                {Object.values(Difficulty).map(d => (
                    <button 
                        key={d} 
                        onClick={() => { setDifficulty(d); audioManager.playHit(); }}
                        className={`flex-1 py-2 text-[9px] lg:text-[10px] font-bold transition-all uppercase tracking-wider
                        ${difficulty === d 
                            ? 'bg-red-600 text-black shadow-[0_0_10px_rgba(255,0,0,0.5)]' 
                            : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                    >
                        {t(`DIFF_${d}`)}
                    </button>
                ))}
            </div>
        </div>

        {/* Main Actions */}
        <div className="flex flex-col gap-3 lg:gap-4 w-full max-w-md">
            <MenuButton onClick={() => { onStart(); audioManager.startMenuMusic(); }}>
                {t('START')}
            </MenuButton>
            
            <div className="grid grid-cols-2 gap-3">
                <MenuButton variant="secondary" onClick={onControls}>{t('CONTROLS')}</MenuButton>
                <MenuButton variant="secondary" onClick={onManual}>{t('MANUAL')}</MenuButton>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
                <MenuButton variant="secondary" onClick={onSettings}>{t('SETTINGS')}</MenuButton>
                <MenuButton variant="secondary" onClick={onAchievements}>{t('ACHIEVEMENTS')}</MenuButton>
            </div>
        </div>

        {/* Footer / Language */}
        <div className="mt-auto pt-8 flex items-center justify-between border-t border-white/10">
            <div className="flex gap-4">
                {(['EN', 'PT', 'ES'] as Language[]).map(l => (
                    <button 
                        key={l}
                        onClick={() => { setLanguage(l); audioManager.playHit(); }}
                        className={`text-xs font-bold tracking-widest transition-colors ${language === l ? 'text-red-500 underline decoration-2 underline-offset-4' : 'text-gray-600 hover:text-white'}`}
                    >
                        {l}
                    </button>
                ))}
            </div>
            
            <input 
                type="text" 
                value={cheatInput} 
                onChange={onCheatInput}
                placeholder="ACCESS CODE"
                className="bg-transparent border-b border-gray-800 text-right text-[10px] text-gray-600 focus:outline-none focus:border-red-500 w-32 font-mono tracking-widest uppercase focus:text-white transition-all"
            />
        </div>

      </div>
    </div>
  );
};
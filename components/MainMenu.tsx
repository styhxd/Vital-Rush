
import React from 'react';
import { Difficulty, Language } from '../types';
import { TEXTS } from '../constants';
import { audioManager } from '../services/audioManager';

// Duplicamos o MenuButton aqui para garantir isolamento total sem criar dependências circulares
// ou refatorações arriscadas no Game.tsx para os outros menus (Game Over/Wave Cleared).
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

export const MainMenu: React.FC<MainMenuProps> = ({
    isVisible,
    language,
    difficulty,
    isPlatinum,
    cheatInput,
    onStart,
    onControls,
    onManual,
    onSettings,
    onAchievements,
    onLanguageChange,
    onDifficultyChange,
    onCheatInput
}) => {
    if (!isVisible) return null;

    const t = (key: string) => TEXTS[language][key] || key;

    return (
        <div className="absolute inset-0 bg-black flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
          {/* REDUZIDO UM POUCO NO MOBILE (scale-90) */}
          <div className="relative text-center p-6 lg:p-8 max-w-md lg:max-w-md w-full scale-90 lg:scale-100">
            <h1 className={`text-6xl lg:text-9xl font-bold mb-2 lg:mb-2 tracking-tighter mix-blend-screen leading-none ${isPlatinum ? 'text-amber-400 shadow-[0_0_30px_rgba(255,170,0,0.5)]' : 'text-red-600 red-glow'}`} style={{fontFamily: 'Impact, sans-serif'}}>{t('TITLE_MAIN')}</h1>
            <h2 className="text-xl lg:text-5xl font-light text-white mb-4 lg:mb-8 tracking-[0.5em] -mt-1 lg:-mt-2 opacity-80">{t('TITLE_SUB')}</h2>
            
            {isPlatinum && <div className="text-[8px] lg:text-xs tracking-[0.5em] text-purple-400 mb-2 lg:mb-4 animate-pulse">{t('ACH_PLATINUM_MSG')}</div>}

            <div className="mb-4 lg:mb-8">
                <div className="text-[10px] lg:text-xs text-gray-500 tracking-widest mb-1 lg:mb-2">{t('DIFFICULTY')}</div>
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

            <div className="space-y-2 lg:space-y-4">
                <MenuButton onClick={() => { onStart(); audioManager.startMenuMusic(); }}>{t('START')}</MenuButton>
                <div className="grid grid-cols-2 gap-2 lg:gap-4">
                  <MenuButton variant="secondary" onClick={onControls}>{t('CONTROLS')}</MenuButton>
                  <MenuButton variant="secondary" onClick={onManual}>{t('MANUAL')}</MenuButton>
                </div>
                <div className="grid grid-cols-2 gap-2 lg:gap-4">
                  <MenuButton variant="secondary" onClick={onSettings}>{t('SETTINGS')}</MenuButton>
                  <MenuButton variant="secondary" onClick={onAchievements}>{t('ACHIEVEMENTS')}</MenuButton>
                </div>
                
                <div className="flex justify-center gap-2 lg:gap-2 mt-4 lg:mt-6">
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
            
            <div className="mt-6 lg:mt-8">
                <input 
                    type="text" 
                    value={cheatInput} 
                    onChange={onCheatInput}
                    placeholder={t('PH_ACCESS_CODE')}
                    className="bg-transparent border-b border-gray-800 text-center text-[10px] lg:text-xs text-gray-500 focus:outline-none focus:border-red-500 w-full font-mono tracking-widest uppercase"
                />
            </div>
          </div>
        </div>
    );
};

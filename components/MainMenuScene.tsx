
import React, { useState, useEffect } from 'react';
import { Language, Difficulty } from '../types';
import { TEXTS } from '../constants';
import { audioManager } from '../services/audioManager';

// --- ARQUIVOS ESTÁTICOS (RESOLUÇÃO VIA URL RAIZ) ---
// Como as imagens estão na raiz do projeto (public/root), não usamos 'import'.
// Usamos o caminho absoluto do servidor. Isso elimina o erro de "Module Specifier".
const bgImg = "/background.webp";
const vitalImg = "/vital.png";
const virusImg = "/virus.png";

// --- INTERFACE DE PROPS ---
interface MainMenuSceneProps {
    onStart: () => void;
    onSettings: () => void;
    onControls: () => void;
    onManual: () => void;
    onAchievements: () => void;
    setLanguage: (lang: Language) => void;
    setDifficulty: (diff: Difficulty) => void;
    language: Language;
    difficulty: Difficulty;
    isPlatinum: boolean;
    cheatInput: string;
    onCheatInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

// --- COMPONENTE DE IMAGEM SEGURA (FAIL-SAFE) ---
// Tenta carregar a imagem. Se falhar, mostra um diagnóstico visual estiloso.
const SecureImage = ({ src, alt, className, style, animate = false }: any) => {
    const [error, setError] = useState(false);

    if (error) {
        return (
            <div 
                className={`flex items-center justify-center border-2 border-red-500 bg-red-900/50 text-red-500 font-mono text-[10px] p-2 text-center animate-pulse ${className}`}
                style={{...style, minHeight: '100px'}}
            >
                [404]<br/>{alt}
            </div>
        );
    }

    return (
        <img 
            src={src} 
            alt={alt} 
            className={className} 
            style={style}
            onError={(e) => {
                console.error(`[ARCHITECT] Image Load Failed: ${src}`);
                setError(true);
            }} 
        />
    );
};

// --- BOTÃO DO MENU ESTILIZADO ---
const MenuButton = ({ onClick, children, variant = 'primary', selected = false }: any) => {
  const base = "w-full py-3 lg:py-4 font-bold text-xs lg:text-sm tracking-widest uppercase clip-path-polygon transition-all hover:translate-x-2 relative overflow-hidden group text-left px-6";
  let colors = "";
  
  if (variant === 'primary') {
      colors = "bg-red-600 hover:bg-red-500 text-black shadow-[0_0_15px_rgba(255,0,0,0.4)]";
  } else {
      colors = "bg-black/40 hover:bg-white/10 text-white border-l-2 border-white/20 hover:border-white";
  }
  
  return (
    <button onClick={onClick} className={`${base} ${colors}`}>
      <span className="relative z-10">{children}</span>
    </button>
  );
};

export const MainMenuScene: React.FC<MainMenuSceneProps> = ({
    onStart, onSettings, onControls, onManual, onAchievements,
    setLanguage, setDifficulty, language, difficulty, isPlatinum,
    cheatInput, onCheatInput
}) => {
    const t = (key: string) => TEXTS[language][key] || key;

    // CSS INJECTED FOR COMPONENT-SPECIFIC ANIMATIONS
    const menuStyles = `
        @keyframes hero-float {
            0%, 100% { transform: translateY(0) scale(1) skewX(0deg); }
            50% { transform: translateY(-15px) scale(1.02) skewX(-1deg); }
        }
        @keyframes hero-breathe {
            0%, 100% { filter: drop-shadow(0 0 15px rgba(0,255,255,0.3)); }
            50% { filter: drop-shadow(0 0 30px rgba(0,255,255,0.6)) brightness(1.2); }
        }
        @keyframes hero-breathe-plat {
            0%, 100% { filter: drop-shadow(0 0 15px rgba(255,215,0,0.3)); }
            50% { filter: drop-shadow(0 0 30px rgba(255,215,0,0.6)) brightness(1.2); }
        }
        @keyframes virus-orbit {
            0% { transform: translate(0, 0) rotate(0deg); }
            33% { transform: translate(10px, -20px) rotate(120deg); }
            66% { transform: translate(-10px, 10px) rotate(240deg); }
            100% { transform: translate(0, 0) rotate(360deg); }
        }
        .anim-hero { animation: hero-float 6s ease-in-out infinite, ${isPlatinum ? 'hero-breathe-plat' : 'hero-breathe'} 4s ease-in-out infinite; }
        .anim-virus-1 { animation: virus-orbit 20s linear infinite; }
        .anim-virus-2 { animation: virus-orbit 25s linear infinite reverse; }
        .anim-virus-3 { animation: virus-orbit 30s linear infinite; }
    `;

    return (
        <div className="absolute inset-0 z-50 overflow-hidden bg-black font-sans">
            <style>{menuStyles}</style>

            {/* --- LAYER 1: BACKGROUND --- */}
            <div className="absolute inset-0 z-0">
                <SecureImage 
                    src={bgImg} 
                    alt="background.webp" 
                    className="w-full h-full object-cover opacity-60"
                />
                {/* Vignette Overlay para focar no centro/esquerda */}
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent"></div>
            </div>

            {/* --- LAYER 2: VISUALS (RIGHT SIDE) --- */}
            <div className="absolute inset-0 z-10 pointer-events-none">
                {/* VITAL (HERO) */}
                <div className="absolute right-[5%] top-[15%] h-[70%] w-[40%] flex items-center justify-center">
                    <SecureImage 
                        src={vitalImg} 
                        alt="vital.png" 
                        className="h-full w-auto object-contain anim-hero"
                    />
                </div>

                {/* VIRUSES (FLOATING) */}
                {/* Top Right */}
                <div className="absolute right-[10%] top-[10%] w-[100px] opacity-80 anim-virus-1">
                    <SecureImage src={virusImg} alt="virus.png" className="w-full drop-shadow-[0_0_10px_rgba(0,255,0,0.5)]" />
                </div>
                {/* Bottom Center-Right */}
                <div className="absolute right-[40%] bottom-[20%] w-[80px] opacity-60 anim-virus-2 blur-[1px]">
                    <SecureImage src={virusImg} alt="virus.png" className="w-full drop-shadow-[0_0_10px_rgba(255,0,0,0.5)]" />
                </div>
                {/* Far Right Edge */}
                <div className="absolute right-[-2%] top-[50%] w-[150px] opacity-90 anim-virus-3 blur-[2px]">
                    <SecureImage src={virusImg} alt="virus.png" className="w-full drop-shadow-[0_0_15px_rgba(100,255,0,0.5)]" />
                </div>
            </div>

            {/* --- LAYER 3: UI (LEFT SIDE) --- */}
            <div className="absolute inset-y-0 left-0 w-full lg:w-[40%] z-20 flex flex-col justify-center px-8 lg:px-16 bg-gradient-to-r from-black/90 to-transparent">
                
                {/* TITLE BLOCK */}
                <div className="mb-8 lg:mb-12">
                    <h1 className={`text-6xl lg:text-9xl font-black tracking-tighter leading-none italic 
                        ${isPlatinum ? 'text-transparent bg-clip-text bg-gradient-to-br from-amber-300 to-amber-600 drop-shadow-[0_0_20px_rgba(255,170,0,0.5)]' 
                                     : 'text-transparent bg-clip-text bg-gradient-to-br from-red-500 to-red-800 drop-shadow-[0_0_20px_rgba(255,0,0,0.5)]'}`}
                    >
                        {t('TITLE_MAIN')}
                    </h1>
                    <h2 className="text-3xl lg:text-5xl font-light text-white tracking-[0.4em] ml-2 opacity-90">
                        {t('TITLE_SUB')}
                    </h2>
                    {isPlatinum && (
                        <div className="text-xs text-amber-400 tracking-[0.5em] mt-2 ml-2 animate-pulse font-mono">
                            {t('ACH_PLATINUM_MSG')}
                        </div>
                    )}
                </div>

                {/* MENU BUTTONS */}
                <div className="flex flex-col gap-3 w-full max-w-md">
                    <div className="mb-4">
                        <p className="text-[10px] font-mono text-gray-500 tracking-widest mb-2 ml-1">RISK LEVEL</p>
                        <div className="flex gap-1">
                            {Object.values(Difficulty).map(d => (
                                <button 
                                    key={d} 
                                    onClick={() => setDifficulty(d)}
                                    className={`flex-1 py-2 text-[9px] font-bold border transition-all uppercase tracking-wider
                                        ${difficulty === d 
                                            ? 'bg-red-600 text-black border-red-600 shadow-[0_0_10px_red]' 
                                            : 'bg-transparent text-gray-500 border-gray-800 hover:border-gray-500'}`}
                                >
                                    {t(`DIFF_${d}`)}
                                </button>
                            ))}
                        </div>
                    </div>

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

                    {/* LANGUAGE SELECTOR */}
                    <div className="flex gap-4 mt-6 border-t border-white/10 pt-4">
                        {(['EN', 'PT', 'ES'] as Language[]).map(l => (
                            <button 
                                key={l}
                                onClick={() => setLanguage(l)} 
                                className={`text-xs font-bold tracking-widest transition-all
                                    ${language === l ? 'text-white border-b-2 border-red-500' : 'text-gray-600 hover:text-white'}`}
                            >
                                {l}
                            </button>
                        ))}
                    </div>
                </div>

                {/* CHEAT INPUT (Hidden-ish) */}
                <div className="absolute bottom-8 left-8 lg:left-16 w-64 opacity-30 hover:opacity-100 transition-opacity">
                    <input 
                        type="text" 
                        value={cheatInput} 
                        onChange={onCheatInput}
                        placeholder="ACCESS CODE"
                        className="bg-transparent border-b border-gray-700 text-[10px] text-white/50 w-full focus:outline-none focus:border-red-500 font-mono"
                    />
                </div>
            </div>
        </div>
    );
};

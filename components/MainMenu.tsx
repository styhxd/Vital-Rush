import React, { useMemo } from 'react';
import { Difficulty, Language } from '../types';
import { TEXTS } from '../constants';
import { audioManager } from '../services/audioManager';

// FIX: Uso de caminhos relativos (../src/assets/) para garantir compatibilidade
// e evitar erros de "bare module specifier" no navegador.
import bgImg from '../src/assets/background.webp';
import vitalImg from '../src/assets/vital.png';
import virusImg from '../src/assets/virus.png';

// Botão reutilizável (Mantido local para isolamento)
const MenuButton = ({ onClick, children, variant = 'primary', selected = false }: any) => {
    const base = "w-full py-3 lg:py-4 font-bold text-xs lg:text-xl tracking-widest uppercase clip-path-polygon transition-all hover:translate-x-2 shadow-[0_0_10px_rgba(0,0,0,0.4)] relative overflow-hidden group text-left px-6 border-l-4";
    let colors = "";
    
    if (variant === 'primary') {
        colors = "bg-gradient-to-r from-red-900/80 to-transparent border-red-500 text-white hover:border-red-400 hover:from-red-800/80";
    } else if (variant === 'secondary') {
        colors = selected 
          ? "bg-gradient-to-r from-white/20 to-transparent border-white text-white"
          : "bg-gradient-to-r from-gray-900/50 to-transparent border-gray-700 text-gray-400 hover:text-white hover:border-white/50";
    }
    
    return (
      <button onClick={onClick} className={`${base} ${colors}`} style={{clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0% 100%)'}}>
        <span className="relative z-10 drop-shadow-md">{children}</span>
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

    // Gerar posições aleatórias para os vírus flutuantes (Memoizado para não pular a cada render)
    const floatingViruses = useMemo(() => {
        return Array.from({ length: 5 }).map((_, i) => ({
            id: i,
            top: `${Math.random() * 80 + 10}%`,
            left: `${Math.random() * 40 + 50}%`, // Apenas no lado direito
            size: Math.random() * 60 + 40,
            delay: Math.random() * 5,
            duration: Math.random() * 3 + 4
        }));
    }, []);

    return (
        <div className="absolute inset-0 z-50 overflow-hidden bg-black">
            {/* --- CSS INLINE PARA ANIMAÇÕES ESPECÍFICAS --- */}
            <style>{`
                @keyframes organic-breathe {
                    0%, 100% { transform: scale(1) rotate(0deg); filter: drop-shadow(0 0 15px rgba(0, 255, 255, 0.3)); }
                    50% { transform: scale(1.03, 0.97) rotate(1deg); filter: drop-shadow(0 0 25px rgba(0, 255, 255, 0.6)); }
                }
                @keyframes float-virus {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    50% { transform: translateY(-20px) rotate(10deg); }
                }
                @keyframes dust-particles {
                    0% { transform: translateY(0); opacity: 0; }
                    50% { opacity: 0.5; }
                    100% { transform: translateY(-100px); opacity: 0; }
                }
                .anim-vital {
                    animation: organic-breathe 6s ease-in-out infinite;
                }
                .anim-virus {
                    animation: float-virus 5s ease-in-out infinite;
                }
            `}</style>

            {/* --- BACKGROUND IMAGE --- */}
            <div 
                className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-1000"
                style={{ 
                    backgroundImage: `url(${bgImg})`,
                    filter: 'brightness(0.6) contrast(1.1)' 
                }}
            ></div>
            
            {/* Overlay Gradiente para legibilidade do menu à esquerda */}
            <div className="absolute inset-0 z-0 bg-gradient-to-r from-black via-black/80 to-transparent"></div>

            {/* Scanlines Effect */}
            <div className="absolute inset-0 z-[1] opacity-20 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]"></div>

            {/* --- VISUAL LAYER (RIGHT SIDE) --- */}
            <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
                {/* VÍRUS FLUTUANTES (Fundo) */}
                {floatingViruses.map((v) => (
                    <img 
                        key={v.id}
                        src={virusImg}
                        alt="virus"
                        className="absolute opacity-60 anim-virus"
                        style={{
                            top: v.top,
                            left: v.left,
                            width: `${v.size}px`,
                            animationDelay: `${v.delay}s`,
                            animationDuration: `${v.duration}s`,
                            filter: 'drop-shadow(0 0 10px rgba(100, 0, 100, 0.5)) blur(1px)'
                        }}
                    />
                ))}

                {/* PERSONAGEM PRINCIPAL (VITAL) */}
                <div className="absolute right-[-5%] bottom-[-5%] h-[85vh] w-[85vh] lg:h-[95vh] lg:w-[95vh] flex items-end justify-end transition-all duration-500">
                    <img 
                        src={vitalImg} 
                        alt="Vital Character" 
                        className="w-full h-full object-contain object-bottom anim-vital"
                        style={{
                            // Efeito extra de iluminação no CSS inline
                            maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)' 
                        }}
                    />
                </div>
            </div>

            {/* --- UI LAYER (LEFT SIDE) --- */}
            <div className="absolute inset-y-0 left-0 z-20 w-full lg:w-[45%] flex flex-col justify-center px-8 lg:px-16 py-12">
                
                {/* TÍTULO */}
                <div className="mb-8 lg:mb-12 relative">
                    <h1 className={`text-6xl lg:text-9xl font-black tracking-tighter leading-none italic transform -skew-x-6 
                        ${isPlatinum 
                            ? 'text-transparent bg-clip-text bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-700 drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]' 
                            : 'text-white drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]'}`}
                    >
                        VITAL
                        <br />
                        <span className={isPlatinum ? 'text-white' : 'text-red-600'}>RUSH</span>
                    </h1>
                    <div className="h-2 w-32 bg-current mt-2 skew-x-[-20deg]" style={{ color: isPlatinum ? '#fbbf24' : '#dc2626' }}></div>
                    
                    {isPlatinum && (
                        <div className="absolute top-0 right-0 text-[10px] text-purple-400 border border-purple-500 px-2 py-1 bg-black/80 tracking-widest animate-pulse">
                            APEX MODE ACTIVE
                        </div>
                    )}
                </div>

                {/* BOTÕES PRINCIPAIS */}
                <div className="flex flex-col gap-4 w-full max-w-md">
                    <MenuButton onClick={() => { onStart(); audioManager.startMenuMusic(); }} variant="primary">
                        <div className="flex items-center gap-4">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            {t('START')}
                        </div>
                    </MenuButton>

                    <div className="grid grid-cols-2 gap-4">
                        <MenuButton variant="secondary" onClick={onControls}>{t('CONTROLS')}</MenuButton>
                        <MenuButton variant="secondary" onClick={onManual}>{t('MANUAL')}</MenuButton>
                        <MenuButton variant="secondary" onClick={onSettings}>{t('SETTINGS')}</MenuButton>
                        <MenuButton variant="secondary" onClick={onAchievements}>{t('ACHIEVEMENTS')}</MenuButton>
                    </div>
                </div>

                {/* SELETORES DE RODAPÉ */}
                <div className="mt-12 space-y-6 max-w-md">
                    {/* DIFICULDADE */}
                    <div>
                        <div className="text-[10px] text-gray-500 tracking-[0.2em] mb-2 uppercase border-b border-gray-800 pb-1 w-full">
                            {t('DIFFICULTY')}
                        </div>
                        <div className="flex gap-2">
                            {Object.values(Difficulty).map(d => (
                                <button 
                                    key={d} 
                                    onClick={() => onDifficultyChange(d)}
                                    className={`flex-1 text-[9px] font-bold py-2 border border-l-4 transition-all uppercase text-center
                                    ${difficulty === d 
                                        ? 'bg-white/10 border-red-500 text-white' 
                                        : 'bg-transparent border-gray-800 text-gray-600 hover:border-gray-600'}`}
                                >
                                    {t(`DIFF_${d}`)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* IDIOMA */}
                    <div className="flex items-center gap-4">
                        <div className="text-[10px] text-gray-500 tracking-[0.2em] uppercase">
                            {t('LANG')} //
                        </div>
                        <div className="flex gap-2">
                            {(['EN', 'PT', 'ES'] as Language[]).map(l => (
                                <button 
                                    key={l}
                                    onClick={() => onLanguageChange(l)} 
                                    className={`text-[10px] font-bold px-3 py-1 transition-all
                                        ${language === l 
                                            ? 'bg-red-600 text-black' 
                                            : 'text-gray-600 hover:text-white'}`}
                                >
                                    {l}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* CHEAT INPUT */}
                    <div className="pt-4 border-t border-gray-900">
                        <input 
                            type="text" 
                            value={cheatInput} 
                            onChange={onCheatInput}
                            placeholder={t('PH_ACCESS_CODE')}
                            className="w-full bg-transparent text-[10px] text-gray-600 focus:text-red-500 placeholder-gray-800 focus:outline-none tracking-[0.5em] text-center uppercase transition-colors"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

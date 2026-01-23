

import React, { useState, useEffect } from 'react';
import { Difficulty, Language } from '../types';
import { TEXTS } from '../constants';
import { audioManager } from '../services/audioManager';

// --- ASSETS CONFIGURATION ---
// Links atualizados conforme solicitação do usuário
const ASSETS = {
    BG: "https://drive.google.com/file/d/1i4NAyU7cvCCdQP-P0PPFlYWiOxtzu2lG/view?usp=sharing",
    HERO: "https://drive.google.com/file/d/1_8HXUSoXuVXtjb33hb_uRZ1hvOn7VItc/view?usp=sharing",
    VIRUS: "https://drive.google.com/file/d/187XZfpHZ1eTC50lflWK_wD6z20AFLUUt/view?usp=sharing"
};

// --- SUB-COMPONENTS ---

const MenuButton = ({ onClick, children, variant = 'primary', selected = false }: any) => {
    // ARQUITETO: Reduzido py-2.5 para py-2 e text-xs para text-[10px] no mobile para ganhar espaço vertical
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
    
    const [graphicMode, setGraphicMode] = useState(false);
    
    const [resolvedBg, setResolvedBg] = useState<string | null>(null);
    const [resolvedHero, setResolvedHero] = useState<string | null>(null);
    const [resolvedVirus, setResolvedVirus] = useState<string | null>(null);

    // --- PROTOCOLO DE RESOLUÇÃO EM CASCATA V5.0 ---
    useEffect(() => {
        let isMounted = true;

        // 1. Extração Cirúrgica do ID
        const getDriveId = (url: string) => {
            const matchFile = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (matchFile) return matchFile[1];
            const matchParam = url.match(/id=([a-zA-Z0-9_-]+)/);
            if (matchParam) return matchParam[1];
            return null;
        };

        // 2. Teste de Carga de Imagem
        const tryLoad = (url: string): Promise<string> => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.referrerPolicy = "no-referrer";
                img.src = url;
                img.onload = () => resolve(url);
                img.onerror = () => reject(url);
            });
        };

        // 3. O Waterfall (Tentativa Sequencial)
        const resolveUrl = async (rawUrl: string, assetName: string): Promise<string> => {
            const id = getDriveId(rawUrl);
            
            // Lista de Candidatos (Estratégias de Ataque)
            const candidates = [
                // Opção 0: Do jeito que veio (Provavelmente falha em <img>, mas solicitado)
                rawUrl, 
                // Opção 1: LH3 CDN (Rápido, cacheado pelo Google)
                id ? `https://lh3.googleusercontent.com/d/${id}` : null,
                // Opção 2: Export View Padrão
                id ? `https://drive.google.com/uc?export=view&id=${id}` : null,
                // Opção 3: Thumbnail de Alta Resolução (Hack de largura de banda)
                id ? `https://drive.google.com/thumbnail?id=${id}&sz=w1920` : null,
                // Opção 4: Download Stream Direto
                id ? `https://drive.usercontent.google.com/download?id=${id}&export=download` : null
            ].filter(Boolean) as string[];

            for (let i = 0; i < candidates.length; i++) {
                try {
                    console.log(`[Vital Rush] Trying ${assetName} strategy ${i+1}: ${candidates[i]}`);
                    const validUrl = await tryLoad(candidates[i]);
                    console.log(`[Vital Rush] Success on strategy ${i+1} for ${assetName}!`);
                    return validUrl;
                } catch (e) {
                    continue; // Falhou, tenta o próximo
                }
            }
            throw new Error(`All strategies failed for ${assetName}`);
        };

        // Inicia o processo para o Background (Prioridade Crítica)
        resolveUrl(ASSETS.BG, "Background")
            .then(url => {
                if (!isMounted) return;
                setResolvedBg(url);
                setGraphicMode(true); // Ativa o modo gráfico assim que o BG vive

                // Carrega os secundários em paralelo
                resolveUrl(ASSETS.HERO, "Hero").then(u => isMounted && setResolvedHero(u)).catch(() => {});
                resolveUrl(ASSETS.VIRUS, "Virus").then(u => isMounted && setResolvedVirus(u)).catch(() => {});
            })
            .catch((e) => {
                if (!isMounted) return;
                console.warn("[Vital Rush] Critical Asset Failure. Fallback to Classic Mode active.");
                setGraphicMode(false);
            });

        return () => { isMounted = false; };
    }, []);

    if (!isVisible) return null;

    return (
        <div className="absolute inset-0 bg-black flex items-center justify-center z-50 overflow-hidden">
            <style>{`
                /* ANIMAÇÕES DE LOOP (JÁ EXISTENTES) */
                @keyframes vital-breath {
                    0%, 100% { transform: scale(1, 1) translateY(0); }
                    50% { transform: scale(1.02, 0.98) translateY(5px); }
                }
                @keyframes virus-float {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    50% { transform: translateY(-20px) rotate(5deg); }
                }
                
                /* NOVAS ANIMAÇÕES DE ENTRADA CINEMÁTICA */
                @keyframes reveal-vein {
                    0% { 
                        opacity: 0; 
                        transform: scale(1.2); 
                        filter: brightness(0) sepia(1) hue-rotate(-50deg) saturate(5); /* Vermelho Escuro/Preto */
                    }
                    40% {
                        opacity: 1;
                        filter: brightness(0.5) sepia(0.5) hue-rotate(-50deg) saturate(3);
                    }
                    100% { 
                        opacity: 1; 
                        transform: scale(1); 
                        filter: brightness(1) sepia(0) hue-rotate(0) saturate(1); 
                    }
                }

                @keyframes hero-arrival {
                    0% { 
                        opacity: 0; 
                        transform: translate(100px, 100px) scale(0.8); 
                        filter: blur(20px) grayscale(1);
                    }
                    100% { 
                        opacity: 1; 
                        transform: translate(0, 0) scale(1); 
                        filter: blur(0) grayscale(0);
                    }
                }

                @keyframes virus-spawn {
                    0% { 
                        opacity: 0; 
                        transform: scale(0); 
                    }
                    60% {
                        transform: scale(1.2);
                    }
                    100% { 
                        opacity: 1; 
                        transform: scale(1); 
                    }
                }

                @keyframes menu-slide-in {
                    0% { 
                        opacity: 0; 
                        transform: translateX(-50px); 
                        filter: blur(5px);
                    }
                    100% { 
                        opacity: 1; 
                        transform: translateX(0); 
                        filter: blur(0);
                    }
                }

                /* CLASSES DE UTILITÁRIO */
                .anim-vital { animation: vital-breath 4s ease-in-out infinite; }
                .anim-float-1 { animation: virus-float 5s ease-in-out infinite; }
                .anim-float-2 { animation: virus-float 7s ease-in-out infinite; animation-delay: 1s; }
                .anim-float-3 { animation: virus-float 6s ease-in-out infinite; animation-delay: 2s; }

                /* CLASSES DE ENTRADA */
                .entry-vein { animation: reveal-vein 2s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
                .entry-hero { animation: hero-arrival 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: 0.5s; opacity: 0; }
                .entry-virus { animation: virus-spawn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; opacity: 0; }
                .entry-menu { animation: menu-slide-in 1s cubic-bezier(0.22, 1, 0.36, 1) forwards; animation-delay: 0.5s; opacity: 0; }
            `}</style>

            {graphicMode && resolvedBg ? (
                // --- GRAPHIC MODE (RESOLVED) ---
                <div className="absolute inset-0 w-full h-full">
                    {/* Background Layer - VEIA HUMANA */}
                    <div 
                        className="absolute inset-0 bg-cover bg-center z-0 entry-vein"
                        style={{ backgroundImage: `url(${resolvedBg})` }}
                    />
                    
                    {/* Gradient Overlay (para legibilidade) */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent z-10 animate-[fadeIn_2s_ease-out]"></div>

                    {/* VIRUSES LAYER (Conditional) */}
                    {resolvedVirus && (
                        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
                            {/* Vírus 1 - Top Right */}
                            <div className="absolute top-[20%] right-[30%] entry-virus" style={{ animationDelay: '1.2s' }}>
                                <img 
                                    src={resolvedVirus} 
                                    referrerPolicy="no-referrer"
                                    alt="virus"
                                    className="w-24 lg:w-48 opacity-80 anim-float-1 drop-shadow-[0_0_15px_rgba(0,255,0,0.5)]"
                                />
                            </div>
                            
                            {/* Vírus 2 - Bottom Right */}
                            <div className="absolute bottom-[30%] right-[10%] entry-virus" style={{ animationDelay: '1.5s' }}>
                                <img 
                                    src={resolvedVirus} 
                                    referrerPolicy="no-referrer"
                                    alt="virus"
                                    className="w-16 lg:w-32 opacity-60 anim-float-2 drop-shadow-[0_0_15px_rgba(0,255,0,0.5)] blur-[1px]"
                                />
                            </div>

                            {/* Vírus 3 - Top Far Right */}
                            <div className="absolute top-[10%] right-[10%] entry-virus" style={{ animationDelay: '1.8s' }}>
                                <img 
                                    src={resolvedVirus} 
                                    referrerPolicy="no-referrer"
                                    alt="virus"
                                    className="w-32 lg:w-64 opacity-40 anim-float-3 drop-shadow-[0_0_15px_rgba(0,255,0,0.5)] blur-[2px]"
                                />
                            </div>
                        </div>
                    )}

                    {/* HERO LAYER (Conditional) - ROBÔ AZUL */}
                    {resolvedHero && (
                        <div className="absolute right-[-5%] lg:right-[5%] bottom-[-5%] h-[70%] lg:h-[90%] z-20 pointer-events-none flex items-end justify-end entry-hero">
                             <img 
                                src={resolvedHero} 
                                referrerPolicy="no-referrer"
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

                    {/* MENU CONTAINER (Left Aligned) - ARQUITETO: Padding reduzido de p-6 para p-4 no mobile */}
                    <div className="absolute left-0 top-0 h-full w-full lg:w-[45%] z-30 flex flex-col justify-center p-4 lg:p-16 scale-90 lg:scale-100 origin-left entry-menu">
                        <MenuContent {...props} align="left" />
                    </div>
                </div>
            ) : (
                // --- CLASSIC MODE (FALLBACK) ---
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                    {/* Fallback scaled down even more for safety */}
                    <div className="relative text-center p-6 lg:p-8 max-w-md lg:max-w-md w-full scale-75 lg:scale-100">
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
            {/* ARQUITETO: Redução de text-6xl para text-5xl no mobile */}
            <h1 
                className={`text-5xl lg:text-9xl font-bold mb-0 lg:mb-0 tracking-tighter mix-blend-screen leading-none 
                ${isPlatinum ? 'text-amber-400 shadow-[0_0_30px_rgba(255,170,0,0.5)]' : 'text-red-600 red-glow'}`} 
                style={{fontFamily: 'Impact, sans-serif'}}
            >
                {t('TITLE_MAIN')}
            </h1>
            
            {/* ARQUITETO: Redução de margem inferior de mb-4 para mb-2 */}
            <h2 className={`text-lg lg:text-5xl font-light text-white mb-2 lg:mb-8 tracking-[0.5em] -mt-1 lg:-mt-2 opacity-80 ${isLeft ? 'ml-1' : ''}`}>
                {t('TITLE_SUB')}
            </h2>
            
            {isPlatinum && <div className="text-[8px] lg:text-xs tracking-[0.5em] text-purple-400 mb-1 lg:mb-4 animate-pulse">{t('ACH_PLATINUM_MSG')}</div>}

            {/* ARQUITETO: Compactação de margens (mb-2 vs mb-4) */}
            <div className={`mb-2 lg:mb-8 w-full ${isLeft ? 'max-w-md' : ''}`}>
                <div className={`text-[10px] lg:text-xs text-gray-500 tracking-widest mb-0.5 lg:mb-2 ${isLeft ? 'text-left' : 'text-center'}`}>{t('DIFFICULTY')}</div>
                <div className="grid grid-cols-4 gap-1.5 lg:gap-2">
                    {Object.values(Difficulty).map(d => (
                        <button 
                            key={d} 
                            onClick={() => onDifficultyChange(d)}
                            // ARQUITETO: Reduzido py-1.5 para py-1 no mobile
                            className={`text-[9px] lg:text-[10px] font-bold py-1 lg:py-2 border transition-all ${difficulty === d ? 'bg-red-600 text-black border-red-600' : 'bg-transparent text-gray-500 border-gray-800'}`}
                        >
                            {t(`DIFF_${d}`)}
                        </button>
                    ))}
                </div>
            </div>

            {/* ARQUITETO: Compactação de espaçamento (space-y-1.5 vs space-y-2) */}
            <div className={`space-y-1.5 lg:space-y-4 w-full ${isLeft ? 'max-w-md' : ''}`}>
                <MenuButton onClick={() => { onStart(); audioManager.startMenuMusic(); }}>{t('START')}</MenuButton>
                <div className="grid grid-cols-2 gap-2 lg:gap-4">
                  <MenuButton variant="secondary" onClick={onControls}>{t('CONTROLS')}</MenuButton>
                  <MenuButton variant="secondary" onClick={onManual}>{t('MANUAL')}</MenuButton>
                </div>
                <div className="grid grid-cols-2 gap-2 lg:gap-4">
                  <MenuButton variant="secondary" onClick={onSettings}>{t('SETTINGS')}</MenuButton>
                  <MenuButton variant="secondary" onClick={onAchievements}>{t('ACHIEVEMENTS')}</MenuButton>
                </div>
                
                {/* ARQUITETO: Compactação de margem mt-2 vs mt-4 */}
                <div className={`flex gap-2 lg:gap-2 mt-2 lg:mt-6 ${isLeft ? 'justify-start' : 'justify-center'}`}>
                    {(['EN', 'PT', 'ES'] as Language[]).map(l => (
                      <button 
                        key={l}
                        onClick={() => onLanguageChange(l)} 
                        // ARQUITETO: Reduzido py-1.5 para py-1 no mobile
                        className={`text-[10px] lg:text-sm font-bold tracking-widest px-3 lg:px-3 py-1 lg:py-2 border-b-2 transition-all flex items-center gap-2
                            ${language === l 
                                ? 'text-white border-red-500 bg-red-900/20' 
                                : 'text-gray-600 border-transparent hover:text-gray-400'}`}
                      >
                        {l}
                      </button>
                    ))}
                </div>
            </div>
            
            {/* ARQUITETO: Compactação de margem mt-2 vs mt-6 */}
            <div className={`mt-2 lg:mt-8 w-full ${isLeft ? 'max-w-md' : ''}`}>
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

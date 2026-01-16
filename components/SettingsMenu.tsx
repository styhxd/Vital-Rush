import React, { useState, useEffect } from 'react';
import { TEXTS } from '../constants';
import { Language } from '../types';
import { audioManager } from '../services/audioManager';

interface SettingsMenuProps {
    isVisible: boolean;
    language: Language;
    audioSettings: { master: number; music: number; sfx: number };
    onUpdateAudio: (type: 'master' | 'music' | 'sfx', val: number) => void;
    onLanguageChange: (lang: Language) => void;
    onSystemPurge: () => void; // New Prop for soft reset
    onClose: () => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ 
    isVisible, 
    language, 
    audioSettings, 
    onUpdateAudio, 
    onLanguageChange,
    onSystemPurge,
    onClose 
}) => {
    // FAILSAFE 1: Verificação lógica de entrada
    if (!isVisible) return null;

    const t = (key: string) => TEXTS[language][key] || key;
    
    // State para o "Hold to Confirm" do reset
    const [resetStage, setResetStage] = useState(0); 
    // State para o CRT/Scanlines (lê do body para persistência visual durante a sessão)
    const [crtEnabled, setCrtEnabled] = useState(!document.body.classList.contains('force-clean-vision'));

    // Efeito para injetar o CSS global que controla as scanlines sem precisar passar props pro Game.tsx
    useEffect(() => {
        const styleId = 'settings-override-style';
        let style = document.getElementById(styleId);
        if (!style) {
            style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
                .force-clean-vision .scanlines,
                .force-clean-vision .vignette { 
                    opacity: 0 !important; 
                    transition: opacity 0.5s ease;
                }
            `;
            document.head.appendChild(style);
        }
    }, []);

    const toggleCrt = () => {
        const newState = !crtEnabled;
        setCrtEnabled(newState);
        if (!newState) {
            document.body.classList.add('force-clean-vision');
            audioManager.playShoot(); // Feedback sonoro
        } else {
            document.body.classList.remove('force-clean-vision');
            audioManager.playPowerUp(); // Feedback sonoro
        }
    };

    const handleReset = () => {
        if (resetStage === 0) {
            setResetStage(1);
            audioManager.playHit();
            setTimeout(() => setResetStage(0), 3000); // Reseta o botão se não confirmar
        } else {
            // EXECUTE ORDER 66 - SOFT RESET
            audioManager.playExplosion();
            onSystemPurge(); // Chama a função do pai para resetar o estado React
            setResetStage(0);
        }
    };

    // Componente interno para o Slider Holográfico
    const HoloSlider = ({ label, value, onChange }: { label: string, value: number, onChange: (val: number) => void }) => {
        const percentage = Math.round(value * 100);
        return (
            <div className="mb-2 lg:mb-6">
                <div className="flex justify-between text-[8px] lg:text-xs font-mono text-cyan-400 mb-0.5 lg:mb-1 tracking-widest">
                    <span>{label}</span>
                    <span>{percentage}%</span>
                </div>
                <div className="relative h-3 lg:h-6 w-full bg-black/50 border border-cyan-900/50 skew-x-[-10deg] flex items-center px-1 cursor-pointer group">
                    <input 
                        type="range" 
                        min="0" max="1" step="0.1" 
                        value={value} 
                        onChange={(e) => onChange(parseFloat(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"
                    />
                    {/* Visualização de Barras Segmentadas */}
                    <div className="flex gap-0.5 lg:gap-1 w-full h-1.5 lg:h-3 z-10 pointer-events-none">
                        {Array.from({ length: 20 }).map((_, i) => {
                            const active = (i / 20) < value;
                            return (
                                <div 
                                    key={i} 
                                    className={`flex-1 transition-all duration-300 ${active ? 'bg-cyan-500 shadow-[0_0_5px_cyan]' : 'bg-cyan-900/20'} 
                                    ${active && (i / 20) > 0.8 ? 'bg-red-500 shadow-[0_0_5px_red]' : ''}`}
                                ></div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    return (
        // FAILSAFE 2: Z-Index 110 (Acima do Pause que é 100) e Position Fixed
        <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex items-center justify-center animate-in fade-in zoom-in duration-300">
            {/* Background Grid Decorativo */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>

            <div className="w-full max-w-sm lg:max-w-lg p-1 border-y-2 border-cyan-500 bg-[#050b14] relative shadow-[0_0_100px_rgba(0,255,255,0.1)]">
                <div className="p-3 lg:p-10 relative overflow-hidden flex flex-col max-h-[90vh] overflow-y-auto custom-scroll">
                    
                    {/* Header */}
                    <h2 className="text-lg lg:text-3xl font-bold text-center text-cyan-400 tracking-[0.3em] mb-2 lg:mb-8 border-b border-cyan-800 pb-2 lg:pb-4">
                        {t('SETTINGS')}
                        <span className="block text-[6px] lg:text-[10px] text-gray-500 font-mono mt-0.5 lg:mt-1 tracking-normal">SYS.CONFIG.V4.6</span>
                    </h2>

                    {/* Audio Section */}
                    <div className="mb-2 lg:mb-8">
                        <h3 className="text-[8px] lg:text-xs font-mono text-gray-500 mb-1 lg:mb-4 border-l-2 border-cyan-500 pl-2">AUDIO PROTOCOLS</h3>
                        <HoloSlider 
                            label="MASTER OUTPUT" 
                            value={audioSettings.master} 
                            onChange={(v) => onUpdateAudio('master', v)} 
                        />
                        <HoloSlider 
                            label="MUSIC STREAM" 
                            value={audioSettings.music} 
                            onChange={(v) => onUpdateAudio('music', v)} 
                        />
                        <HoloSlider 
                            label="SFX FEEDBACK" 
                            value={audioSettings.sfx} 
                            onChange={(v) => onUpdateAudio('sfx', v)} 
                        />
                    </div>

                    {/* Visual Section (SURPRESA 1: Retro Optics) */}
                    <div className="mb-2 lg:mb-8">
                        <h3 className="text-[8px] lg:text-xs font-mono text-gray-500 mb-1 lg:mb-4 border-l-2 border-cyan-500 pl-2">VISUAL OPTICS</h3>
                        <div className="flex items-center justify-between bg-white/5 p-1.5 lg:p-4 border border-white/10">
                            <div className="flex flex-col">
                                <span className="text-[8px] lg:text-sm font-bold text-white tracking-widest">RETRO FILTER</span>
                                <span className="text-[6px] lg:text-[10px] text-gray-400">CRT SCANLINES & VIGNETTE</span>
                            </div>
                            <button 
                                onClick={toggleCrt}
                                className={`w-10 h-5 lg:w-16 lg:h-8 rounded-full relative transition-all duration-300 ${crtEnabled ? 'bg-cyan-900/80 border border-cyan-500' : 'bg-gray-800 border border-gray-600'}`}
                            >
                                <div className={`absolute top-0.5 bottom-0.5 w-4 lg:w-6 bg-white rounded-full transition-all duration-300 shadow-[0_0_10px_white] ${crtEnabled ? 'left-5 lg:left-8 bg-cyan-400' : 'left-0.5 bg-gray-500'}`}></div>
                            </button>
                        </div>
                    </div>

                    {/* Language Section */}
                    <div className="mb-2 lg:mb-8">
                        <h3 className="text-[8px] lg:text-xs font-mono text-gray-500 mb-1 lg:mb-4 border-l-2 border-cyan-500 pl-2">{t('LANG')}</h3>
                        <div className="flex gap-2">
                            {(['EN', 'PT', 'ES'] as Language[]).map(l => (
                                <button 
                                    key={l}
                                    onClick={() => onLanguageChange(l)}
                                    className={`flex-1 py-1.5 lg:py-3 font-bold text-[8px] lg:text-xs tracking-widest border transition-all duration-300 flex items-center justify-center gap-2
                                    ${language === l 
                                        ? 'bg-cyan-600 text-black border-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.4)]' 
                                        : 'bg-black/40 text-cyan-700 border-cyan-900/50 hover:bg-cyan-900/20'}`}
                                >
                                    {l}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Surpresa 2: SYSTEM PURGE (Data Reset) */}
                    <div className="mb-2 lg:mb-6 border-t border-red-900/30 pt-2 lg:pt-6">
                        <button 
                            onClick={handleReset}
                            className={`w-full py-1.5 lg:py-4 border font-mono text-[8px] lg:text-xs tracking-[0.2em] transition-all relative overflow-hidden group
                                ${resetStage === 1 
                                    ? 'bg-red-600 text-black border-red-500 animate-pulse' 
                                    : 'bg-red-950/20 text-red-500 border-red-900/50 hover:bg-red-900/40'}`}
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {resetStage === 1 ? '⚠️ CONFIRM PURGE? ⚠️' : 'SYSTEM PURGE (RESET DATA)'}
                            </span>
                            {/* Barra de progresso visual para o reset */}
                            <div className={`absolute bottom-0 left-0 h-1 bg-red-500 transition-all duration-[3000ms] ease-linear ${resetStage === 1 ? 'w-full' : 'w-0'}`}></div>
                        </button>
                    </div>

                    {/* Footer Actions */}
                    <button 
                        onClick={onClose}
                        className="w-full py-2 lg:py-4 bg-cyan-600 hover:bg-cyan-500 text-black font-bold tracking-[0.2em] text-[10px] lg:text-base transition-all shadow-[0_0_20px_rgba(0,255,255,0.3)] hover:scale-[1.02]"
                    >
                        {t('BACK')}
                    </button>

                </div>
            </div>
        </div>
    );
};
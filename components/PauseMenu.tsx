import React from 'react';
import { TEXTS } from '../constants';
import { Language, GameState } from '../types';

interface PauseMenuProps {
    isPaused: boolean;
    language: Language;
    gameState: GameState; // NEW: Receives current game state
    onResume: () => void;
    onSettings: () => void;
    onQuit: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({ isPaused, language, gameState, onResume, onSettings, onQuit }) => {
    // FAILSAFE 1: Verificação lógica dupla. 
    // Se não estiver pausado, OU se estivermos no menu de LOADOUT/SETTINGS, não mostra o menu de pausa padrão.
    if (!isPaused || gameState === GameState.LOADOUT || gameState === GameState.SETTINGS) return null;

    const t = (key: string) => TEXTS[language][key] || key;

    return (
        // FAILSAFE 2: Z-Index 100 absoluto. SettingsMenu terá 110, Loadout 120.
        <div 
            className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
        >
            <div className="flex flex-col gap-3 min-w-[300px] max-w-sm w-full border-y-2 border-cyan-500 p-8 bg-[#0a0a1a] shadow-[0_0_50px_rgba(0,255,255,0.15)] relative">
                
                {/* Linhas decorativas do sistema */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>

                <h2 className="text-4xl text-cyan-400 font-bold text-center tracking-[0.3em] mb-4 text-glow border-b border-cyan-900/50 pb-4">
                    {t('PAUSED')}
                </h2>
                
                <button 
                    onClick={(e) => { e.stopPropagation(); onResume(); }}
                    className="w-full py-4 bg-cyan-900/20 border border-cyan-500/50 hover:bg-cyan-500 hover:text-black text-cyan-100 font-bold tracking-widest transition-all uppercase group relative overflow-hidden"
                >
                    <span className="relative z-10">{t('RESUME')}</span>
                    <div className="absolute inset-0 bg-cyan-400/20 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300"></div>
                </button>

                <button 
                    onClick={(e) => { e.stopPropagation(); onSettings(); }}
                    className="w-full py-4 bg-cyan-900/10 border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-200 font-bold tracking-widest transition-all uppercase group relative overflow-hidden"
                >
                    <span className="relative z-10">{t('SETTINGS')}</span>
                    <div className="absolute inset-0 bg-cyan-400/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300"></div>
                </button>
                
                <button 
                    onClick={(e) => { e.stopPropagation(); onQuit(); }}
                    className="w-full py-4 bg-red-900/10 border border-red-500/30 hover:bg-red-600 hover:text-black text-red-400 font-bold tracking-widest transition-all uppercase mt-2 group relative overflow-hidden"
                >
                    <span className="relative z-10">{t('ABORT')}</span>
                    <div className="absolute inset-0 bg-red-500/20 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300"></div>
                </button>

                <div className="mt-4 text-[10px] text-cyan-500/30 font-mono text-center tracking-widest">
                    SYSTEM HALTED // WAITING INPUT
                </div>
            </div>
        </div>
    );
};
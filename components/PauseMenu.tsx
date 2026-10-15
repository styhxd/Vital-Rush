import React from 'react';
import { TEXTS } from '../constants';
import { Language, GameState } from '../types';
import { motionClass, useScreenPresence } from './screenPresence';

interface PauseMenuProps {
    isPaused: boolean;
    language: Language;
    isPlatinum?: boolean;
    gameState: GameState;
    onResume: () => void;
    onSettings: () => void;
    onQuit: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({ isPaused, language, isPlatinum, gameState, onResume, onSettings, onQuit }) => {
    const show = isPaused && gameState !== GameState.LOADOUT && gameState !== GameState.SETTINGS;
    const present = useScreenPresence(show);
    if (!present.alive) return null;

    const t = (key: string) => TEXTS[language][key] || key;
    const ink = isPlatinum ? '#7c4a12' : '#7f1d1d';
    const band = isPlatinum ? '#b45309' : '#b91c1c';

    return (
        <div
            className={`absolute inset-0 z-[100] flex items-center justify-center p-4 ${motionClass(present.phase)}`}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
        >
            <div className="absolute inset-0 bg-black/55" />
            <article
                className="relative w-full max-w-md shadow-[0_24px_70px_rgba(0,0,0,0.55)]"
                style={{ background: 'linear-gradient(180deg, #f8f1e3 0%, #f3e6d0 100%)', color: '#2b1614' }}
            >
                <div className="absolute left-0 top-0 bottom-0 w-8" style={{ background: band }}>
                    <div className="absolute left-1/2 top-[22%] -translate-x-1/2 w-3 h-3 rounded-full bg-[#f8f1e3]" />
                    <div className="absolute left-1/2 top-[38%] -translate-x-1/2 w-3 h-3 rounded-full bg-[#f8f1e3]" />
                </div>

                <div className="pl-12 pr-5 py-6">
                    <div className="flex items-center gap-2">
                        <span className="relative w-4 h-4 shrink-0" aria-hidden>
                            <span className="absolute left-1/2 top-0 bottom-0 w-[3px] -translate-x-1/2" style={{ background: band }} />
                            <span className="absolute top-1/2 left-0 right-0 h-[3px] -translate-y-1/2" style={{ background: band }} />
                        </span>
                        <span className="text-[10px] tracking-[0.35em] font-bold" style={{ color: ink }}>VITAL RUSH</span>
                    </div>
                    <h2 className="mt-1 text-3xl leading-none" style={{ fontFamily: 'Georgia, "Palatino Linotype", serif' }}>
                        {t('PAUSED')}
                    </h2>
                    <p className="mt-3 text-sm leading-snug" style={{ color: '#5c403c' }}>{t('PAUSE_HINT')}</p>

                    <div className="mt-4 flex flex-col gap-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); onResume(); }}
                            className="w-full py-3 font-bold tracking-[0.22em] text-xs uppercase text-black"
                            style={{ background: band, boxShadow: `0 6px 0 ${ink}` }}
                        >
                            {t('RESUME')}
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onSettings(); }}
                            className="w-full py-3 border-2 font-bold tracking-[0.22em] text-xs uppercase hover:bg-black/5"
                            style={{ borderColor: ink, color: ink }}
                        >
                            {t('SETTINGS')}
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onQuit(); }}
                            className="mt-1 block mx-auto text-[11px] tracking-[0.28em] uppercase opacity-60 hover:opacity-100"
                            style={{ color: ink }}
                        >
                            {t('ABORT')}
                        </button>
                    </div>
                </div>
            </article>
        </div>
    );
};



import React, { useState, useEffect } from 'react';
import { TEXTS } from '../constants';
import { Language } from '../types';
import { audioManager } from '../services/audioManager';
import { motionClass, useScreenPresence } from './screenPresence';
import { Dossier } from './Dossier';

interface SettingsMenuProps {
    isVisible: boolean;
    language: Language;
    audioSettings: { master: number; music: number; sfx: number };
    forceHighQuality: boolean; // NEW PROP
    onUpdateAudio: (type: 'master' | 'music' | 'sfx', val: number) => void;
    onLanguageChange: (lang: Language) => void;
    onSystemPurge: () => void;
    onToggleHighQuality: () => void; // NEW PROP
    cheatInput: string;
    onCheatInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClose: () => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ 
    isVisible, 
    language, 
    audioSettings, 
    forceHighQuality,
    onUpdateAudio, 
    onLanguageChange,
    onSystemPurge,
    onToggleHighQuality,
    cheatInput,
    onCheatInput,
    onClose 
}) => {
    const present = useScreenPresence(isVisible);
    const t = (key: string) => TEXTS[language][key] || key;
    const [resetStage, setResetStage] = useState(0);
    const [crtEnabled, setCrtEnabled] = useState(!document.body.classList.contains('force-clean-vision'));

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

    if (!present.alive) return null;

    const toggleCrt = () => {
        const newState = !crtEnabled;
        setCrtEnabled(newState);
        if (!newState) {
            document.body.classList.add('force-clean-vision');
            audioManager.playShoot();
        } else {
            document.body.classList.remove('force-clean-vision');
            audioManager.playPowerUp();
        }
    };

    const handleReset = () => {
        if (resetStage === 0) {
            setResetStage(1);
            audioManager.playHit();
            setTimeout(() => setResetStage(0), 3000);
        } else {
            audioManager.playExplosion();
            onSystemPurge();
            setResetStage(0);
        }
    };

    const Meter = ({ label, value, onChange }: { label: string, value: number, onChange: (val: number) => void }) => (
        <label className="block mb-2">
            <div className="flex items-center justify-between mb-1 text-[10px] tracking-[0.14em] text-[#f4f1ea]">
                <span>{label}</span>
                <strong className="font-['Teko'] text-[15px] font-semibold leading-none text-[#ffd84a]">{Math.round(value * 100)}</strong>
            </div>
            <div className="relative h-7 bg-black/45 border border-[#e2b060]/35 rounded-md px-1.5 flex items-center">
                <input
                    type="range"
                    min="0" max="1" step="0.1"
                    value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex gap-1 w-full h-3 pointer-events-none">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className={`flex-1 rounded-[2px] ${i / 10 < value ? 'bg-[#e2a01f]' : 'bg-white/10'}`} />
                    ))}
                </div>
            </div>
        </label>
    );

    const Switch = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
        <button
            type="button"
            onClick={onClick}
            className={`w-14 h-7 rounded-full relative shrink-0 border ${on ? 'bg-[#e2a01f] border-[#ffe08a]' : 'bg-black/50 border-white/15'}`}
            aria-pressed={on}
        >
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-[#1a1008] transition-all ${on ? 'left-[calc(100%-1.45rem)]' : 'left-1'}`} />
        </button>
    );

    return (
        <div className={`fixed inset-0 z-[110] ${motionClass(present.phase)}`}>
            <Dossier title={t('SETTINGS')} onBack={onClose} backLabel={t('BACK')}>
                <div className="dossier-split">
                    <section>
                    <h3 className="dossier-kicker">{t('AUDIO_PROTOCOLS')}</h3>
                    <Meter label={t('MASTER_OUTPUT')} value={audioSettings.master} onChange={(v) => onUpdateAudio('master', v)} />
                    <Meter label={t('MUSIC_STREAM')} value={audioSettings.music} onChange={(v) => onUpdateAudio('music', v)} />
                    <Meter label={t('SFX_FEEDBACK')} value={audioSettings.sfx} onChange={(v) => onUpdateAudio('sfx', v)} />
                    </section>
                    <section>
                    <h3 className="dossier-kicker">{t('VISUAL_OPTICS')}</h3>
                    <div className="dossier-card mb-2 flex items-center justify-between gap-4">
                        <div>
                            <div className="font-['Teko'] text-[16px] leading-none tracking-wide">{t('RETRO_FILTER')}</div>
                            <p>{t('CRT_DESC')}</p>
                        </div>
                        <Switch on={crtEnabled} onClick={toggleCrt} />
                    </div>
                    <div className="dossier-card mb-2">
                        <div className="flex items-center justify-between gap-4">
                            <div className="font-['Teko'] text-[16px] leading-none tracking-wide">{t('HIGH_QUALITY')}</div>
                            <Switch on={forceHighQuality} onClick={onToggleHighQuality} />
                        </div>
                        <p className="mt-2 text-[#e7b0a4]">{t('HQ_WARNING')}</p>
                    </div>
                    </section>
                </div>
                <div className="dossier-foot">
                    <div>
                        <h3 className="dossier-kicker">{t('LANG')}</h3>
                        <div className="grid grid-cols-3 gap-2">
                            {(['EN', 'PT', 'ES'] as Language[]).map(l => (
                                <button
                                    key={l}
                                    type="button"
                                    onClick={() => onLanguageChange(l)}
                                    className={`px-3 py-1.5 font-['Teko'] text-[16px] leading-none tracking-[0.14em] rounded-md border ${language === l ? 'bg-[#e2a01f] text-[#1a1008] border-[#ffe08a]' : 'bg-black/35 text-[#f6f1e6] border-[#e2b060]/30'}`}
                                >
                                    {l}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h3 className="dossier-kicker">{t('PH_ACCESS_CODE')}</h3>
                        <input
                            type="text"
                            value={cheatInput}
                            onChange={onCheatInput}
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck={false}
                            placeholder={t('PH_ACCESS_CODE')}
                            className="w-full bg-black/45 border border-[#e2b060]/35 rounded-md px-3 py-2.5 font-mono text-xs tracking-[0.18em] text-[#f6f1e6] uppercase placeholder:text-[#e2b060]/40 focus:outline-none focus:border-[#ffe08a]"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleReset}
                        className={`px-3 py-2 rounded-md border font-['Teko'] text-[15px] leading-none tracking-[0.1em] ${resetStage === 1 ? 'bg-[#b91c1c] text-white border-[#fecaca]' : 'bg-transparent text-[#f0b4a8] border-[#b91c1c]/60'}`}
                    >
                        {resetStage === 1 ? t('CONFIRM_PURGE') : t('SYSTEM_PURGE')}
                    </button>
                </div>
            </Dossier>
        </div>
    );
};

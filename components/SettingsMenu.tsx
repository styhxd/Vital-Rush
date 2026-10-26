

import React, { useState, useEffect } from 'react';
import { TEXTS, WAVES } from '../constants';
import { EntityType, Language } from '../types';
import { audioManager } from '../services/audioManager';
import { organAccent, organForWave, organNameKey, organStart, type OrganId } from '../services/organDirector';
import { motionClass, useScreenPresence } from './screenPresence';
import { Dossier } from './Dossier';

interface SettingsMenuProps {
    isVisible: boolean;
    language: Language;
    audioSettings: { master: number; music: number; sfx: number; mono: boolean };
    leanGraphics: boolean;
    onUpdateAudio: (type: 'master' | 'music' | 'sfx', val: number) => void;
    onLanguageChange: (lang: Language) => void;
    onSystemPurge: () => void;
    onToggleLean: () => void;
    onToggleMono: () => void;
    cheatInput: string;
    onCheatInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
    waveDeck: boolean;
    onPickWave: (wave: number) => void;
    onCancelDeck: () => void;
    onClose: () => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ 
    isVisible, 
    language, 
    audioSettings, 
    leanGraphics,
    onUpdateAudio, 
    onLanguageChange,
    onSystemPurge,
    onToggleLean,
    onToggleMono,
    cheatInput,
    onCheatInput,
    waveDeck,
    onPickWave,
    onCancelDeck,
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
                .settings-fit { display: flex; flex-direction: column; gap: 0.4rem; }
                .settings-meters,
                .settings-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.5rem; }
                .settings-row .dossier-card { margin: 0; height: 100%; }
                .settings-foot { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 0.55rem; align-items: end; }
                .settings-fit .dossier-kicker { margin: 0 0 0.2rem; }
                @media (max-width: 720px) {
                    .settings-meters, .settings-row, .settings-foot { grid-template-columns: 1fr; }
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

    if (waveDeck) {
        return (
            <div className={`fixed inset-0 z-[110] ${motionClass(present.phase)}`}>
                <Dossier title={DECK_TITLE[language]} meta={DECK_META[language]} onBack={onCancelDeck} backLabel={t('BACK')} wide>
                    <style>{deckStyles}</style>
                    <p className="wave-lead">{DECK_LEAD[language]}</p>
                    {ORGANS.map(organ => {
                        const waves = WAVES.filter((_, index) => organForWave(index) === organ);
                        return (
                            <section key={organ} className="wave-organ">
                                <h3 className="dossier-kicker" style={{ color: organAccent(organ) }}>{t(organNameKey(organ))}</h3>
                                <div className="wave-grid">
                                    {waves.map(wave => {
                                        const index = wave.waveNumber - 1;
                                        const local = index - organStart(organ);
                                        return (
                                            <button
                                                key={wave.waveNumber}
                                                type="button"
                                                className="wave-card"
                                                style={{ borderColor: `${organAccent(organ)}55` }}
                                                onClick={() => onPickWave(wave.waveNumber)}
                                            >
                                                <header>
                                                    <strong>{t('WAVE')} {wave.waveNumber}</strong>
                                                    <em>{wave.duration}s</em>
                                                </header>
                                                <div className="wave-chips">
                                                    {wave.enemyTypes.map(kind => (
                                                        <span key={kind} className="wave-chip">{FOE[language][kind]}</span>
                                                    ))}
                                                    {hazardsFor(organ, local, language).map(label => (
                                                        <span key={label} className="wave-chip is-event">{label}</span>
                                                    ))}
                                                    {wave.hasBoss && <span className="wave-chip is-boss">{BOSS[language]}</span>}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })}
                </Dossier>
            </div>
        );
    }

    return (
        <div className={`fixed inset-0 z-[110] ${motionClass(present.phase)}`}>
            <Dossier title={t('SETTINGS')} onBack={onClose} backLabel={t('BACK')} wide>
                <div className="settings-fit">
                    <section>
                    <h3 className="dossier-kicker">{t('AUDIO_PROTOCOLS')}</h3>
                    <div className="settings-meters">
                    <Meter label={t('MASTER_OUTPUT')} value={audioSettings.master} onChange={(v) => onUpdateAudio('master', v)} />
                    <Meter label={t('MUSIC_STREAM')} value={audioSettings.music} onChange={(v) => onUpdateAudio('music', v)} />
                    <Meter label={t('SFX_FEEDBACK')} value={audioSettings.sfx} onChange={(v) => onUpdateAudio('sfx', v)} />
                    </div>
                    </section>
                    <section className="settings-row">
                    <div className="dossier-card">
                        <div className="flex items-center justify-between gap-3">
                            <div className="font-['Teko'] text-[16px] leading-none tracking-wide">{t('MONO_AUDIO')}</div>
                            <Switch on={audioSettings.mono} onClick={onToggleMono} />
                        </div>
                        <p className="mt-2 text-[#e7b0a4]">{t('MONO_HINT')}</p>
                    </div>
                    <div className="dossier-card flex items-center justify-between gap-3">
                        <div>
                            <div className="font-['Teko'] text-[16px] leading-none tracking-wide">{t('RETRO_FILTER')}</div>
                            <p>{t('CRT_DESC')}</p>
                        </div>
                        <Switch on={crtEnabled} onClick={toggleCrt} />
                    </div>
                    <div className="dossier-card">
                        <div className="flex items-center justify-between gap-3">
                            <div className="font-['Teko'] text-[16px] leading-none tracking-wide">{t('HIGH_QUALITY')}</div>
                            <Switch on={leanGraphics} onClick={onToggleLean} />
                        </div>
                        <p className="mt-2 text-[#e7b0a4]">{t('HQ_WARNING')}</p>
                    </div>
                    </section>
                <div className="settings-foot">
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
                </div>
            </Dossier>
        </div>
    );
};

const ORGANS: OrganId[] = ['molar', 'liver', 'heart', 'lung', 'brain'];

const DECK_TITLE: Record<Language, string> = {
    PT: 'ESCOLHA A ONDA',
    EN: 'PICK A WAVE',
    ES: 'ELIGE LA ONDA',
};
const DECK_META: Record<Language, string> = {
    PT: 'TUDO NO MÁXIMO',
    EN: 'EVERYTHING MAXED',
    ES: 'TODO AL MÁXIMO',
};
const DECK_LEAD: Record<Language, string> = {
    PT: 'Cada carta é uma onda. O que está nela é o que pode aparecer.',
    EN: 'Each card is a wave. What is on it is what can show up.',
    ES: 'Cada carta es una onda. Lo que está en ella es lo que puede aparecer.',
};
const BOSS: Record<Language, string> = { PT: 'CHEFE', EN: 'BOSS', ES: 'JEFE' };

const FOE: Record<Language, Partial<Record<EntityType, string>>> = {
    PT: {
        [EntityType.BACTERIA]: 'BACTÉRIA',
        [EntityType.VIRUS]: 'VÍRUS',
        [EntityType.FUNGI]: 'FUNGO',
        [EntityType.PARASITE]: 'PARASITA',
    },
    EN: {
        [EntityType.BACTERIA]: 'BACTERIA',
        [EntityType.VIRUS]: 'VIRUS',
        [EntityType.FUNGI]: 'FUNGUS',
        [EntityType.PARASITE]: 'PARASITE',
    },
    ES: {
        [EntityType.BACTERIA]: 'BACTERIA',
        [EntityType.VIRUS]: 'VIRUS',
        [EntityType.FUNGI]: 'HONGO',
        [EntityType.PARASITE]: 'PARÁSITO',
    },
};

const HAZARD: Record<Language, Record<string, string>> = {
    PT: {
        plaque: 'PLACA', saliva: 'SALIVA', bite: 'MORDIDA', enamel: 'ESMALTE',
        bile: 'BILE', filter: 'KUPFFER', heal: 'AÇÚCAR',
        beat: 'SÍSTOLE', ecg: 'ELETRO', ecg2: 'DOIS ELETROS', clot: 'COÁGULO',
        gust: 'LUFADA', cough: 'TOSSE', oxygen: 'OXIGÊNIO',
        synapse: 'SINAPSE', flash: 'CLARÃO', focus: 'FOCO', chain: 'CADEIA',
    },
    EN: {
        plaque: 'PLAQUE', saliva: 'SALIVA', bite: 'BITE', enamel: 'ENAMEL',
        bile: 'BILE', filter: 'KUPFFER', heal: 'SUGAR',
        beat: 'SYSTOLE', ecg: 'ECG', ecg2: 'TWO ECGS', clot: 'CLOT',
        gust: 'GUST', cough: 'COUGH', oxygen: 'OXYGEN',
        synapse: 'SYNAPSE', flash: 'FLASH', focus: 'FOCUS', chain: 'CHAIN',
    },
    ES: {
        plaque: 'PLACA', saliva: 'SALIVA', bite: 'MORDIDA', enamel: 'ESMALTE',
        bile: 'BILIS', filter: 'KUPFFER', heal: 'AZÚCAR',
        beat: 'SÍSTOLE', ecg: 'ELECTRO', ecg2: 'DOS ELECTROS', clot: 'COÁGULO',
        gust: 'RÁFAGA', cough: 'TOS', oxygen: 'OXÍGENO',
        synapse: 'SINAPSIS', flash: 'DESTELLO', focus: 'FOCO', chain: 'CADENA',
    },
};

const hazardsFor = (organ: OrganId, local: number, language: Language): string[] => {
    const word = (key: string) => HAZARD[language][key];
    if (organ === 'molar') {
        const list = ['plaque'];
        if (local >= 1) list.push('saliva');
        if (local >= 2) list.push('enamel');
        if (local >= 3) list.push('bite');
        return list.map(word);
    }
    if (organ === 'liver') {
        const list = ['bile'];
        if (local >= 1) list.push('heal');
        if (local >= 2) list.push('filter');
        return list.map(word);
    }
    if (organ === 'heart') {
        const list = ['beat'];
        if (local >= 1) list.push(local >= 3 ? 'ecg2' : 'ecg');
        if (local >= 2) list.push('clot');
        return list.map(word);
    }
    if (organ === 'lung') {
        const list = ['gust'];
        if (local >= 1) list.push('oxygen');
        if (local >= 3) list.push('cough');
        return list.map(word);
    }
    const list = ['synapse'];
    if (local >= 1) list.push('focus');
    if (local >= 2) list.push('flash');
    if (local >= 3) list.push('chain');
    return list.map(word);
};

const deckStyles = `
.wave-lead {
    margin: 0 0 0.7rem;
    color: #e7dcc8;
    font-size: 13px;
    line-height: 1.35;
}
.wave-organ { margin-bottom: 0.85rem; }
.wave-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0.4rem;
}
.wave-card {
    display: block;
    width: 100%;
    text-align: left;
    background: rgba(255, 244, 220, 0.04);
    border: 1px solid rgba(226, 176, 96, 0.28);
    border-radius: 10px;
    padding: 0.4rem 0.5rem 0.45rem;
    cursor: pointer;
    color: inherit;
}
.wave-card:hover { background: rgba(255, 244, 220, 0.09); }
.wave-card header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.4rem;
}
.wave-card strong {
    font-family: 'Teko', sans-serif;
    font-size: 20px;
    font-weight: 600;
    letter-spacing: 0.05em;
    line-height: 1;
    color: #ffe7b0;
}
.wave-card em {
    font-style: normal;
    font-family: 'Teko', sans-serif;
    font-size: 15px;
    letter-spacing: 0.06em;
    color: #e2b060;
}
.wave-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.22rem;
    margin-top: 0.32rem;
}
.wave-chip {
    font-size: 10px;
    letter-spacing: 0.06em;
    line-height: 1.2;
    padding: 0.12rem 0.32rem;
    border-radius: 999px;
    border: 1px solid rgba(226, 176, 96, 0.32);
    color: #f4f1ea;
}
.wave-chip.is-event { color: #d7ecff; border-color: rgba(180, 210, 230, 0.35); }
.wave-chip.is-boss {
    color: #1a1008;
    background: #e2a01f;
    border-color: #ffe08a;
    font-weight: 700;
}
@media (max-width: 860px) {
    .wave-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 560px) {
    .wave-grid { grid-template-columns: 1fr; }
}
`;

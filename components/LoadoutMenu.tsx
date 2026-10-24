import React from 'react';
import { PlayerStats, Upgrade, Language } from '../types';
import { TEXTS } from '../constants';
import { motionClass, useScreenPresence } from './screenPresence';

interface LoadoutMenuProps {
    isVisible: boolean;
    stats: PlayerStats;
    upgrades: Upgrade[];
    language: Language;
    isPlatinum?: boolean;
    onClose: () => void;
}

const rarityKey: Record<Upgrade['rarity'], string> = {
    COMMON: 'RARITY_COMMON',
    RARE: 'RARITY_RARE',
    EPIC: 'RARITY_EPIC',
    LEGENDARY: 'RARITY_LEGENDARY',
};

export const LoadoutMenu: React.FC<LoadoutMenuProps> = ({ isVisible, stats, upgrades, language, isPlatinum, onClose }) => {
    const present = useScreenPresence(isVisible);
    const t = (key: string) => TEXTS[language][key] || key;
    if (!present.alive) return null;

    const bought = upgrades.filter(u => u.level > 0);
    const rows: { label: string; value: string }[] = [
        { label: t('STAT_DAMAGE'), value: String(Math.round(stats.damage)) },
        { label: t('STAT_FIRE'), value: String(Math.round(1000 / stats.fireRate)) },
        { label: t('STAT_SPEED'), value: String(Math.round(stats.speed)) },
        { label: t('STAT_HP'), value: String(Math.round(stats.maxHealth)) },
        { label: t('STAT_CRIT'), value: `${Math.round(stats.critChance * 100)}%` },
        { label: t('STAT_CRIT_MULT'), value: `${Math.round(stats.critMultiplier)}x` },
        { label: t('STAT_SHOTS'), value: String(Math.round(stats.bulletCount)) },
        { label: t('STAT_MAGNET'), value: String(Math.round(stats.magnetRadius)) },
        { label: t('STAT_THORNS'), value: String(Math.round(stats.thorns)) },
        { label: t('STAT_ORBITALS'), value: String(Math.round(stats.orbitals)) },
        { label: t('STAT_ENERGY'), value: String(Math.round(stats.maxEnergy)) },
    ];

    return (
        <div className={`vial-screen ${motionClass(present.phase)} ${isPlatinum ? 'is-platinum' : ''}`}>
            <button type="button" className="vial-dim" aria-label={t('BACK')} onClick={onClose} />
            <section className="vial-card">
                <header className="vial-head">
                    <svg viewBox="0 0 48 64" aria-hidden>
                        <rect x="16" y="2" width="16" height="8" rx="2" fill="#f4e2b0" />
                        <path d="M14 12h20l6 10v28a10 10 0 0 1-10 10H18a10 10 0 0 1-10-10V22z" fill="#1a0c10" stroke="#ffe7a8" strokeWidth="2" />
                        <path d="M12 34h24v14a8 8 0 0 1-8 8h-8a8 8 0 0 1-8-8z" fill="#c4233a" />
                        <path d="M18 18h4l2 8" fill="none" stroke="#ffe7a8" strokeWidth="1.5" />
                    </svg>
                    <div>
                        <p>{t('LOADOUT')}</p>
                        <h2>{t('LOADOUT_NOW')}</h2>
                    </div>
                </header>
                <div className="vial-grid">
                    <ul>
                        {rows.map(row => (
                            <li key={row.label}>
                                <span>{row.label}</span>
                                <b>{row.value}</b>
                            </li>
                        ))}
                    </ul>
                    <div>
                        <h3>{t('LOADOUT_BOUGHT')}</h3>
                        {bought.length === 0 ? (
                            <p className="vial-empty">{t('LOADOUT_EMPTY')}</p>
                        ) : (
                            <ul className="vial-bought">
                                {bought.map(u => (
                                    <li key={u.id} className={`is-${u.rarity.toLowerCase()}`}>
                                        <strong>{t(u.nameKey)}</strong>
                                        <em>{t('STAT_LEVEL')} {u.level}/{u.maxLevel}</em>
                                        <span>{t(rarityKey[u.rarity])}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
                <button type="button" className="vial-back" onClick={onClose}>{t('BACK')}</button>
            </section>
            <style>{`
                .vial-screen {
                    position: fixed;
                    inset: 0;
                    z-index: 120;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 4vh 4vw;
                    font-family: 'Chakra Petch', sans-serif;
                    color: #f6efe4;
                }
                .vial-dim { position: absolute; inset: 0; background: rgba(6, 2, 3, 0.72); border: 0; }
                .vial-card {
                    position: relative;
                    width: min(920px, 100%);
                    max-height: 100%;
                    overflow: auto;
                    padding: 22px 22px 16px;
                    background:
                        linear-gradient(180deg, rgba(90, 16, 24, 0.55), rgba(12, 6, 8, 0.96) 28%),
                        #14080c;
                    border: 1px solid rgba(255, 214, 150, 0.45);
                    box-shadow: 0 18px 0 rgba(0, 0, 0, 0.35), inset 0 0 0 1px rgba(255, 80, 70, 0.2);
                }
                .vial-head { display: flex; align-items: center; gap: 14px; }
                .vial-head svg { width: 42px; height: 56px; flex: none; }
                .vial-head p {
                    margin: 0;
                    letter-spacing: 0.32em;
                    font-size: 11px;
                    color: #ffd7a2;
                }
                .vial-head h2 {
                    margin: 2px 0 0;
                    font-family: 'Teko', sans-serif;
                    font-size: 42px;
                    line-height: 0.85;
                    font-weight: 600;
                }
                .vial-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 22px;
                    margin-top: 16px;
                }
                .vial-grid ul { list-style: none; margin: 0; padding: 0; }
                .vial-grid > ul li {
                    display: flex;
                    justify-content: space-between;
                    gap: 12px;
                    padding: 6px 0;
                    border-top: 1px solid rgba(255, 214, 150, 0.16);
                    font-size: 13px;
                }
                .vial-grid b { font-family: 'Teko', sans-serif; font-size: 22px; font-weight: 500; color: #ffe7a8; }
                .vial-grid h3 {
                    margin: 0 0 8px;
                    letter-spacing: 0.22em;
                    font-size: 11px;
                    color: #ffd7a2;
                }
                .vial-empty { margin: 8px 0 0; color: rgba(246, 239, 228, 0.7); font-size: 14px; }
                .vial-bought li {
                    display: grid;
                    grid-template-columns: 1fr auto;
                    gap: 2px 10px;
                    padding: 8px 0;
                    border-top: 1px solid rgba(255, 214, 150, 0.16);
                }
                .vial-bought strong { font-size: 14px; }
                .vial-bought em { font-style: normal; color: #ffe7a8; font-size: 12px; }
                .vial-bought span { grid-column: 1 / -1; letter-spacing: 0.16em; font-size: 10px; color: rgba(246, 239, 228, 0.55); }
                .vial-bought .is-rare strong { color: #ffb088; }
                .vial-bought .is-epic strong { color: #e2b6ff; }
                .vial-bought .is-legendary strong { color: #ffe08a; }
                .vial-back {
                    margin-top: 16px;
                    width: 100%;
                    border: 0;
                    padding: 12px;
                    letter-spacing: 0.22em;
                    font-weight: 700;
                    color: #2a1408;
                    background: linear-gradient(#fff1c4, #e2a01f);
                    box-shadow: 0 5px 0 #6a3a08;
                    cursor: pointer;
                }
                .is-platinum .vial-card { border-color: rgba(255, 214, 140, 0.7); }
                @media (max-width: 800px) {
                    .vial-grid { grid-template-columns: 1fr; }
                    .vial-head h2 { font-size: 32px; }
                }
            `}</style>
        </div>
    );
};

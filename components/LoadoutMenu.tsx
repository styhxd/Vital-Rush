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

    const ink = isPlatinum ? '#7c4a12' : '#7f1d1d';
    const band = isPlatinum ? '#b45309' : '#b91c1c';
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
        <div className={`fixed inset-0 z-[120] flex items-center justify-center p-4 lg:p-10 ${motionClass(present.phase)}`}>
            <div className="absolute inset-0 bg-black/55" />
            <article
                className="relative w-full max-w-3xl max-h-full overflow-y-auto shadow-[0_18px_50px_rgba(0,0,0,0.55)]"
                style={{ background: 'linear-gradient(180deg, #f8f1e3 0%, #f3e6d0 100%)', color: '#2b1614' }}
            >
                <div className="absolute left-0 top-0 bottom-0 w-8 lg:w-11" style={{ background: band }}>
                    <div className="absolute left-1/2 top-[12%] -translate-x-1/2 w-3 h-3 lg:w-4 lg:h-4 rounded-full bg-[#f8f1e3]" />
                    <div className="absolute left-1/2 top-[20%] -translate-x-1/2 w-3 h-3 lg:w-4 lg:h-4 rounded-full bg-[#f8f1e3]" />
                </div>

                <div className="pl-10 lg:pl-16 pr-3 lg:pr-8 py-3 lg:py-6">
                    <div className="flex items-end justify-between gap-4 border-b pb-3" style={{ borderColor: `${ink}33` }}>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="relative w-4 h-4 lg:w-5 lg:h-5 shrink-0" aria-hidden>
                                    <span className="absolute left-1/2 top-0 bottom-0 w-[3px] -translate-x-1/2" style={{ background: band }} />
                                    <span className="absolute top-1/2 left-0 right-0 h-[3px] -translate-y-1/2" style={{ background: band }} />
                                </span>
                                <span className="text-[10px] lg:text-xs tracking-[0.35em] font-bold" style={{ color: ink }}>VITAL RUSH</span>
                            </div>
                            <h2 className="mt-1 text-2xl lg:text-4xl leading-none" style={{ fontFamily: 'Georgia, "Palatino Linotype", serif' }}>
                                {t('LOADOUT')}
                            </h2>
                        </div>
                    </div>
                    <p className="mt-2 text-xs lg:text-sm" style={{ color: '#5c403c' }}>{t('LOADOUT_HINT')}</p>

                    <div className="mt-3 lg:mt-5 grid grid-cols-2 gap-4 lg:gap-6">
                        <section>
                            <h3 className="text-[11px] tracking-[0.28em] font-bold" style={{ color: ink }}>{t('LOADOUT_NOW')}</h3>
                            <div className="mt-2">
                                {rows.map(row => (
                                    <div key={row.label} className="flex items-baseline justify-between gap-3 border-t py-1 lg:py-2" style={{ borderColor: `${ink}22` }}>
                                        <span className="text-xs lg:text-sm" style={{ color: '#5c403c' }}>{row.label}</span>
                                        <span className="text-sm lg:text-base font-semibold tabular-nums">{row.value}</span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section>
                            <h3 className="text-[11px] tracking-[0.28em] font-bold" style={{ color: ink }}>{t('LOADOUT_BOUGHT')}</h3>
                            {bought.length === 0 ? (
                                <p className="mt-3 text-sm leading-relaxed" style={{ color: '#5c403c' }}>{t('LOADOUT_EMPTY')}</p>
                            ) : (
                                <ul className="mt-2 space-y-2">
                                    {bought.map(u => (
                                        <li key={u.id} className="border-t pt-2" style={{ borderColor: `${ink}22` }}>
                                            <div className="flex items-baseline justify-between gap-3">
                                                <span className="font-semibold text-sm lg:text-base">{t(u.nameKey)}</span>
                                                <span className="text-xs font-bold shrink-0" style={{ color: ink }}>
                                                    {t('STAT_LEVEL')} {u.level}
                                                </span>
                                            </div>
                                            <div className="text-xs mt-0.5" style={{ color: '#5c403c' }}>{t(u.descKey)}</div>
                                            <div className="text-[10px] tracking-[0.18em] uppercase mt-1 opacity-60">{t(rarityKey[u.rarity])}</div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    </div>

                    <button
                        onClick={onClose}
                        className="mt-3 lg:mt-6 w-full py-2.5 lg:py-4 font-bold tracking-[0.22em] text-xs lg:text-sm uppercase text-black"
                        style={{ background: band, boxShadow: `0 6px 0 ${ink}` }}
                    >
                        {t('BACK')}
                    </button>
                </div>
            </article>
        </div>
    );
};

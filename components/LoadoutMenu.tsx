import React from 'react';
import { PlayerStats, Upgrade, Language } from '../types';
import { TEXTS } from '../constants';

interface LoadoutMenuProps {
    isVisible: boolean;
    stats: PlayerStats;
    upgrades: Upgrade[];
    language: Language;
    onClose: () => void;
}

const StatRow = ({label, value}: {label: string, value: string | number}) => (
    <div className="flex justify-between border-b border-white/5 pb-1">
        <span className="text-gray-500">{label}</span>
        <span className="text-cyan-200">{value}</span>
    </div>
);

export const LoadoutMenu: React.FC<LoadoutMenuProps> = ({ isVisible, stats, upgrades, language, onClose }) => {
    if (!isVisible) return null;
    const t = (key: string) => TEXTS[language][key] || key;

    const activeUpgrades = upgrades.filter(u => u.level > 0);

    return (
        <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center animate-in fade-in zoom-in duration-200">
             {/* Background Grid Decorativo */}
             <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>

             <div className="w-full max-w-4xl h-[90vh] border-y-2 border-cyan-500 bg-[#050b14] flex flex-col p-4 md:p-10 relative shadow-[0_0_50px_rgba(0,255,255,0.1)]">
                {/* Header */}
                <div className="flex justify-between items-center mb-4 md:mb-8 border-b border-cyan-800 pb-2 md:pb-4">
                    <h2 className="text-xl md:text-3xl font-bold text-cyan-400 tracking-[0.3em]">{t('LOADOUT')}</h2>
                    <div className="text-[8px] md:text-[10px] text-gray-500 font-mono tracking-widest text-right">
                        <div>GENOME SEQUENCE</div>
                        <div>ID: 734-APEX</div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scroll grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 min-h-0">
                    {/* STATS COLUMN */}
                    <div className="bg-white/5 p-3 md:p-4 border border-white/5">
                        <h3 className="text-white font-mono text-xs md:text-sm tracking-widest mb-2 md:mb-4 border-l-2 border-cyan-500 pl-2">VIRAL METRICS</h3>
                        <div className="space-y-1.5 md:space-y-3 font-mono text-[10px] md:text-sm text-gray-300">
                            <StatRow label="DAMAGE" value={stats.damage.toFixed(1)} />
                            <StatRow label="FIRE RATE" value={(1000/stats.fireRate).toFixed(1) + '/s'} />
                            <StatRow label="SPEED" value={stats.speed.toFixed(1)} />
                            <StatRow label="MAX HP" value={stats.maxHealth} />
                            <StatRow label="CRIT CHANCE" value={(stats.critChance * 100).toFixed(0) + '%'} />
                            <StatRow label="CRIT MULT" value={stats.critMultiplier.toFixed(1) + 'x'} />
                            <StatRow label="PROJECTILES" value={stats.bulletCount} />
                            <StatRow label="MAGNET" value={stats.magnetRadius.toFixed(0)} />
                            <StatRow label="THORNS" value={stats.thorns.toFixed(1)} />
                            <StatRow label="ORBITALS" value={stats.orbitals} />
                            <StatRow label="MAX ENERGY" value={stats.maxEnergy} />
                        </div>
                    </div>

                    {/* UPGRADES COLUMN */}
                    <div>
                        <h3 className="text-white font-mono text-xs md:text-sm tracking-widest mb-2 md:mb-4 border-l-2 border-yellow-500 pl-2">ACTIVE MUTATIONS</h3>
                        <div className="space-y-2 max-h-[30vh] md:max-h-[50vh] overflow-y-auto custom-scroll pr-2">
                            {activeUpgrades.length === 0 ? (
                                <div className="text-gray-600 italic text-xs p-4 border border-dashed border-gray-800 text-center">
                                    {t('NO_MUTATIONS')}
                                </div>
                            ) : (
                                activeUpgrades.map(u => (
                                    <div key={u.id} className="flex justify-between items-center bg-white/5 p-2 md:p-3 border-l-2 border-yellow-500/50 hover:bg-white/10 transition-colors">
                                        <div>
                                            <div className="text-cyan-300 font-bold text-[10px] md:text-xs tracking-wide">{t(u.nameKey)}</div>
                                            <div className="text-[8px] md:text-[10px] text-gray-500">{t(u.descKey)}</div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[6px] md:text-[8px] text-gray-600">{u.rarity}</span>
                                            <span className="text-yellow-500 font-mono font-bold text-xs md:text-sm">LVL {u.level}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-4 md:mt-6 pt-2 md:pt-4 border-t border-cyan-900/30">
                     <button 
                        onClick={onClose}
                        className="w-full py-3 md:py-4 bg-cyan-600 hover:bg-cyan-500 text-black font-bold tracking-[0.2em] text-xs md:text-base transition-all shadow-[0_0_20px_rgba(0,255,255,0.2)]"
                    >
                        {t('BACK')}
                    </button>
                </div>
             </div>
        </div>
    );
}
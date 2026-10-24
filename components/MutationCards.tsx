import React, { useEffect, useRef, useState } from 'react';
import { Upgrade, Language, Difficulty } from '../types';

const CARD_BG = new URL('../src/assets/cards/card-bg.webp', import.meta.url).href;

const ART: Record<string, { src: string; tint: string; wash: string }> = {
    mitosis: { src: new URL('../src/assets/cards/01-mitosis.webp', import.meta.url).href, tint: '#ff9a2a', wash: '86% 28%' },
    enzyme: { src: new URL('../src/assets/cards/02-enzyme.webp', import.meta.url).href, tint: '#ff3a22', wash: '80% 24%' },
    membrane: { src: new URL('../src/assets/cards/03-membrane.webp', import.meta.url).href, tint: '#ff3358', wash: '82% 36%' },
    multishot: { src: new URL('../src/assets/cards/04-multishot.webp', import.meta.url).href, tint: '#ff7a18', wash: '78% 40%' },
    orbitals: { src: new URL('../src/assets/cards/05-orbitals.webp', import.meta.url).href, tint: '#ff2d2d', wash: '84% 32%' },
    crit: { src: new URL('../src/assets/cards/06-crit.webp', import.meta.url).href, tint: '#2ad4e6', wash: '82% 30%' },
    dash_dmg: { src: new URL('../src/assets/cards/07-dash.webp', import.meta.url).href, tint: '#3ecfff', wash: '88% 38%' },
    thorns: { src: new URL('../src/assets/cards/08-thorns.webp', import.meta.url).href, tint: '#ff6a3c', wash: '80% 34%' },
    lifesteal: { src: new URL('../src/assets/cards/09-lifesteal.webp', import.meta.url).href, tint: '#ff5d78', wash: '74% 42%' },
    magnet: { src: new URL('../src/assets/cards/10-magnet.webp', import.meta.url).href, tint: '#c44ad4', wash: '86% 30%' },
    energy_core: { src: new URL('../src/assets/cards/11-energy.webp', import.meta.url).href, tint: '#ff9a12', wash: '82% 36%' },
    giga_blast: { src: new URL('../src/assets/cards/12-giga.webp', import.meta.url).href, tint: '#4eb6ea', wash: '76% 44%' },
};

const RARITY_KEY: Record<Upgrade['rarity'], string> = {
    COMMON: 'RARITY_COMMON',
    RARE: 'RARITY_RARE',
    EPIC: 'RARITY_EPIC',
    LEGENDARY: 'RARITY_LEGENDARY',
};

const RARITY_INK: Record<Upgrade['rarity'], string> = {
    COMMON: '#6f675c',
    RARE: '#c4472a',
    EPIC: '#7c3ec4',
    LEGENDARY: '#e2a01f',
};

export const SERUM_WINDOW_MS = 8000;

export function serumWindowMs(difficulty: Difficulty): number {
    if (difficulty === Difficulty.EASY) return 12000;
    if (difficulty === Difficulty.HARD) return 6000;
    if (difficulty === Difficulty.APEX) return 4200;
    return SERUM_WINDOW_MS;
}

export function serumWeight(u: Upgrade): number {
    const rarity = u.rarity === 'LEGENDARY' ? 0.035 : u.rarity === 'EPIC' ? 0.12 : u.rarity === 'RARE' ? 0.34 : 1;
    const heal = u.id === 'membrane' || u.id === 'lifesteal' ? 0.28 : 1;
    return rarity * heal * (1.2 - (u.level / u.maxLevel) * 0.4);
}

export function rollSerumOffers(upgrades: Upgrade[]): string[] {
    const pool = upgrades.filter(u => u.level < u.maxLevel);
    if (pool.length === 0) return [];
    const count = pool.length <= 2 ? pool.length : (Math.random() < 0.3 ? 3 : 2);
    const weight = (u: Upgrade) => serumWeight(u);
    const bag = [...pool];
    const picked: string[] = [];
    while (picked.length < count && bag.length) {
        const total = bag.reduce((sum, u) => sum + weight(u), 0);
        let roll = Math.random() * total;
        let index = bag.length - 1;
        for (let i = 0; i < bag.length; i++) {
            roll -= weight(bag[i]);
            if (roll <= 0) { index = i; break; }
        }
        picked.push(bag.splice(index, 1)[0].id);
    }
    return picked;
}

export function upgradeCost(upgrade: Upgrade): number {
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level));
}

type Pulse = { id: string; kind: 'ok' | 'no'; token: number; cost: number } | null;

type CardProps = {
    upgrade: Upgrade;
    language: Language;
    t: (key: string) => string;
    mode: 'shop' | 'offer';
    canAfford: boolean;
    cost: number;
    hotkey?: string;
    forced?: boolean;
    pulse: Pulse;
    guard?: () => boolean;
    onPress: () => void;
};

const MutationCard: React.FC<CardProps> = ({
    upgrade, t, mode, canAfford, cost, hotkey, forced, pulse, guard, onPress
}) => {
    const maxed = upgrade.level >= upgrade.maxLevel;
    const alive = mode === 'offer' || (!maxed && canAfford);
    const rank = upgrade.maxLevel > 0 ? upgrade.level / upgrade.maxLevel : 0;
    const ink = RARITY_INK[upgrade.rarity];
    const art = ART[upgrade.id] ?? ART.mitosis;
    const pulsing = pulse?.id === upgrade.id ? pulse : null;

    const fire = () => {
        if (guard && !guard()) return;
        if (mode === 'shop' && maxed) return;
        onPress();
    };

    const label = maxed
        ? t('MAXED')
        : mode === 'offer'
            ? t('SERUM_TAKE')
            : `${t('LAB_EVOLVE')} [${cost}]`;

    const wash = upgrade.rarity === 'RARE'
        ? `linear-gradient(90deg, rgba(196,71,42,0.34), transparent 26%), radial-gradient(circle at ${art.wash}, ${art.tint}b0, transparent 36%)`
        : `radial-gradient(circle at ${art.wash}, ${art.tint}c4, transparent 34%)`;

    return (
        <div className="lab-slot">
        <button
            type="button"
            disabled={mode === 'shop' && (maxed || !canAfford)}
            aria-label={`${t(upgrade.nameKey)}. ${label}`}
            onClick={(event) => {
                event.stopPropagation();
                fire();
            }}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    fire();
                }
            }}
            className={`lab-card is-${upgrade.rarity.toLowerCase()} ${mode === 'offer' ? 'is-offer' : ''} ${alive ? 'is-hot' : ''} ${!alive && !maxed ? 'is-poor' : ''} ${maxed ? 'is-max' : ''} ${forced ? 'is-forced' : ''}`}
            style={{
                ['--ink' as string]: ink,
                ['--accent' as string]: art.tint,
                ['--rank' as string]: rank,
                touchAction: 'manipulation',
            }}
        >
            <img className="lab-shell" src={CARD_BG} alt="" draggable={false} />
            <span className="lab-shade" />
            <span className="lab-snow" />
            <span className="lab-wash" style={{ background: wash }} />
            <span className="lab-art-glow" />
            <img className="lab-art" src={art.src} alt="" draggable={false} />

            <div className="lab-rarity">{t(RARITY_KEY[upgrade.rarity])}</div>
            <div className="lab-level">
                <span>{t('STAT_LEVEL')}</span>
                <strong>{upgrade.level}/{upgrade.maxLevel}</strong>
            </div>
            <div
                className={`lab-meter ${rank <= 0 ? 'is-empty' : ''} ${pulsing?.kind === 'ok' ? 'is-fresh' : ''}`}
                style={{ ['--steps' as string]: Math.max(1, upgrade.maxLevel) }}
                aria-hidden
            >
                <b />
            </div>

            <div className="lab-copy">
                <div className="lab-name">{t(upgrade.nameKey)}</div>
                <div className="lab-desc">{t(upgrade.descKey)}</div>
            </div>

            <div className={`lab-evolve ${maxed ? 'is-maxed' : ''}`}>{label}</div>
            {hotkey && <div className="lab-key">{hotkey}</div>}

            <span className="lab-sheen" />
            {(upgrade.rarity === 'EPIC' || upgrade.rarity === 'LEGENDARY') && <span className="lab-scan" />}
            {upgrade.rarity === 'LEGENDARY' && <span className="lab-glint" />}
            <span className="lab-rim" />

            {pulsing?.kind === 'ok' && (
                <span key={pulsing.token}>
                    <span className="lab-flash" />
                    <span className="lab-burst" />
                    {mode === 'shop' && <span className="lab-float">-{pulsing.cost}</span>}
                </span>
            )}
            {pulsing?.kind === 'no' && <span className="lab-deny-flash" />}
        </button>
        </div>
    );
};

type LabProps = {
    upgrades: Upgrade[];
    biomass: number;
    language: Language;
    t: (key: string) => string;
    pulse: Pulse;
    onBuy: (id: string) => void;
    onClose: () => void;
};

export const BioLab: React.FC<LabProps> = ({ upgrades, biomass, language, t, pulse, onBuy, onClose }) => {
    const [tick, setTick] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [rail, setRail] = useState({ show: false, thumb: 0.3, top: 0 });
    const scrollerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setTick(true);
        const timer = window.setTimeout(() => setTick(false), 280);
        return () => window.clearTimeout(timer);
    }, [biomass]);

    useEffect(() => {
        const el = scrollerRef.current;
        if (!el) return;
        const sync = () => {
            const overflow = el.scrollHeight - el.clientHeight;
            const more = overflow - el.scrollTop > 8;
            setShowHint(more && el.scrollTop < 24);
            const show = overflow > 8;
            const thumb = show ? Math.max(0.18, el.clientHeight / el.scrollHeight) : 1;
            const top = show ? (el.scrollTop / overflow) * (1 - thumb) : 0;
            setRail({ show, thumb, top });
        };
        sync();
        const obs = new ResizeObserver(sync);
        obs.observe(el);
        el.addEventListener('scroll', sync, { passive: true });
        return () => {
            obs.disconnect();
            el.removeEventListener('scroll', sync);
        };
    }, [upgrades.length]);

    return (
        <div className="lab-screen">
            <div className="lab-veins" aria-hidden>
                <div className="vein-drift" />
                <div className="vein-drift-b" />
            </div>
            <header className="lab-head">
                <div className="lab-brand">
                    <svg viewBox="0 0 40 40" aria-hidden>
                        <path d="M14.6 21.5 11.4 32.2c-.7 2.1.9 4.2 3.1 4.2h11c2.2 0 3.8-2.1 3.1-4.2L25.4 21.5z" fill="#c084fc" />
                        <path d="M15.2 24.4c1.8 1.1 3.2.1 5-.1 1.6-.2 2.8.9 4.6.3M15.4 27.6c1.7-1 3.2 0 4.8.3 1.5.3 2.8-.8 4.4-.1" fill="none" stroke="#f6edff" strokeWidth="1.35" strokeLinecap="round" />
                        <path d="M16.2 5h7.6M17.4 5v6.4L12.2 31.6c-.9 2.3.8 4.8 3.3 4.8h9c2.5 0 4.2-2.5 3.3-4.8L22.6 11.4V5" fill="none" stroke="#f7f2ff" strokeWidth="2.15" strokeLinejoin="round" strokeLinecap="round" />
                    </svg>
                    <span>{t('MUTATION')}</span>
                </div>
                <div className="lab-readout">
                    <span>{t('LAB_BIOMASS')}</span>
                    <strong className={tick ? 'is-tick' : ''}>{Math.round(biomass)}</strong>
                </div>
            </header>
            <div className={`lab-tray ${showHint ? 'has-more' : ''}`}>
                <div className="lab-grid" ref={scrollerRef}>
                    {upgrades.map((upgrade) => {
                        const cost = upgradeCost(upgrade);
                        const canAfford = biomass >= cost;
                        return (
                            <MutationCard
                                key={upgrade.id}
                                upgrade={upgrade}
                                language={language}
                                t={t}
                                mode="shop"
                                canAfford={canAfford}
                                cost={cost}
                                pulse={pulse}
                                onPress={() => onBuy(upgrade.id)}
                            />
                        );
                    })}
                </div>
                {rail.show && (
                    <div className="lab-rail" aria-hidden>
                        <i style={{ height: `${rail.thumb * 100}%`, top: `${rail.top * 100}%` }} />
                    </div>
                )}
            </div>
            <div className={`lab-more ${showHint ? '' : 'is-hidden'}`}>
                <i />
                <em>{t('LAB_SCROLL')}</em>
            </div>
            <button type="button" className="lab-back" onClick={onClose}>{t('LAB_BACK')}</button>
        </div>
    );
};

type OfferProps = {
    ids: string[];
    upgrades: Upgrade[];
    language: Language;
    t: (key: string) => string;
    now: number;
    endsAt: number;
    collapseId: string | null;
    windowMs?: number;
    onPick: (id: string) => void;
};

export const SerumOffer: React.FC<OfferProps> = ({
    ids, upgrades, language, t, now, endsAt, collapseId, windowMs = SERUM_WINDOW_MS, onPick
}) => {
    const left = Math.max(0, endsAt - now);
    const ratio = Math.max(0, Math.min(1, left / windowMs));
    const urgent = left < Math.min(2200, windowMs * 0.34);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            const index = ['1', '2', '3'].indexOf(event.key);
            if (index >= 0 && ids[index]) onPick(ids[index]);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [ids, onPick]);

    return (
        <div className="serum-screen">
            <div className="serum-head">
                <div className="serum-mark" aria-hidden>
                    <svg viewBox="0 0 64 64">
                        <defs>
                            <linearGradient id="serumFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0" stopColor="#d8fffb" />
                                <stop offset="0.45" stopColor="#3ad8ff" />
                                <stop offset="1" stopColor="#ff3ad0" />
                            </linearGradient>
                        </defs>
                        <rect x="24" y="6" width="16" height="8" rx="2" fill="#d5e2ee" stroke="#102028" strokeWidth="2" />
                        <rect x="16" y="14" width="32" height="42" rx="12" fill="#2a1248" stroke="#f7fbff" strokeWidth="3" />
                        <rect x="20" y="22" width="24" height="28" rx="8" fill="url(#serumFill)" />
                        <path d="M33 27 l6 8 h-4 l5 10 -11-12 h4 z" fill="#fff" stroke="#1a0614" strokeWidth="1.2" />
                    </svg>
                    <em>{t('SERUM_TAG')}</em>
                </div>
                <h2>{collapseId ? t('SERUM_UNSTABLE') : t('SERUM_TITLE')}</h2>
                <p>{t('SERUM_SUB')}</p>
                <div className={`serum-timer ${urgent ? 'is-urgent' : ''}`}>
                    <i style={{ width: `${ratio * 100}%` }} />
                </div>
                <b className={urgent ? 'is-urgent' : ''}>{(left / 1000).toFixed(1)}</b>
            </div>
            <div className="serum-row" style={{ ['--n' as string]: ids.length }}>
                {ids.map((id, index) => {
                    const upgrade = upgrades.find(u => u.id === id);
                    if (!upgrade) return null;
                    return (
                        <div key={id} className="serum-slot" style={{ animationDelay: `${index * 0.08}s` }}>
                            <MutationCard
                                upgrade={upgrade}
                                language={language}
                                t={t}
                                mode="offer"
                                canAfford
                                cost={0}
                                hotkey={String(index + 1)}
                                forced={collapseId === id}
                                pulse={null}
                                onPress={() => onPick(id)}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const mutationCardStyles = `
.lab-screen, .serum-screen { font-family: 'Chakra Petch', sans-serif; }
.lab-screen {
    position: absolute;
    inset: 0;
    z-index: 50;
    display: flex;
    flex-direction: column;
    background:
        radial-gradient(ellipse at 50% 0%, rgba(226, 168, 72, 0.16), transparent 36%),
        radial-gradient(ellipse at 50% 78%, rgba(110, 16, 28, 0.5), rgba(14, 4, 8, 0.96) 70%),
        #14060a;
    overflow: hidden;
}
.lab-veins {
    position: absolute;
    inset: -8%;
    opacity: 0.55;
    pointer-events: none;
}
.lab-veins .vein-drift,
.lab-veins .vein-drift-b {
    animation: none;
    will-change: auto;
}
.lab-head {
    position: relative;
    z-index: 2;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    margin: 0.55rem 2.4% 0;
    padding: 0.42rem 0.85rem 0.38rem;
    background:
        linear-gradient(180deg, rgba(255, 220, 150, 0.16), rgba(42, 16, 12, 0.35));
    border: 1px solid rgba(226, 160, 31, 0.72);
    border-bottom: none;
    box-shadow: inset 0 0 0 1px rgba(18, 6, 8, 0.85);
}
.lab-brand {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    min-width: 0;
}
.lab-brand svg { width: 40px; height: 40px; flex: none; display: block; }
.lab-brand span {
    color: #fff6e4;
    font-family: 'Teko', sans-serif;
    font-size: clamp(26px, 2.6vw, 40px);
    letter-spacing: 0.06em;
    line-height: 0.85;
    text-shadow: 0 2px 0 rgba(0,0,0,0.55);
}
.lab-readout {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.15rem 0.7rem 0.12rem 0.45rem;
    border-radius: 999px;
    background: radial-gradient(circle at 18% 50%, #ffe7a8, #c48820 42%, #5c3a0c 78%);
    box-shadow: inset 0 0 0 2px rgba(255, 236, 180, 0.7), 0 4px 0 rgba(0,0,0,0.35);
}
.lab-readout span {
    color: #3a240c;
    font-weight: 700;
    letter-spacing: 0.14em;
    font-size: clamp(10px, 1.05vw, 13px);
    line-height: 1;
    transform: translateY(0.08em);
}
.lab-readout strong {
    color: #2a1608;
    font-family: 'Teko', sans-serif;
    font-size: clamp(26px, 2.6vw, 38px);
    font-weight: 600;
    line-height: 1;
    transform: translateY(0.06em);
    text-shadow: 0 1px 0 rgba(255, 244, 210, 0.45);
}
.lab-readout strong.is-tick { animation: lab-biomass 0.28s ease; }
.lab-tray {
    position: relative;
    z-index: 1;
    flex: 1;
    min-height: 0;
    container-type: inline-size;
    margin: 0 2.4% 0;
    border: 1px solid rgba(226, 160, 31, 0.72);
    border-radius: 0;
    background:
        linear-gradient(180deg, rgba(255, 214, 150, 0.05), transparent 14%),
        #12060a;
    box-shadow:
        inset 0 0 0 5px #12060a,
        inset 0 0 0 6px rgba(226, 160, 31, 0.28);
}
.lab-tray::before {
    content: none;
}
.lab-tray.has-more::after {
    content: '';
    position: absolute;
    left: 10px;
    right: 18px;
    bottom: 8px;
    height: 22px;
    border-radius: 0 0 12px 12px;
    background: linear-gradient(transparent, rgba(10, 3, 6, 0.55));
    pointer-events: none;
    z-index: 2;
}
.lab-grid {
    position: relative;
    z-index: 1;
    height: 100%;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: clamp(8px, 1.15vw, 18px);
    padding: 0.7rem 0.9rem 0.85rem;
    overflow-y: auto;
    align-content: start;
    justify-items: stretch;
    cursor: auto;
    scrollbar-width: none;
    padding-right: 28px;
}
.lab-grid::-webkit-scrollbar { width: 0; height: 0; }
.lab-rail {
    position: absolute;
    z-index: 4;
    top: 10px;
    right: 8px;
    bottom: 10px;
    width: 16px;
    border-radius: 3px;
    pointer-events: none;
    background: #2a241c;
    box-shadow: inset 0 0 0 2px #14110e, 0 0 0 1px #c9a24a;
}
.lab-rail i {
    position: absolute;
    left: 2px;
    right: 2px;
    border-radius: 2px;
    background: repeating-linear-gradient(-45deg, #14110c 0 6px, #f2c014 6px 12px);
    box-shadow: inset 0 0 0 1.5px #12100c;
}
.lab-more {
    position: relative;
    z-index: 2;
    align-self: center;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin: 0.15rem auto 0;
    padding: 0;
    background: none;
    border: none;
    color: #ffe08a;
    letter-spacing: 0.18em;
    font-weight: 700;
    font-size: 11px;
    pointer-events: none;
    box-shadow: none;
    animation: lab-hint 1.35s ease-in-out infinite;
}
.lab-more i {
    width: 0;
    height: 0;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 6px solid #ffe08a;
}
.lab-more.is-hidden { display: none; }
.lab-back {
    position: relative;
    z-index: 1;
    margin: 0.2rem auto 0.55rem;
    padding: 0.2rem 0.2rem 0.15rem;
    background: none;
    border: none;
    border-bottom: 1px solid rgba(226, 176, 96, 0.7);
    border-radius: 0;
    color: #f7f1e4;
    letter-spacing: 0.22em;
    font-family: 'Teko', sans-serif;
    font-size: clamp(18px, 1.8vw, 26px);
    line-height: 1;
    cursor: pointer;
    box-shadow: none;
    transition: color 0.12s ease;
}
.lab-back:hover { color: #ffe08a; }
.lab-back:active { color: #fff; }
.lab-slot {
    position: relative;
    width: 100%;
    aspect-ratio: 1100 / 496;
    container-type: inline-size;
}
.lab-card {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    border: 0;
    padding: 0;
    margin: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    border-radius: 8px;
    outline: none;
    user-select: none;
    box-shadow: 0 7px 0 rgba(0,0,0,0.45);
    transition: transform 0.08s ease, box-shadow 0.08s ease;
    touch-action: manipulation;
    cursor: pointer;
}
.lab-card:disabled { opacity: 1; cursor: default; }
.lab-shell, .lab-art {
    position: absolute;
    display: block;
    pointer-events: none;
}
.lab-shell { inset: 0; width: 100%; height: 100%; object-fit: fill; }
.lab-wash, .lab-art-glow, .lab-sheen, .lab-scan, .lab-glint, .lab-rim, .lab-flash, .lab-burst, .lab-deny-flash {
    position: absolute;
    pointer-events: none;
}
.lab-wash { inset: 0; opacity: 0.28; }
.lab-art-glow {
    right: 6%;
    top: 26%;
    width: 24%;
    height: 38%;
    z-index: 1;
    background: radial-gradient(circle, color-mix(in srgb, var(--accent) 70%, transparent) 0%, transparent 72%);
    opacity: calc(0.12 + var(--rank) * 0.14);
}
.lab-art {
    right: 1.6%;
    top: 21.6%;
    width: 31.2%;
    height: 49%;
    object-fit: contain;
    object-position: center bottom;
    transform-origin: 72% 88%;
    filter: drop-shadow(0 6px 0 rgba(0,0,0,0.28));
    transition: transform 0.18s ease;
    z-index: 2;
}
.lab-rarity {
    position: absolute;
    z-index: 3;
    left: 0.8%;
    top: 2.6%;
    width: 23%;
    height: 13%;
    display: flex;
    align-items: center;
    padding: 0 0.8em 0.05em 0.55em;
    background: var(--ink);
    color: #fff;
    font-family: 'Teko', sans-serif;
    font-size: 4.5cqw;
    letter-spacing: 0.06em;
    line-height: 1;
    text-transform: uppercase;
    clip-path: polygon(0 10%, 100% 0, 86% 100%, 0 90%);
    text-shadow: 0 1px 0 rgba(0,0,0,0.4);
}
.lab-card.is-legendary .lab-rarity { color: #2a1608; text-shadow: none; }
.lab-level {
    position: absolute;
    z-index: 4;
    right: 1.8%;
    top: 3.2%;
    width: 26.8%;
    height: 16.2%;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 0.28em;
    color: #f7f2e8;
    font-family: 'Teko', sans-serif;
    line-height: 1;
    white-space: nowrap;
    text-shadow: 0 1px 0 rgba(0,0,0,0.85);
}
.lab-level::before {
    content: '';
    position: absolute;
    inset: 18% 8% 16%;
    background: radial-gradient(circle at 50% 60%, var(--accent), transparent 72%);
    opacity: calc(var(--rank) * 0.55);
    pointer-events: none;
}
.lab-level span,
.lab-level strong {
    position: relative;
    transform: translateY(0.06em);
}
.lab-level span {
    font-size: 3.05cqw;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    opacity: 0.9;
}
.lab-level strong {
    font-size: 4.35cqw;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: #fff8ea;
}
.lab-copy {
    position: absolute;
    z-index: 3;
    left: 4.2%;
    top: 18.5%;
    width: 61%;
    height: 48%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.08em;
}
.lab-name {
    color: #f8f4ec;
    font-family: 'Teko', sans-serif;
    font-weight: 600;
    font-size: 6.15cqw;
    letter-spacing: 0.02em;
    line-height: 1.05;
    padding-top: 0.06em;
    text-transform: uppercase;
    text-shadow: 0 2px 0 rgba(0,0,0,0.65);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
.lab-desc {
    color: #f3e6c8;
    font-weight: 600;
    font-size: 2.7cqw;
    line-height: 1.16;
    text-shadow: 0 1px 0 rgba(0,0,0,0.75);
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
.lab-meter {
    position: absolute;
    z-index: 4;
    left: 43.4%;
    top: 3.7%;
    width: 17.2%;
    height: 4.8%;
    overflow: hidden;
    border-radius: 1px;
    background: rgba(6, 4, 2, 0.42);
    box-shadow:
        inset 0 0 0 1px rgba(255, 214, 140, 0.42),
        inset 0 1px 2px rgba(0, 0, 0, 0.65);
}
.lab-meter b {
    position: absolute;
    top: 1px;
    bottom: 1px;
    left: 1px;
    width: calc((100% - 2px) * var(--rank));
    background: linear-gradient(180deg, #fff6d2 0%, var(--accent) 62%, rgba(0,0,0,0.28) 100%);
    transition: width 0.35s ease;
}
.lab-meter::after {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(90deg,
        transparent 0,
        transparent calc(100% / var(--steps) - 1px),
        rgba(8, 5, 2, 0.85) calc(100% / var(--steps) - 1px),
        rgba(8, 5, 2, 0.85) calc(100% / var(--steps)));
    pointer-events: none;
}
.lab-meter.is-empty b { opacity: 0; }
.lab-meter.is-fresh b { filter: brightness(1.4); }
.lab-evolve {
    position: absolute;
    z-index: 3;
    left: 27%;
    top: 73.1%;
    width: 46%;
    height: 20.2%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #f7f1e4;
    font-family: 'Chakra Petch', sans-serif;
    font-weight: 700;
    letter-spacing: 0.04em;
    font-size: 3.25cqw;
    line-height: 1;
    text-transform: uppercase;
    white-space: nowrap;
}
.lab-evolve.is-maxed { color: #ffe08a; }
.lab-key {
    position: absolute;
    z-index: 5;
    left: 6.4%;
    bottom: 9.5%;
    width: 7%;
    aspect-ratio: 1;
    border-radius: 999px;
    background: #14080c;
    color: #fff;
    border: 2px solid var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Teko', sans-serif;
    font-size: 4.4cqw;
    line-height: 1;
    box-shadow: 0 0 10px var(--accent);
}
.lab-sheen, .lab-scan, .lab-glint {
    z-index: 2;
    will-change: transform;
}
.lab-sheen {
    inset: 0;
    background: linear-gradient(105deg, transparent 42%, rgba(255,255,255,0.16) 50%, transparent 58%);
    transform: translate3d(-140%, 0, 0);
    opacity: 0.4;
}
.lab-scan {
    left: 0;
    right: 0;
    top: 0;
    height: 22%;
    background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--accent) 62%, white), transparent);
    transform: translate3d(0, -140%, 0);
    animation: lab-scan 7.2s linear infinite;
    opacity: 0.72;
}
.lab-card.is-legendary .lab-scan {
    height: 30%;
    background: linear-gradient(180deg, transparent 0%, rgba(255, 214, 120, 0.18) 28%, rgba(255, 250, 226, 0.96) 50%, rgba(255, 176, 48, 0.22) 74%, transparent 100%);
    animation-duration: 6.4s;
    opacity: 1;
}
.lab-glint {
    top: -18%;
    bottom: -18%;
    left: 0;
    width: 18%;
    background: linear-gradient(100deg, transparent 18%, rgba(255, 236, 170, 0.35) 38%, rgba(255, 255, 250, 0.98) 50%, rgba(255, 210, 90, 0.4) 62%, transparent 82%);
    transform: translate3d(-240%, 0, 0);
    animation: lab-glint 5.6s ease-in-out infinite;
    opacity: 1;
}
.lab-rim {
    inset: 0;
    border-radius: 8px;
    box-shadow: inset 0 0 0 calc(1px + var(--rank) * 5px) var(--ink);
    opacity: calc(0.08 + var(--rank) * 0.92);
}
.lab-shade {
    position: absolute;
    inset: 0;
    z-index: 2;
    background: rgba(5, 7, 14, 0.72);
    opacity: 0;
    pointer-events: none;
}
.lab-card.is-hot { cursor: pointer; }
.lab-card.is-hot .lab-evolve {
    color: #ffe7a8;
    text-shadow: 0 1px 0 #1a1008, 0 0 10px rgba(255, 196, 70, 0.85);
}
@media (hover: hover) and (pointer: fine) {
    .lab-card.is-hot:hover,
    .lab-card.is-hot:focus-visible {
        box-shadow: 0 10px 0 rgba(0,0,0,0.28), 0 0 0 1px var(--ink);
        filter: brightness(1.05);
    }
    .lab-card.is-hot:hover .lab-art,
    .lab-card.is-hot:focus-visible .lab-art { transform: scale(1.04); }
}
.lab-card:not(.is-poor):not(.is-max) .lab-sheen {
    animation: lab-sheen 13s ease-in-out infinite;
}
.lab-card.is-rare:not(.is-poor):not(.is-max) .lab-sheen {
    background: linear-gradient(105deg, transparent 38%, color-mix(in srgb, var(--accent) 48%, white) 50%, transparent 62%);
    animation-duration: 9.5s;
    opacity: 0.7;
}
.lab-card.is-epic:not(.is-poor):not(.is-max) .lab-sheen {
    background: linear-gradient(105deg, transparent 36%, color-mix(in srgb, var(--accent) 58%, white) 50%, transparent 64%);
    animation-duration: 8.2s;
    opacity: 0.55;
}
.lab-card.is-legendary:not(.is-poor):not(.is-max) .lab-sheen {
    background: linear-gradient(105deg, transparent 30%, rgba(255, 214, 120, 0.2) 42%, rgba(255, 252, 236, 0.92) 50%, rgba(255, 186, 48, 0.28) 58%, transparent 70%);
    animation-duration: 6.8s;
    opacity: 0.95;
}
.lab-slot:nth-child(3n) .lab-sheen,
.serum-slot:nth-child(2) .lab-sheen { animation-delay: -4s; }
.lab-slot:nth-child(3n + 1) .lab-sheen,
.serum-slot:nth-child(3) .lab-sheen { animation-delay: -7.5s; }
.lab-slot:nth-child(odd) .lab-scan,
.serum-slot:nth-child(2) .lab-scan { animation-delay: -2.4s; }
.lab-slot:nth-child(3n) .lab-glint { animation-delay: -3s; }
.lab-card.is-hot:active {
    filter: brightness(0.94);
    box-shadow: 0 4px 0 rgba(0,0,0,0.5);
    transition-duration: 0.04s;
}
.lab-card.is-hot:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.lab-card.is-poor { cursor: default; }
.lab-card.is-poor .lab-shell {
    filter: brightness(0.52) saturate(0.72) sepia(0.34) hue-rotate(-14deg) contrast(1.08);
}
.lab-card.is-poor .lab-wash { opacity: 0.2; }
.lab-card.is-poor .lab-art-glow { opacity: 0.05; }
.lab-card.is-poor .lab-shade {
    z-index: 1;
    opacity: 1;
    background: rgba(132, 24, 28, 0.4);
}
.lab-card.is-poor .lab-snow {
    z-index: 2;
    opacity: 0.55;
    mix-blend-mode: screen;
    background-image:
        repeating-linear-gradient(0deg, rgba(255, 64, 56, 0.14) 0 1px, transparent 1px 6px),
        url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.42' numOctaves='1' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0 0 0 0 1  0 0 0 0 0.1  0 0 0 0 0.08  0.5 0 0 0 -0.2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
    background-size: 100% 6px, 180px 180px;
    animation: lab-snow 1.4s steps(2) infinite;
}
.lab-card.is-poor .lab-art {
    z-index: 3;
    filter: saturate(0.9) brightness(0.96) contrast(1.04) drop-shadow(0 6px 0 rgba(0,0,0,0.4));
}
.lab-card.is-poor .lab-rarity,
.lab-card.is-poor .lab-copy,
.lab-card.is-poor .lab-evolve { z-index: 5; }
.lab-card.is-poor .lab-level,
.lab-card.is-poor .lab-meter,
.lab-card.is-poor .lab-key { z-index: 6; }
.lab-card.is-poor .lab-rim { z-index: 4; }
.lab-card.is-poor .lab-scan,
.lab-card.is-poor .lab-glint { display: none; }
.lab-card.is-poor .lab-evolve { opacity: 1; color: #f0b2a8; text-shadow: 0 1px 0 rgba(0,0,0,0.8); }
.lab-snow {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    opacity: 0;
}
.lab-card.is-max {
    cursor: default;
    background: #3a2a08;
    box-shadow: 0 0 0 4px #ffe08a, 0 0 0 9px #6a4208, 0 7px 0 #2a1c04;
    filter: saturate(0.55);
}
.lab-card.is-max .lab-art { filter: grayscale(0.85) brightness(0.72) contrast(1.05); }
.lab-card.is-max .lab-wash { opacity: 1; background: linear-gradient(180deg, rgba(255, 214, 90, 0.55), rgba(80, 50, 0, 0.35) 70%) !important; }
.lab-card.is-max .lab-sheen,
.lab-card.is-max .lab-scan,
.lab-card.is-max .lab-glint { animation: none; opacity: 0; }
.lab-card.is-max .lab-name { color: #ffe7a8; }
.lab-card.is-max .lab-evolve {
    z-index: 6;
    color: #3a2504;
    background: linear-gradient(#fff6cc, #e2a01f);
    border-radius: 4px;
    box-shadow: 0 0 0 2px #fff1b8, 0 0 18px rgba(255, 200, 60, 0.9);
}
.lab-card.is-max .lab-rim {
    box-shadow: inset 0 0 0 6px #ffe08a;
    opacity: 1;
}
.lab-card.is-max .lab-meter b { background: #ffe08a; }
.lab-card.is-offer .lab-evolve { animation: lab-invite 1.15s ease-in-out infinite; }
.lab-card.is-forced {
    transform: translateY(-8px) scale(1.04);
    filter: drop-shadow(0 0 16px #ff4ad4) drop-shadow(0 12px 0 rgba(0,0,0,0.34));
}
.lab-card.is-legendary .lab-name { text-shadow: 0 2px 0 rgba(0,0,0,0.65), 0 0 10px rgba(255, 196, 70, 0.55); }
.lab-flash, .lab-deny-flash {
    inset: 0;
    animation: lab-flash 0.22s ease forwards;
}
.lab-flash { background: radial-gradient(circle at 50% 62%, rgba(255, 225, 140, 0.4), transparent 62%); }
.lab-deny-flash { background: rgba(255, 36, 48, 0.2); }
.lab-burst {
    left: 22%;
    top: 68%;
    width: 56%;
    height: 24%;
    border-radius: 6px;
    box-shadow: inset 0 0 14px var(--accent), 0 0 12px var(--accent);
    animation: lab-burst 0.45s ease forwards;
}
.lab-float {
    position: absolute;
    z-index: 6;
    left: 50%;
    bottom: 30%;
    color: #ffe14a;
    font-family: 'Teko', sans-serif;
    font-size: 8cqw;
    line-height: 1;
    text-shadow: 0 2px 0 #1a1008, 0 0 12px #ffbf1a;
    pointer-events: none;
    animation: lab-float 0.7s ease forwards;
}
.serum-screen {
    position: absolute;
    inset: 0;
    z-index: 80;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 1.2rem;
    padding: 2vh 4vw 3vh;
    background: radial-gradient(ellipse at 50% 40%, rgba(80, 0, 40, 0.28), rgba(4, 0, 8, 0.82) 70%);
    backdrop-filter: blur(2px);
}
.serum-head { text-align: center; color: #fff; }
.serum-mark {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    margin-bottom: 0.2rem;
}
.serum-mark svg { width: 42px; height: 42px; filter: drop-shadow(0 0 8px rgba(58, 216, 255, 0.8)); }
.serum-mark em {
    font-style: normal;
    font-family: 'Teko', sans-serif;
    font-size: 22px;
    letter-spacing: 0.14em;
    line-height: 1;
    color: #fff;
    background: #12040c;
    border: 2px solid #7af7ff;
    padding: 0.15rem 0.5rem 0.05rem;
}
.serum-head h2 {
    margin: 0.15rem 0 0;
    font-family: 'Teko', sans-serif;
    font-weight: 600;
    font-size: clamp(26px, 3.2vw, 46px);
    letter-spacing: 0.12em;
    line-height: 0.9;
    text-shadow: 0 0 18px rgba(255, 74, 212, 0.55);
}
.serum-head p {
    margin: 0.2rem 0 0.55rem;
    color: #f0d6ea;
    letter-spacing: 0.06em;
    font-size: clamp(12px, 1.4vw, 16px);
}
.serum-timer {
    width: min(520px, 70%);
    height: 10px;
    margin: 0 auto;
    background: #1a0c12;
    border: 1px solid rgba(255,255,255,0.25);
    overflow: hidden;
}
.serum-timer i {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, #3ad8ff, #ff4ad4);
}
.serum-timer.is-urgent i { background: #ff2d3a; }
.serum-head b {
    display: inline-block;
    margin-top: 0.35rem;
    font-family: 'Teko', sans-serif;
    font-size: 1.4rem;
    font-weight: 600;
    color: #ffe14a;
    line-height: 1;
}
.serum-head b.is-urgent { color: #ff5a66; }
.serum-row {
    display: flex;
    justify-content: center;
    align-items: stretch;
    gap: clamp(10px, 1.6vw, 22px);
    width: 100%;
    margin: 0 auto;
}
.serum-slot {
    flex: 1 1 0;
    min-width: 0;
    max-width: 340px;
    animation: serum-in 0.42s cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes lab-pop {
    0% { transform: scale(1); }
    28% { transform: scale(0.94); }
    62% { transform: scale(1.055); }
    100% { transform: scale(1); }
}
@keyframes lab-deny {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-7px); }
    40% { transform: translateX(7px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
}
@keyframes lab-flash { from { opacity: 0.85; } to { opacity: 0; } }
@keyframes lab-float {
    from { opacity: 1; transform: translate(-50%, 0); }
    to { opacity: 0; transform: translate(-50%, -28px); }
}
@keyframes lab-burst {
    from { opacity: 0.9; transform: scale(0.86); }
    to { opacity: 0; transform: scale(1.08); }
}
@keyframes lab-pip {
    0% { transform: scaleY(0.25); }
    55% { transform: scaleY(1.45); }
    100% { transform: scaleY(1); }
}
@keyframes lab-biomass {
    from { transform: scale(1.18); color: #fff; }
    to { transform: scale(1); }
}
@keyframes lab-sheen {
    from { transform: translate3d(-140%, 0, 0); }
    to { transform: translate3d(140%, 0, 0); }
}
@keyframes lab-snow {
    from { background-position: 0 0, 0 0; }
    to { background-position: 0 4px, 0 0; }
}
@keyframes lab-scan {
    from { transform: translate3d(0, -140%, 0); }
    to { transform: translate3d(0, 460%, 0); }
}
@keyframes lab-glint {
    0% { transform: translate3d(-240%, 0, 0); }
    38% { transform: translate3d(620%, 0, 0); }
    100% { transform: translate3d(620%, 0, 0); }
}
@keyframes lab-invite {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.06); }
}
@keyframes lab-hint {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(3px); }
}
@keyframes serum-in {
    from { opacity: 0; transform: translateY(28px) scale(0.94); }
    to { opacity: 1; transform: none; }
}
@container (max-width: 980px) {
    .lab-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@container (max-width: 560px) {
    .lab-grid { grid-template-columns: minmax(0, 1fr); }
}
@media (max-height: 520px) {
    .lab-head { margin: 0.28rem 2% 0.15rem; padding: 0.18rem 0.65rem; }
    .lab-brand svg { width: 32px; height: 32px; }
    .lab-brand span { font-size: 20px; }
    .lab-readout strong { font-size: 26px; }
    .lab-back { margin: 0.15rem auto 0.3rem; font-size: 18px; }
    .lab-card.is-hot:hover,
    .lab-card.is-hot:focus-visible { transform: translateY(-2px); }
    .serum-screen { gap: 0.4rem; padding: 1vh 3vw 1.2vh; }
    .serum-head h2 { font-size: 22px; }
    .serum-head p { margin: 0.05rem 0 0.25rem; font-size: 11px; }
    .serum-mark svg { width: 30px; height: 30px; }
}
@media (prefers-reduced-motion: reduce) {
    .lab-sheen, .lab-scan, .lab-glint, .lab-more, .lab-card.is-offer .lab-evolve, .lab-snow { animation: none; }
}
`;

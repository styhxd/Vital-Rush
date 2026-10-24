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

export function rollSerumOffers(upgrades: Upgrade[]): string[] {
    const pool = upgrades.filter(u => u.level < u.maxLevel);
    if (pool.length === 0) return [];
    const count = pool.length <= 2 ? pool.length : (Math.random() < 0.3 ? 3 : 2);
    const weight = (u: Upgrade) => {
        const rarity = u.rarity === 'LEGENDARY' ? 0.28 : u.rarity === 'EPIC' ? 0.55 : u.rarity === 'RARE' ? 1 : 1.12;
        return rarity * (1.35 - (u.level / u.maxLevel) * 0.45);
    };
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
        <div
            role="button"
            tabIndex={alive || mode === 'shop' ? 0 : -1}
            aria-disabled={!alive && mode === 'shop'}
            aria-label={`${t(upgrade.nameKey)}. ${label}`}
            onClick={() => {
                if (guard && !guard()) return;
                if (mode === 'shop' && maxed) return;
                onPress();
            }}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onPress();
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
            {upgrade.rarity === 'EPIC' && <span className="lab-scan" />}
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
        </div>
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
            const more = el.scrollHeight - el.clientHeight - el.scrollTop > 8;
            setShowHint(more && el.scrollTop < 24);
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
                    <svg viewBox="0 0 32 32" aria-hidden>
                        <path d="M16 3 l6 3.2 v7.2 l-6 3.2 -6-3.2 V6.2z" fill="none" stroke="#e2a01f" strokeWidth="1.6" />
                        <path d="M16 9.2 v6.2 M13.2 12.3 h5.6" stroke="#fff6d8" strokeWidth="1.6" strokeLinecap="square" />
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
        radial-gradient(ellipse at 50% 38%, rgba(132, 28, 40, 0.46), rgba(16, 4, 8, 0.94) 70%),
        #120408;
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
    margin: 0.55rem 2.4% 0.35rem;
    padding: 0.35rem 0.9rem 0.35rem 0.7rem;
    border: 1px solid rgba(226, 176, 96, 0.32);
    border-radius: 10px;
    background: linear-gradient(180deg, rgba(42, 24, 18, 0.72), rgba(12, 4, 6, 0.55));
    box-shadow: inset 0 0 0 1px rgba(0,0,0,0.35), 0 6px 0 rgba(0,0,0,0.25);
}
.lab-brand {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    min-width: 0;
}
.lab-brand svg { width: 28px; height: 28px; flex: none; }
.lab-brand span {
    color: #f6f1e6;
    font-family: 'Teko', sans-serif;
    font-size: clamp(22px, 2.4vw, 34px);
    letter-spacing: 0.08em;
    line-height: 1;
    transform: translateY(0.21em);
    text-shadow: 0 2px 0 rgba(0,0,0,0.55);
}
.lab-readout {
    display: flex;
    align-items: center;
    gap: 0.55rem;
}
.lab-readout span {
    color: #f4f1ea;
    font-weight: 700;
    letter-spacing: 0.12em;
    font-size: clamp(10px, 1.15vw, 14px);
    line-height: 1;
    transform: translateY(0.11em);
}
.lab-readout strong {
    color: #ffd84a;
    font-family: 'Teko', sans-serif;
    font-size: clamp(28px, 3vw, 42px);
    font-weight: 600;
    line-height: 1;
    transform: translateY(0.085em);
    text-shadow: 0 0 14px rgba(255, 196, 40, 0.7);
}
.lab-readout strong.is-tick { animation: lab-biomass 0.28s ease; }
.lab-tray {
    position: relative;
    z-index: 1;
    flex: 1;
    min-height: 0;
    container-type: inline-size;
    margin: 0.15rem 2.2% 0.15rem;
    border: 1px solid rgba(226, 176, 96, 0.34);
    border-radius: 16px;
    background:
        linear-gradient(180deg, rgba(255, 214, 140, 0.05), transparent 18%),
        rgba(0, 0, 0, 0.22);
    box-shadow: inset 0 0 0 1px rgba(0,0,0,0.45), inset 0 0 48px rgba(0,0,0,0.28);
}
.lab-tray::before {
    content: '';
    position: absolute;
    inset: 7px;
    border: 1px solid rgba(226, 176, 96, 0.14);
    border-radius: 11px;
    pointer-events: none;
    z-index: 2;
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
    scrollbar-width: thin;
    scrollbar-color: #e2a01f rgba(255,255,255,0.06);
}
.lab-grid::-webkit-scrollbar { width: 10px; }
.lab-grid::-webkit-scrollbar-track { background: rgba(255,255,255,0.04); border-radius: 8px; }
.lab-grid::-webkit-scrollbar-thumb {
    background: repeating-linear-gradient(-52deg, #24180d 0 4px, #e2a01f 4px 8px);
    border-radius: 8px;
}
.lab-more {
    position: relative;
    z-index: 2;
    align-self: center;
    display: flex;
    align-items: center;
    gap: 0.45rem;
    margin: 0.2rem auto 0;
    padding: 0.16rem 0.75rem 0.12rem;
    background: rgba(12, 6, 4, 0.88);
    border: 1px solid rgba(226, 176, 96, 0.6);
    border-radius: 999px;
    color: #ffe08a;
    letter-spacing: 0.16em;
    font-weight: 700;
    font-size: 11px;
    pointer-events: none;
    box-shadow: 0 3px 0 rgba(0,0,0,0.35);
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
    margin: 0.35rem auto 0.7rem;
    padding: 0.28rem 1.5rem 0.18rem;
    background: linear-gradient(#3a3228, #1a140e);
    border: 1px solid rgba(226, 176, 96, 0.5);
    border-radius: 6px;
    color: #f7f4ee;
    letter-spacing: 0.22em;
    font-family: 'Teko', sans-serif;
    font-size: clamp(18px, 1.8vw, 26px);
    line-height: 1;
    cursor: pointer;
    box-shadow: 0 4px 0 #0a0604;
    transition: transform 0.12s ease, box-shadow 0.12s ease, color 0.12s ease;
}
.lab-back:hover { color: #ffe08a; transform: translateY(-2px); }
.lab-back:active { transform: translateY(2px); box-shadow: 0 1px 0 #0a0604; }
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
    border-radius: 8px;
    outline: none;
    user-select: none;
    box-shadow: 0 7px 0 rgba(0,0,0,0.45);
    transition: transform 0.08s ease, box-shadow 0.08s ease;
    touch-action: manipulation;
}
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
.lab-wash { inset: 0; opacity: 0.72; }
.lab-art-glow {
    right: 2%;
    top: 18%;
    width: 34%;
    height: 52%;
    background: radial-gradient(circle, var(--accent) 0%, transparent 72%);
    opacity: calc(0.14 + var(--rank) * 0.32);
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
    z-index: 1;
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
.lab-sheen {
    inset: 0;
    background: linear-gradient(105deg, transparent 36%, rgba(255,255,255,0.22) 50%, transparent 64%);
    transform: translateX(-130%);
}
.lab-scan {
    left: 0;
    right: 0;
    top: 0;
    height: 28%;
    background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--accent) 72%, white), transparent);
    animation: lab-scan 5.5s linear infinite;
    opacity: 0.9;
}
.lab-glint {
    inset: -20% -40%;
    background: linear-gradient(100deg, transparent 40%, rgba(255, 236, 170, 0.9) 50%, transparent 60%);
    animation: lab-sheen 6.5s ease-in-out infinite;
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
        transform: translateY(-3px);
        box-shadow: 0 10px 0 rgba(0,0,0,0.35), 0 0 0 1px var(--ink);
    }
    .lab-card.is-hot:hover .lab-art,
    .lab-card.is-hot:focus-visible .lab-art { transform: scale(1.04); }
}
.lab-card:not(.is-offer):not(.is-poor):not(.is-max) .lab-sheen {
    background: linear-gradient(105deg, transparent 34%, color-mix(in srgb, var(--accent) 62%, white) 50%, transparent 66%);
    animation: lab-sheen 9s ease-in-out infinite;
    opacity: 0.72;
}
.lab-card.is-rare:not(.is-offer):not(.is-poor):not(.is-max) .lab-sheen { animation-duration: 6.4s; opacity: 0.84; }
.lab-card.is-epic:not(.is-offer):not(.is-poor):not(.is-max) .lab-sheen { animation-duration: 4.8s; opacity: 0.92; }
.lab-card.is-legendary:not(.is-offer):not(.is-poor):not(.is-max) .lab-sheen { animation-duration: 3.6s; opacity: 1; }
.lab-slot:nth-child(3n) .lab-sheen { animation-delay: -3.2s; }
.lab-slot:nth-child(3n + 1) .lab-sheen { animation-delay: -6.4s; }
.lab-card.is-hot:active {
    transform: translateY(1px);
    box-shadow: 0 2px 0 rgba(0,0,0,0.5);
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
    from { transform: translateX(-130%); }
    to { transform: translateX(130%); }
}
@keyframes lab-snow {
    from { background-position: 0 0, 0 0; }
    to { background-position: 0 4px, 0 0; }
}
@keyframes lab-scan {
    from { transform: translateY(-140%); }
    to { transform: translateY(460%); }
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
    .lab-brand svg { width: 22px; height: 22px; }
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
    .lab-scan, .lab-glint, .lab-more, .lab-card.is-offer .lab-evolve, .lab-snow { animation: none; }
}
`;

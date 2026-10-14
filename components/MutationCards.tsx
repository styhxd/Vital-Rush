import React, { useEffect, useState } from 'react';
import { Upgrade, Language } from '../types';

const CARD_ART: Record<string, string> = {
    mitosis: new URL('../src/assets/cards/01-mitosis.png', import.meta.url).href,
    enzyme: new URL('../src/assets/cards/02-enzyme.png', import.meta.url).href,
    membrane: new URL('../src/assets/cards/03-membrane.png', import.meta.url).href,
    multishot: new URL('../src/assets/cards/04-multishot.png', import.meta.url).href,
    orbitals: new URL('../src/assets/cards/05-orbitals.png', import.meta.url).href,
    crit: new URL('../src/assets/cards/06-crit.png', import.meta.url).href,
    dash_dmg: new URL('../src/assets/cards/07-dash.png', import.meta.url).href,
    thorns: new URL('../src/assets/cards/08-thorns.png', import.meta.url).href,
    lifesteal: new URL('../src/assets/cards/09-lifesteal.png', import.meta.url).href,
    magnet: new URL('../src/assets/cards/10-magnet.png', import.meta.url).href,
    energy_core: new URL('../src/assets/cards/11-energy.png', import.meta.url).href,
    giga_blast: new URL('../src/assets/cards/12-giga.png', import.meta.url).href,
};

const RARITY_KEY: Record<Upgrade['rarity'], string> = {
    COMMON: 'RARITY_COMMON',
    RARE: 'RARITY_RARE',
    EPIC: 'RARITY_EPIC',
    LEGENDARY: 'RARITY_LEGENDARY',
};

const RARITY_INK: Record<Upgrade['rarity'], string> = {
    COMMON: '#8d8374',
    RARE: '#c4472a',
    EPIC: '#8d3ec4',
    LEGENDARY: '#e2a01f',
};

const RANK_HUE: Record<Upgrade['rarity'], number> = {
    COMMON: 48,
    RARE: -16,
    EPIC: 26,
    LEGENDARY: 10,
};

export const SERUM_WINDOW_MS = 6800;

export function rollSerumOffers(upgrades: Upgrade[]): string[] {
    const pool = upgrades.filter(u => u.level < u.maxLevel);
    if (pool.length === 0) return [];
    const count = pool.length <= 2 ? pool.length : (Math.random() < 0.62 ? 3 : 2);
    const weight = (u: Upgrade) => {
        const rarity = u.rarity === 'LEGENDARY' ? 0.5 : u.rarity === 'EPIC' ? 0.8 : u.rarity === 'RARE' ? 1 : 1.12;
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
    onPress: () => void;
};

const MutationCard: React.FC<CardProps> = ({
    upgrade, language, t, mode, canAfford, cost, hotkey, forced, pulse, onPress
}) => {
    const maxed = upgrade.level >= upgrade.maxLevel;
    const alive = mode === 'offer' || (!maxed && canAfford);
    const rank = upgrade.maxLevel > 0 ? upgrade.level / upgrade.maxLevel : 0;
    const ink = RARITY_INK[upgrade.rarity];
    const art = CARD_ART[upgrade.id];
    const pulsing = pulse?.id === upgrade.id ? pulse : null;
    const [motion, setMotion] = useState('none');

    useEffect(() => {
        if (!pulsing) return;
        setMotion('none');
        const frame = requestAnimationFrame(() => {
            setMotion(pulsing.kind === 'ok' ? 'lab-pop 0.48s ease' : 'lab-deny 0.4s ease');
        });
        return () => cancelAnimationFrame(frame);
    }, [pulsing?.token]);

    const tint = rank > 0
        ? `saturate(${1 + rank * 0.55}) hue-rotate(${rank * RANK_HUE[upgrade.rarity]}deg) brightness(${1 + rank * 0.06})`
        : undefined;

    const label = maxed
        ? t('MAXED')
        : mode === 'offer'
            ? t('SERUM_TAKE')
            : `${t('LAB_EVOLVE')} [${cost}]`;

    return (
        <div
            role="button"
            tabIndex={alive || mode === 'shop' ? 0 : -1}
            aria-disabled={!alive && mode === 'shop'}
            onClick={onPress}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onPress();
                }
            }}
            className={`lab-card ${alive ? 'is-hot' : ''} ${!alive && !maxed ? 'is-poor' : ''} ${maxed ? 'is-max' : ''} ${forced ? 'is-forced' : ''}`}
            style={{
                ['--glow' as string]: ink,
                animation: motion,
                cursor: maxed ? 'default' : alive ? 'pointer' : 'not-allowed',
            }}
        >
            <img src={art} alt="" draggable={false} style={{ filter: tint }} />

            {language !== 'PT' && (
                <>
                    <div className="lab-rarity" style={{ background: ink }}>{t(RARITY_KEY[upgrade.rarity])}</div>
                    <div className="lab-plate">
                        <img src={art} alt="" />
                    </div>
                    <div className="lab-copy">
                        <div className="lab-name">{t(upgrade.nameKey)}</div>
                        <div className="lab-desc">{t(upgrade.descKey)}</div>
                    </div>
                </>
            )}

            <div
                className="lab-level"
                style={{
                    borderColor: rank > 0 ? ink : '#6a5840',
                    boxShadow: rank > 0 ? `0 0 ${6 + rank * 10}px ${ink}` : undefined,
                    color: maxed ? '#ffe08a' : '#f3ecdf',
                }}
            >
                {t('STAT_LEVEL')} {upgrade.level}/{upgrade.maxLevel}
            </div>

            <div className={`lab-evolve ${maxed ? 'is-maxed' : ''}`}>{label}</div>

            {hotkey && <div className="lab-key">{hotkey}</div>}

            {rank > 0 && (
                <div
                    className="lab-rim"
                    style={{ boxShadow: `inset 0 0 0 ${1 + rank * 3}px ${ink}`, opacity: 0.35 + rank * 0.65 }}
                />
            )}

            {pulsing?.kind === 'ok' && (
                <>
                    <div className="lab-flash" />
                    {mode === 'shop' && <div className="lab-float">-{pulsing.cost}</div>}
                </>
            )}
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
    useEffect(() => {
        setTick(true);
        const timer = window.setTimeout(() => setTick(false), 280);
        return () => window.clearTimeout(timer);
    }, [biomass]);

    return (
        <div className="lab-screen">
            <div className="lab-veins" aria-hidden>
                <div className="vein-drift" />
                <div className="vein-drift-b" />
            </div>
            <div className="lab-head">
                <span>{t('LAB_BIOMASS')}:</span>
                <strong className={tick ? 'is-tick' : ''}>{biomass}</strong>
            </div>
            <div className="lab-grid custom-scroll">
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
    onPick: (id: string) => void;
};

export const SerumOffer: React.FC<OfferProps> = ({
    ids, upgrades, language, t, now, endsAt, collapseId, onPick
}) => {
    const left = Math.max(0, endsAt - now);
    const ratio = Math.max(0, Math.min(1, left / SERUM_WINDOW_MS));
    const urgent = left < 2200;

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
                            <linearGradient id="serumBurst" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0" stopColor="#7af7ff" />
                                <stop offset="0.5" stopColor="#ffffff" />
                                <stop offset="1" stopColor="#ff4ad4" />
                            </linearGradient>
                        </defs>
                        <polygon points="32,2 38,22 60,16 44,32 60,48 38,42 32,62 26,42 4,48 20,32 4,16 26,22" fill="url(#serumBurst)" stroke="#1a0614" strokeWidth="2" />
                        <circle cx="32" cy="32" r="13" fill="#ff4ad4" stroke="#fff" strokeWidth="3" />
                        <path d="M32 23 v18 M23 32 h18" stroke="#fff" strokeWidth="4" strokeLinecap="square" />
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
.lab-screen {
    position: absolute;
    inset: 0;
    z-index: 50;
    display: flex;
    flex-direction: column;
    background:
        radial-gradient(ellipse at 50% 42%, rgba(120, 24, 36, 0.42), rgba(18, 5, 8, 0.94) 68%),
        #120408;
    overflow: hidden;
}
.lab-veins {
    position: absolute;
    inset: -8%;
    opacity: 0.55;
    pointer-events: none;
}
.lab-head {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: flex-end;
    align-items: baseline;
    gap: 0.7rem;
    padding: 0.85rem 4% 0.35rem;
}
.lab-head span {
    color: #f4f1ea;
    font-weight: 800;
    letter-spacing: 0.16em;
    font-size: clamp(11px, 1.5vw, 16px);
}
.lab-head strong {
    color: #ffd84a;
    font-family: var(--font-mono);
    font-size: clamp(22px, 2.6vw, 36px);
    line-height: 1;
    text-shadow: 0 0 14px rgba(255, 196, 40, 0.7);
}
.lab-head strong.is-tick { animation: lab-biomass 0.28s ease; }
.lab-grid {
    position: relative;
    z-index: 1;
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: clamp(8px, 1.1vw, 16px);
    padding: 0.4rem 3.2% 0.6rem;
    overflow-y: auto;
    align-content: start;
}
.lab-back {
    position: relative;
    z-index: 1;
    margin: 0.15rem auto 0.7rem;
    background: transparent;
    border: 0;
    color: #f7f4ee;
    letter-spacing: 0.28em;
    font-weight: 800;
    font-size: clamp(13px, 1.5vw, 18px);
    cursor: pointer;
    text-shadow: 0 2px 0 rgba(0,0,0,0.65);
}
.lab-back:hover { color: #ffe08a; }
.lab-card {
    position: relative;
    container-type: inline-size;
    width: 100%;
    aspect-ratio: 408 / 184;
    border-radius: 8px;
    outline: none;
    transform: translateZ(0);
    filter: drop-shadow(0 7px 0 rgba(0,0,0,0.38));
    transition: transform 0.16s ease, filter 0.16s ease;
    user-select: none;
}
.lab-card img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: fill;
    pointer-events: none;
    border-radius: 8px;
}
.lab-card.is-hot:hover,
.lab-card.is-hot:focus-visible {
    transform: translateY(-6px) scale(1.028);
    filter: drop-shadow(0 12px 0 rgba(0,0,0,0.34)) drop-shadow(0 0 16px var(--glow));
}
.lab-card.is-hot:active { transform: translateY(1px) scale(0.985); }
.lab-card.is-poor:hover,
.lab-card.is-poor:focus-visible,
.lab-card.is-max:hover { transform: none; }
.lab-card.is-max { filter: saturate(1.15) drop-shadow(0 0 10px rgba(255, 208, 74, 0.35)) drop-shadow(0 7px 0 rgba(0,0,0,0.38)); }
.lab-card.is-forced {
    transform: translateY(-8px) scale(1.04);
    filter: drop-shadow(0 0 18px #ff4ad4) drop-shadow(0 12px 0 rgba(0,0,0,0.34));
}
.lab-level {
    position: absolute;
    right: 3.2%;
    top: 6.2%;
    width: 23%;
    height: 14.5%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(#2a2318, #14110c);
    border: 1px solid #6a5840;
    border-radius: 3px;
    font-weight: 800;
    letter-spacing: 0.02em;
    font-size: 3.15cqw;
    line-height: 1;
    text-transform: none;
    pointer-events: none;
}
.lab-evolve {
    position: absolute;
    left: 22%;
    top: 65%;
    width: 56%;
    height: 23%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: repeating-linear-gradient(-52deg, #24180d 0 7px, #e2a01f 7px 13px);
    color: #f7f1e4;
    font-weight: 900;
    letter-spacing: 0.04em;
    font-size: 4.5cqw;
    line-height: 1;
    text-transform: uppercase;
    text-shadow: -1px -1px 0 #1a1008, 1px -1px 0 #1a1008, -1px 1px 0 #1a1008, 1px 1px 0 #1a1008;
    pointer-events: none;
    white-space: nowrap;
}
.lab-evolve.is-maxed {
    background: repeating-linear-gradient(-52deg, #14301c 0 7px, #d6b25a 7px 13px);
    color: #fff6d0;
}
.lab-rarity {
    position: absolute;
    z-index: 4;
    left: 1.2%;
    top: 3.2%;
    width: 31%;
    height: 17%;
    padding: 0 1.1em 0 0.55em;
    display: flex;
    align-items: center;
    color: #fff;
    font-weight: 900;
    font-size: 2.7cqw;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    clip-path: polygon(0 0, 100% 0, 88% 100%, 0 100%);
    text-shadow: 0 1px 0 rgba(0,0,0,0.45);
    pointer-events: none;
}
.lab-plate {
    position: absolute;
    z-index: 1;
    left: 3%;
    top: 18.5%;
    width: 74%;
    height: 46%;
    overflow: hidden;
    pointer-events: none;
    background:
        radial-gradient(circle at 18% 30%, rgba(92, 78, 46, 0.55), transparent 55%),
        linear-gradient(165deg, #4c4332 0%, #322a1c 55%, #3c3426 100%);
    box-shadow: inset 0 0 0 1px rgba(0,0,0,0.28);
}
.lab-plate img, .lab-plate::after { display: none; }
.lab-copy {
    position: absolute;
    z-index: 2;
    left: 5%;
    top: 21%;
    width: 63%;
    height: 41%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.15em;
    pointer-events: none;
    text-shadow: 0 1px 0 rgba(0,0,0,0.75);
}
.lab-name {
    color: #f7f4ee;
    font-weight: 900;
    font-size: 4.7cqw;
    letter-spacing: 0.03em;
    line-height: 1.05;
    text-transform: uppercase;
}
.lab-desc {
    color: #f0e2c4;
    font-weight: 600;
    font-size: 3.15cqw;
    line-height: 1.15;
}
.lab-key {
    position: absolute;
    left: 2%;
    bottom: 8%;
    width: 1.7em;
    height: 1.7em;
    border-radius: 999px;
    background: #12040c;
    color: #fff;
    border: 2px solid #ff4ad4;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 900;
    font-size: 3.4cqw;
    pointer-events: none;
}
.lab-rim, .lab-flash {
    position: absolute;
    inset: 0;
    border-radius: 8px;
    pointer-events: none;
}
.lab-flash {
    background: radial-gradient(circle at 50% 70%, rgba(255, 225, 120, 0.55), transparent 62%);
    mix-blend-mode: screen;
    animation: lab-flash 0.5s ease forwards;
}
.lab-float {
    position: absolute;
    left: 50%;
    bottom: 28%;
    transform: translateX(-50%);
    color: #ffe14a;
    font-weight: 900;
    font-size: 6cqw;
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
    background:
        radial-gradient(ellipse at 50% 40%, rgba(80, 0, 40, 0.28), rgba(4, 0, 8, 0.82) 70%);
    backdrop-filter: blur(2px);
}
.serum-head { text-align: center; color: #fff; }
.serum-mark {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    margin-bottom: 0.2rem;
}
.serum-mark svg { width: 54px; height: 54px; filter: drop-shadow(0 0 10px #ff4ad4); }
.serum-mark em {
    font-style: normal;
    font-weight: 900;
    letter-spacing: 0.18em;
    color: #fff;
    background: #12040c;
    border: 2px solid #ff4ad4;
    padding: 0.2rem 0.55rem;
}
.serum-head h2 {
    margin: 0.15rem 0 0;
    font-size: clamp(22px, 3vw, 42px);
    letter-spacing: 0.16em;
    text-shadow: 0 0 18px rgba(255, 74, 212, 0.65);
}
.serum-head p {
    margin: 0.25rem 0 0.55rem;
    color: #f0d6ea;
    letter-spacing: 0.08em;
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
    background: linear-gradient(90deg, #ff4ad4, #ffe14a);
}
.serum-timer.is-urgent i { background: #ff2d3a; }
.serum-head b {
    display: inline-block;
    margin-top: 0.35rem;
    font-family: var(--font-mono);
    color: #ffe14a;
    font-size: 1.1rem;
}
.serum-head b.is-urgent { color: #ff5a66; }
.serum-row {
    display: grid;
    grid-template-columns: repeat(var(--n), minmax(0, 1fr));
    gap: clamp(10px, 1.6vw, 22px);
    width: min(1100px, 100%);
    margin: 0 auto;
}
.serum-slot { animation: serum-in 0.42s cubic-bezier(0.16, 1, 0.3, 1) both; }
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
@keyframes lab-flash { from { opacity: 0.8; } to { opacity: 0; } }
@keyframes lab-float {
    from { opacity: 1; transform: translate(-50%, 0); }
    to { opacity: 0; transform: translate(-50%, -28px); }
}
@keyframes lab-biomass {
    from { transform: scale(1.18); color: #fff; }
    to { transform: scale(1); }
}
@keyframes serum-in {
    from { opacity: 0; transform: translateY(28px) scale(0.94); }
    to { opacity: 1; transform: none; }
}
`;

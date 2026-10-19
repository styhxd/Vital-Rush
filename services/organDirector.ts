/**
 * Os cinco órgãos do arcade. Cada um pinta o fundo e apronta
 * alguma coisa — quase sempre contra o Vital.
 */

import { Entity, EntityType, Vector2 } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';
import { audioManager } from './audioManager';
import { buzz } from './haptics';

export type OrganId = 'molar' | 'liver' | 'heart' | 'lung' | 'brain';

export const CELL = {
    SALIVA: 0,
    SPECK: 1,
    VENOUS: 2,
    BILE: 3,
    RBC: 4,
    CO2: 5,
    O2: 6,
    MYELIN: 7,
    MOTE: 8,
} as const;

const THEME: Record<OrganId, { bg: string; accent: string; name: string }> = {
    molar: { bg: '#121820', accent: '#d5e2ee', name: 'ORG_MOLAR' },
    liver: { bg: '#14160a', accent: '#d6e36a', name: 'ORG_LIVER' },
    heart: { bg: '#2a0508', accent: '#ff5a6a', name: 'ORG_HEART' },
    lung:  { bg: '#1a1216', accent: '#f0b7c8', name: 'ORG_LUNG' },
    brain: { bg: '#0a0614', accent: '#c9a6ff', name: 'ORG_BRAIN' },
};

const ENTER_KEY: Partial<Record<OrganId, string>> = {
    liver: 'ORG_ENTER_LIVER',
    heart: 'ORG_ENTER_HEART',
    lung: 'ORG_ENTER_LUNG',
    brain: 'ORG_ENTER_BRAIN',
};

export const ORGAN_CHEATS: Record<string, number> = {
    molar: 0,
    figado: 6,
    coracao: 12,
    pulmao: 18,
    cerebro: 24,
};

export function organForWave(waveIndex: number): OrganId {
    if (waveIndex < 6) return 'molar';
    if (waveIndex < 12) return 'liver';
    if (waveIndex < 18) return 'heart';
    if (waveIndex < 24) return 'lung';
    return 'brain';
}

export function organStart(id: OrganId): number {
    if (id === 'molar') return 0;
    if (id === 'liver') return 6;
    if (id === 'heart') return 12;
    if (id === 'lung') return 18;
    return 24;
}

export function organNameKey(id: OrganId): string {
    return THEME[id].name;
}

export function organAccent(id: OrganId): string {
    return THEME[id].accent;
}

export function organBg(id: OrganId, platinum: boolean): string {
    const base = THEME[id].bg;
    if (!platinum) return base;
    return mixHex(base, '#4a3b22', 0.34);
}

export function organVeinStyle(id: OrganId, platinum: boolean): { filter: string; opacity: number } {
    const filters: Record<OrganId, string> = {
        molar: 'hue-rotate(190deg) saturate(0.28) brightness(1.25)',
        liver: 'hue-rotate(78deg) saturate(1.35) brightness(0.85)',
        heart: 'saturate(1.25) brightness(1.05)',
        lung: 'hue-rotate(305deg) saturate(0.55) brightness(1.45)',
        brain: 'hue-rotate(230deg) saturate(1.5) brightness(0.9)',
    };
    const opacity = id === 'brain' ? 0.1 : id === 'heart' ? 0.28 : id === 'molar' ? 0.16 : 0.2;
    const filter = platinum ? `${filters[id]} hue-rotate(18deg) sepia(0.35)` : filters[id];
    return { filter, opacity };
}

export function cellBudget(id: OrganId): number {
    if (id === 'molar') return 48;
    if (id === 'liver') return 64;
    if (id === 'heart') return 96;
    if (id === 'lung') return 58;
    return 34;
}

export function rollCellStyle(id: OrganId): number {
    const r = Math.random();
    if (id === 'molar') return r < 0.74 ? CELL.SALIVA : CELL.SPECK;
    if (id === 'liver') return r < 0.58 ? CELL.VENOUS : CELL.BILE;
    if (id === 'heart') return CELL.RBC;
    if (id === 'lung') return r < 0.34 ? CELL.RBC : r < 0.72 ? CELL.CO2 : CELL.O2;
    return r < 0.58 ? CELL.MYELIN : r < 0.9 ? CELL.MOTE : CELL.VENOUS;
}

export function cellColor(style: number, organ: OrganId): string {
    if (style === CELL.SALIVA) return organ === 'molar' ? '#c5d4de' : '#f4efe4';
    if (style === CELL.SPECK) return organ === 'molar' ? '#8aa0b0' : '#d6c15a';
    if (style === CELL.VENOUS) return '#6e2a30';
    if (style === CELL.BILE) return '#c6d24a';
    if (style === CELL.RBC) return organ === 'lung' ? '#e7b4be' : organ === 'heart' ? '#ff4d55' : '#d25a5e';
    if (style === CELL.CO2) return '#ead6de';
    if (style === CELL.O2) return '#8ee7ff';
    if (style === CELL.MYELIN) return '#d7d2ea';
    return '#c9a6ff';
}

export function cellRises(style: number): boolean {
    return style === CELL.SALIVA || style === CELL.CO2 || style === CELL.O2 || style === CELL.MOTE;
}

const PICK_FLUORIDE = 1;
const PICK_GLYCOGEN = 2;
const PICK_OXYGEN = 3;
const PICK_DOPAMINE = 4;

export interface OrganHooks {
    entities: Entity[];
    player: Entity;
    low: boolean;
    time: number;
    t: (key: string) => string;
    hurt: (amount: number, pos: Vector2, iframe: number) => void;
    heal: (amount: number) => void;
    strike: (e: Entity, amount: number) => void;
    shake: (n: number) => void;
    popup: (pos: Vector2, text: string, color: string, size?: number) => void;
    spawn: (e: Entity) => void;
}

interface Banner {
    text: string;
    color: string;
    ttl: number;
}

interface SalivaRibbon {
    a: Vector2;
    c1: Vector2;
    mid: Vector2;
    c2: Vector2;
    b: Vector2;
    half: number;
    head: number;
    span: number;
    t: number;
    dur: number;
    rinsed: boolean;
}

interface Trace {
    y: number;
    x0: number;
    age: number;
    span: number;
    hit: Set<string>;
    playerHit: boolean;
}

interface Bolt {
    a: Vector2;
    b: Vector2;
    t: number;
    warn: number;
    white: boolean;
    fired: boolean;
    hit: Set<string>;
    playerHit: boolean;
}

export class OrganDirector {
    id: OrganId = 'molar';
    wind: Vector2 = { x: 0, y: 0 };
    speedMul = 1;
    fireMul = 1;
    critAdd = 0;
    shield = 0;
    pulse = 0;
    whiteout = 0;

    private local = 0;
    private pastWall = 0;
    private seq = 1;
    private banner: Banner | null = null;
    private hooks: OrganHooks | null = null;
    private tick = 1;

    private fluorideT = 0;
    private rinseT = 0;
    private oxygenT = 0;
    private dopamineT = 0;
    private glycogenT = 0;
    private systoleT = 0;

    private plaqueClock = 7;
    private biteClock = 13;
    private bitePhase: 'idle' | 'warn' | 'snap' = 'idle';
    private biteT = 0;
    private biteY = 400;
    private biteHit = false;
    private fluorideClock = 15;
    private salivaClock = 9;
    private streams: SalivaRibbon[] = [];
    private salivaCue = 0;
    private ridingSaliva = false;

    private bileClock = 6.5;
    private filterClock = 16;
    private filterPhase: 'idle' | 'warn' | 'on' = 'idle';
    private filterT = 0;
    private filterX = 900;
    private filterY = 500;
    private filterHit = false;
    private glycogenClock = 12;

    private ecgClock = 7;
    private traces: Trace[] = [];
    private heartBeat = 0;

    private lungClock = 5.5;
    private gustN = 0;
    private lungPhase: 'idle' | 'telegraph' | 'gust' | 'inhale' | 'blast' = 'idle';
    private lungT = 0;
    private gust: Vector2 = { x: -8, y: 0 };
    private bandY = 540;
    private bandHalf = 380;
    private coughPlayer = false;
    private coughBosses = new Set<string>();
    private oxygenClock = 10;
    private streaks: { x: number; y: number; vx: number; vy: number; life: number }[] = [];

    private synapseClock = 6.5;
    private bolts: Bolt[] = [];
    private dopamineClock = 14;
    private synapseN = 0;

    private cariesCue = 0;
    private bileCue = 0;
    private bileEnemyCue = 0;

    onWave(waveIndex: number, translate: (key: string) => string): boolean {
        const next = organForWave(waveIndex);
        const changed = this.id !== next;
        const entered = changed && !(this.id === 'molar' && next === 'molar');
        this.id = next;
        this.local = Math.min(5, Math.max(0, waveIndex - organStart(next)));
        this.pastWall = Math.max(0, waveIndex - 29);
        this.fluorideT = 0;
        this.rinseT = 0;
        this.oxygenT = 0;
        this.dopamineT = 0;
        this.glycogenT = 0;
        this.systoleT = 0;
        this.shield = 0;
        this.critAdd = 0;
        this.fireMul = 1;
        this.speedMul = 1;
        this.wind.x = 0;
        this.wind.y = 0;
        this.pulse = 0;
        this.whiteout = 0;
        this.bitePhase = 'idle';
        this.filterPhase = 'idle';
        this.lungPhase = 'idle';
        this.traces = [];
        this.bolts = [];
        this.streaks = [];
        this.plaqueClock = 7;
        this.biteClock = 12;
        this.fluorideClock = 14;
        this.salivaClock = 8;
        this.streams = [];
        this.salivaCue = 0;
        this.ridingSaliva = false;
        this.bileClock = 6;
        this.filterClock = 15;
        this.glycogenClock = 11;
        this.ecgClock = 6.5;
        this.heartBeat = 0;
        this.lungClock = 5;
        this.gustN = 0;
        this.oxygenClock = 9;
        this.synapseClock = 5.5;
        this.dopamineClock = 12;
        this.synapseN = 0;
        if (entered && ENTER_KEY[next]) {
            this.banner = { text: translate(ENTER_KEY[next]!), color: THEME[next].accent, ttl: 2.5 };
        }
        return changed;
    }

    begin(dt: number, tick: number, live: boolean, hooks: OrganHooks) {
        this.hooks = hooks;
        this.tick = tick;
        this.wind.x = 0;
        this.wind.y = 0;
        this.speedMul = 1;
        this.ridingSaliva = false;
        this.fireMul = this.oxygenT > 0 ? 0.72 : 1;
        this.critAdd = this.dopamineT > 0 ? 0.22 : 0;
        this.shield = this.fluorideT > 0 ? 0.5 : this.rinseT > 0 ? 0.35 : 0;
        this.pulse = 0;

        if (this.fluorideT > 0) this.fluorideT -= dt;
        if (this.rinseT > 0) this.rinseT -= dt;
        if (this.oxygenT > 0) this.oxygenT -= dt;
        if (this.dopamineT > 0) this.dopamineT -= dt;
        if (this.systoleT > 0) {
            this.systoleT -= dt;
            this.speedMul = 1.38;
        }
        if (this.glycogenT > 0 && hooks.player.active) {
            this.glycogenT -= dt;
            hooks.heal(hooks.player.maxHealth * 0.055 * dt);
        }
        if (this.banner) {
            this.banner.ttl -= dt;
            if (this.banner.ttl <= 0) this.banner = null;
        }
        if (this.whiteout > 0) this.whiteout = Math.max(0, this.whiteout - dt);

        if (!live || !hooks.player.active) return;

        const pace = 1 + this.local * 0.14 + this.pastWall * 0.22;
        if (this.id === 'molar') this.tickMolar(dt, pace, hooks);
        else if (this.id === 'liver') this.tickLiver(dt, pace, hooks);
        else if (this.id === 'heart') this.tickHeart(dt, pace, hooks);
        else if (this.id === 'lung') this.tickLung(dt, pace, hooks);
        else this.tickBrain(dt, pace, hooks);

        if (this.stuckIn(hooks.player.pos, 'plaque_')) this.speedMul = 0.42;
        if (this.ridingSaliva) this.speedMul = 1.55;
    }

    end(dt: number, hooks: OrganHooks) {
        this.hooks = hooks;
        this.expirePickups(dt, hooks);
        this.collectPickups(hooks);
        if (!hooks.player.active) return;

        if (this.stuckIn(hooks.player.pos, 'plaque_')) {
            this.cariesCue -= dt;
            if (this.cariesCue <= 0) {
                this.cariesCue = 0.45;
                hooks.hurt(5, hooks.player.pos, 0);
                hooks.popup(hooks.player.pos, hooks.t('MSG_CARIES'), '#f0d7a2', 20);
            }
        }
        this.slowInPlaque(hooks);
        this.meltInBile(dt, hooks);

        if (this.bitePhase === 'snap' && !this.biteHit && this.biteT <= 0.86) {
            this.biteHit = true;
            this.strikeBand(this.biteY, 150, hooks, 0.48, 0.08, 0.34);
            hooks.shake(42);
            buzz('thud');
        }
        if (this.filterPhase === 'on') this.resolveFilter(hooks);
        for (const trace of this.traces) this.resolveTrace(trace, hooks);
        if (this.lungPhase === 'blast') this.resolveCough(hooks);
        for (const bolt of this.bolts) this.resolveBolt(bolt, hooks);
    }

    drawBackdrop(ctx: CanvasRenderingContext2D, time: number, low: boolean) {
        if (this.id === 'heart' && this.pulse > 0.02) {
            ctx.fillStyle = `rgba(120, 8, 18, ${0.22 * this.pulse})`;
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }
        if (low) return;
        ctx.save();
        ctx.globalAlpha = 0.11;
        ctx.strokeStyle = THEME[this.id].accent;
        ctx.lineWidth = 2;
        if (this.id === 'molar') this.drawEnamel(ctx, time);
        else if (this.id === 'liver') this.drawLobules(ctx);
        else if (this.id === 'lung') this.drawAlveoli(ctx, time);
        else if (this.id === 'brain') this.drawNeural(ctx, time);
        ctx.restore();
    }

    drawHazards(ctx: CanvasRenderingContext2D, player: Entity, low: boolean) {
        ctx.save();
        if (this.streams.length > 0) this.drawSaliva(ctx, low);
        if (this.bitePhase !== 'idle') this.drawBite(ctx);
        if (this.filterPhase !== 'idle') this.drawFilter(ctx);
        for (const trace of this.traces) this.drawTrace(ctx, trace, low);
        if (this.lungPhase === 'telegraph' || this.lungPhase === 'gust') this.drawGust(ctx, low);
        if (this.lungPhase === 'inhale' || this.lungPhase === 'blast') this.drawCoughBand(ctx);
        for (const bolt of this.bolts) this.drawBolt(ctx, bolt, low);
        this.drawBuffRing(ctx, player);
        if (this.whiteout > 0) {
            ctx.fillStyle = `rgba(244, 246, 255, ${Math.min(0.82, this.whiteout / 0.35)})`;
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }
        if (this.banner && this.banner.ttl > 0) {
            const a = Math.min(1, this.banner.ttl < 0.4 ? this.banner.ttl / 0.4 : 1);
            ctx.globalAlpha = a;
            ctx.font = '900 64px "Chakra Petch", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.lineWidth = 8;
            ctx.strokeStyle = 'rgba(0,0,0,0.8)';
            ctx.fillStyle = this.banner.color;
            const y = CANVAS_HEIGHT * 0.22;
            ctx.strokeText(this.banner.text, CANVAS_WIDTH / 2, y);
            ctx.fillText(this.banner.text, CANVAS_WIDTH / 2, y);
        }
        ctx.restore();
    }

    private tickMolar(dt: number, pace: number, hooks: OrganHooks) {
        this.plaqueClock -= dt;
        if (this.plaqueClock <= 0) {
            this.plaqueClock = (9.5 - this.local * 0.45) / pace;
            this.spawnPool('plaque_', '#c6b06a', 58 + Math.random() * 28, 8.5);
        }
        this.fluorideClock -= dt;
        if (this.fluorideClock <= 0) {
            this.fluorideClock = 18 / pace;
            this.spawnPickup(PICK_FLUORIDE, '#e7fff8');
        }
        this.salivaClock -= dt;
        if (this.salivaClock <= 0) {
            this.spawnRibbons(hooks);
            this.salivaClock = (18 - this.local * 0.4) / pace;
        }
        this.rideSaliva(dt, hooks);
        this.tickBite(dt, pace);
    }

    private spawnRibbons(hooks: OrganHooks) {
        const count = this.local >= 2 ? 2 : 1;
        const plaques = hooks.entities.filter(e => e.active && e.id.startsWith('plaque_') && e.radius > 18);
        const used = new Set<string>();
        for (let i = 0; i < count; i++) {
            const pool = plaques.filter(p => !used.has(p.id));
            const plaque = pool.length > 0 && Math.random() < 0.8
                ? pool[Math.floor(Math.random() * pool.length)]
                : null;
            if (plaque) used.add(plaque.id);
            let mid = plaque
                ? { x: plaque.pos.x, y: plaque.pos.y }
                : { x: 320 + Math.random() * (CANVAS_WIDTH - 640), y: 180 + Math.random() * (CANVAS_HEIGHT - 360) };
            if (this.bitePhase !== 'idle' && Math.abs(mid.y - this.biteY) < 220) {
                mid = { x: mid.x, y: this.biteY > CANVAS_HEIGHT / 2 ? 200 : CANVAS_HEIGHT - 200 };
            }
            this.streams.push(this.makeStream(mid, i));
        }
    }

    private makeStream(mid: Vector2, slot: number): SalivaRibbon {
        const roll = (Math.random() + slot * 0.37) % 1;
        let a: Vector2;
        let b: Vector2;
        if (roll < 0.5) {
            const rise = (Math.random() - 0.5) * 680;
            a = { x: CANVAS_WIDTH + 220, y: this.clampY(mid.y - rise * 0.45) };
            b = { x: -220, y: this.clampY(mid.y + rise * 0.55) };
        } else if (roll < 0.76) {
            a = { x: CANVAS_WIDTH * (0.32 + Math.random() * 0.62), y: -200 };
            b = { x: -200, y: this.clampY(CANVAS_HEIGHT * (0.42 + Math.random() * 0.48)) };
        } else {
            a = { x: CANVAS_WIDTH * (0.28 + Math.random() * 0.66), y: CANVAS_HEIGHT + 200 };
            b = { x: -200, y: this.clampY(CANVAS_HEIGHT * (0.06 + Math.random() * 0.4)) };
        }
        const sign = Math.random() < 0.5 ? 1 : -1;
        const span = 0.78 + Math.random() * 0.2;
        const dur = 10.4;
        return {
            a, b, mid,
            c1: this.bow(a, mid, sign),
            c2: this.bow(mid, b, -sign),
            half: 40 + Math.random() * 16,
            head: 0,
            span,
            t: dur,
            dur,
            rinsed: false,
        };
    }

    private clampY(y: number) {
        return Math.max(80, Math.min(CANVAS_HEIGHT - 80, y));
    }

    private bow(from: Vector2, to: Vector2, sign: number): Vector2 {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const len = Math.hypot(dx, dy) || 1;
        const n = sign * (48 + Math.random() * 90);
        return {
            x: (from.x + to.x) / 2 + (-dy / len) * n,
            y: (from.y + to.y) / 2 + (dx / len) * n,
        };
    }

    private salivaPoint(s: SalivaRibbon, u: number): Vector2 {
        const t = Math.max(0, Math.min(2, u));
        if (t <= 1) return this.quad(s.a, s.c1, s.mid, t);
        return this.quad(s.mid, s.c2, s.b, t - 1);
    }

    private quad(a: Vector2, c: Vector2, b: Vector2, u: number): Vector2 {
        const o = 1 - u;
        return {
            x: o * o * a.x + 2 * o * u * c.x + u * u * b.x,
            y: o * o * a.y + 2 * o * u * c.y + u * u * b.y,
        };
    }

    private streamTouch(s: SalivaRibbon, pos: Vector2): { hit: boolean; tx: number; ty: number } {
        const from = Math.max(0, s.head - s.span);
        const to = Math.min(2, s.head);
        if (to - from < 0.02) return { hit: false, tx: -1, ty: 0 };
        const steps = 12;
        let best = Infinity;
        let tx = -1;
        let ty = 0;
        let prev = this.salivaPoint(s, from);
        for (let i = 1; i <= steps; i++) {
            const u = from + (to - from) * (i / steps);
            const p = this.salivaPoint(s, u);
            const dx = p.x - prev.x;
            const dy = p.y - prev.y;
            const l2 = dx * dx + dy * dy || 1;
            let k = ((pos.x - prev.x) * dx + (pos.y - prev.y) * dy) / l2;
            k = Math.max(0, Math.min(1, k));
            const x = prev.x + dx * k;
            const y = prev.y + dy * k;
            const d = Math.hypot(pos.x - x, pos.y - y);
            if (d < best) {
                best = d;
                const len = Math.hypot(dx, dy) || 1;
                tx = dx / len;
                ty = dy / len;
            }
            prev = p;
        }
        return { hit: best < s.half + 12, tx, ty };
    }

    private rideSaliva(dt: number, hooks: OrganHooks) {
        this.salivaCue -= dt;
        const hurt = this.salivaCue <= 0;
        if (hurt) this.salivaCue = 0.42;
        for (const s of this.streams) {
            s.t -= dt;
            s.head += ((2 + s.span) / s.dur) * dt;
            for (const e of hooks.entities) {
                if (!e.active) continue;
                const touch = this.streamTouch(s, e.pos);
                if (!touch.hit) continue;
                if (e.id.startsWith('plaque_')) {
                    e.radius = Math.max(0, e.radius - 80 * dt);
                    if (e.radius < 16) e.active = false;
                } else if (this.isFoe(e.type)) {
                    e.vel.x *= 0.86;
                    e.vel.y *= 0.86;
                    e.pos.x += touch.tx * 1.4 * this.tick;
                    e.pos.y += touch.ty * 1.4 * this.tick;
                    if (hurt) hooks.strike(e, e.type === EntityType.BOSS ? 5 : 14);
                }
            }
            const rider = this.streamTouch(s, hooks.player.pos);
            if (!rider.hit) continue;
            this.ridingSaliva = true;
            hooks.player.pos.x += rider.tx * 2.2 * this.tick;
            hooks.player.pos.y += rider.ty * 2.2 * this.tick;
            if (s.rinsed) continue;
            s.rinsed = true;
            this.rinseT = Math.max(this.rinseT, 2.6);
        }
        this.streams = this.streams.filter(s => s.t > 0);
    }

    private tickBite(dt: number, pace: number) {
        if (this.bitePhase === 'idle') {
            this.biteClock -= dt;
            if (this.biteClock <= 0) {
                this.bitePhase = 'warn';
                this.biteT = 2.2;
                this.biteY = 180 + Math.random() * (CANVAS_HEIGHT - 360);
                this.biteHit = false;
            }
            return;
        }
        this.biteT -= dt;
        if (this.bitePhase === 'warn' && this.biteT <= 0) {
            this.bitePhase = 'snap';
            this.biteT = 1.2;
            this.biteHit = false;
            audioManager.playSurge();
        } else if (this.bitePhase === 'snap' && this.biteT <= 0) {
            this.bitePhase = 'idle';
            this.biteClock = (16 - this.local * 0.7) / pace;
        }
    }

    private tickLiver(dt: number, pace: number, hooks: OrganHooks) {
        this.bileClock -= dt;
        if (this.bileClock <= 0) {
            this.bileClock = (8.2 - this.local * 0.35) / pace;
            const pool = this.spawnPool('bile_', '#c6e04a', 84 + Math.random() * 40, 7.5);
            pool.vel.x = -0.45;
            pool.vel.y = (Math.random() - 0.5) * 0.35;
        }
        this.glycogenClock -= dt;
        if (this.glycogenClock <= 0) {
            this.glycogenClock = 15 / pace;
            this.spawnPickup(PICK_GLYCOGEN, '#ffe08a');
        }
        if (this.filterPhase === 'idle') {
            this.filterClock -= dt;
            if (this.filterClock <= 0) {
                this.filterPhase = 'warn';
                this.filterT = 1.25;
                this.filterX = CANVAS_WIDTH * (0.38 + Math.random() * 0.4);
                this.filterY = 160 + Math.random() * (CANVAS_HEIGHT - 320);
                this.filterHit = false;
                this.say('ALERT_FILTER', '#d6e36a');
            }
        } else {
            this.filterT -= dt;
            const pulling = this.filterPhase === 'on' ? 1 : 0.35;
            this.pullFilter(hooks, pulling);
            if (this.filterPhase === 'warn' && this.filterT <= 0) {
                this.filterPhase = 'on';
                this.filterT = 2.3;
                this.filterHit = false;
                audioManager.playHit();
            } else if (this.filterPhase === 'on' && this.filterT <= 0) {
                this.filterPhase = 'idle';
                this.filterClock = (18 - this.local * 0.6) / pace;
            }
        }
    }

    private tickHeart(dt: number, pace: number, hooks: OrganHooks) {
        const period = Math.max(0.58, 0.9 - this.local * 0.045 - this.pastWall * 0.02);
        this.heartBeat += dt;
        const phase = (this.heartBeat % period) / period;
        this.pulse = Math.exp(-phase * 16);
        if (phase < 0.12 && this.systoleT <= 0) this.systoleT = 0.16;

        this.traces = this.traces.filter(tr => {
            tr.age += dt;
            tr.x0 = CANVAS_WIDTH - (tr.age / 1.25) * (CANVAS_WIDTH + tr.span);
            return tr.x0 > -tr.span - 40;
        });

        this.ecgClock -= dt;
        if (this.ecgClock <= 0) {
            this.ecgClock = (15.5 - this.local * 0.7) / pace;
            const y = 170 + Math.random() * (CANVAS_HEIGHT - 340);
            this.traces.push({ y, x0: CANVAS_WIDTH + 20, age: -1.25, span: CANVAS_WIDTH * 0.72, hit: new Set(), playerHit: false });
            audioManager.playHit();
            hooks.shake(8);
            if (this.local >= 3) {
                const y2 = Math.max(140, Math.min(CANVAS_HEIGHT - 140, y + (Math.random() < 0.5 ? -240 : 240)));
                this.traces.push({ y: y2, x0: CANVAS_WIDTH + 20, age: -1.9, span: CANVAS_WIDTH * 0.72, hit: new Set(), playerHit: false });
            }
        }
    }

    private tickLung(dt: number, pace: number, hooks: OrganHooks) {
        this.oxygenClock -= dt;
        if (this.oxygenClock <= 0) {
            this.oxygenClock = 12 / pace;
            this.spawnPickup(PICK_OXYGEN, '#9aefff');
        }
        for (const s of this.streaks) s.life -= dt;
        this.streaks = this.streaks.filter(s => s.life > 0);

        if (this.lungPhase === 'idle') {
            this.lungClock -= dt;
            if (this.lungClock <= 0) this.armLung();
            return;
        }
        this.lungT -= dt;
        if (this.lungPhase === 'telegraph') {
            this.puff(this.gust.x, this.gust.y, 0.55);
            if (this.lungT <= 0) {
                this.lungPhase = 'gust';
                this.lungT = 1.2;
            }
        } else if (this.lungPhase === 'gust') {
            this.wind.x = this.gust.x;
            this.wind.y = this.gust.y;
            this.puff(this.gust.x, this.gust.y, 1);
            if (this.lungT <= 0) this.restLung(pace);
        } else if (this.lungPhase === 'inhale') {
            this.wind.x = 1.6;
            this.wind.y = (this.bandY - hooks.player.pos.y) * 0.004;
            if (this.lungT <= 0) {
                this.lungPhase = 'blast';
                this.lungT = 0.72;
                this.coughPlayer = false;
                this.coughBosses.clear();
                audioManager.playSurge();
                hooks.shake(28);
                buzz('thud');
            }
            } else if (this.lungPhase === 'blast') {
            this.shoveBand(hooks, -78);
            if (this.lungT <= 0) {
                this.sweepBand(hooks);
                this.restLung(pace);
            }
        }
    }

    private armLung() {
        this.gustN++;
        if (this.gustN % 3 === 0) {
            this.lungPhase = 'inhale';
            this.lungT = 1.05;
            this.bandHalf = CANVAS_HEIGHT * 0.35;
            const room = CANVAS_HEIGHT - this.bandHalf * 2;
            this.bandY = this.bandHalf + Math.random() * Math.max(1, room);
            this.coughPlayer = false;
            this.coughBosses.clear();
            this.say('ALERT_COUGH', '#ff5a6a');
            return;
        }
        const roll = Math.random();
        this.gust = roll < 0.45 ? { x: -8.6, y: 0 } : roll < 0.75 ? { x: -6.4, y: -4.6 } : { x: -6.4, y: 4.6 };
        this.lungPhase = 'telegraph';
        this.lungT = 0.6;
    }

    private restLung(pace: number) {
        this.lungPhase = 'idle';
        this.lungClock = (8.2 - this.local * 0.35) / pace;
    }

    private tickBrain(dt: number, pace: number, hooks: OrganHooks) {
        this.dopamineClock -= dt;
        if (this.dopamineClock <= 0) {
            this.dopamineClock = 16 / pace;
            this.spawnPickup(PICK_DOPAMINE, '#e2c6ff');
        }
        this.bolts = this.bolts.filter(b => b.t < b.warn + 0.22);
        for (const bolt of this.bolts) bolt.t += dt;

        this.synapseClock -= dt;
        if (this.synapseClock <= 0) {
            this.synapseClock = Math.max(2.3, (7.4 - this.local * 0.45) / pace - this.pastWall * 0.28);
            this.synapseN++;
            const chain = this.local >= 3 ? 2 + (this.synapseN % 2) : 1;
            const white = this.synapseN % 4 === 0;
            for (let i = 0; i < chain; i++) {
                const a = this.randPoint();
                const ang = Math.random() * Math.PI * 2;
                const dist = 220 + Math.random() * 260;
                const b = {
                    x: clamp(a.x + Math.cos(ang) * dist, 80, CANVAS_WIDTH - 80),
                    y: clamp(a.y + Math.sin(ang) * dist, 80, CANVAS_HEIGHT - 80),
                };
                this.bolts.push({
                    a, b, t: -i * 0.42,
                    warn: white && i === 0 ? 0.22 : 0.72,
                    white: white && i === 0,
                    fired: false,
                    hit: new Set(),
                    playerHit: false,
                });
            }
        }
        for (const bolt of this.bolts) {
            if (!bolt.fired && bolt.t >= bolt.warn) {
                bolt.fired = true;
                audioManager.playHit();
                hooks.shake(bolt.white ? 18 : 10);
                if (bolt.white) this.whiteout = 0.35;
            }
        }
    }

    private resolveTrace(trace: Trace, hooks: OrganHooks) {
        if (trace.age < 0 || trace.age > 1.25) return;
        const pts = this.tracePoints(trace);
        const thick = 46;
        this.hitPolyline(pts, thick, hooks, (e) => {
            if (trace.hit.has(e.id)) return;
            trace.hit.add(e.id);
            if (e.type === EntityType.BOSS) hooks.strike(e, e.maxHealth * 0.26);
            else hooks.strike(e, e.health + 50);
        }, () => {
            if (trace.playerHit) return;
            trace.playerHit = true;
            hooks.hurt(hooks.player.maxHealth * 0.32, hooks.player.pos, 0.28);
            hooks.shake(20);
            buzz('thud');
        });
    }

    private resolveCough(hooks: OrganHooks) {
        const y0 = this.bandY - this.bandHalf;
        const y1 = this.bandY + this.bandHalf;
        for (const e of hooks.entities) {
            if (!e.active) continue;
            if (e.pos.y < y0 || e.pos.y > y1) continue;
            if (e.type === EntityType.BOSS) {
                if (!this.coughBosses.has(e.id)) {
                    this.coughBosses.add(e.id);
                    hooks.strike(e, e.maxHealth * 0.14);
                }
                e.vel.x -= 6;
            }
        }
        if (!this.coughPlayer && hooks.player.pos.y >= y0 && hooks.player.pos.y <= y1) {
            this.coughPlayer = true;
            hooks.hurt(hooks.player.maxHealth * 0.38, hooks.player.pos, 0.5);
            hooks.player.vel.x = -36;
            hooks.popup(hooks.player.pos, hooks.t('ALERT_COUGH'), '#ff8aa0', 28);
        }
    }

    private resolveBolt(bolt: Bolt, hooks: OrganHooks) {
        if (!bolt.fired || bolt.t > bolt.warn + 0.16) return;
        const pts = synapsePoints(bolt.a, bolt.b);
        this.hitPolyline(pts, 34, hooks, (e) => {
            if (bolt.hit.has(e.id)) return;
            bolt.hit.add(e.id);
            if (e.type === EntityType.BOSS) hooks.strike(e, e.maxHealth * 0.08);
            else hooks.strike(e, Math.max(8, e.health * 0.55));
        }, () => {
            if (bolt.playerHit) return;
            bolt.playerHit = true;
            hooks.hurt(hooks.player.maxHealth * 0.14, hooks.player.pos, 0.22);
        });
    }

    private resolveFilter(hooks: OrganHooks) {
        const core = 72;
        for (const e of hooks.entities) {
            if (!e.active || !this.isFoe(e.type)) continue;
            if (e.type === EntityType.BOSS || e.type === EntityType.PARASITE) continue;
            if (Math.hypot(e.pos.x - this.filterX, e.pos.y - this.filterY) < core + e.radius * 0.3) {
                hooks.strike(e, e.health + 20);
            }
        }
        if (hooks.player.active && Math.hypot(hooks.player.pos.x - this.filterX, hooks.player.pos.y - this.filterY) < core + hooks.player.radius) {
            const before = hooks.player.health;
            hooks.hurt(hooks.player.maxHealth * 0.22, { x: this.filterX, y: this.filterY }, 0.55);
            if (hooks.player.health < before) hooks.shake(16);
        }
    }

    private strikeBand(y: number, half: number, hooks: OrganHooks, playerFrac: number, bossFrac: number, trashFrac: number) {
        const y0 = y - half;
        const y1 = y + half;
        for (const e of hooks.entities) {
            if (!e.active || !this.isFoe(e.type)) continue;
            if (e.pos.y < y0 || e.pos.y > y1) continue;
            if (e.type === EntityType.BOSS) hooks.strike(e, e.maxHealth * bossFrac);
            else hooks.strike(e, e.maxHealth * trashFrac);
        }
        if (hooks.player.pos.y >= y0 && hooks.player.pos.y <= y1) {
            hooks.hurt(hooks.player.maxHealth * playerFrac, hooks.player.pos, 0.4);
        }
    }

    private pullFilter(hooks: OrganHooks, scale: number) {
        const step = 5.2 * scale * this.tick;
        const drag = (e: Entity, mul: number) => {
            const dx = this.filterX - e.pos.x;
            const dy = this.filterY - e.pos.y;
            const d = Math.hypot(dx, dy) || 1;
            if (d > 460) return;
            const falloff = 1 - d / 460;
            e.pos.x += (dx / d) * step * mul * falloff;
            e.pos.y += (dy / d) * step * mul * falloff;
        };
        for (const e of hooks.entities) {
            if (!e.active) continue;
            if (e.type === EntityType.DNA_FRAGMENT) drag(e, 1.15);
            else if (e.type === EntityType.BACTERIA || e.type === EntityType.FUNGI) drag(e, 1);
            else if (e.type === EntityType.VIRUS) drag(e, 0.55);
            else if (e.type === EntityType.PARASITE) drag(e, 0.22);
            else if (e.id.startsWith('bile_')) drag(e, 0.35);
        }
        if (hooks.player.active) drag(hooks.player, 0.42);
    }

    private sweepBand(hooks: OrganHooks) {
        const y0 = this.bandY - this.bandHalf;
        const y1 = this.bandY + this.bandHalf;
        for (const e of hooks.entities) {
            if (!e.active || e.pos.y < y0 || e.pos.y > y1) continue;
            if (e.type === EntityType.BOSS || e.type === EntityType.PLAYER || e.type === EntityType.ORGAN_PICKUP) continue;
            if (e.type === EntityType.DNA_FRAGMENT || e.type === EntityType.BIO_MINE || e.type === EntityType.ENEMY_PROJECTILE || e.type === EntityType.ANTIBODY || this.isFoe(e.type) || e.type === EntityType.ACID_POOL) {
                e.active = false;
            }
        }
    }

    private shoveBand(hooks: OrganHooks, force: number) {
        const y0 = this.bandY - this.bandHalf;
        const y1 = this.bandY + this.bandHalf;
        const push = force * this.tick;
        for (const e of hooks.entities) {
            if (!e.active || e.type === EntityType.TEXT_POPUP) continue;
            if (e.pos.y < y0 || e.pos.y > y1) continue;
            const mul = e.type === EntityType.BOSS ? 0.12 : e.type === EntityType.ACID_POOL ? 0.2 : 1;
            e.pos.x += push * mul;
        }
        if (hooks.player.pos.y >= y0 && hooks.player.pos.y <= y1) {
            hooks.player.pos.x += push * 0.72;
        }
    }

    private slowInPlaque(hooks: OrganHooks) {
        const pools = hooks.entities.filter(e => e.active && e.id.startsWith('plaque_'));
        if (pools.length === 0) return;
        for (const e of hooks.entities) {
            if (!e.active || !this.isFoe(e.type)) continue;
            if (this.insideAny(e.pos, e.radius * 0.4, pools)) {
                e.vel.x *= 0.5;
                e.vel.y *= 0.5;
            }
        }
    }

    private meltInBile(dt: number, hooks: OrganHooks) {
        const pools = hooks.entities.filter(e => e.active && e.id.startsWith('bile_'));
        if (pools.length === 0) return;
        this.bileEnemyCue -= dt;
        const tickEnemies = this.bileEnemyCue <= 0;
        if (tickEnemies) this.bileEnemyCue = 0.35;
        for (const e of hooks.entities) {
            if (!e.active || !this.isFoe(e.type)) continue;
            if (!this.insideAny(e.pos, e.radius * 0.35, pools)) continue;
            if (tickEnemies) hooks.strike(e, e.type === EntityType.BOSS ? 10 : 26);
        }
        let playerIn = false;
        if (this.insideAny(hooks.player.pos, hooks.player.radius * 0.5, pools)) {
            playerIn = true;
            this.bileCue -= dt;
            if (this.bileCue <= 0) {
                this.bileCue = 0.4;
                hooks.hurt(3.2, hooks.player.pos, 0);
                hooks.popup(hooks.player.pos, hooks.t('MSG_BILE'), '#d6e36a', 18);
            }
        }
        if (!playerIn) this.bileCue = 0;
    }

    private expirePickups(dt: number, hooks: OrganHooks) {
        for (const e of hooks.entities) {
            if (!e.active || e.type !== EntityType.ORGAN_PICKUP) continue;
            e.ttl = (e.ttl || 0) - dt;
            if ((e.ttl || 0) <= 0) e.active = false;
        }
    }

    private collectPickups(hooks: OrganHooks) {
        if (!hooks.player.active) return;
        for (const e of hooks.entities) {
            if (!e.active || e.type !== EntityType.ORGAN_PICKUP) continue;
            const reach = hooks.player.radius + e.radius;
            const dx = hooks.player.pos.x - e.pos.x;
            const dy = hooks.player.pos.y - e.pos.y;
            if (dx * dx + dy * dy > reach * reach) continue;
            e.active = false;
            audioManager.playPowerUp();
            if (e.value === PICK_FLUORIDE) {
                this.fluorideT = 4;
                this.shield = 0.5;
                hooks.popup(hooks.player.pos, hooks.t('MSG_FLUORIDE'), '#e7fff8', 24);
            } else if (e.value === PICK_GLYCOGEN) {
                this.glycogenT = 2.8;
                hooks.popup(hooks.player.pos, hooks.t('MSG_GLYCOGEN'), '#ffe08a', 24);
            } else if (e.value === PICK_OXYGEN) {
                this.oxygenT = 4;
                this.fireMul = 0.72;
                hooks.popup(hooks.player.pos, hooks.t('MSG_OXYGEN'), '#9aefff', 24);
            } else if (e.value === PICK_DOPAMINE) {
                this.dopamineT = 4;
                this.critAdd = 0.22;
                hooks.popup(hooks.player.pos, hooks.t('MSG_DOPAMINE'), '#e2c6ff', 24);
            }
        }
    }

    private spawnPool(prefix: string, color: string, radius: number, ttl: number): Entity {
        const e: Entity = {
            id: `${prefix}${this.seq++}`,
            type: EntityType.ACID_POOL,
            pos: { x: 120 + Math.random() * (CANVAS_WIDTH - 240), y: 90 + Math.random() * (CANVAS_HEIGHT - 180) },
            vel: { x: 0, y: 0 },
            radius,
            health: 1,
            maxHealth: 1,
            color,
            damage: 0,
            active: true,
            ttl,
            value: ttl,
            drag: 0.4,
        };
        this.hooks?.spawn(e);
        return e;
    }

    private spawnPickup(kind: number, color: string) {
        const e: Entity = {
            id: `pick_${this.seq++}`,
            type: EntityType.ORGAN_PICKUP,
            pos: { x: CANVAS_WIDTH * (0.35 + Math.random() * 0.5), y: 120 + Math.random() * (CANVAS_HEIGHT - 240) },
            vel: { x: -0.35, y: (Math.random() - 0.5) * 0.4 },
            radius: kind === PICK_FLUORIDE ? 36 : 24,
            health: 1,
            maxHealth: 1,
            color,
            damage: 0,
            active: true,
            ttl: 12,
            value: kind,
            drag: 0.15,
        };
        this.hooks?.spawn(e);
    }

    private say(key: string, color: string) {
        const hooks = this.hooks;
        if (!hooks) return;
        this.banner = { text: hooks.t(key), color, ttl: 1.6 };
    }

    private stuckIn(pos: Vector2, prefix: string): boolean {
        const hooks = this.hooks;
        if (!hooks) return false;
        for (const e of hooks.entities) {
            if (!e.active || !e.id.startsWith(prefix)) continue;
            const r = e.radius * 0.75 + hooks.player.radius * 0.4;
            const dx = pos.x - e.pos.x;
            const dy = pos.y - e.pos.y;
            if (dx * dx + dy * dy < r * r) return true;
        }
        return false;
    }

    private insideAny(pos: Vector2, pad: number, pools: Entity[]): boolean {
        for (const p of pools) {
            const r = p.radius * 0.72 + pad;
            const dx = pos.x - p.pos.x;
            const dy = pos.y - p.pos.y;
            if (dx * dx + dy * dy < r * r) return true;
        }
        return false;
    }

    private isFoe(t: EntityType): boolean {
        return t === EntityType.BACTERIA || t === EntityType.VIRUS || t === EntityType.PARASITE || t === EntityType.FUNGI || t === EntityType.BOSS;
    }

    private hitPolyline(pts: Vector2[], thick: number, hooks: OrganHooks, onEnemy: (e: Entity) => void, onPlayer: () => void) {
        const near = (pos: Vector2, radius: number) => {
            const reach = (thick + radius) * (thick + radius);
            for (let i = 1; i < pts.length; i++) {
                if (pts[i].x === pts[i - 1].x && pts[i].y === pts[i - 1].y) continue;
                if (distToSeg(pos.x, pos.y, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y) <= reach) return true;
            }
            return false;
        };
        for (const e of hooks.entities) {
            if (!e.active || !this.isFoe(e.type)) continue;
            if (near(e.pos, e.radius)) onEnemy(e);
        }
        if (hooks.player.active && near(hooks.player.pos, hooks.player.radius)) onPlayer();
    }

    private tracePoints(trace: Trace): Vector2[] {
        const pts: Vector2[] = [];
        const n = 56;
        for (let i = 0; i <= n; i++) {
            const u = i / n;
            pts.push({ x: trace.x0 + u * trace.span, y: trace.y - pqrst(u) });
        }
        return pts;
    }

    private puff(vx: number, vy: number, alphaLife: number) {
        if (this.streaks.length > 28) return;
        const mag = Math.hypot(vx, vy) || 1;
        this.streaks.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            vx: (vx / mag) * 18,
            vy: (vy / mag) * 18,
            life: 0.25 * alphaLife,
        });
    }

    private randPoint(): Vector2 {
        return {
            x: 100 + Math.random() * (CANVAS_WIDTH - 200),
            y: 90 + Math.random() * (CANVAS_HEIGHT - 180),
        };
    }

    private drawBite(ctx: CanvasRenderingContext2D) {
        const half = 150;
        const y = this.biteY;
        const warn = this.bitePhase === 'warn';
        const warnP = warn ? 1 - Math.max(0, this.biteT) / 2.2 : 1;
        const snapP = this.bitePhase === 'snap' ? 1 - Math.max(0, this.biteT) / 1.2 : 0;
        const slamRaw = this.bitePhase === 'snap' ? Math.min(1, snapP / 0.28) : 0;
        const slam = slamRaw * slamRaw;
        const approach = warn ? (1 - warnP) * 56 : 0;
        const crush = slam * (half + 18);
        const flash = slam >= 0.98 ? Math.max(0, (1 - snapP) / 0.72) : 0;
        ctx.save();
        ctx.fillStyle = warn
            ? `rgba(255, 132, 104, ${0.05 + 0.03 * Math.sin(warnP * 10)})`
            : `rgba(255, 244, 232, ${0.06 + flash * 0.28})`;
        ctx.fillRect(0, y - half, CANVAS_WIDTH, half * 2);

        if (slam < 1) {
            ctx.setLineDash([18, 14]);
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(255, 176, 156, 0.5)';
            ctx.beginPath();
            ctx.moveTo(0, y - half);
            ctx.lineTo(CANVAS_WIDTH, y - half);
            ctx.moveTo(0, y + half);
            ctx.lineTo(CANVAS_WIDTH, y + half);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        this.drawJaw(ctx, -1, y - half - approach + crush);
        this.drawJaw(ctx, 1, y + half + approach - crush);

        if (flash > 0.02) {
            const fly = (1 - Math.min(1, flash)) * 86;
            ctx.fillStyle = `rgba(255, 252, 246, ${0.35 + flash * 0.55})`;
            ctx.fillRect(0, y - 10, CANVAS_WIDTH, 20);
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.35 + flash * 0.6})`;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            for (let i = 0; i < 11; i++) {
                const x = ((i + 0.5) / 11) * CANVAS_WIDTH;
                const dir = i % 2 === 0 ? -1 : 1;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + (i - 5) * 6, y + dir * (16 + fly));
                ctx.stroke();
            }
            ctx.strokeStyle = `rgba(255, 255, 255, ${flash * 0.85})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(CANVAS_WIDTH, y);
            ctx.stroke();
        }

        if (warn && this.hooks && warnP > 0.2) {
            const label = this.hooks.t('ALERT_BITE');
            ctx.font = '700 34px "Chakra Petch", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.lineWidth = 5;
            ctx.strokeStyle = 'rgba(28, 14, 12, 0.55)';
            ctx.fillStyle = 'rgba(255, 228, 218, 0.9)';
            ctx.strokeText(label, CANVAS_WIDTH / 2, y);
            ctx.fillText(label, CANVAS_WIDTH / 2, y);
        }
        ctx.restore();
    }

    private drawJaw(ctx: CanvasRenderingContext2D, dir: number, tip: number) {
        const thick = 110;
        const base = tip + dir * thick;
        const valley = tip + dir * 36;
        const bulge = tip - dir * 18;
        const cusps = 3;
        const span = CANVAS_WIDTH / cusps;
        ctx.beginPath();
        ctx.moveTo(0, base);
        ctx.lineTo(0, valley);
        for (let i = 0; i < cusps; i++) {
            const left = i * span;
            const right = left + span;
            const peak = left + span * (dir > 0 ? 0.72 : 0.38);
            ctx.quadraticCurveTo((left + peak) / 2, bulge, peak, tip);
            ctx.quadraticCurveTo((peak + right) / 2, bulge, right, valley);
        }
        ctx.lineTo(CANVAS_WIDTH, base);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, tip, 0, base);
        grad.addColorStop(0, 'rgba(246, 248, 250, 0.94)');
        grad.addColorStop(0.35, 'rgba(214, 222, 228, 0.62)');
        grad.addColorStop(1, 'rgba(198, 208, 216, 0)');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(244, 248, 252, 0.9)';
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';
        ctx.stroke();
    }

    private drawSaliva(ctx: CanvasRenderingContext2D, low: boolean) {
        for (const s of this.streams) this.drawRibbon(ctx, s, low);
    }

    private drawRibbon(ctx: CanvasRenderingContext2D, s: SalivaRibbon, low: boolean) {
        const from = Math.max(0, s.head - s.span);
        const to = Math.min(2, s.head);
        if (to - from < 0.04) return;
        const steps = low ? 12 : 26;
        const time = (this.hooks?.time || 0) / 280;
        const samples: Array<{ x: number; y: number; nx: number; ny: number; w: number }> = [];
        for (let i = 0; i <= steps; i++) {
            const along = i / steps;
            const u = from + (to - from) * along;
            const p = this.salivaPoint(s, u);
            const q = this.salivaPoint(s, Math.min(2, u + 0.045));
            const dx = q.x - p.x;
            const dy = q.y - p.y;
            const len = Math.hypot(dx, dy) || 1;
            const swell = 0.62 + 0.38 * along;
            const wave = Math.sin(along * 7 + time) * s.half * 0.06;
            samples.push({
                x: p.x, y: p.y,
                nx: -dy / len, ny: dx / len,
                w: s.half * swell + wave,
            });
        }
        ctx.save();
        ctx.beginPath();
        samples.forEach((p, i) => {
            const x = p.x + p.nx * p.w;
            const y = p.y + p.ny * p.w;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        for (let i = samples.length - 1; i >= 0; i--) {
            const p = samples[i];
            ctx.lineTo(p.x - p.nx * p.w, p.y - p.ny * p.w);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(186, 228, 236, 0.2)';
        ctx.fill();
        ctx.save();
        ctx.clip();
        const body = ctx.createLinearGradient(0, samples[0].y - s.half, 0, samples[0].y + s.half);
        body.addColorStop(0, 'rgba(244, 252, 255, 0.62)');
        body.addColorStop(0.42, 'rgba(176, 220, 232, 0.3)');
        body.addColorStop(1, 'rgba(130, 190, 206, 0.06)');
        ctx.fillStyle = body;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.restore();

        ctx.beginPath();
        samples.forEach((p, i) => {
            const x = p.x + p.nx * p.w * 0.38;
            const y = p.y + p.ny * p.w * 0.38;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.62)';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        const bubbles = low ? 4 : 7;
        for (let i = 0; i < bubbles; i++) {
            const p = samples[Math.min(samples.length - 1, 2 + i * Math.floor(steps / bubbles))];
            ctx.beginPath();
            ctx.arc(p.x + p.nx * 3, p.y + p.ny * 3, 1.6 + (i % 3), 0, Math.PI * 2);
            ctx.fill();
        }

        if (this.hooks) {
            for (const e of this.hooks.entities) {
                if (!e.active || !e.id.startsWith('plaque_')) continue;
                if (!this.streamTouch(s, e.pos).hit) continue;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
                for (let n = 0; n < 3; n++) {
                    ctx.beginPath();
                    ctx.arc(
                        e.pos.x + Math.cos(n * 2.1 + time) * e.radius * 0.3,
                        e.pos.y - 6 + Math.sin(n * 1.6 + time) * 6,
                        2.5 + n,
                        0, Math.PI * 2
                    );
                    ctx.fill();
                }
            }
        }
        ctx.restore();
    }

    private drawFilter(ctx: CanvasRenderingContext2D) {
        const grow = this.filterPhase === 'warn' ? 1 - this.filterT / 1.25 : 1;
        ctx.save();
        ctx.translate(this.filterX, this.filterY);
        ctx.strokeStyle = '#d6e36a';
        ctx.globalAlpha = 0.35 + grow * 0.4;
        ctx.lineWidth = 3;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(0, 0, 40 + i * 48 + grow * 20, this.hooks ? this.hooks.time / 300 + i : i, Math.PI * 1.6 + i);
            ctx.stroke();
        }
        ctx.globalAlpha = this.filterPhase === 'on' ? 0.55 : 0.2;
        ctx.fillStyle = '#6a8f18';
        ctx.beginPath();
        ctx.arc(0, 0, 70, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    private drawTrace(ctx: CanvasRenderingContext2D, trace: Trace, low: boolean) {
        const warned = trace.age < 0;
        const lead = warned ? 1 : Math.max(0, 1 - trace.age / 0.28);
        ctx.save();
        ctx.fillStyle = `rgba(255, 214, 220, ${0.16 + lead * 0.22})`;
        ctx.fillRect(0, trace.y - 78, CANVAS_WIDTH, 156);
        if (!warned) {
            const pts = low ? this.tracePoints(trace).filter((_, i) => i % 2 === 0) : this.tracePoints(trace);
            ctx.beginPath();
            pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
            ctx.strokeStyle = 'rgba(255, 80, 96, 0.35)';
            ctx.lineWidth = 22;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.stroke();
            ctx.strokeStyle = '#fff6f7';
            ctx.lineWidth = 4;
            ctx.stroke();
        }
        ctx.restore();
    }

    private drawGust(ctx: CanvasRenderingContext2D, low: boolean) {
        ctx.save();
        ctx.strokeStyle = this.lungPhase === 'telegraph' ? 'rgba(240, 183, 200, 0.45)' : 'rgba(234, 214, 222, 0.7)';
        ctx.lineWidth = 2;
        const shown = low ? this.streaks.slice(0, 8) : this.streaks;
        for (const s of shown) {
            ctx.globalAlpha = Math.max(0, s.life * 3);
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(s.x - s.vx * 2.4, s.y - s.vy * 2.4);
            ctx.stroke();
        }
        ctx.restore();
    }

    private drawCoughBand(ctx: CanvasRenderingContext2D) {
        const blasting = this.lungPhase === 'blast';
        ctx.save();
        ctx.fillStyle = blasting ? 'rgba(255, 236, 242, 0.28)' : 'rgba(255, 120, 150, 0.16)';
        ctx.fillRect(0, this.bandY - this.bandHalf, CANVAS_WIDTH, this.bandHalf * 2);
        if (blasting) {
            ctx.strokeStyle = 'rgba(255, 250, 252, 0.8)';
            ctx.lineWidth = 3;
            for (let i = 0; i < 8; i++) {
                const y = this.bandY - this.bandHalf + (i + 0.5) * (this.bandHalf * 2 / 8);
                ctx.beginPath();
                ctx.moveTo(CANVAS_WIDTH, y);
                ctx.lineTo(40, y + Math.sin(i) * 12);
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    private drawBolt(ctx: CanvasRenderingContext2D, bolt: Bolt, low: boolean) {
        ctx.save();
        ctx.fillStyle = '#d7c6ff';
        ctx.globalAlpha = bolt.t < 0 ? 0 : bolt.fired ? 1 : 0.85;
        if (bolt.t >= 0) {
            ctx.beginPath();
            ctx.arc(bolt.a.x, bolt.a.y, bolt.fired ? 10 : 7, 0, Math.PI * 2);
            ctx.arc(bolt.b.x, bolt.b.y, bolt.fired ? 8 : 6, 0, Math.PI * 2);
            ctx.fill();
        }
        if (bolt.fired) {
            const pts = synapsePoints(bolt.a, bolt.b);
            const gapAt = Math.floor(pts.length * 0.7);
            const stroke = (from: number, to: number, width: number, color: string) => {
                ctx.beginPath();
                for (let i = from; i < to; i++) {
                    if (i === from) ctx.moveTo(pts[i].x, pts[i].y);
                    else ctx.lineTo(pts[i].x, pts[i].y);
                }
                ctx.strokeStyle = color;
                ctx.lineWidth = width;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.stroke();
            };
            if (!low) stroke(0, gapAt, 16, 'rgba(180, 140, 255, 0.35)');
            stroke(0, gapAt, 3.5, '#f4edff');
            stroke(gapAt + 1, pts.length, 3, '#9ad7ff');
            const bulb = pts[Math.max(0, gapAt - 1)];
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(bulb.x, bulb.y, 8, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    private drawBuffRing(ctx: CanvasRenderingContext2D, player: Entity) {
        if (!player.active) return;
        const rings: string[] = [];
        if (this.fluorideT > 0) rings.push('#e7fff8');
        if (this.rinseT > 0) rings.push('#9aefff');
        if (this.oxygenT > 0) rings.push('#9aefff');
        if (this.dopamineT > 0) rings.push('#e2c6ff');
        if (this.glycogenT > 0) rings.push('#ffe08a');
        rings.forEach((color, i) => {
            ctx.strokeStyle = color;
            ctx.globalAlpha = 0.85;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(player.pos.x, player.pos.y, player.radius + 16 + i * 7, 0, Math.PI * 2);
            ctx.stroke();
        });
        ctx.globalAlpha = 1;
    }

    private drawEnamel(ctx: CanvasRenderingContext2D, _time: number) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(214, 224, 232, 0.13)';
        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.bezierCurveTo(460, 60, 220, 480, 390, CANVAS_HEIGHT + 20);
        ctx.lineTo(0, CANVAS_HEIGHT + 20);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(CANVAS_WIDTH, -20);
        ctx.bezierCurveTo(CANVAS_WIDTH - 500, 120, CANVAS_WIDTH - 210, 620, CANVAS_WIDTH - 430, CANVAS_HEIGHT + 20);
        ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT + 20);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(186, 206, 218, 0.22)';
        ctx.lineWidth = 2;
        const pits: Array<[number, number, number, number]> = [
            [120, 210, 42, 30],
            [240, 820, 56, 38],
            [CANVAS_WIDTH - 150, 260, 64, 44],
            [CANVAS_WIDTH - 110, 880, 36, 26],
        ];
        for (const [x, y, rx, ry] of pits) {
            ctx.beginPath();
            ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        const groove = ctx.createLinearGradient(CANVAS_WIDTH * 0.3, 0, CANVAS_WIDTH * 0.7, 0);
        groove.addColorStop(0, 'rgba(0, 0, 0, 0)');
        groove.addColorStop(0.5, 'rgba(0, 0, 0, 0.16)');
        groove.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = groove;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    private drawLobules(ctx: CanvasRenderingContext2D) {
        for (let i = 0; i < 8; i++) {
            const x = 200 + (i % 4) * 420;
            const y = 220 + Math.floor(i / 4) * 480;
            hex(ctx, x, y, 90);
            ctx.stroke();
        }
    }

    private drawAlveoli(ctx: CanvasRenderingContext2D, time: number) {
        for (let i = 0; i < 11; i++) {
            const x = 160 + (i % 4) * 440 + Math.sin(time / 900 + i) * 8;
            const y = 180 + Math.floor(i / 4) * 280;
            ctx.beginPath();
            ctx.arc(x, y, 70, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    private drawNeural(ctx: CanvasRenderingContext2D, time: number) {
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 7; i++) {
            const x = 220 + i * 230;
            const y = 200 + (i % 2) * 420;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + 80, y - 50 + Math.sin(time / 700 + i) * 10);
            ctx.lineTo(x + 150, y + 30);
            ctx.moveTo(x + 80, y - 40);
            ctx.lineTo(x + 110, y - 110);
            ctx.stroke();
        }
    }
}

function pqrst(t: number): number {
    const g = (center: number, amp: number, width: number) =>
        amp * Math.exp(-((t - center) * (t - center)) / (2 * width * width));
    return (
        g(0.16, 26, 0.038) +
        g(0.40, -20, 0.012) +
        g(0.455, 148, 0.013) +
        g(0.52, -46, 0.015) +
        g(0.74, 40, 0.048)
    );
}

function synapsePoints(a: Vector2, b: Vector2): Vector2[] {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const mid = { x: (a.x + b.x) / 2 + nx * 42, y: (a.y + b.y) / 2 + ny * 42 };
    const cleft = { x: a.x + dx * 0.66, y: a.y + dy * 0.66 };
    const after = { x: a.x + dx * 0.78, y: a.y + dy * 0.78 };
    const pts: Vector2[] = [];
    for (let i = 0; i <= 14; i++) pts.push(quad(a, mid, cleft, i / 14));
    pts.push(cleft);
    const spine = { x: after.x + nx * 28, y: after.y + ny * 28 };
    for (let i = 0; i <= 8; i++) pts.push(quad(after, spine, b, i / 8));
    return pts;
}

function quad(a: Vector2, b: Vector2, c: Vector2, t: number): Vector2 {
    const u = 1 - t;
    return {
        x: u * u * a.x + 2 * u * t * b.x + t * t * c.x,
        y: u * u * a.y + 2 * u * t * b.y + t * t * c.y,
    };
}

function distToSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
    const abx = bx - ax;
    const aby = by - ay;
    const ab2 = abx * abx + aby * aby || 1;
    let t = ((px - ax) * abx + (py - ay) * aby) / ab2;
    t = Math.max(0, Math.min(1, t));
    const dx = px - (ax + abx * t);
    const dy = py - (ay + aby * t);
    return dx * dx + dy * dy;
}

function hex(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
}

function clamp(n: number, a: number, b: number): number {
    return Math.max(a, Math.min(b, n));
}

function mixHex(a: string, b: string, t: number): string {
    const ar = parseInt(a.slice(1, 3), 16);
    const ag = parseInt(a.slice(3, 5), 16);
    const ab = parseInt(a.slice(5, 7), 16);
    const br = parseInt(b.slice(1, 3), 16);
    const bg = parseInt(b.slice(3, 5), 16);
    const bb = parseInt(b.slice(5, 7), 16);
    const c = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
    return `#${c(ar, br)}${c(ag, bg)}${c(ab, bb)}`;
}

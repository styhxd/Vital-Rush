/**
 * Os cinco órgãos do arcade. Cada um pinta o fundo e apronta
 * alguma coisa — quase sempre contra o Vital.
 */

import { Entity, EntityType, Language, OrganId, Vector2 } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';
import { audioManager } from './audioManager';
import { buzz } from './haptics';
import { CANON_ROUTE, hopLine } from './casebook';

export type { OrganId };

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
    lung:  { bg: '#1c1218', accent: '#f3c3ce', name: 'ORG_LUNG' },
    brain: { bg: '#070410', accent: '#c9a6ff', name: 'ORG_BRAIN' },
};

export const ORGAN_CHEATS: Record<string, number> = {
    molar: 0,
    figado: 6,
    coracao: 12,
    pulmao: 18,
    cerebro: 24,
};

export function organForWave(waveIndex: number, route: OrganId[] = CANON_ROUTE): OrganId {
    const book = route.length === 5 ? route : CANON_ROUTE;
    const slot = Math.floor((waveIndex % 30) / 6) % 5;
    return book[slot];
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
        lung: 'saturate(0.4) brightness(0.82) sepia(0.35)',
        brain: 'hue-rotate(230deg) saturate(1.5) brightness(0.9)',
    };
    const opacity = id === 'brain' ? 0.1 : id === 'heart' ? 0.28 : id === 'lung' ? 0.08 : id === 'molar' ? 0.16 : 0.2;
    const filter = platinum ? `${filters[id]} hue-rotate(18deg) sepia(0.35)` : filters[id];
    return { filter, opacity };
}

export function cellBudget(id: OrganId): number {
    if (id === 'molar') return 48;
    if (id === 'liver') return 64;
    if (id === 'heart') return 96;
    if (id === 'lung') return 32;
    if (id === 'brain') return 26;
    return 34;
}

export function rollCellStyle(id: OrganId): number {
    const r = Math.random();
    if (id === 'molar') return r < 0.74 ? CELL.SALIVA : CELL.SPECK;
    if (id === 'liver') return r < 0.58 ? CELL.VENOUS : CELL.BILE;
    if (id === 'heart') return CELL.RBC;
    if (id === 'lung') return r < 0.34 ? CELL.RBC : r < 0.72 ? CELL.CO2 : CELL.O2;
    return r < 0.7 ? CELL.MOTE : CELL.MYELIN;
}

export function cellColor(style: number, organ: OrganId): string {
    if (style === CELL.SALIVA) return organ === 'molar' ? '#c5d4de' : '#f4efe4';
    if (style === CELL.SPECK) return organ === 'molar' ? '#8aa0b0' : '#d6c15a';
    if (style === CELL.VENOUS) return '#6e2a30';
    if (style === CELL.BILE) return '#c6d24a';
    if (style === CELL.RBC) return organ === 'lung' ? '#e7b4be' : organ === 'heart' ? '#ff4d55' : '#d25a5e';
    if (style === CELL.CO2) return organ === 'lung' ? '#e4d0d6' : '#ead6de';
    if (style === CELL.O2) return organ === 'lung' ? '#d7e3e8' : '#8ee7ff';
    if (style === CELL.MYELIN) return organ === 'brain' ? '#b7a8d4' : '#d7d2ea';
    return '#c9a6ff';
}

export function cellRises(style: number): boolean {
    return style === CELL.SALIVA || style === CELL.CO2 || style === CELL.O2 || style === CELL.MOTE;
}

const PICK_FLUORIDE = 1;
const PICK_GLYCOGEN = 2;
const PICK_OXYGEN = 3;
const PICK_DOPAMINE = 4;

const LUNG_CUPS: Array<[number, number, number, number]> = [
    [40, 160, 380, 300],
    [-20, 560, 340, 380],
    [70, 980, 400, 300],
    [CANVAS_WIDTH - 40, 140, 360, 280],
    [CANVAS_WIDTH + 10, 540, 380, 400],
    [CANVAS_WIDTH - 80, 980, 360, 280],
    [520, -20, 480, 200],
    [1460, -10, 460, 190],
    [480, CANVAS_HEIGHT + 10, 520, 210],
    [1480, CANVAS_HEIGHT + 20, 480, 200],
];

const LUNG_PORES: Array<[number, number, number, number]> = [
    [86, 250, 36, 26],
    [48, 790, 50, 34],
    [CANVAS_WIDTH - 70, 280, 42, 30],
    [CANVAS_WIDTH - 110, 840, 38, 28],
    [640, 28, 54, 22],
    [1280, CANVAS_HEIGHT - 18, 62, 24],
];

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

interface Clot {
    x: number;
    y: number;
    r: number;
    age: number;
    warn: number;
    vx: number;
    spin: number;
    loose: boolean;
    hit: Set<string>;
    playerHit: boolean;
}

interface Trace {
    y: number;
    x0: number;
    age: number;
    span: number;
    shape: number;
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

interface Voyage {
    from: OrganId;
    to: OrganId;
    t: number;
    phase: 'exit' | 'black' | 'read' | 'cross' | 'enter';
    shown: number;
    line: string;
    title: string;
    fromTitle: string;
    x0: number;
    y0: number;
    anchored: boolean;
    landed: boolean;
}

const EXIT_S = 1.72;
const BLACK_S = 0.46;
const CROSS_S = 2.9;
const ENTER_S = 1.22;

export class OrganDirector {
    id: OrganId = 'molar';
    wind: Vector2 = { x: 0, y: 0 };
    speedMul = 1;
    fireMul = 1;
    critAdd = 0;
    shield = 0;
    pulse = 0;
    whiteout = 0;
    storm = 0;

    private route: OrganId[] = [...CANON_ROUTE];
    private lang: Language = 'EN';
    private voyage: Voyage | null = null;
    private local = 0;
    private pastWall = 0;
    private lubLatch = false;
    private ecgCue = false;
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
    private filterPhase: 'idle' | 'warn' | 'on' | 'fade' = 'idle';
    private filterSpan = 2.8;
    private filterT = 0;
    private filterX = 900;
    private filterY = 500;
    private glycogenClock = 12;

    private ecgClock = 7;
    private traces: Trace[] = [];
    private clots: Clot[] = [];
    private clotClock = 11;
    private clotN = 0;
    private heartBeat = 0;
    private beatN = 0;

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
    private streaks: { x: number; y: number; vx: number; vy: number; life: number; max: number; bend: number }[] = [];

    private synapseClock = 6.5;
    private bolts: Bolt[] = [];
    private dopamineClock = 14;
    private synapseN = 0;

    private cariesCue = 0;
    private bileCue = 0;
    private bileEnemyCue = 0;

    setRoute(route: OrganId[]) {
        if (route && route.length === 5) this.route = route.slice();
    }

    setLanguage(lang: Language) {
        this.lang = lang;
    }

    charting(): boolean {
        return this.voyage !== null;
    }

    willLeave(waveIndex: number): boolean {
        return organForWave(waveIndex, this.route) !== organForWave(waveIndex + 1, this.route);
    }

    /** Cutscene entre órgãos, antes da ficha. O id visual só muda na chegada. */
    openVoyage(nextWave: number, translate: (key: string) => string) {
        const to = organForWave(nextWave, this.route);
        const from = this.id;
        if (from === to || this.voyage) return;
        this.armVoyage(from, to, translate);
    }

    transitLeft(): number {
        return this.voyage ? 1 : 0;
    }

    advanceTransit(): boolean {
        const tr = this.voyage;
        if (!tr) return false;
        if (tr.phase === 'exit' || tr.phase === 'black' || tr.phase === 'enter') return false;
        if (tr.phase === 'read') {
            if (tr.shown < tr.line.length) {
                tr.shown = tr.line.length;
                audioManager.playPage();
                return true;
            }
            tr.phase = 'cross';
            tr.t = 0;
            audioManager.playPage();
            audioManager.playTransit(tr.to);
            return true;
        }
        if (tr.phase === 'cross' && tr.t >= 0.9) {
            this.beginArrival();
            return true;
        }
        return false;
    }

    placePlayer(player: Entity): boolean {
        const tr = this.voyage;
        if (!tr) return false;
        if (!tr.anchored) return false;
        if (tr.phase === 'exit') {
            const p = this.exitPoint(tr);
            player.pos.x = p.x;
            player.pos.y = p.y;
            player.vel.x = 22;
            player.vel.y = 0;
            return true;
        }
        if (tr.phase === 'enter') {
            const p = this.enterPoint(tr);
            player.pos.x = p.x;
            player.pos.y = p.y;
            player.vel.x = 16 * (1 - Math.min(1, tr.t / ENTER_S));
            player.vel.y = 0;
            return true;
        }
        player.pos.x = -320;
        player.pos.y = CANVAS_HEIGHT / 2;
        player.vel.x = 0;
        player.vel.y = 0;
        return true;
    }

    private armVoyage(from: OrganId, to: OrganId, translate: (key: string) => string) {
        this.voyage = {
            from,
            to,
            t: 0,
            phase: 'exit',
            shown: 0,
            line: hopLine(from, to, this.lang),
            title: translate(THEME[to].name),
            fromTitle: translate(THEME[from].name),
            x0: 0,
            y0: CANVAS_HEIGHT / 2,
            anchored: false,
            landed: false,
        };
        audioManager.playDepart();
    }

    private beginArrival() {
        const tr = this.voyage;
        if (!tr || tr.phase === 'enter') return;
        tr.phase = 'enter';
        tr.t = 0;
        if (!tr.landed) {
            tr.landed = true;
            this.id = tr.to;
            audioManager.setScene(tr.to, 0, false);
            audioManager.playArrive();
        }
    }

    private exitPoint(tr: Voyage): { x: number; y: number } {
        const u = easeIn(Math.min(1, tr.t / EXIT_S));
        return {
            x: tr.x0 + (CANVAS_WIDTH + 160 - tr.x0) * u,
            y: tr.y0 + (CANVAS_HEIGHT * 0.5 - tr.y0) * 0.22 * u,
        };
    }

    private enterPoint(tr: Voyage): { x: number; y: number } {
        const u = easeOut(Math.min(1, tr.t / ENTER_S));
        return {
            x: -90 + (CANVAS_WIDTH / 6 + 90) * u,
            y: CANVAS_HEIGHT / 2 + Math.sin(u * Math.PI) * -36,
        };
    }

    onWave(waveIndex: number, translate: (key: string) => string): boolean {
        const next = organForWave(waveIndex, this.route);
        const prev = this.id;
        const changed = prev !== next;
        const entered = changed && waveIndex > 0;
        this.local = waveIndex % 6;
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
        this.storm = 0;
        this.bitePhase = 'idle';
        this.filterPhase = 'idle';
        this.lungPhase = 'idle';
        this.traces = [];
        this.bolts = [];
        this.streaks = [];
        const quiet = 5 - this.local;
        this.plaqueClock = 7 + quiet * 0.55;
        this.biteClock = 14;
        this.fluorideClock = 14;
        this.salivaClock = 10 + quiet * 0.45;
        this.streams = [];
        this.salivaCue = 0;
        this.ridingSaliva = false;
        this.bileClock = 7 + quiet * 0.6;
        this.filterClock = this.local <= 2 ? 16 : 12;
        this.glycogenClock = 13;
        this.ecgClock = 8 + quiet * 0.7;
        this.heartBeat = 0;
        this.beatN = 0;
        this.clots = [];
        this.clotClock = 9 + quiet * 0.55;
        this.clotN = 0;
        this.lungClock = 7 + quiet * 0.55;
        this.gustN = 0;
        this.oxygenClock = 12;
        this.synapseClock = 8 + quiet * 0.65;
        this.dopamineClock = 14;
        this.synapseN = 0;
        if (entered) {
            this.armVoyage(prev, next, translate);
        } else {
            this.id = next;
        }
        audioManager.setScene(entered ? prev : next, this.local, waveIndex % 6 === 5);
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
        if (this.systoleT > 0) this.systoleT -= dt;
        if (this.glycogenT > 0 && hooks.player.active) {
            this.glycogenT -= dt;
            hooks.heal(hooks.player.maxHealth * 0.055 * dt);
        }
        if (this.banner) {
            this.banner.ttl -= dt;
            if (this.banner.ttl <= 0) this.banner = null;
        }
        if (this.whiteout > 0) this.whiteout = Math.max(0, this.whiteout - dt);
        if (this.storm > 0) this.storm = Math.max(0, this.storm - dt * 1.35);
        if (this.voyage) {
            const tr = this.voyage;
            if (!tr.anchored) {
                tr.x0 = hooks.player.pos.x;
                tr.y0 = hooks.player.pos.y;
                tr.anchored = true;
            }
            const step = Math.min(0.05, dt);
            tr.t += step;
            if (tr.phase === 'exit' && tr.t >= EXIT_S) {
                tr.phase = 'black';
                tr.t = 0;
            } else if (tr.phase === 'black' && tr.t >= BLACK_S) {
                tr.phase = 'read';
                tr.t = 0;
            } else if (tr.phase === 'read' && tr.shown < tr.line.length) {
                const nextShown = Math.min(tr.line.length, tr.shown + step * 34);
                if (Math.floor(nextShown / 3) !== Math.floor(tr.shown / 3)) audioManager.playGlyph();
                tr.shown = nextShown;
            } else if (tr.phase === 'cross' && tr.t >= CROSS_S) {
                this.beginArrival();
            } else if (tr.phase === 'enter' && tr.t >= ENTER_S) {
                this.voyage = null;
            }
            return;
        }

        if (!live || !hooks.player.active) return;

        const pace = 1 + this.local * 0.1 + this.pastWall * 0.12;
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
        this.settlePools(hooks);
        this.expirePickups(dt, hooks);
        this.collectPickups(hooks);
        if (!hooks.player.active || this.charting()) return;

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
            audioManager.playBite({ x: CANVAS_WIDTH / 2, y: this.biteY });
        }
        if (this.filterPhase === 'on') this.resolveFilter(hooks);
        for (const trace of this.traces) this.resolveTrace(trace, hooks);
        for (const clot of this.clots) this.resolveClot(clot, hooks);
        if (this.lungPhase === 'blast') this.resolveCough(hooks);
        for (const bolt of this.bolts) this.resolveBolt(bolt, hooks);
    }

    drawBackdrop(ctx: CanvasRenderingContext2D, time: number, low: boolean) {
        if (this.id === 'heart' && this.pulse > 0.02) {
            ctx.fillStyle = `rgba(140, 18, 28, ${0.11 * this.pulse})`;
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
        for (const clot of this.clots) this.drawClot(ctx, clot);
        for (const trace of this.traces) this.drawTrace(ctx, trace, low);
        if (this.lungPhase === 'telegraph' || this.lungPhase === 'gust') this.drawGust(ctx, low);
        if (this.lungPhase === 'inhale' || this.lungPhase === 'blast') this.drawCoughBand(ctx, low);
        if (this.storm > 0.02 && this.whiteout < 0.08) this.drawStorm(ctx);
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
            this.plaqueClock = Math.max(7.2, (14 - this.local * 1.15) / pace);
            const plaque = this.spawnPool('plaque_', '#c6b06a', 58 + Math.random() * 28, 8.5);
            audioManager.playStick(plaque.pos);
        }
        if (this.local >= 2) {
            this.fluorideClock -= dt;
            if (this.fluorideClock <= 0) {
                this.fluorideClock = (26 - this.local * 0.6) / pace;
                this.spawnPickup(PICK_FLUORIDE, '#e7fff8');
            }
        }
        if (this.local >= 1) {
            this.salivaClock -= dt;
            if (this.salivaClock <= 0) {
                this.spawnRibbons(hooks);
                this.salivaClock = Math.max(11, (24 - this.local * 1.8) / pace);
            }
        }
        this.rideSaliva(dt, hooks);
        if (this.local >= 3) this.tickBite(dt, pace);
    }

    private spawnRibbons(hooks: OrganHooks) {
        const count = this.local >= 4 ? 2 : 1;
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
        audioManager.playWet(this.streams[this.streams.length - 1]?.mid);
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
                    this.rinsePlaque(e, s, dt);
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
                audioManager.playBiteWarn({ x: CANVAS_WIDTH / 2, y: this.biteY });
            }
            return;
        }
        this.biteT -= dt;
        if (this.bitePhase === 'warn' && this.biteT <= 0) {
            this.bitePhase = 'snap';
            this.biteT = 1.2;
            this.biteHit = false;
        } else if (this.bitePhase === 'snap' && this.biteT <= 0) {
            this.bitePhase = 'idle';
            this.biteClock = Math.max(11, (20 - this.local * 1.1) / pace);
        }
    }

    private tickLiver(dt: number, pace: number, hooks: OrganHooks) {
        this.bileClock -= dt;
        if (this.bileClock <= 0) {
            this.bileClock = Math.max(7.4, (13 - this.local * 0.95) / pace);
            const pool = this.spawnPool('bile_', '#c6e04a', 84 + Math.random() * 40, 7.5);
            audioManager.playDrip(pool.pos);
            pool.vel.x = -0.45;
            pool.vel.y = (Math.random() - 0.5) * 0.35;
        }
        if (this.local >= 1) {
            this.glycogenClock -= dt;
            if (this.glycogenClock <= 0) {
                this.glycogenClock = (22 - this.local * 0.4) / pace;
                this.spawnPickup(PICK_GLYCOGEN, '#ffe08a');
            }
        }
        if (this.local < 2) return;
        if (this.filterPhase === 'idle') {
            this.filterClock -= dt;
            if (this.filterClock <= 0) {
                this.filterPhase = 'warn';
                this.filterSpan = this.local <= 2 ? 3.4 : 2.7;
                this.filterT = this.filterSpan;
                this.filterX = CANVAS_WIDTH * (0.38 + Math.random() * 0.4);
                this.filterY = 160 + Math.random() * (CANVAS_HEIGHT - 320);
                this.say('ALERT_FILTER', '#d6e36a');
                audioManager.playSuction({ x: this.filterX, y: this.filterY });
            }
        } else {
            this.filterT -= dt;
            if (this.filterPhase === 'warn' || this.filterPhase === 'on') {
                this.pullFilter(hooks, this.filterPhase === 'on' ? 1 : 0.28);
            }
            if (this.filterPhase === 'warn' && this.filterT <= 0) {
                this.filterPhase = 'on';
                this.filterSpan = this.local <= 2 ? 5.2 : 4.5;
                this.filterT = this.filterSpan;
                audioManager.playGulp({ x: this.filterX, y: this.filterY });
            } else if (this.filterPhase === 'on' && this.filterT <= 0) {
                this.filterPhase = 'fade';
                this.filterSpan = 0.95;
                this.filterT = this.filterSpan;
            } else if (this.filterPhase === 'fade' && this.filterT <= 0) {
                this.filterPhase = 'idle';
                this.filterClock = Math.max(14, (26 - this.local * 1.3) / pace);
            }
        }
    }

    private tickHeart(dt: number, pace: number, hooks: OrganHooks) {
        const glow = audioManager.heartGlow();
        if (glow >= 0) {
            this.pulse = glow;
            if (glow > 0.82 && this.systoleT <= 0 && !this.lubLatch) {
                this.lubLatch = true;
                this.beatN++;
                this.systoleT = 0.16;
            }
            if (glow < 0.28) this.lubLatch = false;
        } else {
            const period = Math.max(0.58, 0.9 - this.local * 0.045 - this.pastWall * 0.02);
            this.heartBeat += dt;
            const phase = (this.heartBeat % period) / period;
            this.pulse = Math.exp(-phase * 14);
            if (phase < 0.08 && this.systoleT <= 0) {
                this.beatN++;
                this.systoleT = 0.16;
            }
        }
        if (this.systoleT > 0) {
            const kick = Math.min(1, this.systoleT / 0.1);
            this.wind.x -= 1.4 * kick;
            this.speedMul = Math.max(this.speedMul, 1 + 0.1 * kick);
        }

        this.traces = this.traces.filter(tr => {
            tr.age += dt;
            tr.x0 = CANVAS_WIDTH - (tr.age / 1.25) * (CANVAS_WIDTH + tr.span);
            return tr.x0 > -tr.span - 40;
        });

        if (this.local >= 1) {
            this.ecgClock -= dt;
            if (!this.ecgCue && this.ecgClock < 1.55 && this.ecgClock > 0) {
                this.ecgCue = true;
                audioManager.ecgApproach();
            }
            if (this.ecgClock <= 0) {
                this.ecgCue = false;
                this.ecgClock = Math.max(10, (19 - this.local * 0.9) / pace);
                const y = 170 + Math.random() * (CANVAS_HEIGHT - 340);
                audioManager.ecgPass({ x: CANVAS_WIDTH * 0.5, y });
                const shape = this.beatN % 4;
                const spans = [0.56, 0.74, 0.64, 0.84];
                this.traces.push({ y, x0: CANVAS_WIDTH + 20, age: -1.25, span: CANVAS_WIDTH * spans[shape], shape, hit: new Set(), playerHit: false });
                hooks.shake(8);
                if (this.local >= 3) {
                    const y2 = Math.max(140, Math.min(CANVAS_HEIGHT - 140, y + (Math.random() < 0.5 ? -240 : 240)));
                    const shape2 = (shape + 2) % 4;
                    this.traces.push({ y: y2, x0: CANVAS_WIDTH + 20, age: -1.9, span: CANVAS_WIDTH * spans[shape2], shape: shape2, hit: new Set(), playerHit: false });
                }
            }
        }
        this.tickClots(dt, pace, hooks);
    }

    private tickClots(dt: number, pace: number, hooks: OrganHooks) {
        this.clots = this.clots.filter(c => {
            c.age += dt;
            if (c.age >= 0) {
                if (!c.loose) {
                    c.loose = true;
                    audioManager.playClot({ x: c.x, y: c.y });
                }
                c.x += c.vx * dt;
                c.y += Math.sin(c.age * 1.3 + c.spin) * 22 * dt;
            } else {
                const step = 0.34;
                const prev = c.age - dt;
                if (Math.floor(prev / step) !== Math.floor(c.age / step)) audioManager.playBubble({ x: c.x, y: c.y });
            }
            return c.x > -c.r - 80 && c.y > -40 && c.y < CANVAS_HEIGHT + 40;
        });
        if (this.local < 2 || this.id !== 'heart') return;
        this.clotClock -= dt;
        if (this.clotClock > 0) return;
        this.clotClock = Math.max(8.5, (18 - this.local * 1.1) / pace);
        this.clotN++;
        const early = this.local <= 3;
        this.spawnClot(hooks, early, false);
        if (this.local >= 4) this.spawnClot(hooks, false, true);
    }

    private spawnClot(hooks: OrganHooks, early: boolean, partner: boolean) {
        const r = (early ? 42 : 54) + Math.random() * (early ? 12 : 16);
        let y = 150 + Math.random() * (CANVAS_HEIGHT - 300);
        if (partner && this.clots.length) {
            const other = this.clots[this.clots.length - 1].y;
            y = other < CANVAS_HEIGHT / 2 ? other + 280 : other - 280;
            y = Math.max(150, Math.min(CANVAS_HEIGHT - 150, y));
        } else if (Math.abs(y - hooks.player.pos.y) < 120) {
            y = y > CANVAS_HEIGHT / 2 ? 180 : CANVAS_HEIGHT - 180;
        }
        this.clots.push({
            x: CANVAS_WIDTH - 140 - Math.random() * (partner ? 80 : 220),
            y,
            r,
            age: (early ? -1.55 : -1.15) - (partner ? 0.7 : 0),
            warn: early ? 1.55 : 1.15,
            vx: early ? -260 : -400,
            spin: Math.random() * Math.PI * 2,
            loose: false,
            hit: new Set(),
            playerHit: false,
        });
    }

    private resolveClot(clot: Clot, hooks: OrganHooks) {
        if (clot.age < 0) return;
        const touch = (pos: Vector2, radius: number) => {
            const dx = pos.x - clot.x;
            const dy = pos.y - clot.y;
            const reach = clot.r * 0.92 + radius * 0.55;
            return dx * dx + dy * dy < reach * reach;
        };
        for (const e of hooks.entities) {
            if (!e.active || !this.isFoe(e.type) || clot.hit.has(e.id)) continue;
            if (!touch(e.pos, e.radius)) continue;
            clot.hit.add(e.id);
            if (e.type === EntityType.BOSS) hooks.strike(e, e.maxHealth * 0.12);
            else hooks.strike(e, e.health + 50);
        }
        if (!hooks.player.active || clot.playerHit) return;
        if (!touch(hooks.player.pos, hooks.player.radius)) return;
        clot.playerHit = true;
        hooks.hurt(hooks.player.maxHealth * 0.22, hooks.player.pos, 0.28);
        hooks.player.vel.x -= 3.2;
        hooks.shake(14);
        buzz('thud');
        hooks.popup(hooks.player.pos, hooks.t('ALERT_CLOT'), '#ffb0b8', 22);
    }

    private tickLung(dt: number, pace: number, hooks: OrganHooks) {
        if (this.local >= 1) {
            this.oxygenClock -= dt;
            if (this.oxygenClock <= 0) {
                this.oxygenClock = (21 - this.local * 0.5) / pace;
                this.spawnPickup(PICK_OXYGEN, '#9aefff');
            }
        }
        for (const s of this.streaks) {
            s.life -= dt;
            s.x += s.vx * dt;
            s.y += s.vy * dt;
        }
        this.streaks = this.streaks.filter(s => s.life > 0 && s.x > -240 && s.x < CANVAS_WIDTH + 240);

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
                audioManager.playBreath('out', { x: CANVAS_WIDTH * 0.5, y: CANVAS_HEIGHT * 0.5 });
                audioManager.lungPush(Math.min(0.12, Math.hypot(this.gust.x, this.gust.y) * 0.012));
            }
        } else if (this.lungPhase === 'gust') {
            this.wind.x = this.gust.x;
            this.wind.y = this.gust.y;
            this.puff(this.gust.x, this.gust.y, 1);
            if (!hooks.low) this.puff(this.gust.x, this.gust.y, 1);
            if (this.lungT <= 0) this.restLung(pace);
        } else if (this.lungPhase === 'inhale') {
            this.wind.x = 1.6;
            this.wind.y = (this.bandY - hooks.player.pos.y) * 0.004;
            this.puff(7.2, 0, 0.55, true);
            if (this.lungT <= 0) {
                this.lungPhase = 'blast';
                this.lungT = 0.72;
                this.coughPlayer = false;
                this.coughBosses.clear();
                audioManager.playCough({ x: CANVAS_WIDTH * 0.72, y: this.bandY });
                audioManager.lungPush(-0.08);
                hooks.shake(28);
                buzz('thud');
            }
            } else if (this.lungPhase === 'blast') {
            this.shoveBand(hooks, -78);
            this.puff(-16, 0, 1, true);
            if (this.lungT <= 0) {
                this.sweepBand(hooks);
                this.restLung(pace);
            }
        }
    }

    private armLung() {
        this.gustN++;
        if (this.gustN % 3 === 0 && this.local >= 3) {
            this.lungPhase = 'inhale';
            this.lungT = 1.05;
            this.bandHalf = CANVAS_HEIGHT * 0.35;
            const room = CANVAS_HEIGHT - this.bandHalf * 2;
            this.bandY = this.bandHalf + Math.random() * Math.max(1, room);
            this.coughPlayer = false;
            this.coughBosses.clear();
            this.say('ALERT_COUGH', '#ff5a6a');
            audioManager.playBreath('in', { x: CANVAS_WIDTH * 0.7, y: this.bandY });
            audioManager.lungPush(-0.05);
            return;
        }
        const roll = Math.random();
        this.gust = roll < 0.45 ? { x: -8.6, y: 0 } : roll < 0.75 ? { x: -6.4, y: -4.6 } : { x: -6.4, y: 4.6 };
        this.lungPhase = 'telegraph';
        this.lungT = 0.6;
        audioManager.playBreath('in', { x: CANVAS_WIDTH * 0.82, y: CANVAS_HEIGHT * 0.5 });
    }

    private restLung(pace: number) {
        this.lungPhase = 'idle';
        this.lungClock = Math.max(6.5, (12.5 - this.local * 0.7) / pace);
    }

    private tickBrain(dt: number, pace: number, hooks: OrganHooks) {
        if (this.local >= 1) {
            this.dopamineClock -= dt;
            if (this.dopamineClock <= 0) {
                this.dopamineClock = (24 - this.local * 0.4) / pace;
                this.spawnPickup(PICK_DOPAMINE, '#e2c6ff');
            }
        }
        this.bolts = this.bolts.filter(b => b.t < b.warn + 0.22);
        for (const bolt of this.bolts) bolt.t += dt;

        this.synapseClock -= dt;
        if (this.synapseClock <= 0) {
            this.synapseClock = Math.max(3.1, (11.2 - this.local * 0.75) / pace - this.pastWall * 0.28);
            this.synapseN++;
            const chain = this.local >= 3 ? 2 + (this.synapseN % 2) : 1;
            const white = this.local >= 2 && this.synapseN % 4 === 0;
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
                audioManager.playZap({ x: (bolt.a.x + bolt.b.x) / 2, y: (bolt.a.y + bolt.b.y) / 2 });
                hooks.shake(bolt.white ? 18 : 8);
                if (bolt.white) this.whiteout = 0.35;
                else this.storm = Math.max(this.storm, 0.26);
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
            if ((e.ttl || 0) <= 0) {
                e.active = false;
                continue;
            }
            const full = e.maxHealth > 2 ? e.maxHealth : 12;
            const left = e.ttl || 0;
            const age = full - left;
            const base = e.angle && e.angle > 0 ? e.angle : e.radius;
            let scale = 1;
            if (age < 0.55) scale = popIn(age / 0.55);
            else if (left < 0.9) scale = Math.max(0.15, left / 0.9);
            e.radius = base * scale;
        }
    }

    private settlePools(hooks: OrganHooks) {
        const appear = 1.25;
        const vanish = 1.15;
        for (const e of hooks.entities) {
            if (!e.active || e.type !== EntityType.ACID_POOL) continue;
            if (!e.id.startsWith('plaque_') && !e.id.startsWith('bile_')) continue;
            if (e.lobes && e.lobes.length > 1) continue;
            const full = e.value && e.value > 0 ? e.value : 8;
            const left = Math.max(0, e.ttl || 0);
            const age = Math.max(0, full - left);
            const rest = e.angle && e.angle > 0 ? e.angle : e.radius;
            if (!e.angle) e.angle = rest;
            if (age < appear) {
                const k = age / appear;
                const ease = k * k * (3 - 2 * k);
                e.radius = rest * (0.08 + 0.92 * ease);
            } else if (left < vanish) {
                const cap = rest * Math.max(0.12, left / vanish);
                if (e.radius > cap) e.radius = cap;
            }
        }
        this.weldPools(hooks);
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
                hooks.popup(hooks.player.pos, hooks.t('OXYGEN_HINT'), '#9aefff', 24);
            } else if (e.value === PICK_DOPAMINE) {
                this.dopamineT = 4;
                this.critAdd = 0.22;
                hooks.popup(hooks.player.pos, hooks.t('DOPAMINE_HINT'), '#e2c6ff', 24);
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
            angle: radius,
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
            radius: kind === PICK_FLUORIDE ? 36 : kind === PICK_GLYCOGEN ? 34 : 24,
            angle: kind === PICK_FLUORIDE ? 36 : kind === PICK_GLYCOGEN ? 34 : 24,
            health: 1,
            maxHealth: 12,
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
            if (this.covers(e, pos, hooks.player.radius * 0.4, 0.75)) return true;
        }
        return false;
    }

    private insideAny(pos: Vector2, pad: number, pools: Entity[]): boolean {
        for (const p of pools) {
            if (this.covers(p, pos, pad, 0.72)) return true;
        }
        return false;
    }

    private covers(e: Entity, pos: Vector2, pad: number, radiusMul: number): boolean {
        const fade = this.puddleFade(e);
        if (e.lobes && e.lobes.length > 1) {
            for (const l of e.lobes) {
                const rx = l.rx * fade + pad;
                const ry = l.ry * fade + pad;
                if (rx <= 1 || ry <= 1) continue;
                const dx = pos.x - (e.pos.x + l.x);
                const dy = pos.y - (e.pos.y + l.y);
                if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) < 1) return true;
            }
            return false;
        }
        const r = e.radius * radiusMul * fade + pad;
        const dx = pos.x - e.pos.x;
        const dy = pos.y - e.pos.y;
        return dx * dx + dy * dy < r * r;
    }

    private puddleFade(e: Entity): number {
        if (!e.lobes || e.lobes.length < 2) return 1;
        const left = Math.max(0, e.ttl || 0);
        return left < 1.15 ? Math.max(0.12, left / 1.15) : 1;
    }

    private rinsePlaque(e: Entity, s: SalivaRibbon, dt: number) {
        if (e.lobes && e.lobes.length > 1) {
            for (const l of e.lobes) {
                if (!this.streamTouch(s, { x: e.pos.x + l.x, y: e.pos.y + l.y }).hit) continue;
                l.rx = Math.max(0, l.rx - 50 * dt);
                l.ry = Math.max(0, l.ry - 38 * dt);
            }
            e.lobes = e.lobes.filter(l => l.rx >= 12 && l.ry >= 9);
            if (e.lobes.length === 0) e.active = false;
            else if (e.lobes.length === 1) this.collapseRound(e);
            return;
        }
        if (!this.streamTouch(s, e.pos).hit) return;
        e.radius = Math.max(0, e.radius - 80 * dt);
        if (e.radius < 16) e.active = false;
    }

    private weldPools(hooks: OrganHooks) {
        const list = hooks.entities.filter(e => e.active && e.type === EntityType.ACID_POOL);
        for (let i = 0; i < list.length; i++) {
            const a = list[i];
            if (!a.active || !this.poolSettled(a)) continue;
            for (let j = i + 1; j < list.length; j++) {
                const b = list[j];
                if (!b.active || !this.poolSettled(b)) continue;
                if (this.poolFamily(a.id) !== this.poolFamily(b.id)) continue;
                if (!this.puddlesTouch(a, b)) continue;
                this.absorbPool(a, b);
                b.active = false;
            }
        }
    }

    private poolFamily(id: string): string {
        if (id.startsWith('plaque_')) return 'plaque';
        if (id.startsWith('bile_')) return 'bile';
        return 'acid';
    }

    private poolSettled(e: Entity): boolean {
        if (e.lobes && e.lobes.length > 1) return true;
        if (e.id.startsWith('plaque_') || e.id.startsWith('bile_')) {
            const rest = e.angle && e.angle > 0 ? e.angle : e.radius;
            return e.radius >= rest * 0.9;
        }
        const full = e.value && e.value > 0 ? e.value : 6;
        const left = Math.max(0, e.ttl || 0);
        return 1 - Math.min(1, left / full) >= 0.2;
    }

    private blobParts(e: Entity): { x: number; y: number; rx: number; ry: number }[] {
        if (e.lobes && e.lobes.length > 1) {
            const fade = this.puddleFade(e);
            return e.lobes.map(l => ({ x: e.pos.x + l.x, y: e.pos.y + l.y, rx: l.rx * fade, ry: l.ry * fade }));
        }
        const v = this.visualRadii(e);
        return [{ x: e.pos.x, y: e.pos.y, rx: v.rx, ry: v.ry }];
    }

    private visualRadii(e: Entity): { rx: number; ry: number } {
        const r = e.radius;
        if (e.id.startsWith('plaque_')) return { rx: r * 0.62, ry: r * 0.48 };
        if (e.id.startsWith('bile_')) {
            const full = e.value && e.value > 0 ? e.value : 8;
            const age = Math.max(0, full - Math.max(0, e.ttl || 0));
            const settle = Math.min(1, age / 1.25);
            return { rx: r * 1.02, ry: r * (0.92 - 0.34 * settle) };
        }
        const drawn = (e.angle && e.angle > 0 ? e.angle : r) * 0.9;
        return { rx: drawn, ry: drawn * 0.78 };
    }

    private puddlesTouch(a: Entity, b: Entity): boolean {
        const as = this.blobParts(a);
        const bs = this.blobParts(b);
        for (const p of as) {
            for (const q of bs) {
                const rx = p.rx + q.rx;
                const ry = p.ry + q.ry;
                if (rx <= 1 || ry <= 1) continue;
                const dx = p.x - q.x;
                const dy = p.y - q.y;
                if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) < 1) return true;
            }
        }
        return false;
    }

    private absorbPool(a: Entity, b: Entity) {
        if (!a.lobes || a.lobes.length === 0) a.lobes = this.localLobes(a);
        const incoming = this.localLobes(b);
        for (const lobe of incoming) {
            this.pushLobe(a, {
                x: (b.pos.x + lobe.x) - a.pos.x,
                y: (b.pos.y + lobe.y) - a.pos.y,
                rx: lobe.rx,
                ry: lobe.ry,
            });
        }
        this.collapseRound(a);
    }

    private localLobes(e: Entity): { x: number; y: number; rx: number; ry: number }[] {
        if (e.lobes && e.lobes.length > 1) return e.lobes.map(l => ({ ...l }));
        const v = this.visualRadii(e);
        return [{ x: 0, y: 0, rx: v.rx, ry: v.ry }];
    }

    private pushLobe(e: Entity, lobe: { x: number; y: number; rx: number; ry: number }) {
        const lobes = e.lobes || (e.lobes = []);
        let nearest = 0;
        let nearestD = Infinity;
        for (let i = 0; i < lobes.length; i++) {
            const m = lobes[i];
            const dx = lobe.x - m.x;
            const dy = lobe.y - m.y;
            const d = dx * dx + dy * dy;
            if (d < nearestD) {
                nearestD = d;
                nearest = i;
            }
            const reach = 0.42 * Math.min(lobe.rx, m.rx);
            if (d < reach * reach) {
                this.foldLobe(m, lobe);
                return;
            }
        }
        if (lobes.length < 5) {
            lobes.push(lobe);
            return;
        }
        this.foldLobe(lobes[nearest], lobe);
    }

    private foldLobe(
        m: { x: number; y: number; rx: number; ry: number },
        lobe: { x: number; y: number; rx: number; ry: number },
    ) {
        const a1 = Math.max(1, lobe.rx * lobe.ry);
        const a2 = Math.max(1, m.rx * m.ry);
        const aspect = m.rx > 1 ? m.ry / m.rx : 0.78;
        const rx = Math.min(280, Math.sqrt((a1 + a2) / aspect));
        const w = a1 + a2;
        m.x = (m.x * a2 + lobe.x * a1) / w;
        m.y = (m.y * a2 + lobe.y * a1) / w;
        m.rx = rx;
        m.ry = rx * aspect;
    }

    private collapseRound(e: Entity) {
        if (!e.lobes || e.lobes.length !== 1) return;
        const l = e.lobes[0];
        e.pos.x += l.x;
        e.pos.y += l.y;
        if (e.id.startsWith('plaque_')) {
            const r = l.rx / 0.62;
            e.radius = r;
            e.angle = r;
        } else if (e.id.startsWith('bile_')) {
            const r = l.rx / 1.02;
            e.radius = r;
            e.angle = r;
        } else {
            const r = l.rx / 0.9;
            e.radius = r;
            e.angle = r;
        }
        e.lobes = undefined;
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
        const n = 120;
        for (let i = 0; i <= n; i++) {
            const u = i / n;
            pts.push({ x: trace.x0 + u * trace.span, y: trace.y - pqrst(u, trace.shape) });
        }
        return pts;
    }

    private puff(vx: number, vy: number, strength: number, band = false) {
        if (this.streaks.length > (band ? 42 : 32)) return;
        const mag = Math.hypot(vx, vy) || 1;
        const ux = vx / mag;
        const uy = vy / mag;
        const speed = (340 + Math.random() * 260) * (0.55 + strength * 0.55);
        let x = Math.random() * CANVAS_WIDTH;
        let y = Math.random() * CANVAS_HEIGHT;
        if (band) {
            y = this.bandY + (Math.random() - 0.5) * this.bandHalf * 1.65;
            x = ux < 0 ? CANVAS_WIDTH + Math.random() * 200 : -Math.random() * 200;
        } else if (ux < -0.25) {
            x = CANVAS_WIDTH + Math.random() * 180;
        } else if (ux > 0.25) {
            x = -Math.random() * 180;
        } else {
            y = uy > 0 ? -30 : CANVAS_HEIGHT + 30;
        }
        const pull = band ? (this.bandY - y) * 0.4 : 0;
        this.streaks.push({
            x,
            y,
            vx: ux * speed,
            vy: uy * speed + pull,
            life: 0.48 + Math.random() * 0.38,
            max: 0.86,
            bend: (Math.random() - 0.5) * 34,
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

    private traceLiquid(ctx: CanvasRenderingContext2D, samples: Array<{ x: number; y: number; nx: number; ny: number; w: number }>) {
        const head = samples[samples.length - 1];
        const pts: Array<{ x: number; y: number }> = [];
        for (const p of samples) pts.push({ x: p.x + p.nx * p.w, y: p.y + p.ny * p.w });
        for (let k = 1; k < 7; k++) {
            const t = Math.PI * (k / 7);
            const dirx = head.nx * Math.cos(t) + head.ny * Math.sin(t);
            const diry = head.ny * Math.cos(t) - head.nx * Math.sin(t);
            pts.push({ x: head.x + dirx * head.w, y: head.y + diry * head.w });
        }
        for (let i = samples.length - 1; i >= 0; i--) {
            const p = samples[i];
            pts.push({ x: p.x - p.nx * p.w, y: p.y - p.ny * p.w });
        }
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length - 1; i++) {
            const mx = (pts[i].x + pts[i + 1].x) / 2;
            const my = (pts[i].y + pts[i + 1].y) / 2;
            ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
        }
        const last = pts[pts.length - 1];
        ctx.lineTo(last.x, last.y);
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
            const envelope = Math.pow(along, 0.55);
            const bulb = Math.pow(along, 2.4) * 0.34;
            const ripple = Math.sin(along * 8.5 + time * 1.35) * 0.16 + Math.sin(along * 3.6 - time * 0.8) * 0.09;
            samples.push({
                x: p.x, y: p.y,
                nx: -dy / len, ny: dx / len,
                w: s.half * envelope * (0.7 + bulb) * (1 + ripple * envelope),
            });
        }
        ctx.save();
        ctx.beginPath();
        this.traceLiquid(ctx, samples);
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
        const wet = low ? 6 : 14;
        for (let i = 0; i < wet; i++) {
            const p = samples[Math.min(samples.length - 1, 1 + (i * 2) % Math.max(1, steps))];
            const side = (((i * 37) % 100) / 100 - 0.5) * 1.1;
            const bob = Math.sin(time * 1.6 + i * 1.3) * 0.1;
            const x = p.x + p.nx * p.w * (side + bob);
            const y = p.y + p.ny * p.w * (side * 0.6 + bob);
            const rad = 2 + (i % 4) * 1.35;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
            ctx.beginPath();
            ctx.arc(x, y, rad, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
            ctx.beginPath();
            ctx.arc(x - rad * 0.28, y - rad * 0.3, Math.max(0.7, rad * 0.32), 0, Math.PI * 2);
            ctx.fill();
        }
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
        const warn = this.filterPhase === 'warn';
        const fade = this.filterPhase === 'fade';
        const span = this.filterSpan || 1;
        const left = Math.max(0, this.filterT) / span;
        const grow = warn ? 0.12 + 0.88 * (1 - left) : fade ? left : 1;
        const spin = (this.hooks?.time || 0) / (warn ? 520 : 200);
        const veil = fade ? Math.max(0, left) : 1;
        const swell = warn ? 0.42 + 0.58 * (1 - left) : fade ? 0.7 + 0.3 * left : 1;
        ctx.save();
        ctx.translate(this.filterX, this.filterY);
        ctx.save();
        ctx.globalAlpha = veil;
        ctx.scale(swell, swell);

        const well = ctx.createRadialGradient(0, 0, 8, 0, 0, 230);
        well.addColorStop(0, warn ? 'rgba(18, 22, 8, 0.2)' : 'rgba(8, 12, 4, 0.72)');
        well.addColorStop(0.28, warn ? 'rgba(48, 56, 16, 0.12)' : 'rgba(36, 42, 10, 0.28)');
        well.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = well;
        ctx.beginPath();
        ctx.arc(0, 0, 230, 0, Math.PI * 2);
        ctx.fill();

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        const arms = 3;
        const turns = 1.05;
        for (let i = 0; i < arms; i++) {
            const base = spin + (i / arms) * Math.PI * 2;
            ctx.beginPath();
            const steps = 32;
            let endX = 0;
            let endY = 0;
            let prevX = 0;
            let prevY = 0;
            for (let s = 0; s <= steps; s++) {
                const t = s / steps;
                const a = base + t * turns * Math.PI * 2;
                const rad = 178 * (1 - t * 0.82);
                const x = Math.cos(a) * rad;
                const y = Math.sin(a) * rad;
                if (s === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
                prevX = endX;
                prevY = endY;
                endX = x;
                endY = y;
            }
            ctx.strokeStyle = warn ? 'rgba(232, 222, 146, 0.5)' : 'rgba(244, 234, 168, 0.9)';
            ctx.lineWidth = warn ? 2.5 : 3.5;
            ctx.stroke();
            const dx = endX - prevX;
            const dy = endY - prevY;
            const len = Math.hypot(dx, dy) || 1;
            const ux = dx / len;
            const uy = dy / len;
            const px = -uy;
            const py = ux;
            ctx.beginPath();
            ctx.moveTo(endX + ux * 14, endY + uy * 14);
            ctx.lineTo(endX - ux * 6 + px * 8, endY - uy * 6 + py * 8);
            ctx.lineTo(endX - ux * 6 - px * 8, endY - uy * 6 - py * 8);
            ctx.closePath();
            ctx.fillStyle = warn ? 'rgba(236, 226, 150, 0.75)' : 'rgba(255, 246, 190, 0.95)';
            ctx.fill();
        }

        const bits = 5;
        const pull = (this.hooks?.time || 0) / (warn ? 1100 : 640);
        ctx.lineCap = 'round';
        for (let i = 0; i < bits; i++) {
            const travel = (pull + i / bits) % 1;
            const a = spin * 0.35 + (i / bits) * Math.PI * 2;
            const outer = 36 + (1 - travel) * 188;
            const inner = Math.max(18, outer - 42);
            ctx.globalAlpha = veil * (0.28 + travel * 0.65);
            ctx.strokeStyle = '#f6eec4';
            ctx.lineWidth = 3.6 * (1 - travel * 0.4);
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * outer, Math.sin(a) * outer);
            ctx.lineTo(Math.cos(a) * inner, Math.sin(a) * inner);
            ctx.stroke();
            ctx.fillStyle = '#fff8d8';
            ctx.beginPath();
            ctx.arc(Math.cos(a) * inner, Math.sin(a) * inner, 2.4, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = veil;

        const mouth = 28 + grow * 22;
        const pit = ctx.createRadialGradient(0, 0, 4, 0, 0, mouth);
        pit.addColorStop(0, warn ? 'rgba(70, 78, 24, 0.45)' : 'rgba(6, 8, 2, 0.95)');
        pit.addColorStop(1, warn ? 'rgba(140, 148, 48, 0.2)' : 'rgba(90, 98, 28, 0.55)');
        ctx.fillStyle = pit;
        ctx.beginPath();
        ctx.arc(0, 0, mouth, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(244, 236, 170, 0.85)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        const showHint = this.hooks && (warn ? grow > 0.18 : this.filterPhase === 'on' && left > 0.62);
        if (showHint && this.hooks) {
            const label = this.hooks.t('ALERT_FILTER');
            const hint = this.hooks.t('FILTER_HINT');
            ctx.font = '700 28px "Chakra Petch", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.lineWidth = 5;
            ctx.strokeStyle = 'rgba(24, 28, 8, 0.55)';
            ctx.fillStyle = 'rgba(248, 242, 196, 0.94)';
            ctx.strokeText(label, 0, -108);
            ctx.fillText(label, 0, -108);
            ctx.font = '700 16px "Chakra Petch", sans-serif';
            ctx.lineWidth = 4;
            ctx.fillStyle = 'rgba(255, 236, 160, 0.95)';
            ctx.strokeText(hint, 0, -82);
            ctx.fillText(hint, 0, -82);
        }
        ctx.restore();
    }

    private drawTrace(ctx: CanvasRenderingContext2D, trace: Trace, low: boolean) {
        const warned = trace.age < 0;
        ctx.save();
        ctx.fillStyle = warned ? 'rgba(255, 64, 84, 0.1)' : 'rgba(255, 48, 68, 0.06)';
        ctx.fillRect(0, trace.y - 86, CANVAS_WIDTH, 172);
        ctx.strokeStyle = 'rgba(255, 186, 196, 0.09)';
        ctx.lineWidth = 1;
        for (const dy of [-56, -28, 28, 56]) {
            ctx.beginPath();
            ctx.moveTo(24, trace.y + dy);
            ctx.lineTo(CANVAS_WIDTH - 24, trace.y + dy);
            ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(255, 210, 216, 0.28)';
        ctx.beginPath();
        ctx.moveTo(40, trace.y);
        ctx.lineTo(CANVAS_WIDTH - 40, trace.y);
        ctx.stroke();

        const stroke = (pts: Vector2[], width: number, color: string) => {
            if (pts.length < 2) return;
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.lineJoin = 'miter';
            ctx.miterLimit = 2.5;
            ctx.lineCap = 'butt';
            ctx.stroke();
        };

        const clock = (this.hooks?.time || 0) / 1000;
        if (warned) {
            const preview: Vector2[] = [];
            const n = low ? 36 : 80;
            const span = CANVAS_WIDTH - 80;
            const sweep = (clock * 0.42) % 1;
            const head = 40 + sweep * span;
            for (let i = 0; i <= n; i++) {
                const u = i / n;
                const phase = (u * 0.55 + clock * 0.7) % 1;
                preview.push({ x: 40 + u * span, y: trace.y - pqrst(phase, trace.shape) * 0.9 });
            }
            const drawn = preview.filter(p => p.x <= head);
            stroke(drawn, 12, 'rgba(255, 70, 96, 0.28)');
            stroke(drawn, 2.4, 'rgba(255, 236, 240, 0.92)');
            ctx.strokeStyle = 'rgba(255, 90, 110, 0.9)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(head, trace.y - 72);
            ctx.lineTo(head, trace.y + 72);
            ctx.stroke();
        } else {
            const raw = low ? this.tracePoints(trace).filter((_, i) => i % 2 === 0) : this.tracePoints(trace);
            const pts = raw;
            const glow = ['rgba(255, 36, 64, 0.28)', 'rgba(255, 96, 64, 0.26)', 'rgba(255, 30, 80, 0.34)', 'rgba(255, 170, 150, 0.24)'][trace.shape] || 'rgba(255, 36, 64, 0.28)';
            const ink = ['#fff6f7', '#ffe4d8', '#ffffff', '#ffd0d4'][trace.shape] || '#fff6f7';
            const width = [2.6, 3.3, 1.7, 2.3][trace.shape] || 2.6;
            stroke(pts, 14, glow);
            stroke(pts, width, ink);
            let peak = pts[0];
            let pen = pts[0];
            for (const p of pts) {
                if (p.y < peak.y) peak = p;
                if (p.x > pen.x && p.x < CANVAS_WIDTH - 8) pen = p;
            }
            if (peak) {
                ctx.strokeStyle = 'rgba(255, 220, 226, 0.55)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(peak.x - 16, peak.y);
                ctx.lineTo(peak.x + 16, peak.y);
                ctx.moveTo(peak.x, peak.y - 16);
                ctx.lineTo(peak.x, peak.y + 16);
                ctx.stroke();
                ctx.fillStyle = 'rgba(255, 80, 104, 0.45)';
                ctx.beginPath();
                ctx.arc(peak.x, peak.y, 13, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(peak.x, peak.y, 3.2, 0, Math.PI * 2);
                ctx.fill();
            }
            if (pen) {
                ctx.fillStyle = 'rgba(255, 246, 247, 0.9)';
                ctx.beginPath();
                ctx.arc(pen.x, pen.y, 4.5, 0, Math.PI * 2);
                ctx.fill();
            }
            if (peak) {
                for (let ring = 0; ring < 3; ring++) {
                    const travel = (clock * 0.85 + ring / 3) % 1;
                    ctx.globalAlpha = (1 - travel) * 0.75;
                    ctx.strokeStyle = ring === 1 ? '#fff1f3' : '#ff4a62';
                    ctx.lineWidth = 3 - travel * 2;
                    ctx.beginPath();
                    ctx.ellipse(peak.x, peak.y, 18 + travel * 150, 10 + travel * 46, 0, 0, Math.PI * 2);
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
            }
        }
        ctx.restore();
    }

    private drawClot(ctx: CanvasRenderingContext2D, clot: Clot) {
        const forming = clot.age < 0;
        const span = clot.warn || 1.4;
        const k = forming ? Math.max(0, Math.min(1, 1 + clot.age / span)) : 1;
        const ease = k * k * (3 - 2 * k);
        const r = clot.r * (0.2 + 0.8 * ease);
        ctx.save();
        ctx.translate(clot.x, clot.y);
        if (forming) {
            ctx.strokeStyle = `rgba(255, 176, 184, ${0.25 + ease * 0.35})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(0, 0, clot.r, clot.r * 0.84, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        if (!forming) {
            ctx.strokeStyle = 'rgba(255, 186, 186, 0.32)';
            ctx.lineWidth = 1.5;
            ctx.lineCap = 'round';
            for (let i = 0; i < 4; i++) {
                const a = clot.spin + i * 1.35;
                const ox = r * 0.35 + Math.cos(a) * r * 0.12;
                const oy = Math.sin(a) * r * 0.42;
                ctx.beginPath();
                ctx.moveTo(ox * 0.25, oy * 0.25);
                ctx.quadraticCurveTo(ox + 8, oy - 7, ox + 20, oy + 3);
                ctx.stroke();
            }
        }
        ctx.beginPath();
        const n = 18;
        for (let i = 0; i <= n; i++) {
            const a = (i / n) * Math.PI * 2;
            const lobe = 1 + 0.13 * Math.sin(a * 3 + clot.spin) + 0.05 * Math.sin(a * 5 - clot.spin);
            const px = Math.cos(a) * r * lobe;
            const py = Math.sin(a) * r * 0.84 * lobe;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        const g = ctx.createRadialGradient(-r * 0.28, -r * 0.2, r * 0.06, 0, 0, r);
        g.addColorStop(0, 'rgba(255, 228, 228, 0.96)');
        g.addColorStop(0.2, 'rgba(186, 48, 62, 0.96)');
        g.addColorStop(0.66, 'rgba(96, 14, 26, 0.95)');
        g.addColorStop(1, 'rgba(32, 6, 10, 0.92)');
        ctx.fillStyle = g;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(36, 6, 10, 0.75)';
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 240, 240, 0.8)';
        ctx.beginPath();
        ctx.ellipse(-r * 0.22, -r * 0.16, Math.max(3, r * 0.14), Math.max(1.5, r * 0.055), -0.55, 0, Math.PI * 2);
        ctx.fill();
        if (forming && ease > 0.34 && this.hooks) {
            const label = this.hooks.t('ALERT_CLOT');
            ctx.font = '700 20px "Chakra Petch", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.lineWidth = 4;
            ctx.strokeStyle = 'rgba(24, 6, 8, 0.55)';
            ctx.fillStyle = 'rgba(255, 228, 228, 0.94)';
            ctx.strokeText(label, 0, -r - 16);
            ctx.fillText(label, 0, -r - 16);
        }
        ctx.restore();
    }

    private drawGust(ctx: CanvasRenderingContext2D, low: boolean) {
        const telegraph = this.lungPhase === 'telegraph';
        const mag = Math.hypot(this.gust.x, this.gust.y) || 1;
        const ux = this.gust.x / mag;
        const uy = this.gust.y / mag;
        ctx.save();
        const wash = ctx.createLinearGradient(
            CANVAS_WIDTH * 0.5 - ux * 780,
            CANVAS_HEIGHT * 0.5 - uy * 460,
            CANVAS_WIDTH * 0.5 + ux * 780,
            CANVAS_HEIGHT * 0.5 + uy * 460,
        );
        const haze = telegraph ? 0.07 : 0.14;
        wash.addColorStop(0, `rgba(255, 236, 240, ${haze})`);
        wash.addColorStop(0.45, 'rgba(255, 236, 240, 0)');
        wash.addColorStop(1, `rgba(255, 250, 252, ${haze * 1.7})`);
        ctx.fillStyle = wash;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        const time = this.hooks?.time ?? 0;
        const sheets = low ? 4 : 8;
        ctx.lineCap = 'round';
        for (let i = 0; i < sheets; i++) {
            const travel = ((time / (telegraph ? 1600 : 780) + i * 0.13) % 1);
            const along = -0.15 + travel * 1.3;
            const x = CANVAS_WIDTH * (ux < 0 ? 1 - along : along);
            const y = (i + 0.5) * (CANVAS_HEIGHT / sheets) + uy * (travel - 0.5) * 220;
            const len = telegraph ? 90 : 170;
            const nx = -uy;
            const ny = ux;
            const bend = ((i % 2) * 2 - 1) * 22;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.quadraticCurveTo(x - ux * len * 0.5 + nx * bend, y - uy * len * 0.5 + ny * bend, x - ux * len, y - uy * len);
            ctx.globalAlpha = telegraph ? 0.28 : 0.5;
            ctx.strokeStyle = 'rgba(255, 236, 242, 0.9)';
            ctx.lineWidth = telegraph ? 7 : 12;
            ctx.stroke();
            ctx.globalAlpha = telegraph ? 0.55 : 0.85;
            ctx.strokeStyle = '#fffafb';
            ctx.lineWidth = 1.7;
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        this.drawFilaments(ctx, low, telegraph ? 0.62 : 1);
        ctx.restore();
    }

    private drawFilaments(ctx: CanvasRenderingContext2D, low: boolean, strength: number) {
        const shown = low ? this.streaks.slice(0, 12) : this.streaks;
        ctx.save();
        ctx.lineCap = 'round';
        for (const s of shown) {
            const mag = Math.hypot(s.vx, s.vy) || 1;
            const ux = s.vx / mag;
            const uy = s.vy / mag;
            const fade = Math.max(0, Math.min(1, s.life / (s.max || 0.8)));
            const len = (64 + fade * 96) * (0.6 + strength * 0.55);
            const nx = -uy;
            const ny = ux;
            const x2 = s.x - ux * len;
            const y2 = s.y - uy * len;
            const cx = s.x - ux * len * 0.46 + nx * s.bend;
            const cy = s.y - uy * len * 0.46 + ny * s.bend;
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.quadraticCurveTo(cx, cy, x2, y2);
            ctx.globalAlpha = fade * (0.16 + strength * 0.22);
            ctx.strokeStyle = 'rgba(255, 236, 242, 0.95)';
            ctx.lineWidth = 8 * (0.35 + strength * 0.65);
            ctx.stroke();
            ctx.globalAlpha = fade * (0.45 + strength * 0.45);
            ctx.strokeStyle = '#fff8f9';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.globalAlpha = fade * 0.4 * strength;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.ellipse(s.x, s.y, 9 * (0.4 + strength), 3.2, Math.atan2(uy, ux), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    private drawCoughBand(ctx: CanvasRenderingContext2D, low: boolean) {
        const blasting = this.lungPhase === 'blast';
        const warn = blasting ? 1 : Math.max(0, Math.min(1, 1 - this.lungT / 1.05));
        const time = this.hooks?.time ?? 0;
        const beat = 0.5 + 0.5 * Math.sin(time / (blasting ? 32 : 170 - warn * 125));
        const y0 = this.bandY - this.bandHalf;
        const h = this.bandHalf * 2;
        const fade = blasting ? Math.max(0, this.lungT) / 0.72 : 1;
        ctx.save();
        const edge = blasting ? 0.55 : 0.12 + warn * 0.38 + beat * (0.08 + warn * 0.22);
        const mid = blasting ? 0.16 + fade * 0.28 : 0.04 + warn * 0.1;
        const wash = ctx.createLinearGradient(0, y0, 0, y0 + h);
        wash.addColorStop(0, `rgba(255, 70, 100, ${edge})`);
        wash.addColorStop(0.18, `rgba(255, 170, 186, ${mid})`);
        wash.addColorStop(0.5, blasting ? `rgba(255, 244, 246, ${0.12 + fade * 0.28})` : `rgba(255, 150, 168, ${mid * 0.45})`);
        wash.addColorStop(0.82, `rgba(255, 170, 186, ${mid})`);
        wash.addColorStop(1, `rgba(255, 70, 100, ${edge})`);
        ctx.fillStyle = wash;
        ctx.fillRect(0, y0, CANVAS_WIDTH, h);

        const rail = blasting ? 8 + fade * 6 : 2 + warn * 6 + beat * (1 + warn * 4);
        ctx.fillStyle = blasting
            ? `rgba(255, 248, 250, ${0.55 + fade * 0.4})`
            : `rgba(255, 214, 222, ${0.35 + warn * 0.5 + beat * 0.2})`;
        ctx.fillRect(0, y0, CANVAS_WIDTH, rail);
        ctx.fillRect(0, y0 + h - rail, CANVAS_WIDTH, rail);

        if (!low && !blasting) {
            ctx.strokeStyle = `rgba(255, 236, 240, ${0.25 + warn * 0.55})`;
            ctx.lineWidth = 1.5;
            const teeth = 14;
            for (let i = 0; i < teeth; i++) {
                const x = (i + 0.5) * (CANVAS_WIDTH / teeth);
                const reach = 10 + warn * 28 + beat * 8;
                ctx.beginPath();
                ctx.moveTo(x, y0 + rail);
                ctx.lineTo(x, y0 + rail + reach);
                ctx.moveTo(x, y0 + h - rail);
                ctx.lineTo(x, y0 + h - rail - reach);
                ctx.stroke();
            }
        }

        this.drawFilaments(ctx, low, blasting ? 1 : 0.35 + warn * 0.55);

        if (!blasting && this.hooks) {
            const label = this.hooks.t('COUGH_WORD');
            ctx.globalAlpha = 0.45 + warn * 0.35 + beat * 0.2;
            ctx.font = '800 46px "Chakra Petch", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.lineWidth = 7;
            ctx.strokeStyle = 'rgba(42, 8, 14, 0.62)';
            ctx.fillStyle = '#fff4f6';
            ctx.strokeText(label, CANVAS_WIDTH / 2, this.bandY);
            ctx.fillText(label, CANVAS_WIDTH / 2, this.bandY);
        }
        ctx.restore();
    }

    private drawStorm(ctx: CanvasRenderingContext2D) {
        const k = Math.min(1, this.storm / 0.26);
        ctx.save();
        const glow = ctx.createRadialGradient(
            CANVAS_WIDTH * 0.5, CANVAS_HEIGHT * 0.45, CANVAS_HEIGHT * 0.2,
            CANVAS_WIDTH * 0.5, CANVAS_HEIGHT * 0.5, CANVAS_HEIGHT * 0.78,
        );
        glow.addColorStop(0, 'rgba(0, 0, 0, 0)');
        glow.addColorStop(1, `rgba(64, 36, 120, ${0.2 * k})`);
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.globalAlpha = 0.055 * k;
        ctx.fillStyle = '#d9c6ff';
        ctx.fillRect(0, CANVAS_HEIGHT * 0.16, CANVAS_WIDTH, 14);
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
        ctx.save();
        ctx.globalAlpha = 1;
        const channel = ctx.createLinearGradient(CANVAS_WIDTH * 0.18, 0, CANVAS_WIDTH * 0.82, 0);
        channel.addColorStop(0, 'rgba(0, 0, 0, 0)');
        channel.addColorStop(0.5, 'rgba(0, 0, 0, 0.2)');
        channel.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = channel;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        const lobes: Array<[number, number, number, number]> = [
            [-20, 160, 340, 260],
            [60, 760, 380, 280],
            [CANVAS_WIDTH + 30, 220, 360, 270],
            [CANVAS_WIDTH - 40, 820, 340, 250],
            [CANVAS_WIDTH * 0.48, -80, 420, 180],
            [CANVAS_WIDTH * 0.55, CANVAS_HEIGHT + 40, 460, 170],
        ];
        for (const [x, y, rx, ry] of lobes) {
            const lobe = ctx.createRadialGradient(x, y, rx * 0.15, x, y, rx);
            lobe.addColorStop(0, 'rgba(156, 124, 52, 0.38)');
            lobe.addColorStop(0.55, 'rgba(92, 72, 28, 0.22)');
            lobe.addColorStop(1, 'rgba(92, 72, 28, 0)');
            ctx.fillStyle = lobe;
            ctx.beginPath();
            ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.fillStyle = 'rgba(48, 36, 16, 0.18)';
        const pores: Array<[number, number, number]> = [
            [150, 240, 18],
            [220, 860, 26],
            [CANVAS_WIDTH - 180, 300, 22],
            [CANVAS_WIDTH - 120, 900, 16],
        ];
        for (const [x, y, r] of pores) {
            ctx.beginPath();
            ctx.ellipse(x, y, r, r * 0.72, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    private drawAlveoli(ctx: CanvasRenderingContext2D, _time: number) {
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(120, 42, 56, 0.28)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        const air = ctx.createRadialGradient(
            CANVAS_WIDTH * 0.5, CANVAS_HEIGHT * 0.46, 60,
            CANVAS_WIDTH * 0.5, CANVAS_HEIGHT * 0.5, 980,
        );
        air.addColorStop(0, 'rgba(255, 206, 214, 0.11)');
        air.addColorStop(0.58, 'rgba(150, 58, 74, 0.06)');
        air.addColorStop(1, 'rgba(110, 36, 50, 0.16)');
        ctx.fillStyle = air;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        for (const [x, y, rx, ry] of LUNG_CUPS) {
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(1, ry / rx);
            const sac = ctx.createRadialGradient(-rx * 0.12, -rx * 0.08, rx * 0.05, 0, 0, rx);
            sac.addColorStop(0, 'rgba(236, 168, 180, 0.38)');
            sac.addColorStop(0.42, 'rgba(188, 82, 102, 0.3)');
            sac.addColorStop(0.74, 'rgba(124, 40, 56, 0.2)');
            sac.addColorStop(1, 'rgba(48, 12, 20, 0)');
            ctx.fillStyle = sac;
            ctx.beginPath();
            ctx.arc(0, 0, rx, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.fillStyle = 'rgba(22, 6, 10, 0.32)';
        for (const [x, y, rx, ry] of LUNG_PORES) {
            ctx.beginPath();
            ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 206, 214, 0.14)';
            ctx.stroke();
        }
        ctx.restore();
    }

    private drawNeural(ctx: CanvasRenderingContext2D, time: number) {
        ctx.save();
        ctx.globalAlpha = 1;
        const wash = ctx.createRadialGradient(
            CANVAS_WIDTH * 0.5, CANVAS_HEIGHT * 0.46, 90,
            CANVAS_WIDTH * 0.5, CANVAS_HEIGHT * 0.5, 980,
        );
        wash.addColorStop(0, 'rgba(58, 28, 96, 0.2)');
        wash.addColorStop(0.5, 'rgba(24, 10, 44, 0.16)');
        wash.addColorStop(1, 'rgba(3, 1, 8, 0.5)');
        ctx.fillStyle = wash;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        const folds: Array<[number, number, number, number, number]> = [
            [-30, 200, 440, 280, 0.2],
            [CANVAS_WIDTH + 20, 240, 400, 310, 1.1],
            [-70, 820, 480, 330, 2.1],
            [CANVAS_WIDTH + 40, 900, 440, 290, 0.7],
            [460, -30, 540, 190, 1.6],
            [1480, CANVAS_HEIGHT + 16, 500, 200, 2.7],
        ];
        for (const [x, y, rx, ry, phase] of folds) {
            const breathe = 1 + Math.sin(time / 1500 + phase) * 0.02;
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(1, (ry / rx) * breathe);
            const g = ctx.createRadialGradient(0, 0, rx * 0.05, 0, 0, rx);
            g.addColorStop(0, 'rgba(146, 86, 204, 0.5)');
            g.addColorStop(0.34, 'rgba(86, 36, 140, 0.34)');
            g.addColorStop(0.68, 'rgba(40, 16, 72, 0.16)');
            g.addColorStop(1, 'rgba(8, 3, 16, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(0, 0, rx, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        for (let i = 0; i < 8; i++) {
            const sx = 220 + (i * 211) % (CANVAS_WIDTH - 360);
            const sy = 160 + (i * 277) % (CANVAS_HEIGHT - 260);
            const glow = 0.12 + 0.05 * Math.sin(time / 980 + i);
            const r = 16 + (i % 3) * 7;
            const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 2.4);
            g.addColorStop(0, `rgba(214, 190, 255, ${glow})`);
            g.addColorStop(0.38, `rgba(112, 62, 176, ${glow * 0.55})`);
            g.addColorStop(1, 'rgba(16, 6, 32, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(sx, sy, r * 2.4, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    drawTransit(ctx: CanvasRenderingContext2D) {
        const tr = this.voyage;
        if (!tr) return;
        const to = THEME[tr.to];
        const from = THEME[tr.from];
        ctx.save();
        if (tr.phase === 'exit' && tr.anchored) {
            const u = Math.min(1, tr.t / EXIT_S);
            const here = this.exitPoint(tr);
            ctx.globalAlpha = 0.35 * u;
            ctx.strokeStyle = from.accent;
            ctx.lineWidth = 3;
            for (let i = 0; i < 7; i++) {
                const y = here.y - 70 + i * 24;
                const span = 80 + u * 420;
                ctx.beginPath();
                ctx.moveTo(here.x - span, y);
                ctx.lineTo(here.x - 36, y);
                ctx.stroke();
            }
            const veil = u < 0.72 ? 0 : (u - 0.72) / 0.28;
            ctx.globalAlpha = veil;
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            ctx.restore();
            return;
        }
        if (tr.phase === 'black' || tr.phase === 'read') {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }
        if (tr.phase === 'read') {
            this.drawHopCard(ctx, tr, to.accent);
        }
        if (tr.phase === 'cross') {
            const u = easeInOut(Math.min(1, tr.t / CROSS_S));
            const head = -160 + (CANVAS_WIDTH + 320) * u;
            ctx.fillStyle = '#05030a';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            const wash = ctx.createRadialGradient(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 40, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 980);
            wash.addColorStop(0, to.bg);
            wash.addColorStop(1, '#000');
            ctx.globalAlpha = 0.55 + u * 0.35;
            ctx.fillStyle = wash;
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            ctx.globalAlpha = 1;
            paintCrossing(ctx, tr.from, tr.to, u, head);
            paintDrift(ctx, tr.from, tr.to, u);
            paintTraveler(ctx, tr.from, tr.to, u);
            ctx.globalAlpha = 0.9;
            ctx.font = '800 28px "Chakra Petch", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = to.accent;
            ctx.fillText(tr.title, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 78);
            if (tr.t > 1.05 && Math.floor(tr.t * 2) % 2 === 0) {
                const prompt = this.lang === 'PT' ? 'CLIQUE' : this.lang === 'ES' ? 'PULSA' : 'CLICK';
                ctx.font = '700 18px "Chakra Petch", sans-serif';
                ctx.fillStyle = '#ffe7a8';
                ctx.fillText(prompt, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 42);
            }
        }
        if (tr.phase === 'enter') {
            const a = Math.max(0, 1 - tr.t / 0.42);
            ctx.fillStyle = `rgba(0,0,0,${a})`;
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }
        ctx.restore();
    }

    private drawHopCard(ctx: CanvasRenderingContext2D, tr: Voyage, accent: string) {
        const x = 180;
        const y = CANVAS_HEIGHT * 0.3;
        const w = CANVAS_WIDTH - 360;
        const h = 460;
        ctx.fillStyle = 'rgba(12, 8, 16, 0.94)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#ffe7a8';
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 16, y + 16, w - 32, h - 32);
        ctx.strokeStyle = accent;
        ctx.lineWidth = 8;
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = accent;
        ctx.fillRect(x + 48, y - 22, Math.min(720, 80 + tr.title.length * 26), 44);
        ctx.fillStyle = '#14080c';
        ctx.font = '800 28px "Chakra Petch", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(tr.title, x + 68, y);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffe7a8';
        ctx.font = '700 22px "Chakra Petch", sans-serif';
        ctx.fillText(`${tr.fromTitle}   →   ${tr.title}`, x + w / 2, y + 78);
        ctx.fillStyle = '#fff8f4';
        ctx.font = '700 36px "Chakra Petch", sans-serif';
        const cursor = tr.shown < tr.line.length && Math.floor(tr.t * 6) % 2 === 0 ? '▌' : '';
        wrapText(ctx, tr.line.slice(0, Math.floor(tr.shown)) + cursor, x + w / 2, y + h * 0.52, w - 160, 48);
        if (tr.shown >= tr.line.length && Math.floor(tr.t * 2) % 2 === 0) {
            const prompt = this.lang === 'PT' ? 'CLIQUE' : this.lang === 'ES' ? 'PULSA' : 'CLICK';
            ctx.font = '700 22px "Chakra Petch", sans-serif';
            ctx.fillStyle = '#ffe7a8';
            ctx.fillText(`${prompt}  ▼`, x + w / 2, y + h - 48);
        }
    }
}

function easeIn(t: number): number {
    const u = Math.max(0, Math.min(1, t));
    return u * u;
}

function easeOut(t: number): number {
    const u = Math.max(0, Math.min(1, t));
    return 1 - (1 - u) * (1 - u);
}

function cubic(a: number, b: number, c: number, d: number, t: number): number {
    const u = 1 - t;
    return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
}

function passagePoint(fromId: OrganId, toId: OrganId, u: number): { x: number; y: number } {
    const key = `${fromId}>${toId}`;
    const y0 = CANVAS_HEIGHT * 0.5;
    const across = -80 + (CANVAS_WIDTH + 180) * u;
    if (key === 'molar>liver') {
        return { x: across, y: 160 + u * (CANVAS_HEIGHT * 0.62) + Math.sin(u * Math.PI) * 40 };
    }
    if (key === 'molar>heart') {
        return { x: across, y: y0 + Math.sin(u * Math.PI * 4) * (40 + u * 20) };
    }
    if (key === 'molar>lung') {
        return { x: across, y: y0 + 90 - Math.sin(u * Math.PI) * 320 };
    }
    if (key === 'molar>brain') {
        return { x: across, y: CANVAS_HEIGHT * 0.78 - u * CANVAS_HEIGHT * 0.5 };
    }
    if (key === 'liver>molar') {
        return { x: CANVAS_WIDTH * (0.42 + 0.2 * Math.sin(u * Math.PI)), y: CANVAS_HEIGHT + 40 - u * (CANVAS_HEIGHT + 120) };
    }
    if (key === 'liver>heart') {
        return { x: across, y: y0 + 80 - u * 40 };
    }
    if (key === 'liver>lung' || key === 'heart>lung') {
        const tide = easeInOut(Math.min(1, u * 1.05)) * CANVAS_HEIGHT * 0.72;
        return { x: across, y: CANVAS_HEIGHT - tide - 30 + Math.sin(u * 10) * 16 };
    }
    if (key === 'liver>brain') {
        return { x: CANVAS_WIDTH * (0.3 + u * 0.55), y: CANVAS_HEIGHT * 0.72 - u * CANVAS_HEIGHT * 0.42 };
    }
    if (key === 'heart>molar') {
        return { x: -80 + (CANVAS_WIDTH + 180) * easeIn(u), y: y0 + Math.sin(u * 18) * 18 };
    }
    if (key === 'heart>liver') {
        return { x: across * (0.55 + 0.45 * (1 - u * 0.35)), y: y0 + u * 220 };
    }
    if (key === 'heart>brain') {
        const climb = u < 0.45 ? u / 0.45 : 1;
        const run = u < 0.45 ? 0 : (u - 0.45) / 0.55;
        return { x: CANVAS_WIDTH * 0.28 + run * CANVAS_WIDTH * 0.8, y: CANVAS_HEIGHT * 0.78 - climb * CANVAS_HEIGHT * 0.5 };
    }
    if (key === 'lung>molar') {
        const burst = easeIn(u);
        return { x: 160 + Math.cos(-0.15) * burst * 1900, y: y0 + Math.sin(-0.15) * burst * 280 };
    }
    if (key === 'lung>liver') {
        return { x: CANVAS_WIDTH * (0.35 + u * 0.5), y: y0 - 40 + u * 280 };
    }
    if (key === 'lung>heart') {
        return { x: across, y: y0 - Math.sin(u * Math.PI) * 60 };
    }
    if (key === 'lung>brain') {
        return { x: CANVAS_WIDTH * (0.2 + u * 0.6), y: y0 - u * 180 };
    }
    if (key === 'brain>molar') {
        const pts: Array<[number, number]> = [[380, 160], [560, 250], [760, 370], [1120, 470], [1560, 520], [CANVAS_WIDTH + 40, 640]];
        const f = u * (pts.length - 1);
        const i = Math.min(pts.length - 2, Math.floor(f));
        const k = f - i;
        return { x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, y: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k };
    }
    if (key === 'brain>liver') {
        return { x: across, y: 280 + Math.sin(u * Math.PI * 2) * 70 };
    }
    if (key === 'brain>heart') {
        const bolts = [0.05, 0.22, 0.4, 0.58, 0.78, 1];
        const ys = [70, 210, 300, 470, 620, 780];
        const f = u * (bolts.length - 1);
        const i = Math.min(bolts.length - 2, Math.floor(f));
        const k = f - i;
        return { x: 220 + (bolts[i] + (bolts[i + 1] - bolts[i]) * k) * (CANVAS_WIDTH * 0.7), y: ys[i] + (ys[i + 1] - ys[i]) * k };
    }
    if (key === 'brain>lung') {
        const amp = 78 * (1 - easeInOut(u));
        return { x: across, y: y0 + Math.sin(u * Math.PI * 3) * amp };
    }
    return {
        x: cubic(-80, CANVAS_WIDTH * 0.22, CANVAS_WIDTH * 0.62, CANVAS_WIDTH + 80, u),
        y: cubic(y0, CANVAS_HEIGHT * 0.18, CANVAS_HEIGHT * 0.84, y0, u),
    };
}

function paintDrift(ctx: CanvasRenderingContext2D, fromId: OrganId, toId: OrganId, u: number) {
    const accent = THEME[toId].accent;
    for (let i = 0; i < 26; i++) {
        const p = (u * 1.2 + i / 26) % 1;
        const pt = passagePoint(fromId, toId, p);
        ctx.globalAlpha = 0.2 + 0.6 * Math.sin(p * Math.PI);
        ctx.fillStyle = i % 3 === 0 ? '#fff8e8' : accent;
        ctx.beginPath();
        ctx.arc(pt.x + Math.sin(i * 2.2 + p * 8) * 36, pt.y + Math.cos(i * 1.7) * 26, 3 + (i % 5), 0, Math.PI * 2);
        ctx.fill();
    }
}

function paintTraveler(ctx: CanvasRenderingContext2D, fromId: OrganId, toId: OrganId, u: number) {
    for (let i = 6; i >= 1; i--) {
        const p = Math.max(0, u - i * 0.035);
        const ghost = passagePoint(fromId, toId, p);
        ctx.globalAlpha = 0.08 * (7 - i);
        ctx.fillStyle = '#7ef6ff';
        ctx.beginPath();
        ctx.arc(ghost.x, ghost.y, 18 - i, 0, Math.PI * 2);
        ctx.fill();
    }
    const pt = passagePoint(fromId, toId, u);
    const glow = ctx.createRadialGradient(pt.x, pt.y, 4, pt.x, pt.y, 70);
    glow.addColorStop(0, 'rgba(255,255,255,0.95)');
    glow.addColorStop(0.35, 'rgba(0, 255, 255, 0.55)');
    glow.addColorStop(1, 'rgba(0, 255, 255, 0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(pt.x, pt.y, 26, 22, u * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 10, 0, Math.PI * 2);
    ctx.fill();
}

function paintCrossing(ctx: CanvasRenderingContext2D, fromId: OrganId, toId: OrganId, u: number, head: number) {
    const key = `${fromId}>${toId}`;
    ctx.save();
    ctx.lineCap = 'round';
    if (key === 'molar>lung') paintAspire(ctx, u);
    else if (key === 'liver>molar') paintBile(ctx, u);
    else if (key === 'liver>lung') paintFlood(ctx, u, 'rgba(150, 140, 40, 0.55)');
    else if (key === 'heart>lung') paintFlood(ctx, u, 'rgba(150, 18, 36, 0.62)');
    else if (key === 'liver>brain') paintAmmonia(ctx, u);
    else if (key === 'heart>liver') paintIschemia(ctx, u, head);
    else if (key === 'lung>molar') paintCough(ctx, u);
    else if (key === 'lung>liver') paintHypoxia(ctx, u);
    else if (key === 'lung>brain') paintBlackout(ctx, u);
    else if (key === 'brain>molar') paintCrack(ctx, u);
    else if (key === 'brain>liver') paintAxis(ctx, u);
    else if (key === 'brain>heart') paintStorm(ctx, u);
    else if (key === 'brain>lung') paintApnea(ctx, u);
    else paintVein(ctx, fromId, toId, u, head, key === 'heart>brain');
    ctx.restore();
}

function paintVein(ctx: CanvasRenderingContext2D, fromId: OrganId, toId: OrganId, u: number, head: number, embolus: boolean) {
    const from = THEME[fromId];
    const to = THEME[toId];
    const y0 = CANVAS_HEIGHT * 0.5;
    ctx.globalAlpha = 0.95;
    ctx.strokeStyle = from.accent;
    ctx.lineWidth = 78;
    ctx.beginPath();
    ctx.moveTo(-60, y0);
    ctx.bezierCurveTo(CANVAS_WIDTH * 0.22, CANVAS_HEIGHT * 0.18, CANVAS_WIDTH * 0.62, CANVAS_HEIGHT * 0.84, head, y0);
    ctx.stroke();
    ctx.strokeStyle = to.accent;
    ctx.lineWidth = 22;
    ctx.globalAlpha = 0.9;
    ctx.stroke();
    if (embolus) {
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = '#1a0608';
        ctx.beginPath();
        ctx.ellipse(head, y0, 34, 22, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ff5a6a';
        ctx.lineWidth = 3;
        ctx.stroke();
    }
    for (let i = 0; i < 16; i++) {
        const p = (u * 1.35 + i / 16) % 1;
        const x = -60 + (head + 60) * p;
        const bend = Math.sin(p * Math.PI);
        const y = y0 + Math.sin(p * 6.2 + i) * 70 * bend - (toId === 'liver' ? (1 - p) * 40 : 0);
        ctx.globalAlpha = 0.35 + 0.5 * Math.sin(p * Math.PI);
        if (embolus) {
            ctx.fillStyle = '#4a1018';
            ctx.beginPath();
            ctx.ellipse(x, y, 10, 7, p * 3, 0, Math.PI * 2);
            ctx.fill();
        } else if (toId === 'heart') {
            ctx.fillStyle = i % 2 ? '#ff5a6a' : '#7a1020';
            ctx.beginPath();
            ctx.ellipse(x, y, 16, 11, p * 4, 0, Math.PI * 2);
            ctx.fill();
        } else if (toId === 'lung') {
            ctx.strokeStyle = '#f3c3ce';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x - 28, y);
            ctx.quadraticCurveTo(x, y - 18, x + 36, y + 6);
            ctx.stroke();
        } else if (toId === 'brain') {
            ctx.strokeStyle = '#c9a6ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x - 20, y);
            ctx.lineTo(x - 6, y - 16);
            ctx.lineTo(x + 4, y + 10);
            ctx.lineTo(x + 22, y - 8);
            ctx.stroke();
        } else if (toId === 'liver') {
            ctx.fillStyle = '#d6e36a';
            ctx.beginPath();
            ctx.ellipse(x, y + 18, 8, 14, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = '#e7eef4';
            ctx.beginPath();
            ctx.arc(x, y, 7, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function paintAspire(ctx: CanvasRenderingContext2D, u: number) {
    for (let i = 0; i < 7; i++) {
        const p = (u * 1.15 + i / 7) % 1;
        const y = 90 + i * 130;
        const x = -220 + (CANVAS_WIDTH + 440) * p;
        ctx.globalAlpha = 0.28 + 0.4 * Math.sin(p * Math.PI);
        ctx.strokeStyle = i % 2 ? '#f3c3ce' : '#d5e2ee';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + 180, y + 30, x + 460, y + 170);
        ctx.stroke();
    }
    for (let i = 0; i < 14; i++) {
        const p = (u * 1.35 + i * 0.07) % 1;
        ctx.globalAlpha = 0.3 + 0.5 * (1 - p);
        ctx.fillStyle = '#e7eef4';
        ctx.beginPath();
        ctx.ellipse(180 + (i * 127) % (CANVAS_WIDTH - 360), -30 + p * CANVAS_HEIGHT * 0.86, 5, 10, 0, 0, Math.PI * 2);
        ctx.fill();
    }
}

function paintBile(ctx: CanvasRenderingContext2D, u: number) {
    const rise = easeInOut(u);
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = '#d6e36a';
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH * 0.5, CANVAS_HEIGHT + 30);
    ctx.bezierCurveTo(CANVAS_WIDTH * 0.4, CANVAS_HEIGHT * 0.62, CANVAS_WIDTH * 0.6, CANVAS_HEIGHT * 0.28, CANVAS_WIDTH * 0.48, 80 + (1 - rise) * 240);
    ctx.stroke();
    for (let i = 0; i < 16; i++) {
        const p = (rise + i / 16) % 1;
        ctx.globalAlpha = 0.35 + 0.5 * Math.sin(p * Math.PI);
        ctx.fillStyle = i % 3 === 0 ? '#f4f0a8' : '#c6d84a';
        ctx.beginPath();
        ctx.ellipse(CANVAS_WIDTH * (0.22 + (i % 5) * 0.13), CANVAS_HEIGHT + 20 - p * (CANVAS_HEIGHT + 60), 11, 16, 0, 0, Math.PI * 2);
        ctx.fill();
    }
}

function paintFlood(ctx: CanvasRenderingContext2D, u: number, color: string) {
    const h = easeInOut(Math.min(1, u * 1.12)) * CANVAS_HEIGHT * 0.9;
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_HEIGHT);
    ctx.lineTo(0, CANVAS_HEIGHT - h);
    for (let x = 0; x <= CANVAS_WIDTH; x += 36) {
        ctx.lineTo(x, CANVAS_HEIGHT - h + Math.sin(x * 0.018 + u * 14) * 18);
    }
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fill();
}

function paintAmmonia(ctx: CanvasRenderingContext2D, u: number) {
    for (let i = 0; i < 8; i++) {
        const r = (70 + i * 100) * (0.25 + u);
        ctx.globalAlpha = (0.07 + 0.1 * (1 - i / 8)) * Math.sin(Math.min(1, u) * Math.PI);
        ctx.fillStyle = i % 2 ? '#e6e28a' : '#c9a6ff';
        ctx.beginPath();
        ctx.arc(CANVAS_WIDTH * 0.5, CANVAS_HEIGHT * 0.48, r, 0, Math.PI * 2);
        ctx.fill();
    }
}

function paintIschemia(ctx: CanvasRenderingContext2D, u: number, head: number) {
    const y0 = CANVAS_HEIGHT * 0.5;
    ctx.globalAlpha = 0.9 * (1 - u * 0.4);
    ctx.strokeStyle = u < 0.45 ? '#ff5a6a' : '#9a9a78';
    ctx.lineWidth = Math.max(3, 46 * (1 - u * 0.84));
    ctx.beginPath();
    ctx.moveTo(-60, y0);
    ctx.bezierCurveTo(CANVAS_WIDTH * 0.22, CANVAS_HEIGHT * 0.18, CANVAS_WIDTH * 0.62, CANVAS_HEIGHT * 0.84, head, y0);
    ctx.stroke();
}

function paintCough(ctx: CanvasRenderingContext2D, u: number) {
    const burst = Math.min(1, u * 1.35);
    ctx.strokeStyle = '#f3c3ce';
    ctx.lineWidth = 10;
    ctx.globalAlpha = 0.9 * (1 - burst * 0.2);
    for (let i = 0; i < 9; i++) {
        const a = -0.7 + i * 0.16;
        ctx.beginPath();
        ctx.moveTo(160, CANVAS_HEIGHT * 0.5);
        ctx.lineTo(160 + Math.cos(a) * burst * 1500, CANVAS_HEIGHT * 0.5 + Math.sin(a) * burst * 380);
        ctx.stroke();
    }
    ctx.fillStyle = '#e7eef4';
    for (let i = 0; i < 14; i++) {
        const a = -0.8 + (i / 14) * 1.6;
        const d = burst * (360 + (i * 97) % 780);
        ctx.globalAlpha = 0.35 + 0.45 * (1 - burst);
        ctx.beginPath();
        ctx.arc(160 + Math.cos(a) * d, CANVAS_HEIGHT * 0.5 + Math.sin(a) * d * 0.32, 4 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
    }
}

function paintHypoxia(ctx: CanvasRenderingContext2D, u: number) {
    ctx.globalAlpha = 0.18 + u * 0.5;
    ctx.fillStyle = '#163044';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.globalAlpha = 0.2 + 0.4 * (1 - u);
    ctx.fillStyle = '#d6e36a';
    ctx.beginPath();
    ctx.ellipse(CANVAS_WIDTH * 0.62, CANVAS_HEIGHT * 0.5, 240 * (1 - u * 0.4), 150, 0, 0, Math.PI * 2);
    ctx.fill();
}

function paintBlackout(ctx: CanvasRenderingContext2D, u: number) {
    const r = (1 - easeInOut(u)) * 980 + 50;
    const g = ctx.createRadialGradient(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, r * 0.15, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, r);
    g.addColorStop(0, 'rgba(24, 10, 40, 0.02)');
    g.addColorStop(0.5, 'rgba(8, 4, 16, 0.55)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0.94)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function paintCrack(ctx: CanvasRenderingContext2D, u: number) {
    const pts: Array<[number, number]> = [[380, 160], [560, 250], [500, 400], [760, 370], [840, 540], [1120, 470], [1320, 640], [1560, 520], [1720, 700]];
    const n = Math.max(2, Math.ceil(u * pts.length));
    ctx.globalAlpha = 0.95;
    ctx.strokeStyle = '#f4f7fb';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < n; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
    ctx.strokeStyle = '#c9a6ff';
    ctx.lineWidth = 2;
    ctx.stroke();
    const tip = pts[n - 1];
    ctx.fillStyle = '#e7eef4';
    for (let i = 0; i < 6; i++) {
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.arc(tip[0] + (i - 2.5) * 16, tip[1] + ((i * 17) % 24) - 8, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}

function paintAxis(ctx: CanvasRenderingContext2D, u: number) {
    ctx.globalAlpha = 0.85 * (1 - u * 0.62);
    for (let i = 0; i < 5; i++) {
        ctx.strokeStyle = i % 2 ? '#c9a6ff' : '#d6e36a';
        ctx.lineWidth = 8;
        const y = 180 + i * 150;
        ctx.beginPath();
        ctx.moveTo(-40, y);
        ctx.bezierCurveTo(420, y - 70, 980, y + 80, CANVAS_WIDTH * Math.min(1, u * 1.05), y + 16);
        ctx.stroke();
    }
}

function paintStorm(ctx: CanvasRenderingContext2D, u: number) {
    const flash = Math.sin(u * Math.PI * 5) > 0.2 ? 1 : 0.28;
    ctx.globalAlpha = 0.85 * flash;
    ctx.strokeStyle = '#efe6ff';
    ctx.lineWidth = 3;
    const bolts = [
        [[220, 70], [360, 210], [300, 240], [500, 470], [440, 500], [680, 780]],
        [[980, 40], [920, 210], [1120, 300], [1040, 460], [1260, 700]],
        [[1580, 90], [1460, 250], [1640, 340], [1500, 560], [1680, 820]],
    ];
    for (const bolt of bolts) {
        ctx.beginPath();
        ctx.moveTo(bolt[0][0], bolt[0][1]);
        for (let i = 1; i < bolt.length; i++) ctx.lineTo(bolt[i][0], bolt[i][1]);
        ctx.stroke();
    }
    ctx.globalAlpha = 0.35 + 0.45 * u;
    ctx.strokeStyle = '#ff5a6a';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(CANVAS_WIDTH * 0.68, CANVAS_HEIGHT * 0.55, 36 + u * 240, 0, Math.PI * 2);
    ctx.stroke();
}

function paintApnea(ctx: CanvasRenderingContext2D, u: number) {
    const amp = 78 * (1 - easeInOut(u));
    ctx.strokeStyle = '#f3c3ce';
    ctx.lineWidth = 9;
    ctx.globalAlpha = 0.95;
    for (let row = 0; row < 4; row++) {
        const y = 200 + row * 190;
        ctx.beginPath();
        for (let x = 0; x <= CANVAS_WIDTH; x += 18) {
            const yy = y + Math.sin(x * 0.02 + row) * amp;
            if (x === 0) ctx.moveTo(x, yy);
            else ctx.lineTo(x, yy);
        }
        ctx.stroke();
    }
}

function ecgKeys(shape: number): Array<[number, number]> {
    if (shape === 1) {
        return [[0, 0], [0.16, 0], [0.22, 12], [0.28, 0], [0.4, 0], [0.44, -22], [0.49, 64], [0.53, -20], [0.57, 0], [0.7, 0], [0.8, 28], [0.9, 0], [1, 0]];
    }
    if (shape === 2) {
        return [[0, 0], [0.3, 0], [0.34, -12], [0.37, 86], [0.4, -36], [0.44, 0], [0.62, 0], [0.7, 12], [0.78, 0], [1, 0]];
    }
    if (shape === 3) {
        return [[0, 0], [0.1, 0], [0.16, 20], [0.22, 0], [0.34, 0], [0.38, -8], [0.43, 36], [0.47, -14], [0.51, 0], [0.64, 0], [0.74, -18], [0.84, 0], [1, 0]];
    }
    return [[0, 0], [0.14, 0], [0.2, 14], [0.26, 0], [0.36, 0], [0.395, -16], [0.43, 74], [0.465, -28], [0.5, 0], [0.62, 0], [0.72, 22], [0.82, 0], [1, 0]];
}

function pqrst(t: number, shape: number): number {
    const keys = ecgKeys(shape);
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
        const [t0, a0] = keys[i - 1];
        const [t1, a1] = keys[i];
        if (t <= t1) return a0 + (a1 - a0) * ((t - t0) / (t1 - t0 || 1));
    }
    return keys[keys.length - 1][1];
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

function clamp(n: number, a: number, b: number): number {
    return Math.max(a, Math.min(b, n));
}

function popIn(t: number): number {
    const u = Math.max(0, Math.min(1, t)) - 1;
    const c = 1.55;
    return 1 + (c + 1) * u * u * u + c * u * u;
}

function easeInOut(t: number): number {
    const u = Math.max(0, Math.min(1, t));
    return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
    const words = text.split(' ');
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && line) {
            lines.push(line);
            line = word;
        } else {
            line = test;
        }
    }
    if (line) lines.push(line);
    const top = y - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((row, i) => ctx.fillText(row, x, top + i * lineHeight));
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

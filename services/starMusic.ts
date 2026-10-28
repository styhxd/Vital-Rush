/**
 * Leucogen. A fanfarra do glóbulo, no mesmo AudioContext da música do órgão.
 *
 * Três voltas a 156 e a quarta a 184 fecham em ~11,8s, sempre num tempo forte,
 * para o tema do órgão entrar no compasso seguinte. Cada abate sobe a pentatônica.
 */

const C4 = 261.63;
const semi = (n: number) => C4 * Math.pow(2, n / 12);

/** 32 semicolcheias. Fmaj7 G6 Em7 Am7, depois a rampa Dm7 D#°7 Em7 G7. */
const CHORDS: number[][] = [
    [-7, -3, 0, 4],
    [-5, -1, 2, 4],
    [-8, -5, -1, 2],
    [-3, 0, 4, 7],
    [-10, -7, -3, 0],
    [-9, 6, 9, 12],
    [-8, -5, -1, 14],
    [-5, -1, 2, 17],
];

const BASS = [-19, -17, -20, -15, -22, -21, -20, -17];

const LEAD = [
    21, 19, 21, 24,  23, 19, 14, 19,
    19, 18, 19, 23,  21, 16, 12, 16,
    17, 16, 17, 21,  18, 21, 24, 15,
    16, 19, 23, 26,  26, 23, 19, 26,
];

const LADDER = [12, 14, 16, 19, 21, 24, 26, 28, 31, 33, 36];

export const STAR_STEPS = 128;
export const STAR_RUSH_AT = 96;

export function starBpm(step: number): number {
    return step >= STAR_RUSH_AT ? 184 : 156;
}

const hatNoise = new WeakMap<BaseAudioContext, AudioBuffer>();
const snareNoise = new WeakMap<BaseAudioContext, AudioBuffer>();
const crunchNoise = new WeakMap<BaseAudioContext, AudioBuffer>();

function noise(ctx: BaseAudioContext, seconds: number, crush: number, store: WeakMap<BaseAudioContext, AudioBuffer>): AudioBuffer {
    const cached = store.get(ctx);
    if (cached) return cached;
    const frames = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let hold = 0;
    for (let i = 0; i < frames; i++) {
        if (i % crush === 0) hold = Math.random() * 2 - 1;
        data[i] = hold;
    }
    store.set(ctx, buf);
    return buf;
}

function env(ctx: BaseAudioContext, dest: AudioNode, time: number, dur: number, peak: number): GainNode {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, peak), time + Math.min(0.012, dur * 0.25));
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    g.connect(dest);
    return g;
}

function voice(
    ctx: BaseAudioContext,
    dest: AudioNode,
    time: number,
    freq: number,
    dur: number,
    type: OscillatorType,
    peak: number,
    cutoff?: number,
) {
    const osc = ctx.createOscillator();
    const g = env(ctx, dest, time, dur, peak);
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(36, freq), time);
    if (cutoff && cutoff > 40) {
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.setValueAtTime(cutoff, time);
        osc.connect(f);
        f.connect(g);
    } else {
        osc.connect(g);
    }
    osc.start(time);
    osc.stop(time + dur + 0.02);
}

export function playStarFanfare(ctx: BaseAudioContext, dest: AudioNode, time: number) {
    const notes = [0, 4, 7, 12, 16, 19].map((n) => semi(n + 12));
    notes.forEach((f, i) => voice(ctx, dest, time + i * 0.022, f, 0.09, 'sawtooth', 0.11, 4200));
}

export function playStarDown(ctx: BaseAudioContext, dest: AudioNode, time: number) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, time);
    osc.frequency.exponentialRampToValueAtTime(140, time + 0.18);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(0.1, time + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(2400, time);
    osc.connect(f);
    f.connect(g);
    g.connect(dest);
    osc.start(time);
    osc.stop(time + 0.2);
}

export function playStarStep(
    ctx: BaseAudioContext,
    dest: AudioNode,
    step: number,
    time: number,
    streak: number,
) {
    const phrase = step % 32;
    const bar = step % 16;
    const chord = Math.floor(phrase / 4);
    const hook = step < 8 ? 1.22 : 1;

    if (bar % 4 === 0) {
        const osc = ctx.createOscillator();
        const g = env(ctx, dest, time, 0.11, 0.26);
        osc.frequency.setValueAtTime(168, time);
        osc.frequency.exponentialRampToValueAtTime(46, time + 0.08);
        osc.connect(g);
        osc.start(time);
        osc.stop(time + 0.13);
    }

    if (bar === 4 || bar === 12 || (phrase >= 28 && bar % 2 === 1) || (step >= STAR_RUSH_AT && bar % 4 === 2)) {
        voice(ctx, dest, time, 196, 0.06, 'triangle', 0.1, 900);
        const src = ctx.createBufferSource();
        src.buffer = noise(ctx, 0.08, 1, snareNoise);
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.setValueAtTime(900, time);
        const g = env(ctx, dest, time, 0.08, 0.12);
        src.connect(hp);
        hp.connect(g);
        src.start(time);
        src.stop(time + 0.09);
    }

    if (bar % 2 === 1 || streak >= 3) {
        const src = ctx.createBufferSource();
        src.buffer = noise(ctx, 0.03, 1, hatNoise);
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.setValueAtTime(6200, time);
        const g = env(ctx, dest, time, 0.03, bar % 2 === 1 ? 0.045 : 0.022);
        src.connect(hp);
        hp.connect(g);
        src.start(time);
        src.stop(time + 0.035);
    }

    const root = semi(BASS[chord]);
    const bassHz = step % 2 === 1 ? root * 2 : root;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const g = env(ctx, dest, time, 0.09, 0.18);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(Math.max(36, bassHz), time);
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(3.2, time);
    filter.frequency.setValueAtTime(1400, time);
    filter.frequency.exponentialRampToValueAtTime(180, time + 0.07);
    osc.connect(filter);
    filter.connect(g);
    osc.start(time);
    osc.stop(time + 0.1);

    if (step % 4 === 0 || step % 4 === 2) {
        const vol = (step % 4 === 0 ? 0.045 : 0.03) * hook;
        for (const n of CHORDS[chord]) {
            voice(ctx, dest, time, semi(n), 0.1, 'sawtooth', vol, 2800);
        }
    }

    const leadHz = semi(LEAD[phrase]);
    const over = streak >= 3;
    const detunes = over ? [-8, 0, 8] : [-5, 5];
    detunes.forEach((d, idx) => {
        const lead = ctx.createOscillator();
        const lg = env(ctx, dest, time, 0.1, 0.055 * hook);
        lead.type = idx === 1 ? 'square' : 'sawtooth';
        const hz = over && idx === 1 ? leadHz * 2 : leadHz;
        lead.frequency.setValueAtTime(hz, time);
        lead.detune.setValueAtTime(d, time);
        lead.connect(lg);
        lead.start(time);
        lead.stop(time + 0.11);
    });

    if (streak >= 6) {
        const notes = CHORDS[chord];
        const arp = semi(notes[step % notes.length]) * 2;
        voice(ctx, dest, time, arp, 0.045, 'triangle', 0.04, 5200);
        const bpm = starBpm(step);
        voice(ctx, dest, time + (60 / bpm) / 8, arp * 1.5, 0.04, 'triangle', 0.028, 5600);
    }
}

/** Sidechain no bus da fanfarra, crunch, e o degrau da pentatônica. */
export function playStarKill(ctx: BaseAudioContext, duck: GainNode, sfx: AudioNode, time: number, streak: number) {
    duck.gain.cancelScheduledValues(time);
    duck.gain.setValueAtTime(0.42, time);
    duck.gain.exponentialRampToValueAtTime(1, time + 0.13);

    const sub = ctx.createOscillator();
    const subG = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(180, time);
    sub.frequency.exponentialRampToValueAtTime(38, time + 0.1);
    subG.gain.setValueAtTime(0.0001, time);
    subG.gain.exponentialRampToValueAtTime(0.55, time + 0.006);
    subG.gain.exponentialRampToValueAtTime(0.0001, time + 0.11);
    sub.connect(subG);
    subG.connect(sfx);
    sub.start(time);
    sub.stop(time + 0.12);

    const src = ctx.createBufferSource();
    src.buffer = noise(ctx, 0.06, 4, crunchNoise);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1700, time);
    bp.Q.setValueAtTime(1.2, time);
    const nG = env(ctx, sfx, time, 0.06, 0.32);
    src.connect(bp);
    bp.connect(nG);
    src.start(time);
    src.stop(time + 0.07);

    const note = semi(LADDER[Math.min(streak, LADDER.length - 1)]);
    [1, 1.25, 2].forEach((harmonic, idx) => {
        const when = time + idx * 0.016;
        voice(ctx, sfx, when, note * harmonic, 0.16, idx === 1 ? 'square' : 'sawtooth', 0.1 - idx * 0.02, 3600);
    });
}

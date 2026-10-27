/**
 * Coleta de moeda. O som só existe enquanto a moeda chega, e para quando ela para.
 *
 * O ritmo do XP do Minecraft não é uma melodia: em ExperienceOrb, takeXpDelay = 2
 * ticks (100 ms a 20 Hz). Cada orbe é um ataque curto, com um buraco de silêncio
 * antes do próximo. O ouvido funde o que se sobrepõe (Bregman; o limiar para
 * eventos tonais separados fica por volta de 80–100 ms). O tilintar daqui dura
 * ~42 ms e só dispara de novo depois de 100 ms, então a música continua no vão.
 *
 * Uma pilha não pode durar N vezes. A sensação de quantidade cresce com o
 * logaritmo (Fechner / Stevens), e uma celebração que não acaba vira a "zona"
 * que Schüll descreve e que Dixon mediu nos caça-níqueis: som de vitória sem
 * pausa, por cima de tudo. A chuva cabe numa frase curta e depois cala.
 * Gastar DNA no linfonodo não usa essa voz: som de ganho em cima de perda é
 * o "loss disguised as a win" (Dixon, Harrigan, Sandhu, Collins e Fugelsang, 2010).
 *
 * No fim da frase, três sinos fecham a sentença em ~180 ms. O level-up do
 * Minecraft é um arpejo maior rolado por cerca de 0,7 s; este é mais curto e
 * o contorno é outro (quinta, tônica, quinta acima), no mesmo timbre da moeda.
 * Uma cadência fecha a expectativa (Meyer; Huron, Sweet Anticipation). Se ainda
 * houver moeda quando o botão acaba, a frase recomeça um tom acima: +2, depois
 * +4, depois +7 semitons. A quinta justa é o último convite; dali a frase
 * repete no mesmo lugar para não virar apito. Um gole de uma nota não ganha
 * botão. A celebração é da frase, não de cada moeda.
 */

export const COIN_BEAT_MS = 100;
export const COIN_RESET_MS = 420;
export const COIN_PHRASE = 7;
export const COIN_CADENCE_MS = 200;
/** Semitons acima da casa: tom, terça maior, quinta justa. */
export const COIN_GEARS = [0, 2, 4, 7];
export const COIN_ATTACK_S = 0.0014;
export const COIN_BODY_S = 0.042;
export const COIN_PARTIAL_S = 0.016;
export const COIN_TIP_S = 0.007;
export const COIN_CLICK_S = 0.0045;

/** Pentatônica maior, do G6 ao A7. Sobe e segura o topo. Não dá a volta. */
export const COIN_SCALE = [1567.98, 1760, 2093, 2349.32, 2637.02, 3135.96, 3520];

export interface CoinVoice {
    run: number;
    lastAt: number;
    latch: number;
    gear: number;
    closing: boolean;
    cadenceUntil: number;
}

export type CoinPlay =
    | { kind: 'tick'; step: number; piled: number; gear: number }
    | { kind: 'cadence'; gear: number };

export function freshVoice(): CoinVoice {
    return { run: 0, lastAt: 0, latch: 0, gear: 0, closing: false, cadenceUntil: 0 };
}

export function latchCoin(v: CoinVoice): CoinVoice {
    return { ...v, latch: Math.min(48, v.latch + 1) };
}

export function gearSemi(gear: number): number {
    return COIN_GEARS[Math.max(0, Math.min(COIN_GEARS.length - 1, gear))] ?? 0;
}

export function flushCoin(v: CoinVoice, now: number): { voice: CoinVoice; play: CoinPlay | null } {
    if (v.cadenceUntil > now) return { voice: v, play: null };

    if (v.closing && v.cadenceUntil > 0 && now >= v.cadenceUntil) {
        if (v.latch <= 0) {
            return { voice: freshVoice(), play: null };
        }
        const gear = Math.min(COIN_GEARS.length - 1, v.gear + 1);
        const piled = v.latch;
        return {
            voice: { run: 0, lastAt: now, latch: 0, gear, closing: false, cadenceUntil: 0 },
            play: { kind: 'tick', step: 0, piled, gear },
        };
    }

    if (v.latch > 0 && v.lastAt > 0 && now - v.lastAt < COIN_BEAT_MS) return { voice: v, play: null };

    const gap = v.lastAt > 0 ? now - v.lastAt : 0;
    if (v.closing && v.cadenceUntil === 0 && gap >= COIN_BEAT_MS && gap < COIN_RESET_MS) {
        return {
            voice: { ...v, cadenceUntil: now + COIN_CADENCE_MS, lastAt: now },
            play: { kind: 'cadence', gear: v.gear },
        };
    }

    if (v.latch <= 0) return { voice: v, play: null };

    const piled = v.latch;
    const fresh = v.lastAt <= 0 || gap >= COIN_RESET_MS;
    if (fresh) {
        return {
            voice: { run: 0, lastAt: now, latch: 0, gear: 0, closing: false, cadenceUntil: 0 },
            play: { kind: 'tick', step: 0, piled, gear: 0 },
        };
    }

    const run = Math.min(COIN_PHRASE - 1, v.run + 1);
    return {
        voice: { run, lastAt: now, latch: 0, gear: v.gear, cadenceUntil: 0, closing: run >= COIN_PHRASE - 1 },
        play: { kind: 'tick', step: run, piled, gear: v.gear },
    };
}

/** Quantos ataques cabem numa chuva. O teto é o que impede a onda de ficar esperando. */
export function showerSlots(count: number, cap: number): number {
    const n = Math.max(0, Math.floor(count));
    if (n <= 1) return 1;
    const logged = 1 + Math.round(Math.log2(n) * 1.15);
    return Math.max(1, Math.min(cap, n, logged));
}

export function coinSlot(index: number, count: number, slots: number): number {
    if (count <= slots) return index;
    return Math.min(slots - 1, Math.floor((index * slots) / count));
}

export function showerPlan(count: number, kind: 'vacuum' | 'surge') {
    const cap = kind === 'vacuum' ? 8 : 5;
    const slots = showerSlots(count, cap);
    const span = Math.max(0, slots - 1) * COIN_BEAT_MS;
    return {
        slots,
        span,
        slot: (index: number) => coinSlot(index, count, slots),
    };
}

export function coinFreq(step: number, piled: number, gear = 0): number {
    const f = COIN_SCALE[Math.max(0, Math.min(COIN_PHRASE - 1, step))] ?? COIN_SCALE[0];
    const cents = ((step * 5 + piled * 3) % 9) - 4;
    return f * Math.pow(2, (cents + gearSemi(gear) * 100) / 1200);
}

/** Quinta, tônica, quinta acima. Três sinos, um fôlego, não um arpejo rolado. */
export const CADENCE_NOTES = [
    { at: 0, mul: 1.5, dur: 0.05 },
    { at: 0.052, mul: 2, dur: 0.062 },
    { at: 0.112, mul: 3, dur: 0.07 },
];

export function cadenceFreq(index: number, gear: number): number {
    const tonic = COIN_SCALE[0] * Math.pow(2, gearSemi(gear) / 12);
    const mul = CADENCE_NOTES[index]?.mul ?? 2;
    return tonic * mul;
}

export function coinGain(piled: number): number {
    const n = Math.max(1, Math.min(8, piled));
    return 0.07 * (1 + 0.1 * Math.log2(n));
}

function ramp(t: number, peak: number, attack: number, dur: number): number {
    if (t <= 0 || t >= dur || peak <= 0) return 0;
    if (t < attack) return 0.0001 * Math.pow(peak / 0.0001, t / attack);
    const u = (t - attack) / (dur - attack);
    return peak * Math.pow(0.0001 / peak, u);
}

function release(source: AudioScheduledSourceNode, nodes: AudioNode[], when: number) {
    source.stop(when);
    source.onended = () => {
        try { source.disconnect(); } catch { /* já saiu */ }
        for (const node of nodes) {
            try { node.disconnect(); } catch { /* já saiu */ }
        }
    };
}

const coinClicks = new WeakMap<BaseAudioContext, AudioBuffer>();

/** Soma das envoltórias. O clique é o metal; o corpo morre antes do próximo tempo. */
export function coinAmp(t: number, peak: number): number {
    return ramp(t, peak, COIN_ATTACK_S, COIN_BODY_S)
        + ramp(t, peak * 0.22, 0.0008, COIN_PARTIAL_S)
        + ramp(t, peak * 0.1, 0.0004, COIN_TIP_S)
        + (t >= 0 && t < COIN_CLICK_S ? peak * 0.55 * (1 - t / COIN_CLICK_S) : 0);
}

export function scheduleCadence(
    ctx: BaseAudioContext,
    dest: AudioNode,
    time: number,
    gear: number,
) {
    const nyquist = ctx.sampleRate * 0.45;
    CADENCE_NOTES.forEach((note, index) => {
        const f = Math.min(nyquist, cadenceFreq(index, gear));
        const start = time + note.at;
        const peak = index === CADENCE_NOTES.length - 1 ? 0.05 : 0.04;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(Math.max(40, f), start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(peak, start + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + note.dur);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(start);
        release(osc, [gain], start + note.dur + 0.02);
    });
}

export function scheduleCoinTick(
    ctx: BaseAudioContext,
    dest: AudioNode,
    time: number,
    step: number,
    piled: number,
    gear = 0,
) {
    const wobble = Math.pow(2, (Math.random() * 10 - 5) / 1200);
    const f = Math.min(ctx.sampleRate * 0.22, coinFreq(step, piled, gear) * wobble);
    const peak = coinGain(piled);
    const nyquist = ctx.sampleRate * 0.45;

    const body = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    body.type = 'sine';
    body.frequency.setValueAtTime(Math.max(40, f * 1.035), time);
    body.frequency.exponentialRampToValueAtTime(Math.max(40, f), time + 0.012);
    bodyGain.gain.setValueAtTime(0.0001, time);
    bodyGain.gain.exponentialRampToValueAtTime(peak, time + COIN_ATTACK_S);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, time + COIN_BODY_S);
    body.connect(bodyGain);
    bodyGain.connect(dest);
    body.start(time);
    release(body, [bodyGain], time + COIN_BODY_S + 0.01);

    const partialHz = Math.min(nyquist, f * 2.37);
    if (partialHz > 80) {
        const partial = ctx.createOscillator();
        const partialGain = ctx.createGain();
        partial.type = 'sine';
        partial.frequency.setValueAtTime(partialHz, time);
        partialGain.gain.setValueAtTime(0.0001, time);
        partialGain.gain.exponentialRampToValueAtTime(peak * 0.22, time + 0.0008);
        partialGain.gain.exponentialRampToValueAtTime(0.0001, time + COIN_PARTIAL_S);
        partial.connect(partialGain);
        partialGain.connect(dest);
        partial.start(time);
        release(partial, [partialGain], time + COIN_PARTIAL_S + 0.01);
    }

    const tipHz = Math.min(nyquist, f * 4.9);
    if (tipHz > partialHz + 40) {
        const tip = ctx.createOscillator();
        const tipGain = ctx.createGain();
        tip.type = 'sine';
        tip.frequency.setValueAtTime(tipHz, time);
        tipGain.gain.setValueAtTime(0.0001, time);
        tipGain.gain.exponentialRampToValueAtTime(peak * 0.1, time + 0.0004);
        tipGain.gain.exponentialRampToValueAtTime(0.0001, time + COIN_TIP_S);
        tip.connect(tipGain);
        tipGain.connect(dest);
        tip.start(time);
        release(tip, [tipGain], time + COIN_TIP_S + 0.01);
    }

    let noise = coinClicks.get(ctx);
    if (!noise) {
        const frames = Math.max(1, Math.floor(ctx.sampleRate * COIN_CLICK_S));
        noise = ctx.createBuffer(1, frames, ctx.sampleRate);
        const data = noise.getChannelData(0);
        for (let i = 0; i < frames; i++) {
            const env = 1 - i / frames;
            data[i] = (Math.random() * 2 - 1) * env * env;
        }
        coinClicks.set(ctx, noise);
    }
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.setValueAtTime(Math.min(nyquist, 6400), time);
    band.Q.setValueAtTime(2.2, time);
    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(peak * 0.55, time);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, time + COIN_CLICK_S);
    src.connect(band);
    band.connect(clickGain);
    clickGain.connect(dest);
    src.start(time);
    release(src, [band, clickGain], time + COIN_CLICK_S + 0.01);
}

export interface CoinReport {
    ok: boolean;
    lines: string[];
    failures: string[];
}

function audibleEnd(peak: number): number {
    let loudest = 0;
    for (let i = 0; i <= 800; i++) loudest = Math.max(loudest, coinAmp(i / 10000, peak));
    const floor = loudest * 0.01;
    let last = 0;
    for (let i = 0; i <= 800; i++) {
        if (coinAmp(i / 10000, peak) > floor) last = i / 10000;
    }
    return last;
}

/** O quadro trava o som no começo e as moedas entram depois, como no update do jogo. */
function simulate(arrivalTimes: number[]): (CoinPlay & { at: number })[] {
    let voice = freshVoice();
    const played: (CoinPlay & { at: number })[] = [];
    const sorted = [...arrivalTimes].sort((a, b) => a - b);
    const end = (sorted[sorted.length - 1] ?? 0) + COIN_CADENCE_MS + COIN_BEAT_MS + 64;
    let next = 0;
    for (let t = 0; t <= end; t += 16) {
        const flushed = flushCoin(voice, t);
        voice = flushed.voice;
        if (flushed.play) played.push({ ...flushed.play, at: t });
        while (next < sorted.length && sorted[next] < t + 16) {
            voice = latchCoin(voice);
            next++;
        }
    }
    return played;
}

export function checkCoinFeel(): CoinReport {
    const lines: string[] = [];
    const failures: string[] = [];
    const bad = (msg: string) => failures.push(msg);

    const peak = coinGain(1);
    const end = audibleEnd(peak);
    lines.push(`um tilintar fica acima de -40 dB por ${Math.round(end * 1000)} ms (teto do corpo ${Math.round(COIN_BODY_S * 1000)} ms)`);
    if (end < 0.012 || end > 0.036) bad(`tilintar fora da faixa curta: ${end.toFixed(4)} s`);
    if (coinAmp(0.05, peak) > peak * 0.001) bad('ainda há som aos 50 ms');
    if (coinAmp(0.1, peak) !== 0) bad('o corpo não zerou antes do próximo tempo');

    const fat = coinGain(20) / coinGain(1);
    lines.push(`uma pilha de 20 moedas no mesmo instante soa ${fat.toFixed(2)}× mais forte, não 20× mais longa`);
    if (fat > 1.45 || fat < 1.15) bad(`brilho da pilha inesperado: ${fat.toFixed(3)}`);
    if (Math.abs(audibleEnd(coinGain(20)) - end) > 0.004) bad('pilha alongou o som');

    const gulp = simulate(Array.from({ length: 20 }, () => 8));
    lines.push(`20 moedas no mesmo quadro: ${gulp.length} ataque, passo ${gulp.map(p => p.kind === 'tick' ? p.step : 'botão').join(',')}`);
    if (gulp.length !== 1 || gulp[0]?.kind !== 'tick') bad(`gole virou fila: ${gulp.length} ataques`);
    if (gulp[0] && gulp[0].at > 40) bad('o gole demorou a soar');

    const smear = simulate(Array.from({ length: 20 }, (_, i) => i * 3));
    lines.push(`20 moedas em 60 ms: ${smear.length} ataques, e depois silêncio`);
    if (smear.length < 1 || smear.length > 2) bad(`gole espalhado virou fila: ${smear.length}`);
    if (smear.some(p => p.kind === 'cadence')) bad('um gole curto ganhou botão');

    const walk = simulate([0, 100, 200, 300, 400, 500, 600, 700, 800]);
    const ticks = walk.filter((p): p is CoinPlay & { at: number; kind: 'tick' } => p.kind === 'tick');
    const buttons = walk.filter(p => p.kind === 'cadence');
    lines.push(`caminhada: ${walk.map(p => p.kind === 'tick' ? String(p.step) : 'botão').join('-')}`);
    const phrase = ticks.slice(0, COIN_PHRASE);
    if (phrase.length !== COIN_PHRASE) bad(`a frase não completou: ${phrase.length}`);
    if (phrase[0]?.step !== 0 || phrase[0]?.gear !== 0) bad('a frase não começa no grau 0');
    for (let i = 1; i < phrase.length; i++) {
        if (phrase[i].step !== phrase[i - 1].step + 1) bad('a frase pulou ou voltou antes do botão');
        if (phrase[i].gear !== 0) bad('a primeira frase já subiu de tom');
        if (phrase[i].at - phrase[i - 1].at < COIN_BEAT_MS - 1) bad('dois ataques mais perto que o tempo');
    }
    if (buttons.length !== 1) bad(`a frase não fechou uma vez: ${buttons.length} botões`);
    if (buttons[0] && phrase[phrase.length - 1] && buttons[0].at < phrase[phrase.length - 1].at) bad('o botão veio antes da última nota');
    const againTick = ticks[COIN_PHRASE];
    if (!againTick || againTick.step !== 0 || againTick.gear !== 1) bad(`a frase não recomeçou um tom acima: ${againTick ? `${againTick.step}@${againTick.gear}` : 'nada'}`);
    if (againTick && buttons[0] && againTick.at < buttons[0].at + COIN_CADENCE_MS - 32) bad('a frase seguinte falou por cima do botão');
    const lift = coinFreq(0, 1, 1) / coinFreq(0, 1, 0);
    lines.push(`o tom seguinte é ${lift.toFixed(3)}× o de casa (um tom inteiro)`);
    if (lift < 1.11 || lift > 1.14) bad(`o tom seguinte não é um tom: ${lift.toFixed(3)}`);
    const buttonEnd = CADENCE_NOTES[CADENCE_NOTES.length - 1];
    const buttonSpan = buttonEnd.at + buttonEnd.dur;
    lines.push(`o botão dura ${Math.round(buttonSpan * 1000)} ms`);
    if (buttonSpan < 0.14 || buttonSpan > 0.22) bad(`botão fora da faixa curta: ${buttonSpan.toFixed(3)} s`);
    if (cadenceFreq(2, 0) <= cadenceFreq(0, 0)) bad('o botão não sobe');

    const quiet = simulate([0, 100, 200, 300, 400, 500, 600]);
    const quietButtons = quiet.filter(p => p.kind === 'cadence');
    const quietTicks = quiet.filter(p => p.kind === 'tick');
    if (quietTicks.length !== COIN_PHRASE || quietButtons.length !== 1) bad(`sete notas não fecharam: ${quietTicks.length} notas, ${quietButtons.length} botões`);

    const again = simulate([0, 800]);
    const againTicks = again.filter((p): p is CoinPlay & { at: number; kind: 'tick' } => p.kind === 'tick');
    if (againTicks.length !== 2 || againTicks[1].step !== 0 || againTicks[1].gear !== 0) bad(`a pausa não recomeçou a frase: ${again.map(p => p.kind === 'tick' ? p.step : 'botão').join(',')}`);
    if (again.some(p => p.kind === 'cadence')) bad('duas notas soltas ganharam botão');

    const legacySpan = (n: number) => Math.max(0, n - 1) * 58;
    const legacyTail = (n: number) => Math.max(0, n - 1) * 54 + 72;
    for (const n of [1, 8, 18, 52, 80]) {
        const plan = showerPlan(n, 'vacuum');
        const surge = showerPlan(n, 'surge');
        lines.push(`${n} moedas no vácuo: ${plan.slots} tempos, ${plan.span} ms (antes ${(legacySpan(n))} ms só de espera)`);
        if (plan.span > 700) bad(`vácuo de ${n} passou de 700 ms`);
        if (surge.span > 400) bad(`pulso de ${n} passou de 400 ms`);
        if (n >= 8 && plan.span >= legacySpan(n)) bad(`vácuo de ${n} não ficou mais curto`);
        let prev = -1;
        for (let i = 0; i < n; i++) {
            const slot = plan.slot(i);
            if (slot < prev) bad('os tempos da chuva voltaram');
            if (slot < 0 || slot >= plan.slots) bad('tempo fora da frase');
            prev = slot;
        }
    }
    lines.push(`40 moedas de uma vez: o som novo acaba em ${Math.round(end * 1000)} ms; o antigo seguia por ${legacyTail(40)} ms`);
    if (legacyTail(40) < 2000) bad('o modelo do som antigo não reproduz a fila');
    const dutyNew = end / (COIN_BEAT_MS / 1000);
    const dutyOld = 0.072 / 0.054;
    lines.push(`fração do tempo ocupada pelo som: agora ${Math.round(dutyNew * 100)}%, antes ${Math.round(dutyOld * 100)}% (sobreposição)`);
    if (dutyNew > 0.5) bad('os tilintares ainda se encostam');
    if (dutyOld < 1) bad('o modelo antigo não se sobrepunha');

    return { ok: failures.length === 0, lines, failures };
}

/**
 * Tomar dano. Tem que ser óbvio o bastante para desviar, e ainda assim
 * menor do que matar e diferente de catar moeda.
 *
 * O toque antigo piscava o Vital de branco por 70 ms. O Vital já é branco,
 * então o olho não tinha o que pegar (Theeuwes: o que captura o olhar é uma
 * cor nova no ponto em que a gente já está olhando, não um quase-branco).
 * A cor de ferida segura a janela inteira em que o corpo está a salvo, e
 * acaba quando dá para apanhar de novo. A amassada aponta para quem bateu.
 *
 * O som antigo descia de 236 Hz para 84 Hz. Alto-falante de celular quase
 * não fala aí embaixo, e a moeda mora acima de 880 Hz, por isso o ouvido
 * ficava com o DNA e perdia o golpe. O rasgo agora começa na faixa que o
 * falante toca, cai (contorno de perda) e leva um ruído seco por volta de
 * 2,6 kHz, longe do metal da moeda (Bregman: timbre e direção de tom separam
 * os fluxos). Dura mais que os 42 ms da moeda, para os dois não fundirem.
 *
 * Hicks, Gerling e Dickinson (CHI 2024): suco que iguala os eventos tira a
 * competência. A bomba continua dona do estouro (pico 0.4). O rasgo é áspero
 * e descendente, não um prêmio. O suspiro no fim da janela sobe e é bem mais
 * quieto, para ninguém buscar o dano pelo som (sinal de segurança, Rescorla).
 *
 * O tranco na câmera do toque era de poucos pixels numa tela de 1920: abaixo
 * do que se vê. Subiu o bastante para o corpo acusar de onde veio, e o
 * empurro no Vital passou de 12 para 18 no toque. Mais que isso vira o jogo
 * jogando por você (o tremor no fracasso tira a agência; Royal Society Open
 * Science, 2025). O golpe de verdade ainda trava mais que o toque. O toque
 * trava ~26 ms, o tempo de segurar o branco do impacto (Cao e Liu, GEM 2022).
 */

export type HurtGrade = 0 | 1 | 2;

/** Pico do corpo da moeda, uma só. A pilha sobe pouco por cima disso. */
export const COIN_BODY_PEAK = 0.07;
/** Bomba no dash: ganho interno 0.8 vezes volume 0.5. */
export const BOMB_PEAK = 0.4;

export const HURT_BODY_PEAK = [0.09, 0.12, 0.15] as const;
export const HURT_BODY_S = [0.13, 0.16, 0.2] as const;
export const HURT_FROM = [760, 620, 500] as const;
export const HURT_TO = [380, 280, 190] as const;
export const HURT_RIP_PEAK = [0.06, 0.078, 0.095] as const;
export const HURT_RIP_S = 0.038;
export const HURT_RIP_HZ = 2600;
/** Segundo tom, perto o bastante para bater e não virar acorde. */
export const HURT_ROUGH = 0.94;
export const HURT_ROUGH_GAIN = 0.34;

export const CLEAR_PEAK = 0.024;
export const CLEAR_S = 0.055;
export const CLEAR_FROM = 460;
export const CLEAR_TO = 740;

/** Branco do impacto, segurado pelo hit stop. */
export const HURT_BLOOM = 0.08;

/** Toque, golpe, pesado. Ácido e chefe caem no pesado; encosto comum fica no toque. */
export function hurtGrade(amount: number): HurtGrade {
    if (amount >= 3.6) return 2;
    if (amount >= 1.2) return 1;
    return 0;
}

export function hurtStop(grade: HurtGrade): number {
    return grade === 0 ? 0.026 : grade === 1 ? 0.044 : 0.066;
}

export function hurtShake(grade: HurtGrade): number {
    return grade === 0 ? 8 : grade === 1 ? 13 : 18;
}

export function hurtKick(grade: HurtGrade): number {
    return grade === 0 ? 16 : grade === 1 ? 26 : 36;
}

/** Empurro do corpo. O toque é só um pouco acima dos 12 de antes. */
export function hurtShove(grade: HurtGrade): number {
    return grade === 0 ? 18 : grade === 1 ? 23 : 28;
}

/** Quanto tempo o Vital fica vermelho. Cobre a janela de 0,4 s do encosto. */
export function hurtBruise(grade: HurtGrade): number {
    return grade === 0 ? 0.4 : grade === 1 ? 0.46 : 0.55;
}

export function hurtPunch(grade: HurtGrade): number {
    return grade === 0 ? 0.72 : grade === 1 ? 0.88 : 1;
}

const HURT_ATTACK_S = 0.004;

function bodyEnv(t: number, peak: number, dur: number): number {
    if (t < 0 || t >= dur || peak <= 0) return 0;
    if (t < HURT_ATTACK_S) return peak * (t / HURT_ATTACK_S);
    const u = (t - HURT_ATTACK_S) / (dur - HURT_ATTACK_S);
    return peak * Math.pow(0.001 / peak, u);
}

function env(t: number, peak: number, dur: number): number {
    if (t < 0 || t >= dur || peak <= 0) return 0;
    const u = t / dur;
    return peak * Math.pow(0.001 / peak, u);
}

/** Pico e quanto tempo fica acima de -40 dB. Serve para comparar sem ouvir. */
export function hurtShape(grade: HurtGrade): { peak: number; audible: number } {
    let peak = 0;
    let audible = 0;
    const body = HURT_BODY_S[grade];
    const limit = Math.max(body, HURT_RIP_S);
    for (let i = 0; i <= 240; i++) {
        const t = (i / 240) * limit;
        const a = bodyEnv(t, HURT_BODY_PEAK[grade], body)
            + bodyEnv(t, HURT_BODY_PEAK[grade] * HURT_ROUGH_GAIN, body)
            + env(t, HURT_RIP_PEAK[grade], HURT_RIP_S);
        if (a > peak) peak = a;
        if (a > 0.01) audible = t;
    }
    return { peak, audible };
}

export function checkHurtFeel(): string[] {
    const fail: string[] = [];
    const graze = hurtShape(0);
    const strike = hurtShape(1);
    const heavy = hurtShape(2);
    if (!(graze.peak > 0.12)) fail.push(`toque ${graze.peak.toFixed(3)} ainda é um sussurro`);
    if (!(graze.peak < 0.24)) fail.push(`toque ${graze.peak.toFixed(3)} passou de um rasgo`);
    if (!(heavy.peak < BOMB_PEAK * 0.85)) fail.push(`pesado ${heavy.peak.toFixed(3)} chega na bomba`);
    if (!(graze.peak < strike.peak && strike.peak < heavy.peak)) fail.push('os três graus não sobem');
    if (!(graze.audible > 0.06 && graze.audible < 0.16)) fail.push(`toque dura ${graze.audible.toFixed(3)}`);
    if (!(strike.audible < 0.2 && heavy.audible < 0.24)) {
        fail.push(`dura demais ${strike.audible.toFixed(3)} ${heavy.audible.toFixed(3)}`);
    }
    if (!(HURT_FROM[0] < 880 && HURT_TO[0] >= 340)) fail.push('o toque saiu da faixa que o celular toca');
    if (!(HURT_FROM[0] > HURT_FROM[1] && HURT_FROM[1] > HURT_FROM[2])) fail.push('os graus não descem de tom');
    if (!(HURT_FROM[0] > HURT_TO[0] && HURT_FROM[1] > HURT_TO[1] && HURT_FROM[2] > HURT_TO[2])) {
        fail.push('o rasgo não cai');
    }
    if (HURT_RIP_HZ < 1800 || HURT_RIP_HZ > 4000) fail.push('o ruído do rasgo encostou na moeda ou sumiu');
    if (CLEAR_PEAK >= HURT_BODY_PEAK[0] * 0.4) fail.push('o alívio é alto demais');
    if (!(CLEAR_FROM < CLEAR_TO && CLEAR_FROM > 300)) fail.push('o alívio não sobe na faixa do falante');
    if (!(hurtStop(0) > 0.016 && hurtStop(0) < 0.034 && hurtStop(0) < hurtStop(1) && hurtStop(1) < hurtStop(2))) {
        fail.push('o hit stop do toque não é um instante');
    }
    if (!(hurtStop(2) < 0.08)) fail.push('o hit stop passou de um instante');
    if (!(hurtShake(0) < hurtShake(1) && hurtShake(1) < hurtShake(2) && hurtShake(2) < 22)) {
        fail.push('o tremor do dano compete com a bomba');
    }
    if (!(hurtShove(0) > 12 && hurtShove(0) < hurtShove(1) && hurtShove(2) < 34)) {
        fail.push('o empurro deixou de ser um pouco mais');
    }
    if (!(hurtBruise(0) >= 0.36 && hurtBruise(0) <= 0.44 && hurtBruise(0) < hurtBruise(2))) {
        fail.push('o vermelho não cobre a janela do encosto');
    }
    if (hurtGrade(0.6) !== 0 || hurtGrade(2.5) !== 1 || hurtGrade(3.6) !== 2) fail.push('os cortes de dano mudaram');
    return fail;
}

export function scheduleHurt(
    ctx: BaseAudioContext,
    dest: AudioNode,
    time: number,
    grade: HurtGrade,
) {
    const dur = HURT_BODY_S[grade];
    const body = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    body.type = 'triangle';
    body.frequency.setValueAtTime(HURT_FROM[grade], time);
    body.frequency.exponentialRampToValueAtTime(HURT_TO[grade], time + dur);
    bodyGain.gain.setValueAtTime(0.0008, time);
    bodyGain.gain.exponentialRampToValueAtTime(HURT_BODY_PEAK[grade], time + HURT_ATTACK_S);
    bodyGain.gain.exponentialRampToValueAtTime(0.0008, time + dur);
    body.connect(bodyGain);
    bodyGain.connect(dest);
    body.start(time);
    body.stop(time + dur + 0.02);

    const rough = ctx.createOscillator();
    const roughGain = ctx.createGain();
    rough.type = 'sine';
    rough.frequency.setValueAtTime(HURT_FROM[grade] * HURT_ROUGH, time);
    rough.frequency.exponentialRampToValueAtTime(Math.max(40, HURT_TO[grade] * HURT_ROUGH), time + dur);
    const roughPeak = HURT_BODY_PEAK[grade] * HURT_ROUGH_GAIN;
    roughGain.gain.setValueAtTime(0.0008, time);
    roughGain.gain.exponentialRampToValueAtTime(roughPeak, time + HURT_ATTACK_S);
    roughGain.gain.exponentialRampToValueAtTime(0.0008, time + dur);
    rough.connect(roughGain);
    roughGain.connect(dest);
    rough.start(time);
    rough.stop(time + dur + 0.02);

    const n = Math.max(1, Math.floor(ctx.sampleRate * HURT_RIP_S));
    const buffer = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < n; i++) {
        const u = 1 - i / n;
        data[i] = (Math.random() * 2 - 1) * u;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const rip = ctx.createBiquadFilter();
    rip.type = 'bandpass';
    rip.frequency.value = HURT_RIP_HZ;
    rip.Q.value = 1.35;
    const ripGain = ctx.createGain();
    ripGain.gain.setValueAtTime(HURT_RIP_PEAK[grade], time);
    ripGain.gain.exponentialRampToValueAtTime(0.0008, time + HURT_RIP_S);
    noise.connect(rip);
    rip.connect(ripGain);
    ripGain.connect(dest);
    noise.start(time);
    noise.stop(time + HURT_RIP_S + 0.01);
}

export function scheduleHurtClear(ctx: BaseAudioContext, dest: AudioNode, time: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(CLEAR_FROM, time);
    osc.frequency.exponentialRampToValueAtTime(CLEAR_TO, time + CLEAR_S);
    gain.gain.setValueAtTime(CLEAR_PEAK, time);
    gain.gain.exponentialRampToValueAtTime(0.0008, time + CLEAR_S);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + CLEAR_S + 0.02);
}

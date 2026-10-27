/**
 * Tomar dano. Tem que ser legível e menor do que matar e do que catar moeda.
 *
 * Hicks, Gerling e Dickinson (CHI 2024) mediram suco demais: a amplificação
 * que achata a diferença entre os eventos reduz a competência. O tremor forte,
 * no trabalho da Royal Society Open Science (2025) sobre senso de agência,
 * aumenta a euforia quando o tremor é o SEU acerto. No fracasso, o mesmo
 * tremor tende a tirar a agência. Por isso a bomba continua dona do estouro
 * (pico ~0.4, meio segundo) e a moeda dona do agudo (corpo 0.07). O dano fica
 * grave, curto, e com um clique de poucos milissegundos para o ouvido separar
 * do tom da moeda (Bregman: ruído e tom não viram o mesmo fluxo).
 *
 * O impacto que o jogador sente, no levantamento de Cao e Liu (GEM 2022),
 * depende de hit stop, som no mesmo instante e câmera que não chacoalha à toa.
 * O toque comum não trava o jogo: a gente toma dano o tempo todo, e um congelamento
 * a cada encosto vira lag. O golpe de verdade trava ~40 ms, o pesado ~64 ms.
 *
 * Repetir o mesmo baque habitua (Grizzard e outros, 2015). O toque leve é um
 * tique; o golpe é outro som. Quando o golpe acaba, um sopro quase mudo marca
 * a saída. Esse alívio, e não o tapa, é o que segura a fuga (sinal de segurança,
 * Rescorla; os dois fatores de Mowrer). Ele é mais quieto que o próprio toque,
 * para ninguém buscar o dano só pelo som.
 */

export type HurtGrade = 0 | 1 | 2;

/** Pico do corpo da moeda, uma só. A pilha sobe pouco por cima disso. */
export const COIN_BODY_PEAK = 0.07;
/** Bomba no dash: ganho interno 0.8 vezes volume 0.5. */
export const BOMB_PEAK = 0.4;

export const HURT_BODY_PEAK = [0.046, 0.068, 0.09] as const;
export const HURT_BODY_S = [0.028, 0.046, 0.06] as const;
export const HURT_CLICK_PEAK = [0.028, 0.04, 0.046] as const;
export const HURT_CLICK_S = 0.0048;
export const HURT_FROM = [236, 174, 132] as const;
export const HURT_TO = [84, 64, 48] as const;
export const CLEAR_PEAK = 0.015;
export const CLEAR_S = 0.018;
export const CLEAR_FROM = 420;
export const CLEAR_TO = 690;

/** Toque, golpe, pesado. Ácido e chefe caem no pesado; encosto comum fica no toque. */
export function hurtGrade(amount: number): HurtGrade {
    if (amount >= 3.6) return 2;
    if (amount >= 1.2) return 1;
    return 0;
}

export function hurtStop(grade: HurtGrade): number {
    return grade === 0 ? 0 : grade === 1 ? 0.042 : 0.064;
}

export function hurtShake(grade: HurtGrade): number {
    return grade === 0 ? 2.2 : grade === 1 ? 4.5 : 6.5;
}

export function hurtKick(grade: HurtGrade): number {
    return grade === 0 ? 5 : grade === 1 ? 9 : 12;
}

export function hurtPunch(grade: HurtGrade): number {
    return grade === 0 ? 0.4 : grade === 1 ? 0.68 : 0.88;
}

const HURT_ATTACK_S = 0.003;

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
    const limit = Math.max(body, HURT_CLICK_S);
    for (let i = 0; i <= 200; i++) {
        const t = (i / 200) * limit;
        const a = bodyEnv(t, HURT_BODY_PEAK[grade], body) + env(t, HURT_CLICK_PEAK[grade], HURT_CLICK_S);
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
    if (!(graze.peak < COIN_BODY_PEAK)) fail.push(`toque ${graze.peak.toFixed(3)} não fica abaixo da moeda`);
    if (!(strike.peak < COIN_BODY_PEAK * 1.35)) fail.push(`golpe ${strike.peak.toFixed(3)} passa da moeda`);
    if (!(heavy.peak < BOMB_PEAK * 0.35)) fail.push(`pesado ${heavy.peak.toFixed(3)} chega perto da bomba`);
    if (!(graze.peak < strike.peak && strike.peak < heavy.peak)) fail.push('os três graus não sobem');
    if (!(graze.audible < 0.04 && strike.audible < 0.06 && heavy.audible < 0.075)) {
        fail.push(`dura demais ${graze.audible.toFixed(3)} ${strike.audible.toFixed(3)} ${heavy.audible.toFixed(3)}`);
    }
    if (CLEAR_PEAK >= HURT_BODY_PEAK[0]) fail.push('o alívio é tão alto quanto o toque');
    if (hurtStop(0) !== 0) fail.push('o toque comum trava o jogo');
    if (!(hurtStop(1) < 0.05 && hurtStop(2) < 0.08)) fail.push('o hit stop passou de um instante');
    if (!(hurtShake(2) < 12)) fail.push('o tremor do dano compete com a bomba');
    if (hurtGrade(0.6) !== 0 || hurtGrade(2.5) !== 1 || hurtGrade(3.6) !== 2) fail.push('os cortes de dano mudaram');
    return fail;
}

export function scheduleHurt(
    ctx: BaseAudioContext,
    dest: AudioNode,
    time: number,
    grade: HurtGrade,
) {
    const body = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    body.type = 'sine';
    body.frequency.setValueAtTime(HURT_FROM[grade], time);
    body.frequency.exponentialRampToValueAtTime(HURT_TO[grade], time + HURT_BODY_S[grade]);
    bodyGain.gain.setValueAtTime(0.0008, time);
    bodyGain.gain.exponentialRampToValueAtTime(HURT_BODY_PEAK[grade], time + HURT_ATTACK_S);
    bodyGain.gain.exponentialRampToValueAtTime(0.0008, time + HURT_BODY_S[grade]);
    body.connect(bodyGain);
    bodyGain.connect(dest);
    body.start(time);
    body.stop(time + HURT_BODY_S[grade] + 0.02);

    const n = Math.max(1, Math.floor(ctx.sampleRate * HURT_CLICK_S));
    const buffer = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const click = ctx.createBiquadFilter();
    click.type = 'highpass';
    click.frequency.value = 1800;
    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(HURT_CLICK_PEAK[grade], time);
    clickGain.gain.exponentialRampToValueAtTime(0.0008, time + HURT_CLICK_S);
    noise.connect(click);
    click.connect(clickGain);
    clickGain.connect(dest);
    noise.start(time);
    noise.stop(time + HURT_CLICK_S + 0.01);
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

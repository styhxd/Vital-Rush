import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Language, OrganId } from '../types';
import { hopLine, organPlainName } from '../services/casebook';
import { bossFor, type BossSpec } from '../services/bosses';
import { ATLAS_INK, paintAtlas, paintBoss } from '../services/atlasStage';
import { bodyNote, closeLabel, crossingTitle, sheetKicker, tapHint } from '../services/atlas';
import { Dossier } from './Dossier';

type Kind =
    | 'vital' | 'bacteria' | 'virus' | 'fungi' | 'parasite' | 'boss'
    | 'plaque' | 'saliva' | 'bite' | 'enamel'
    | 'bile' | 'filter' | 'heal'
    | 'beat' | 'ecg' | 'clot'
    | 'gust' | 'cough' | 'oxygen'
    | 'synapse' | 'focus'
    | 'dash' | 'surge';

type Card = { kind: Kind; title: string; body: string };
type Section = { title: string; cards: Card[] };

const COPY: Record<Language, Section[]> = {
    PT: [
        {
            title: 'QUEM CORRE NO SANGUE',
            cards: [
                { kind: 'vital', title: 'VITAL', body: 'Célula de defesa que atira anticorpos sozinha em quem chega perto. Você só guia o caminho, escapa do aperto e solta o pulso.' },
                { kind: 'bacteria', title: 'BACTÉRIA', body: 'Vem na enxurrada, mas não chega toda pelo mesmo corredor: umas fecham por cima, outras por baixo, e uma escapa para as suas costas. Não dá tiro: o perigo todo é deixar encostar.' },
                { kind: 'virus', title: 'VÍRUS', body: 'Quase não sai do lugar e aguenta tiro sem recuar. Cada um segura uma altura da tela e, de tempos em tempos, cospe um espinho que dobra para onde você está indo.' },
                { kind: 'fungi', title: 'FUNGO', body: 'Magro, apressado e de vida curta. O zigue-zague continua, só que uns cruzam por cima, outros por baixo, e tem um que busca as suas costas antes de raspar.' },
                { kind: 'parasite', title: 'PARASITA', body: 'Pesado, lento e duro na queda. Quase não recua com o tiro: corta o passo que você ia dar e tampa uma saída, enquanto o resto da sala ganha terreno.' },
                { kind: 'boss', title: 'CHEFE', body: 'O dono da passagem quando um órgão termina e outro começa. São vinte viagens possíveis, e os cartões lá embaixo entregam o truque de cada um.' },
            ],
        },
        {
            title: 'MOLAR',
            cards: [
                { kind: 'plaque', title: 'PLACA', body: 'Mancha grudenta largada no chão do dente. Não atira em ninguém, mas pisar ali prende o seu passo e vai queimando a vida aos poucos.' },
                { kind: 'saliva', title: 'SALIVA', body: 'Fita d\'água que varre a tela, apaga a placa do chão e dá carona. Enquanto você escorrega nela, qualquer pancada que entra dói menos.' },
                { kind: 'bite', title: 'MORDIDA', body: 'A faixa avisa onde os dentes vão bater. Quando as duas paredes se encontram no estalo, quem não tirou o corpo do meio acaba esmagado.' },
                { kind: 'enamel', title: 'ESMALTE', body: 'Gota mineral que veste você numa casca dura. Por alguns segundos, todo golpe que entra perde metade da força até a película gastar.' },
            ],
        },
        {
            title: 'FÍGADO',
            cards: [
                { kind: 'bile', title: 'BILE', body: 'Poça amarga parada no chão do fígado. Não corre atrás de você, mas derrete a vida de quem fica lá dentro. Pisou fora, a queimação para.' },
                { kind: 'filter', title: 'KUPFFER', body: 'Um anel acende no fígado e suga tudo o que está solto para o miolo: inimigos, moedas de DNA e você. Cair espremido no centro machuca.' },
                { kind: 'heal', title: 'AÇÚCAR', body: 'Gota dourada de combustível puro. Não enche a vida num estalo, mas vai recuperando o seu fôlego aos poucos durante alguns segundos.' },
            ],
        },
        {
            title: 'CORAÇÃO',
            cards: [
                { kind: 'beat', title: 'SÍSTOLE', body: 'A batida que dita o ritmo da sala. Cada aperto do músculo dá um empurrão curto na sua velocidade e joga para a frente o que está solto.' },
                { kind: 'ecg', title: 'ELETRO', body: 'Onda elétrica que risca a tela. Encostar na linha dá choque, e qualquer inimigo coberto por ela devolve o seu próprio tiro contra você.' },
                { kind: 'clot', title: 'COÁGULO', body: 'Nasce parado e vai encorpando no lugar até desgrudar de vez. Enquanto incha dá para sair da frente; depois que desce, o tranco é bruto.' },
            ],
        },
        {
            title: 'PULMÃO',
            cards: [
                { kind: 'gust', title: 'LUFADA', body: 'Corrente de ar que sopra numa faixa marcada por fios de vento. Não tira vida de ninguém, mas teimar contra o sopro joga você fora do lugar.' },
                { kind: 'cough', title: 'TOSSE', body: 'A faixa avisa, junta pressão e estoura num sopro violento. Varre os inimigos da reta, mas arranca um pedaço grande da vida de quem ficou.' },
                { kind: 'oxygen', title: 'OXIGÊNIO', body: 'Molécula fresca saída do alvéolo. Não aumenta a força de cada anticorpo, mas dobra a velocidade dos seus disparos durante alguns segundos.' },
            ],
        },
        {
            title: 'CÉREBRO',
            cards: [
                { kind: 'synapse', title: 'SINAPSE', body: 'Raio curto que liga dois pontos e frita quem estiver na reta, seja você ou inimigo. Quando o clarão vem branco, estoura na tela inteira.' },
                { kind: 'focus', title: 'FOCO', body: 'Gota violeta que afia a pontaria no córtex. O tiro comum não muda, mas por alguns segundos os acertos críticos saem muito mais vezes.' },
            ],
        },
        {
            title: 'NO SEU COMANDO',
            cards: [
                { kind: 'dash', title: 'DESVIO', body: 'Arrancada de um piscar na direção em que você já está indo. Durante o salto nenhum dano entra, e o espinho inimigo atravessa o corpo sem estourar. Depois o corpo pede um instante de fôlego.' },
                { kind: 'surge', title: 'PULSO', body: 'Onda que gasta a barra cheia para abrir espaço no aperto. Empurra ou trava os bichos por perto e puxa as moedas de DNA soltas para a sua mão.' },
            ],
        },
    ],
    EN: [
        {
            title: 'LOOSE IN THE BLOOD',
            cards: [
                { kind: 'vital', title: 'VITAL', body: 'A defense cell that fires antibodies on its own at the nearest threat. You just steer the path, slip out of trouble, and trigger the pulse.' },
                { kind: 'bacteria', title: 'BACTERIA', body: 'It still rides the current, but the colony no longer arrives in one line. Some pinch from above, some from below, one slips to your back, and none of them shoot: the danger is the touch.' },
                { kind: 'virus', title: 'VIRUS', body: 'Barely moves and takes hits without flinching. Each one holds a different height and, every few seconds, spits a spike that bends toward where you are going.' },
                { kind: 'fungi', title: 'FUNGUS', body: 'Lean, fragile, and still cutting a sharp zigzag. Some cross high, some cross low, and one tries your back before the graze.' },
                { kind: 'parasite', title: 'PARASITE', body: 'Heavy, slow, and barely shoved by gunfire. It steps into the move you were about to make and seals an exit, while the rest of the room closes in.' },
                { kind: 'boss', title: 'BOSS', body: 'The gatekeeper waiting where one organ ends and the next begins. There are twenty crossings in all, and the cards below reveal every one.' },
            ],
        },
        {
            title: 'MOLAR',
            cards: [
                { kind: 'plaque', title: 'PLAQUE', body: 'A sticky patch left across the floor of the tooth. It never shoots, but stepping in it drags your pace down and burns health bit by bit.' },
                { kind: 'saliva', title: 'SALIVA', body: 'A flowing ribbon that sweeps the floor clean of plaque and gives you a ride. While you glide in its stream, incoming hits hurt less.' },
                { kind: 'bite', title: 'BITE', body: 'A warning lane marks where the jaws are about to clamp. When the two walls slam together, anything still caught in the middle gets crushed.' },
                { kind: 'enamel', title: 'ENAMEL', body: 'A mineral drop that coats you in a hard shell. For a few seconds, every hit you take lands at half strength until the film wears off.' },
            ],
        },
        {
            title: 'LIVER',
            cards: [
                { kind: 'bile', title: 'BILE', body: 'A bitter puddle sitting on the liver floor. It never chases you, but it steadily burns anyone standing in it. Step out and the sting stops.' },
                { kind: 'filter', title: 'KUPFFER', body: 'A ring lights up in the liver and drags everything loose toward the center: enemies, DNA coins, and you. Getting crushed in the middle hurts.' },
                { kind: 'heal', title: 'SUGAR', body: 'A golden drop of pure cellular fuel. It does not top off your health all at once, instead restoring it bit by bit over a few seconds.' },
            ],
        },
        {
            title: 'HEART',
            cards: [
                { kind: 'beat', title: 'SYSTOLE', body: 'The heartbeat that sets the tempo of the room. Every squeeze gives your speed a quick jolt and shoves everything loose along the current.' },
                { kind: 'ecg', title: 'ECG', body: 'An electrical wave tracing across the lane. Touching the line shocks you, and any enemy under it bounces your own shots back in green.' },
                { kind: 'clot', title: 'CLOT', body: 'Starts still and swells in place until it breaks loose. While it grows you can step aside; once it drops down the lane, the hit is heavy.' },
            ],
        },
        {
            title: 'LUNG',
            cards: [
                { kind: 'gust', title: 'GUST', body: 'A rush of air blowing down a lane marked by wind lines. It deals no damage at all, but fighting the draft pushes you right out of position.' },
                { kind: 'cough', title: 'COUGH', body: 'The lane warns, builds pressure, and blasts out in a violent gust. It sweeps enemies away, but rips a huge chunk of health if you stay inside.' },
                { kind: 'oxygen', title: 'OXYGEN', body: 'A fresh molecule straight from the alveoli. It does not boost the power of each shot, but it doubles your firing speed for a few seconds.' },
            ],
        },
        {
            title: 'BRAIN',
            cards: [
                { kind: 'synapse', title: 'SYNAPSE', body: 'A quick bolt linking two points that zaps anyone on the line, friend or foe. When the flash turns white, it blasts the entire screen at once.' },
                { kind: 'focus', title: 'FOCUS', body: 'A violet drop that sharpens targeting in the cortex. Normal shots stay the same, but critical hits land far more often for a few seconds.' },
            ],
        },
        {
            title: 'AT YOUR COMMAND',
            cards: [
                { kind: 'dash', title: 'DASH', body: 'A split-second burst in the direction you are already moving. No damage can touch you mid-dash, and an enemy spike passes straight through. It takes a moment to recharge after.' },
                { kind: 'surge', title: 'PULSE', body: 'A wave that spends a full bar to clear breathing room. It shoves or stuns nearby threats and pulls loose DNA coins straight to your hand.' },
            ],
        },
    ],
    ES: [
        {
            title: 'SUELTOS EN LA SANGRE',
            cards: [
                { kind: 'vital', title: 'VITAL', body: 'Una célula de defensa que dispara anticuerpos sola al que tenga más cerca. Tú solo guías el paso, esquivas el peligro y sueltas el pulso.' },
                { kind: 'bacteria', title: 'BACTERIA', body: 'Baja con la corriente, pero ya no llega toda por el mismo pasillo: unas cierran por arriba, otras por abajo y una se cuela a tu espalda. Nunca dispara: todo el peligro está en dejar que te toque.' },
                { kind: 'virus', title: 'VIRUS', body: 'Casi no se mueve y aguanta disparos sin retroceder. Cada uno guarda una altura y, cada pocos segundos, escupe una espina que dobla hacia donde vas.' },
                { kind: 'fungi', title: 'HONGO', body: 'Frágil, ligero y con el mismo zigzag. Unos cruzan por arriba, otros por abajo, y hay uno que busca tu espalda antes de pasarte raspando.' },
                { kind: 'parasite', title: 'PARÁSITO', body: 'Pesado, lento y casi no retrocede con los tiros. Te corta el paso que ibas a dar y tapa una salida, mientras el resto de la sala te gana terreno.' },
                { kind: 'boss', title: 'JEFE', body: 'El dueño del paso donde termina un órgano y empieza el siguiente. Hay veinte viajes posibles, y las fichas de abajo revelan a cada uno.' },
            ],
        },
        {
            title: 'MOLAR',
            cards: [
                { kind: 'plaque', title: 'PLACA', body: 'Mancha pegajosa tirada en el suelo del diente. No dispara, pero pisarla vuelve pesado tu paso y te va quemando la vida poco a poco.' },
                { kind: 'saliva', title: 'SALIVA', body: 'Cinta de agua que barre la placa del suelo y te lleva en su corriente. Mientras viajas encima de ella, los golpes que entran duelen menos.' },
                { kind: 'bite', title: 'MORDIDA', body: 'La franja avisa dónde van a chocar los dientes. Cuando las dos paredes se juntan de golpe, el que no salió del medio termina aplastado.' },
                { kind: 'enamel', title: 'ESMALTE', body: 'Gota mineral que te recubre con una capa dura. Por unos segundos, todo golpe que recibas llega con la mitad de fuerza hasta que se gasta.' },
            ],
        },
        {
            title: 'HÍGADO',
            cards: [
                { kind: 'bile', title: 'BILIS', body: 'Charco amargo quieto en el piso del hígado. No te persigue, pero quema de a poco a quien se queda adentro. Si sales, el ardor se corta.' },
                { kind: 'filter', title: 'KUPFFER', body: 'Un anillo se enciende en el hígado y arrastra todo lo suelto hacia el centro: enemigos, monedas de DNA y a ti. Caer apretado al medio lastima.' },
                { kind: 'heal', title: 'AZÚCAR', body: 'Gota dorada de combustible puro. No te llena la vida de golpe, sino que la va recuperando de a poco a lo largo de unos segundos.' },
            ],
        },
        {
            title: 'CORAZÓN',
            cards: [
                { kind: 'beat', title: 'SÍSTOLE', body: 'El latido que marca el compás de la sala. Cada apretón del músculo te da un empujón corto de velocidad y mueve todo lo que esté suelto.' },
                { kind: 'ecg', title: 'ELECTRO', body: 'Onda eléctrica que cruza la franja. Tocar la línea da descarga, y cualquier enemigo cubierto por ella te devuelve tu propio disparo.' },
                { kind: 'clot', title: 'COÁGULO', body: 'Nace quieto y va creciendo en el sitio hasta que se suelta. Mientras se hincha puedes correrte; cuando baja de golpe, el choque es pesado.' },
            ],
        },
        {
            title: 'PULMÓN',
            cards: [
                { kind: 'gust', title: 'RÁFAGA', body: 'Corriente de aire que sopla en una franja marcada por hilos de viento. No quita vida, pero pelear contra el soplo te saca de tu posición.' },
                { kind: 'cough', title: 'TOS', body: 'La franja avisa, junta presión y estalla de golpe. Barre a los enemigos de la línea, pero te arranca mucha vida si no saliste a tiempo.' },
                { kind: 'oxygen', title: 'OXÍGENO', body: 'Molécula fresca recién salida del alvéolo. No sube el daño de cada anticuerpo, pero duplica tu velocidad de disparo por unos segundos.' },
            ],
        },
        {
            title: 'CEREBRO',
            cards: [
                { kind: 'synapse', title: 'SINAPSIS', body: 'Rayo veloz que une dos puntos y quema al que esté en la línea, seas tú o un enemigo. Cuando el destello es blanco, estalla en toda la pantalla.' },
                { kind: 'focus', title: 'FOCO', body: 'Gota violeta que afila la puntería en la corteza. El tiro común sigue igual, pero por unos segundos los golpes críticos salen mucho más seguido.' },
            ],
        },
        {
            title: 'BAJO TU MANDO',
            cards: [
                { kind: 'dash', title: 'ESQUIVE', body: 'Arranque de un parpadeo hacia donde ya te estás moviendo. Durante el salto ningún daño te entra, y el tiro enemigo te atraviesa sin estallar. Después necesita un respiro para cargar.' },
                { kind: 'surge', title: 'PULSO', body: 'Onda que gasta la barra llena para abrir espacio en el aprieto. Empuja o frena a los enemigos cercanos y atrae las monedas de DNA hacia ti.' },
            ],
        },
    ],
};

type GuideStage = {
    ctx: CanvasRenderingContext2D;
    dpr: number;
    w: number;
    h: number;
    visible: boolean;
    draw: (ctx: CanvasRenderingContext2D, time: number, w: number, h: number) => void;
};

const guideStages = new Set<GuideStage>();
let guideFrame = 0;

function paintGuide(now: number) {
    if (guideStages.size === 0) {
        guideFrame = 0;
        return;
    }
    if (!document.hidden) {
        for (const stage of guideStages) {
            if (!stage.visible) continue;
            stage.ctx.setTransform(stage.dpr, 0, 0, stage.dpr, 0, 0);
            stage.draw(stage.ctx, now, stage.w, stage.h);
        }
    }
    guideFrame = requestAnimationFrame(paintGuide);
}

function wakeGuide() {
    if (guideFrame || guideStages.size === 0) return;
    guideFrame = requestAnimationFrame(paintGuide);
}

function LiveCanvas({
    width,
    height,
    className,
    draw,
}: {
    width: number;
    height: number;
    className: string;
    draw: (ctx: CanvasRenderingContext2D, time: number, w: number, h: number) => void;
}) {
    const ref = useRef<HTMLCanvasElement>(null);
    const drawRef = useRef(draw);
    drawRef.current = draw;
    useEffect(() => {
        const canvas = ref.current;
        if (!canvas) return;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const stage: GuideStage = {
            ctx,
            dpr,
            w: width,
            h: height,
            visible: false,
            draw: (c, time, w, h) => drawRef.current(c, time, w, h),
        };
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        stage.draw(ctx, performance.now(), width, height);
        guideStages.add(stage);
        const watch = new IntersectionObserver((entries) => {
            stage.visible = entries.some((entry) => entry.isIntersecting);
        }, { rootMargin: '160px' });
        watch.observe(canvas);
        wakeGuide();
        return () => {
            watch.disconnect();
            guideStages.delete(stage);
        };
    }, [width, height]);
    return <canvas ref={ref} width={width} height={height} className={className} aria-hidden />;
}

const Sprite: React.FC<{ kind: Kind }> = ({ kind }) => (
    <LiveCanvas
        width={168}
        height={96}
        className="guide-stage"
        draw={(ctx, time, w, h) => paintAtlas(ctx, kind, time, w, h)}
    />
);

const ORGANS: OrganId[] = ['molar', 'liver', 'heart', 'lung', 'brain'];
const INK: Record<OrganId, string> = {
    molar: '#d5e2ee',
    liver: '#d6e36a',
    heart: '#ff5a6a',
    lung: '#f3c3ce',
    brain: '#c9a6ff',
};

type Sheet = { title: string; line: string; bio: string; swatch?: [string, string] };

const styles = `
.guide-hint {
    margin: 0 0 0.65rem;
    color: #e2b060;
    font-size: 12px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
}
.guide-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.45rem;
}
.guide-card {
    display: grid;
    grid-template-columns: 168px minmax(0, 1fr);
    gap: 0.7rem;
    align-items: center;
    width: 100%;
    padding: 6px 8px 6px 6px;
    text-align: left;
    color: inherit;
    font: inherit;
    background: linear-gradient(165deg, rgba(255, 246, 226, 0.07), rgba(255, 244, 220, 0.025) 46%);
    border: 1px solid rgba(226, 176, 96, 0.28);
    border-radius: 12px;
    overflow: hidden;
    min-height: 108px;
    cursor: pointer;
    box-shadow: inset 0 1px 0 rgba(255, 232, 190, 0.07);
}
.guide-card:hover,
.guide-card:focus-visible {
    border-color: rgba(255, 216, 120, 0.75);
    background: linear-gradient(165deg, rgba(255, 246, 226, 0.11), rgba(255, 244, 220, 0.04) 46%);
    outline: none;
}
.guide-card:hover .guide-stage,
.guide-card:focus-visible .guide-stage,
.guide-card:hover .guide-boss,
.guide-card:focus-visible .guide-boss {
    box-shadow:
        inset 0 0 0 1px color-mix(in srgb, var(--ink, #ffd878) 78%, white),
        inset 0 0 18px color-mix(in srgb, var(--ink, #ffd878) 24%, transparent);
}
.guide-card.is-hop { grid-template-columns: 104px minmax(0, 1fr); min-height: 90px; }
.guide-boss,
.guide-stage {
    display: block;
    border-radius: 8px;
    background: #14080c;
    box-shadow:
        inset 0 0 0 1px color-mix(in srgb, var(--ink, #e2b060) 46%, transparent),
        inset 0 0 16px rgba(0, 0, 0, 0.35);
}
.guide-boss { width: 104px; height: 78px; }
.guide-stage { width: 168px; height: 96px; }
.guide-hop {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 92px;
    height: 72px;
    padding: 0 14px;
}
.guide-hop i {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    box-shadow: 0 0 0 2px rgba(0,0,0,0.35);
}
.guide-copy { padding: 0.15rem 0.2rem 0.15rem 0; }
.guide-copy h3 {
    margin: 0 0 0.15rem;
    font-family: 'Teko', sans-serif;
    font-size: clamp(16px, 1.3vw, 22px);
    font-weight: 600;
    letter-spacing: 0.05em;
    line-height: 1;
    color: #ffe7b0;
}
.guide-copy p {
    margin: 0;
    color: #e7dcc8;
    font-size: clamp(11px, 1.02vw, 14px);
    line-height: 1.3;
}
.guide-section { margin-bottom: 0.85rem; }
.guide-sheet {
    position: fixed;
    inset: 0;
    z-index: 400;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4vh 5vw;
    background: rgba(6, 0, 2, 0.78);
}
.guide-sheet article {
    width: min(640px, 100%);
    max-height: min(78vh, 520px);
    overflow: auto;
    padding: 1rem 1.2rem 0.95rem;
    border-radius: 16px;
    border: 1px solid rgba(226, 176, 96, 0.55);
    border-left: 4px solid #e2a01f;
    background:
        radial-gradient(ellipse at 0% 0%, rgba(160, 32, 44, 0.38), transparent 52%),
        linear-gradient(180deg, #2c1416, #120608);
    box-shadow: 0 16px 0 rgba(0,0,0,0.4);
    color: #f6f1e6;
    font-family: 'Chakra Petch', sans-serif;
}
.guide-sheet .kicker {
    color: #e2b060;
    letter-spacing: 0.2em;
    font-size: 11px;
    font-weight: 700;
}
.guide-swatch {
    display: block;
    height: 4px;
    margin: 0.45rem 0 0.15rem;
    border-radius: 4px;
}
.guide-sheet h3 {
    margin: 0.15rem 0 0.4rem;
    font-family: 'Teko', sans-serif;
    font-size: clamp(28px, 3vw, 42px);
    font-weight: 600;
    letter-spacing: 0.04em;
    line-height: 0.95;
    color: #fff6e4;
}
.guide-sheet .line {
    margin: 0 0 0.65rem;
    color: #ffd98a;
    font-size: 14px;
    line-height: 1.35;
}
.guide-sheet .bio {
    margin: 0;
    font-size: 15px;
    line-height: 1.5;
    color: #f3eadc;
}
.guide-sheet button {
    margin-top: 0.85rem;
    padding: 0.28rem 1.2rem 0.16rem;
    background: linear-gradient(#3a3228, #1a140e);
    border: 1px solid rgba(226, 176, 96, 0.55);
    border-radius: 6px;
    color: #f7f4ee;
    letter-spacing: 0.18em;
    font-family: 'Teko', sans-serif;
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
}
.guide-sheet button:hover { color: #ffe08a; }
@media (max-width: 720px) {
    .guide-grid { grid-template-columns: 1fr; }
    .guide-card { grid-template-columns: 132px minmax(0, 1fr); }
    .guide-stage { width: 132px; height: 75px; }
}
`;

function BossMark({ spec }: { spec: BossSpec }) {
    return (
        <LiveCanvas
            width={104}
            height={78}
            className="guide-boss"
            draw={(ctx, time, w, h) => paintBoss(ctx, spec, time, w, h)}
        />
    );
}

function loud(name: string, lang: Language): string {
    const locale = lang === 'PT' ? 'pt' : lang === 'ES' ? 'es' : 'en';
    return name.toLocaleUpperCase(locale);
}

export const FieldGuide: React.FC<{
    language: Language;
    title: string;
    backLabel: string;
    onBack: () => void;
}> = ({ language, title, backLabel, onBack }) => {
    const sections = COPY[language] || COPY.EN;
    const [open, setOpen] = useState<Sheet | null>(null);

    useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(null);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    const sheet = open && createPortal(
        <div className="guide-sheet" onClick={() => setOpen(null)}>
            <article onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
                <div className="kicker">{sheetKicker(language)}</div>
                {open.swatch && (
                    <i className="guide-swatch" style={{ background: `linear-gradient(90deg, ${open.swatch[0]}, ${open.swatch[1]})` }} />
                )}
                <h3>{open.title}</h3>
                <p className="line">{open.line}</p>
                <p className="bio">{open.bio}</p>
                <button type="button" onClick={() => setOpen(null)}>{closeLabel(language)}</button>
            </article>
        </div>,
        document.body,
    );

    return (
        <Dossier title={title} meta="ATLAS" onBack={onBack} backLabel={backLabel} wide>
            <style>{styles}</style>
            <p className="guide-hint">{tapHint(language)}</p>
            {sections.map(section => (
                <section key={section.title} className="guide-section">
                    <h4 className="dossier-kicker">{section.title}</h4>
                    <div className="guide-grid">
                        {section.cards.map(card => (
                            <button
                                key={card.kind}
                                type="button"
                                className="guide-card"
                                style={{ ['--ink' as string]: ATLAS_INK[card.kind] }}
                                onClick={() => setOpen({
                                    title: card.title,
                                    line: card.body,
                                    bio: bodyNote(card.kind, language) || card.body,
                                })}
                            >
                                <Sprite kind={card.kind} />
                                <div className="guide-copy">
                                    <h3>{card.title}</h3>
                                    <p>{card.body}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>
            ))}
            <section className="guide-section">
                <h4 className="dossier-kicker">{crossingTitle(language)}</h4>
                <div className="guide-grid">
                    {ORGANS.flatMap((from) => ORGANS.filter((to) => to !== from).map((to) => {
                        const spec = bossFor(from, to);
                        const route = `${loud(organPlainName(from, language), language)} → ${loud(organPlainName(to, language), language)}`;
                        const line = hopLine(from, to, language);
                        return (
                            <button
                                key={`${from}>${to}`}
                                type="button"
                                className="guide-card is-hop"
                                style={{ ['--ink' as string]: spec.color }}
                                onClick={() => setOpen({
                                    title: spec.short[language],
                                    line: `${spec.disease[language]}. ${route}. ${line}`,
                                    bio: `${spec.lesson[language]} ${spec.trick[language]}`,
                                    swatch: [spec.color, spec.accent],
                                })}
                            >
                                <BossMark spec={spec} />
                                <div className="guide-copy">
                                    <h3>{spec.short[language]}</h3>
                                    <p>{spec.disease[language]}</p>
                                </div>
                            </button>
                        );
                    }))}
                </div>
            </section>
            {sheet}
        </Dossier>
    );
};

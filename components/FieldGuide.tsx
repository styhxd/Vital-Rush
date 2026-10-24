import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Language, OrganId } from '../types';
import { hopLine, organPlainName } from '../services/casebook';
import { bossFor, drawBossShape, type BossSpec } from '../services/bosses';
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
            title: 'QUEM ESTÁ NA BRIGA',
            cards: [
                { kind: 'vital', title: 'VITAL', body: 'Você. O corpo claro obedece o movimento. O miolo aceso é a vida.' },
                { kind: 'bacteria', title: 'BACTÉRIA', body: 'Entra pela direita, quase reto. Encosta e machuca. Não se divide.' },
                { kind: 'virus', title: 'VÍRUS', body: 'Quase parado. De tempos em tempos solta um espinho na sua direção.' },
                { kind: 'fungi', title: 'FUNGO', body: 'Rápido e frágil. Cruza a tela em zigue-zague.' },
                { kind: 'parasite', title: 'PARASITA', body: 'Lento e enorme. Cada tiro perde um pedaço, e o contato dói.' },
                { kind: 'boss', title: 'CHEFE', body: 'Um por viagem. O nome e o truque estão na ficha de cada um, aqui embaixo.' },
            ],
        },
        {
            title: 'MOLAR',
            cards: [
                { kind: 'plaque', title: 'PLACA', body: 'Mancha parada. Ficar em cima come a vida e segura o passo. A saliva desfaz.' },
                { kind: 'saliva', title: 'SALIVA', body: 'Fita molhada. O nome vai escrito dentro, de um lado ao outro. Limpa a placa e te carrega.' },
                { kind: 'bite', title: 'MORDIDA', body: 'A faixa avisa. As paredes fecham. O golpe e o barulho são quando se encontram.' },
                { kind: 'enamel', title: 'ESMALTE', body: 'Gota clara. Por uns segundos o dano chega pela metade.' },
            ],
        },
        {
            title: 'FÍGADO',
            cards: [
                { kind: 'bile', title: 'BILE', body: 'Poça no chão. Não persegue. Quem fica dentro queima aos poucos.' },
                { kind: 'filter', title: 'CAPTA', body: 'Capta — puxa. O fígado tira do sangue o que está solto e leva pro centro. Chegar no meio machuca.' },
                { kind: 'heal', title: 'AÇÚCAR', body: 'Açúcar — cura. Gota dourada do fígado. A vida volta devagar, por uns segundos.' },
            ],
        },
        {
            title: 'CORAÇÃO',
            cards: [
                { kind: 'beat', title: 'SÍSTOLE', body: 'Cada batida te dá um tranco de velocidade e empurra a corrente.' },
                { kind: 'ecg', title: 'ELETRO', body: 'Uma linha atravessa a faixa. Encostar nela machuca.' },
                { kind: 'clot', title: 'COÁGULO', body: 'Cresce parado. Depois se solta e desce. Saia antes dele encostar.' },
            ],
        },
        {
            title: 'PULMÃO',
            cards: [
                { kind: 'gust', title: 'LUFADA', body: 'O ar empurra numa faixa. Os fios mostram a direção. Não tira vida sozinho.' },
                { kind: 'cough', title: 'TOSSE', body: 'A faixa avisa e aperta. No estouro, varre e tira um naco de vida.' },
                { kind: 'oxygen', title: 'OXIGÊNIO', body: 'Molécula clara. Por uns segundos os tiros saem mais seguidos.' },
            ],
        },
        {
            title: 'CÉREBRO',
            cards: [
                { kind: 'synapse', title: 'SINAPSE', body: 'Um raio liga dois pontos e machuca na linha. O branco estoura a tela.' },
                { kind: 'focus', title: 'FOCO', body: 'Gota violeta. Por uns segundos o crítico sai mais vezes.' },
            ],
        },
        {
            title: 'O QUE VOCÊ FAZ',
            cards: [
                { kind: 'dash', title: 'DESVIO', body: 'Um tranco curto. Nesse piscar o dano não entra. Depois tem espera.' },
                { kind: 'surge', title: 'PULSO', body: 'O choque trava uns. Outros saem empurrados. O DNA volta.' },
            ],
        },
    ],
    EN: [
        {
            title: 'WHO IS IN THE FIGHT',
            cards: [
                { kind: 'vital', title: 'VITAL', body: 'You. The pale body follows your move. The lit core is your health.' },
                { kind: 'bacteria', title: 'BACTERIA', body: 'Comes in from the right, almost straight. Touch hurts. It does not split.' },
                { kind: 'virus', title: 'VIRUS', body: 'Almost still. Every few seconds it spits a spike toward you.' },
                { kind: 'fungi', title: 'FUNGUS', body: 'Fast and fragile. It zig-zags across the screen.' },
                { kind: 'parasite', title: 'PARASITE', body: 'Slow and huge. Each shot loses a piece, and contact hurts.' },
                { kind: 'boss', title: 'BOSS', body: 'One per crossing. The name and the trick are on each card, below.' },
            ],
        },
        {
            title: 'MOLAR',
            cards: [
                { kind: 'plaque', title: 'PLAQUE', body: 'A stain that sits. Standing on it eats health and slows you. Saliva undoes it.' },
                { kind: 'saliva', title: 'SALIVA', body: 'A ribbon that passes. It cleans plaque, carries you, and weakens damage for a moment.' },
                { kind: 'bite', title: 'BITE', body: 'The band warns. The walls close. The hit and the sound are when they meet.' },
                { kind: 'enamel', title: 'ENAMEL', body: 'A pale drop. For a few seconds damage arrives at half strength.' },
            ],
        },
        {
            title: 'LIVER',
            cards: [
                { kind: 'bile', title: 'BILE', body: 'A puddle on the floor. It does not chase. Staying in it burns, a little at a time.' },
                { kind: 'filter', title: 'UPTAKE', body: 'Uptake — pulls. The liver takes what is loose in the blood and draws it to the center. Reaching the middle hurts.' },
                { kind: 'heal', title: 'SUGAR', body: 'Sugar — heal. A gold drop from the liver. Health comes back slowly, for a few seconds.' },
            ],
        },
        {
            title: 'HEART',
            cards: [
                { kind: 'beat', title: 'SYSTOLE', body: 'Each beat gives you a burst of speed and shoves the current.' },
                { kind: 'ecg', title: 'ECG', body: 'A line crosses the band. Touching it hurts.' },
                { kind: 'clot', title: 'CLOT', body: 'It grows while still. Then it breaks loose and rides down. Leave before it touches you.' },
            ],
        },
        {
            title: 'LUNG',
            cards: [
                { kind: 'gust', title: 'GUST', body: 'Air pushes in a band. The strands show the direction. It does not take health by itself.' },
                { kind: 'cough', title: 'COUGH', body: 'The band warns and tightens. On the burst it sweeps and takes a chunk of health.' },
                { kind: 'oxygen', title: 'OXYGEN', body: 'A pale molecule. For a few seconds the shots come out closer together.' },
            ],
        },
        {
            title: 'BRAIN',
            cards: [
                { kind: 'synapse', title: 'SYNAPSE', body: 'A bolt joins two points and hurts on the line. The white one flashes the screen.' },
                { kind: 'focus', title: 'FOCUS', body: 'A violet drop. For a few seconds criticals land more often.' },
            ],
        },
        {
            title: 'WHAT YOU DO',
            cards: [
                { kind: 'dash', title: 'DASH', body: 'A short jerk. In that blink damage does not get in. Then you wait.' },
                { kind: 'surge', title: 'PULSE', body: 'The shock locks some. Others get shoved. DNA comes back.' },
            ],
        },
    ],
    ES: [
        {
            title: 'QUIÉN ESTÁ EN LA PELEA',
            cards: [
                { kind: 'vital', title: 'VITAL', body: 'Tú. El cuerpo claro obedece el movimiento. El núcleo encendido es la vida.' },
                { kind: 'bacteria', title: 'BACTERIA', body: 'Entra por la derecha, casi recto. El contacto lastima. No se divide.' },
                { kind: 'virus', title: 'VIRUS', body: 'Casi quieto. Cada pocos segundos suelta una púa hacia ti.' },
                { kind: 'fungi', title: 'HONGO', body: 'Rápido y frágil. Cruza la pantalla en zigzag.' },
                { kind: 'parasite', title: 'PARÁSITO', body: 'Lento y enorme. Cada tiro pierde un trozo, y el contacto duele.' },
                { kind: 'boss', title: 'JEFE', body: 'Uno por viaje. El nombre y el truco están en la ficha de cada uno, aquí abajo.' },
            ],
        },
        {
            title: 'MOLAR',
            cards: [
                { kind: 'plaque', title: 'PLACA', body: 'Mancha quieta. Quedarse encima come vida y frena el paso. La saliva la deshace.' },
                { kind: 'saliva', title: 'SALIVA', body: 'Cinta que pasa. Limpia la placa, te lleva y deja el daño más débil un instante.' },
                { kind: 'bite', title: 'MORDIDA', body: 'La franja avisa. Las paredes cierran. El golpe y el ruido son cuando se encuentran.' },
                { kind: 'enamel', title: 'ESMALTE', body: 'Gota clara. Por unos segundos el daño llega a la mitad.' },
            ],
        },
        {
            title: 'HÍGADO',
            cards: [
                { kind: 'bile', title: 'BILIS', body: 'Charco en el suelo. No persigue. Quedarse dentro quema de a poco.' },
                { kind: 'filter', title: 'CAPTA', body: 'Capta — jala. El hígado saca de la sangre lo que está suelto y lo lleva al centro. Llegar al medio lastima.' },
                { kind: 'heal', title: 'AZÚCAR', body: 'Azúcar — cura. Gota dorada del hígado. La vida vuelve despacio, por unos segundos.' },
            ],
        },
        {
            title: 'CORAZÓN',
            cards: [
                { kind: 'beat', title: 'SÍSTOLE', body: 'Cada latido te da un tirón de velocidad y empuja la corriente.' },
                { kind: 'ecg', title: 'ELECTRO', body: 'Una línea cruza la franja. Tocarla lastima.' },
                { kind: 'clot', title: 'COÁGULO', body: 'Crece quieto. Después se suelta y baja. Sal antes de que te toque.' },
            ],
        },
        {
            title: 'PULMÓN',
            cards: [
                { kind: 'gust', title: 'RÁFAGA', body: 'El aire empuja en una franja. Los hilos muestran la dirección. No quita vida solo.' },
                { kind: 'cough', title: 'TOS', body: 'La franja avisa y aprieta. En el estallido barre y quita un trozo de vida.' },
                { kind: 'oxygen', title: 'OXÍGENO', body: 'Molécula clara. Por unos segundos los disparos salen más seguidos.' },
            ],
        },
        {
            title: 'CEREBRO',
            cards: [
                { kind: 'synapse', title: 'SINAPSIS', body: 'Un rayo une dos puntos y lastima en la línea. El blanco revienta la pantalla.' },
                { kind: 'focus', title: 'FOCO', body: 'Gota violeta. Por unos segundos el crítico sale más veces.' },
            ],
        },
        {
            title: 'LO QUE HACES',
            cards: [
                { kind: 'dash', title: 'ESQUIVE', body: 'Un tirón corto. En ese parpadeo el daño no entra. Después hay espera.' },
                { kind: 'surge', title: 'PULSO', body: 'El choque traba a unos. Otros salen empujados. El ADN vuelve.' },
            ],
        },
    ],
};

const paint = (ctx: CanvasRenderingContext2D, kind: Kind, time: number, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#14080c';
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const t = time / 1000;

    if (kind === 'vital') {
        const wx = Math.cos(time / 150) * 3;
        const wy = Math.sin(time / 150) * 3;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 22 + wx, 22 + wy, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.fill();
    } else if (kind === 'bacteria') {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(time / 500);
        ctx.fillStyle = '#77dd77';
        ctx.strokeStyle = '#143014';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-26, -14, 52, 28, 12);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    } else if (kind === 'virus') {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(time / 900);
        const r = 18;
        ctx.fillStyle = '#00aa00';
        ctx.strokeStyle = '#220000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#00ff00';
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(Math.cos(a) * r * 1.2, Math.sin(a) * r * 1.2, r * 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
        ctx.restore();
    } else if (kind === 'fungi') {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.fillStyle = '#bf00ff';
        ctx.strokeStyle = '#220000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + time / 200;
            const x = Math.cos(a) * 24;
            const y = Math.sin(a) * 24;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    } else if (kind === 'parasite') {
        const p = Math.sin(time / 100) * 5;
        ctx.fillStyle = '#ff3333';
        ctx.strokeStyle = '#3a0808';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 28 + p, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    } else if (kind === 'boss') {
        const p = Math.sin(time / 200) * 6;
        ctx.fillStyle = '#000';
        ctx.strokeStyle = '#880000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, 30 + p, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#880000';
        ctx.beginPath();
        ctx.arc(cx, cy, 16, 0, Math.PI * 2);
        ctx.fill();
    } else if (kind === 'plaque') {
        ctx.fillStyle = '#c2a45c';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 4, 34, 22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(74, 58, 28, 0.65)';
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.arc(cx - 12 + i * 8, cy + Math.sin(t + i) * 3, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (kind === 'saliva') {
        const shift = (t * 40) % 30;
        ctx.beginPath();
        ctx.moveTo(-10, cy + 8);
        for (let x = 0; x <= w; x += 8) {
            const wave = Math.sin((x + shift) / 18) * 7;
            ctx.lineTo(x, cy - 10 + wave * (x / w));
        }
        ctx.lineTo(w + 10, cy + 16);
        for (let x = w; x >= 0; x -= 8) {
            const wave = Math.sin((x + shift) / 14) * 6;
            ctx.lineTo(x, cy + 14 + wave);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(186, 228, 236, 0.45)';
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        for (let i = 0; i < 4; i++) {
            const x = ((t * 36 + i * 40) % (w + 20)) - 10;
            ctx.beginPath();
            ctx.arc(x, cy + Math.sin(i + t) * 4, 2.4 + (i % 2), 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (kind === 'bite') {
        const open = 8 + (0.5 + 0.5 * Math.sin(time / 700)) * 18;
        const jaw = (dir: number, tip: number) => {
            const thick = 34;
            const base = tip + dir * thick;
            const valley = tip + dir * 9;
            const bulge = tip - dir * 6;
            const span = w / 3;
            ctx.beginPath();
            ctx.moveTo(0, base);
            ctx.lineTo(0, valley);
            for (let i = 0; i < 3; i++) {
                const left = i * span;
                const right = left + span;
                const peak = left + span * (dir > 0 ? 0.72 : 0.38);
                ctx.quadraticCurveTo((left + peak) / 2, bulge, peak, tip);
                ctx.quadraticCurveTo((peak + right) / 2, bulge, right, valley);
            }
            ctx.lineTo(w, base);
            ctx.closePath();
            const grad = ctx.createLinearGradient(0, tip, 0, base);
            grad.addColorStop(0, 'rgba(246, 248, 250, 0.94)');
            grad.addColorStop(0.4, 'rgba(214, 222, 228, 0.55)');
            grad.addColorStop(1, 'rgba(198, 208, 216, 0)');
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.strokeStyle = 'rgba(244, 248, 252, 0.9)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        };
        jaw(-1, cy - open);
        jaw(1, cy + open);
    } else if (kind === 'enamel') {
        const pulse = 0.5 + 0.5 * Math.sin(t * 3);
        ctx.strokeStyle = `rgba(170, 255, 236, ${0.4 + pulse * 0.5})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy - 2, 28 + pulse * 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#f6fffc';
        ctx.strokeStyle = '#9dffef';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 22);
        ctx.bezierCurveTo(cx + 18, cy - 16, cx + 18, cy + 4, cx, cy + 16);
        ctx.bezierCurveTo(cx - 18, cy + 4, cx - 18, cy - 16, cx, cy - 22);
        ctx.fill();
        ctx.stroke();
    } else if (kind === 'bile') {
        ctx.fillStyle = '#b6c24a';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 2, 36, 18 + Math.sin(t * 2) * 1.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,252,210,0.8)';
        ctx.beginPath();
        ctx.ellipse(cx - 10, cy - 4, 7, 3, -0.4, 0, Math.PI * 2);
        ctx.fill();
        const bob = (t % 1.4) / 1.4;
        ctx.fillStyle = 'rgba(255,255,240,0.7)';
        ctx.beginPath();
        ctx.arc(cx + 8, cy + 6 - bob * 10, 3, 0, Math.PI * 2);
        ctx.fill();
    } else if (kind === 'filter') {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = 'rgba(244, 234, 168, 0.9)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let s = 0; s <= 40; s++) {
            const u = s / 40;
            const a = t * 1.4 + u * Math.PI * 2.1;
            const rad = 34 * (1 - u * 0.82);
            const x = Math.cos(a) * rad;
            const y = Math.sin(a) * rad;
            if (s === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.fillStyle = '#101404';
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    } else if (kind === 'heal') {
        const pulse = 0.5 + 0.5 * Math.sin(t * 3);
        ctx.strokeStyle = `rgba(255, 214, 120, ${0.35 + pulse * 0.4})`;
        ctx.beginPath();
        ctx.arc(cx, cy, 26 + pulse * 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#ffe7a3';
        ctx.beginPath();
        ctx.moveTo(cx, cy - 18);
        ctx.bezierCurveTo(cx + 14, cy - 10, cx + 12, cy + 6, cx, cy + 16);
        ctx.bezierCurveTo(cx - 12, cy + 6, cx - 14, cy - 10, cx, cy - 18);
        ctx.fill();
        ctx.strokeStyle = '#6a4a10';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 4);
        ctx.lineTo(cx, cy + 8);
        ctx.moveTo(cx - 6, cy + 2);
        ctx.lineTo(cx + 6, cy + 2);
        ctx.stroke();
    } else if (kind === 'beat') {
        const k = (t % 1.1) / 1.1;
        ctx.strokeStyle = `rgba(255, 214, 220, ${1 - k})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 8 + k * 36, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#ff5a6a';
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fill();
    } else if (kind === 'ecg') {
        const shift = (t * 0.35) % 1;
        ctx.strokeStyle = 'rgba(255,186,196,0.35)';
        ctx.beginPath();
        ctx.moveTo(8, cy);
        ctx.lineTo(w - 8, cy);
        ctx.stroke();
        ctx.beginPath();
        ctx.strokeStyle = '#fff6f7';
        ctx.lineWidth = 1.6;
        for (let i = 0; i <= 64; i++) {
            const u = i / 64;
            const x = 10 + u * (w - 20);
            const wave = ecgShape((u + shift) % 1);
            if (i === 0) ctx.moveTo(x, cy - wave);
            else ctx.lineTo(x, cy - wave);
        }
        ctx.stroke();
    } else if (kind === 'clot') {
        const x = ((t * 28) % (w + 50)) - 20;
        const r = 16;
        ctx.beginPath();
        for (let i = 0; i <= 16; i++) {
            const a = (i / 16) * Math.PI * 2;
            const lobe = 1 + 0.14 * Math.sin(a * 3 + t * 1.4);
            const px = x + Math.cos(a) * r * lobe;
            const py = cy + Math.sin(a) * r * 0.82 * lobe;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        const g = ctx.createRadialGradient(x - 4, cy - 3, 2, x, cy, r);
        g.addColorStop(0, '#ffe4e4');
        g.addColorStop(0.25, '#ba303e');
        g.addColorStop(1, '#20060a');
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 186, 186, 0.45)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x + 6, cy - 4);
        ctx.quadraticCurveTo(x + 16, cy - 10, x + 24, cy - 2);
        ctx.stroke();
    } else if (kind === 'gust') {
        const ux = -1;
        for (let i = 0; i < 5; i++) {
            const x = ((t * 70 + i * 36) % (w + 50)) - 20;
            const y = 14 + i * 15;
            const len = 28 + (i % 3) * 8;
            ctx.strokeStyle = 'rgba(255, 236, 242, 0.35)';
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.quadraticCurveTo(x - ux * len * 0.5, y - 6 + (i % 2) * 8, x - ux * len, y + 2);
            ctx.stroke();
            ctx.strokeStyle = '#fff8f9';
            ctx.lineWidth = 1.3;
            ctx.stroke();
        }
    } else if (kind === 'cough') {
        const beat = 0.5 + 0.5 * Math.sin(t * 7);
        const warn = 0.45 + 0.55 * beat;
        ctx.fillStyle = `rgba(255, 90, 116, ${0.18 + warn * 0.28})`;
        ctx.fillRect(0, cy - 22, w, 44);
        ctx.fillStyle = `rgba(255, 228, 234, ${0.45 + warn * 0.5})`;
        ctx.fillRect(0, cy - 22, w, 3 + beat * 3);
        ctx.fillRect(0, cy + 19 - beat * 3, w, 3 + beat * 3);
        ctx.strokeStyle = `rgba(255, 244, 246, ${0.4 + warn * 0.5})`;
        ctx.lineWidth = 1.2;
        for (let i = 0; i < 6; i++) {
            const x = 12 + i * 26;
            const reach = 6 + beat * 8;
            ctx.beginPath();
            ctx.moveTo(x, cy - 16);
            ctx.lineTo(x, cy - 16 + reach);
            ctx.moveTo(x, cy + 16);
            ctx.lineTo(x, cy + 16 - reach);
            ctx.stroke();
        }
    } else if (kind === 'oxygen') {
        const bob = Math.sin(t * 2) * 2;
        ctx.strokeStyle = 'rgba(236, 252, 255, 0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 8, cy - 4 + bob);
        ctx.lineTo(cx + 8, cy - 4 + bob);
        ctx.moveTo(cx - 8, cy + bob);
        ctx.lineTo(cx + 8, cy + bob);
        ctx.stroke();
        for (const side of [-1, 1]) {
            const x = cx + side * 14;
            const y = cy - 2 + bob;
            const g = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, 10);
            g.addColorStop(0, '#ffffff');
            g.addColorStop(0.4, '#b7f2ff');
            g.addColorStop(1, '#2f93ad');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(x, y, 9, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (kind === 'synapse') {
        const flash = (t % 1.6) > 1.25;
        ctx.strokeStyle = flash ? '#f4edff' : 'rgba(180, 140, 255, 0.7)';
        ctx.lineWidth = flash ? 3 : 2;
        ctx.beginPath();
        ctx.moveTo(22, cy + 10);
        ctx.quadraticCurveTo(cx, cy - 24, w - 28, cy + 6);
        ctx.stroke();
        ctx.fillStyle = '#d7c6ff';
        ctx.beginPath();
        ctx.arc(22, cy + 10, 4, 0, Math.PI * 2);
        ctx.arc(w - 28, cy + 6, 4, 0, Math.PI * 2);
        ctx.fill();
    } else if (kind === 'focus') {
        const pulse = 0.5 + 0.5 * Math.sin(t * 3);
        ctx.strokeStyle = `rgba(226, 198, 255, ${0.4 + pulse * 0.5})`;
        ctx.beginPath();
        ctx.arc(cx, cy, 22 + pulse * 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#e2c6ff';
        ctx.beginPath();
        ctx.moveTo(cx, cy - 16);
        ctx.bezierCurveTo(cx + 14, cy - 4, cx + 12, cy + 8, cx, cy + 14);
        ctx.bezierCurveTo(cx - 12, cy + 8, cx - 14, cy - 4, cx, cy - 16);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.ellipse(cx - 4, cy - 4, 2.4, 4, -0.5, 0, Math.PI * 2);
        ctx.fill();
    } else if (kind === 'dash') {
        const k = (t % 1.2) / 1.2;
        ctx.globalAlpha = 1 - k * 0.7;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(30 + k * (w - 60), cy, 26, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.arc(30 + k * (w - 60), cy, 4, 0, Math.PI * 2);
        ctx.fill();
    } else if (kind === 'surge') {
        const k = (t % 1.4) / 1.4;
        ctx.strokeStyle = `rgba(0, 255, 255, ${1 - k})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 6 + k * 34, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#FFD700';
        for (let i = 0; i < 4; i++) {
            const a = i * 1.4 + t;
            const rad = 30 - k * 18;
            ctx.beginPath();
            ctx.arc(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
};

const ecgShape = (t: number) => {
    const keys: Array<[number, number]> = [
        [0, 0], [0.14, 0], [0.2, 6], [0.26, 0], [0.36, 0],
        [0.4, -5], [0.44, 22], [0.48, -9], [0.52, 0],
        [0.64, 0], [0.74, 8], [0.84, 0], [1, 0],
    ];
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
        const [t0, a0] = keys[i - 1];
        const [t1, a1] = keys[i];
        if (t <= t1) return a0 + (a1 - a0) * ((t - t0) / (t1 - t0 || 1));
    }
    return 0;
};

const Sprite: React.FC<{ kind: Kind }> = ({ kind }) => {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = ref.current;
        if (!canvas) return;
        let frame = 0;
        const loop = (now: number) => {
            const ctx = canvas.getContext('2d');
            if (ctx) paint(ctx, kind, now, canvas.width, canvas.height);
            frame = requestAnimationFrame(loop);
        };
        frame = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frame);
    }, [kind]);
    return <canvas ref={ref} width={168} height={96} className="guide-stage" aria-hidden />;
};

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
    gap: 0.55rem;
    align-items: center;
    width: 100%;
    padding: 0;
    text-align: left;
    color: inherit;
    font: inherit;
    background: rgba(255, 244, 220, 0.04);
    border: 1px solid rgba(226, 176, 96, 0.22);
    border-radius: 10px;
    overflow: hidden;
    min-height: 96px;
    cursor: pointer;
}
.guide-card:hover,
.guide-card:focus-visible {
    border-color: rgba(255, 216, 120, 0.75);
    background: rgba(255, 244, 220, 0.08);
    outline: none;
}
.guide-card.is-hop { grid-template-columns: 92px minmax(0, 1fr); min-height: 72px; }
.guide-boss { display: block; width: 92px; height: 72px; background: #14080c; }
.guide-stage {
    display: block;
    width: 168px;
    height: 96px;
    background: #14080c;
}
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
.guide-copy { padding: 0.35rem 0.7rem 0.4rem 0; }
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
    .guide-card { grid-template-columns: 120px minmax(0, 1fr); }
    .guide-stage { width: 120px; height: 72px; }
}
`;

function BossMark({ spec }: { spec: BossSpec }) {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = ref.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#14080c';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        drawBossShape(ctx, spec.shape, spec.color, spec.accent, 24, 900);
        ctx.restore();
    }, [spec]);
    return <canvas ref={ref} width={96} height={72} className="guide-boss" />;
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

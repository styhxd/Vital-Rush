import React, { useEffect, useRef } from 'react';
import { Language } from '../types';
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
                { kind: 'vital', title: 'VITAL', body: 'Você. O corpo claro anda, o miolo é o pulso.' },
                { kind: 'bacteria', title: 'BACTÉRIA', body: 'O patógeno comum. Anda reto e empurra.' },
                { kind: 'virus', title: 'VÍRUS', body: 'Fica parado e solta espinhos em você.' },
                { kind: 'fungi', title: 'FUNGO', body: 'Rápido e torto. Cruza a tela em zigue-zague.' },
                { kind: 'parasite', title: 'PARASITA', body: 'Lento, enorme, e aguenta muito tiro.' },
                { kind: 'boss', title: 'CHEFE', body: 'A anomalia da última onda de cada órgão.' },
            ],
        },
        {
            title: 'MOLAR',
            cards: [
                { kind: 'plaque', title: 'PLACA', body: 'Sujeira que gruda. Ficar em cima come a vida. A saliva dissolve.' },
                { kind: 'saliva', title: 'SALIVA', body: 'Água que passa, limpa a placa, carrega você e dá um escudo curto.' },
                { kind: 'bite', title: 'MORDIDA', body: 'As paredes do dente fecham na faixa. Saia antes de encostar.' },
                { kind: 'enamel', title: 'ESMALTE', body: 'Escudo. Pega e o dano cai pela metade.' },
            ],
        },
        {
            title: 'FÍGADO',
            cards: [
                { kind: 'bile', title: 'BILE', body: 'Poça que se abre no chão. Quem fica em cima queima.' },
                { kind: 'filter', title: 'FILTRO', body: 'Redemoinho. Puxa tudo para o centro e machuca quem chega lá.' },
                { kind: 'heal', title: 'CURA', body: 'Gota dourada. Recupera vida por alguns segundos.' },
            ],
        },
        {
            title: 'CORAÇÃO',
            cards: [
                { kind: 'beat', title: 'SÍSTOLE', body: 'O coração aperta. Você acelera e o sangue empurra junto.' },
                { kind: 'ecg', title: 'ELETRO', body: 'Uma linha de batimento atravessa a faixa. Não fique nela.' },
                { kind: 'clot', title: 'COÁGULO', body: 'Uma massa escura se forma e desce com o sangue. Saia antes dela te pegar.' },
            ],
        },
        {
            title: 'PULMÃO',
            cards: [
                { kind: 'gust', title: 'LUFADA', body: 'O ar atravessa o lugar. Os fios mostram para onde ele empurra.' },
                { kind: 'cough', title: 'TOSSE', body: 'A faixa pulsa e aperta. Quando estoura, varre quem ficou dentro.' },
                { kind: 'oxygen', title: 'OXIGÊNIO', body: 'Uma molécula. Pega e os tiros saem mais rápido.' },
            ],
        },
        {
            title: 'CÉREBRO',
            cards: [
                { kind: 'synapse', title: 'SINAPSE', body: 'Um raio liga dois pontos. O branco estoura a tela.' },
                { kind: 'focus', title: 'FOCO', body: 'Gota violeta. Os críticos acontecem mais.' },
            ],
        },
        {
            title: 'O QUE VOCÊ FAZ',
            cards: [
                { kind: 'dash', title: 'DESVIO', body: 'Um impulso. Por um instante nada te acerta.' },
                { kind: 'surge', title: 'PULSO', body: 'Empurra os inimigos e puxa todo o DNA para você.' },
            ],
        },
    ],
    EN: [
        {
            title: 'WHO IS IN THE FIGHT',
            cards: [
                { kind: 'vital', title: 'VITAL', body: 'You. The pale body moves, the core is the pulse.' },
                { kind: 'bacteria', title: 'BACTERIA', body: 'The ordinary pathogen. It walks straight and shoves.' },
                { kind: 'virus', title: 'VIRUS', body: 'It stays put and throws spikes at you.' },
                { kind: 'fungi', title: 'FUNGUS', body: 'Fast and crooked. It zig-zags across the screen.' },
                { kind: 'parasite', title: 'PARASITE', body: 'Slow, huge, and it soaks up shots.' },
                { kind: 'boss', title: 'BOSS', body: 'The anomaly on the last wave of each organ.' },
            ],
        },
        {
            title: 'MOLAR',
            cards: [
                { kind: 'plaque', title: 'PLAQUE', body: 'Grime that sticks. Standing on it eats health. Saliva dissolves it.' },
                { kind: 'saliva', title: 'SALIVA', body: 'Water that passes, cleans plaque, carries you, and leaves a short shield.' },
                { kind: 'bite', title: 'BITE', body: 'The tooth walls close on that band. Leave before they meet.' },
                { kind: 'enamel', title: 'ENAMEL', body: 'A shield. Pick it up and damage is cut in half.' },
            ],
        },
        {
            title: 'LIVER',
            cards: [
                { kind: 'bile', title: 'BILE', body: 'A puddle that opens on the floor. Standing in it burns.' },
                { kind: 'filter', title: 'FILTER', body: 'A whirlpool. It pulls everything to the center and hurts whoever arrives.' },
                { kind: 'heal', title: 'HEAL', body: 'A gold drop. It restores health for a few seconds.' },
            ],
        },
        {
            title: 'HEART',
            cards: [
                { kind: 'beat', title: 'SYSTOLE', body: 'The heart squeezes. You speed up and the blood pushes with you.' },
                { kind: 'ecg', title: 'ECG', body: 'A heartbeat line crosses the band. Stay off it.' },
                { kind: 'clot', title: 'CLOT', body: 'A dark mass forms, then rides the blood. Get clear before it catches you.' },
            ],
        },
        {
            title: 'LUNG',
            cards: [
                { kind: 'gust', title: 'GUST', body: 'Air crosses the place. The strands show which way it pushes.' },
                { kind: 'cough', title: 'COUGH', body: 'The band pulses and tightens. When it bursts, it sweeps whoever stayed inside.' },
                { kind: 'oxygen', title: 'OXYGEN', body: 'A molecule. Pick it up and shots come out faster.' },
            ],
        },
        {
            title: 'BRAIN',
            cards: [
                { kind: 'synapse', title: 'SYNAPSE', body: 'A bolt joins two points. The white one flashes the screen.' },
                { kind: 'focus', title: 'FOCUS', body: 'A violet drop. Critical hits happen more often.' },
            ],
        },
        {
            title: 'WHAT YOU DO',
            cards: [
                { kind: 'dash', title: 'DASH', body: 'A burst. For a moment nothing can hit you.' },
                { kind: 'surge', title: 'PULSE', body: 'It shoves enemies away and pulls every DNA coin in.' },
            ],
        },
    ],
    ES: [
        {
            title: 'QUIÉN ESTÁ EN LA PELEA',
            cards: [
                { kind: 'vital', title: 'VITAL', body: 'Tú. El cuerpo claro se mueve, el núcleo es el pulso.' },
                { kind: 'bacteria', title: 'BACTERIA', body: 'El patógeno común. Camina recto y empuja.' },
                { kind: 'virus', title: 'VIRUS', body: 'Se queda quieto y te lanza púas.' },
                { kind: 'fungi', title: 'HONGO', body: 'Rápido y torcido. Cruza en zigzag.' },
                { kind: 'parasite', title: 'PARÁSITO', body: 'Lento, enorme, y aguanta muchos tiros.' },
                { kind: 'boss', title: 'JEFE', body: 'La anomalía de la última onda de cada órgano.' },
            ],
        },
        {
            title: 'MOLAR',
            cards: [
                { kind: 'plaque', title: 'PLACA', body: 'Mugre que se pega. Quedarse encima come vida. La saliva la disuelve.' },
                { kind: 'saliva', title: 'SALIVA', body: 'Agua que pasa, limpia la placa, te lleva y deja un escudo corto.' },
                { kind: 'bite', title: 'MORDIDA', body: 'Las paredes del diente cierran en esa franja. Sal antes de que se toquen.' },
                { kind: 'enamel', title: 'ESMALTE', body: 'Escudo. Lo tomas y el daño baja a la mitad.' },
            ],
        },
        {
            title: 'HÍGADO',
            cards: [
                { kind: 'bile', title: 'BILIS', body: 'Un charco que se abre en el suelo. Quedarse quema.' },
                { kind: 'filter', title: 'FILTRO', body: 'Un remolino. Atrae todo al centro y lastima a quien llega.' },
                { kind: 'heal', title: 'CURA', body: 'Una gota dorada. Recupera vida unos segundos.' },
            ],
        },
        {
            title: 'CORAZÓN',
            cards: [
                { kind: 'beat', title: 'SÍSTOLE', body: 'El corazón aprieta. Aceleras y la sangre empuja contigo.' },
                { kind: 'ecg', title: 'ELECTRO', body: 'Una línea de latido cruza la franja. No te quedes ahí.' },
                { kind: 'clot', title: 'COÁGULO', body: 'Una masa oscura se forma y baja con la sangre. Aléjate antes de que te alcance.' },
            ],
        },
        {
            title: 'PULMÓN',
            cards: [
                { kind: 'gust', title: 'RÁFAGA', body: 'El aire cruza el lugar. Los hilos muestran hacia dónde empuja.' },
                { kind: 'cough', title: 'TOS', body: 'La franja late y se aprieta. Cuando estalla, barre a quien se quedó dentro.' },
                { kind: 'oxygen', title: 'OXÍGENO', body: 'Una molécula. La tomas y los disparos salen más rápido.' },
            ],
        },
        {
            title: 'CEREBRO',
            cards: [
                { kind: 'synapse', title: 'SINAPSIS', body: 'Un rayo une dos puntos. El blanco revienta la pantalla.' },
                { kind: 'focus', title: 'FOCO', body: 'Una gota violeta. Los críticos salen más seguido.' },
            ],
        },
        {
            title: 'LO QUE HACES',
            cards: [
                { kind: 'dash', title: 'ESQUIVE', body: 'Un impulso. Un instante nada te toca.' },
                { kind: 'surge', title: 'PULSO', body: 'Empuja a los enemigos y atrae todo el ADN.' },
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
        ctx.arc(cx, cy, 12, 0, Math.PI * 2);
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
    const g = (c: number, amp: number, width: number) =>
        amp * Math.exp(-((t - c) * (t - c)) / (2 * width * width));
    return g(0.18, 6, 0.03) + g(0.34, -5, 0.012) + g(0.4, 22, 0.008) + g(0.46, -9, 0.012) + g(0.66, 8, 0.04);
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

const styles = `
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
    background: rgba(255, 244, 220, 0.04);
    border: 1px solid rgba(226, 176, 96, 0.22);
    border-radius: 10px;
    overflow: hidden;
    min-height: 96px;
}
.guide-stage {
    display: block;
    width: 168px;
    height: 96px;
    background: #14080c;
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
@media (max-width: 720px) {
    .guide-grid { grid-template-columns: 1fr; }
    .guide-card { grid-template-columns: 120px minmax(0, 1fr); }
    .guide-stage { width: 120px; height: 72px; }
}
`;

export const FieldGuide: React.FC<{
    language: Language;
    title: string;
    backLabel: string;
    onBack: () => void;
}> = ({ language, title, backLabel, onBack }) => {
    const sections = COPY[language] || COPY.EN;
    return (
        <Dossier title={title} meta="ATLAS" onBack={onBack} backLabel={backLabel} wide>
            <style>{styles}</style>
            {sections.map(section => (
                <section key={section.title} className="guide-section">
                    <h4 className="dossier-kicker">{section.title}</h4>
                    <div className="guide-grid">
                        {section.cards.map(card => (
                            <article key={card.kind} className="guide-card">
                                <Sprite kind={card.kind} />
                                <div className="guide-copy">
                                    <h3>{card.title}</h3>
                                    <p>{card.body}</p>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            ))}
        </Dossier>
    );
};

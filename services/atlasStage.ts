import { drawBossShape, BOSSES, type BossSpec } from './bosses';

export type AtlasKind =
    | 'vital' | 'bacteria' | 'virus' | 'fungi' | 'parasite' | 'boss'
    | 'plaque' | 'saliva' | 'bite' | 'enamel'
    | 'bile' | 'filter' | 'heal'
    | 'beat' | 'ecg' | 'clot'
    | 'gust' | 'cough' | 'oxygen'
    | 'synapse' | 'focus'
    | 'dash' | 'surge';

export const ATLAS_INK: Record<AtlasKind, string> = {
    vital: '#00ffff',
    bacteria: '#77dd77',
    virus: '#00ff00',
    fungi: '#bf00ff',
    parasite: '#d98a3a',
    boss: '#e7b0a4',
    plaque: '#c2a45c',
    saliva: '#bae4ec',
    bite: '#f4f7fa',
    enamel: '#9dffef',
    bile: '#d6e36a',
    filter: '#f4eaa8',
    heal: '#ffe7a3',
    beat: '#ff5a6a',
    ecg: '#ffd0d6',
    clot: '#ffb0b8',
    gust: '#ffe8ee',
    cough: '#ff8fa0',
    oxygen: '#b7f2ff',
    synapse: '#d7c6ff',
    focus: '#e2c6ff',
    dash: '#7ef6ff',
    surge: '#5eefff',
};

const TINT: Record<AtlasKind, string> = {
    vital: 'rgba(0, 210, 210, 0.16)',
    bacteria: 'rgba(80, 170, 90, 0.18)',
    virus: 'rgba(40, 160, 50, 0.18)',
    fungi: 'rgba(140, 40, 190, 0.18)',
    parasite: 'rgba(180, 100, 40, 0.18)',
    boss: 'rgba(160, 48, 44, 0.2)',
    plaque: 'rgba(160, 140, 80, 0.16)',
    saliva: 'rgba(140, 190, 200, 0.14)',
    bite: 'rgba(180, 196, 206, 0.12)',
    enamel: 'rgba(120, 220, 200, 0.14)',
    bile: 'rgba(170, 176, 48, 0.16)',
    filter: 'rgba(180, 170, 70, 0.14)',
    heal: 'rgba(210, 170, 60, 0.16)',
    beat: 'rgba(190, 40, 56, 0.2)',
    ecg: 'rgba(190, 40, 60, 0.16)',
    clot: 'rgba(150, 28, 40, 0.18)',
    gust: 'rgba(190, 120, 136, 0.12)',
    cough: 'rgba(190, 60, 80, 0.16)',
    oxygen: 'rgba(80, 170, 190, 0.16)',
    synapse: 'rgba(130, 90, 190, 0.16)',
    focus: 'rgba(140, 80, 200, 0.16)',
    dash: 'rgba(0, 190, 200, 0.14)',
    surge: 'rgba(0, 180, 200, 0.16)',
};

function rgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function reset(ctx: CanvasRenderingContext2D) {
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.setLineDash([]);
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
}

function backdrop(ctx: CanvasRenderingContext2D, w: number, h: number, tint: string) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#14080c';
    ctx.fillRect(0, 0, w, h);
    const wash = ctx.createRadialGradient(w * 0.5, h * 0.42, 6, w * 0.5, h * 0.5, w * 0.62);
    wash.addColorStop(0, tint);
    wash.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, w, h);
    const vig = ctx.createRadialGradient(w * 0.5, h * 0.48, w * 0.12, w * 0.5, h * 0.5, w * 0.72);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
}

function glow(
    ctx: CanvasRenderingContext2D,
    color: string,
    radius: number,
    inner: number,
    mid: number | null,
    ratio: number,
    x: number,
    y: number,
) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const g = ctx.createRadialGradient(x, y, Math.max(0.4, radius * ratio), x, y, Math.max(1, radius));
    g.addColorStop(0, rgba(color, inner));
    if (mid !== null) g.addColorStop(0.5, rgba(color, mid));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function motes(ctx: CanvasRenderingContext2D, time: number, w: number, h: number, color: string) {
    ctx.save();
    ctx.fillStyle = color;
    for (let i = 0; i < 6; i++) {
        const x = ((time * (0.012 + (i % 3) * 0.005) + i * 53) % (w + 18)) - 9;
        const y = 8 + ((i * 31) % Math.max(1, h - 16)) + Math.sin(time / 900 + i) * 2;
        ctx.globalAlpha = 0.12 + (i % 3) * 0.05;
        ctx.beginPath();
        ctx.arc(x, y, 1.05 + (i % 3) * 0.5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function seat(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
    ctx.beginPath();
    ctx.ellipse(x, y, rx, Math.max(2.2, rx * 0.22), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function vitalBody(ctx: CanvasRenderingContext2D, time: number, r: number, dashing: boolean) {
    const wx = Math.cos(time / 150) * 3;
    const wy = Math.sin(time / 150) * 3;
    ctx.fillStyle = dashing ? '#00ffff' : '#ffffff';
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.max(1, dashing ? r * 2 : r + wx), Math.max(1, dashing ? r * 0.5 : r + wy), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
}

function paintVital(ctx: CanvasRenderingContext2D, time: number, w: number, h: number) {
    const r = 18;
    const bob = Math.sin(time / 520) * 1.6;
    const x = w / 2;
    const y = h / 2 + bob;
    motes(ctx, time, w, h, '#7ef6ff');
    seat(ctx, x, h / 2 + r * 0.85, r * 0.7);
    glow(ctx, '#00ffff', r * 2.5, 0.6, null, 0.08, x, y);
    ctx.save();
    ctx.translate(x, y);
    vitalBody(ctx, time, r, false);
    ctx.restore();
}

function paintBacteria(ctx: CanvasRenderingContext2D, time: number, w: number, h: number) {
    const r = 26;
    const bob = Math.sin(time / 540) * 1.5;
    const x = w / 2 + Math.sin(time / 900) * 6;
    const y = h / 2 + bob;
    motes(ctx, time, w, h, '#77dd77');
    seat(ctx, w / 2, h / 2 + 16, 18);
    glow(ctx, '#77dd77', r * 1.7, 0.55, 0.18, 0.1, x, y);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(time / 500);
    ctx.fillStyle = '#77dd77';
    ctx.strokeStyle = '#220000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-r, -r / 2, r * 2, r, r * 0.28);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

function paintVirus(ctx: CanvasRenderingContext2D, time: number, w: number, h: number) {
    const r = 18;
    const bob = Math.sin(time / 640) * 1.2;
    const x = w / 2;
    const y = h / 2 + bob;
    const telegraph = (time % 3600) / 3600 > 0.86;
    motes(ctx, time, w, h, '#39ff39');
    seat(ctx, x, h / 2 + r * 1.15, r * 0.85);
    glow(ctx, '#00ff00', r * 2.15, 0.55, 0.18, 0.1, x, y);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(time / 900);
    ctx.fillStyle = telegraph ? '#ffffff' : '#00aa00';
    ctx.strokeStyle = '#220000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = telegraph ? '#f4fff4' : '#00ff00';
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r * 1.2, Math.sin(a) * r * 1.2, r * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
    if (telegraph) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function paintFungi(ctx: CanvasRenderingContext2D, time: number, w: number, h: number) {
    const r = 22;
    const x = w / 2 + Math.sin(time / 380) * 8;
    const y = h / 2 + Math.sin(time / 240) * 5;
    motes(ctx, time, w, h, '#bf00ff');
    seat(ctx, w / 2, h / 2 + 18, 16);
    glow(ctx, '#bf00ff', r * 2, 0.55, 0.18, 0.1, x, y);
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#bf00ff';
    ctx.strokeStyle = '#220000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + time / 200;
        const vx = Math.cos(a) * r;
        const vy = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

function paintParasite(ctx: CanvasRenderingContext2D, time: number, w: number, h: number) {
    const pulse = Math.sin(time / 100) * 3.4;
    const r = 24 + pulse;
    const y = h / 2 + Math.sin(time / 780) * 1.1;
    const x = w / 2;
    motes(ctx, time, w, h, '#d98a3a');
    seat(ctx, x, h / 2 + 22, 20);
    glow(ctx, '#d98a3a', 24 * 2, 0.55, 0.18, 0.1, x, y);
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#d98a3a';
    ctx.strokeStyle = '#220000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

function paintPlaque(ctx: CanvasRenderingContext2D, time: number, w: number, h: number) {
    const r = 50;
    const x = w / 2;
    const y = h * 0.54;
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    const n = 12;
    for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2;
        const wob = 1 + 0.08 * Math.sin(a * 3 + time / 500);
        const px = Math.cos(a) * r * 0.62 * wob;
        const py = Math.sin(a) * r * 0.48 * wob;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    const g = ctx.createRadialGradient(-r * 0.12, -r * 0.1, r * 0.08, 0, 0, r);
    g.addColorStop(0, '#e4d09a');
    g.addColorStop(0.55, '#c2a45c');
    g.addColorStop(1, '#8d7340');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(92, 74, 36, 0.8)';
    ctx.stroke();
    ctx.fillStyle = 'rgba(74, 58, 28, 0.7)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.16, -r * 0.08, r * 0.09, r * 0.035, -0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(74, 58, 28, 0.55)';
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(Math.cos(i * 2.1) * r * 0.18, Math.sin(i * 1.6) * r * 0.12, 3.5 + (i % 2) * 1.5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function paintSaliva(ctx: CanvasRenderingContext2D, time: number, w: number, h: number) {
    const flow = time / 280;
    const steps = 28;
    const samples: Array<{ x: number; y: number; half: number }> = [];
    for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const x = -10 + u * (w + 20);
        const y = h * 0.5 + Math.sin(u * 5.4 + flow * 0.4) * 6 + Math.sin(u * 2.1 - flow * 0.22) * 2.5;
        const env = Math.pow(Math.sin(u * Math.PI), 0.72);
        const ripple = Math.sin(u * 8.5 + flow * 1.35) * 0.14;
        samples.push({ x, y, half: (5 + env * 11) * (1 + ripple * env) });
    }
    ctx.beginPath();
    samples.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y - p.half) : ctx.lineTo(p.x, p.y - p.half)));
    for (let i = samples.length - 1; i >= 0; i--) ctx.lineTo(samples[i].x, samples[i].y + samples[i].half);
    ctx.closePath();
    ctx.fillStyle = 'rgba(186, 228, 236, 0.22)';
    ctx.fill();
    ctx.save();
    ctx.clip();
    const body = ctx.createLinearGradient(0, h * 0.3, 0, h * 0.72);
    body.addColorStop(0, 'rgba(244, 252, 255, 0.62)');
    body.addColorStop(0.42, 'rgba(176, 220, 232, 0.32)');
    body.addColorStop(1, 'rgba(130, 190, 206, 0.08)');
    ctx.fillStyle = body;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) {
        const p = samples[Math.min(samples.length - 1, 2 + i * 3)];
        const side = (((i * 37) % 100) / 100 - 0.5) * 0.8;
        const bob = Math.sin(flow * 1.6 + i * 1.3) * 0.15;
        const rad = 1.6 + (i % 4) * 0.7;
        const bx = p.x + Math.sin(flow + i) * 4;
        const by = p.y + p.half * (side + bob) * 0.35;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
        ctx.beginPath();
        ctx.arc(bx, by, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(bx - rad * 0.28, by - rad * 0.3, Math.max(0.6, rad * 0.32), 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
    ctx.beginPath();
    samples.forEach((p, i) => {
        const y = p.y - p.half * 0.38;
        if (i === 0) ctx.moveTo(p.x, y);
        else ctx.lineTo(p.x, y);
    });
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.62)';
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
}

function jaw(ctx: CanvasRenderingContext2D, w: number, dir: number, tip: number) {
    const thick = 26;
    const base = tip + dir * thick;
    const valley = tip + dir * 8;
    const bulge = tip - dir * 5;
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
    grad.addColorStop(0.35, 'rgba(214, 222, 228, 0.62)');
    grad.addColorStop(1, 'rgba(198, 208, 216, 0)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(244, 248, 252, 0.9)';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.stroke();
}

function paintBite(ctx: CanvasRenderingContext2D, time: number, w: number, h: number) {
    const u = (time % 3200) / 3200;
    let open: number;
    if (u < 0.42) open = 1;
    else if (u < 0.58) {
        const k = (u - 0.42) / 0.16;
        open = 1 - k * k;
    } else if (u < 0.74) open = 0.06;
    else {
        const k = (u - 0.74) / 0.26;
        const e = k * k * (3 - 2 * k);
        open = 0.06 + 0.94 * e;
    }
    const gap = 11 + open * 12;
    const cy = h / 2;
    const warn = open > 0.55;
    ctx.fillStyle = warn ? 'rgba(255, 132, 104, 0.06)' : 'rgba(255, 244, 232, 0.05)';
    ctx.fillRect(0, cy - 34, w, 68);
    if (open > 0.2) {
        ctx.setLineDash([7, 6]);
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 176, 156, 0.45)';
        ctx.beginPath();
        ctx.moveTo(0, cy - gap);
        ctx.lineTo(w, cy - gap);
        ctx.moveTo(0, cy + gap);
        ctx.lineTo(w, cy + gap);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    jaw(ctx, w, -1, cy - gap);
    jaw(ctx, w, 1, cy + gap);
    if (open < 0.18) {
        const flash = 1 - open / 0.18;
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.35 + flash * 0.5})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(8, cy);
        ctx.lineTo(w - 8, cy);
        ctx.stroke();
    }
}

function crystal(ctx: CanvasRenderingContext2D, time: number, fill: string, stroke: string, shine: string) {
    const pulse = 0.5 + 0.5 * Math.sin(time / 180);
    ctx.strokeStyle = stroke;
    ctx.globalAlpha = 0.45 + pulse * 0.45;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -4, 46 + pulse * 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = fill;
    ctx.strokeStyle = shine;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -34);
    ctx.bezierCurveTo(28, -28, 30, 2, 0, 22);
    ctx.bezierCurveTo(-30, 2, -28, -28, 0, -34);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(126, 234, 212, 0.95)';
    ctx.beginPath();
    ctx.ellipse(-7, -10, 6, 10, -0.4, 0, Math.PI * 2);
    ctx.fill();
}

function paintEnamel(ctx: CanvasRenderingContext2D, time: number, w: number, h: number) {
    const bob = Math.sin(time / 260) * 1.8;
    motes(ctx, time, w, h, '#b8fff0');
    ctx.save();
    ctx.translate(w / 2, h / 2 + 2 + bob);
    ctx.scale(0.7, 0.7);
    crystal(ctx, time, '#f6fffc', 'rgba(170, 255, 236, 0.9)', '#9dffef');
    ctx.restore();
}

function paintBile(ctx: CanvasRenderingContext2D, time: number, w: number, h: number) {
    const r = 32;
    ctx.save();
    ctx.translate(w / 2, h * 0.56);
    const flat = 0.58;
    const phase = time / 680;
    ctx.beginPath();
    const n = 18;
    for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2;
        const wob = 1 + 0.035 * Math.sin(a * 3 + phase) + 0.02 * Math.cos(a * 2 - phase * 0.6);
        const px = Math.cos(a) * r * 1.02 * wob;
        const py = Math.sin(a) * r * flat * wob;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    const g = ctx.createRadialGradient(-r * 0.22, -r * 0.14, r * 0.04, 0, 0, r);
    g.addColorStop(0, 'rgba(255, 250, 186, 0.95)');
    g.addColorStop(0.16, 'rgba(206, 210, 72, 0.9)');
    g.addColorStop(0.62, 'rgba(148, 158, 36, 0.82)');
    g.addColorStop(1, 'rgba(46, 54, 12, 0.55)');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 252, 220, 0.85)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.24, -r * 0.12, r * 0.07, r * 0.028, -0.5, 0, Math.PI * 2);
    ctx.fill();
    const spots: Array<[number, number, number]> = [
        [-0.28, 0.02, 0.09],
        [0.18, -0.06, 0.07],
        [0.02, 0.1, 0.055],
        [-0.08, -0.04, 0.04],
    ];
    for (let i = 0; i < spots.length; i++) {
        const [sx, sy, sr] = spots[i];
        const rise = ((time / 1400 + i * 0.23) % 1) * r * 0.08;
        const bx = sx * r;
        const by = sy * r - rise;
        const br = sr * r;
        ctx.fillStyle = 'rgba(255, 252, 210, 0.22)';
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 252, 220, 0.55)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 255, 245, 0.8)';
        ctx.beginPath();
        ctx.arc(bx - br * 0.28, by - br * 0.3, br * 0.22, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function paintFilter(ctx: CanvasRenderingContext2D, time: number, w: number, h: number) {
    const spin = time / 520;
    const reach = Math.min(w, h) * 0.42;
    ctx.save();
    ctx.translate(w / 2, h / 2);
    const well = ctx.createRadialGradient(0, 0, 4, 0, 0, reach);
    well.addColorStop(0, 'rgba(8, 12, 4, 0.72)');
    well.addColorStop(0.28, 'rgba(36, 42, 10, 0.28)');
    well.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = well;
    ctx.beginPath();
    ctx.arc(0, 0, reach, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < 3; i++) {
        const base = spin + (i / 3) * Math.PI * 2;
        ctx.beginPath();
        let endX = 0;
        let endY = 0;
        let prevX = 0;
        let prevY = 0;
        for (let s = 0; s <= 32; s++) {
            const t = s / 32;
            const a = base + t * 1.05 * Math.PI * 2;
            const rad = reach * (1 - t * 0.82);
            const x = Math.cos(a) * rad;
            const y = Math.sin(a) * rad;
            if (s === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            prevX = endX;
            prevY = endY;
            endX = x;
            endY = y;
        }
        ctx.strokeStyle = 'rgba(244, 234, 168, 0.9)';
        ctx.lineWidth = 1.7;
        ctx.stroke();
        const dx = endX - prevX;
        const dy = endY - prevY;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        ctx.beginPath();
        ctx.moveTo(endX + ux * 7, endY + uy * 7);
        ctx.lineTo(endX - ux * 3 + -uy * 4, endY - uy * 3 + ux * 4);
        ctx.lineTo(endX - ux * 3 - -uy * 4, endY - uy * 3 - ux * 4);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 246, 190, 0.95)';
        ctx.fill();
    }
    const pull = time / 640;
    for (let i = 0; i < 5; i++) {
        const travel = (pull + i / 5) % 1;
        const a = spin * 0.35 + (i / 5) * Math.PI * 2;
        const outer = 10 + (1 - travel) * (reach - 8);
        const inner = Math.max(8, outer - 12);
        ctx.globalAlpha = 0.28 + travel * 0.65;
        ctx.strokeStyle = '#f6eec4';
        ctx.lineWidth = 1.6 * (1 - travel * 0.35);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * outer, Math.sin(a) * outer);
        ctx.lineTo(Math.cos(a) * inner, Math.sin(a) * inner);
        ctx.stroke();
        ctx.fillStyle = '#fff8d8';
        ctx.beginPath();
        ctx.arc(Math.cos(a) * inner, Math.sin(a) * inner, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    const mouth = 11;
    const pit = ctx.createRadialGradient(0, 0, 2, 0, 0, mouth);
    pit.addColorStop(0, 'rgba(6, 8, 2, 0.95)');
    pit.addColorStop(1, 'rgba(90, 98, 28, 0.55)');
    ctx.fillStyle = pit;
    ctx.beginPath();
    ctx.arc(0, 0, mouth, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(244, 236, 170, 0.85)';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.restore();
}

function paintHeal(ctx: CanvasRenderingContext2D, time: number, w: number, h: number) {
    const bob = Math.sin(time / 260) * 1.8;
    const pulse = 0.5 + 0.5 * Math.sin(time / 200);
    motes(ctx, time, w, h, '#ffe7a3');
    ctx.save();
    ctx.translate(w / 2, h / 2 + bob);
    ctx.scale(0.78, 0.78);
    ctx.fillStyle = `rgba(255, 214, 120, ${0.1 + pulse * 0.1})`;
    ctx.beginPath();
    ctx.arc(0, -2, 42 + pulse * 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255, 220, 140, ${0.35 + pulse * 0.4})`;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = '#ffe7a3';
    ctx.strokeStyle = '#fff6d4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -28);
    ctx.bezierCurveTo(20, -18, 18, 8, 0, 22);
    ctx.bezierCurveTo(-18, 8, -20, -18, 0, -28);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.beginPath();
    ctx.ellipse(-5, -8, 4, 7, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6a4a10';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.lineTo(0, 12);
    ctx.moveTo(-7, 5);
    ctx.lineTo(7, 5);
    ctx.stroke();
    ctx.restore();
}

function paintBeat(ctx: CanvasRenderingContext2D, time: number, w: number, h: number) {
    const phase = (time % 2100) / 2100;
    const pulse = Math.exp(-phase * 12);
    const cx = w / 2;
    const cy = h / 2;
    ctx.fillStyle = `rgba(255, 48, 72, ${0.04 + pulse * 0.2})`;
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.globalAlpha = 0.35 + pulse * 0.6;
    ctx.strokeStyle = '#fff0f2';
    ctx.lineWidth = 1.6 + pulse * 1.4;
    ctx.beginPath();
    ctx.arc(cx, cy, 8 + (1 - Math.exp(-phase * 3.2)) * 36, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    glow(ctx, '#ff5a6a', 18 + pulse * 16, 0.55 + pulse * 0.25, 0.16, 0.12, cx, cy);
    ctx.fillStyle = '#ff5a6a';
    ctx.beginPath();
    ctx.arc(cx, cy, 5 + pulse * 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255, 214, 220, ${0.25 + pulse * 0.6})`;
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
        const y = cy - 12 + i * 8;
        const reach = 8 + pulse * 18;
        ctx.beginPath();
        ctx.moveTo(cx - 8, y);
        ctx.lineTo(cx - 8 - reach, y + (i - 1.5) * 1.2);
        ctx.stroke();
    }
}

function pqrst(t: number): number {
    const keys: Array<[number, number]> = [
        [0, 0], [0.14, 0], [0.2, 14], [0.26, 0], [0.36, 0],
        [0.395, -16], [0.43, 74], [0.465, -28], [0.5, 0],
        [0.62, 0], [0.72, 22], [0.82, 0], [1, 0],
    ];
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
        const [t0, a0] = keys[i - 1];
        const [t1, a1] = keys[i];
        if (t <= t1) return a0 + (a1 - a0) * ((t - t0) / (t1 - t0 || 1));
    }
    return 0;
}

function paintEcg(ctx: CanvasRenderingContext2D, time: number, w: number, h: number) {
    const cy = h * 0.58;
    ctx.strokeStyle = 'rgba(255, 186, 196, 0.16)';
    ctx.lineWidth = 1;
    for (const dy of [-16, 16]) {
        ctx.beginPath();
        ctx.moveTo(10, cy + dy);
        ctx.lineTo(w - 10, cy + dy);
        ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255, 210, 216, 0.28)';
    ctx.beginPath();
    ctx.moveTo(8, cy);
    ctx.lineTo(w - 8, cy);
    ctx.stroke();
    const shift = (time / 2400) % 1;
    const pts: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= 72; i++) {
        const u = i / 72;
        const x = 8 + u * (w - 16);
        const wave = pqrst((u * 1.15 + shift) % 1) * 0.26;
        pts.push({ x, y: cy - wave });
    }
    const stroke = (width: number, color: string) => {
        ctx.beginPath();
        pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineJoin = 'miter';
        ctx.miterLimit = 2.5;
        ctx.stroke();
    };
    stroke(6, 'rgba(255, 36, 64, 0.28)');
    stroke(1.7, '#fff6f7');
    let peak = pts[0];
    for (const p of pts) if (p.y < peak.y) peak = p;
    ctx.strokeStyle = 'rgba(255, 220, 226, 0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(peak.x - 7, peak.y);
    ctx.lineTo(peak.x + 7, peak.y);
    ctx.moveTo(peak.x, peak.y - 7);
    ctx.lineTo(peak.x, peak.y + 7);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(peak.x, peak.y, 2.2, 0, Math.PI * 2);
    ctx.fill();
    const travel = (time / 1000 * 0.85) % 1;
    ctx.save();
    ctx.globalAlpha = (1 - travel) * 0.7;
    ctx.strokeStyle = '#ff4a62';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(peak.x, peak.y, 5 + travel * 22, 3 + travel * 8, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

function paintClot(ctx: CanvasRenderingContext2D, time: number, w: number, h: number) {
    const spin = time / 700;
    const r = 24;
    const x = w / 2 + Math.sin(time / 1100) * 4;
    const y = h / 2 + Math.sin(time / 800) * 1.4;
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = 'rgba(255, 186, 186, 0.32)';
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
        const a = spin + i * 1.35;
        const ox = r * 0.35 + Math.cos(a) * r * 0.12;
        const oy = Math.sin(a) * r * 0.42;
        ctx.beginPath();
        ctx.moveTo(ox * 0.25, oy * 0.25);
        ctx.quadraticCurveTo(ox + 8, oy - 7, ox + 18, oy + 3);
        ctx.stroke();
    }
    ctx.beginPath();
    const n = 18;
    for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2;
        const lobe = 1 + 0.13 * Math.sin(a * 3 + spin) + 0.05 * Math.sin(a * 5 - spin);
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
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = 'rgba(36, 6, 10, 0.75)';
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 240, 240, 0.8)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.22, -r * 0.16, Math.max(3, r * 0.14), Math.max(1.5, r * 0.055), -0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function windSheet(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, bend: number, alpha: number) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + len * 0.5, y + bend, x + len, y + 1);
    ctx.globalAlpha = alpha * 0.55;
    ctx.strokeStyle = 'rgba(255, 236, 242, 0.9)';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#fffafb';
    ctx.lineWidth = 1.3;
    ctx.stroke();
}

function paintGust(ctx: CanvasRenderingContext2D, time: number, w: number, h: number) {
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
        const travel = ((time / 900 + i * 0.16) % 1);
        const x = -30 + (1 - travel) * (w + 50);
        const y = 12 + i * ((h - 22) / 4);
        windSheet(ctx, x, y, 34 + (i % 3) * 8, (i % 2 === 0 ? -1 : 1) * 7, 0.55 + (i % 2) * 0.3);
    }
    ctx.globalAlpha = 1;
}

function paintCough(ctx: CanvasRenderingContext2D, time: number, w: number, h: number) {
    const beat = 0.5 + 0.5 * Math.sin(time / 170);
    const warn = 0.45 + 0.55 * beat;
    const y0 = h * 0.22;
    const band = h * 0.56;
    const edge = 0.24 + warn * 0.32 + beat * 0.12;
    const mid = 0.05 + warn * 0.1;
    const wash = ctx.createLinearGradient(0, y0, 0, y0 + band);
    wash.addColorStop(0, `rgba(255, 70, 100, ${edge})`);
    wash.addColorStop(0.18, `rgba(255, 170, 186, ${mid})`);
    wash.addColorStop(0.5, `rgba(255, 150, 168, ${mid * 0.45})`);
    wash.addColorStop(0.82, `rgba(255, 170, 186, ${mid})`);
    wash.addColorStop(1, `rgba(255, 70, 100, ${edge})`);
    ctx.fillStyle = wash;
    ctx.fillRect(0, y0, w, band);
    const rail = 2 + warn * 4 + beat;
    ctx.fillStyle = `rgba(255, 214, 222, ${0.35 + warn * 0.5 + beat * 0.2})`;
    ctx.fillRect(0, y0, w, rail);
    ctx.fillRect(0, y0 + band - rail, w, rail);
    ctx.strokeStyle = `rgba(255, 236, 240, ${0.25 + warn * 0.55})`;
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 8; i++) {
        const x = (i + 0.5) * (w / 8);
        const reach = 6 + warn * 10 + beat * 4;
        ctx.beginPath();
        ctx.moveTo(x, y0 + rail);
        ctx.lineTo(x, y0 + rail + reach);
        ctx.moveTo(x, y0 + band - rail);
        ctx.lineTo(x, y0 + band - rail - reach);
        ctx.stroke();
    }
}

function paintOxygen(ctx: CanvasRenderingContext2D, time: number, w: number, h: number) {
    const bob = Math.sin(time / 260) * 1.6;
    const pulse = 0.5 + 0.5 * Math.sin(time / 180);
    motes(ctx, time, w, h, '#b7f2ff');
    ctx.save();
    ctx.translate(w / 2, h / 2 + 4 + bob);
    ctx.scale(0.72, 0.72);
    ctx.fillStyle = `rgba(168, 228, 244, ${0.08 + pulse * 0.08})`;
    ctx.beginPath();
    ctx.arc(0, -2, 44 + pulse * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(198, 244, 255, ${0.35 + pulse * 0.4})`;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(236, 252, 255, 0.95)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-7, -6);
    ctx.lineTo(7, -6);
    ctx.moveTo(-7, 0);
    ctx.lineTo(7, 0);
    ctx.stroke();
    const atom = (x: number, y: number) => {
        const g = ctx.createRadialGradient(x - 5, y - 6, 2, x, y, 16);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.38, '#b7f2ff');
        g.addColorStop(1, '#2f93ad');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
        ctx.beginPath();
        ctx.ellipse(x - 4, y - 4, 3, 1.8, -0.6, 0, Math.PI * 2);
        ctx.fill();
    };
    atom(-18, -2);
    atom(18, -2);
    ctx.restore();
}

function quad(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }, t: number) {
    const u = 1 - t;
    return {
        x: u * u * a.x + 2 * u * t * b.x + t * t * c.x,
        y: u * u * a.y + 2 * u * t * b.y + t * t * c.y,
    };
}

function paintSynapse(ctx: CanvasRenderingContext2D, time: number, w: number, h: number) {
    const a = { x: 26, y: h * 0.62 };
    const b = { x: w - 28, y: h * 0.4 };
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const bulge = 16;
    const mid = { x: (a.x + b.x) / 2 + nx * bulge, y: (a.y + b.y) / 2 + ny * bulge };
    const cleft = { x: a.x + dx * 0.66, y: a.y + dy * 0.66 };
    const after = { x: a.x + dx * 0.78, y: a.y + dy * 0.78 };
    const spine = { x: after.x + nx * 11, y: after.y + ny * 11 };
    const pts: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= 14; i++) pts.push(quad(a, mid, cleft, i / 14));
    const tail: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= 8; i++) tail.push(quad(after, spine, b, i / 8));
    const fired = (time % 1500) < 980;
    const breathe = 0.8 + 0.2 * Math.sin(time / 220);
    const stroke = (from: Array<{ x: number; y: number }>, width: number, color: string) => {
        ctx.beginPath();
        from.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    };
    if (!fired) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.45 * breathe;
        stroke(pts, 7, '#b48cff');
        ctx.restore();
        ctx.globalAlpha = 0.9 * breathe;
        stroke(pts, 2.2, '#efe6ff');
        ctx.globalAlpha = 1;
    } else {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        stroke(pts, 8, 'rgba(180, 140, 255, 0.45)');
        ctx.restore();
        stroke(pts, 2.2, '#f4edff');
        stroke(tail, 1.8, '#9ad7ff');
        const bulb = pts[pts.length - 1];
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(bulb.x, bulb.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillStyle = '#d7c6ff';
    ctx.globalAlpha = fired ? 1 : 0.85 * breathe;
    ctx.beginPath();
    ctx.arc(a.x, a.y, fired ? 5.5 : 4.6, 0, Math.PI * 2);
    ctx.arc(b.x, b.y, fired ? 4.6 : 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
}

function paintFocus(ctx: CanvasRenderingContext2D, time: number, w: number, h: number) {
    const bob = Math.sin(time / 260) * 1.6;
    const pulse = 0.5 + 0.5 * Math.sin(time / 190);
    motes(ctx, time, w, h, '#e2c6ff');
    ctx.save();
    ctx.translate(w / 2, h / 2 + bob);
    ctx.scale(0.74, 0.74);
    ctx.fillStyle = `rgba(196, 150, 255, ${0.08 + pulse * 0.08})`;
    ctx.beginPath();
    ctx.arc(0, -2, 44 + pulse * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(226, 198, 255, ${0.35 + pulse * 0.4})`;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    const drop = ctx.createRadialGradient(-6, -12, 3, 0, -2, 28);
    drop.addColorStop(0, '#fff8ff');
    drop.addColorStop(0.35, '#d7b4ff');
    drop.addColorStop(1, '#6a34a8');
    ctx.fillStyle = drop;
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.bezierCurveTo(22, -8, 18, 12, 0, 22);
    ctx.bezierCurveTo(-18, 12, -22, -8, 0, -30);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 248, 255, 0.75)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.ellipse(-6, -10, 3.6, 6, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function paintDash(ctx: CanvasRenderingContext2D, time: number, w: number, h: number) {
    const r = 11;
    const k = (time % 1300) / 1300;
    const x = 36 + k * (w - 72);
    const y = h / 2;
    motes(ctx, time, w, h, '#7ef6ff');
    for (let i = 3; i >= 1; i--) {
        ctx.save();
        ctx.globalAlpha = 0.22 - i * 0.04;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(x - i * 14, y, r * 1.5, r * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    glow(ctx, '#00ffff', r * 3, 0.7, null, 0.08, x, y);
    ctx.save();
    ctx.translate(x, y);
    vitalBody(ctx, time, r, true);
    ctx.restore();
}

function miniCoin(ctx: CanvasRenderingContext2D, time: number, r: number) {
    const spin = Math.cos(time / 280);
    const sx = Math.max(0.22, Math.abs(spin));
    ctx.save();
    ctx.scale(sx, 1);
    const g = ctx.createRadialGradient(-r * 0.32, -r * 0.38, r * 0.05, 0, 0, r);
    g.addColorStop(0, '#fffef4');
    g.addColorStop(0.34, '#ffd15a');
    g.addColorStop(0.74, '#f0a018');
    g.addColorStop(1, '#a85a08');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6a3808';
    ctx.lineWidth = Math.max(1, r * 0.14);
    ctx.stroke();
    if (sx > 0.45) {
        ctx.strokeStyle = '#5c320c';
        ctx.lineWidth = Math.max(1, r * 0.16);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.38);
        ctx.bezierCurveTo(r * 0.3, -r * 0.05, -r * 0.3, r * 0.05, 0, r * 0.38);
        ctx.moveTo(0, -r * 0.38);
        ctx.bezierCurveTo(-r * 0.3, -r * 0.05, r * 0.3, r * 0.05, 0, r * 0.38);
        ctx.stroke();
    }
    ctx.restore();
}

function paintSurge(ctx: CanvasRenderingContext2D, time: number, w: number, h: number) {
    const cx = w / 2;
    const cy = h / 2;
    const k = (time % 1500) / 1500;
    const bands = [1, 0.74, 0.5, 0.28];
    motes(ctx, time, w, h, '#9af6ff');
    ctx.save();
    ctx.lineJoin = 'round';
    for (let i = 0; i < bands.length; i++) {
        const rr = Math.max(5, (8 + k * 34) * bands[i]);
        const fade = 1 - i * 0.16;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx.globalAlpha = 0.18 * fade * (1 - k * 0.35);
        ctx.lineWidth = 7 - i;
        ctx.strokeStyle = '#5eefff';
        ctx.stroke();
        ctx.globalAlpha = 0.85 * fade * (1 - k * 0.2);
        ctx.lineWidth = Math.max(1.1, 2.2 - i * 0.3);
        ctx.strokeStyle = '#f7feff';
        ctx.stroke();
    }
    ctx.restore();
    for (let i = 0; i < 4; i++) {
        const a = i * 1.57 + time / 1100;
        const rad = 30 * (1 - k);
        ctx.save();
        ctx.globalAlpha = 0.45 + (1 - k) * 0.55;
        ctx.translate(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * 0.62);
        miniCoin(ctx, time + i * 180, 5.2);
        ctx.restore();
    }
    glow(ctx, '#00ffff', 28, 0.45, null, 0.1, cx, cy);
    ctx.save();
    ctx.translate(cx, cy);
    vitalBody(ctx, time, 12, false);
    ctx.restore();
}

const PAINT: Record<Exclude<AtlasKind, 'boss'>, (ctx: CanvasRenderingContext2D, time: number, w: number, h: number) => void> = {
    vital: paintVital,
    bacteria: paintBacteria,
    virus: paintVirus,
    fungi: paintFungi,
    parasite: paintParasite,
    plaque: paintPlaque,
    saliva: paintSaliva,
    bite: paintBite,
    enamel: paintEnamel,
    bile: paintBile,
    filter: paintFilter,
    heal: paintHeal,
    beat: paintBeat,
    ecg: paintEcg,
    clot: paintClot,
    gust: paintGust,
    cough: paintCough,
    oxygen: paintOxygen,
    synapse: paintSynapse,
    focus: paintFocus,
    dash: paintDash,
    surge: paintSurge,
};

export function paintBoss(ctx: CanvasRenderingContext2D, spec: BossSpec, time: number, w: number, h: number, veil = 1) {
    reset(ctx);
    backdrop(ctx, w, h, rgba(spec.color, 0.2));
    const fit = Math.min(w, h) * 0.4;
    const s = fit / spec.radius;
    const x = w / 2;
    const y = h / 2;
    ctx.save();
    ctx.globalAlpha = veil;
    glow(ctx, spec.color, fit * 1.85, 0.5, 0.16, 0.1, x, y);
    ctx.translate(x, y);
    ctx.scale(s, s);
    drawBossShape(ctx, spec.shape, spec.color, spec.accent, spec.radius, time);
    ctx.restore();
}

function paintRoster(ctx: CanvasRenderingContext2D, time: number, w: number, h: number) {
    const hold = 4200;
    const n = BOSSES.length;
    const slot = time / hold;
    const i = Math.floor(slot) % n;
    const u = slot - Math.floor(slot);
    const veil = u < 0.05 ? u / 0.05 : u > 0.94 ? (1 - u) / 0.06 : 1;
    paintBoss(ctx, BOSSES[i], time, w, h, veil);
}

export function paintAtlas(ctx: CanvasRenderingContext2D, kind: AtlasKind, time: number, w: number, h: number) {
    reset(ctx);
    if (kind === 'boss') {
        paintRoster(ctx, time, w, h);
        return;
    }
    backdrop(ctx, w, h, TINT[kind]);
    PAINT[kind](ctx, time, w, h);
}

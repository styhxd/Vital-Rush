import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export type Buzz = 'boom' | 'thud' | 'tap' | 'sting';

let lastBody = 0;

export function buzz(kind: Buzz) {
    const now = Date.now();
    if (kind === 'tap' || kind === 'sting') {
        if (now - lastBody < 280) return;
        lastBody = now;
    }
    if (Capacitor.isNativePlatform()) {
        const pulse = kind === 'boom'
            ? Haptics.vibrate({ duration: 110 })
            : kind === 'sting'
                ? Haptics.impact({ style: ImpactStyle.Medium })
                : kind === 'tap'
                    ? Haptics.impact({ style: ImpactStyle.Light })
                    : Haptics.impact({ style: ImpactStyle.Heavy });
        void pulse.catch(() => vibrateWeb(kind));
        return;
    }
    vibrateWeb(kind);
}

function vibrateWeb(kind: Buzz) {
    const pattern = kind === 'boom' ? [0, 28, 36, 90]
        : kind === 'thud' ? [0, 22, 28, 64]
        : kind === 'sting' ? [0, 16]
        : [0, 10];
    try {
        navigator.vibrate?.(pattern);
    } catch {
        /* desktop browsers ignore this */
    }
}

let lastHum = 0;

/** Pressão do linfonodo. Começa leve e aperta conforme o nível sobe. */
export function hum(level: number) {
    const now = Date.now();
    const t = Math.max(0, Math.min(1, level));
    const gap = Math.round(260 - t * 170);
    if (now - lastHum < gap) return;
    lastHum = now;
    if (Capacitor.isNativePlatform()) {
        const pulse = t > 0.72
            ? Haptics.vibrate({ duration: Math.round(16 + t * 40) })
            : t > 0.38
                ? Haptics.impact({ style: ImpactStyle.Medium })
                : Haptics.impact({ style: ImpactStyle.Light });
        void pulse.catch(() => vibrateHum(t));
        return;
    }
    vibrateHum(t);
}

function vibrateHum(t: number) {
    try {
        navigator.vibrate?.(Math.round(8 + t * 28));
    } catch {
        /* desktop browsers ignore this */
    }
}

let lastCrown = 0;

/** O upgrade fechou. Um golpe e um toque, não o baque de dano. */
export function crownBuzz() {
    const now = Date.now();
    if (now - lastCrown < 420) return;
    lastCrown = now;
    if (Capacitor.isNativePlatform()) {
        void Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
        window.setTimeout(() => {
            void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
        }, 90);
        return;
    }
    try {
        navigator.vibrate?.([0, 22, 46, 14]);
    } catch {
        /* desktop browsers ignore this */
    }
}

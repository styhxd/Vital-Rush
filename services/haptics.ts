import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export type Buzz = 'boom' | 'thud';

export function buzz(kind: Buzz) {
    if (Capacitor.isNativePlatform()) {
        const pulse = kind === 'boom'
            ? Haptics.vibrate({ duration: 110 })
            : Haptics.impact({ style: ImpactStyle.Heavy });
        void pulse.catch(() => vibrateWeb(kind));
        return;
    }
    vibrateWeb(kind);
}

function vibrateWeb(kind: Buzz) {
    const pattern = kind === 'boom' ? [0, 28, 36, 90] : [0, 22, 28, 64];
    try {
        navigator.vibrate?.(pattern);
    } catch {
        /* desktop browsers ignore this */
    }
}

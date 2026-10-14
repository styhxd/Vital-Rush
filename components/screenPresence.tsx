import React, { useEffect, useState } from 'react';

const EXIT_MS = 340;

export function useScreenPresence(show: boolean) {
    const [alive, setAlive] = useState(show);

    useEffect(() => {
        if (show) {
            setAlive(true);
            return;
        }
        const id = window.setTimeout(() => setAlive(false), EXIT_MS);
        return () => window.clearTimeout(id);
    }, [show]);

    return {
        alive: show || alive,
        phase: (show ? 'in' : 'out') as 'in' | 'out'
    };
}

export const motionClass = (phase: 'in' | 'out') => (phase === 'in' ? 'screen-in' : 'screen-out');

export const ScreenPresence: React.FC<{
    show: boolean;
    children: (phase: 'in' | 'out') => React.ReactNode;
}> = ({ show, children }) => {
    const present = useScreenPresence(show);
    if (!present.alive) return null;
    return <>{children(present.phase)}</>;
};

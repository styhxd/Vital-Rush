import React from 'react';
import { Difficulty, Language, PatientProfile } from '../types';
import { isCanonRoute, symptomText } from '../services/casebook';
import { TEXTS } from '../constants';

const BACKGROUND = new URL('../src/assets/background.jpg', import.meta.url).href;

const inkOf = (isPlatinum: boolean) => ({
    ink: isPlatinum ? '#7c4a12' : '#7f1d1d',
    band: isPlatinum ? '#b45309' : '#b91c1c',
});

const chartStyles = `
.chart-sheet {
    width: min(40rem, calc(100vw - 4.5rem));
    max-height: calc(100dvh - 2.25rem);
    overflow-y: auto;
}
.chart-pad { padding: 0.7rem 0.9rem 0.65rem 2.7rem; }
.chart-title { font-size: 1.55rem; }
.chart-name { font-size: 1.35rem; }
@media (max-height: 520px) {
    .chart-sheet { width: min(42rem, calc(100vw - 2.75rem)); max-height: calc(100dvh - 1.1rem); }
    .chart-pad { padding: 0.4rem 0.7rem 0.4rem 2.15rem; }
    .chart-title { font-size: 1.2rem; }
    .chart-name { font-size: 1.15rem; }
    .chart-rule { padding-bottom: 0.35rem; }
    .chart-ecg { height: 0.85rem; margin-top: 0.1rem; }
    .chart-patient { margin-top: 0.15rem; }
    .chart-fields { margin-top: 0.35rem; gap: 0.35rem; }
    .chart-actions { margin-top: 0.4rem; }
    .chart-actions button { padding-top: 0.4rem; padding-bottom: 0.4rem; }
    .chart-back { margin-top: 0.3rem; }
}
.chart-go {
    background: #17824c;
    color: #f4fff8;
    box-shadow: 0 5px 0 #0c4a2b;
}
.chart-go:hover { filter: brightness(1.06); }
.chart-lab {
    position: relative;
    isolation: isolate;
    background:
        linear-gradient(180deg, rgba(255, 252, 246, 0.42), rgba(255, 220, 150, 0.22) 42%, rgba(255, 196, 96, 0.34)),
        radial-gradient(80% 90% at 50% 115%, rgba(255, 186, 64, 0.55), transparent 62%);
    backdrop-filter: blur(7px);
    box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.92),
        inset 0 0 22px rgba(255, 214, 120, 0.72),
        inset 0 -10px 18px rgba(160, 84, 16, 0.22),
        0 0 0 1px rgba(176, 112, 32, 0.38);
    animation: chart-lab-breathe 2.2s ease-in-out infinite;
}
.chart-lab-label { position: relative; z-index: 2; }
.chart-lab-core {
    position: absolute;
    inset: 18% 14%;
    border-radius: inherit;
    pointer-events: none;
    z-index: 1;
    background: radial-gradient(circle, rgba(255, 244, 210, 0.95) 0%, rgba(255, 196, 80, 0.42) 46%, transparent 72%);
    animation: chart-lab-core 2.2s ease-in-out infinite;
}
.chart-lab-sheen {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    z-index: 1;
}
.chart-lab-sheen::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(112deg, transparent 30%, rgba(255, 228, 150, 0.2) 42%, rgba(255, 255, 255, 0.9) 50%, rgba(255, 214, 120, 0.34) 58%, transparent 70%);
    transform: translateX(-135%);
    animation: chart-lab-sheen 2.7s ease-in-out infinite;
}
@keyframes chart-lab-breathe {
    0%, 100% {
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.85), inset 0 0 16px rgba(255, 210, 120, 0.55), inset 0 -10px 16px rgba(160, 84, 16, 0.18), 0 0 0 1px rgba(176, 112, 32, 0.32);
        filter: brightness(1);
    }
    50% {
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 1), inset 0 0 28px rgba(255, 196, 70, 0.95), inset 0 -8px 18px rgba(176, 96, 16, 0.28), 0 0 0 1px rgba(176, 112, 32, 0.5);
        filter: brightness(1.08);
    }
}
@keyframes chart-lab-core {
    0%, 100% { opacity: 0.55; transform: scale(0.86); }
    50% { opacity: 1; transform: scale(1); }
}
@keyframes chart-lab-sheen {
    0%, 36% { transform: translateX(-135%); }
    70%, 100% { transform: translateX(135%); }
}
@media (prefers-reduced-motion: reduce) {
    .chart-lab, .chart-lab-sheen::after, .chart-lab-core { animation: none; }
}
.chart-abandon {
    margin-top: 0.45rem;
    display: block;
    margin-left: auto;
    margin-right: auto;
    font-size: 9px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    opacity: 0.55;
}
.chart-abandon:hover { opacity: 1; }
@keyframes chart-arrive {
    from { opacity: 0; }
    to { opacity: 1; }
}
.chart-arrive {
    animation: chart-arrive 0.85s ease both;
}
@media (min-width: 1024px) and (min-height: 700px) {
    .chart-sheet { width: min(48rem, calc(100vw - 6rem)); }
    .chart-pad { padding: 1.35rem 2rem 1.4rem 4rem; }
    .chart-title { font-size: 2.25rem; }
    .chart-name { font-size: 2.25rem; }
}
`;

const officialMark = (language: Language) => {
    if (language === 'PT') return { seal: 'ROTA OFICIAL', line: 'molar · fígado · coração · pulmão · cérebro', note: 'A via que a história vai contar.' };
    if (language === 'ES') return { seal: 'RUTA OFICIAL', line: 'molar · hígado · corazón · pulmón · cerebro', note: 'La vía que la historia va a contar.' };
    return { seal: 'OFFICIAL ROUTE', line: 'molar · liver · heart · lung · brain', note: 'The road the story will follow.' };
};

const ChartPaper = ({
    title, stamp, stampColor, isPlatinum, official = false, officialSeal, motion = 'in', arrive = 'snap', children
}: {
    title: string;
    stamp: string;
    stampColor?: string;
    isPlatinum: boolean;
    official?: boolean;
    officialSeal?: string;
    motion?: 'in' | 'out';
    arrive?: 'snap' | 'soft';
    children: React.ReactNode;
}) => {
    const base = inkOf(isPlatinum);
    const ink = official ? '#6a4512' : base.ink;
    const band = official ? '#b8860b' : base.band;
    const motionClass = motion === 'out' ? 'screen-out' : arrive === 'soft' ? 'chart-arrive' : 'screen-in';
    return (
        <div className={`absolute inset-0 z-50 flex items-center justify-center p-3 lg:p-8 overflow-hidden ${motionClass}`}>
            <style>{chartStyles}</style>
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${BACKGROUND})` }} />
            <div className="absolute inset-0 bg-black/60" />

            <article
                className="chart-sheet relative shadow-[0_18px_50px_rgba(0,0,0,0.55)]"
                style={{
                    background: official
                        ? 'linear-gradient(165deg, #fff8e6 0%, #f6e2a8 42%, #e8c56a 100%)'
                        : 'linear-gradient(180deg, #f8f1e3 0%, #f3e6d0 100%)',
                    color: official ? '#3a2a10' : '#2b1614',
                    boxShadow: official ? '0 18px 50px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(184,134,11,0.45)' : undefined,
                }}
            >
                <div className="absolute left-0 top-0 bottom-0 w-7 lg:w-11" style={{ background: band }}>
                    <div className="absolute left-1/2 top-[18%] -translate-x-1/2 w-2.5 h-2.5 lg:w-4 lg:h-4 rounded-full bg-[#f8f1e3] shadow-inner" />
                    <div className="absolute left-1/2 top-[34%] -translate-x-1/2 w-2.5 h-2.5 lg:w-4 lg:h-4 rounded-full bg-[#f8f1e3] shadow-inner" />
                </div>

                <div className="chart-pad">
                    <header className="chart-rule flex items-start justify-between gap-3 border-b pb-2" style={{ borderColor: `${ink}33` }}>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="relative w-3.5 h-3.5 lg:w-5 lg:h-5 shrink-0" aria-hidden>
                                    <span className="absolute left-1/2 top-0 bottom-0 w-[3px] -translate-x-1/2" style={{ background: band }} />
                                    <span className="absolute top-1/2 left-0 right-0 h-[3px] -translate-y-1/2" style={{ background: band }} />
                                </span>
                                <span className="text-[9px] lg:text-xs tracking-[0.28em] font-bold" style={{ color: ink }}>VITAL RUSH</span>
                                {official && officialSeal && (
                                    <span
                                        className="border px-1.5 py-px text-[8px] lg:text-[10px] tracking-[0.28em] font-bold"
                                        style={{ borderColor: band, color: '#5c3b08', background: 'linear-gradient(180deg, #fff6d0, #e8c56a)' }}
                                    >
                                        {officialSeal}
                                    </span>
                                )}
                            </div>
                            <h2 className="chart-title mt-0.5 leading-none" style={{ fontFamily: 'Georgia, "Palatino Linotype", serif' }}>
                                {title}
                            </h2>
                        </div>
                        <div
                            className="shrink-0 border-2 px-1.5 py-0.5 text-[8px] lg:text-[11px] font-bold tracking-[0.18em] rotate-[-8deg]"
                            style={{ borderColor: stampColor || ink, color: stampColor || ink, opacity: 0.72 }}
                        >
                            {stamp}
                        </div>
                    </header>

                    <svg viewBox="0 0 600 28" className="chart-ecg w-full h-4 lg:h-7 mt-1" aria-hidden>
                        <polyline
                            fill="none"
                            stroke={band}
                            strokeWidth="2"
                            points="0,16 48,16 62,12 74,16 92,16 100,16 108,6 116,26 124,9 132,16 160,16 188,11 206,16 600,16"
                        />
                    </svg>

                    {children}
                </div>
            </article>
        </div>
    );
};

const Field = ({ label, value, ink, accent }: { label: string; value: string; ink: string; accent?: string }) => (
    <div className="border-t pt-1 lg:pt-2" style={{ borderColor: `${ink}33` }}>
        <div className="text-[8px] lg:text-[10px] tracking-[0.16em] font-bold" style={{ color: ink }}>{label}</div>
        <div
            className="mt-0.5 text-xs lg:text-base font-semibold leading-tight"
            style={accent ? { color: accent } : undefined}
        >
            {value}
        </div>
    </div>
);

const PatientLine = ({ patient, language, ink }: { patient: PatientProfile; language: Language; ink: string }) => {
    const t = (key: string) => TEXTS[language][key] || key;
    return (
        <div className="chart-patient mt-1 lg:mt-3 flex flex-wrap items-end justify-between gap-2">
            <div>
                <div className="text-[8px] lg:text-[10px] tracking-[0.22em] font-bold" style={{ color: ink }}>{t('CHART_PATIENT')}</div>
                <div className="chart-name leading-none mt-0.5" style={{ fontFamily: 'Georgia, "Palatino Linotype", serif' }}>
                    {patient.name}
                </div>
            </div>
            <div className="text-right font-mono text-[10px] lg:text-sm" style={{ color: '#5c403c' }}>
                <div>VR-{patient.id.padStart(5, '0')}</div>
                <div>{patient.age} {t('CHART_AGE')}</div>
            </div>
        </div>
    );
};

interface PatientChartProps {
    patient: PatientProfile;
    language: Language;
    difficulty: Difficulty;
    isPlatinum: boolean;
    onPlay: () => void;
    onLab: () => void;
    onBack: () => void;
    motion?: 'in' | 'out';
}

export const PatientChart: React.FC<PatientChartProps> = ({
    patient, language, difficulty, isPlatinum, onPlay, onLab, onBack, motion
}) => {
    const t = (key: string) => TEXTS[language][key] || key;
    const official = isCanonRoute(patient.route);
    const { ink, band } = official ? { ink: '#6a4512', band: '#b8860b' } : inkOf(isPlatinum);
    const mark = officialMark(language);

    return (
        <ChartPaper title={t('CHART_TITLE')} stamp={t('CHART_STAMP')} isPlatinum={isPlatinum} official={official} officialSeal={mark.seal} motion={motion}>
            <PatientLine patient={patient} language={language} ink={ink} />
            {official && (
                <div className="mt-1">
                    <div className="text-[9px] lg:text-xs tracking-[0.18em] font-semibold" style={{ color: band }}>{mark.line}</div>
                    <div className="mt-0.5 text-[9px] lg:text-[11px] italic" style={{ color: ink }}>{mark.note}</div>
                </div>
            )}

            <div className="chart-fields mt-2 lg:mt-5 grid grid-cols-3 gap-2 lg:gap-3">
                <div className="col-span-3">
                    <Field label={t('LABEL_SYMPTOMS')} value={symptomText(patient.route, language)} ink={ink} />
                </div>
                <Field label={t('STRAIN')} value={t(`STRAIN_${patient.strain}`)} ink={ink} />
                <Field label={t('DIFFICULTY')} value={t(`DIFF_${difficulty}`)} ink={ink} accent={band} />
            </div>

            <div className="chart-actions mt-2 lg:mt-6 flex flex-row gap-2 lg:gap-3">
                <button
                    onClick={onLab}
                    className="chart-lab flex-1 py-2 lg:py-4 border-2 font-bold tracking-[0.16em] text-[10px] lg:text-sm uppercase transition-colors hover:bg-black/5"
                    style={{ borderColor: ink, color: ink }}
                >
                    <span className="chart-lab-core" aria-hidden="true" />
                    <span className="chart-lab-sheen" aria-hidden="true" />
                    <span className="chart-lab-label">{t('CHART_LAB')}</span>
                </button>
                <button
                    onClick={onPlay}
                    className="flex-[1.6] py-2 lg:py-4 font-bold tracking-[0.18em] text-[11px] lg:text-base uppercase text-black transition-transform hover:scale-[1.01]"
                    style={{ background: band, boxShadow: `0 5px 0 ${ink}` }}
                >
                    {t('CHART_PLAY')}
                </button>
            </div>

            <button
                onClick={onBack}
                className="chart-back mt-1.5 lg:mt-4 block mx-auto text-[9px] lg:text-xs tracking-[0.22em] uppercase opacity-60 hover:opacity-100"
                style={{ color: ink }}
            >
                {t('CHART_BACK')}
            </button>
        </ChartPaper>
    );
};

interface OutcomeChartProps {
    variant: 'cleared' | 'lost';
    patient: PatientProfile | null;
    language: Language;
    isPlatinum: boolean;
    wave: number;
    biomass: number;
    score: number;
    onPrimary: () => void;
    onSecondary?: () => void;
    onAbandon?: () => void;
    motion?: 'in' | 'out';
}

export const OutcomeChart: React.FC<OutcomeChartProps> = ({
    variant, patient, language, isPlatinum, wave, biomass, score, onPrimary, onSecondary, onAbandon, motion
}) => {
    const t = (key: string) => TEXTS[language][key] || key;
    const official = isCanonRoute(patient?.route);
    const { ink, band } = official ? { ink: '#6a4512', band: '#b8860b' } : inkOf(isPlatinum);
    const cleared = variant === 'cleared';
    const stampColor = cleared ? '#166534' : ink;
    const mark = officialMark(language);

    return (
        <ChartPaper
            title={cleared ? t('CLEARED') : t('GAME_OVER')}
            stamp={cleared ? t('CHART_STAMP_OK') : t('CHART_STAMP_LOST')}
            stampColor={stampColor}
            isPlatinum={isPlatinum}
            official={official}
            officialSeal={official ? mark.seal : undefined}
            motion={motion}
            arrive={cleared ? 'soft' : 'snap'}
        >
            {patient && <PatientLine patient={patient} language={language} ink={ink} />}
            {official && (
                <div className="mt-1">
                    <div className="text-[9px] lg:text-xs tracking-[0.18em] font-semibold" style={{ color: band }}>{mark.line}</div>
                    <div className="mt-0.5 text-[9px] lg:text-[11px] italic" style={{ color: ink }}>{mark.note}</div>
                </div>
            )}

            <div className="chart-fields mt-2 lg:mt-5 grid grid-cols-2 gap-2 lg:gap-3">
                {cleared ? (
                    <>
                        <Field label={t('WAVE')} value={String(wave)} ink={ink} />
                        <Field label={t('BIOMASS_AVAIL')} value={String(Math.round(biomass))} ink={ink} accent={band} />
                    </>
                ) : (
                    <>
                        <Field label={t('SCORE')} value={score.toString().padStart(6, '0')} ink={ink} />
                        <Field label={t('WAVE')} value={String(wave)} ink={ink} accent={band} />
                    </>
                )}
            </div>

            {!cleared && (
                <div className="mt-4 text-center font-mono text-[11px] lg:text-sm tracking-[0.22em]" style={{ color: ink }}>
                    {t('STATUS_TERM')}
                </div>
            )}

            <div className="chart-actions mt-2 lg:mt-6 flex flex-row gap-2 lg:gap-3">
                {cleared && onSecondary && (
                    <button
                        onClick={onSecondary}
                        className="chart-lab flex-1 py-2 lg:py-4 border-2 font-bold tracking-[0.16em] text-[10px] lg:text-sm uppercase transition-colors hover:bg-black/5"
                        style={{ borderColor: ink, color: ink }}
                    >
                        <span className="chart-lab-core" aria-hidden="true" />
                    <span className="chart-lab-sheen" aria-hidden="true" />
                        <span className="chart-lab-label">{t('MUTATION')}</span>
                    </button>
                )}
                <button
                    onClick={onPrimary}
                    className={`flex-[1.6] py-2 lg:py-4 font-bold tracking-[0.18em] text-[11px] lg:text-base uppercase transition-transform hover:scale-[1.01] ${cleared ? 'chart-go' : ''}`}
                    style={cleared ? undefined : { background: band, color: '#000', boxShadow: `0 5px 0 ${ink}` }}
                >
                    {cleared ? t('NEXT') : t('RETRY')}
                </button>
            </div>
            {cleared && onAbandon && (
                <button onClick={onAbandon} className="chart-abandon" style={{ color: ink }}>
                    {t('ABANDON_RUN')}
                </button>
            )}
        </ChartPaper>
    );
};

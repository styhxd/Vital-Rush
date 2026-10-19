import React from 'react';
import { Difficulty, Language, PatientProfile } from '../types';
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
@media (min-width: 1024px) and (min-height: 700px) {
    .chart-sheet { width: min(48rem, calc(100vw - 6rem)); }
    .chart-pad { padding: 1.35rem 2rem 1.4rem 4rem; }
    .chart-title { font-size: 2.25rem; }
    .chart-name { font-size: 2.25rem; }
}
`;

const ChartPaper = ({
    title, stamp, stampColor, isPlatinum, motion = 'in', children
}: {
    title: string;
    stamp: string;
    stampColor?: string;
    isPlatinum: boolean;
    motion?: 'in' | 'out';
    children: React.ReactNode;
}) => {
    const { ink, band } = inkOf(isPlatinum);
    return (
        <div className={`absolute inset-0 z-50 flex items-center justify-center p-3 lg:p-8 overflow-hidden ${motion === 'in' ? 'screen-in' : 'screen-out'}`}>
            <style>{chartStyles}</style>
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${BACKGROUND})` }} />
            <div className="absolute inset-0 bg-black/60" />

            <article
                className="chart-sheet relative shadow-[0_18px_50px_rgba(0,0,0,0.55)]"
                style={{
                    background: 'linear-gradient(180deg, #f8f1e3 0%, #f3e6d0 100%)',
                    color: '#2b1614'
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
                            points="0,16 70,16 86,16 98,4 112,24 126,10 140,16 600,16"
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
    const { ink, band } = inkOf(isPlatinum);

    return (
        <ChartPaper title={t('CHART_TITLE')} stamp={t('CHART_STAMP')} isPlatinum={isPlatinum} motion={motion}>
            <PatientLine patient={patient} language={language} ink={ink} />

            <div className="chart-fields mt-2 lg:mt-5 grid grid-cols-3 gap-2 lg:gap-3">
                <Field label={t('LABEL_SYMPTOMS')} value={t(patient.symptoms)} ink={ink} />
                <Field label={t('STRAIN')} value={t(`STRAIN_${patient.strain}`)} ink={ink} />
                <Field label={t('DIFFICULTY')} value={t(`DIFF_${difficulty}`)} ink={ink} accent={band} />
            </div>

            <div className="chart-actions mt-2 lg:mt-6 flex flex-row gap-2 lg:gap-3">
                <button
                    onClick={onLab}
                    className="flex-1 py-2 lg:py-4 border-2 font-bold tracking-[0.16em] text-[10px] lg:text-sm uppercase transition-colors hover:bg-black/5"
                    style={{ borderColor: ink, color: ink }}
                >
                    {t('CHART_LAB')}
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
    motion?: 'in' | 'out';
}

export const OutcomeChart: React.FC<OutcomeChartProps> = ({
    variant, patient, language, isPlatinum, wave, biomass, score, onPrimary, onSecondary, motion
}) => {
    const t = (key: string) => TEXTS[language][key] || key;
    const { ink, band } = inkOf(isPlatinum);
    const cleared = variant === 'cleared';
    const stampColor = cleared ? '#166534' : ink;

    return (
        <ChartPaper
            title={cleared ? t('CLEARED') : t('GAME_OVER')}
            stamp={cleared ? t('CHART_STAMP_OK') : t('CHART_STAMP_LOST')}
            stampColor={stampColor}
            isPlatinum={isPlatinum}
            motion={motion}
        >
            {patient && <PatientLine patient={patient} language={language} ink={ink} />}

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
                        className="flex-1 py-2 lg:py-4 border-2 font-bold tracking-[0.16em] text-[10px] lg:text-sm uppercase transition-colors hover:bg-black/5"
                        style={{ borderColor: ink, color: ink }}
                    >
                        {t('MUTATION')}
                    </button>
                )}
                <button
                    onClick={onPrimary}
                    className="flex-[1.6] py-2 lg:py-4 font-bold tracking-[0.18em] text-[11px] lg:text-base uppercase text-black transition-transform hover:scale-[1.01]"
                    style={{ background: band, boxShadow: `0 5px 0 ${ink}` }}
                >
                    {cleared ? t('NEXT') : t('RETRY')}
                </button>
            </div>
        </ChartPaper>
    );
};

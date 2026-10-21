import React, { useState } from 'react';
import { Language } from '../types';
import { TEXTS } from '../constants';
import { organPlainName } from '../services/casebook';
import { organAccent } from '../services/organDirector';
import { readBoard } from '../services/board';
import { Dossier } from './Dossier';

const COPY: Record<Language, { sub: string; empty: string }> = {
    PT: {
        sub: 'As cinco melhores nesta máquina.',
        empty: 'Ainda não tem corrida gravada aqui.',
    },
    EN: {
        sub: 'The five best on this machine.',
        empty: 'No run saved on this machine yet.',
    },
    ES: {
        sub: 'Las cinco mejores en esta máquina.',
        empty: 'Todavía no hay una corrida guardada aquí.',
    },
};

function stamp(at: number, lang: Language): string {
    const d = new Date(at);
    const p = (n: number) => String(n).padStart(2, '0');
    const date = lang === 'EN'
        ? `${p(d.getMonth() + 1)}/${p(d.getDate())}/${d.getFullYear()}`
        : `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
    return `${date}  ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const styles = `
.rank-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1rem;
    margin: 0 0 0.85rem;
}
.rank-sub {
    margin: 0;
    color: #e2b060;
    font-size: 12px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
}
.rank-trace {
    width: min(220px, 42vw);
    height: 28px;
    overflow: hidden;
}
.rank-trace path {
    fill: none;
    stroke: #ff5a6a;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-dasharray: 140;
    animation: rank-trace 2.4s linear infinite;
}
@keyframes rank-trace { to { stroke-dashoffset: -140; } }
.rank-empty {
    margin: 1.4rem 0 0.4rem;
    padding: 1.2rem 1rem 1rem;
    border: 1px solid rgba(255, 90, 106, 0.35);
    border-radius: 16px;
    background: rgba(0, 0, 0, 0.28);
    color: #f3eadc;
    font-size: 15px;
    line-height: 1.45;
    text-align: center;
}
.rank-empty svg { display: block; width: min(280px, 70%); margin: 0 auto 0.7rem; }
.rank-list { display: flex; flex-direction: column; gap: 0.55rem; }
.rank-row {
    display: grid;
    grid-template-columns: 64px minmax(0, 1fr);
    gap: 0.15rem 0.85rem;
    align-items: center;
    padding: 0.7rem 0.9rem;
    border: 1px solid rgba(226, 176, 96, 0.22);
    border-radius: 16px;
    background:
        linear-gradient(180deg, rgba(255, 244, 220, 0.05), rgba(0, 0, 0, 0.18)),
        rgba(8, 4, 8, 0.35);
}
.rank-row.is-first {
    grid-template-columns: 86px minmax(0, 1fr);
    padding: 1rem 1.05rem 0.95rem;
    border-color: rgba(240, 193, 74, 0.9);
    background:
        radial-gradient(circle at 0% 50%, rgba(226, 160, 31, 0.28), transparent 46%),
        linear-gradient(180deg, rgba(255, 220, 140, 0.08), rgba(0, 0, 0, 0.2));
    box-shadow: 0 0 0 1px rgba(255, 214, 120, 0.25), 0 10px 0 rgba(0, 0, 0, 0.25);
}
.rank-pos {
    font-family: 'Teko', sans-serif;
    font-size: 42px;
    line-height: 0.8;
    color: #e2b060;
    text-align: center;
}
.rank-row.is-first .rank-pos { font-size: 64px; color: #ffe08a; text-shadow: 0 0 18px rgba(255, 196, 70, 0.55); }
.rank-main { min-width: 0; }
.rank-score {
    font-family: 'Teko', sans-serif;
    font-size: clamp(32px, 3vw, 48px);
    line-height: 0.85;
    letter-spacing: 0.04em;
    color: #fff6e4;
}
.rank-row.is-first .rank-score { font-size: clamp(46px, 5vw, 72px); color: #ffe7a8; }
.rank-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem 0.75rem;
    margin-top: 0.15rem;
    color: #f3eadc;
    font-size: 12px;
    letter-spacing: 0.08em;
}
.rank-meta b { color: #ffd98a; font-weight: 700; letter-spacing: 0.14em; }
.rank-route {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin: 0.45rem 0 0;
}
.rank-chip {
    padding: 0.12rem 0.45rem;
    border: 1px solid currentColor;
    border-radius: 999px;
    color: var(--chip);
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}
`;

export const RankingBoard: React.FC<{
    language: Language;
    title: string;
    backLabel: string;
    onBack: () => void;
}> = ({ language, title, backLabel, onBack }) => {
    const [rows] = useState(() => readBoard());
    const copy = COPY[language] || COPY.EN;
    const t = (key: string) => TEXTS[language][key] || TEXTS.EN[key] || key;
    return (
        <Dossier title={title} meta="TOP 5" onBack={onBack} backLabel={backLabel}>
            <style>{styles}</style>
            <div className="rank-head">
                <p className="rank-sub">{copy.sub}</p>
                <svg className="rank-trace" viewBox="0 0 220 28" aria-hidden="true">
                    <path d="M0 16 H36 L48 16 L58 6 L70 24 L82 10 L96 16 H140 L152 16 L162 4 L174 26 L188 16 H220" />
                </svg>
            </div>
            {rows.length === 0 ? (
                <p className="rank-empty">
                    <svg viewBox="0 0 280 36" aria-hidden="true">
                        <path d="M0 20 H280" fill="none" stroke="#ff5a6a" strokeWidth="2" />
                    </svg>
                    {copy.empty}
                </p>
            ) : (
                <div className="rank-list">
                    {rows.map((row, index) => (
                        <article key={`${row.at}-${row.score}`} className={`rank-row${index === 0 ? ' is-first' : ''}`}>
                            <div className="rank-pos">{String(index + 1).padStart(2, '0')}</div>
                            <div className="rank-main">
                                <div className="rank-score">{row.score.toString().padStart(6, '0')}</div>
                                <div className="rank-meta">
                                    <span>{stamp(row.at, language)}</span>
                                    <b>{t(`DIFF_${row.difficulty}`)}</b>
                                </div>
                                <p className="rank-route">
                                    {row.route.map((id) => (
                                        <span key={id} className="rank-chip" style={{ ['--chip' as string]: organAccent(id) }}>
                                            {organPlainName(id, language)}
                                        </span>
                                    ))}
                                </p>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </Dossier>
    );
};

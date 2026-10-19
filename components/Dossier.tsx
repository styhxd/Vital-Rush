import React from 'react';

export const dossierStyles = `
.dossier {
    position: absolute;
    inset: 0;
    z-index: 50;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: clamp(10px, 2.4vh, 28px) clamp(16px, 4vw, 48px);
    background:
        radial-gradient(ellipse at 50% 30%, rgba(132, 28, 40, 0.42), rgba(12, 4, 8, 0.94) 68%),
        #120408;
    color: #f6f1e6;
    font-family: 'Chakra Petch', sans-serif;
    overflow: hidden;
}
.dossier-panel {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    width: min(760px, 100%);
    max-height: 100%;
    min-height: 0;
    flex: 0 1 auto;
    overflow: hidden;
}
.dossier-panel.is-wide { width: min(1080px, 100%); }
.dossier-veins { position: absolute; inset: -8%; opacity: 0.45; pointer-events: none; }
.dossier-head {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex: none;
    margin: 0 0 0.35rem;
    padding: 0.18rem 0.75rem 0.14rem 0.65rem;
    border: 1px solid rgba(226, 176, 96, 0.32);
    border-radius: 10px;
    background: linear-gradient(180deg, rgba(42, 24, 18, 0.72), rgba(12, 4, 6, 0.55));
    box-shadow: inset 0 0 0 1px rgba(0,0,0,0.35), 0 4px 0 rgba(0,0,0,0.25);
}
.dossier-head strong {
    font-family: 'Teko', sans-serif;
    font-size: clamp(18px, 1.6vw, 26px);
    font-weight: 600;
    letter-spacing: 0.08em;
    line-height: 1;
    transform: translateY(0.06em);
}
.dossier-head em {
    font-style: normal;
    color: #ffd84a;
    font-family: 'Teko', sans-serif;
    font-size: clamp(16px, 1.4vw, 22px);
    letter-spacing: 0.06em;
    line-height: 1;
    transform: translateY(0.08em);
}
.dossier-body {
    position: relative;
    z-index: 1;
    flex: 1 1 auto;
    min-height: 0;
    max-height: 100%;
    margin: 0;
    padding: 0.6rem 0.75rem 0.7rem;
    overflow-y: auto;
    border: 1px solid rgba(226, 176, 96, 0.34);
    border-radius: 14px;
    background: rgba(0, 0, 0, 0.22);
    box-shadow: inset 0 0 0 1px rgba(0,0,0,0.45), inset 0 0 48px rgba(0,0,0,0.28);
    scrollbar-width: thin;
    scrollbar-color: #e2a01f rgba(255,255,255,0.06);
}
.dossier-kicker {
    margin: 0.15rem 0 0.55rem;
    color: #e2b060;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
}
.dossier-back {
    position: relative;
    z-index: 1;
    flex: none;
    margin: 0.4rem auto 0;
    padding: 0.2rem 1.35rem 0.12rem;
    background: linear-gradient(#3a3228, #1a140e);
    border: 1px solid rgba(226, 176, 96, 0.5);
    border-radius: 6px;
    color: #f7f4ee;
    letter-spacing: 0.22em;
    font-family: 'Teko', sans-serif;
    font-size: clamp(15px, 1.3vw, 20px);
    line-height: 1;
    cursor: pointer;
    box-shadow: 0 3px 0 #0a0604;
}
.dossier-back:hover { color: #ffe08a; }
.dossier-back:active { transform: translateY(2px); box-shadow: 0 1px 0 #0a0604; }
.dossier-card {
    background: rgba(255, 244, 220, 0.04);
    border: 1px solid rgba(226, 176, 96, 0.22);
    border-radius: 10px;
    padding: 0.75rem 0.85rem;
}
.dossier-card h3 {
    margin: 0 0 0.2rem;
    font-family: 'Teko', sans-serif;
    font-size: clamp(15px, 1.25vw, 20px);
    font-weight: 600;
    letter-spacing: 0.04em;
    line-height: 1;
}
.dossier-card p {
    margin: 0;
    color: #e7dcc8;
    font-size: clamp(11px, 1.05vw, 14px);
    line-height: 1.35;
}
.dossier-split {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 0.35rem 1.1rem;
    margin: 0 auto;
    align-items: start;
}
.dossier-foot {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 0.55rem 0.8rem;
    align-items: end;
    margin: 0.55rem auto 0;
}
.dossier-foot .dossier-kicker { margin-bottom: 0.28rem; }
@media (max-width: 620px) {
    .dossier-split, .dossier-foot { grid-template-columns: minmax(0, 1fr); }
}
@media (max-height: 520px) {
    .dossier { padding: 8px 14px; }
    .dossier-panel { width: min(680px, 100%); }
    .dossier-head { padding: 0.1rem 0.6rem; }
    .dossier-head strong { font-size: 17px; }
    .dossier-head em { font-size: 15px; }
    .dossier-body { padding: 0.4rem 0.55rem 0.45rem; }
    .dossier-card { padding: 0.4rem 0.55rem; }
    .dossier-back { margin-top: 0.28rem; font-size: 15px; }
    .dossier-foot { margin-top: 0.35rem; gap: 0.4rem 0.6rem; }
    .dossier-kicker { margin-bottom: 0.3rem; }
}
`;

export const Dossier: React.FC<{
    title: string;
    meta?: React.ReactNode;
    onBack: () => void;
    backLabel: string;
    wide?: boolean;
    children: React.ReactNode;
}> = ({ title, meta, onBack, backLabel, wide, children }) => (
    <div className="dossier">
        <style>{dossierStyles}</style>
        <div className="dossier-veins" aria-hidden>
            <div className="vein-drift" />
            <div className="vein-drift-b" />
        </div>
        <div className={`dossier-panel${wide ? ' is-wide' : ''}`}>
            <header className="dossier-head">
                <strong>{title}</strong>
                {meta ? <em>{meta}</em> : null}
            </header>
            <div className="dossier-body custom-scroll">{children}</div>
            <button type="button" className="dossier-back" onClick={onBack}>{backLabel}</button>
        </div>
    </div>
);

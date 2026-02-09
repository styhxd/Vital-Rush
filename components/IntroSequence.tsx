
import React, { useEffect, useState } from 'react';
import { audioManager } from '../services/audioManager';

interface IntroSequenceProps {
    onComplete: () => void;
}

// O Logo agora é um componente para garantir que renderize independente de arquivos estáticos
const StyhLogo = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path fill="#00FFFF" d="M216.909 380.083C225.191 379.208 230.69 383.707 237.582 387.68L261.471 401.491C283.623 414.186 305.872 426.73 328.027 439.424C334.24 442.984 336.331 448.789 336.672 455.584C337.024 462.568 336.896 469.664 336.914 476.66L336.95 517.705L336.919 550.596C336.899 562.923 338.85 576.832 326.637 584.548C313.803 592.657 300.389 599.929 287.352 607.705L249.752 630.153C244.464 633.318 229.926 642.821 224.606 643.968C220.683 644.145 214.691 644.726 211.397 642.874C204.95 639.248 198.424 635.258 192.079 631.463L154.729 609.033L125.387 591.396C105.276 579.299 102.92 579.755 103.051 554.768C103.129 539.9 102.987 523.633 102.976 508.712L102.964 475.419C102.967 440.761 101.041 446.458 130.437 429.306L160.89 411.369C175.362 402.854 189.774 394.211 204.233 385.677C208.294 383.28 212.29 381.155 216.909 380.083Z"/>
        <path fill="white" d="M248.471 455.743L251.022 455.731C254.041 456.997 280.325 506.244 284.909 512.799C278.191 521.747 270.913 536.405 264.647 546.395C261.271 551.776 254.242 562.574 251.85 567.511C233.072 567.704 213.923 567.489 195.116 567.471L187.893 567.462C184.734 560.597 179.428 551.312 175.734 544.545C169.688 533.222 163.41 522.024 156.906 510.957C167.224 494.154 178.431 473.452 187.958 456.076C207.819 455.627 228.445 456.015 248.471 455.743Z"/>
        <path fill="#00FFFF" d="M193.819 485.453L246.5 485.393L246.288 537.962C228.718 537.858 211.147 537.904 193.577 538.102C193.573 521.413 193.194 501.993 193.819 485.453Z"/>
        <path fill="white" d="M203.751 495.739C214.53 495.753 225.309 495.835 236.087 495.986C236.216 506.421 236.063 517.224 236.035 527.685C225.454 527.892 214.604 527.854 204 527.922L203.751 495.739Z"/>
        <path fill="white" d="M133.552 577.235C149.629 576.978 166.381 577.336 182.555 577.342C189.474 589.07 195.186 602.475 201.836 614.441C204.488 619.212 207.527 625.151 209.579 630.178L202.569 625.912C184.132 615.362 165.864 603.227 147.268 592.704C138.72 587.866 130.713 582.215 121.818 577.548L133.552 577.235Z"/>
        <path fill="white" d="M257.914 577.497C276.607 577.412 298.915 576.981 317.463 577.73C300.869 588.046 284.143 598.149 267.289 608.036C254.915 615.698 242.13 622.505 229.817 630.229C238.762 613.761 249.906 594.292 257.914 577.497Z"/>
        <path fill="white" d="M209.496 394.53L209.943 395.047C200.32 411.774 191.023 428.686 182.059 445.775L123.411 445.572L122.91 445.457L122.874 444.971C151.491 429.494 181.193 411.104 209.496 394.53Z"/>
        <path fill="white" d="M230.395 395.032C235.523 398.335 243.195 402.519 248.599 405.708C263.233 414.301 277.936 422.777 292.706 431.134C298.86 434.571 314.192 442.148 318.925 445.803C312.477 446.107 303.754 445.846 297.122 445.832L258.22 445.865C251.209 431.849 242.877 418.556 235.327 404.831C233.558 401.616 231.821 398.418 230.395 395.032Z"/>
        <path fill="white" d="M112.661 463.405C114.943 465.597 121.189 475.522 123.259 478.694C130.141 489.244 137.224 499.765 143.754 510.524C137.535 521.035 131.156 531.452 124.621 541.769C120.706 548.091 116.82 554.501 112.62 560.63C112.454 538.691 113.144 516.472 112.955 494.499C112.867 484.311 113.253 473.544 112.661 463.405Z"/>
        <path fill="white" d="M326.323 463.861C326.82 466.29 326.583 490.721 326.581 495.486L326.968 562.864C324.016 557.108 319.237 549.525 315.861 543.802L297.098 511.803C307.287 497.232 316.031 478.642 326.323 463.861Z"/>
        <path fill="white" d="M149.974 520.344C152.584 522.196 173.201 561.235 176.534 567.435L147.25 567.534L120.168 567.542C121.261 565.396 122.735 563.118 124.064 561.091C132.861 547.67 140.943 533.594 149.974 520.344Z"/>
        <path fill="white" d="M196.167 577.237C213.161 577.169 230.156 577.268 247.148 577.535C242.642 583.754 231.954 605.049 227.952 612.577C225.35 617.95 222.535 623.003 219.665 628.231C216.848 621.922 194.99 580.128 194.821 577.592L196.167 577.237Z"/>
        <path fill="white" d="M219.375 397.806C221.647 399.579 243.758 439.978 247.229 445.744L221.75 445.878L192.965 445.962C201.551 432.408 211.722 412.417 219.375 397.806Z"/>
        <path fill="white" d="M120.049 455.692C138.456 456.227 157.597 455.883 176.101 455.934C173.008 462.924 163.583 478.594 159.447 485.952L150.398 501.987C142.647 490.727 135.207 478.594 127.735 467.118C126.141 464.67 120.761 457.431 120.049 455.692Z"/>
        <path fill="white" d="M263.705 456.004C282.317 455.9 300.931 455.952 319.543 456.16C314.012 465.466 307.193 475.729 301.389 485.156C297.816 490.781 294.283 497.095 290.91 502.899C285.141 492.041 278.617 481.744 272.646 471.003C269.807 465.897 266.819 460.945 263.705 456.004Z"/>
        <path fill="white" d="M290.642 521.788C294.166 525.494 315.114 561.785 318.287 567.908L291.39 567.663L263.695 567.54C272.794 552.359 281.777 537.107 290.642 521.788Z"/>
        <path fill="#00FFFF" d="M505.159 425.756C523.448 425.255 543.257 425.653 561.626 425.707C591.499 425.82 621.373 425.77 651.246 425.558C665.076 448.094 679.631 470.429 693.187 492.945C699.195 482.175 706.621 470.657 713.173 460.144L734.165 425.95C746.107 425.549 760.438 425.296 772.373 425.788C765.299 438.301 757.659 449.857 750.001 461.95L728.173 496.793C725.161 501.496 710.721 522.502 710.638 526.092C710.227 543.722 710.899 561.715 710.636 579.406C708.92 580.417 680.708 579.941 676.449 579.927C676.579 561.456 676.574 542.983 676.436 524.512C662.178 502.998 644.508 474.477 629.34 454.122L628.801 454.254C628.702 455.617 628.805 456.65 628.011 457.715C613.677 457.811 599.343 457.77 585.011 457.59L585.064 579.991C573.403 579.829 561.741 579.813 550.08 579.945C550.707 539.47 550.457 498.22 550.495 457.684C535.511 457.585 520.148 457.864 505.135 457.966C505.037 447.229 505.045 436.492 505.159 425.756Z"/>
        <path fill="#00FFFF" d="M804.269 425.75L813.513 425.618L813.555 489.344L874.508 489.467L874.478 425.869L909.251 425.846L909.403 579.979L885.359 579.903L874.456 579.979C874.187 559.769 874.436 538.812 874.434 518.552L813.478 518.622C813.592 539.048 813.593 559.475 813.48 579.901C801.785 579.965 790.089 579.967 778.393 579.907C777.994 528.56 777.971 477.212 778.325 425.865C786.973 425.901 795.621 425.863 804.269 425.75Z"/>
        <path fill="#00FFFF" d="M432.247 423.199C434.919 422.791 442.713 422.798 445.475 422.956C465.396 424.095 478.195 429.292 494.94 439.235C491.662 447.639 486.705 457.534 483.027 466.1C469.232 459.164 458.493 453.31 442.335 452.732C430.922 452.323 413.401 454.06 413.572 469.301C413.614 473.064 414.947 475.736 418.032 477.996C448.389 494.11 503.257 486.809 502.555 535.269C502 573.544 465.843 582.393 433.905 581.978C409.504 580.057 395.595 576.049 376.377 560.719C380.608 553.497 386.226 541.71 389.999 534.046C405.472 547.032 423.254 553.825 443.656 553.072C450.706 552.619 461.177 551.034 465.811 545.007C473.696 534.395 465.999 526.038 455.233 522.572C427.602 513.679 384.499 514.248 380.575 476.782C377.096 443.565 401.452 426.256 432.247 423.199Z"/>
    </svg>
);

export const IntroSequence: React.FC<IntroSequenceProps> = ({ onComplete }) => {
    const [phase, setPhase] = useState(0);

    useEffect(() => {
        // Tenta inicializar o audio context silenciosamente se possível,
        // embora navegadores modernos bloqueiem até interação do usuário.
        // O efeito visual funcionará independente disso.
        
        const sequence = async () => {
            // Phase 0: Start (Black)
            await new Promise(r => setTimeout(r, 500));
            
            // Phase 1: Logo Flicker In
            setPhase(1);
            // Simula som de glitch/eletricidade se áudio estiver ativo
            try { audioManager.playHit(); } catch(e) {}
            
            await new Promise(r => setTimeout(r, 800));

            // Phase 2: Pulse / Wait (Texto removido, mas mantemos o som de impacto)
            setPhase(2);
            try { audioManager.playSurge(); } catch(e) {} // Som de impacto grave
            
            await new Promise(r => setTimeout(r, 2000));
            
            // Phase 3: Fade Out / Shutdown
            setPhase(3);
            
            await new Promise(r => setTimeout(r, 800));
            
            onComplete();
        };

        sequence();
    }, [onComplete]);

    return (
        <div className={`fixed inset-0 z-[1000] bg-black flex items-center justify-center overflow-hidden transition-opacity duration-1000 ${phase === 3 ? 'opacity-0' : 'opacity-100'}`}>
            <style>{`
                @keyframes glitch-skew {
                    0% { transform: skew(0deg); }
                    20% { transform: skew(-10deg); }
                    40% { transform: skew(10deg); }
                    60% { transform: skew(-5deg); }
                    80% { transform: skew(5deg); }
                    100% { transform: skew(0deg); }
                }
                @keyframes flicker {
                    0% { opacity: 0; }
                    10% { opacity: 1; }
                    20% { opacity: 0; }
                    30% { opacity: 0.5; }
                    40% { opacity: 1; }
                    50% { opacity: 0; }
                    60% { opacity: 1; }
                    70% { opacity: 0.3; }
                    100% { opacity: 1; }
                }
                @keyframes scanline {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(100%); }
                }
                .anim-intro-glitch {
                    animation: flicker 0.5s linear forwards, glitch-skew 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
                }
                .crt-line {
                    position: absolute;
                    left: 0; top: 0; width: 100%; height: 2px;
                    background: rgba(0, 255, 255, 0.5);
                    box-shadow: 0 0 10px cyan;
                    animation: scanline 3s linear infinite;
                    pointer-events: none;
                    opacity: 0.3;
                }
            `}</style>
            
            {/* CRT Effect Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none z-20"></div>
            <div className="crt-line"></div>

            <div className="relative flex flex-col items-center">
                {/* LOGO STYH (Agora Inline SVG) - TAMANHO AUMENTADO SIGNIFICATIVAMENTE */}
                <div className={`transition-all duration-100 ${phase >= 1 ? 'opacity-100 anim-intro-glitch' : 'opacity-0'}`}>
                    <div className="relative">
                        {/* Glitch Shadow Effect */}
                        <div className="absolute inset-0 translate-x-1 translate-y-0 opacity-50 mix-blend-screen animate-pulse">
                            <StyhLogo className="w-48 lg:w-96 drop-shadow-[0_0_10px_red]" style={{filter: 'hue-rotate(90deg) brightness(1.5)'}} />
                        </div>
                        <div className="absolute inset-0 -translate-x-1 translate-y-0 opacity-50 mix-blend-screen animate-pulse" style={{animationDelay: '0.1s'}}>
                            <StyhLogo className="w-48 lg:w-96 drop-shadow-[0_0_10px_blue]" style={{filter: 'hue-rotate(-90deg) brightness(1.5)'}} />
                        </div>
                        
                        {/* Main Logo */}
                        <StyhLogo className="w-48 lg:w-96 relative z-10 drop-shadow-[0_0_50px_rgba(0,255,255,0.6)]" />
                    </div>
                </div>

                {/* Loading Status Decoration */}
                <div className={`absolute -bottom-32 lg:-bottom-64 text-[10px] lg:text-xs font-mono text-cyan-900 tracking-widest ${phase >= 1 ? 'opacity-100' : 'opacity-0'}`}>
                    INITIALIZING VITAL_RUSH_PROTOCOL...
                </div>
            </div>
        </div>
    );
};

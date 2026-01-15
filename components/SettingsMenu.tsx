import React, { useState } from 'react';
import { TEXTS } from '../constants';
import { Language } from '../types';
import { audioManager } from '../services/audioManager';

interface SettingsMenuProps {
    isVisible: boolean;
    language: Language;
    audioSettings: { master: number; music: number; sfx: number };
    onUpdateAudio: (type: 'master' | 'music' | 'sfx', val: number) => void;
    onLanguageChange: (lang: Language) => void;
    onClose: () => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ 
    isVisible, 
    language, 
    audioSettings, 
    onUpdateAudio, 
    onLanguageChange,
    onClose 
}) => {
    // FAILSAFE 1: Verificação lógica de entrada
    if (!isVisible) return null;

    const t = (key: string) => TEXTS[language][key] || key;
    const [testAnim, setTestAnim] = useState(false);

    const handleTestAudio = () => {
        audioManager.playPowerUp();
        setTestAnim(true);
        setTimeout(() => setTestAnim(false), 500);
    };

    // Componente interno para o Slider Holográfico (Surpresa Visual 1)
    const HoloSlider = ({ label, value, onChange }: { label: string, value: number, onChange: (val: number) => void }) => {
        const percentage = Math.round(value * 100);
        return (
            <div className="mb-6">
                <div className="flex justify-between text-xs font-mono text-cyan-400 mb-2 tracking-widest">
                    <span>{label}</span>
                    <span>{percentage}%</span>
                </div>
                <div className="relative h-6 w-full bg-black/50 border border-cyan-900/50 skew-x-[-10deg] flex items-center px-1 cursor-pointer group">
                    <input 
                        type="range" 
                        min="0" max="1" step="0.1" 
                        value={value} 
                        onChange={(e) => onChange(parseFloat(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"
                    />
                    {/* Visualização de Barras Segmentadas */}
                    <div className="flex gap-1 w-full h-3 z-10 pointer-events-none">
                        {Array.from({ length: 20 }).map((_, i) => {
                            const active = (i / 20) < value;
                            return (
                                <div 
                                    key={i} 
                                    className={`flex-1 transition-all duration-300 ${active ? 'bg-cyan-500 shadow-[0_0_5px_cyan]' : 'bg-cyan-900/20'} 
                                    ${active && (i / 20) > 0.8 ? 'bg-red-500 shadow-[0_0_5px_red]' : ''}`} // Fica vermelho se estiver muito alto
                                ></div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    return (
        // FAILSAFE 2: Z-Index 110 (Acima do Pause que é 100) e Position Fixed
        <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex items-center justify-center animate-in fade-in zoom-in duration-300">
            {/* Background Grid Decorativo */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>

            <div className="w-full max-w-lg p-1 border-y-2 border-cyan-500 bg-[#050b14] relative shadow-[0_0_100px_rgba(0,255,255,0.1)]">
                <div className="p-6 md:p-10 relative overflow-hidden">
                    
                    {/* Header */}
                    <h2 className="text-3xl font-bold text-center text-cyan-400 tracking-[0.3em] mb-8 border-b border-cyan-800 pb-4">
                        {t('SETTINGS')}
                        <span className="block text-[10px] text-gray-500 font-mono mt-1 tracking-normal">SYS.CONFIG.V4.5</span>
                    </h2>

                    {/* Audio Section */}
                    <div className="space-y-2">
                        <HoloSlider 
                            label="MASTER OUTPUT" 
                            value={audioSettings.master} 
                            onChange={(v) => onUpdateAudio('master', v)} 
                        />
                        <HoloSlider 
                            label="MUSIC STREAM" 
                            value={audioSettings.music} 
                            onChange={(v) => onUpdateAudio('music', v)} 
                        />
                        <HoloSlider 
                            label="SFX FEEDBACK" 
                            value={audioSettings.sfx} 
                            onChange={(v) => onUpdateAudio('sfx', v)} 
                        />
                    </div>

                    {/* Language Section */}
                    <div className="mt-8 mb-8">
                        <div className="text-xs font-mono text-cyan-400 mb-2 tracking-widest uppercase">{t('LANG')}</div>
                        <div className="flex gap-2">
                            {(['EN', 'PT', 'ES'] as Language[]).map(l => (
                                <button 
                                    key={l}
                                    onClick={() => onLanguageChange(l)}
                                    className={`flex-1 py-2 font-bold text-xs tracking-widest border transition-all duration-300
                                    ${language === l 
                                        ? 'bg-cyan-600 text-black border-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.4)]' 
                                        : 'bg-black/40 text-cyan-700 border-cyan-900/50 hover:bg-cyan-900/20'}`}
                                >
                                    {l}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Surpresa 2: Botão de Diagnóstico (Test Audio) */}
                    <div className="flex gap-4 mb-6">
                        <button 
                            onClick={handleTestAudio}
                            className={`flex-1 py-3 border border-yellow-500/30 text-yellow-500 font-mono text-xs tracking-widest hover:bg-yellow-500/10 transition-all relative overflow-hidden ${testAnim ? 'bg-yellow-500/20 translate-x-1' : ''}`}
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {testAnim ? 'Running...' : 'RUN DIAGNOSTICS'} 
                                <span className={`w-2 h-2 rounded-full ${testAnim ? 'bg-red-500 animate-ping' : 'bg-yellow-500'}`}></span>
                            </span>
                        </button>
                    </div>

                    {/* Footer Actions */}
                    <button 
                        onClick={onClose}
                        className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-black font-bold tracking-[0.2em] transition-all shadow-[0_0_20px_rgba(0,255,255,0.3)] hover:scale-[1.02]"
                    >
                        {t('BACK')}
                    </button>

                </div>
            </div>
        </div>
    );
};
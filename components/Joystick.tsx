/**
 * ------------------------------------------------------------------
 * COPYRIGHT (c) 2024 ESTÚDIO CRIA
 * DIRETOR: PAULO GABRIEL DE L. S.
 * ------------------------------------------------------------------
 * 
 * O CONTROLE TÁCTIL.
 * Aquela coisa que todo dev odeia fazer porque envolve matemática de vetor.
 * Se você não gosta de trigonometria, feche este arquivo.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Vector2 } from '../types';

interface JoystickProps {
  onMove: (vector: Vector2) => void;
}

export const Joystick: React.FC<JoystickProps> = ({ onMove }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  
  // Tamanhos ajustados para dedões humanos médios.
  // Se o usuário for um gigante, azar o dele.
  const CONTAINER_SIZE = 160;
  const HANDLE_SIZE = 60;
  const MAX_RADIUS = CONTAINER_SIZE / 2 - HANDLE_SIZE / 2;

  useEffect(() => {
    const handleEnd = () => {
      setActive(false);
      setPosition({ x: 0, y: 0 });
      onMove({ x: 0, y: 0 }); // Zera o vetor quando solta
    };

    // Ouvintes globais porque o dedo do usuário escapa do joystick
    window.addEventListener('touchend', handleEnd);
    window.addEventListener('mouseup', handleEnd);
    return () => {
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('mouseup', handleEnd);
    };
  }, [onMove]);

  const handleStart = (clientX: number, clientY: number) => {
    setActive(true);
    setStartPos({ x: clientX, y: clientY }); 
    
    // Matemática chata pra centralizar o toque inicial
    if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const dx = clientX - centerX;
        const dy = clientY - centerY;
        
        // Snap imediato pra parecer responsivo
        handleMove(clientX, clientY);
    }
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const dx = clientX - centerX;
        const dy = clientY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Clampa a distância para o stick não sair voando da base
        const clampedDistance = Math.min(distance, MAX_RADIUS);
        const angle = Math.atan2(dy, dx); // O bom e velho arctan2
        
        const x = Math.cos(angle) * clampedDistance;
        const y = Math.sin(angle) * clampedDistance;
        
        setPosition({ x, y });
        
        // Normaliza para o motor do jogo (-1 a 1)
        onMove({ x: x / MAX_RADIUS, y: y / MAX_RADIUS });
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`absolute bottom-8 left-8 rounded-full border-2 flex items-center justify-center touch-none select-none z-50 backdrop-blur-sm transition-colors duration-200
        ${active ? 'border-cyan-500/50 bg-cyan-900/20' : 'border-white/10 bg-black/20'}`}
      style={{ width: CONTAINER_SIZE, height: CONTAINER_SIZE }}
      onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
      onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
      onMouseMove={(e) => active && handleMove(e.clientX, e.clientY)}
    >
        {/* Anel decorativo giratório (pra ficar Tech) */}
        <div className={`absolute rounded-full border border-dashed transition-all duration-300 ${active ? 'border-cyan-400/30 scale-90 rotate-180' : 'border-white/5 scale-100'}`} style={{width: '70%', height: '70%'}}></div>
        
        {/* O Stick em si */}
      <div 
        className={`rounded-full absolute shadow-xl transition-transform duration-75 ease-linear flex items-center justify-center
            ${active ? 'bg-gradient-to-br from-cyan-400 to-blue-600 shadow-[0_0_20px_rgba(0,255,255,0.4)]' : 'bg-white/20'}`}
        style={{ 
            width: HANDLE_SIZE, 
            height: HANDLE_SIZE,
            transform: `translate(${position.x}px, ${position.y}px)` 
        }}
      >
          {active && <div className="w-2 h-2 bg-white rounded-full blur-[1px]"></div>}
      </div>
    </div>
  );
};
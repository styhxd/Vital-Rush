
/**
 * ------------------------------------------------------------------
 * COPYRIGHT (c) 2026 ESTÚDIO CRIA
 * DIRETOR: PAULO GABRIEL DE L. S.
 * ------------------------------------------------------------------
 * 
 * O CONTROLE TÁCTIL (AGORA COM MULTI-TOUCH E HITBOX EXPANDIDA)
 * 
 * Atualizado para rastrear o ID do toque específico.
 * Agora possui uma "Hitbox Fantasma" muito maior que o visual,
 * permitindo que o jogador erre o centro mas ainda acerte o controle.
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
  
  // Ref para guardar o ID do dedo que está controlando este joystick especificamente.
  const touchIdRef = useRef<number | null>(null);
  
  // CONFIGURAÇÃO DE TAMANHOS
  // HITBOX_SIZE: A área invisível que aceita o toque (Enorme pra não errar)
  // VISUAL_SIZE: O tamanho do círculo desenhado (Discreto pra não tapar a tela)
  const HITBOX_SIZE = 280; 
  const VISUAL_SIZE = 110; 
  const HANDLE_SIZE = 48;
  
  // O raio máximo de movimento do pino é baseado no tamanho VISUAL, não na hitbox.
  const MAX_RADIUS = VISUAL_SIZE / 2 - HANDLE_SIZE / 2;

  // Lógica de Movimento Centralizada
  const processMove = (clientX: number, clientY: number) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const dx = clientX - centerX;
        const dy = clientY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Clamp visual
        const clampedDistance = Math.min(distance, MAX_RADIUS);
        const angle = Math.atan2(dy, dx);
        
        const x = Math.cos(angle) * clampedDistance;
        const y = Math.sin(angle) * clampedDistance;
        
        setPosition({ x, y });
        
        // Output normalizado (-1 a 1)
        // Se a distância for maior que MAX_RADIUS, normalizamos para 1.0
        // Isso garante que se o dedo sair do visual, continua sendo 100% input
        const normalizedPower = Math.min(distance / MAX_RADIUS, 1.0);
        onMove({ 
            x: Math.cos(angle) * normalizedPower, 
            y: Math.sin(angle) * normalizedPower 
        });
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
      e.preventDefault(); 
      e.stopPropagation();

      if (touchIdRef.current !== null) return;

      const touch = e.changedTouches[0];
      touchIdRef.current = touch.identifier;
      setActive(true);
      processMove(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (touchIdRef.current === null) return;

      for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === touchIdRef.current) {
              const touch = e.changedTouches[i];
              processMove(touch.clientX, touch.clientY);
              return;
          }
      }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
      e.preventDefault();

      if (touchIdRef.current === null) return;

      for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === touchIdRef.current) {
              setActive(false);
              setPosition({ x: 0, y: 0 });
              onMove({ x: 0, y: 0 });
              touchIdRef.current = null;
              return;
          }
      }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      setActive(true);
      processMove(e.clientX, e.clientY);
      
      const handleWindowMouseMove = (evt: MouseEvent) => {
          processMove(evt.clientX, evt.clientY);
      };
      
      const handleWindowMouseUp = () => {
          setActive(false);
          setPosition({ x: 0, y: 0 });
          onMove({ x: 0, y: 0 });
          window.removeEventListener('mousemove', handleWindowMouseMove);
          window.removeEventListener('mouseup', handleWindowMouseUp);
      };

      window.addEventListener('mousemove', handleWindowMouseMove);
      window.addEventListener('mouseup', handleWindowMouseUp);
  };

  // Cálculo de posicionamento para centralizar o visual na "zona de conforto"
  // Queremos que o centro visual fique a aprox 80px da esquerda e 80px de baixo.
  // Como a Hitbox é grande (280px), o centro dela é 140px.
  // Offset = 80 - 140 = -60px.
  const OFFSET = -60;

  return (
    <div 
      ref={containerRef}
      // O container agora é a HITBOX gigante e invisível
      className="absolute z-50 touch-none select-none flex items-center justify-center"
      style={{ 
          width: HITBOX_SIZE, 
          height: HITBOX_SIZE,
          bottom: OFFSET,
          left: OFFSET
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseDown={handleMouseDown}
    >
        {/* DEBUG: Descomente para ver a hitbox */}
        {/* <div className="absolute inset-0 border border-red-500/30 rounded-full pointer-events-none"></div> */}

        {/* VISUAL BASE: O Joystick que o usuário vê */}
        <div 
            className={`rounded-full border-2 flex items-center justify-center backdrop-blur-sm transition-colors duration-200 pointer-events-none
            ${active ? 'border-cyan-500/50 bg-cyan-900/20' : 'border-white/10 bg-black/20'}`}
            style={{ width: VISUAL_SIZE, height: VISUAL_SIZE }}
        >
             <div className={`absolute rounded-full border border-dashed transition-all duration-300 ${active ? 'border-cyan-400/30 scale-90 rotate-180' : 'border-white/5 scale-100'}`} style={{width: '70%', height: '70%'}}></div>
        </div>
        
      {/* HANDLE: O pino que se move */}
      <div 
        className={`rounded-full absolute shadow-xl transition-transform duration-75 ease-linear flex items-center justify-center pointer-events-none
            ${active ? 'bg-gradient-to-br from-cyan-400 to-blue-600 shadow-[0_0_20px_rgba(0,255,255,0.4)]' : 'bg-white/20'}`}
        style={{ 
            width: HANDLE_SIZE, 
            height: HANDLE_SIZE,
            // Importante: A posição é relativa ao centro do container (Hitbox), que está alinhado com o centro do Visual
            transform: `translate(${position.x}px, ${position.y}px)` 
        }}
      >
          {active && <div className="w-2 h-2 bg-white rounded-full blur-[1px]"></div>}
      </div>
    </div>
  );
};

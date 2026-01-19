/**
 * ------------------------------------------------------------------
 * COPYRIGHT (c) 2026 ESTÚDIO CRIA
 * DIRETOR: PAULO GABRIEL DE L. S.
 * ------------------------------------------------------------------
 * 
 * O CONTROLE TÁCTIL (AGORA COM MULTI-TOUCH)
 * 
 * Atualizado para rastrear o ID do toque específico.
 * Isso permite que você use o joystick com um dedo e aperte botões com outro
 * sem que o navegador fique confuso.
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
  // Isso é crucial para o multi-touch.
  const touchIdRef = useRef<number | null>(null);
  
  // AUMENTADO PARA MOBILE (Era 80/35) -> Agora 110/48 (+35%)
  const CONTAINER_SIZE = 110; 
  const HANDLE_SIZE = 48;
  const MAX_RADIUS = CONTAINER_SIZE / 2 - HANDLE_SIZE / 2;

  // Lógica de Movimento Centralizada
  const processMove = (clientX: number, clientY: number) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const dx = clientX - centerX;
        const dy = clientY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const clampedDistance = Math.min(distance, MAX_RADIUS);
        const angle = Math.atan2(dy, dx);
        
        const x = Math.cos(angle) * clampedDistance;
        const y = Math.sin(angle) * clampedDistance;
        
        setPosition({ x, y });
        onMove({ x: x / MAX_RADIUS, y: y / MAX_RADIUS });
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
      e.preventDefault(); // Impede scroll/zoom
      e.stopPropagation();

      // Se já tem um dedo no joystick, ignora novos toques
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

      // Procura pelo dedo certo na lista de toques que mudaram
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
      // Não precisamos de stopPropagation aqui para permitir que o evento suba se necessário, 
      // mas preventDefault é bom pra evitar cliques fantasmas.

      if (touchIdRef.current === null) return;

      for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === touchIdRef.current) {
              // O dedo do joystick levantou
              setActive(false);
              setPosition({ x: 0, y: 0 });
              onMove({ x: 0, y: 0 });
              touchIdRef.current = null;
              return;
          }
      }
  };

  // Fallback para Mouse (Desktop)
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

  return (
    <div 
      ref={containerRef}
      className={`absolute bottom-6 left-6 lg:bottom-8 lg:left-8 rounded-full border-2 flex items-center justify-center touch-none select-none z-50 backdrop-blur-sm transition-colors duration-200
        ${active ? 'border-cyan-500/50 bg-cyan-900/20' : 'border-white/10 bg-black/20'}`}
      style={{ width: CONTAINER_SIZE, height: CONTAINER_SIZE }}
      // Eventos de Toque Diretos (React Synthetic Events)
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      // Evento de Mouse
      onMouseDown={handleMouseDown}
    >
        <div className={`absolute rounded-full border border-dashed transition-all duration-300 ${active ? 'border-cyan-400/30 scale-90 rotate-180' : 'border-white/5 scale-100'}`} style={{width: '70%', height: '70%'}}></div>
        
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
/**
 * ------------------------------------------------------------------
 * COPYRIGHT (c) 2026 ESTÚDIO CRIA
 * DIRETOR: PAULO GABRIEL DE L. S.
 * ------------------------------------------------------------------
 *
 * Analógico dinâmico. O círculo nasce debaixo do dedo, inclusive
 * mais perto do meio da tela, e some quando o toque acaba.
 */

import React, { useRef, useState } from 'react';
import { Vector2 } from '../types';

interface JoystickProps {
  onMove: (vector: Vector2) => void;
}

const VISUAL_SIZE = 112;
const HANDLE_SIZE = 48;
const MAX_RADIUS = 40;

export const Joystick: React.FC<JoystickProps> = ({ onMove }) => {
  const zoneRef = useRef<HTMLDivElement>(null);
  const originRef = useRef({ x: 0, y: 0 });
  const touchIdRef = useRef<number | null>(null);
  const [active, setActive] = useState(false);
  const [base, setBase] = useState({ x: 0, y: 0 });
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const place = (clientX: number, clientY: number) => {
      const zone = zoneRef.current;
      if (!zone) return null;
      const rect = zone.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      const pad = VISUAL_SIZE / 2 + 18;
      const x = Math.min(Math.max(localX, pad), rect.width - 16);
      const y = Math.min(Math.max(localY, pad), rect.height - pad);
      return { x, y, clientX: rect.left + x, clientY: rect.top + y };
  };

  const follow = (clientX: number, clientY: number) => {
      const dx = clientX - originRef.current.x;
      const dy = clientY - originRef.current.y;
      const distance = Math.hypot(dx, dy) || 0;
      const angle = Math.atan2(dy, dx);
      const clamped = Math.min(distance, MAX_RADIUS);
      setKnob({ x: Math.cos(angle) * clamped, y: Math.sin(angle) * clamped });
      const power = Math.min(distance / MAX_RADIUS, 1);
      onMove({ x: Math.cos(angle) * power, y: Math.sin(angle) * power });
  };

  const release = () => {
      setActive(false);
      setKnob({ x: 0, y: 0 });
      onMove({ x: 0, y: 0 });
      touchIdRef.current = null;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
      e.preventDefault();
      if (touchIdRef.current !== null) return;
      const touch = e.changedTouches[0];
      const spot = place(touch.clientX, touch.clientY);
      if (!spot) return;
      touchIdRef.current = touch.identifier;
      originRef.current = { x: spot.clientX, y: spot.clientY };
      setBase({ x: spot.x, y: spot.y });
      setKnob({ x: 0, y: 0 });
      setActive(true);
      onMove({ x: 0, y: 0 });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      e.preventDefault();
      if (touchIdRef.current === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          if (touch.identifier === touchIdRef.current) {
              follow(touch.clientX, touch.clientY);
              return;
          }
      }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
      if (touchIdRef.current === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === touchIdRef.current) {
              release();
              return;
          }
      }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      const spot = place(e.clientX, e.clientY);
      if (!spot) return;
      originRef.current = { x: spot.clientX, y: spot.clientY };
      setBase({ x: spot.x, y: spot.y });
      setKnob({ x: 0, y: 0 });
      setActive(true);
      onMove({ x: 0, y: 0 });

      const move = (evt: MouseEvent) => follow(evt.clientX, evt.clientY);
      const up = () => {
          release();
          window.removeEventListener('mousemove', move);
          window.removeEventListener('mouseup', up);
      };
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
  };

  return (
    <div
      ref={zoneRef}
      data-stick=""
      className="absolute top-0 left-0 bottom-0 z-50 touch-none select-none"
      style={{ width: '64%' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseDown={handleMouseDown}
    >
      {active && (
        <div
          className="absolute pointer-events-none"
          style={{ left: base.x, top: base.y, width: VISUAL_SIZE, height: VISUAL_SIZE, transform: 'translate(-50%, -50%)' }}
        >
          <div className="w-full h-full rounded-full border-2 border-cyan-400/55 bg-cyan-950/30 backdrop-blur-[2px] shadow-[0_0_24px_rgba(34,211,238,0.25)] flex items-center justify-center">
            <div className="w-[70%] h-[70%] rounded-full border border-dashed border-cyan-200/30" />
          </div>
          <div
            className="absolute left-1/2 top-1/2 rounded-full bg-gradient-to-br from-cyan-300 to-blue-600 shadow-[0_0_18px_rgba(34,211,238,0.55)]"
            style={{
              width: HANDLE_SIZE,
              height: HANDLE_SIZE,
              transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`
            }}
          />
        </div>
      )}
    </div>
  );
};

/**
 * ------------------------------------------------------------------
 * COPYRIGHT (c) 2024 ESTÚDIO CRIA
 * DIRETOR: PAULO GABRIEL DE L. S.
 * PROJETO: VITAL RUSH - PROTOCOLO APEX
 * ------------------------------------------------------------------
 * 
 * Este é o ponto de entrada. O "Big Bang" do nosso universo microscópico.
 * Basicamente, só segura o canvas preto e chama o jogo.
 * 
 * Se der erro aqui, pode fechar a IDE e ir vender coco na praia.
 */

import React from 'react';
import { Game } from './components/Game';

export default function App() {
  return (
    // Fundo preto absoluto. Porque o espaço (e o interior do corpo humano) é escuro.
    // E também porque economiza bateria em telas OLED. Engenharia, baby.
    <div className="w-full h-screen bg-black">
      <Game />
    </div>
  );
}
/**
 * ------------------------------------------------------------------
 * COPYRIGHT (c) 2026 ESTÚDIO CRIA
 * DIRETOR: PAULO GABRIEL DE L. S.
 * ------------------------------------------------------------------
 * 
 * O PONTO DE PARTIDA (ENTRY POINT)
 * 
 * Se você está lendo isso, parabéns. Você encontrou a porta de entrada.
 * Aqui nós pegamos o React pelo colarinho e o forçamos para dentro da div #root.
 * 
 * Não há muito o que ver aqui, circulando.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

// Verificação de sanidade básica.
// Se não tiver a div 'root' no HTML, o universo colapsou.
if (!rootElement) {
  throw new Error("Could not find root element to mount to. Alguém apagou a div do HTML?");
}

const root = ReactDOM.createRoot(rootElement);

// StrictMode está ativado para nos avisar quando fazemos besteira.
// Ele renderiza duas vezes em dev, então não se assuste se os logs duplicarem.
// É uma feature, não um bug (dizem).
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
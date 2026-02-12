/**
 * ------------------------------------------------------------------
 * COPYRIGHT (c) 2026 ESTÚDIO CRIA
 * DIRETOR: PAULO GABRIEL DE L. S.
 * PROJETO: VITAL RUSH - PROTOCOLO HÍBRIDO V2
 * ------------------------------------------------------------------
 * 
 * THE GATEKEEPER (APP ENTRY)
 * 
 * RETORNO ÀS ORIGENS:
 * Utilizamos a ponte nativa do Capacitor para garantir controle absoluto
 * sobre a StatusBar e Orientação.
 */

import React, { useEffect } from 'react';
import { StatusBar } from '@capacitor/status-bar';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { App as CapacitorApp } from '@capacitor/app';
import { Game } from './components/Game';
import { audioManager } from './services/audioManager';

export default function App() {

  useEffect(() => {
    const enforceImmersion = async () => {
      // 1. Tenta travar a orientação (Nativo)
      try {
        await ScreenOrientation.lock({ orientation: 'landscape' });
      } catch (e) {
        // Fallback silencioso para navegadores desktop que não suportam lock
      }

      // 2. Esconde a StatusBar e faz o App desenhar "em cima" dela (Nativo)
      try {
        await StatusBar.setOverlaysWebView({ overlay: true });
        await StatusBar.hide();
      } catch (e) {
        // Ignora erros se não estiver em ambiente nativo
      }

      // 3. Fallback Web Puro (Para testes no navegador)
      try {
        const elem = document.documentElement as any;
        if (!document.fullscreenElement) {
           // Nota: Isso geralmente requer interação do usuário, então pode falhar no load inicial
           // mas funciona nos cliques subsequentes
           if (elem.requestFullscreen) elem.requestFullscreen({ navigationUI: "hide" });
        }
      } catch (e) {}
    };

    // Executa imediatamente ao montar
    enforceImmersion();
    audioManager.init();

    // Listener para quando o app volta do background (Crucial para Android)
    const appListener = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        // Delay pequeno para garantir que a UI do Android acordou
        setTimeout(enforceImmersion, 100);
        audioManager.resume();
      }
    });

    // Reforço em interações
    const handleInteraction = () => {
      enforceImmersion();
      audioManager.resume();
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchstart', handleInteraction, { passive: true });

    return () => {
      appListener.then(handle => handle.remove());
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  return (
    <div className="w-full h-screen bg-black select-none overflow-hidden touch-none fixed inset-0">
      <Game />
    </div>
  );
}
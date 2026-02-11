/**
 * ------------------------------------------------------------------
 * COPYRIGHT (c) 2026 ESTÚDIO CRIA
 * DIRETOR: PAULO GABRIEL DE L. S.
 * PROJETO: VITAL RUSH - PROTOCOLO APEX
 * ------------------------------------------------------------------
 * 
 * Este é o ponto de entrada. O "Big Bang" do nosso universo microscópico.
 * Basicamente, só segura o canvas preto e chama o jogo.
 * 
 * ATUALIZAÇÃO:
 * - Trava Orientação: Landscape
 * - Esconde Status Bar
 * - Inicializa Áudio Imediatamente
 */

import React, { useEffect } from 'react';
import { Game } from './components/Game';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { StatusBar } from '@capacitor/status-bar';
import { audioManager } from './services/audioManager';

export default function App() {

  useEffect(() => {
    // RITUAL DE INICIALIZAÇÃO NATIVA
    const initNative = async () => {
      try {
        // 1. Tenta travar a tela em Landscape (Deitada)
        await ScreenOrientation.lock({ orientation: 'landscape' }).catch(() => {
          console.log("Screen Orientation lock falhou (Provavelmente estamos no Browser)");
        });

        // 2. Tenta esconder a barra de status (Full Immersion)
        await StatusBar.hide().catch(() => {});
        
        // 3. Inicializa o motor de áudio imediatamente.
        // No Android/iOS (Webview), isso geralmente é permitido no boot.
        await audioManager.init();
        
      } catch (e) {
        console.error("Erro na inicialização nativa:", e);
      }
    };

    initNative();

    // Fallback global de toque para garantir o áudio caso o autoplay falhe
    const handleTouch = () => {
        audioManager.resume();
        window.removeEventListener('touchstart', handleTouch);
        window.removeEventListener('click', handleTouch);
    };
    
    window.addEventListener('touchstart', handleTouch);
    window.addEventListener('click', handleTouch);
    
    return () => {
        window.removeEventListener('touchstart', handleTouch);
        window.removeEventListener('click', handleTouch);
    }
  }, []);

  return (
    // Fundo preto absoluto. Porque o espaço (e o interior do corpo humano) é escuro.
    // E também porque economiza bateria em telas OLED. Engenharia, baby.
    <div className="w-full h-screen bg-black select-none overflow-hidden touch-none">
      <Game />
    </div>
  );
}
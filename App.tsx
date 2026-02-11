/**
 * ------------------------------------------------------------------
 * COPYRIGHT (c) 2026 ESTÚDIO CRIA
 * DIRETOR: PAULO GABRIEL DE L. S.
 * PROJETO: VITAL RUSH - PROTOCOLO APEX
 * ------------------------------------------------------------------
 * 
 * THE GATEKEEPER (APP ENTRY)
 * 
 * Fullscreen Enforcement Strategy:
 * 1. Capacitor Native Plugins (Status Bar + Orientation)
 * 2. Web Fullscreen API (Immersive Mode for Android Nav Bar)
 * 3. Failsafe Event Listeners (Resume/Focus/Click)
 */

import React, { useEffect } from 'react';
import { Game } from './components/Game';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { StatusBar } from '@capacitor/status-bar';
import { audioManager } from './services/audioManager';

export default function App() {

  useEffect(() => {
    // --- STRATEGY A: NATIVE PLUGIN ENFORCEMENT ---
    const enforceNativeFullscreen = async () => {
      try {
        // 1. Orientation Lock (Landscape)
        await ScreenOrientation.lock({ orientation: 'landscape' }).catch(() => {
            console.warn("Orientation lock skipped (Browser env?)");
        });

        // 2. Status Bar Config
        // Overlay ensures the WebView goes UNDER the status bar area, removing black bars.
        await StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
        await StatusBar.hide().catch(() => {});
        
      } catch (e) {
        console.error("Native fullscreen error:", e);
      }
    };

    // --- STRATEGY B: WEB API IMMERSIVE MODE ---
    // This is crucial for Android Navigation Bar (Bottom Buttons).
    // It requires a user gesture, so we try it here but also bind it to global clicks.
    const requestWebFullscreen = async () => {
        const elem = document.documentElement;
        if (!document.fullscreenElement) {
            if (elem.requestFullscreen) {
                await elem.requestFullscreen().catch(() => {});
            } else if ((elem as any).webkitRequestFullscreen) {
                (elem as any).webkitRequestFullscreen();
            }
        }
    };

    // --- STRATEGY C: FAILSAFE LOOP & EVENTS ---
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            // Re-apply on app resume
            setTimeout(enforceNativeFullscreen, 100);
            setTimeout(enforceNativeFullscreen, 1000); // Double-tap insurance
        }
    };
    
    // Attempt Initial Launch
    enforceNativeFullscreen();
    // Initialize Audio
    audioManager.init();

    // Listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Global Gesture Interceptor for Audio & Fullscreen
    // This catches the very first tap anywhere to ensure full immersion.
    const handleInteraction = () => {
        audioManager.resume();
        requestWebFullscreen();
        enforceNativeFullscreen();
        // We don't remove this listener immediately to ensure persistence if the user exits fullscreen
    };
    
    window.addEventListener('touchstart', handleInteraction, { passive: true });
    window.addEventListener('click', handleInteraction);
    
    return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('touchstart', handleInteraction);
        window.removeEventListener('click', handleInteraction);
    }
  }, []);

  return (
    // CSS Failsafe: 100dvh handles dynamic viewport height on mobile browsers
    <div className="w-full h-[100dvh] bg-black select-none overflow-hidden touch-none fixed inset-0">
      <Game />
    </div>
  );
}
/**
 * ------------------------------------------------------------------
 * COPYRIGHT (c) 2026 ESTÚDIO CRIA
 * DIRETOR: PAULO GABRIEL DE L. S.
 * ------------------------------------------------------------------
 * 
 * AUDIO MANAGER V4: "BAKED BUFFERS"
 * 
 * A solução definitiva para performance.
 * Em vez de "cozinhar" o som na hora do tiro (pesado), nós
 * deixamos os sons prontos na memória (leve).
 */

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  
  // O BANCO DE SONS (Memória Pura)
  private buffers: Record<string, AudioBuffer> = {};
  
  // Controle de Throttling
  private lastPlayTime: Record<string, number> = {};
  
  // Sequenciador Musical
  private isPlaying: boolean = false;
  private currentTrack: 'MENU' | 'GAME' | 'NONE' = 'NONE';
  private nextNoteTime: number = 0;
  private current16thNote: number = 0;
  private tempo: number = 120;
  private timerID: number | null = null;

  public settings = {
    master: 0.8,
    music: 0.6,
    sfx: 0.7
  };

  constructor() {}

  public async init() {
    if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        return;
    }

    const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
    this.ctx = new AudioContextClass({ latencyHint: 'interactive' });

    this.masterGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();

    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -10;
    
    this.musicGain.connect(this.compressor);
    this.sfxGain.connect(this.compressor);
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
    
    // PRÉ-RENDERIZAÇÃO (A Mágica)
    // Gera todos os sons pesados agora, durante o loading, pra não travar o jogo depois.
    await this.bakeSounds();
    
    this.updateVolumes();
  }

  // Gera os sons usando um contexto offline (super rápido) e salva em buffers
  private async bakeSounds() {
      if (!this.ctx) return;
      
      // SHOOT SOUND
      this.buffers['shoot'] = await this.renderOffline(0.15, (c) => {
          const osc = c.createOscillator();
          const g = c.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(600, 0);
          osc.frequency.exponentialRampToValueAtTime(50, 0.1);
          g.gain.setValueAtTime(0.3, 0);
          g.gain.exponentialRampToValueAtTime(0.01, 0.1);
          osc.connect(g);
          g.connect(c.destination);
          osc.start();
      });

      // HIT SOUND
      this.buffers['hit'] = await this.renderOffline(0.15, (c) => {
          const osc = c.createOscillator();
          const g = c.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(150, 0);
          osc.frequency.exponentialRampToValueAtTime(10, 0.1);
          g.gain.setValueAtTime(0.3, 0);
          g.gain.exponentialRampToValueAtTime(0.01, 0.1);
          const f = c.createBiquadFilter();
          f.type = 'lowpass';
          f.frequency.value = 1000;
          osc.connect(f);
          f.connect(g);
          g.connect(c.destination);
          osc.start();
      });
      
      // EXPLOSION (NOISE)
      this.buffers['expl'] = await this.renderOffline(0.5, (c) => {
          const bufferSize = c.sampleRate * 0.5;
          const noiseBuffer = c.createBuffer(1, bufferSize, c.sampleRate);
          const data = noiseBuffer.getChannelData(0);
          for(let i=0; i<bufferSize; i++) data[i] = Math.random()*2 - 1;
          
          const src = c.createBufferSource();
          src.buffer = noiseBuffer;
          const f = c.createBiquadFilter();
          f.type = 'lowpass';
          f.frequency.setValueAtTime(800, 0);
          f.frequency.exponentialRampToValueAtTime(50, 0.4);
          const g = c.createGain();
          g.gain.setValueAtTime(0.8, 0);
          g.gain.exponentialRampToValueAtTime(0.01, 0.4);
          
          src.connect(f);
          f.connect(g);
          g.connect(c.destination);
          src.start();
      });
      
      // POWERUP
      this.buffers['power'] = await this.renderOffline(0.3, (c) => {
          const osc = c.createOscillator();
          const g = c.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(440, 0);
          osc.frequency.setValueAtTime(554, 0.08);
          osc.frequency.setValueAtTime(659, 0.16);
          g.gain.setValueAtTime(0.1, 0);
          g.gain.linearRampToValueAtTime(0, 0.3);
          osc.connect(g);
          g.connect(c.destination);
          osc.start();
      });
      
      // SURGE
      this.buffers['surge'] = await this.renderOffline(1.0, (c) => {
          const osc = c.createOscillator();
          const g = c.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(200, 0);
          osc.frequency.linearRampToValueAtTime(800, 0.5);
          osc.frequency.linearRampToValueAtTime(100, 1.0);
          g.gain.setValueAtTime(0.3, 0);
          g.gain.linearRampToValueAtTime(0, 1.0);
          osc.connect(g);
          g.connect(c.destination);
          osc.start();
      });
      
      // HI-HAT (Curto e Grosso)
      this.buffers['hat'] = await this.renderOffline(0.05, (c) => {
          const bufferSize = c.sampleRate * 0.05;
          const b = c.createBuffer(1, bufferSize, c.sampleRate);
          const d = b.getChannelData(0);
          for(let i=0; i<bufferSize; i++) d[i] = (Math.random()*2 - 1);
          const src = c.createBufferSource();
          src.buffer = b;
          const f = c.createBiquadFilter();
          f.type = 'highpass';
          f.frequency.value = 6000;
          const g = c.createGain();
          g.gain.value = 0.1; // Baixo volume nativo
          g.gain.exponentialRampToValueAtTime(0.01, 0.04);
          src.connect(f);
          f.connect(g);
          g.connect(c.destination);
          src.start();
      });

      // KICK (Curto)
      this.buffers['kick'] = await this.renderOffline(0.2, (c) => {
          const osc = c.createOscillator();
          const g = c.createGain();
          osc.frequency.setValueAtTime(150, 0);
          osc.frequency.exponentialRampToValueAtTime(0.01, 0.2);
          g.gain.setValueAtTime(0.8, 0);
          g.gain.exponentialRampToValueAtTime(0.01, 0.2);
          osc.connect(g);
          g.connect(c.destination);
          osc.start();
      });
  }

  // Helper para renderizar som em background
  private renderOffline(duration: number, renderFn: (ctx: OfflineAudioContext) => void): Promise<AudioBuffer> {
      // 22050Hz é suficiente pra SFX retro e economiza RAM
      const offlineCtx = new OfflineAudioContext(1, 22050 * duration, 22050); 
      renderFn(offlineCtx);
      return offlineCtx.startRendering();
  }

  // Toca um buffer pré-cozido. Extremamente leve.
  private playBuffer(name: string, vol: number = 1.0, pitch: number = 1.0, throttleMs: number = 0) {
      if (!this.ctx || this.ctx.state !== 'running') return;
      if (!this.buffers[name]) return;
      
      const now = performance.now();
      if (throttleMs > 0) {
          if (now - (this.lastPlayTime[name] || 0) < throttleMs) return;
          this.lastPlayTime[name] = now;
      }
      
      // Criação de Source Node é barata
      const source = this.ctx.createBufferSource();
      source.buffer = this.buffers[name];
      if (pitch !== 1.0) source.playbackRate.value = pitch;
      
      const gain = this.ctx.createGain();
      gain.gain.value = vol;
      
      // Conecta: Buffer -> Gain -> Mix Bus
      source.connect(gain);
      // Decide o bus baseado no nome (gambiarra eficiente)
      if (name === 'hat' || name === 'kick') {
          gain.connect(this.musicGain!);
      } else {
          gain.connect(this.sfxGain!);
      }
      
      source.start();
      // GC limpa sozinho quando acaba
  }

  public updateVolumes() {
    if (!this.masterGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.settings.master, now, 0.1);
    this.musicGain!.gain.setTargetAtTime(this.settings.music, now, 0.1);
    this.sfxGain!.gain.setTargetAtTime(this.settings.sfx, now, 0.1);
  }

  // --- API PÚBLICA (Extremamente Simples Agora) ---

  public playShoot() { this.playBuffer('shoot', 0.8, 1.0 + Math.random()*0.1, 80); }
  public playHit() { this.playBuffer('hit', 0.8, 0.8 + Math.random()*0.4, 80); }
  public playExplosion() { this.playBuffer('expl', 1.0, 1.0, 120); }
  public playPowerUp() { this.playBuffer('power', 0.6, 1.0, 100); }
  public playSurge() { this.playBuffer('surge', 0.7, 1.0, 500); }

  // --- MUSIC ENGINE (Simplificada e Segura) ---
  
  public stopMusic() {
    this.isPlaying = false;
    this.currentTrack = 'NONE';
    if (this.timerID !== null) {
        window.clearTimeout(this.timerID);
        this.timerID = null;
    }
  }

  public startGameMusic() { this.startTrack('GAME', 135); }
  public startMenuMusic() { this.startTrack('MENU', 80); }

  private startTrack(track: 'MENU' | 'GAME', bpm: number) {
      if (this.currentTrack === track) return;
      this.stopMusic();
      if (!this.ctx) return;

      this.isPlaying = true;
      this.currentTrack = track;
      this.tempo = bpm;
      this.current16thNote = 0;
      this.nextNoteTime = this.ctx.currentTime + 0.1;
      this.scheduler();
  }

  private scheduler() {
      if (!this.ctx || !this.isPlaying) return;
      
      const ahead = 0.15; // 150ms lookahead
      const now = this.ctx.currentTime;
      
      // Resync violento se atrasar
      if (this.nextNoteTime < now - 0.2) {
          this.nextNoteTime = now;
      }

      while (this.nextNoteTime < now + ahead) {
          this.playNote(this.current16thNote);
          const secondsPerBeat = 60.0 / this.tempo;
          this.nextNoteTime += 0.25 * secondsPerBeat;
          this.current16thNote = (this.current16thNote + 1) % 16;
      }
      
      this.timerID = window.setTimeout(() => this.scheduler(), 30);
  }

  private playNote(beat: number) {
      if (this.currentTrack === 'GAME') {
          if (beat % 4 === 0) this.playBuffer('kick', 1.0);
          if (beat % 4 === 2) this.playBuffer('hat', 0.6, 1.0); // Open
          else this.playBuffer('hat', 0.2, 2.0); // Closed (pitch alto)
      } else {
          // Menu Ambient (Minimalista)
          if (beat === 0) this.playBuffer('kick', 0.5, 0.5); // Low kick
          if (beat % 8 === 2) this.playBuffer('hat', 0.1, 0.5);
      }
  }
}

export const audioManager = new AudioManager();
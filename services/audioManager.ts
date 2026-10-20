/**
 * ------------------------------------------------------------------
 * COPYRIGHT (c) 2026 ESTÚDIO CRIA
 * DIRETOR: PAULO GABRIEL DE L. S.
 * ------------------------------------------------------------------
 * 
 * AUDIO MANAGER V7: "IMMEDIATE EXECUTION"
 * 
 * Centralização total da lógica de áudio.
 * Ajustado para iniciar imediatamente sem esperar interação se possível (WebAudio Policy).
 */

import type { OrganId } from '../types';

interface Score {
    bpm: number;
    root: number;
    scale: number[];
    chords: number[];
    color: 'glass' | 'murk' | 'thump' | 'air' | 'spark' | 'warm';
}

const MINOR = [0, 2, 3, 5, 7, 8, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const PHRYGIAN = [0, 1, 3, 5, 7, 8, 10];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];

const SCORES: Record<OrganId | 'menu', Score> = {
    molar: { bpm: 118, root: 82.41, scale: MINOR, chords: [0, 3, 4, 5], color: 'glass' },
    liver: { bpm: 78, root: 77.78, scale: PHRYGIAN, chords: [0, 1, 3, 0], color: 'murk' },
    heart: { bpm: 92, root: 110, scale: MINOR, chords: [0, 5, 2, 6], color: 'thump' },
    lung: { bpm: 104, root: 73.42, scale: DORIAN, chords: [0, 3, 4, 0], color: 'air' },
    brain: { bpm: 100, root: 61.74, scale: MINOR, chords: [0, 5, 3, 6], color: 'spark' },
    menu: { bpm: 96, root: 65.41, scale: MAJOR, chords: [0, 4, 5, 3], color: 'warm' },
};

const LEAD: Record<OrganId | 'menu', number[]> = {
    molar: [0, 2, 4, 7, 4, 2, 3, 0, 4, 5, 7, 4, 2, 0, -1, 7],
    liver: [0, 1, 0, -1, 3, 1, 0, -1, 5, 3, 1, 0, -1, 1, 0, -1],
    heart: [0, 0, 2, 4, 7, 4, 2, 0, 8, 7, 4, 2, 0, -1, 4, 0],
    lung: [0, 2, 4, 7, 9, 7, 4, 2, 4, 7, 4, 0, 2, -1, 0],
    brain: [7, 4, 7, 11, 7, 4, 2, 0, 4, 7, 8, 11, 7, 4, 0, -1],
    menu: [0, 2, 4, 7, 4, 2, 0, 4, 5, 4, 2, 0, 4, 7, 4, 0],
};

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  
  // EFEITO DE QUASE-MORTE (Low Pass Filter)
  private musicFilter: BiquadFilterNode | null = null;

  // O BANCO DE SONS (Memória Pura)
  private buffers: Record<string, AudioBuffer> = {};
  
  // Controle de Throttling
  private lastPlayTime: Record<string, number> = {};
  
  // Sequenciador Musical Procedural
  private isPlaying: boolean = false;
  private currentTrack: 'MENU' | 'GAME' | 'NONE' = 'NONE';
  private nextNoteTime: number = 0;
  private current16thNote: number = 0;
  
  // Estado do Jogo
  private currentWave: number = 1;
  private organ: OrganId = 'molar';
  private layer = 2;
  private boss = false;
  private tempoMul = 1;
  private tempoBackAt = 0;
  private lubAt = -1;
  private lungNudge = 0;
  private lungPushUntil = 0;
  private reverbSend: GainNode | null = null;
  
  private timerID: number | null = null;

  public settings = {
    master: 0.8,
    music: 0.6,
    sfx: 0.7
  };

  // Escalas Musicais
  private readonly SCALE_MAJOR = [0, 4, 7, 12]; 
  private readonly SCALE_MINOR = [0, 3, 7, 10]; 
  private readonly SCALE_DARK  = [0, 1, 6, 8]; 

  constructor() {}

  public async init() {
    // Se já existe e está rodando, não faz nada
    if (this.ctx) {
        if (this.ctx.state === 'suspended') {
            await this.ctx.resume().catch(() => {});
        }
        return;
    }

    const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
    this.ctx = new AudioContextClass({ latencyHint: 'interactive' });

    this.masterGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();

    this.musicFilter = this.ctx.createBiquadFilter();
    this.musicFilter.type = 'lowpass';
    this.musicFilter.frequency.value = 22000; 
    this.musicFilter.Q.value = 1;

    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -12;
    this.compressor.ratio.value = 8;
    
    this.musicGain.connect(this.musicFilter);
    this.musicFilter.connect(this.compressor);
    
    this.sfxGain.connect(this.compressor);
    
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
    this.buildReverb();
    
    // Tenta carregar sons. Se falhar por segurança do browser, não quebra a app.
    try {
        await this.bakeSounds();
        this.updateVolumes();
        // Tenta iniciar imediatamente
        if (this.ctx.state === 'suspended') {
            await this.ctx.resume().catch(() => {});
        }
    } catch (e) {
        console.warn("Audio init deferred until user gesture.");
    }
  }

  // Novo Helper para forçar resume em eventos de toque
  public resume() {
      if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
      }
  }

  private lastFilterFreq = -1;

  public setGameState(wave: number, healthRatio: number) {
      this.currentWave = wave;
      if (this.musicFilter && this.ctx) {
          let targetFreq = 22000;
          if (healthRatio < 0.3) {
              targetFreq = 200 + (healthRatio / 0.3) * 600;
          }
          if (Math.abs(targetFreq - this.lastFilterFreq) < 25) return;
          this.lastFilterFreq = targetFreq;
          this.musicFilter.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.5);
      }
  }

  private async bakeSounds() {
      if (!this.ctx) return;
      
      // SHOOT: 330Hz Triangle -> Lowpass Sweep
      this.buffers['shoot'] = await this.renderOffline(0.1, (c) => {
          const osc = c.createOscillator();
          const g = c.createGain();
          const f = c.createBiquadFilter();

          osc.type = 'triangle'; 
          osc.frequency.setValueAtTime(330, 0); 
          osc.frequency.exponentialRampToValueAtTime(60, 0.1); 

          f.type = 'lowpass';
          f.frequency.setValueAtTime(3000, 0);
          f.frequency.exponentialRampToValueAtTime(500, 0.1);

          g.gain.setValueAtTime(0.25, 0);
          g.gain.exponentialRampToValueAtTime(0.01, 0.1);
          
          osc.connect(f);
          f.connect(g);
          g.connect(c.destination);
          osc.start();
      });

      // MINE HEAVY
      this.buffers['mine_expl_heavy'] = await this.renderOffline(0.7, (c) => {
          const osc = c.createOscillator();
          const gOsc = c.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(150, 0);
          osc.frequency.exponentialRampToValueAtTime(10, 0.5);
          gOsc.gain.setValueAtTime(0.8, 0);
          gOsc.gain.exponentialRampToValueAtTime(0.01, 0.5);

          const bufferSize = c.sampleRate * 0.5;
          const noiseBuffer = c.createBuffer(1, bufferSize, c.sampleRate);
          const data = noiseBuffer.getChannelData(0);
          for(let i=0; i<bufferSize; i++) data[i] = Math.random()*2 - 1;
          const srcNoise = c.createBufferSource();
          srcNoise.buffer = noiseBuffer;
          const gNoise = c.createGain();
          const fNoise = c.createBiquadFilter();
          fNoise.type = 'lowpass';
          fNoise.frequency.setValueAtTime(1000, 0);
          fNoise.frequency.linearRampToValueAtTime(100, 0.4);
          gNoise.gain.setValueAtTime(0.6, 0);
          gNoise.gain.exponentialRampToValueAtTime(0.01, 0.4);

          srcNoise.connect(fNoise);
          fNoise.connect(gNoise);
          osc.connect(gOsc);
          gOsc.connect(c.destination);
          gNoise.connect(c.destination);
          osc.start();
          srcNoise.start();
      });

      // MINE DASH
      this.buffers['mine_expl_dash'] = await this.renderOffline(0.6, (c) => {
          const osc = c.createOscillator();
          const g = c.createGain();
          osc.type = 'sine'; 
          osc.frequency.setValueAtTime(400, 0);
          osc.frequency.exponentialRampToValueAtTime(50, 0.4); 
          g.gain.setValueAtTime(0.8, 0);
          g.gain.exponentialRampToValueAtTime(0.01, 0.6);
          osc.connect(g);
          g.connect(c.destination);
          osc.start();
      });

      // HIT
      this.buffers['hit'] = await this.renderOffline(0.1, (c) => {
          const osc = c.createOscillator();
          const g = c.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(200, 0);
          osc.frequency.exponentialRampToValueAtTime(10, 0.1);
          g.gain.setValueAtTime(0.2, 0);
          g.gain.exponentialRampToValueAtTime(0.01, 0.1);
          const f = c.createBiquadFilter();
          f.type = 'lowpass';
          f.frequency.value = 800; 
          osc.connect(f);
          f.connect(g);
          g.connect(c.destination);
          osc.start();
      });
      
      // EXPLOSION
      this.buffers['expl'] = await this.renderOffline(0.4, (c) => {
          const bufferSize = c.sampleRate * 0.4;
          const noiseBuffer = c.createBuffer(1, bufferSize, c.sampleRate);
          const data = noiseBuffer.getChannelData(0);
          for(let i=0; i<bufferSize; i++) data[i] = Math.random()*2 - 1;
          const src = c.createBufferSource();
          src.buffer = noiseBuffer;
          const f = c.createBiquadFilter();
          f.type = 'lowpass';
          f.frequency.setValueAtTime(1200, 0);
          f.frequency.exponentialRampToValueAtTime(50, 0.4);
          const g = c.createGain();
          g.gain.setValueAtTime(0.6, 0);
          g.gain.exponentialRampToValueAtTime(0.01, 0.4);
          src.connect(f);
          f.connect(g);
          g.connect(c.destination);
          src.start();
      });
      
      // POWER
      this.buffers['power'] = await this.renderOffline(0.3, (c) => {
          const osc = c.createOscillator();
          const g = c.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, 0);
          osc.frequency.linearRampToValueAtTime(880, 0.1);
          osc.frequency.linearRampToValueAtTime(1760, 0.3);
          g.gain.setValueAtTime(0.1, 0);
          g.gain.linearRampToValueAtTime(0, 0.3);
          osc.connect(g);
          g.connect(c.destination);
          osc.start();
      });
      
      // SURGE
      this.buffers['surge'] = await this.renderOffline(0.8, (c) => {
          const osc = c.createOscillator();
          const g = c.createGain();
          const f = c.createBiquadFilter();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(50, 0);
          osc.frequency.exponentialRampToValueAtTime(300, 0.8);
          f.type = 'lowpass';
          f.Q.value = 10; 
          f.frequency.setValueAtTime(100, 0);
          f.frequency.exponentialRampToValueAtTime(2000, 0.8);
          g.gain.setValueAtTime(0.3, 0);
          g.gain.linearRampToValueAtTime(0, 0.8);
          osc.connect(f);
          f.connect(g);
          g.connect(c.destination);
          osc.start();

          const sub = c.createOscillator();
          const subG = c.createGain();
          sub.type = 'sine';
          sub.frequency.setValueAtTime(30, 0);
          sub.frequency.linearRampToValueAtTime(100, 0.8);
          subG.gain.setValueAtTime(0.5, 0);
          subG.gain.linearRampToValueAtTime(0, 0.8);
          sub.connect(subG);
          subG.connect(c.destination);
          sub.start();
      });

      // BOSS DASH
      this.buffers['boss_dash'] = await this.renderOffline(0.6, (c) => {
          const osc = c.createOscillator();
          const g = c.createGain();
          const f = c.createBiquadFilter();
          osc.type = 'sawtooth';
          osc.frequency.value = 60;
          f.type = 'lowpass';
          f.Q.value = 5; 
          f.frequency.setValueAtTime(100, 0);
          f.frequency.linearRampToValueAtTime(600, 0.3); 
          f.frequency.linearRampToValueAtTime(100, 0.6); 
          g.gain.setValueAtTime(0, 0);
          g.gain.linearRampToValueAtTime(0.6, 0.3);
          g.gain.linearRampToValueAtTime(0, 0.6);
          osc.connect(f);
          f.connect(g);
          g.connect(c.destination);
          osc.start();
      });

      // ENEMY SHOOT
      this.buffers['enemy_shoot'] = await this.renderOffline(0.2, (c) => {
          const carrier = c.createOscillator();
          const modulator = c.createOscillator();
          const modGain = c.createGain();
          const masterGain = c.createGain();
          carrier.type = 'sine';
          carrier.frequency.setValueAtTime(600, 0);
          carrier.frequency.exponentialRampToValueAtTime(200, 0.2);
          modulator.type = 'square'; 
          modulator.frequency.value = 150; 
          modGain.gain.setValueAtTime(1000, 0);
          modGain.gain.exponentialRampToValueAtTime(10, 0.2);
          masterGain.gain.setValueAtTime(0.3, 0);
          masterGain.gain.exponentialRampToValueAtTime(0.01, 0.2);
          modulator.connect(modGain);
          modGain.connect(carrier.frequency);
          carrier.connect(masterGain);
          masterGain.connect(c.destination);
          carrier.start();
          modulator.start();
      });

      // MUSIC: KICK
      this.buffers['kick'] = await this.renderOffline(0.15, (c) => {
          const osc = c.createOscillator();
          const g = c.createGain();
          osc.frequency.setValueAtTime(120, 0);
          osc.frequency.exponentialRampToValueAtTime(40, 0.15);
          g.gain.setValueAtTime(0.9, 0);
          g.gain.exponentialRampToValueAtTime(0.01, 0.15);
          const dist = c.createWaveShaper();
          dist.curve = new Float32Array([-0.5, 0.5]); 
          osc.connect(dist);
          dist.connect(g);
          g.connect(c.destination);
          osc.start();
      });

      // MUSIC: HAT
      this.buffers['hat'] = await this.renderOffline(0.05, (c) => {
          const bufferSize = c.sampleRate * 0.05;
          const b = c.createBuffer(1, bufferSize, c.sampleRate);
          const d = b.getChannelData(0);
          for(let i=0; i<bufferSize; i++) d[i] = (Math.random()*2 - 1);
          const src = c.createBufferSource();
          src.buffer = b;
          const f = c.createBiquadFilter();
          f.type = 'highpass';
          f.frequency.value = 8000;
          const g = c.createGain();
          g.gain.value = 0.08;
          g.gain.exponentialRampToValueAtTime(0.001, 0.05);
          src.connect(f);
          f.connect(g);
          g.connect(c.destination);
          src.start();
      });

      // MUSIC: BASS
      this.buffers['bass'] = await this.renderOffline(0.25, (c) => {
          const osc = c.createOscillator();
          const osc2 = c.createOscillator(); 
          const g = c.createGain();
          const f = c.createBiquadFilter();
          osc.type = 'sawtooth';
          osc2.type = 'sawtooth';
          osc.frequency.value = 110; 
          osc2.frequency.value = 110.5; 
          f.type = 'lowpass';
          f.frequency.setValueAtTime(800, 0);
          f.frequency.exponentialRampToValueAtTime(100, 0.2);
          g.gain.setValueAtTime(0.4, 0);
          g.gain.linearRampToValueAtTime(0, 0.25);
          osc.connect(f);
          osc2.connect(f);
          f.connect(g);
          g.connect(c.destination);
          osc.start();
          osc2.start();
      });
  }

  private renderOffline(duration: number, renderFn: (ctx: OfflineAudioContext) => void): Promise<AudioBuffer> {
      const offlineCtx = new OfflineAudioContext(1, 22050 * duration, 22050); 
      renderFn(offlineCtx);
      return offlineCtx.startRendering();
  }

  private playBuffer(name: string, vol: number = 1.0, pitchSemitones: number = 0, throttleMs: number = 0) {
      if (!this.ctx || this.ctx.state !== 'running') return;
      if (!this.buffers[name]) return;
      
      const now = performance.now();
      if (throttleMs > 0) {
          if (now - (this.lastPlayTime[name] || 0) < throttleMs) return;
          this.lastPlayTime[name] = now;
      }
      
      const source = this.ctx.createBufferSource();
      source.buffer = this.buffers[name];
      
      if (pitchSemitones !== 0) {
          source.playbackRate.value = Math.pow(2, pitchSemitones / 12);
      }
      
      const gain = this.ctx.createGain();
      gain.gain.value = vol;
      
      source.connect(gain);
      if (name === 'hat' || name === 'kick' || name === 'bass') {
          gain.connect(this.musicGain!);
      } else {
          gain.connect(this.sfxGain!);
      }
      
      source.start();
  }

  public updateVolumes() {
    if (!this.masterGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.settings.master, now, 0.1);
    this.musicGain!.gain.setTargetAtTime(this.settings.music, now, 0.1);
    this.sfxGain!.gain.setTargetAtTime(this.settings.sfx, now, 0.1);
  }

  public playShoot() { this.playBuffer('shoot', 0.6, Math.random()*2, 60); }
  public playHit() { this.playBuffer('hit', 0.6, Math.random()*3, 60); }
  public playExplosion() { this.playBuffer('expl', 0.8, 0, 100); }
  public playPowerUp() { this.playBuffer('power', 0.5, 0, 80); }
  public playSurge() { this.playBuffer('surge', 0.6, 0, 500); }
  
  public playMineExplosionShot() { this.playBuffer('mine_expl_heavy', 0.6, 0, 150); } 
  public playMineExplosionDash() { this.playBuffer('mine_expl_dash', 0.9, 0, 150); }
  
  public playBossDash() { this.playBuffer('boss_dash', 0.7, 0, 300); }
  public playEnemyShoot() { this.playBuffer('enemy_shoot', 0.4, Math.random()*2, 80); }

  private buildReverb() {
      if (!this.ctx || !this.musicGain || !this.compressor || this.reverbSend) return;
      const rate = this.ctx.sampleRate;
      const len = Math.floor(rate * 1.7);
      const impulse = this.ctx.createBuffer(2, len, rate);
      for (let ch = 0; ch < 2; ch++) {
          const data = impulse.getChannelData(ch);
          for (let i = 0; i < len; i++) {
              const t = i / len;
              data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.6);
          }
      }
      const conv = this.ctx.createConvolver();
      conv.buffer = impulse;
      this.reverbSend = this.ctx.createGain();
      this.reverbSend.gain.value = 0.14;
      this.musicGain.connect(this.reverbSend);
      this.reverbSend.connect(conv);
      conv.connect(this.compressor);
  }

  public setScene(organ: OrganId, local: number, boss: boolean) {
      this.organ = organ;
      this.layer = boss ? 6 : Math.min(6, local + 2);
      this.boss = boss;
      if (this.reverbSend && this.ctx) {
          const wet = boss ? 0.5 : organ === 'brain' ? 0.28 : organ === 'lung' ? 0.22 : organ === 'heart' ? 0.16 : 0.12;
          this.reverbSend.gain.setTargetAtTime(wet, this.ctx.currentTime, 0.4);
      }
  }

  public heartGlow(): number {
      if (!this.ctx || this.organ !== 'heart' || this.currentTrack !== 'GAME' || this.lubAt < 0) return -1;
      const age = this.ctx.currentTime - this.lubAt;
      if (age < -0.03) return 0;
      return Math.exp(-Math.max(0, age) * 11);
  }

  public ecgApproach() {
      if (!this.ctx) return;
      this.tempoMul = 1.08;
      this.tempoBackAt = this.ctx.currentTime + 2.5;
  }

  public ecgPass() {
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime;
      this.tempoMul = 1.08;
      this.tempoBackAt = t + 1.35;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, t);
      osc.frequency.linearRampToValueAtTime(880, t + 0.08);
      osc.frequency.setValueAtTime(880, t + 0.7);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.22, t + 0.04);
      g.gain.setValueAtTime(0.18, t + 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.05);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 1.1);
  }

  public lungPush(amount: number) {
      if (!this.ctx) return;
      this.lungNudge = amount;
      this.lungPushUntil = this.ctx.currentTime + 0.85;
  }

  public playBreath() { this.puff(0.32, 900, 0.16); }
  public playCough() {
      this.puff(0.12, 420, 0.28);
      window.setTimeout(() => this.puff(0.1, 280, 0.22), 90);
      window.setTimeout(() => this.puff(0.16, 180, 0.18), 180);
  }
  public playClot() {
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime;
      this.tone(t, 78, 0.22, 'sine', 0.35, 240, this.sfxGain);
      this.puff(0.14, 220, 0.2);
  }
  public playCrack() {
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(240, t);
      osc.frequency.exponentialRampToValueAtTime(48, t + 0.18);
      g.gain.setValueAtTime(0.4, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.24);
      this.puff(0.08, 1800, 0.35);
  }
  public playWaveClear() {
      if (!this.ctx || !this.musicGain) return;
      const t = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => this.tone(t + i * 0.09, freq, 0.42, 'triangle', 0.2, 2800, this.musicGain!));
      this.tone(t + 0.28, 523.25, 0.7, 'sawtooth', 0.08, 900, this.musicGain);
      this.tone(t + 0.28, 659.25, 0.7, 'sawtooth', 0.07, 900, this.musicGain);
      this.tone(t + 0.28, 783.99, 0.75, 'triangle', 0.1, 1600, this.musicGain);
  }
  public playTransit(organ: OrganId) {
      if (!this.ctx || !this.musicGain) return;
      const t = this.ctx.currentTime;
      this.puff(0.45, 600, 0.2);
      this.tone(t, SCORES[organ].root * 2, 0.6, 'sine', 0.12, 1400, this.musicGain);
      this.tone(t + 0.18, SCORES[organ].root * 3, 0.5, 'triangle', 0.08, 1800, this.musicGain);
  }
  public menuAccent(kind: string) {
      if (!this.ctx) {
          void this.init().then(() => this.menuAccent(kind));
          return;
      }
      this.resume();
      if (!this.musicGain) return;
      const t = this.ctx.currentTime;
      const root = 261.63;
      const semi = (n: number) => root * Math.pow(2, n / 12);
      const stab = (intervals: number[], type: OscillatorType, vol: number) => {
          intervals.forEach((n, i) => this.tone(t + i * 0.045, semi(n), 0.28, type, vol, 2200, this.musicGain!));
      };
      if (kind === 'play') stab([0, 4, 7, 12], 'triangle', 0.16);
      else if (kind === 'config') stab([0, 1, 6], 'square', 0.08);
      else if (kind === 'extras') stab([0, 7, 12], 'triangle', 0.12);
      else if (kind === 'info') stab([0, 4, 11], 'sine', 0.12);
      else if (kind === 'ranking') stab([0, 7, 12, 19], 'triangle', 0.14);
      else if (kind === 'lang') stab([12], 'sine', 0.1);
      else stab([0, -5], 'sine', 0.14);
  }

  public stopMusic() {
    this.isPlaying = false;
    this.currentTrack = 'NONE';
    this.lubAt = -1;
    if (this.timerID !== null) {
        window.clearTimeout(this.timerID);
        this.timerID = null;
    }
  }

  public startGameMusic() { this.startTrack('GAME'); }
  public startMenuMusic() { this.startTrack('MENU'); }

  private startTrack(track: 'MENU' | 'GAME') {
      if (!this.ctx) {
          void this.init().then(() => this.startTrack(track));
          return;
      }
      if (this.currentTrack === track) return;
      this.stopMusic();

      this.isPlaying = true;
      this.currentTrack = track;
      this.current16thNote = 0;
      this.nextNoteTime = this.ctx.currentTime + 0.1;
      this.scheduler();
  }

  private liveBpm(): number {
      const score = this.currentTrack === 'MENU' ? SCORES.menu : SCORES[this.organ];
      let bpm = score.bpm * (this.boss && this.currentTrack === 'GAME' ? 1.12 : 1) * this.tempoMul;
      if (this.currentTrack === 'GAME' && this.organ === 'lung' && this.ctx) {
          const wob = 1 + 0.045 * Math.sin(this.ctx.currentTime * 0.7);
          const push = this.ctx.currentTime < this.lungPushUntil ? this.lungNudge : 0;
          bpm *= wob * (1 + push);
      }
      return bpm;
  }

  private scheduler() {
      if (!this.ctx || !this.isPlaying) return;
      const now = this.ctx.currentTime;
      if (this.tempoBackAt > 0 && now > this.tempoBackAt) {
          this.tempoMul = 1;
          this.tempoBackAt = 0;
      }
      if (this.nextNoteTime < now - 0.2) this.nextNoteTime = now;
      let iterations = 0;
      while (this.nextNoteTime < now + 0.12 && iterations < 8) {
          this.playStep(this.current16thNote, this.nextNoteTime);
          const secondsPerBeat = 60 / this.liveBpm();
          this.nextNoteTime += 0.25 * secondsPerBeat;
          this.current16thNote = (this.current16thNote + 1) % 64;
          iterations++;
      }
      this.timerID = window.setTimeout(() => this.scheduler(), 25);
  }

  private hz(score: Score, degree: number, octave: number): number {
      const wrapped = ((degree % 7) + 7) % 7;
      const extra = Math.floor(degree / 7);
      const semi = score.scale[wrapped] + (extra + octave) * 12;
      return score.root * Math.pow(2, semi / 12);
  }

  private playStep(step: number, time: number) {
      if (!this.ctx || !this.musicGain) return;
      const menu = this.currentTrack === 'MENU';
      const key: OrganId | 'menu' = menu ? 'menu' : this.organ;
      const score = SCORES[key];
      const layers = menu ? 4 : this.layer;
      const beat = step % 16;
      const bar = Math.floor(step / 16) % 4;
      const chord = score.chords[bar];
      const dest = this.musicGain;
      const cut = score.color === 'murk' ? 520 : score.color === 'spark' ? 3200 : score.color === 'glass' ? 2400 : score.color === 'air' ? 1600 : 1400;
      const wave: OscillatorType = score.color === 'murk' || score.color === 'spark' ? 'sawtooth' : 'triangle';

      if (layers >= 1) {
          if (score.color === 'thump') {
              if (beat % 4 === 0) {
                  this.tone(time, 58, 0.16, 'sine', 0.42, 180, dest);
                  this.tone(time, 92, 0.08, 'triangle', 0.18, 400, dest);
                  this.lubAt = time;
              } else if (beat % 4 === 1) {
                  this.tone(time, 74, 0.07, 'sine', 0.16, 220, dest);
              }
          } else if ([0, 6, 8, 14].includes(beat)) {
              const vel = beat % 8 === 0 ? 0.34 : 0.18;
              this.tone(time, score.root / 2, 0.12, 'sine', vel, 200, dest);
          }
      }

      if (layers >= 2) {
          const offs = [0, -99, -99, 4, -99, 0, -99, 7, 0, -99, 4, -99, 2, -99, 0, -99];
          const off = offs[beat];
          if (off > -50) this.tone(time, this.hz(score, chord + off, -1), 0.22, wave, 0.16, Math.min(cut, 700), dest);
      }

      if (layers >= 3 && (beat % 2 === 1 || score.color === 'air' || score.color === 'glass')) {
          this.puff(score.color === 'air' ? 0.09 : 0.04, score.color === 'glass' ? 2800 : 1800, score.color === 'air' ? 0.07 : 0.045, time);
      }

      if (layers >= 4 && (beat === 0 || beat === 10)) {
          [0, 2, 4].forEach((add) => this.tone(time, this.hz(score, chord + add, 0), 0.85, wave, 0.045, cut, dest));
      }

      if (layers >= 5 && beat % 2 === 0) {
          const lead = LEAD[key];
          const degree = lead[(Math.floor(step / 2)) % lead.length];
          if (degree >= 0) this.tone(time, this.hz(score, degree, 1), 0.2, score.color === 'spark' ? 'square' : 'triangle', 0.07, cut, dest);
      }

      if (layers >= 6 && beat % 4 === 2) {
          const lead = LEAD[key];
          const degree = lead[(Math.floor(step / 2) + 3) % lead.length];
          if (degree >= 0) this.tone(time, this.hz(score, degree + 4, 1), 0.28, 'sine', 0.05, cut, dest);
      }
  }

  private tone(time: number, freq: number, dur: number, type: OscillatorType, vol: number, cutoff: number, dest: AudioNode) {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      const f = this.ctx.createBiquadFilter();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(30, freq), time);
      f.type = 'lowpass';
      f.frequency.setValueAtTime(cutoff, time);
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(Math.max(0.001, vol), time + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, time + Math.max(0.05, dur));
      osc.connect(f);
      f.connect(g);
      g.connect(dest);
      osc.start(time);
      osc.stop(time + dur + 0.03);
  }

  private puff(dur: number, cutoff: number, vol: number, when?: number) {
      if (!this.ctx || !this.sfxGain) return;
      const time = when ?? this.ctx.currentTime;
      const frames = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buf = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = cutoff;
      f.Q.value = 0.7;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol, time);
      g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
      src.connect(f);
      f.connect(g);
      g.connect(when === undefined ? this.sfxGain : this.musicGain || this.sfxGain);
      src.start(time);
      src.stop(time + dur + 0.02);
  }
}

export const audioManager = new AudioManager();
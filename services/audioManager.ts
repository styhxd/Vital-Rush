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
import { flushCoin, latchCoin, scheduleCadence, scheduleCoinTick, type CoinVoice } from './coinFeel';
import { scheduleHurt, scheduleHurtClear, type HurtGrade } from './hurtFeel';
import { STAR_STEPS, playStarDown, playStarFanfare, playStarKill, playStarStep, starBpm } from './starMusic';

export type DrumHit = 'kick' | 'snare' | 'hat' | 'tom';

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
  private musicBed: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  
  // Véu de pouca vida. Abafa o brilho, não a música.
  private musicFilter: BiquadFilterNode | null = null;
  private lastDuck = -1;
  private nextGlitch = 0;
  private glitchUntil = 0;
  private moodLow = false;

  // O BANCO DE SONS (Memória Pura)
  private buffers: Record<string, AudioBuffer> = {};
  
  // Controle de Throttling
  private lastPlayTime: Record<string, number> = {};
  private coinRun = 0;
  private coinLast = 0;
  private coinLatch = 0;
  private coinGear = 0;
  private coinClosing = false;
  private coinCadenceUntil = 0;
  private coinHeard = 0;
  private coinFold = 0;
  private coinDue: number[] = [];
  private spendAt = 0;
  
  // Sequenciador Musical Procedural
  private isPlaying: boolean = false;
  private currentTrack: 'MENU' | 'GAME' | 'NONE' = 'NONE';
  private nextNoteTime: number = 0;
  private current16thNote: number = 0;
  
  // Estado do Jogo
  private organ: OrganId = 'molar';
  private layer = 2;
  private boss = false;
  private tempoMul = 1;
  private tempoBackAt = 0;
  private cadenceMul = 1;
  private cadenceTarget = 1;
  private shotCursor = -1;
  private lubAt = -1;
  private lungNudge = 0;
  private lungPushUntil = 0;
  private reverbSend: GainNode | null = null;
  private fireMs = 450;
  private drumEvery = 4;
  private musicEvery = 4;
  private rapid = false;
  private halfBeat = false;
  private chordDegree = 0;
  private lockedEvery = 0;
  private grid: { t: number; sixteenth: number }[] = [];
  private fallbackNext = 0;
  private fallbackOrigin = 0;
  
  private timerID: number | null = null;

  // Leucogen. A fanfarra sai por fora do filtro de pouca vida.
  private starOn = false;
  private starHeld = false;
  private starStep = 0;
  private starNext = 0;
  private starWarm = 0;
  private lifeMute = 0;
  private killStreak = 0;
  private starKillAt = 0;
  private starBurst = 0;
  private starBurstAt = 0;
  private starBus: GainNode | null = null;
  private starDuck: GainNode | null = null;
  private coinEcho: DelayNode | null = null;
  private coinEchoGain: GainNode | null = null;

  public settings = {
    master: 0.82,
    music: 1,
    sfx: 0.42,
    mono: false,
  };

  private ear = { x: 960, y: 540 };
  private shotDue = 0;
  private drive: Float32Array | null = null;

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

    this.musicBed = this.ctx.createGain();
    this.musicBed.gain.value = 1;

    this.musicFilter = this.ctx.createBiquadFilter();
    this.musicFilter.type = 'lowpass';
    this.musicFilter.frequency.value = 22000; 
    this.musicFilter.Q.value = 0.7;

    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -16;
    this.compressor.knee.value = 18;
    this.compressor.ratio.value = 2;
    this.compressor.attack.value = 0.02;
    this.compressor.release.value = 0.32;
    
    this.musicGain.connect(this.musicBed);
    this.musicBed.connect(this.musicFilter);
    this.musicFilter.connect(this.compressor);
    
    this.sfxGain.connect(this.compressor);

    this.starDuck = this.ctx.createGain();
    this.starDuck.gain.value = 1;
    this.starBus = this.ctx.createGain();
    this.starBus.gain.value = 0.0001;
    this.starDuck.connect(this.starBus);
    this.starBus.connect(this.compressor);

    // A moeda não entra no compressor. A música engorda com a onda e, no PC,
    // o compressor ia levando o tilintar junto até quase sumir.
    this.coinBus = this.ctx.createGain();
    try {
        this.coinPan = this.ctx.createStereoPanner();
        this.coinPan.connect(this.coinBus);
    } catch {
        this.coinPan = null;
    }
    this.coinBus.connect(this.masterGain);
    try {
        this.coinEcho = this.ctx.createDelay(0.4);
        this.coinEcho.delayTime.value = 0.098;
        this.coinEchoGain = this.ctx.createGain();
        this.coinEchoGain.gain.value = 0.0001;
        const echoBack = this.ctx.createGain();
        echoBack.gain.value = 0.34;
        this.coinBus.connect(this.coinEcho);
        this.coinEcho.connect(this.coinEchoGain);
        this.coinEchoGain.connect(this.masterGain);
        this.coinEchoGain.connect(echoBack);
        echoBack.connect(this.coinEcho);
    } catch {
        this.coinEcho = null;
        this.coinEchoGain = null;
    }
    
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
    const listener = this.ctx.listener;
    if (listener.positionX) {
        listener.positionX.value = 0;
        listener.positionY.value = 0;
        listener.positionZ.value = 0;
        listener.forwardX.value = 0;
        listener.forwardY.value = 0;
        listener.forwardZ.value = -1;
        listener.upX.value = 0;
        listener.upY.value = 1;
        listener.upZ.value = 0;
    }
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

  public setGameState(wave: number, healthRatio: number, adrenaline = false) {
      if (!this.musicFilter || !this.musicBed || !this.ctx) return;
      if (this.starOn || this.starHeld) return;
      if (this.ctx.currentTime < this.starWarm) return;
      const now = this.ctx.currentTime;
      if (now < this.lifeMute) return;
      const low = healthRatio < 0.3;
      const hurt = low ? 1 - Math.max(0, healthRatio) / 0.3 : 0;
      let cutoff = 20000;
      if (low) {
          const center = 7800 - hurt * 4700;
          const wobble = Math.sin(now * 2.2) * (80 + hurt * 220);
          cutoff = Math.max(2400, center + wobble);
      }
      if (now >= this.glitchUntil) {
          if (!low) {
              if (this.lastFilterFreq !== 20000) {
                  this.lastFilterFreq = 20000;
                  this.musicFilter.frequency.setTargetAtTime(20000, now, 0.6);
                  this.musicFilter.Q.setTargetAtTime(0.7, now, 0.45);
              }
          } else {
              this.lastFilterFreq = cutoff;
              this.musicFilter.frequency.setTargetAtTime(cutoff, now, 0.22);
              this.musicFilter.Q.setTargetAtTime(0.8 + hurt * 0.5, now, 0.35);
          }
      }

      const duck = adrenaline ? 0.74 : 1;
      if (Math.abs(duck - this.lastDuck) > 0.02) {
          this.lastDuck = duck;
          this.musicBed.gain.setTargetAtTime(duck, now, adrenaline ? 0.45 : 0.6);
      }

      if (low && !this.moodLow) this.nextGlitch = now + 1.2;
      this.moodLow = low;
      if (!low || now < this.nextGlitch) return;

      this.nextGlitch = now + 2.2 + Math.random() * 1.6;
      this.glitchUntil = now + 0.2;
      const dip = adrenaline ? 0.6 : 0.9;
      this.musicBed.gain.cancelScheduledValues(now);
      this.musicBed.gain.setValueAtTime(Math.max(0.05, this.musicBed.gain.value), now);
      this.musicBed.gain.linearRampToValueAtTime(dip, now + 0.03);
      this.musicBed.gain.linearRampToValueAtTime(duck, now + 0.11);
      this.lastDuck = duck;
      const choked = Math.max(1500, cutoff * 0.62);
      this.musicFilter.frequency.cancelScheduledValues(now);
      this.musicFilter.frequency.setValueAtTime(Math.max(40, cutoff), now);
      this.musicFilter.frequency.linearRampToValueAtTime(choked, now + 0.04);
      this.musicFilter.frequency.linearRampToValueAtTime(Math.max(40, cutoff), now + 0.18);
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

      // HIT: a short dull thud. The square blip was louder than the drums.
      this.buffers['hit'] = await this.renderOffline(0.09, (c) => {
          const osc = c.createOscillator();
          const g = c.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(150, 0);
          osc.frequency.exponentialRampToValueAtTime(62, 0.09);
          g.gain.setValueAtTime(0.34, 0);
          g.gain.exponentialRampToValueAtTime(0.01, 0.09);
          const f = c.createBiquadFilter();
          f.type = 'lowpass';
          f.frequency.value = 420;
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

  public setEar(x: number, y: number) {
      this.ear.x = x;
      this.ear.y = y;
  }

  private dropLater(node: AudioNode, life: number) {
      if (!this.sfxGain || node === this.sfxGain) return;
      window.setTimeout(() => { try { node.disconnect(); } catch { /* already gone */ } }, Math.ceil((life + 0.12) * 1000));
  }

  private sfxOut(at?: { x: number; y: number } | null, life = 0.45): AudioNode {
      const dest = this.sfxGain;
      const ctx = this.ctx;
      if (!dest || !ctx) return dest as AudioNode;
      if (!at || this.settings.mono) return dest;
      const x = Math.max(-1, Math.min(1, (at.x - this.ear.x) / 960));
      try {
          const pan = ctx.createStereoPanner();
          pan.pan.setValueAtTime(x, ctx.currentTime);
          pan.connect(dest);
          this.dropLater(pan, life);
          return pan;
      } catch {
          return dest;
      }
  }

  private playBuffer(name: string, vol: number = 1.0, pitchSemitones: number = 0, throttleMs: number = 0, at?: { x: number; y: number } | null) {
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
          const life = (source.buffer?.duration ?? 0.3) / Math.max(0.25, source.playbackRate.value);
          gain.connect(this.sfxOut(at, life));
      }
      
      source.start();
  }

  public updateVolumes() {
    if (!this.masterGain || !this.musicGain || !this.sfxGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    const master = Math.max(0, Math.min(1, this.settings.master));
    const music = Math.max(0, Math.min(1, this.settings.music)) * 1.6;
    const sfx = Math.max(0, Math.min(1, this.settings.sfx)) * 1.34;
    this.masterGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.cancelScheduledValues(now);
    this.sfxGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(master, now);
    this.musicGain.gain.setValueAtTime(music, now);
    this.sfxGain.gain.setValueAtTime(sfx, now);
    this.applyCoinLevel(now);
  }

  private starLevel(): number {
      return Math.max(0.001, Math.max(0, Math.min(1, this.settings.music)) * 1.6 * 0.68);
  }

  private applyCoinLevel(now: number) {
      if (!this.coinBus || !this.ctx) return;
      const sfx = Math.max(0, Math.min(1, this.settings.sfx)) * 1.34;
      const coin = sfx * (this.starOn ? 1.62 : 1);
      this.coinBus.gain.cancelScheduledValues(now);
      this.coinBus.gain.setValueAtTime(Math.max(0.0001, coin), now);
      if (this.coinEchoGain) {
          const echo = this.starOn ? 0.62 : 0.0001;
          this.coinEchoGain.gain.cancelScheduledValues(now);
          this.coinEchoGain.gain.setValueAtTime(Math.max(0.0001, this.coinEchoGain.gain.value), now);
          this.coinEchoGain.gain.linearRampToValueAtTime(echo, now + 0.05);
      }
  }

  public starLive(): boolean {
      return this.starOn || this.starHeld;
  }

  /** Pausa a música do órgão e entra a fanfarra, já no gancho. */
  public beginStar() {
      if (!this.ctx || !this.starBus || !this.starDuck) {
          void this.init().then(() => this.beginStar());
          return;
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      if (this.starOn) return;
      this.starHeld = false;
      this.starOn = true;
      this.starStep = 0;
      this.killStreak = 0;
      this.starKillAt = 0;
      this.starBurst = 0;
      const now = this.ctx.currentTime;
      this.starNext = now + 0.04;
      this.currentTrack = 'GAME';
      this.isPlaying = true;
      if (this.musicBed) {
          this.musicBed.gain.cancelScheduledValues(now);
          this.musicBed.gain.setValueAtTime(Math.max(0.0001, this.musicBed.gain.value), now);
          this.musicBed.gain.linearRampToValueAtTime(0.0001, now + 0.05);
      }
      this.starDuck.gain.cancelScheduledValues(now);
      this.starDuck.gain.setValueAtTime(1, now);
      this.starBus.gain.cancelScheduledValues(now);
      this.starBus.gain.setValueAtTime(0.0001, now);
      this.starBus.gain.exponentialRampToValueAtTime(this.starLevel(), now + 0.03);
      this.applyCoinLevel(now);
      if (this.sfxGain) playStarFanfare(this.ctx, this.sfxGain, now);
      if (this.timerID === null) this.scheduler();
  }

  /** A pausa do jogo segura o compasso. O tema do órgão não entra no meio. */
  public holdStar(): boolean {
      if (!this.starOn || !this.ctx) return false;
      this.starHeld = true;
      this.starOn = false;
      this.silenceStar(this.ctx.currentTime);
      this.isPlaying = false;
      if (this.timerID !== null) {
          window.clearTimeout(this.timerID);
          this.timerID = null;
      }
      return true;
  }

  public resumeStar(): boolean {
      if (!this.starHeld || !this.ctx || !this.starBus || !this.starDuck) return false;
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      this.starHeld = false;
      this.starOn = true;
      this.isPlaying = true;
      this.currentTrack = 'GAME';
      const now = this.ctx.currentTime;
      this.starNext = now + 0.04;
      if (this.musicBed) this.musicBed.gain.setValueAtTime(0.0001, now);
      this.starDuck.gain.setValueAtTime(1, now);
      this.starBus.gain.cancelScheduledValues(now);
      this.starBus.gain.setValueAtTime(0.0001, now);
      this.starBus.gain.exponentialRampToValueAtTime(this.starLevel(), now + 0.04);
      this.applyCoinLevel(now);
      if (this.timerID === null) this.scheduler();
      return true;
  }

  public endStar(handoff: boolean) {
      if (!this.starOn && !this.starHeld) return;
      if (!this.ctx) {
          this.starOn = false;
          this.starHeld = false;
          return;
      }
      this.finishStarAudio(Math.max(this.ctx.currentTime, this.starNext), handoff);
  }

  public starKill() {
      if (!this.starOn || !this.ctx || !this.starDuck || !this.sfxGain) return;
      if (this.ctx.state !== 'running') return;
      const wall = performance.now();
      if (wall - this.starBurstAt > 70) this.starBurst = 0;
      this.starBurstAt = wall;
      const delay = Math.min(0.08, this.starBurst * 0.014);
      this.starBurst++;
      this.starKillAt = wall;
      this.killStreak++;
      playStarKill(this.ctx, this.starDuck, this.sfxGain, this.ctx.currentTime + delay, this.killStreak - 1);
  }

  public starOffer(at?: { x: number; y: number } | null) {
      if (!this.ctx || !this.sfxGain || this.ctx.state !== 'running') return;
      const dest = this.sfxOut(at, 0.36);
      const t = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(t + i * 0.042, f, 0.11, 'triangle', 0.03, 3400, dest));
  }

  private silenceStar(at: number) {
      if (!this.ctx || !this.starBus) return;
      const t = Math.max(at, this.ctx.currentTime);
      this.starBus.gain.cancelScheduledValues(t);
      this.starBus.gain.setValueAtTime(Math.max(0.0001, this.starBus.gain.value), t);
      this.starBus.gain.linearRampToValueAtTime(0.0001, t + 0.04);
      this.starOn = false;
      this.applyCoinLevel(t);
  }

  private finishStarAudio(at: number, handoff: boolean) {
      if (!this.ctx || !this.starBus) return;
      const now = this.ctx.currentTime;
      const seam = Math.max(now + 0.03, at);
      this.starOn = false;
      this.starHeld = false;
      this.killStreak = 0;
      if (this.starDuck) {
          this.starDuck.gain.cancelScheduledValues(now);
          this.starDuck.gain.setValueAtTime(1, now);
      }
      this.starBus.gain.cancelScheduledValues(now);
      this.starBus.gain.setValueAtTime(Math.max(0.0001, this.starBus.gain.value), now);
      this.starBus.gain.linearRampToValueAtTime(0.0001, seam + 0.08);
      this.applyCoinLevel(now);
      if (!handoff || !this.musicBed) return;
      if (this.sfxGain) playStarDown(this.ctx, this.sfxGain, Math.max(now, seam - 0.06));
      this.starWarm = seam + 0.5;
      this.currentTrack = 'GAME';
      this.isPlaying = true;
      this.current16thNote = 0;
      this.nextNoteTime = seam;
      this.lastDuck = 1;
      this.musicBed.gain.cancelScheduledValues(now);
      this.musicBed.gain.setValueAtTime(Math.max(0.0001, this.musicBed.gain.value), now);
      this.musicBed.gain.linearRampToValueAtTime(0.82, seam);
      this.musicBed.gain.linearRampToValueAtTime(1, seam + 0.18);
      if (this.timerID === null) this.scheduler();
  }

  public playShoot() { this.playBuffer('shoot', 0.85, Math.random()*2, 60); }
  public playDash() { this.playBuffer('shoot', 0.28, 8, 40); }
  public playBuy() {
      if (!this.ctx || !this.sfxGain || this.ctx.state !== 'running') return;
      const dest = this.sfxGain;
      const t = this.ctx.currentTime;
      this.tone(t, 523.25, 0.09, 'triangle', 0.05, 2200, dest);
      this.tone(t + 0.05, 659.25, 0.11, 'sine', 0.055, 2800, dest);
      this.tone(t + 0.1, 783.99, 0.14, 'sine', 0.048, 3400, dest);
  }

  /** A carta fechou. Acorde maior, curto, alto o bastante para mostrar. */
  public playCrown() {
      if (!this.ctx || !this.sfxGain || this.ctx.state !== 'running') return;
      const dest = this.sfxGain;
      const t = this.ctx.currentTime;
      this.tone(t, 392, 0.18, 'triangle', 0.05, 1600, dest);
      this.tone(t + 0.045, 493.88, 0.16, 'sine', 0.042, 2100, dest);
      this.tone(t + 0.09, 587.33, 0.2, 'sine', 0.05, 2600, dest);
      this.tone(t + 0.14, 783.99, 0.22, 'sine', 0.036, 3600, dest);
  }
  public playHit(at?: { x: number; y: number } | null) { this.playBuffer('hit', 0.42, 0, 50, at); }

  /**
   * A membrana rasga. Tom que cai na faixa do celular, com um ruído seco,
   * longe do metal da moeda e abaixo da bomba.
   */
  public playHurt(grade: HurtGrade, at?: { x: number; y: number } | null) {
      if (!this.ctx || !this.sfxGain || this.ctx.state !== 'running') return;
      const now = performance.now();
      const gate = grade === 0 ? 120 : 160;
      if (now - this.hurtAt < gate && grade <= this.hurtHeard) return;
      this.hurtAt = now;
      this.hurtHeard = grade;
      scheduleHurt(this.ctx, this.sfxOut(at, 0.28), this.ctx.currentTime, grade);
  }

  /** Sopro de saída, só depois de um golpe de verdade. Mais quieto que o toque. */
  public playHurtClear(at?: { x: number; y: number } | null) {
      if (!this.ctx || !this.sfxGain || this.ctx.state !== 'running') return;
      const now = performance.now();
      if (now - this.clearAt < 420) return;
      this.clearAt = now;
      scheduleHurtClear(this.ctx, this.sfxOut(at, 0.04), this.ctx.currentTime);
  }
  public playExplosion(at?: { x: number; y: number } | null) { this.playBuffer('expl', 0.48, 0, 100, at); }
  public playPowerUp(at?: { x: number; y: number } | null) { this.playBuffer('power', 0.5, 0, 80, at); }
  private coinAt: { x: number; y: number } | null = null;
  private coinBus: GainNode | null = null;
  private coinPan: StereoPannerNode | null = null;
  private hurtAt = 0;
  private hurtHeard: HurtGrade = 0;
  private clearAt = 0;

  private coinVoice(): CoinVoice {
      return {
          run: this.coinRun,
          lastAt: this.coinLast,
          latch: this.coinLatch,
          gear: this.coinGear,
          closing: this.coinClosing,
          cadenceUntil: this.coinCadenceUntil,
      };
  }

  private applyCoin(v: CoinVoice) {
      this.coinRun = v.run;
      this.coinLast = v.lastAt;
      this.coinLatch = v.latch;
      this.coinGear = v.gear;
      this.coinClosing = v.closing;
      this.coinCadenceUntil = v.cadenceUntil;
  }

  public queueCoins(n: number, at?: { x: number; y: number } | null) {
      const add = Math.max(0, Math.min(32, Math.round(n)));
      for (let i = 0; i < add; i++) this.playCoin(at);
  }

  public trimCoins(_keep = 0) {
      this.stopCoins();
  }

  public stopCoins() {
      this.coinDue.length = 0;
      this.coinFold = 0;
      this.coinHeard = 0;
      this.applyCoin({ run: 0, lastAt: 0, latch: 0, gear: 0, closing: false, cadenceUntil: 0 });
  }

  public pumpCoins() {
      this.drainCoins();
  }

  /** Cada coleta entra na frase. O floreio fecha mesmo com moeda ainda chegando. */
  private drainCoins() {
      if (!this.ctx || !this.sfxGain) return;
      if (this.ctx.state !== 'running') {
          this.resume();
          return;
      }
      const now = performance.now();
      const dest = this.coinEar();
      for (let n = 0; n < 3; n++) {
          const flushed = flushCoin(this.coinVoice(), now);
          this.applyCoin(flushed.voice);
          if (!flushed.play || !this.ctx) break;
          if (flushed.play.kind === 'tick') {
              scheduleCoinTick(this.ctx, dest, this.ctx.currentTime, flushed.play.step, flushed.play.piled, flushed.play.gear);
          } else {
              scheduleCadence(this.ctx, dest, this.ctx.currentTime, flushed.play.gear);
          }
          this.coinHeard = now;
      }
  }

  /** Um pan só, reaproveitado. Cada moeda não abre um panner novo. */
  private coinEar(): AudioNode {
      const bus = this.coinBus ?? this.sfxGain;
      const pan = this.coinPan;
      const ctx = this.ctx;
      if (!bus || !pan || !ctx) return bus ?? this.sfxGain!;
      const x = !this.coinAt || this.settings.mono
          ? 0
          : Math.max(-1, Math.min(1, (this.coinAt.x - this.ear.x) / 720));
      pan.pan.setValueAtTime(x, ctx.currentTime);
      return pan;
  }

  /**
   * Um tilintar por tempo, não uma fila. Moedas do mesmo instante viram um
   * ataque só. Nove notas sobem; o floreio fecha; se ainda houver moeda, recomeça.
   */
  public playCoin(at?: { x: number; y: number } | null, _force = false) {
      if (at) this.coinAt = at;
      this.applyCoin(latchCoin(this.coinVoice()));
      this.drainCoins();
  }

  private hardPan(pan: number, life: number): AudioNode {
      const dest = this.sfxGain;
      const ctx = this.ctx;
      if (!dest || !ctx || this.settings.mono) return dest as AudioNode;
      try {
          const panner = ctx.createStereoPanner();
          panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), ctx.currentTime);
          panner.connect(dest);
          this.dropLater(panner, life);
          return panner;
      } catch {
          return dest;
      }
  }

  /** Orelha esquerda. A vida sobe: terça maior, curta, gostosa. */
  public playMend() {
      if (!this.ctx || !this.sfxGain || this.ctx.state !== 'running') return;
      const dest = this.hardPan(-1, 0.16);
      const t = this.ctx.currentTime;
      this.tone(t, 523.25, 0.11, 'sine', 0.042, 2000, dest);
      this.tone(t + 0.04, 659.25, 0.14, 'sine', 0.048, 2600, dest);
  }

  /**
   * Orelha direita. O DNA desce. O timbre continua doce (sine, terça menor
   * para baixo), mas o contorno cai: gastar é bom, gastar vida dói.
   */
  public playSpend(_at?: { x: number; y: number } | null) {
      if (!this.ctx || !this.sfxGain || this.ctx.state !== 'running') return;
      const now = performance.now();
      if (now - this.spendAt < 140) return;
      this.spendAt = now;
      const dest = this.hardPan(1, 0.14);
      const t = this.ctx.currentTime;
      this.tone(t, 880, 0.07, 'sine', 0.04, 2400, dest);
      this.tone(t + 0.028, 698.46, 0.11, 'triangle', 0.036, 1800, dest);
  }

  public playSigh(at?: { x: number; y: number } | null, strength = 1) {
      if (!this.ctx || !this.sfxGain || this.ctx.state !== 'running') return;
      const dest = this.sfxOut(at, 0.9);
      const t = this.ctx.currentTime;
      const dur = 0.62 + Math.min(0.4, Math.max(0, strength) * 0.22);
      const noise = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = noise;
      const air = this.ctx.createBiquadFilter();
      air.type = 'bandpass';
      air.Q.value = 0.85;
      air.frequency.setValueAtTime(720, t);
      air.frequency.exponentialRampToValueAtTime(280, t + dur);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.07, t + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(air);
      air.connect(g);
      g.connect(dest);
      src.start(t);
      src.stop(t + dur + 0.02);
      this.tone(t + 0.04, 196, dur * 0.85, 'sine', 0.03, 640, dest);
      this.tone(t + 0.16, 146.8, dur * 0.7, 'sine', 0.02, 480, dest);
  }
  public playShiny(at?: { x: number; y: number } | null) {
      if (!this.ctx || !this.sfxGain || this.ctx.state !== 'running') return;
      const dest = this.sfxOut(at, 0.46);
      const t = this.ctx.currentTime;
      [784, 988, 1318.5].forEach((f, i) => this.tone(t + i * 0.07, f, 0.16, 'sine', 0.045, 4600, dest));
      this.tone(t + 0.2, 1568, 0.22, 'triangle', 0.028, 5200, dest);
  }
  public playSlip(at?: { x: number; y: number } | null) {
      if (!this.ctx || !this.sfxGain || this.ctx.state !== 'running') return;
      const dest = this.sfxOut(at, 0.28);
      const t = this.ctx.currentTime;
      this.tone(t, 740, 0.1, 'sine', 0.028, 2400, dest);
      this.tone(t + 0.07, 494, 0.18, 'triangle', 0.022, 1600, dest);
  }
  public playSurge(at?: { x: number; y: number } | null) { this.playBuffer('surge', 0.6, 0, 500, at); }
  
  public playMineExplosionShot(at?: { x: number; y: number } | null) { this.playBuffer('mine_expl_heavy', 0.38, 0, 150, at); } 
  public playMineExplosionDash(at?: { x: number; y: number } | null) { this.playBuffer('mine_expl_dash', 0.5, 0, 150, at); }
  
  public playBossDash(at?: { x: number; y: number } | null) { this.playBuffer('boss_dash', 0.7, 0, 300, at); }
  public playEnemyShoot(at?: { x: number; y: number } | null) { this.playBuffer('enemy_shoot', 0.4, Math.random()*2, 80, at); }

  private buildReverb() {
      if (!this.ctx || !this.musicFilter || !this.compressor || this.reverbSend) return;
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
      this.musicFilter.connect(this.reverbSend);
      this.reverbSend.connect(conv);
      conv.connect(this.compressor);
  }

  public setScene(organ: OrganId, local: number, boss: boolean) {
      if (organ !== this.organ) this.lockedEvery = 0;
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
      return Math.exp(-Math.max(0, age) * 3.2);
  }

  public ecgApproach() {
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime;
      this.tempoMul = 1.12;
      this.tempoBackAt = t + 1.7;
      // A bedside monitor sits near 1 kHz. This run is a fast heart, about 170 bpm, still separate pips.
      for (let i = 0; i < 5; i++) this.monitorBeep(t + i * 0.35, 1000, 0.11, 0.2);
  }

  public ecgPass(at?: { x: number; y: number } | null) {
      if (!this.ctx || !this.sfxGain) return;
      const dest = this.sfxOut(at, 1.5);
      const t = this.ctx.currentTime;
      this.tempoMul = 1.06;
      this.tempoBackAt = t + 1.5;
      const osc = this.ctx.createOscillator();
      const over = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      const g2 = this.ctx.createGain();
      osc.type = 'sine';
      over.type = 'sine';
      osc.frequency.setValueAtTime(1000, t);
      over.frequency.setValueAtTime(2000, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.04);
      g.gain.setValueAtTime(0.16, t + 1.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.25);
      g2.gain.setValueAtTime(0.0001, t);
      g2.gain.exponentialRampToValueAtTime(0.03, t + 0.04);
      g2.gain.setValueAtTime(0.03, t + 1.02);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + 1.25);
      osc.connect(g);
      over.connect(g2);
      g.connect(dest);
      g2.connect(dest);
      osc.start(t);
      over.start(t);
      osc.stop(t + 1.28);
      over.stop(t + 1.28);
  }

  public playBiteWarn(at?: { x: number; y: number } | null) {
      if (!this.ctx || !this.sfxGain) return;
      const dest = this.sfxOut(at, 0.6);
      const t = this.ctx.currentTime;
      this.tone(t, 78, 0.4, 'sine', 0.08, 180, dest);
      this.tone(t + 0.18, 52, 0.46, 'sine', 0.1, 140, dest);
  }

  public playBite(at?: { x: number; y: number } | null) {
      if (!this.ctx || !this.musicGain || !this.sfxGain) return;
      const t = this.ctx.currentTime;
      const body = this.musicGain;
      this.play808(t, 128, 34, 0.4, 0.78, body);
      this.play808(t + 0.02, 64, 30, 0.32, 0.46, body);
      this.puff(0.12, 220, 0.16, t, this.sfxOut(at, 0.4));
  }

  public playBubble(at?: { x: number; y: number } | null) {
      if (!this.ctx || !this.sfxGain) return;
      const dest = this.sfxOut(at);
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      const start = 420 + Math.random() * 380;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(start, t);
      osc.frequency.exponentialRampToValueAtTime(90 + Math.random() * 40, t + 0.11);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.11, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      osc.connect(g);
      g.connect(dest);
      osc.start(t);
      osc.stop(t + 0.14);
  }

  public playSuction(at?: { x: number; y: number } | null) {
      if (!this.ctx || !this.sfxGain) return;
      const dest = this.sfxOut(at, 0.85);
      const t = this.ctx.currentTime;
      this.puff(0.7, 600, 0.16, undefined, dest);
      this.tone(t, 320, 0.7, 'sine', 0.06, 900, dest);
  }

  public playGulp(at?: { x: number; y: number } | null) {
      this.playBubble(at);
      window.setTimeout(() => this.playBubble(at), 70);
      if (!this.ctx || !this.sfxGain) return;
      this.tone(this.ctx.currentTime, 90, 0.2, 'sine', 0.12, 300, this.sfxOut(at));
  }

  public playDrip(at?: { x: number; y: number } | null) {
      this.playBubble(at);
  }

  public playWet(at?: { x: number; y: number } | null) {
      this.puff(0.22, 700, 0.14, undefined, this.sfxOut(at));
      this.playBubble(at);
  }

  public playZap(at?: { x: number; y: number } | null) {
      if (!this.ctx || !this.sfxGain) return;
      const dest = this.sfxOut(at);
      const t = this.ctx.currentTime;
      this.puff(0.06, 3200, 0.22, undefined, dest);
      this.tone(t, 1400, 0.08, 'square', 0.07, 4000, dest);
      this.tone(t + 0.04, 220, 0.12, 'sawtooth', 0.06, 1200, dest);
  }

  public playStick(at?: { x: number; y: number } | null) {
      this.puff(0.1, 240, 0.2, undefined, this.sfxOut(at));
  }

  public playGlyph() {
      if (!this.ctx || !this.sfxGain) return;
      this.pip(this.ctx.currentTime, 1480, 0.018, 0.035);
  }

  public playPage() {
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime;
      this.tone(t, 520, 0.08, 'triangle', 0.07, 1800, this.sfxGain);
      this.tone(t + 0.06, 780, 0.1, 'sine', 0.05, 2000, this.sfxGain);
  }

  public playFieldDemo() {
      if (!this.ctx || !this.sfxGain) return;
      const ctx = this.ctx;
      const dest = this.sfxGain;
      const t0 = ctx.currentTime;
      const mono = this.settings.mono;
      const voice = (start: number, dur: number, freq: number, pan: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, start);
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(0.2, start + 0.04);
          gain.gain.setValueAtTime(0.16, start + Math.max(0.08, dur - 0.18));
          gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
          osc.connect(gain);
          let out: AudioNode = gain;
          if (!mono) {
              const panner = ctx.createStereoPanner();
              panner.pan.setValueAtTime(pan, start);
              gain.connect(panner);
              out = panner;
          }
          out.connect(dest);
          osc.start(start);
          osc.stop(start + dur + 0.03);
      };
      if (mono) {
          voice(t0, 1.85, 196, 0);
          voice(t0, 1.85, 784, 0);
          return;
      }
      voice(t0, 0.9, 196, -1);
      voice(t0 + 0.85, 1.0, 784, 1);
  }

  public lungPush(amount: number) {
      if (!this.ctx) return;
      this.lungNudge = amount;
      this.lungPushUntil = this.ctx.currentTime + 0.85;
  }

  public playBreath(kind: 'in' | 'out' = 'out', at?: { x: number; y: number } | null) {
      if (!this.ctx || !this.sfxGain) return;
      const dur = kind === 'in' ? 0.5 : 0.9;
      const dest = this.sfxOut(at, dur);
      const t = this.ctx.currentTime;
      this.puff(dur, kind === 'in' ? 520 : 1500, kind === 'in' ? 0.1 : 0.2, undefined, dest);
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(kind === 'in' ? 130 : 80, t);
      osc.frequency.linearRampToValueAtTime(kind === 'in' ? 210 : 150, t + dur * 0.65);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(kind === 'in' ? 0.07 : 0.12, t + dur * 0.4);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      osc.connect(g);
      g.connect(dest);
      osc.start(t);
      osc.stop(t + dur + 0.02);
  }
  /**
   * A tosse avisa antes de estourar. O primeiro chamado sobe a pressão.
   * O segundo, perto do fim, é mais curto: sai agora.
   */
  public playCoughWarn(at?: { x: number; y: number } | null, soon = false) {
      if (!this.ctx || !this.sfxGain || this.ctx.state !== 'running') return;
      const dest = this.sfxOut(at, soon ? 0.28 : 0.55);
      const t = this.ctx.currentTime;
      if (soon) {
          this.puff(0.08, 860, 0.2, t, dest);
          this.tone(t, 262, 0.11, 'triangle', 0.07, 1100, dest);
          this.tone(t + 0.06, 349, 0.09, 'sine', 0.05, 1400, dest);
          return;
      }
      this.puff(0.46, 520, 0.1, t, dest);
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      const f = this.ctx.createBiquadFilter();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(118, t);
      osc.frequency.exponentialRampToValueAtTime(310, t + 0.5);
      f.type = 'lowpass';
      f.frequency.setValueAtTime(980, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.05, t + 0.38);
      g.gain.linearRampToValueAtTime(0.0001, t + 0.52);
      osc.connect(f);
      f.connect(g);
      g.connect(dest);
      osc.start(t);
      osc.stop(t + 0.54);
      this.tone(t + 0.1, 196, 0.14, 'sine', 0.05, 800, dest);
      this.tone(t + 0.28, 262, 0.12, 'sine', 0.045, 900, dest);
  }
  public playCough(at?: { x: number; y: number } | null) {
      const dest = this.sfxOut(at);
      this.puff(0.12, 420, 0.28, undefined, dest);
      window.setTimeout(() => this.puff(0.1, 280, 0.22, undefined, this.sfxOut(at)), 90);
      window.setTimeout(() => this.puff(0.16, 180, 0.18, undefined, this.sfxOut(at)), 180);
  }
  public playClot(at?: { x: number; y: number } | null) {
      this.playBubble(at);
      window.setTimeout(() => this.playBubble(at), 80);
      window.setTimeout(() => this.playBubble(at), 150);
      if (!this.ctx || !this.sfxGain) return;
      this.tone(this.ctx.currentTime, 70, 0.28, 'sine', 0.16, 220, this.sfxOut(at));
  }
  /**
   * Uma vida saiu. Dois tombos na faixa que o celular toca, com um rasgo
   * no meio. A música abaixa um instante e volta: o plantão não para.
   */
  public playLifeLost(at?: { x: number; y: number } | null) {
      if (!this.ctx || !this.sfxGain || this.ctx.state !== 'running') return;
      const t = this.ctx.currentTime;
      const dest = at ? this.sfxOut(at, 0.7) : this.sfxGain;
      if (this.starOn && this.starBus) {
          const cur = Math.max(0.0001, this.starBus.gain.value);
          this.starBus.gain.cancelScheduledValues(t);
          this.starBus.gain.setValueAtTime(cur, t);
          this.starBus.gain.linearRampToValueAtTime(Math.max(0.0001, cur * 0.42), t + 0.03);
          this.starBus.gain.linearRampToValueAtTime(this.starLevel(), t + 0.48);
      } else if (this.musicBed && !this.starHeld) {
          const cur = Math.max(0.0001, this.musicBed.gain.value);
          this.musicBed.gain.cancelScheduledValues(t);
          this.musicBed.gain.setValueAtTime(cur, t);
          this.musicBed.gain.linearRampToValueAtTime(0.34, t + 0.03);
          this.musicBed.gain.linearRampToValueAtTime(1, t + 0.58);
          this.lifeMute = t + 0.62;
          this.lastDuck = 1;
      }
      const fall = (when: number, from: number, to: number, peak: number, dur: number) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(from, when);
          osc.frequency.exponentialRampToValueAtTime(Math.max(90, to), when + dur);
          g.gain.setValueAtTime(0.0008, when);
          g.gain.exponentialRampToValueAtTime(peak, when + 0.012);
          g.gain.exponentialRampToValueAtTime(0.0008, when + dur);
          osc.connect(g);
          g.connect(dest);
          osc.start(when);
          osc.stop(when + dur + 0.02);
      };
      this.puff(0.1, 3200, 0.34, t, dest);
      fall(t, 740, 240, 0.2, 0.26);
      this.puff(0.08, 1900, 0.22, t + 0.28, dest);
      fall(t + 0.28, 560, 180, 0.16, 0.32);
  }
  public playCrack() {
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime;
      this.puff(0.16, 2800, 0.42, t);
      this.tone(t, 640, 0.11, 'triangle', 0.22, 220, this.sfxGain);
      this.tone(t + 0.03, 380, 0.22, 'sawtooth', 0.1, 160, this.sfxGain);
      this.tone(t + 0.05, 210, 0.36, 'sine', 0.16, 110, this.sfxGain);
      this.puff(0.08, 900, 0.28, t + 0.04);
  }
  public playDepart() {
      if (!this.ctx || !this.musicGain) return;
      const t = this.ctx.currentTime;
      this.puff(0.62, 980, 0.2, t);
      this.tone(t, 146, 0.72, 'sine', 0.1, 1200, this.musicGain);
      this.tone(t + 0.1, 220, 0.5, 'triangle', 0.08, 1700, this.musicGain);
      this.tone(t + 0.28, 349, 0.42, 'sine', 0.06, 2000, this.musicGain);
  }
  public playArrive() {
      if (!this.ctx || !this.musicGain) return;
      const t = this.ctx.currentTime;
      this.puff(0.28, 520, 0.1, t);
      this.tone(t, 392, 0.5, 'sine', 0.1, 1600, this.musicGain);
      this.tone(t + 0.14, 523.25, 0.62, 'triangle', 0.09, 1900, this.musicGain);
      this.tone(t + 0.3, 659.25, 0.7, 'sine', 0.06, 2100, this.musicGain);
  }
  public playTrophy() {
      if (!this.ctx || !this.musicGain) return;
      const t = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      notes.forEach((freq, i) => this.tone(t + i * 0.11, freq, 0.78, 'triangle', 0.15, 2500, this.musicGain!));
      this.tone(t + 0.48, 523.25, 1.15, 'sine', 0.09, 1400, this.musicGain);
      this.tone(t + 0.48, 659.25, 1.15, 'sine', 0.07, 1600, this.musicGain);
      this.tone(t + 0.48, 783.99, 1.25, 'triangle', 0.09, 1900, this.musicGain);
      this.puff(0.36, 1500, 0.14, t + 0.42);
      this.tone(t + 0.95, 1568, 0.85, 'sine', 0.06, 2400, this.musicGain);
  }
  public playCampaign() {
      if (!this.ctx || !this.musicGain) return;
      const t = this.ctx.currentTime;
      const line = [392, 494, 587, 659, 784, 988, 1175, 1568];
      line.forEach((freq, i) => this.tone(t + i * 0.18, freq, 0.62, 'triangle', 0.11, 2200, this.musicGain!));
      const chord = [523.25, 659.25, 784, 1046.5];
      chord.forEach((freq, i) => this.tone(t + 1.7, freq, 5.6, i % 2 ? 'sine' : 'triangle', 0.07, 1600, this.musicGain!));
      this.tone(t + 1.7, 130.8, 5.4, 'sine', 0.1, 420, this.musicGain);
      this.puff(0.5, 900, 0.16, t + 1.6);
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
    if ((this.starOn || this.starHeld) && this.ctx) this.finishStarAudio(this.ctx.currentTime, false);
    this.starOn = false;
    this.starHeld = false;
    this.isPlaying = false;
    this.currentTrack = 'NONE';
    this.lubAt = -1;
    this.grid = [];
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
      if (this.starHeld && track === 'GAME') {
          this.resumeStar();
          return;
      }
      if (this.currentTrack === track) return;
      this.stopMusic();

      this.isPlaying = true;
      this.currentTrack = track;
      this.current16thNote = 0;
      this.cadenceMul = 1;
      this.cadenceTarget = 1;
      this.shotCursor = -1;
      this.lockedEvery = 0;
      this.musicEvery = 4;
      this.halfBeat = false;
      this.rapid = false;
      this.grid = [];
      this.nextNoteTime = this.ctx.currentTime + 0.1;
      this.scheduler();
  }

  private liveBpm(): number {
      const score = this.currentTrack === 'MENU' ? SCORES.menu : SCORES[this.organ];
      const cadence = this.currentTrack === 'GAME' ? this.cadenceMul : 1;
      let bpm = score.bpm * (this.boss && this.currentTrack === 'GAME' ? 1.12 : 1) * this.tempoMul * cadence;
      if (this.currentTrack === 'GAME' && this.organ === 'lung' && this.ctx) {
          const wob = 1 + 0.045 * Math.sin(this.ctx.currentTime * 0.7);
          const push = this.ctx.currentTime < this.lungPushUntil ? this.lungNudge : 0;
          bpm *= wob * (1 + push);
      }
      return bpm;
  }

  private scheduleStar() {
      if (!this.ctx || !this.starOn || !this.starDuck) return;
      const now = this.ctx.currentTime;
      if (this.starKillAt > 0 && performance.now() - this.starKillAt > 1800 && this.killStreak > 0) {
          this.killStreak = Math.max(0, this.killStreak - 1);
          this.starKillAt = performance.now();
      }
      if (this.starNext < now - 0.2) this.starNext = now;
      let n = 0;
      while (this.starOn && this.starNext < now + 0.12 && n < 8) {
          if (this.starStep >= STAR_STEPS) {
              this.finishStarAudio(this.starNext, true);
              break;
          }
          playStarStep(this.ctx, this.starDuck, this.starStep, this.starNext, this.killStreak);
          this.starNext += (60 / starBpm(this.starStep)) / 4;
          this.starStep++;
          n++;
      }
  }

  private scheduler() {
      if (!this.ctx || !this.isPlaying) return;
      if (this.starOn) this.scheduleStar();
      if (this.starOn) {
          this.timerID = window.setTimeout(() => this.scheduler(), 25);
          return;
      }
      const now = this.ctx.currentTime;
      if (this.tempoBackAt > 0 && now > this.tempoBackAt) {
          this.tempoMul = 1;
          this.tempoBackAt = 0;
      }
      if (this.currentTrack === 'GAME') {
          this.cadenceMul += (this.cadenceTarget - this.cadenceMul) * 0.14;
          if (Math.abs(this.cadenceMul - this.cadenceTarget) < 0.004) this.cadenceMul = this.cadenceTarget;
      }
      if (this.nextNoteTime < now - 0.2) this.nextNoteTime = now;
      let iterations = 0;
      while (this.nextNoteTime < now + 0.12 && iterations < 8) {
          this.playStep(this.current16thNote, this.nextNoteTime);
          const secondsPerBeat = 60 / this.liveBpm();
          const step = 0.25 * secondsPerBeat;
          if (this.halfBeat) {
              this.grid.push({
                  t: this.nextNoteTime + step * 0.5,
                  sixteenth: ((this.current16thNote % 16) * 2 + 1) % 16,
              });
              if (this.grid.length > 64) this.grid.splice(0, this.grid.length - 64);
          }
          this.nextNoteTime += step;
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

  public armGun(intervalMs: number, rapid = false) {
      const musicMs = Math.max(140, rapid ? intervalMs * 2 : intervalMs);
      const shotMs = rapid ? musicMs / 2 : musicMs;
      this.fireMs = shotMs;
      this.rapid = rapid;
      if (this.currentTrack !== 'GAME') return;
      const score = SCORES[this.organ];
      const base = score.bpm * (this.boss ? 1.12 : 1) * this.tempoMul;
      const fit = this.fitCadence(musicMs, base);
      this.musicEvery = fit.every;
      const shotEvery = rapid ? Math.max(1, fit.every / 2) : fit.every;
      this.halfBeat = rapid && shotEvery === fit.every;
      if (shotEvery !== this.drumEvery) this.shotCursor = -1;
      this.drumEvery = shotEvery;
      this.cadenceTarget = fit.cadence;
  }

  /** A cadência escolhe a subdivisão, e o tempo da música estica até o tiro cair nela. */
  private fitCadence(fireMs: number, baseBpm: number): { every: number; cadence: number } {
      const ladder = [8, 4, 2, 1];
      const held = this.musicEvery || 4;
      let best = { every: held, cadence: 1, err: Infinity };
      for (const every of ladder) {
          const natural = every * (60000 / Math.max(40, baseBpm)) / 4;
          const cadence = Math.max(0.78, Math.min(1.68, natural / fireMs));
          const actual = natural / cadence;
          let err = Math.abs(Math.log(actual / fireMs));
          if (every === held) err -= 0.012;
          if (err < best.err) best = { every, cadence, err };
      }
      return best;
  }

  public takeDrum(): DrumHit | null {
      if (!this.ctx || this.currentTrack !== 'GAME' || this.grid.length === 0) return this.takeFallback();
      const now = this.ctx.currentTime;
      const every = Math.max(1, this.drumEvery);
      let due: { t: number; sixteenth: number } | null = null;
      for (let i = this.grid.length - 1; i >= 0; i--) {
          const slot = this.grid[i];
          if (slot.t > now + 0.02) continue;
          if (slot.sixteenth % every !== 0) continue;
          if (slot.t <= this.shotCursor + 0.01) break;
          due = slot;
          break;
      }
      if (!due) return null;
      this.shotCursor = due.t;
      return this.drumVoice(due.sixteenth, every);
  }

  private takeFallback(): DrumHit | null {
      const now = performance.now();
      const bpm = (this.currentTrack === 'MENU' ? SCORES.menu : SCORES[this.organ]).bpm;
      const every = this.pickEvery(this.fireMs, bpm);
      this.drumEvery = every;
      const sixteenth = (60000 / bpm) / 4;
      const step = sixteenth * every;
      if (this.fallbackNext <= 0) {
          this.fallbackOrigin = now;
          this.fallbackNext = now;
      }
      if (now + 12 < this.fallbackNext) return null;
      if (now - this.fallbackNext > step) {
          this.fallbackNext += Math.floor((now - this.fallbackNext) / step) * step;
      }
      const slot = this.fallbackNext;
      this.fallbackNext += step;
      const index = Math.round((slot - this.fallbackOrigin) / sixteenth);
      return this.drumVoice(((index % 16) + 16) % 16, every);
  }

  /** Soft clip, then a low pass, so the 808 speaks on a phone without a bright edge. */
  private driveCurve(): Float32Array {
      if (this.drive) return this.drive;
      const n = 1024;
      const curve = new Float32Array(n);
      for (let i = 0; i < n; i++) {
          const x = (i / (n - 1)) * 2 - 1;
          curve[i] = Math.tanh(x * 2.1) * 0.86;
      }
      this.drive = curve;
      return curve;
  }

  /** Chord tone in the bass octave, so the shot sits in the organ's key. */
  private drumHz(add: number): number {
      const key = this.currentTrack === 'MENU' ? 'menu' : this.organ;
      let hz = this.hz(SCORES[key], this.chordDegree + add, -1);
      if (hz < 36) hz *= 2;
      if (hz > 96) hz /= 2;
      return hz;
  }

  private play808(time: number, startHz: number, endHz: number, dur: number, peak: number, dest: AudioNode) {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const body = this.ctx.createOscillator();
      const shape = this.ctx.createWaveShaper();
      const tone = this.ctx.createBiquadFilter();
      const g = this.ctx.createGain();
      shape.curve = this.driveCurve() as Float32Array<ArrayBuffer>;
      shape.oversample = '2x';
      osc.type = 'sine';
      body.type = 'sine';
      const end = Math.max(34, endHz);
      const start = Math.max(end * 1.15, startHz);
      osc.frequency.setValueAtTime(start, time);
      osc.frequency.exponentialRampToValueAtTime(end, time + Math.min(0.05, dur * 0.34));
      body.frequency.setValueAtTime(end * 2, time);
      tone.type = 'lowpass';
      tone.frequency.setValueAtTime(360, time);
      tone.Q.value = 0.5;
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(Math.max(0.001, peak), time + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, time + Math.max(0.04, dur));
      const octave = this.ctx.createGain();
      octave.gain.setValueAtTime(0.5, time);
      osc.connect(shape);
      body.connect(octave);
      octave.connect(shape);
      shape.connect(tone);
      tone.connect(g);
      g.connect(dest);
      if (dest === this.musicGain && this.sfxGain) g.connect(this.sfxGain);
      osc.start(time);
      body.start(time);
      osc.stop(time + dur + 0.03);
      body.stop(time + dur + 0.03);
  }

  public playDrum(kind: DrumHit) {
      if (!this.ctx || !this.musicGain || this.ctx.state !== 'running') return;
      const t = this.ctx.currentTime;
      const dest = this.musicGain;
      const root = this.drumHz(0);
      if (kind === 'kick') {
          this.play808(t, root * 2.7, root, 0.46, 0.96, dest);
      } else if (kind === 'snare') {
          const fifth = this.drumHz(4);
          this.play808(t, fifth * 1.9, fifth, 0.15, 0.58, dest);
      } else if (kind === 'tom') {
          const third = this.drumHz(2);
          this.play808(t, third * 1.6, third, 0.12, 0.5, dest);
      } else {
          this.play808(t, root * 1.7, root, 0.1, 0.5, dest);
      }
  }

  private pickEvery(fireMs: number, bpm: number): number {
      const sixteenth = (60000 / Math.max(40, bpm)) / 4;
      const ladder = [8, 4, 2, 1];
      const legal = ladder.filter((n) => n * sixteenth >= fireMs * 0.78);
      const pool = legal.length ? legal : [8];
      const err = (n: number) => Math.abs(Math.log((n * sixteenth) / fireMs));
      let best = pool[0];
      let bestErr = Infinity;
      for (const n of pool) {
          const e = err(n);
          if (e < bestErr) { bestErr = e; best = n; }
      }
      if (!pool.includes(this.lockedEvery)) {
          this.lockedEvery = best;
          return best;
      }
      if (best !== this.lockedEvery && bestErr + 0.12 < err(this.lockedEvery)) this.lockedEvery = best;
      return this.lockedEvery;
  }

  private drumVoice(sixteenth: number, every: number): DrumHit {
      const s = sixteenth % 16;
      if (s === 0) return 'kick';
      if (s === 8) return every >= 8 ? 'snare' : 'kick';
      if (s === 4 || s === 12) return 'snare';
      if (s % 2 === 0) return 'hat';
      return 'tom';
  }

  private colorHit(score: Score, chord: number, beat: number, time: number, vol: number, dest: AudioNode) {
      const degree = chord + (beat % 4 === 0 ? 0 : beat % 4 === 2 ? 4 : 2);
      const hi = this.hz(score, degree, score.color === 'murk' ? 0 : 1);
      if (score.color === 'glass') {
          this.tone(time, hi, 0.2, 'sine', vol, 2800, dest);
          this.tone(time, hi * 2.01, 0.14, 'sine', vol * 0.32, 4200, dest);
      } else if (score.color === 'murk') {
          this.tone(time, hi, 0.3, 'triangle', vol * 0.9, 520, dest);
      } else if (score.color === 'thump') {
          this.tone(time, hi, 0.24, 'sine', vol, 900, dest);
          this.tone(time, hi * 1.5, 0.2, 'triangle', vol * 0.35, 1200, dest);
      } else if (score.color === 'air') {
          this.tone(time, hi, 0.26, 'sine', vol, 1800, dest);
          this.puff(0.1, 880, vol * 0.22, time);
      } else if (score.color === 'spark') {
          this.tone(time, hi, 0.1, 'square', vol * 0.4, 2400, dest);
          this.tone(time, hi * 2, 0.07, 'sine', vol * 0.25, 3600, dest);
      } else {
          this.tone(time, hi, 0.22, 'triangle', vol, 1600, dest);
      }
  }

  private playStep(step: number, time: number) {
      if (!this.ctx || !this.musicGain) return;
      if (this.currentTrack === 'GAME') {
          this.grid.push({ t: time, sixteenth: step % 16 });
          if (this.grid.length > 64) this.grid.splice(0, this.grid.length - 64);
      }
      const menu = this.currentTrack === 'MENU';
      const key: OrganId | 'menu' = menu ? 'menu' : this.organ;
      const score = SCORES[key];
      const layers = menu ? 4 : this.layer;
      const beat = step % 16;
      const bar = Math.floor(step / 16) % 4;
      const chord = score.chords[bar];
      this.chordDegree = chord;
      const dest = this.musicGain;
      const bed = 2.55;
      const cut = score.color === 'murk' ? 520 : score.color === 'spark' ? 3200 : score.color === 'glass' ? 2400 : score.color === 'air' ? 1600 : 1400;
      const wave: OscillatorType = score.color === 'murk' || score.color === 'spark' ? 'sawtooth' : 'triangle';
      const every = menu ? 4 : this.musicEvery;

      if (layers >= 1) {
          if (score.color === 'thump') {
              if (beat === 0) {
                  this.tone(time, 34, 0.62, 'sine', 0.22 * bed, 80, dest);
                  this.tone(time + 0.1, 40, 0.48, 'sine', 0.13 * bed, 110, dest);
                  this.lubAt = time;
              }
          } else if (beat === 0 || beat === 8) {
              this.tone(time, score.root / 2, 0.38, 'triangle', 0.16 * bed, 260, dest);
          }
      }

      if (layers >= 2) {
          const offs = [0, -99, -99, 4, -99, 0, -99, 7, 0, -99, 4, -99, 2, -99, 0, -99];
          const off = offs[beat];
          if (off > -50) this.tone(time, this.hz(score, chord + off, -1), 0.22, wave, 0.16 * bed, Math.min(cut, 700), dest);
      }

      if (layers >= 3) {
          let play = false;
          let vol = 0.06;
          if (every >= 8) { play = beat === 4 || beat === 12; vol = 0.07; }
          else if (every >= 4) { play = beat % 4 === 2; vol = 0.06; }
          else if (every >= 2) { play = beat % 2 === 0; vol = 0.042; }
          else { play = beat % 2 === 1; vol = 0.028; }
          if (play) this.colorHit(score, chord, beat, time, vol * bed, dest);
      }

      if (layers >= 4 && (beat === 0 || beat === 10)) {
          [0, 2, 4].forEach((add) => this.tone(time, this.hz(score, chord + add, 0), 0.85, wave, 0.045 * bed, cut, dest));
      }

      if (layers >= 5 && beat % 2 === 0) {
          const lead = LEAD[key];
          const degree = lead[(Math.floor(step / 2)) % lead.length];
          if (degree >= 0) this.tone(time, this.hz(score, degree, 1), 0.2, score.color === 'spark' ? 'square' : 'triangle', 0.07 * bed, cut, dest);
      }

      if (layers >= 6 && beat % 4 === 2) {
          const lead = LEAD[key];
          const degree = lead[(Math.floor(step / 2) + 3) % lead.length];
          if (degree >= 0) this.tone(time, this.hz(score, degree + 4, 1), 0.28, 'sine', 0.05 * bed, cut, dest);
      }
  }

  private monitorBeep(time: number, freq: number, dur: number, vol: number) {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const over = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      const g2 = this.ctx.createGain();
      osc.type = 'sine';
      over.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      over.frequency.setValueAtTime(freq * 2, time);
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(vol, time + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
      g2.gain.setValueAtTime(0.0001, time);
      g2.gain.exponentialRampToValueAtTime(vol * 0.22, time + 0.004);
      g2.gain.exponentialRampToValueAtTime(0.0001, time + dur * 0.4);
      osc.connect(g);
      over.connect(g2);
      g.connect(this.sfxGain);
      g2.connect(this.sfxGain);
      osc.start(time);
      over.start(time);
      osc.stop(time + dur + 0.02);
      over.stop(time + dur + 0.02);
  }

  private pip(time: number, freq: number, dur: number, vol: number) {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, time);
      g.gain.setValueAtTime(vol, time);
      g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(time);
      osc.stop(time + dur + 0.02);
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

  private puff(dur: number, cutoff: number, vol: number, when?: number, dest?: AudioNode) {
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
      g.connect(dest ?? (when === undefined ? this.sfxGain : this.musicGain || this.sfxGain));
      src.start(time);
      src.stop(time + dur + 0.02);
  }
}

export const audioManager = new AudioManager();


/**
 * ------------------------------------------------------------------
 * COPYRIGHT (c) 2026 ESTÚDIO CRIA
 * DIRETOR: PAULO GABRIEL DE L. S.
 * ------------------------------------------------------------------
 * 
 * AUDIO MANAGER V6: "SONIC DISTINCTION"
 * 
 * Centralização total da lógica de áudio.
 * Reversão do tiro do player para o clássico Arcade.
 * Separação drástica entre tipos de explosão de minas.
 */

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
    if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
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
    
    await this.bakeSounds();
    this.updateVolumes();
  }

  public setGameState(wave: number, healthRatio: number) {
      this.currentWave = wave;
      if (this.musicFilter && this.ctx) {
          let targetFreq = 22000;
          if (healthRatio < 0.3) {
              targetFreq = 200 + (healthRatio / 0.3) * 600; 
          }
          this.musicFilter.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.5);
      }
  }

  private async bakeSounds() {
      if (!this.ctx) return;
      
      // --- REVERSÃO DO TIRO DO PLAYER (CLASSIC PEW) ---
      // Oscilador Triangular com decaimento rápido de pitch.
      // Removemos a síntese FM complicada.
      this.buffers['shoot'] = await this.renderOffline(0.15, (c) => {
          const osc = c.createOscillator();
          const g = c.createGain();
          
          osc.type = 'triangle'; // Clássico de arcade, menos irritante que Square
          osc.frequency.setValueAtTime(900, 0); 
          osc.frequency.exponentialRampToValueAtTime(300, 0.15); // Sweep rápido
          
          g.gain.setValueAtTime(0.25, 0);
          g.gain.exponentialRampToValueAtTime(0.01, 0.1);
          
          osc.connect(g);
          g.connect(c.destination);
          osc.start();
      });

      // --- EXPLOSÃO DE MINA 1: TIRO (IMPACTANTE) ---
      // Heavy Bass + Noise. Uma explosão "suja" e forte.
      this.buffers['mine_expl_heavy'] = await this.renderOffline(0.7, (c) => {
          // Camada 1: Impacto Grave (Square Wave distorcida)
          const osc = c.createOscillator();
          const gOsc = c.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(150, 0);
          osc.frequency.exponentialRampToValueAtTime(10, 0.5);
          gOsc.gain.setValueAtTime(0.8, 0);
          gOsc.gain.exponentialRampToValueAtTime(0.01, 0.5);

          // Camada 2: Ruído de Detonação
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

      // --- EXPLOSÃO DE MINA 2: DASH (ENERGIA/VÁCUO) ---
      // Sine Wave pura. Limpa. Soa como uma implosão de energia ou bolha.
      this.buffers['mine_expl_dash'] = await this.renderOffline(0.6, (c) => {
          const osc = c.createOscillator();
          const g = c.createGain();
          
          osc.type = 'sine'; // Sem harmônicos, som "redondo"
          osc.frequency.setValueAtTime(400, 0);
          osc.frequency.exponentialRampToValueAtTime(50, 0.4); // Drop rápido
          
          g.gain.setValueAtTime(0.8, 0);
          g.gain.exponentialRampToValueAtTime(0.01, 0.6);
          
          // Phaser Effect (Leve stereo ou modulação de volume)
          const lfo = c.createOscillator();
          lfo.frequency.value = 20;
          const lfoGain = c.createGain();
          lfoGain.gain.value = 200;
          lfo.connect(lfoGain);
          // Não conectamos LFO na frequência principal para manter o som limpo, 
          // apenas mantemos simples para diferenciar do tiro.
          
          osc.connect(g);
          g.connect(c.destination);
          osc.start();
      });

      // HIT: Impacto físico
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
      
      // EXPLOSÃO PADRÃO
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
      
      // POWER UP
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
          const osc1 = c.createOscillator();
          const osc2 = c.createOscillator();
          const g = c.createGain();
          osc1.type = 'sawtooth';
          osc2.type = 'sawtooth';
          osc1.frequency.setValueAtTime(100, 0);
          osc1.frequency.linearRampToValueAtTime(400, 0.8);
          osc2.frequency.setValueAtTime(105, 0); 
          osc2.frequency.linearRampToValueAtTime(410, 0.8);
          g.gain.setValueAtTime(0.15, 0);
          g.gain.linearRampToValueAtTime(0, 0.8);
          const f = c.createBiquadFilter();
          f.type = 'highpass';
          f.frequency.value = 500;
          osc1.connect(f);
          osc2.connect(f);
          f.connect(g);
          g.connect(c.destination);
          osc1.start();
          osc2.start();
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

      // --- INSTRUMENTOS MUSICAIS ---
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
  
  // NOVOS MÉTODOS DE ÁUDIO DIFERENCIADOS
  public playMineExplosionShot() { this.playBuffer('mine_expl_heavy', 1.0, 0, 150); } // Tiro = Impacto Forte
  public playMineExplosionDash() { this.playBuffer('mine_expl_dash', 0.9, 0, 150); } // Dash = Energia/Limpo
  
  public playBossDash() { this.playBuffer('boss_dash', 0.7, 0, 300); }
  public playEnemyShoot() { this.playBuffer('enemy_shoot', 0.4, Math.random()*2, 80); }

  public stopMusic() {
    this.isPlaying = false;
    this.currentTrack = 'NONE';
    if (this.timerID !== null) {
        window.clearTimeout(this.timerID);
        this.timerID = null;
    }
  }

  public startGameMusic() { this.startTrack('GAME'); }
  public startMenuMusic() { this.startTrack('MENU'); }

  private startTrack(track: 'MENU' | 'GAME') {
      if (this.currentTrack === track) return;
      this.stopMusic();
      if (!this.ctx) return;

      this.isPlaying = true;
      this.currentTrack = track;
      this.current16thNote = 0;
      this.nextNoteTime = this.ctx.currentTime + 0.1;
      this.scheduler();
  }

  private getCurrentBPM(): number {
      if (this.currentTrack === 'MENU') return 90;
      return Math.min(160, 125 + (this.currentWave * 2));
  }

  private scheduler() {
      if (!this.ctx || !this.isPlaying) return;
      
      const ahead = 0.1; 
      const now = this.ctx.currentTime;
      
      if (this.nextNoteTime < now - 0.2) {
          this.nextNoteTime = now;
      }

      let iterations = 0;
      while (this.nextNoteTime < now + ahead && iterations < 8) {
          this.playProceduralNote(this.current16thNote);
          
          const bpm = this.getCurrentBPM();
          const secondsPerBeat = 60.0 / bpm;
          this.nextNoteTime += 0.25 * secondsPerBeat; 
          
          this.current16thNote = (this.current16thNote + 1) % 16;
          iterations++;
      }
      
      this.timerID = window.setTimeout(() => this.scheduler(), 25);
  }

  private playProceduralNote(beat: number) {
      if (this.currentTrack === 'MENU') {
          if (beat === 0) this.playBuffer('kick', 0.5, -5); 
          if (beat % 4 === 2) this.playBuffer('hat', 0.1, 0);
          if (beat % 8 === 0) this.playBuffer('bass', 0.3, 0); 
          return;
      }

      let scale = this.SCALE_MAJOR;
      let rootKey = 0; 
      
      if (this.currentWave >= 3) {
          scale = this.SCALE_MINOR;
          rootKey = 3; 
      }
      if (this.currentWave >= 6) {
          scale = this.SCALE_DARK;
          rootKey = 1; 
      }

      if (beat % 4 === 0) {
          this.playBuffer('kick', 0.8, 0);
      }
      
      if (this.currentWave > 4 && beat % 4 === 2) {
           this.playBuffer('kick', 0.5, -2);
      }

      if (beat % 4 === 2) {
          this.playBuffer('hat', 0.4, 0); 
      } else {
          if (this.currentWave > 2 || beat % 2 === 0) {
            this.playBuffer('hat', 0.15, 12); 
          }
      }

      if (beat % 2 === 0) {
          let noteIndex = 0;
          if (beat < 8) {
              noteIndex = (beat / 2) % scale.length;
          } else {
              if (this.currentWave % 2 === 0) {
                  noteIndex = scale.length - 1 - ((beat / 2) % scale.length); 
              } else {
                  noteIndex = Math.floor(Math.random() * scale.length); 
              }
          }
          const semitone = scale[noteIndex] + rootKey;
          const octave = (beat % 4 === 0) ? -12 : 0; 
          this.playBuffer('bass', 0.25, semitone + octave);
      }
  }
}

export const audioManager = new AudioManager();
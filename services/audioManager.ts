/**
 * ------------------------------------------------------------------
 * COPYRIGHT (c) 2026 ESTÚDIO CRIA
 * DIRETOR: PAULO GABRIEL DE L. S.
 * ------------------------------------------------------------------
 * 
 * AUDIO MANAGER V5: "THE PROCEDURAL MAESTRO"
 * 
 * Agora o áudio não é apenas um loop estático.
 * Ele compõe música em tempo real baseada no estresse do jogador.
 * Inclui baking de sons sintetizados para performance zero-custo.
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
  
  // Estado do Jogo (O Maestro precisa saber o que está acontecendo)
  private currentWave: number = 1;
  private currentHealthRatio: number = 1.0;
  
  private timerID: number | null = null;

  public settings = {
    master: 0.8,
    music: 0.6,
    sfx: 0.7
  };

  // Escalas Musicais (Intervalos em semitons)
  private readonly SCALE_MAJOR = [0, 4, 7, 12]; // Heroico
  private readonly SCALE_MINOR = [0, 3, 7, 10]; // Ação Padrão
  private readonly SCALE_DARK  = [0, 1, 6, 8];  // Terror/Caos (Phrygian/Locrian)

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

    // Configuração da Cadeia de Efeitos Musicais
    this.musicFilter = this.ctx.createBiquadFilter();
    this.musicFilter.type = 'lowpass';
    this.musicFilter.frequency.value = 22000; // Aberto por padrão
    this.musicFilter.Q.value = 1;

    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -12;
    this.compressor.ratio.value = 8; // Compressão pesada pra dar "punch"
    
    // Routing: Music -> Filter -> Compressor -> Master
    this.musicGain.connect(this.musicFilter);
    this.musicFilter.connect(this.compressor);
    
    // Routing: SFX -> Compressor -> Master
    this.sfxGain.connect(this.compressor);
    
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
    
    await this.bakeSounds();
    this.updateVolumes();
  }

  // Atualiza o estado para o compositor reagir
  public setGameState(wave: number, healthRatio: number) {
      this.currentWave = wave;
      
      // Suaviza a transição do filtro de vida (Low Pass)
      if (this.musicFilter && this.ctx) {
          // Se vida < 30%, fecha o filtro (som abafado). Se > 30%, abre.
          let targetFreq = 22000;
          if (healthRatio < 0.3) {
              // Mapeia 0.0-0.3 para 200Hz-800Hz
              targetFreq = 200 + (healthRatio / 0.3) * 600; 
          }
          
          // Transição suave para não dar "pop"
          this.musicFilter.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.5);
      }
  }

  private async bakeSounds() {
      if (!this.ctx) return;
      
      // --- SFX BASICOS ---
      this.buffers['shoot'] = await this.renderOffline(0.12, (c) => {
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

      this.buffers['hit'] = await this.renderOffline(0.1, (c) => {
          const osc = c.createOscillator();
          const g = c.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(150, 0);
          osc.frequency.exponentialRampToValueAtTime(10, 0.1);
          g.gain.setValueAtTime(0.2, 0);
          g.gain.exponentialRampToValueAtTime(0.01, 0.1);
          const f = c.createBiquadFilter();
          f.type = 'lowpass';
          f.frequency.value = 1000;
          osc.connect(f);
          f.connect(g);
          g.connect(c.destination);
          osc.start();
      });
      
      this.buffers['expl'] = await this.renderOffline(0.4, (c) => {
          const bufferSize = c.sampleRate * 0.4;
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
          g.gain.setValueAtTime(0.6, 0);
          g.gain.exponentialRampToValueAtTime(0.01, 0.4);
          src.connect(f);
          f.connect(g);
          g.connect(c.destination);
          src.start();
      });
      
      this.buffers['power'] = await this.renderOffline(0.3, (c) => {
          const osc = c.createOscillator();
          const g = c.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(440, 0);
          osc.frequency.setValueAtTime(880, 0.1);
          g.gain.setValueAtTime(0.1, 0);
          g.gain.linearRampToValueAtTime(0, 0.3);
          osc.connect(g);
          g.connect(c.destination);
          osc.start();
      });
      
      this.buffers['surge'] = await this.renderOffline(0.8, (c) => {
          const osc = c.createOscillator();
          const g = c.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(100, 0);
          osc.frequency.linearRampToValueAtTime(600, 0.8);
          g.gain.setValueAtTime(0.2, 0);
          g.gain.linearRampToValueAtTime(0, 0.8);
          osc.connect(g);
          g.connect(c.destination);
          osc.start();
      });

      // --- INSTRUMENTOS MUSICAIS (SAMPLES SINTÉTICOS) ---

      // KICK: Curto, grave, seco.
      this.buffers['kick'] = await this.renderOffline(0.15, (c) => {
          const osc = c.createOscillator();
          const g = c.createGain();
          osc.frequency.setValueAtTime(120, 0);
          osc.frequency.exponentialRampToValueAtTime(40, 0.15);
          g.gain.setValueAtTime(0.9, 0);
          g.gain.exponentialRampToValueAtTime(0.01, 0.15);
          // Leve distorção pra dar "gritty"
          const dist = c.createWaveShaper();
          dist.curve = new Float32Array([-0.5, 0.5]); 
          osc.connect(dist);
          dist.connect(g);
          g.connect(c.destination);
          osc.start();
      });

      // HI-HAT: Ruído filtrado
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

      // BASS/SYNTH: Sawtooth filtrada. A chave para a melodia.
      this.buffers['bass'] = await this.renderOffline(0.25, (c) => {
          const osc = c.createOscillator();
          const osc2 = c.createOscillator(); // Detune
          const g = c.createGain();
          const f = c.createBiquadFilter();
          
          osc.type = 'sawtooth';
          osc2.type = 'sawtooth';
          osc.frequency.value = 110; // Lá (A2) base
          osc2.frequency.value = 110.5; // Leve detune pra dar "gordura"
          
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

  // Toca buffer com variação de Pitch (semitones)
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
      
      // Matemática de Pitch: 2^(semitons/12)
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

  // --- O MAESTRO (Music Scheduler) ---
  
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

  // Calcula o BPM baseado na adrenalina e na onda atual
  private getCurrentBPM(): number {
      if (this.currentTrack === 'MENU') return 90;
      
      // Base: 125 BPM
      // Cada onda adiciona 2 BPM.
      // Cap em 160 BPM pra não virar Speedcore (ou vira? não, melhor segurar).
      return Math.min(160, 125 + (this.currentWave * 2));
  }

  private scheduler() {
      if (!this.ctx || !this.isPlaying) return;
      
      const ahead = 0.1; 
      const now = this.ctx.currentTime;
      
      if (this.nextNoteTime < now - 0.2) this.nextNoteTime = now;

      while (this.nextNoteTime < now + ahead) {
          this.playProceduralNote(this.current16thNote);
          
          const bpm = this.getCurrentBPM();
          const secondsPerBeat = 60.0 / bpm;
          this.nextNoteTime += 0.25 * secondsPerBeat; // Semicolcheia
          
          this.current16thNote = (this.current16thNote + 1) % 16;
      }
      
      this.timerID = window.setTimeout(() => this.scheduler(), 25);
  }

  // A Alma da Música. Escolhe notas baseado no estado do jogo.
  private playProceduralNote(beat: number) {
      if (this.currentTrack === 'MENU') {
          // Ambient Chill
          if (beat === 0) this.playBuffer('kick', 0.5, -5); 
          if (beat % 4 === 2) this.playBuffer('hat', 0.1, 0);
          if (beat % 8 === 0) this.playBuffer('bass', 0.3, 0); // Nota raiz
          return;
      }

      // --- GAME MUSIC LOGIC ---
      
      // 1. Definição da Escala Baseada na Onda
      let scale = this.SCALE_MAJOR;
      let rootKey = 0; // C (Dó)
      
      if (this.currentWave >= 3) {
          scale = this.SCALE_MINOR;
          rootKey = 3; // Eb (Mib) - Tom mais sério
      }
      if (this.currentWave >= 6) {
          scale = this.SCALE_DARK;
          rootKey = 1; // C# (Dó Sustenido) - Tenso
      }

      // 2. Bateria (Drum Machine)
      // Kick: Batida 4x4 clássica (Techno)
      if (beat % 4 === 0) {
          this.playBuffer('kick', 0.8, 0);
      }
      
      // Off-beat Bass Kick (Psytrance style em ondas altas)
      if (this.currentWave > 4 && beat % 4 === 2) {
           this.playBuffer('kick', 0.5, -2);
      }

      // Hats
      if (beat % 4 === 2) {
          this.playBuffer('hat', 0.4, 0); // Open Hat
      } else {
          // Closed hat frenético em ondas altas
          if (this.currentWave > 2 || beat % 2 === 0) {
            this.playBuffer('hat', 0.15, 12); 
          }
      }

      // 3. O Sintetizador Arpejador (Melodia Procedural)
      // Toca em colcheias (beats pares)
      if (beat % 2 === 0) {
          // Algoritmo de Arpejo Simples
          // "Pergunta e Resposta" baseado no compasso
          
          let noteIndex = 0;
          
          if (beat < 8) {
              // Pergunta (Sobe)
              noteIndex = (beat / 2) % scale.length;
          } else {
              // Resposta (Desce ou varia)
              if (this.currentWave % 2 === 0) {
                  noteIndex = scale.length - 1 - ((beat / 2) % scale.length); // Desce
              } else {
                  noteIndex = Math.floor(Math.random() * scale.length); // Aleatório (Caos)
              }
          }
          
          const semitone = scale[noteIndex] + rootKey;
          
          // Oitava oscila pra dar movimento
          const octave = (beat % 4 === 0) ? -12 : 0; 
          
          this.playBuffer('bass', 0.25, semitone + octave);
      }
  }
}

export const audioManager = new AudioManager();
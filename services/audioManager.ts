/**
 * ------------------------------------------------------------------
 * COPYRIGHT (c) 2024 ESTÚDIO CRIA
 * DIRETOR: PAULO GABRIEL DE L. S.
 * ------------------------------------------------------------------
 * 
 * O SINTETIZADOR (AUDIO MANAGER)
 * 
 * Esqueça arquivos .mp3 pesados. Esqueça carregamento lento.
 * Aqui nós cozinhamos ondas sonoras puras usando matemática e a Web Audio API.
 * 
 * É como ter um sintetizador modular dentro do navegador.
 * Nós criamos osciladores, filtros, ganhos e compressores em tempo real.
 * Se o som sair "crocante", é arte, não bug.
 */

export class AudioManager {
  private ctx: AudioContext | null = null;
  
  // Nossos nós de mixagem. É como uma mesa de som virtual.
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  
  // Estado do Sequenciador (A "Drum Machine" interna)
  private isPlaying: boolean = false;
  private currentTrack: 'MENU' | 'GAME' | 'NONE' = 'NONE';
  private nextNoteTime: number = 0;
  private current16thNote: number = 0; // Contagem de semicolcheias
  private tempo: number = 120;
  private lookahead: number = 25.0; // Milissegundos para olhar adiante
  private scheduleAheadTime: number = 0.1; // Segundos para agendar no hardware
  private timerID: number | null = null;

  // Estado da geração musical procedural
  private baseNote: number = 110; // Lá (A2)
  private noteQueue: {note: number, time: number}[] = [];

  // Configurações de volume (mixagem padrão)
  public settings = {
    master: 0.8,
    music: 0.6,
    sfx: 0.7
  };

  constructor() {
    // Lazy init. Não iniciamos o áudio no construtor porque os navegadores bloqueiam
    // AudioContext até o usuário clicar na página. Política anti-autoplay chata (mas justa).
  }

  // Chamado quando o usuário clica em "START" ou interage.
  public init() {
    if (this.ctx) return; // Já tá rodando, cala a boca.
    
    // Suporte legado pro Safari velho de guerra.
    const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
    this.ctx = new AudioContextClass();
    
    // Cria os canais de áudio
    this.masterGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();

    // COMPRESSOR: O segredo de um som "profissional".
    // Ele "esmaga" o som pra ficar tudo no mesmo nível e dá aquele efeito de "pumping"
    // quando o bumbo bate. Engenharia de áudio pura.
    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 30;
    compressor.ratio.value = 12;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;

    // Roteamento: Music/SFX -> Compressor -> Master -> Saída (Caixa de som)
    this.musicGain.connect(compressor);
    this.sfxGain.connect(compressor);
    compressor.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    this.updateVolumes();
  }

  public updateVolumes() {
    if (!this.masterGain) return;
    const now = this.ctx!.currentTime;
    // setTargetAtTime evita "cliques" e "pops" ao mudar o volume bruscamente.
    this.masterGain.gain.setTargetAtTime(this.settings.master, now, 0.1);
    this.musicGain!.gain.setTargetAtTime(this.settings.music, now, 0.1);
    this.sfxGain!.gain.setTargetAtTime(this.settings.sfx, now, 0.1);
  }

  public stopMusic() {
    this.isPlaying = false;
    this.currentTrack = 'NONE';
    if (this.timerID !== null) {
        window.clearTimeout(this.timerID); // Para o loop do sequenciador
        this.timerID = null;
    }
  }

  // --- MOTOR DO SEQUENCIADOR (The heartbeat) ---
  // Baseado no artigo clássico "A Tale of Two Clocks" do Chris Wilson.

  private nextNote() {
    const secondsPerBeat = 60.0 / this.tempo;
    this.nextNoteTime += 0.25 * secondsPerBeat; // Avança uma semicolcheia (1/16)
    this.current16thNote++;
    if (this.current16thNote === 16) {
        this.current16thNote = 0; // Loop do compasso
    }
  }

  private scheduleNote(beatNumber: number, time: number) {
    if (this.currentTrack === 'GAME') {
        this.playGameBeat(beatNumber, time);
    } else if (this.currentTrack === 'MENU') {
        this.playMenuBeat(beatNumber, time);
    }
  }

  // O Loop Infinito (enquanto tocar música)
  private scheduler() {
    if (!this.ctx || !this.isPlaying) return;

    // Enquanto houver notas para tocar no futuro próximo, agende-as.
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
        this.scheduleNote(this.current16thNote, this.nextNoteTime);
        this.nextNote();
    }
    // Verifica novamente daqui a pouco. setTimeout não é preciso, mas o AudioContext clock é.
    this.timerID = window.setTimeout(() => this.scheduler(), this.lookahead);
  }

  // --- INSTRUMENTOS SINTETIZADOS ---
  // Aqui é onde brincamos de Kraftwerk.

  private playKick(time: number, vol = 1.0) {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      // Um Kick (Bumbo) é basicamente uma onda senoidal caindo de frequência muito rápido.
      osc.frequency.setValueAtTime(150, time); // Começa em 150Hz
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5); // Cai pra quase zero
      
      gain.gain.setValueAtTime(vol, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5); // Envelope de volume
      
      osc.connect(gain);
      gain.connect(this.musicGain!);
      
      osc.start(time);
      osc.stop(time + 0.5);
  }

  private playHat(time: number, open = false) {
      if (!this.ctx) return;
      // Hi-Hat é Ruído Branco (White Noise) filtrado.
      const bufferSize = this.ctx.sampleRate * (open ? 0.3 : 0.05);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for(let i=0; i<bufferSize; i++) data[i] = Math.random() * 2 - 1; // Gera estática

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      // Filtro Passa-Alta pra tirar os graves e deixar só o "Tss Tss"
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 7000;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(open ? 0.05 : 0.03, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + (open ? 0.2 : 0.05));

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain!);
      noise.start(time);
  }

  private playBass(time: number, freq: number) {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      // Som estilo Acid / TB-303
      osc.type = 'sawtooth'; // Onda Dente de Serra (agressiva)
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      filter.Q.value = 8; // Ressonância alta pra "gritar"
      filter.frequency.setValueAtTime(200, time);
      filter.frequency.exponentialRampToValueAtTime(2000, time + 0.05); // "Wown" effect
      filter.frequency.exponentialRampToValueAtTime(100, time + 0.3);

      gain.gain.setValueAtTime(0.15, time);
      gain.gain.linearRampToValueAtTime(0, time + 0.3);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain!);
      osc.start(time);
      osc.stop(time + 0.3);
  }

  private playPad(time: number, freq: number, duration: number) {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle'; // Onda suave
      osc.frequency.setValueAtTime(freq, time);
      
      // Envelope suave (Slow Attack, Slow Release)
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.05, time + duration/2);
      gain.gain.linearRampToValueAtTime(0, time + duration);

      osc.connect(gain);
      gain.connect(this.musicGain!);
      osc.start(time);
      osc.stop(time + duration);
  }

  // --- TRILHAS MUSICAIS (COMPOSIÇÃO PROCEDURAL) ---

  public startMenuMusic() {
    if (this.currentTrack === 'MENU') return;
    this.stopMusic();
    if (!this.ctx) return;

    this.isPlaying = true;
    this.currentTrack = 'MENU';
    this.tempo = 80; // Lento, atmosférico, tenso
    this.current16thNote = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.scheduler();
  }

  private playMenuBeat(beat: number, time: number) {
      // Ambient Dark Pulsante
      if (beat === 0) {
          this.playKick(time, 0.4); // Kick suave (batida do coração)
          this.playPad(time, 55, 2); // Drone grave em Lá (A1)
          this.playPad(time, 110, 2);
      }
      if (beat === 8) {
           this.playKick(time, 0.2); // Síncope
      }
      
      // Bleeps aleatórios pra parecer computador de filme dos anos 80
      if (Math.random() > 0.8) {
          const notes = [440, 554, 659, 880]; // Escala pentatônica maior de Lá
          const n = notes[Math.floor(Math.random() * notes.length)];
          this.playPad(time, n, 0.2);
      }
  }

  public startGameMusic() {
    if (this.currentTrack === 'GAME') return;
    this.stopMusic();
    if (!this.ctx) return;

    this.isPlaying = true;
    this.currentTrack = 'GAME';
    this.tempo = 135; // Psytrance / Techno rápido pra gerar ansiedade
    this.current16thNote = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.scheduler();
  }

  private playGameBeat(beat: number, time: number) {
      // Kick "Four-on-the-floor" clássico
      if (beat % 4 === 0) {
          this.playKick(time, 1.0);
      }
      
      // Hi-Hats no contra-tempo (Tss Tss Tss)
      if (beat % 4 === 2) {
          this.playHat(time, true); // Aberto
      } else {
          this.playHat(time, false); // Fechado
      }

      // Linha de Baixo Galopante (16th notes)
      // Escala Ré Menor: D, E, F, G, A, Bb, C
      const root = 73.42; // D2
      const scale = [1, 9/8, 6/5, 4/3, 3/2, 8/5, 9/5, 2]; // Razões de entonação justa (matemática musical)
      
      if (beat % 4 !== 0) { // Sidechain: O baixo "cala a boca" quando o Kick bate
        // Melodia Procedural: O computador improvisa o baixo
        const noteIdx = Math.floor(Math.random() * 4); 
        const freq = root * scale[noteIdx];
        
        // Salto de oitava aleatório pra dar groove
        const finalFreq = Math.random() > 0.9 ? freq * 2 : freq;
        this.playBass(time, finalFreq);
      }
  }

  // --- EFEITOS SONOROS (SFX) ---
  // Disparados pelo jogo sob demanda.

  public playShoot() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    // Pew Pew clássico
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.1); // Pitch drop rápido
    
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  public playHit() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    // Som de impacto áspero
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.exponentialRampToValueAtTime(10, t + 0.1);
    
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500; // Abafa o som

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  public playExplosion() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    
    // Cria ruído rosa/branco manualmente
    const bufferSize = this.ctx.sampleRate * 0.5; 
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    // Filtro passa-baixa fechando simula a dissipação da explosão
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(50, t + 0.4);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain!);
    noise.start(t);
  }

  public playPowerUp() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    // Arpeggio rápido pra cima (som de moeda do Mario, mas Sci-Fi)
    osc.type = 'square'; // Onda quadrada = som de videogame 8-bit
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.linearRampToValueAtTime(800, t + 0.1); 
    osc.frequency.linearRampToValueAtTime(1200, t + 0.2); 
    
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.linearRampToValueAtTime(0.1, t + 0.2);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(t);
    osc.stop(t + 0.3);
  }
  
  public playSurge() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    // Efeito de sirene / carga de energia
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.linearRampToValueAtTime(800, t + 0.5); 
    osc.frequency.linearRampToValueAtTime(400, t + 1.0); 

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.linearRampToValueAtTime(0, t + 1.2);

    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(t);
    osc.stop(t + 1.2);
  }
}

export const audioManager = new AudioManager();
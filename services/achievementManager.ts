/**
 * ------------------------------------------------------------------
 * COPYRIGHT (c) 2024 ESTÚDIO CRIA
 * DIRETOR: PAULO GABRIEL DE L. S.
 * ------------------------------------------------------------------
 * 
 * O GERENTE DE EGO (ACHIEVEMENT MANAGER)
 * 
 * Este serviço é responsável por liberar dopamina no cérebro do jogador.
 * Ele conta quantas vezes você matou, morreu e explodiu coisas.
 * 
 * "Por que não usar um banco de dados real?"
 * Porque eu não quero pagar servidor AWS pra salvar que você matou 10 bactérias.
 * LocalStorage é vida. LocalStorage é amor. (Até o usuário limpar o cache).
 */

import { Achievement, AchievementProgress } from '../types';
import { ACHIEVEMENTS_LIST } from '../constants';

// A chave do cofre. Se mudar isso numa atualização, os jogadores perdem tudo
// e vêm com tochas e ancinhos na minha porta. NÃO TOQUE.
const STORAGE_KEY = 'VITAL_RUSH_ACHIEVEMENTS_V1';

export class AchievementManager {
  private progress: AchievementProgress = {};
  
  // Callbacks pra avisar a UI que algo legal aconteceu.
  // A UI adora saber das coisas. Fofoqueira.
  private onUnlockCallback: ((ach: Achievement) => void) | null = null;
  private onPlatinumCallback: (() => void) | null = null;

  constructor() {
    this.load();
  }

  // Conecta os fios com a Interface.
  public setCallbacks(onUnlock: (ach: Achievement) => void, onPlatinum: () => void) {
    this.onUnlockCallback = onUnlock;
    this.onPlatinumCallback = onPlatinum;
    this.checkPlatinum(); // Verifica logo de cara se o cara já é brabo.
  }

  // Tenta ler o LocalStorage. Se falhar, finge demência e começa do zero.
  private load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.progress = JSON.parse(stored);
      } else {
        // Inicializa tudo zerado pros noobs.
        ACHIEVEMENTS_LIST.forEach(ach => {
          this.progress[ach.id] = { unlocked: false, currentValue: 0 };
        });
        this.save();
      }
    } catch (e) {
      console.error("Failed to load achievements. O usuário deve estar usando modo anônimo ou uma torradeira.", e);
    }
  }

  // Salva no disco.
  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.progress));
    } catch (e) {
      console.error("Failed to save achievements. Memória cheia? Azar.", e);
    }
  }

  /**
   * O método principal. Chama isso toda vez que o jogador fizer algo útil.
   * @param id O ID da conquista (tem que bater com o constants.ts senão nada acontece)
   * @param amount Quanto adicionar (geralmente 1, mas se você matou 50 de uma vez...)
   */
  public track(id: string, amount: number) {
    const ach = ACHIEVEMENTS_LIST.find(a => a.id === id);
    if (!ach) return; // Conquista não existe. Dev digitou errado.

    if (!this.progress[ach.id]) {
        this.progress[ach.id] = { unlocked: false, currentValue: 0 };
    }

    const entry = this.progress[ach.id];
    if (entry.unlocked) return; // Já ganhou, para de encher o saco.

    if (ach.isCumulative) {
      entry.currentValue += amount;
    } else {
      // Para desafios de "High Score" numa única run.
      // Só atualiza se o novo valor for maior que o recorde anterior.
      if (amount > entry.currentValue) {
          entry.currentValue = amount;
      }
    }

    // A hora da verdade.
    if (entry.currentValue >= ach.targetValue) {
      this.unlock(ach);
    } else {
        this.save(); // Salva o progresso parcial pra não frustrar o cliente.
    }
  }

  // Rastreamento especializado para booleanos ou estados específicos (tipo "Comprou tudo").
  public set(id: string, value: number) {
      const ach = ACHIEVEMENTS_LIST.find(a => a.id === id);
      if (!ach) return;
      
      if (!this.progress[ach.id]) this.progress[ach.id] = { unlocked: false, currentValue: 0 };
      const entry = this.progress[ach.id];
      if (entry.unlocked) return;

      entry.currentValue = value;
      if (entry.currentValue >= ach.targetValue) {
          this.unlock(ach);
      } else {
          this.save();
      }
  }

  // CHEAT CODE / MODO DEUS
  // Usado pelo código secreto no menu.
  // Se você está lendo isso e vai usar no console do browser: Shame on you.
  public unlockAll() {
      ACHIEVEMENTS_LIST.forEach(ach => {
          this.progress[ach.id] = { 
              unlocked: true, 
              currentValue: ach.targetValue, 
              unlockedAt: Date.now() 
          };
      });
      this.save();
      // Força a verificação da platina pra estourar os fogos de artifício visuais.
      this.checkPlatinum(); 
  }

  // A mágica do desbloqueio.
  private unlock(ach: Achievement) {
    const entry = this.progress[ach.id];
    entry.unlocked = true;
    entry.unlockedAt = Date.now();
    entry.currentValue = ach.targetValue; // Capa o valor pra ficar bonito na UI (100/100).
    this.save();

    if (this.onUnlockCallback) {
      this.onUnlockCallback(ach);
    }
    
    this.checkPlatinum();
  }

  // Verifica se o jogador não tem vida social e desbloqueou tudo.
  public checkPlatinum() {
      // Ignora a própria conquista de platina pra evitar recursão infinita do mal.
      const allRegular = ACHIEVEMENTS_LIST.filter(a => a.id !== 'all_achievements');
      const allUnlocked = allRegular.every(a => this.progress[a.id]?.unlocked);
      
      if (allUnlocked) {
          const platAch = ACHIEVEMENTS_LIST.find(a => a.id === 'all_achievements');
          // Se ainda não desbloqueou a platina, desbloqueia agora.
          if (platAch && !this.progress[platAch.id]?.unlocked) {
              this.unlock(platAch);
              if (this.onPlatinumCallback) this.onPlatinumCallback();
          } else if (platAch && this.progress[platAch.id]?.unlocked) {
              // Já tinha desbloqueado, mas garante que a UI saiba (persistência de estado).
              if (this.onPlatinumCallback) this.onPlatinumCallback();
          }
      }
  }

  public getProgress() {
    return this.progress;
  }
  
  public isPlatinumUnlocked(): boolean {
      return !!this.progress['all_achievements']?.unlocked;
  }
}

// Singleton exportado. Só existe um Gerente de Conquistas na cidade.
export const achievementManager = new AchievementManager();
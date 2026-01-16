/**
 * ------------------------------------------------------------------
 * COPYRIGHT (c) 2026 ESTÚDIO CRIA
 * DIRETOR: PAULO GABRIEL DE L. S.
 * ------------------------------------------------------------------
 */

import { EntityType, Entity, Vector2 } from '../types';

export enum BossTrait {
    SPRINTER = 'SPRINTER',   // Dá dashes na direção do player
    TOXIC = 'TOXIC',       // Solta poças de ácido
    GUNNER = 'GUNNER',      // Atira rajadas de espinhos
    JUGGERNAUT = 'JUGGERNAUT' // Lento mas com HP imenso
}

export interface BossMutation {
    traits: BossTrait[];
    color: string;
    dashTimer: number;
    shootTimer: number;
    acidTimer: number;
    baseSpeed: number;
}

export class BossArchitect {
    private static TRAIT_COLORS = {
        [BossTrait.SPRINTER]: '#00ffff',
        [BossTrait.TOXIC]: '#bf00ff',
        [BossTrait.GUNNER]: '#ffaa00',
        [BossTrait.JUGGERNAUT]: '#ff0000'
    };

    public static mutate(): BossMutation {
        const traits: BossTrait[] = [];
        const availableTraits = Object.values(BossTrait);
        
        // Seleciona 1 a 2 traços aleatórios
        const numTraits = Math.random() > 0.7 ? 2 : 1;
        for(let i = 0; i < numTraits; i++) {
            const t = availableTraits[Math.floor(Math.random() * availableTraits.length)];
            if (!traits.includes(t)) traits.push(t);
        }

        const primaryTrait = traits[0];

        return {
            traits,
            color: this.TRAIT_COLORS[primaryTrait],
            dashTimer: primaryTrait === BossTrait.SPRINTER ? 3.0 : 0,
            shootTimer: primaryTrait === BossTrait.GUNNER ? 2.0 : 0,
            acidTimer: primaryTrait === BossTrait.TOXIC ? 1.5 : 0,
            baseSpeed: primaryTrait === BossTrait.JUGGERNAUT ? 0.2 : 0.4
        };
    }
}
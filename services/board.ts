import { Difficulty, OrganId } from '../types';

const KEY = 'vital.board.v1';
const ORGANS = new Set<OrganId>(['molar', 'liver', 'heart', 'lung', 'brain']);
const DIFFS = new Set<string>(Object.values(Difficulty));

export type RunRecord = {
    at: number;
    score: number;
    difficulty: Difficulty;
    route: OrganId[];
};

function valid(row: unknown): row is RunRecord {
    if (!row || typeof row !== 'object') return false;
    const item = row as RunRecord;
    return typeof item.at === 'number'
        && typeof item.score === 'number'
        && item.score > 0
        && DIFFS.has(item.difficulty)
        && Array.isArray(item.route)
        && item.route.length === 5
        && item.route.every((id) => ORGANS.has(id));
}

export function readBoard(): RunRecord[] {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(valid).slice(0, 5);
    } catch {
        return [];
    }
}

export function postRun(entry: RunRecord): RunRecord[] {
    if (!valid(entry)) return readBoard();
    const next = [...readBoard(), entry]
        .sort((a, b) => b.score - a.score || b.at - a.at)
        .slice(0, 5);
    try {
        localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
        /* a máquina cheia não pode derrubar a corrida */
    }
    return next;
}

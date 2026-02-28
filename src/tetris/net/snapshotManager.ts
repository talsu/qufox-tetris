import { NMultiSnapshotPayload } from "../../shared/types/socketPayloads";

export interface PlayerSnapshot {
    name: string;
    board: string | Uint8Array | ArrayBuffer | null;
    score: number;
    level?: number;
    lines?: number;
    isAlive: boolean;
    v?: number;
}

export interface SnapshotResult {
    needsFullSync: boolean;
}

type PlayerSnapshotPatch = Partial<PlayerSnapshot>;

export class SnapshotManager {
    private readonly selfId: string;
    private players: Map<string, PlayerSnapshot> = new Map();

    constructor(selfId: string, initialPlayers: Record<string, PlayerSnapshot> = {}) {
        this.selfId = selfId;
        for (const [id, p] of Object.entries(initialPlayers)) {
            const normalized = SnapshotManager.toCompleteSnapshot(p);
            if (!normalized || id === this.selfId) continue;
            this.players.set(id, normalized);
        }
    }

    private static hasValidBoard(board: unknown): board is string | Uint8Array | ArrayBuffer | null {
        return board === null
            || typeof board === 'string'
            || board instanceof Uint8Array
            || board instanceof ArrayBuffer;
    }

    private static toCompleteSnapshot(candidate: PlayerSnapshotPatch): PlayerSnapshot | null {
        if (typeof candidate.name !== 'string') return null;
        if (!Number.isFinite(candidate.score)) return null;
        if (typeof candidate.isAlive !== 'boolean') return null;
        if (!SnapshotManager.hasValidBoard(candidate.board)) return null;
        if (candidate.level !== undefined && !Number.isFinite(candidate.level)) return null;
        if (candidate.lines !== undefined && !Number.isFinite(candidate.lines)) return null;
        if (candidate.v !== undefined && !Number.isFinite(candidate.v)) return null;

        const snapshot: PlayerSnapshot = {
            name: candidate.name,
            board: candidate.board,
            score: Number(candidate.score),
            isAlive: candidate.isAlive,
        };
        if (candidate.level !== undefined) snapshot.level = candidate.level;
        if (candidate.lines !== undefined) snapshot.lines = candidate.lines;
        if (candidate.v !== undefined) snapshot.v = candidate.v;
        return snapshot;
    }

    private static cloneSnapshot(snapshot: PlayerSnapshot): PlayerSnapshot {
        return { ...snapshot };
    }

    private static mergeSnapshot(base: PlayerSnapshot, patch: PlayerSnapshotPatch): PlayerSnapshot {
        const next: PlayerSnapshot = { ...base };
        if (patch.name !== undefined) next.name = patch.name;
        if (patch.board !== undefined) next.board = patch.board;
        if (patch.score !== undefined) next.score = patch.score;
        if (patch.level !== undefined) next.level = patch.level;
        if (patch.lines !== undefined) next.lines = patch.lines;
        if (patch.isAlive !== undefined) next.isAlive = patch.isAlive;
        if (patch.v !== undefined) next.v = patch.v;
        return next;
    }

    applySnapshot(data: NMultiSnapshotPayload): SnapshotResult {
        const isDelta = data.isDelta !== false;
        let needsFullSync = false;

        if (!isDelta) {
            const next = new Map<string, PlayerSnapshot>();
            for (const [id, p] of Object.entries(data.players)) {
                if (id === this.selfId) continue;
                const normalized = SnapshotManager.toCompleteSnapshot(p);
                if (!normalized) {
                    needsFullSync = true;
                    continue;
                }
                next.set(id, normalized);
            }
            this.players = next;
        } else {
            for (const [id, p] of Object.entries(data.players)) {
                if (id === this.selfId) continue;
                const local = this.players.get(id);
                if (local) {
                    if ((p.v ?? 0) > (local.v ?? 0) + 1) {
                        needsFullSync = true;
                    }
                    this.players.set(id, SnapshotManager.mergeSnapshot(local, p));
                } else {
                    const normalized = SnapshotManager.toCompleteSnapshot(p);
                    if (!normalized) {
                        needsFullSync = true;
                        continue;
                    }
                    this.players.set(id, normalized);
                }
            }
        }

        return { needsFullSync };
    }

    getPlayers(): Map<string, PlayerSnapshot> {
        const cloned = new Map<string, PlayerSnapshot>();
        for (const [id, snapshot] of this.players) {
            cloned.set(id, SnapshotManager.cloneSnapshot(snapshot));
        }
        return cloned;
    }

    getAllPlayers(): Record<string, PlayerSnapshot> {
        const result: Record<string, PlayerSnapshot> = {};
        for (const [id, p] of this.players) {
            result[id] = SnapshotManager.cloneSnapshot(p);
        }
        return result;
    }

    hasPlayer(id: string): boolean {
        return this.players.has(id);
    }

    removePlayer(id: string): void {
        this.players.delete(id);
    }
}

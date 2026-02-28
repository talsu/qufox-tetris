export interface PlayerSnapshot {
    name: string;
    board: string | Uint8Array | ArrayBuffer | null;
    score: number;
    isAlive: boolean;
    v?: number;
    [key: string]: unknown;
}

export interface SnapshotResult {
    needsFullSync: boolean;
}

export class SnapshotManager {
    private readonly selfId: string;
    private players: Map<string, PlayerSnapshot> = new Map();

    constructor(selfId: string, initialPlayers: Record<string, PlayerSnapshot> = {}) {
        this.selfId = selfId;
        for (const [id, p] of Object.entries(initialPlayers)) {
            this.players.set(id, p);
        }
    }

    applySnapshot(data: { players: Record<string, Partial<PlayerSnapshot>>; isDelta?: boolean }): SnapshotResult {
        const isDelta = data.isDelta !== false;
        let needsFullSync = false;

        if (!isDelta) {
            const next = new Map<string, PlayerSnapshot>();
            for (const [id, p] of Object.entries(data.players)) {
                if (id === this.selfId) continue;
                next.set(id, p as PlayerSnapshot);
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
                    Object.assign(local, p);
                } else {
                    this.players.set(id, p as PlayerSnapshot);
                }
            }
        }

        return { needsFullSync };
    }

    getPlayers(): Map<string, PlayerSnapshot> {
        return this.players;
    }

    getAllPlayers(): Record<string, PlayerSnapshot> {
        const result: Record<string, PlayerSnapshot> = {};
        for (const [id, p] of this.players) {
            result[id] = p;
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

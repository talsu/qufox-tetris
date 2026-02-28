import { SnapshotManager } from '../../../src/tetris/net/snapshotManager';

describe('SnapshotManager', () => {
    test('full snapshot keeps only complete opponent entries', () => {
        const manager = new SnapshotManager('self');

        const result = manager.applySnapshot({
            isDelta: false,
            players: {
                self: { name: 'Me', score: 10, isAlive: true, board: null, v: 1 },
                valid: { name: 'Alpha', score: 100, isAlive: true, board: '0'.repeat(200), v: 3 },
                invalid: { score: 50 },
            },
        });

        expect(result.needsFullSync).toBe(true);
        expect(manager.hasPlayer('self')).toBe(false);
        expect(manager.hasPlayer('valid')).toBe(true);
        expect(manager.hasPlayer('invalid')).toBe(false);
    });

    test('delta snapshot requires full sync when unknown player patch is incomplete', () => {
        const manager = new SnapshotManager('self', {
            known: { name: 'Known', score: 10, isAlive: true, board: null, v: 1 },
        });

        const result = manager.applySnapshot({
            isDelta: true,
            players: {
                unknown: { score: 30 },
                known: { score: 15, v: 2 },
            },
        });

        expect(result.needsFullSync).toBe(true);
        expect(manager.hasPlayer('unknown')).toBe(false);
        expect(manager.getAllPlayers().known.score).toBe(15);
    });

    test('getPlayers returns cloned snapshots, preventing external mutation', () => {
        const manager = new SnapshotManager('self', {
            p1: { name: 'P1', score: 1, isAlive: true, board: null, v: 1 },
        });

        const players = manager.getPlayers();
        const player = players.get('p1');
        expect(player).toBeDefined();
        if (!player) {
            throw new Error('player should exist');
        }

        player.score = 999;

        const fresh = manager.getAllPlayers().p1;
        expect(fresh.score).toBe(1);
    });
});

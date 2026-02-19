import { NMultiPlayScene } from '../../../src/tetris/scenes/nMultiPlayScene';

describe('NMultiPlayScene garbage target selection', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('selects only alive opponents and excludes self', () => {
        const scene = new NMultiPlayScene() as any;
        scene.playerId = 'me';
        scene.snapshotPlayers = {
            me: { isAlive: true },
            aliveA: { isAlive: true },
            deadB: { isAlive: false },
            aliveC: { isAlive: true }
        };

        jest.spyOn(Math, 'random').mockReturnValue(0.75);
        const targetId = scene.pickRandomAliveOpponentId();

        expect(['aliveA', 'aliveC']).toContain(targetId);
        expect(targetId).not.toBe('me');
        expect(targetId).not.toBe('deadB');
    });

    test('returns different opponent when random bucket changes', () => {
        const scene = new NMultiPlayScene() as any;
        scene.playerId = 'me';
        scene.snapshotPlayers = {
            opp1: { isAlive: true },
            opp2: { isAlive: true }
        };

        jest.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.99);
        const first = scene.pickRandomAliveOpponentId();
        const second = scene.pickRandomAliveOpponentId();

        expect(first).toBe('opp1');
        expect(second).toBe('opp2');
    });

    test('returns null when no alive opponent exists', () => {
        const scene = new NMultiPlayScene() as any;
        scene.playerId = 'me';
        scene.snapshotPlayers = {
            me: { isAlive: true },
            dead1: { isAlive: false }
        };

        const targetId = scene.pickRandomAliveOpponentId();
        expect(targetId).toBeNull();
    });
});

import { NMultiPlayScene } from '../../../src/tetris/scenes/nMultiPlayScene';

describe('NMultiPlayScene payload guards', () => {
    test('ignores malformed nmulti payloads and accepts valid ones', () => {
        const handlers: Record<string, (data: unknown) => void> = {};
        const scene = new NMultiPlayScene() as any;

        scene.socket = {
            on: jest.fn((event: string, cb: (data: unknown) => void) => {
                handlers[event] = cb;
            }),
            emit: jest.fn(),
        };

        scene.roomId = 'room-1';
        scene.snapshotManager = {
            applySnapshot: jest.fn(() => ({ needsFullSync: false })),
            getPlayers: jest.fn(() => new Map()),
            hasPlayer: jest.fn(() => false),
            removePlayer: jest.fn(),
        };
        scene.miniFields = new Map();
        scene.addMiniField = jest.fn();
        scene.relayoutOpponents = jest.fn();
        scene.updateRanks = jest.fn();
        scene.playField = { insertGarbage: jest.fn() };
        scene.cameras = { main: { shake: jest.fn() } };
        scene.isGameRunning = true;
        scene.isGameEnded = false;

        scene.setupSocketEvents();

        handlers.nmulti_snapshot?.({ nope: true });
        expect(scene.snapshotManager.applySnapshot).not.toHaveBeenCalled();

        handlers.nmulti_snapshot?.({ players: { p2: { score: 10 } }, isDelta: true });
        expect(scene.snapshotManager.applySnapshot).toHaveBeenCalledTimes(1);

        handlers.nmulti_player_joined?.({ playerName: 'NoId' });
        expect(scene.addMiniField).not.toHaveBeenCalled();

        handlers.nmulti_player_joined?.({ playerId: 'p2', playerName: 'Player2' });
        expect(scene.addMiniField).toHaveBeenCalledWith('p2', 'Player2');

        handlers.nmulti_receive_garbage?.({ count: 0 });
        expect(scene.playField.insertGarbage).not.toHaveBeenCalled();

        handlers.nmulti_receive_garbage?.({ count: 2, fromId: 'p2' });
        expect(scene.playField.insertGarbage).toHaveBeenCalledWith(2);
    });
});

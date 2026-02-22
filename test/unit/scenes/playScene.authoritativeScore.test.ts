import { PlayScene } from '../../../src/tetris/scenes/playScene';

describe('PlayScene authoritative end-game score', () => {
    test('uses local engine score for end-game overlay in auth snapshot flow', () => {
        const handlers: Record<string, (data: unknown) => void> = {};
        const emit = jest.fn();
        const scene = new PlayScene() as any;

        scene.mode = 'multi';
        scene.useAuthoritativeServer = true;
        scene.roomId = 'room-1';
        scene.socket = {
            on: jest.fn((event: string, cb: (data: unknown) => void) => {
                handlers[event] = cb;
            }),
            emit,
            off: jest.fn(),
        };
        scene.statusText = {
            setText: jest.fn().mockReturnThis(),
            setVisible: jest.fn().mockReturnThis(),
        };
        scene.playField = {
            deserializeEncoded: jest.fn(),
            serializeEncoded: jest.fn(() => '0'.repeat(200)),
        };
        scene.opponentPlayField = { deserializeEncoded: jest.fn() };
        scene.playField.stop = jest.fn();
        scene.inputManager = { isEnabled: true };
        scene.inGameMenu = { showEndGame: jest.fn() };
        scene.engine = { getScore: jest.fn(() => 156) };
        scene.isGameRunning = true;
        scene.isGameEnded = false;

        const showEndGameMessage = jest.spyOn(scene, 'showEndGameMessage');

        scene.setupMultiplayer();

        handlers.auth_snapshot?.({
            tick: 10,
            self: { board: '0'.repeat(200), score: 0, level: 1, lines: 0, isAlive: false },
            opponent: { board: '0'.repeat(200), score: 0, level: 1, lines: 0, isAlive: true },
        });

        expect(showEndGameMessage).toHaveBeenCalledWith('GAME OVER', '#ff0000', 156);
        expect(emit).toHaveBeenCalledWith('player_ready', { roomId: 'room-1' });
    });
});

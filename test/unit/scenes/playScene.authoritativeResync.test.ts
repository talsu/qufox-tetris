import { PlayScene } from '../../../src/tetris/scenes/playScene';
import { AuthSnapshotPayload } from '../../../src/shared/types/socketPayloads';
import { EnginePhase } from '../../../src/tetris/objects/playField';

type HandlerMap = Record<string, (data: unknown) => void>;

function buildSyncSnapshot(board: string): AuthSnapshotPayload {
    return {
        tick: 6,
        self: {
            board,
            score: 120,
            level: 2,
            lines: 12,
            isAlive: true,
            sync: {
                boardCore: board,
                active: {
                    type: 'T',
                    rotate: '0',
                    col: 3,
                    row: 0,
                },
                hold: 'I',
                canHold: false,
                queue: ['S', 'Z', 'L', 'O', 'J'],
                bag: ['T', 'I'],
                queueRngState: 13579,
                gravityMsCounter: 40,
            },
        },
        opponent: {
            board,
            score: 90,
            level: 2,
            lines: 10,
            isAlive: true,
        },
    };
}

describe('PlayScene authoritative resync', () => {
    test('resyncs local authoritative state after repeated mismatch', () => {
        const scene = new PlayScene();
        const handlers: HandlerMap = {};
        const emit = jest.fn();
        const applyAuthoritativeSync = jest.fn();

        Reflect.set(scene, 'mode', 'multi');
        Reflect.set(scene, 'useAuthoritativeServer', true);
        Reflect.set(scene, 'isGameRunning', true);
        Reflect.set(scene, 'isGameEnded', false);
        Reflect.set(scene, 'roomId', 'room-1');
        Reflect.set(scene, 'resumeToken', 'resume-token');
        Reflect.set(scene, 'statusText', {
            setText: jest.fn().mockReturnThis(),
            setVisible: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
        });
        Reflect.set(scene, 'inputManager', { isEnabled: true });
        Reflect.set(scene, 'inGameMenu', { isMenuOpen: false });
        Reflect.set(scene, 'opponentPlayField', { deserializeEncoded: jest.fn() });
        Reflect.set(scene, 'playField', {
            serializeEncoded: jest.fn(() => '9'.repeat(200)),
            stop: jest.fn(),
        });
        Reflect.set(scene, 'engine', {
            applyAuthoritativeSync,
            getScore: jest.fn(() => 120),
        });
        Reflect.set(scene, 'socket', {
            on: jest.fn((event: string, cb: (data: unknown) => void) => {
                handlers[event] = cb;
            }),
            off: jest.fn(),
            emit,
        });

        const setupMultiplayer = Reflect.get(scene, 'setupMultiplayer') as () => void;
        setupMultiplayer.call(scene);

        const snapshot = buildSyncSnapshot('0'.repeat(200));
        handlers.auth_snapshot(snapshot);
        handlers.auth_snapshot(snapshot);
        handlers.auth_snapshot(snapshot);

        expect(applyAuthoritativeSync).toHaveBeenCalledTimes(1);
        expect(applyAuthoritativeSync).toHaveBeenCalledWith(snapshot.self.sync, {
            score: snapshot.self.score,
            level: snapshot.self.level,
            lines: snapshot.self.lines,
        });
    });

    test('does not trigger resync while local field is in line-clear transition phase', () => {
        const scene = new PlayScene();
        const handlers: HandlerMap = {};
        const emit = jest.fn();
        const applyAuthoritativeSync = jest.fn();

        Reflect.set(scene, 'mode', 'multi');
        Reflect.set(scene, 'useAuthoritativeServer', true);
        Reflect.set(scene, 'isGameRunning', true);
        Reflect.set(scene, 'isGameEnded', false);
        Reflect.set(scene, 'roomId', 'room-1');
        Reflect.set(scene, 'resumeToken', 'resume-token');
        Reflect.set(scene, 'statusText', {
            setText: jest.fn().mockReturnThis(),
            setVisible: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
        });
        Reflect.set(scene, 'inputManager', { isEnabled: true });
        Reflect.set(scene, 'inGameMenu', { isMenuOpen: false });
        Reflect.set(scene, 'opponentPlayField', { deserializeEncoded: jest.fn() });
        Reflect.set(scene, 'playField', {
            serializeEncoded: jest.fn(() => '9'.repeat(200)),
            stop: jest.fn(),
            phase: EnginePhase.ANIMATE,
        });
        Reflect.set(scene, 'engine', {
            applyAuthoritativeSync,
            getScore: jest.fn(() => 120),
        });
        Reflect.set(scene, 'socket', {
            on: jest.fn((event: string, cb: (data: unknown) => void) => {
                handlers[event] = cb;
            }),
            off: jest.fn(),
            emit,
        });

        const setupMultiplayer = Reflect.get(scene, 'setupMultiplayer') as () => void;
        setupMultiplayer.call(scene);

        const snapshot = buildSyncSnapshot('0'.repeat(200));
        handlers.auth_snapshot(snapshot);
        handlers.auth_snapshot(snapshot);
        handlers.auth_snapshot(snapshot);
        handlers.auth_snapshot(snapshot);

        expect(applyAuthoritativeSync).not.toHaveBeenCalled();
    });

    test('deduplicates opponent snapshot board rendering when board string is unchanged', () => {
        const scene = new PlayScene();
        const handlers: HandlerMap = {};
        const emit = jest.fn();
        const deserializeEncoded = jest.fn();

        Reflect.set(scene, 'mode', 'multi');
        Reflect.set(scene, 'useAuthoritativeServer', true);
        Reflect.set(scene, 'isGameRunning', true);
        Reflect.set(scene, 'isGameEnded', false);
        Reflect.set(scene, 'roomId', 'room-1');
        Reflect.set(scene, 'resumeToken', 'resume-token');
        Reflect.set(scene, 'statusText', {
            setText: jest.fn().mockReturnThis(),
            setVisible: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
        });
        Reflect.set(scene, 'inputManager', { isEnabled: true });
        Reflect.set(scene, 'inGameMenu', { isMenuOpen: false });
        Reflect.set(scene, 'opponentPlayField', { deserializeEncoded });
        Reflect.set(scene, 'playField', {
            serializeEncoded: jest.fn(() => '0'.repeat(200)),
            stop: jest.fn(),
            phase: EnginePhase.FALLING,
        });
        Reflect.set(scene, 'engine', {
            applyAuthoritativeSync: jest.fn(),
            getScore: jest.fn(() => 120),
        });
        Reflect.set(scene, 'socket', {
            on: jest.fn((event: string, cb: (data: unknown) => void) => {
                handlers[event] = cb;
            }),
            off: jest.fn(),
            emit,
        });

        const setupMultiplayer = Reflect.get(scene, 'setupMultiplayer') as () => void;
        setupMultiplayer.call(scene);

        const snapshot = buildSyncSnapshot('0'.repeat(200));
        handlers.auth_snapshot(snapshot);
        handlers.auth_snapshot(snapshot);

        expect(deserializeEncoded).toHaveBeenCalledTimes(1);
        expect(deserializeEncoded).toHaveBeenCalledWith('0'.repeat(200));
    });

    test('requests resume_auth once when tab returns visible', () => {
        const scene = new PlayScene();
        const handlers: HandlerMap = {};
        const emit = jest.fn();
        const originalVisibilityState = document.visibilityState;

        Reflect.set(scene, 'mode', 'multi');
        Reflect.set(scene, 'useAuthoritativeServer', true);
        Reflect.set(scene, 'isGameRunning', true);
        Reflect.set(scene, 'isGameEnded', false);
        Reflect.set(scene, 'roomId', 'room-1');
        Reflect.set(scene, 'resumeToken', 'resume-token');
        Reflect.set(scene, 'statusText', {
            setText: jest.fn().mockReturnThis(),
            setVisible: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
        });
        Reflect.set(scene, 'inputManager', { isEnabled: true });
        Reflect.set(scene, 'inGameMenu', { isMenuOpen: false });
        Reflect.set(scene, 'socket', {
            on: jest.fn((event: string, cb: (data: unknown) => void) => {
                handlers[event] = cb;
            }),
            off: jest.fn(),
            emit,
        });

        const setupMultiplayer = Reflect.get(scene, 'setupMultiplayer') as () => void;
        setupMultiplayer.call(scene);

        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            value: 'hidden',
        });
        document.dispatchEvent(new Event('visibilitychange'));

        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            value: 'visible',
        });
        document.dispatchEvent(new Event('visibilitychange'));

        expect(emit).toHaveBeenCalledWith('resume_auth', { resumeToken: 'resume-token' });

        const unbindVisibilitySync = Reflect.get(scene, 'unbindVisibilitySync') as () => void;
        unbindVisibilitySync.call(scene);

        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            value: originalVisibilityState,
        });
    });
});

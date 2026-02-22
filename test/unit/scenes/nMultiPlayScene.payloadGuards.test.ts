import { NMultiPlayScene } from '../../../src/tetris/scenes/nMultiPlayScene';
import { InputState } from '../../../src/tetris/const/const';
import { EnginePhase } from '../../../src/tetris/objects/playField';

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
            getAllPlayers: jest.fn(() => ({})),
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

    test('restarts with authoritative bootstrap payload on nmulti_restarted', () => {
        const handlers: Record<string, (data: unknown) => void> = {};
        const scene = new NMultiPlayScene() as any;
        const restart = jest.fn();

        scene.socket = {
            on: jest.fn((event: string, cb: (data: unknown) => void) => {
                handlers[event] = cb;
            }),
            emit: jest.fn(),
        };
        scene.scene = { restart };
        scene.roomId = 'room-1';
        scene.roomName = 'Room';
        scene.playerId = 'p1';
        scene.playerName = 'Player1';
        scene.botLevel = 0;
        scene.snapshotManager = {
            getAllPlayers: jest.fn(() => ({ p2: { name: 'Player2' } })),
        };

        scene.setupSocketEvents();

        const authSnapshot = {
            tick: 0,
            self: {
                board: '0'.repeat(200),
                score: 0,
                level: 1,
                lines: 0,
                isAlive: true,
                sync: {
                    boardCore: '0'.repeat(200),
                    active: null,
                    hold: null,
                    canHold: true,
                    queue: ['I', 'J', 'L', 'O', 'S'],
                    bag: ['T', 'Z'],
                    queueRngState: 1,
                    gravityMsCounter: 0,
                },
            },
            serverAckInputSeq: 0,
        };

        handlers.nmulti_restarted?.({
            roomId: 'room-1',
            authSeed: 123,
            authSnapshot,
        });

        expect(restart).toHaveBeenCalledWith(expect.objectContaining({
            roomId: 'room-1',
            authSeed: 123,
            authSnapshot,
            initialPlayers: { p2: { name: 'Player2' } },
        }));
    });

    test('emits presence and full sync request on visibility changes', () => {
        const scene = new NMultiPlayScene() as any;
        const emit = jest.fn();

        scene.socket = { emit };
        scene.roomId = 'room-1';
        scene.inputManager = { isEnabled: true };
        scene.inGameMenu = { isMenuOpen: false };
        scene.isGameRunning = true;
        scene.isGameEnded = false;

        Object.defineProperty(document, 'visibilityState', {
            value: 'hidden',
            configurable: true,
        });

        scene.bindVisibilitySync();
        document.dispatchEvent(new Event('visibilitychange'));

        expect(emit).toHaveBeenCalledWith('nmulti_presence', {
            roomId: 'room-1',
            state: 'inactive',
        });
        expect(scene.inputManager.isEnabled).toBe(false);

        Object.defineProperty(document, 'visibilityState', {
            value: 'visible',
            configurable: true,
        });
        document.dispatchEvent(new Event('visibilitychange'));

        expect(emit).toHaveBeenCalledWith('nmulti_presence', {
            roomId: 'room-1',
            state: 'active',
        });
        expect(emit).toHaveBeenCalledWith('nmulti_request_full_sync', { roomId: 'room-1' });

        scene.unbindVisibilitySync();
    });

    test('sends authoritative input packet for prediction/reconciliation', () => {
        const scene = new NMultiPlayScene() as any;
        const emit = jest.fn();

        scene.socket = { emit };
        scene.roomId = 'room-1';
        scene.isGameRunning = true;
        scene.isGameEnded = false;
        scene.inputSeq = 0;
        scene.inGameMenu = { isMenuOpen: false };
        scene.engine = { onInput: jest.fn() };

        scene.onInput('left', InputState.PRESS);

        expect(emit).toHaveBeenCalledWith('nmulti_auth_input', {
            roomId: 'room-1',
            direction: 'left',
            state: InputState.PRESS,
            seq: 1,
        });
    });

    test('skips authoritative resync during line-clear transition phases', () => {
        const scene = new NMultiPlayScene() as any;
        const applyAuthoritativeSync = jest.fn();

        scene.playField = {
            serializeEncoded: jest.fn(() => '9'.repeat(200)),
            phase: EnginePhase.ANIMATE,
        };
        scene.engine = {
            applyAuthoritativeSync,
        };
        scene.isGameRunning = true;
        scene.isGameEnded = false;
        scene.needsAuthoritativeResync = true;
        scene.localMismatchStreak = 2;

        scene.maybeResyncLocalStateFromSnapshot({
            tick: 20,
            serverAckInputSeq: 10,
            self: {
                board: '0'.repeat(200),
                score: 10,
                level: 1,
                lines: 2,
                sync: {
                    boardCore: '0'.repeat(200),
                    active: null,
                    hold: null,
                    canHold: true,
                    queue: ['I', 'J', 'L', 'O', 'S'],
                    bag: ['T', 'Z'],
                    queueRngState: 1,
                    gravityMsCounter: 0,
                },
            },
        });

        expect(applyAuthoritativeSync).not.toHaveBeenCalled();
    });

    test('skips authoritative resync while server ack is behind local input seq', () => {
        const scene = new NMultiPlayScene() as any;
        const applyAuthoritativeSync = jest.fn();

        scene.playField = {
            serializeEncoded: jest.fn(() => '9'.repeat(200)),
            phase: EnginePhase.FALLING,
        };
        scene.engine = {
            applyAuthoritativeSync,
        };
        scene.isGameRunning = true;
        scene.isGameEnded = false;
        scene.inputSeq = 12;

        scene.maybeResyncLocalStateFromSnapshot({
            tick: 20,
            serverAckInputSeq: 5,
            self: {
                board: '0'.repeat(200),
                score: 10,
                level: 1,
                lines: 2,
                sync: {
                    boardCore: '0'.repeat(200),
                    active: null,
                    hold: null,
                    canHold: true,
                    queue: ['I', 'J', 'L', 'O', 'S'],
                    bag: ['T', 'Z'],
                    queueRngState: 1,
                    gravityMsCounter: 0,
                },
            },
        });

        expect(applyAuthoritativeSync).not.toHaveBeenCalled();
    });

    test('applies initial authoritative bootstrap snapshot before gameplay divergence', () => {
        const scene = new NMultiPlayScene() as any;
        const applyAuthoritativeSync = jest.fn();
        const expectedSync = {
            boardCore: '0'.repeat(200),
            active: {
                type: 'T',
                rotate: 'UP',
                col: 3,
                row: -2,
            },
            hold: null,
            canHold: true,
            queue: ['I', 'J', 'L', 'O', 'S'],
            bag: ['T', 'Z'],
            queueRngState: 123,
            gravityMsCounter: 0,
        };

        scene.engine = { applyAuthoritativeSync };
        scene.initialAuthSnapshot = {
            tick: 0,
            serverAckInputSeq: 0,
            self: {
                board: '0'.repeat(200),
                score: 120,
                level: 2,
                lines: 4,
                isAlive: true,
                sync: expectedSync,
            },
        };
        scene.localMismatchStreak = 3;
        scene.needsAuthoritativeResync = true;

        scene.applyInitialAuthoritativeBootstrap();

        expect(applyAuthoritativeSync).toHaveBeenCalledWith(expectedSync, {
            score: 120,
            level: 2,
            lines: 4,
        });
        expect(scene.needsAuthoritativeResync).toBe(false);
        expect(scene.localMismatchStreak).toBe(0);
        expect(scene.initialAuthSnapshot).toBeNull();
    });

    test('forces one-shot authoritative resync after visibility resume even when board matches', () => {
        const scene = new NMultiPlayScene() as any;
        const applyAuthoritativeSync = jest.fn();

        scene.playField = {
            serializeEncoded: jest.fn(() => '0'.repeat(200)),
            phase: EnginePhase.FALLING,
        };
        scene.engine = {
            applyAuthoritativeSync,
        };
        scene.isGameRunning = true;
        scene.isGameEnded = false;
        scene.needsAuthoritativeResync = true;
        scene.forceAuthoritativeResyncOnce = true;
        scene.localMismatchStreak = 0;

        scene.maybeResyncLocalStateFromSnapshot({
            tick: 20,
            serverAckInputSeq: 10,
            self: {
                board: '0'.repeat(200),
                score: 15,
                level: 2,
                lines: 3,
                isAlive: true,
                sync: {
                    boardCore: '0'.repeat(200),
                    active: null,
                    hold: null,
                    canHold: true,
                    queue: ['I', 'J', 'L', 'O', 'S'],
                    bag: ['T', 'Z'],
                    queueRngState: 1,
                    gravityMsCounter: 0,
                },
            },
        });

        expect(applyAuthoritativeSync).toHaveBeenCalledTimes(1);
        expect(scene.needsAuthoritativeResync).toBe(false);
        expect(scene.forceAuthoritativeResyncOnce).toBe(false);
        expect(scene.localMismatchStreak).toBe(0);
    });
});

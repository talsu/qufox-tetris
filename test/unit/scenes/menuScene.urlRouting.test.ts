import { MenuScene } from '../../../src/tetris/scenes/menuScene';
import * as fontLoader from '../../../src/tetris/ui/fontLoader';

type SocketHandlerMap = Record<string, (data?: unknown) => void>;

function setPath(path: string): void {
    history.replaceState(null, '', path);
}

function createSocket(handlers: SocketHandlerMap) {
    return {
        on: jest.fn((event: string, cb: (data?: unknown) => void) => {
            handlers[event] = cb;
        }),
        off: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
    };
}

describe('MenuScene URL join flow', () => {
    let ensureFontReadySpy: jest.SpyInstance<Promise<void>, [timeoutMs?: number]>;

    beforeEach(() => {
        ensureFontReadySpy = jest.spyOn(fontLoader, 'ensureGameFontReady').mockResolvedValue();
    });

    afterEach(() => {
        ensureFontReadySpy.mockRestore();
        jest.restoreAllMocks();
        setPath('/');
    });

    test('initializeMenuFlow routes n-multi URL with decoded roomName and bot level', async () => {
        setPath('/n-multi/Room%20Alpha?bot=17');
        const scene = new MenuScene() as any;
        scene.sys = { isActive: () => true };
        scene.isShuttingDown = false;
        scene.joinNMultiRoomByUrl = jest.fn();
        scene.joinMultiRoomByUrl = jest.fn();
        scene.createPhaserUI = jest.fn();
        scene.resize = jest.fn();

        await scene.initializeMenuFlow();

        expect(scene.joinNMultiRoomByUrl).toHaveBeenCalledWith('Room Alpha', 17);
        expect(scene.joinMultiRoomByUrl).not.toHaveBeenCalled();
        expect(scene.createPhaserUI).not.toHaveBeenCalled();
    });

    test('initializeMenuFlow routes multi URL with decoded roomName and bot level', async () => {
        setPath('/multi/Room%23123?bot=9');
        const scene = new MenuScene() as any;
        scene.sys = { isActive: () => true };
        scene.isShuttingDown = false;
        scene.joinNMultiRoomByUrl = jest.fn();
        scene.joinMultiRoomByUrl = jest.fn();
        scene.createPhaserUI = jest.fn();
        scene.resize = jest.fn();

        await scene.initializeMenuFlow();

        expect(scene.joinMultiRoomByUrl).toHaveBeenCalledWith('Room#123', 9);
        expect(scene.joinNMultiRoomByUrl).not.toHaveBeenCalled();
        expect(scene.createPhaserUI).not.toHaveBeenCalled();
    });


    test('initializeMenuFlow routes short n-multi URL with room id and bot level', async () => {
        setPath('/j/n/room-raw-id?bot=11');
        const scene = new MenuScene() as any;
        scene.sys = { isActive: () => true };
        scene.isShuttingDown = false;
        scene.joinNMultiRoomByUrl = jest.fn();
        scene.joinMultiRoomByUrl = jest.fn();
        scene.createPhaserUI = jest.fn();
        scene.resize = jest.fn();
        const replaceSpy = jest.spyOn(history, 'replaceState');

        await scene.initializeMenuFlow();

        expect(replaceSpy).toHaveBeenCalledWith(null, '', '/n-multi/room-raw-id?bot=11');
        expect(scene.joinNMultiRoomByUrl).toHaveBeenCalledWith('room-raw-id', 11);
        expect(scene.joinMultiRoomByUrl).not.toHaveBeenCalled();
    });

    test('initializeMenuFlow routes short multi URL with room id and bot level', async () => {
        setPath('/j/m/duel-room-id?bot=3');
        const scene = new MenuScene() as any;
        scene.sys = { isActive: () => true };
        scene.isShuttingDown = false;
        scene.joinNMultiRoomByUrl = jest.fn();
        scene.joinMultiRoomByUrl = jest.fn();
        scene.createPhaserUI = jest.fn();
        scene.resize = jest.fn();
        const replaceSpy = jest.spyOn(history, 'replaceState');

        await scene.initializeMenuFlow();

        expect(replaceSpy).toHaveBeenCalledWith(null, '', '/multi/duel-room-id?bot=3');
        expect(scene.joinMultiRoomByUrl).toHaveBeenCalledWith('duel-room-id', 3);
        expect(scene.joinNMultiRoomByUrl).not.toHaveBeenCalled();
    });

    test('initializeMenuFlow falls back to menu UI on root path', async () => {
        setPath('/');
        const scene = new MenuScene() as any;
        scene.sys = { isActive: () => true };
        scene.isShuttingDown = false;
        scene.joinNMultiRoomByUrl = jest.fn();
        scene.joinMultiRoomByUrl = jest.fn();
        scene.createPhaserUI = jest.fn();
        scene.resize = jest.fn();

        await scene.initializeMenuFlow();

        expect(scene.joinNMultiRoomByUrl).not.toHaveBeenCalled();
        expect(scene.joinMultiRoomByUrl).not.toHaveBeenCalled();
        expect(scene.createPhaserUI).toHaveBeenCalledTimes(1);
        expect(scene.resize).toHaveBeenCalledWith(window.innerWidth, window.innerHeight);
    });

    test('joinMultiRoomByUrl emits join request and starts PlayScene on valid payload', () => {
        const handlers: SocketHandlerMap = {};
        const socket = createSocket(handlers);
        const scene = new MenuScene() as any;
        scene.createConnectingText = jest.fn();
        scene.destroyConnectingText = jest.fn();
        scene.createUrlJoinSocket = jest.fn(() => {
            scene.urlJoinSocket = socket;
            return socket;
        });
        scene.scene = { start: jest.fn() };

        scene.joinMultiRoomByUrl('Ranked Room', 5);
        handlers.connect();

        expect(socket.emit).toHaveBeenCalledWith('join_or_create', { roomName: 'Ranked Room', botLevel: 5 });

        handlers.room_joined({
            roomId: 'room-1',
            isHost: true,
            roomName: 'Ranked Room',
            resumeToken: 'resume-token',
            botLevel: 5,
            authSeed: 777,
        });

        expect(scene.scene.start).toHaveBeenCalledWith('PlayScene', expect.objectContaining({
            mode: 'multi',
            socket,
            roomId: 'room-1',
            isHost: true,
            roomName: 'Ranked Room',
            botLevel: 5,
            authQueueSeed: 777,
        }));
        expect(socket.off).toHaveBeenCalledTimes(4);
    });


    test('joinMultiRoomByUrl keeps join_or_create behavior for any route source', () => {
        const handlers: SocketHandlerMap = {};
        const socket = createSocket(handlers);
        const scene = new MenuScene() as any;
        scene.createConnectingText = jest.fn();
        scene.createUrlJoinSocket = jest.fn(() => {
            scene.urlJoinSocket = socket;
            return socket;
        });

        scene.joinMultiRoomByUrl('room-id-55', 4);
        handlers.connect();

        expect(socket.emit).toHaveBeenCalledWith('join_or_create', { roomName: 'room-id-55', botLevel: 4 });
    });

    test('joinNMultiRoomByUrl keeps nmulti_join_or_create behavior for any route source', () => {
        const handlers: SocketHandlerMap = {};
        const socket = createSocket(handlers);
        const scene = new MenuScene() as any;
        scene.createConnectingText = jest.fn();
        scene.createUrlJoinSocket = jest.fn(() => {
            scene.urlJoinSocket = socket;
            return socket;
        });

        scene.joinNMultiRoomByUrl('n-room-id-55', 6);
        handlers.connect();

        expect(socket.emit).toHaveBeenCalledWith('nmulti_join_or_create', { roomName: 'n-room-id-55', botLevel: 6 });
    });

    test('joinNMultiRoomByUrl recovers when room payload is malformed', () => {
        const handlers: SocketHandlerMap = {};
        const socket = createSocket(handlers);
        const scene = new MenuScene() as any;
        scene.createConnectingText = jest.fn();
        scene.createUrlJoinSocket = jest.fn(() => {
            scene.urlJoinSocket = socket;
            return socket;
        });
        scene.recoverFromJoinFailure = jest.fn();

        scene.joinNMultiRoomByUrl('Battle Room', 2);
        handlers.nmulti_room_joined({ roomId: 'room-1' });

        expect(scene.recoverFromJoinFailure).toHaveBeenCalledWith('Failed to join room: invalid room payload.');
    });
});

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

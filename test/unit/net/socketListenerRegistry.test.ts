import { SocketListenerRegistry } from '../../../src/tetris/net/socketListenerRegistry';

type MockSocket = {
    on: jest.Mock;
    off: jest.Mock;
};

function createSocket(): MockSocket {
    return {
        on: jest.fn(),
        off: jest.fn(),
    };
}

describe('SocketListenerRegistry', () => {
    test('bind registers handlers and clear unsubscribes same handlers', () => {
        const registry = new SocketListenerRegistry();
        const socket = createSocket();
        const onSnapshot = jest.fn();
        const onJoined = jest.fn();

        registry.bind(socket, 'nmulti_snapshot', onSnapshot);
        registry.bind(socket, 'nmulti_player_joined', onJoined);

        expect(socket.on).toHaveBeenNthCalledWith(1, 'nmulti_snapshot', onSnapshot);
        expect(socket.on).toHaveBeenNthCalledWith(2, 'nmulti_player_joined', onJoined);

        registry.clear(socket);

        expect(socket.off).toHaveBeenNthCalledWith(1, 'nmulti_snapshot', onSnapshot);
        expect(socket.off).toHaveBeenNthCalledWith(2, 'nmulti_player_joined', onJoined);
    });

    test('clear with null resets registry without touching socket', () => {
        const registry = new SocketListenerRegistry();
        const socket = createSocket();
        const handler = jest.fn();

        registry.bind(socket, 'auth_snapshot', handler);
        registry.clear(null);

        expect(socket.off).not.toHaveBeenCalled();

        registry.clear(socket);
        expect(socket.off).not.toHaveBeenCalled();
    });

    test('supports repeated bind/clear cycles without leaking stale listeners', () => {
        const registry = new SocketListenerRegistry();
        const socket = createSocket();
        const first = jest.fn();
        const second = jest.fn();

        registry.bind(socket, 'connect', first);
        registry.clear(socket);
        registry.clear(socket);

        registry.bind(socket, 'room_joined', second);
        registry.clear(socket);

        expect(socket.off).toHaveBeenCalledTimes(2);
        expect(socket.off).toHaveBeenNthCalledWith(1, 'connect', first);
        expect(socket.off).toHaveBeenNthCalledWith(2, 'room_joined', second);
    });
});

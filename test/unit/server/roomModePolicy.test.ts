import type { Socket } from 'socket.io';
import {
    handleJoinByIdWithPolicy,
    handleJoinOrCreateWithPolicy,
    handleRoomLifecycleByIdWithPolicy,
    handleTokenLifecycleWithPolicy,
    type RoomModePolicy,
} from '../../../server/roomModePolicy';

type TestRoom = { id: string; name: string };

function createSocket(id = 'socket-1'): Socket {
    return { id } as unknown as Socket;
}

describe('roomModePolicy helpers', () => {
    test('handleJoinByIdWithPolicy routes join and errors by result', () => {
        const socket = createSocket();
        const room: TestRoom = { id: 'room-1', name: 'Room' };
        const emitJoinError = jest.fn();

        const policy: RoomModePolicy<TestRoom> = {
            normalizeName: (_value, fallback) => fallback,
            findRoomById: (roomId) => (roomId === room.id ? room : null),
            findJoinableRoomByName: () => null,
            createAndJoinRoom: jest.fn(),
            tryJoinRoom: jest.fn().mockReturnValueOnce('joined').mockReturnValueOnce('full').mockReturnValueOnce('join_failed'),
            emitJoinError,
        };

        handleJoinByIdWithPolicy(socket, room.id, policy);
        handleJoinByIdWithPolicy(socket, room.id, policy);
        handleJoinByIdWithPolicy(socket, room.id, policy);
        handleJoinByIdWithPolicy(socket, null, policy);

        expect(emitJoinError).toHaveBeenNthCalledWith(1, socket, 'full');
        expect(emitJoinError).toHaveBeenNthCalledWith(2, socket, 'join_failed');
        expect(emitJoinError).toHaveBeenNthCalledWith(3, socket, 'not_found');
    });

    test('handleJoinOrCreateWithPolicy joins existing room or creates new room', () => {
        const socket = createSocket();
        const room: TestRoom = { id: 'room-1', name: 'shared' };
        const createAndJoinRoom = jest.fn();
        const emitJoinError = jest.fn();

        const policy: RoomModePolicy<TestRoom> = {
            normalizeName: (value, fallback) => (typeof value === 'string' ? value : fallback),
            findRoomById: () => null,
            findJoinableRoomByName: (roomName) => (roomName === room.name ? room : null),
            createAndJoinRoom,
            tryJoinRoom: jest.fn().mockReturnValueOnce('joined').mockReturnValueOnce('join_failed'),
            emitJoinError,
        };

        handleJoinOrCreateWithPolicy(socket, 'shared', 'Room', policy);
        handleJoinOrCreateWithPolicy(socket, 'shared', 'Room', policy);
        handleJoinOrCreateWithPolicy(socket, 'new-room', 'Room', policy);

        expect(emitJoinError).toHaveBeenCalledWith(socket, 'join_failed');
        expect(createAndJoinRoom).toHaveBeenCalledWith(socket, 'new-room');
    });

    test('handleJoinOrCreateWithPolicy maps full join failure to full error and does not create room', () => {
        const socket = createSocket();
        const room: TestRoom = { id: 'room-1', name: 'shared' };
        const createAndJoinRoom = jest.fn();
        const emitJoinError = jest.fn();

        const policy: RoomModePolicy<TestRoom> = {
            normalizeName: (value, fallback) => (typeof value === 'string' ? value : fallback),
            findRoomById: () => null,
            findJoinableRoomByName: (roomName) => (roomName === room.name ? room : null),
            createAndJoinRoom,
            tryJoinRoom: jest.fn().mockReturnValue('full'),
            emitJoinError,
        };

        handleJoinOrCreateWithPolicy(socket, 'shared', 'Room', policy);

        expect(emitJoinError).toHaveBeenCalledWith(socket, 'full');
        expect(createAndJoinRoom).not.toHaveBeenCalled();
    });

    test('handleRoomLifecycleByIdWithPolicy executes only when room exists', () => {
        const socket = createSocket();
        const room: TestRoom = { id: 'room-1', name: 'Room' };
        const execute = jest.fn();
        const onMissing = jest.fn();

        handleRoomLifecycleByIdWithPolicy(socket, room.id, {
            findRoomById: (roomId) => (roomId === room.id ? room : null),
            execute,
            onMissing,
        });
        handleRoomLifecycleByIdWithPolicy(socket, 'missing', {
            findRoomById: () => null,
            execute,
            onMissing,
        });
        handleRoomLifecycleByIdWithPolicy(socket, null, {
            findRoomById: () => null,
            execute,
            onMissing,
        });

        expect(execute).toHaveBeenCalledTimes(1);
        expect(execute).toHaveBeenCalledWith(socket, room);
        expect(onMissing).toHaveBeenCalledTimes(2);
    });

    test('handleTokenLifecycleWithPolicy executes target resolution with missing fallback', () => {
        const socket = createSocket();
        const execute = jest.fn();
        const onMissing = jest.fn();

        handleTokenLifecycleWithPolicy(socket, 'token-ok', {
            findByToken: (token) => (token === 'token-ok' ? { token } : null),
            execute,
            onMissing,
        });
        handleTokenLifecycleWithPolicy(socket, 'token-missing', {
            findByToken: () => null,
            execute,
            onMissing,
        });

        expect(execute).toHaveBeenCalledTimes(1);
        expect(execute).toHaveBeenCalledWith(socket, { token: 'token-ok' });
        expect(onMissing).toHaveBeenCalledTimes(1);
    });
});

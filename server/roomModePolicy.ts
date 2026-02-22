import type { Socket } from 'socket.io';

export type RoomJoinResult = 'joined' | 'full' | 'join_failed';
export type RoomJoinErrorReason = 'not_found' | 'full' | 'join_failed';

export interface RoomModePolicy<TRoom> {
    normalizeName(value: unknown, fallback: string): string;
    findRoomById(roomId: string): TRoom | null;
    findJoinableRoomByName(roomName: string): TRoom | null;
    createAndJoinRoom(socket: Socket, roomName: string): void;
    tryJoinRoom(socket: Socket, room: TRoom): RoomJoinResult;
    emitJoinError(socket: Socket, reason: RoomJoinErrorReason): void;
}

export interface RoomLifecyclePolicy<TRoom> {
    findRoomById(roomId: string): TRoom | null;
    execute(socket: Socket, room: TRoom): void;
    onMissing?(socket: Socket): void;
}

export interface TokenLifecyclePolicy<TTarget> {
    findByToken(token: string): TTarget | null;
    execute(socket: Socket, target: TTarget): void;
    onMissing(socket: Socket): void;
}

export function handleCreateWithPolicy<TRoom>(
    socket: Socket,
    roomNameCandidate: unknown,
    fallbackName: string,
    policy: RoomModePolicy<TRoom>,
): void {
    const roomName = policy.normalizeName(roomNameCandidate, fallbackName);
    policy.createAndJoinRoom(socket, roomName);
}

export function handleJoinByIdWithPolicy<TRoom>(
    socket: Socket,
    roomId: string | null,
    policy: RoomModePolicy<TRoom>,
): void {
    if (!roomId) {
        policy.emitJoinError(socket, 'not_found');
        return;
    }

    const room = policy.findRoomById(roomId);
    if (!room) {
        policy.emitJoinError(socket, 'not_found');
        return;
    }

    const result = policy.tryJoinRoom(socket, room);
    if (result !== 'joined') {
        policy.emitJoinError(socket, result === 'full' ? 'full' : 'join_failed');
    }
}

export function handleJoinOrCreateWithPolicy<TRoom>(
    socket: Socket,
    roomNameCandidate: unknown,
    fallbackName: string,
    policy: RoomModePolicy<TRoom>,
): void {
    const roomName = policy.normalizeName(roomNameCandidate, fallbackName);
    const joinableRoom = policy.findJoinableRoomByName(roomName);
    if (joinableRoom) {
        const result = policy.tryJoinRoom(socket, joinableRoom);
        if (result !== 'joined') {
            policy.emitJoinError(socket, result === 'full' ? 'full' : 'join_failed');
        }
        return;
    }

    policy.createAndJoinRoom(socket, roomName);
}

export function handleRoomLifecycleByIdWithPolicy<TRoom>(
    socket: Socket,
    roomId: string | null,
    policy: RoomLifecyclePolicy<TRoom>,
): void {
    if (!roomId) {
        policy.onMissing?.(socket);
        return;
    }
    const room = policy.findRoomById(roomId);
    if (!room) {
        policy.onMissing?.(socket);
        return;
    }
    policy.execute(socket, room);
}

export function handleTokenLifecycleWithPolicy<TTarget>(
    socket: Socket,
    token: string,
    policy: TokenLifecyclePolicy<TTarget>,
): void {
    const target = policy.findByToken(token);
    if (!target) {
        policy.onMissing(socket);
        return;
    }
    policy.execute(socket, target);
}

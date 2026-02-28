import express = require('express');
import http = require('http');
import { Server, Socket } from 'socket.io';
import path = require('path');
import nodeCrypto = require('crypto');
import { RANDOM_NAMES } from './randomNames';
import {
    handleCreateWithPolicy,
    handleRoomLifecycleByIdWithPolicy,
    handleTokenLifecycleWithPolicy,
    handleJoinByIdWithPolicy,
    handleJoinOrCreateWithPolicy,
    type RoomLifecyclePolicy,
    type RoomModePolicy,
    type TokenLifecyclePolicy,
} from './roomModePolicy';
import { AuthoritativeMatch, SyncState } from '../src/shared/core/authoritativeMatch';
import { BoardCodec } from '../src/tetris/net/boardCodec';
import {
    extractRoomId,
    isAuthInputPayload,
    isAuthPresencePayload,
    isNMultiAuthInputPayload,
    isNMultiRoomPayload,
    isNMultiSendGarbagePayload,
    isNMultiUpdateStatePayload,
    isPlayerReadyPayload,
    isRequestRestartPayload,
    isResumeAuthPayload,
    isSendGarbagePayload,
    isUpdateStatePayload,
    normalizeRoomName,
    type AuthSyncState,
    type NMultiPlayerPayload,
    type NMultiRoomJoinedPayload,
} from '../src/shared/types/socketPayloads';
import {
    createBotController,
    extractBotLevel,
    nextBotInputs,
    type BotControllerState,
} from './botController';

type Seat = 'p1' | 'p2';
type PresenceState = 'active' | 'inactive';

const AUTH_TICK_MS = 50;
const N_MULTI_SIM_TICK_MS = 50;
const N_MULTI_BROADCAST_MS = 100;
const RESUME_GRACE_MS = 30000;

interface AuthSeeds {
    p1: number;
    p2: number;
}

interface OneVsOneSeatState {
    socketId: string | null;
    token: string;
    ready: boolean;
    presence: PresenceState;
    disconnectedAt: number | null;
    bot: BotControllerState | null;
}

interface OneVsOneRoom {
    id: string;
    name: string;
    status: 'waiting' | 'playing';
    seats: Record<Seat, OneVsOneSeatState>;
    authSeeds: AuthSeeds | null;
    authMatch: AuthoritativeMatch | null;
    authInterval: NodeJS.Timeout | null;
    roundOver: boolean;
}

interface NMultiPlayer {
    id: string;
    name: string;
    socketId: string | null;
    score: number;
    level: number;
    lines: number;
    board: Uint8Array | null;
    isAlive: boolean;
    v: number;
    presence: PresenceState;
    disconnectedAt: number | null;
    lastUpdateAt: number;
    authMatch: AuthoritativeMatch;
    lastAckInputSeq: number;
    bot: BotControllerState | null;
}

interface NMultiRoom {
    id: string;
    name: string;
    players: Record<string, NMultiPlayer>;
    bySocket: Record<string, string>;
    dirtyPlayers: Set<string>;
    lastBroadcasted: Record<string, number>;
    broadcastInterval: NodeJS.Timeout;
    simInterval: NodeJS.Timeout;
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    path: '/server',
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
    pingInterval: 5000,
    pingTimeout: 10000,
    connectionStateRecovery: {
        maxDisconnectionDuration: RESUME_GRACE_MS,
        skipMiddlewares: true,
    },
});

const buildDir = path.join(process.cwd(), 'build');
app.use(express.static(buildDir));
app.get('*path', (_req: express.Request, res: express.Response) => {
    res.sendFile(path.join(buildDir, 'index.html'));
});

const oneVsOneRooms: Record<string, OneVsOneRoom> = {};
const nMultiRooms: Record<string, NMultiRoom> = {};
const requestedBotLevelBySocket: Record<string, number> = {};

function createToken(): string {
    return nodeCrypto.randomUUID();
}

function getRequestedBotLevel(socketId: string): number {
    return requestedBotLevelBySocket[socketId] ?? 0;
}

function rememberRequestedBotLevel(socketId: string, candidate: unknown): void {
    requestedBotLevelBySocket[socketId] = extractBotLevel(candidate);
}

function generateRandomName(room: NMultiRoom): string {
    const usedNames = new Set(Object.values(room.players).map((p) => p.name));
    for (let i = 0; i < 20; i += 1) {
        const candidate = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
        if (!usedNames.has(candidate)) {
            return candidate;
        }
    }
    const fallback = RANDOM_NAMES.find((name) => !usedNames.has(name));
    if (fallback) {
        return fallback;
    }
    return `Player${Object.keys(room.players).length + 1}`;
}

function getSeatBySocket(room: OneVsOneRoom, socketId: string): Seat | null {
    if (room.seats.p1.socketId === socketId) return 'p1';
    if (room.seats.p2.socketId === socketId) return 'p2';
    return null;
}

function getOpponentSeat(seat: Seat): Seat {
    return seat === 'p1' ? 'p2' : 'p1';
}

function enqueueBotInputsForOneVsOne(room: OneVsOneRoom): void {
    if (!room.authMatch) return;
    for (const seat of ['p1', 'p2'] as Seat[]) {
        const bot = room.seats[seat].bot;
        if (!bot) continue;
        const playerState = room.authMatch.players[seat];
        if (!playerState || !playerState.isAlive) continue;
        const sync = room.authMatch.getSnapshotFor(seat).self.sync;
        const inputs = nextBotInputs(bot, {
            boardCore: sync.boardCore,
            active: sync.active,
        });
        for (const direction of inputs) {
            bot.inputSeq += 1;
            room.authMatch.enqueue(seat, direction, 'press', bot.inputSeq);
        }
    }
}

function enqueueBotInputsForNMultiPlayer(player: NMultiPlayer): void {
    if (!player.bot || !player.isAlive) return;
    const sync = player.authMatch.getSnapshotFor('p1').self.sync;
    const inputs = nextBotInputs(player.bot, {
        boardCore: sync.boardCore,
        active: sync.active,
    });
    for (const direction of inputs) {
        player.bot.inputSeq += 1;
        player.authMatch.enqueue('p1', direction, 'press', player.bot.inputSeq);
    }
}

function emitRoomList(): void {
    io.emit('room_list', getOneVsOneRoomList());
}

function emitNMultiRoomList(): void {
    io.emit('nmulti_room_list', getNMultiRoomList());
}

function getOneVsOneRoomList(): Array<{ id: string; name: string; players: number; status: string }> {
    return Object.values(oneVsOneRooms)
        .map((room) => ({
            id: room.id,
            name: room.name,
            players: (room.seats.p1.socketId ? 1 : 0) + (room.seats.p2.socketId ? 1 : 0),
            status: room.status,
        }))
        .filter((room) => room.status === 'waiting');
}

function getNMultiRoomList(): Array<{ id: string; name: string; playerCount: number }> {
    return Object.values(nMultiRooms).map((room) => ({
        id: room.id,
        name: room.name,
        playerCount: Object.keys(room.players).length,
    }));
}

function getNMultiPlayersPayload(room: NMultiRoom, excludePlayerId: string | null = null): Record<string, NMultiPlayerPayload> {
    const payload: Record<string, NMultiPlayerPayload> = {};
    for (const [playerId, player] of Object.entries(room.players)) {
        if (excludePlayerId && playerId === excludePlayerId) continue;
        payload[playerId] = {
            name: player.name,
            score: player.score,
            level: player.level,
            lines: player.lines,
            board: player.board,
            isAlive: player.isAlive,
            v: player.v,
        };
    }
    return payload;
}

function buildNMultiRoomJoinedPayload(room: NMultiRoom, player: NMultiPlayer): NMultiRoomJoinedPayload {
    const authSnapshot = buildNMultiAuthSnapshot(player);
    return {
        roomId: room.id,
        playerId: player.id,
        playerName: player.name,
        roomName: room.name,
        players: getNMultiPlayersPayload(room, player.id),
        authSeed: player.authMatch.seeds.p1,
        botLevel: player.bot ? player.bot.level : 0,
        authSnapshot: {
            tick: authSnapshot.tick,
            self: authSnapshot.self,
            serverAckInputSeq: player.lastAckInputSeq,
        },
    };
}

function buildBinarySnapshotSide<T extends { board: string | Uint8Array; sync?: SyncState }>(side: T): T {
    if (side.board && typeof side.board === 'string') {
        side.board = BoardCodec.stringToBinary(side.board);
    }
    if (side.sync) {
        if (side.sync.boardCore && typeof side.sync.boardCore === 'string') {
            side.sync.boardCore = BoardCodec.stringToBinary(side.sync.boardCore);
        }
    }
    return side;
}

function buildOneVsOneAuthSnapshot(match: AuthoritativeMatch, seat: Seat): {
    tick: number;
    self: ReturnType<AuthoritativeMatch['getSnapshotFor']>['self'];
    opponent: ReturnType<AuthoritativeMatch['getSnapshotFor']>['opponent'];
    serverAckInputSeq: number;
} {
    const snapshot = match.getSnapshotFor(seat);
    snapshot.self = buildBinarySnapshotSide(snapshot.self);
    snapshot.opponent = buildBinarySnapshotSide(snapshot.opponent);
    return {
        ...snapshot,
        serverAckInputSeq: match.players[seat].lastSeq,
    };
}

function buildNMultiAuthSnapshot(player: NMultiPlayer): {
    tick: number;
    self: ReturnType<AuthoritativeMatch['getSnapshotFor']>['self'];
    serverAckInputSeq: number;
} {
    const snapshot = player.authMatch.getSnapshotFor('p1');
    snapshot.self = buildBinarySnapshotSide(snapshot.self);
    return {
        tick: snapshot.tick,
        self: snapshot.self,
        serverAckInputSeq: player.lastAckInputSeq,
    };
}

function markNMultiPlayerActive(player: NMultiPlayer): void {
    player.lastUpdateAt = Date.now();
    player.presence = 'active';
    player.disconnectedAt = null;
}

function getNMultiPlayerBySocket(room: NMultiRoom, socketId: string): { playerId: string; player: NMultiPlayer } | null {
    const playerId = room.bySocket[socketId];
    if (!playerId) return null;
    const player = room.players[playerId];
    if (!player) return null;
    return { playerId, player };
}

function resetNMultiPlayerMatch(player: NMultiPlayer): void {
    player.authMatch = createNMultiAuthoritativeMatch(player.name);
    const selfSnapshot = player.authMatch.getSnapshotFor('p1').self;
    player.score = selfSnapshot.score;
    player.level = selfSnapshot.level;
    player.lines = selfSnapshot.lines;
    player.board = selfSnapshot.board ? BoardCodec.stringToBinary(selfSnapshot.board) : null;
    player.isAlive = selfSnapshot.isAlive;
    markNMultiPlayerActive(player);
    player.lastAckInputSeq = 0;
    if (player.bot) {
        player.bot.inputSeq = 0;
        player.bot.plannedPiece = null;
        player.bot.plannedActions = [];
    }
    player.v += 1;
}

function createNMultiAuthoritativeMatch(playerName: string): AuthoritativeMatch {
    const seed = nodeCrypto.randomInt(1, 0x7fffffff);
    const match = new AuthoritativeMatch(playerName, 'VOID', seed, 1);
    match.players.p2.isAlive = false;
    return match;
}

function createNMultiPlayer(room: NMultiRoom | null, socketId: string, name?: string): NMultiPlayer {
    const now = Date.now();
    const playerName = name || (room ? generateRandomName(room) : RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)]);
    const authMatch = createNMultiAuthoritativeMatch(playerName);
    const initialSelf = authMatch.getSnapshotFor('p1').self;

    return {
        id: nodeCrypto.randomUUID(),
        name: playerName,
        socketId,
        score: initialSelf.score,
        level: initialSelf.level,
        lines: initialSelf.lines,
        board: initialSelf.board ? BoardCodec.stringToBinary(initialSelf.board) : null,
        isAlive: initialSelf.isAlive,
        v: 1,
        presence: 'active',
        disconnectedAt: null,
        lastUpdateAt: now,
        authMatch,
        lastAckInputSeq: 0,
        bot: createBotController(getRequestedBotLevel(socketId)),
    };
}

function createOneVsOneRoom(roomName: string, hostSocketId: string): OneVsOneRoom {
    const roomId = nodeCrypto.randomUUID();
    const room: OneVsOneRoom = {
        id: roomId,
        name: roomName,
        status: 'waiting',
        seats: {
            p1: {
                socketId: hostSocketId,
                token: createToken(),
                ready: false,
                presence: 'active',
                disconnectedAt: null,
                bot: createBotController(getRequestedBotLevel(hostSocketId)),
            },
            p2: {
                socketId: null,
                token: createToken(),
                ready: false,
                presence: 'inactive',
                disconnectedAt: null,
                bot: null,
            },
        },
        authSeeds: null,
        authMatch: null,
        authInterval: null,
        roundOver: false,
    };
    oneVsOneRooms[roomId] = room;
    return room;
}

function joinSocketToRoom(socket: Socket, roomId: string): void {
    socket.join(roomId);
}

function emitOneVsOneRoomJoined(socket: Socket, room: OneVsOneRoom, seat: Seat): void {
    socket.emit('room_joined', {
        roomId: room.id,
        isHost: seat === 'p1',
        roomName: room.name,
        resumeToken: room.seats[seat].token,
        botLevel: room.seats[seat].bot ? room.seats[seat].bot.level : 0,
    });
}

function createAndJoinOneVsOneRoom(socket: Socket, roomName: string): OneVsOneRoom {
    const room = createOneVsOneRoom(roomName, socket.id);
    joinSocketToRoom(socket, room.id);
    emitOneVsOneRoomJoined(socket, room, 'p1');
    emitRoomList();
    return room;
}

function joinOneVsOneRoom(socket: Socket, room: OneVsOneRoom): boolean {
    if (room.status !== 'waiting') {
        return false;
    }

    let joinSeat: Seat | null = null;
    if (!room.seats.p1.socketId) {
        joinSeat = 'p1';
    } else if (!room.seats.p2.socketId) {
        joinSeat = 'p2';
    }
    if (!joinSeat) {
        return false;
    }

    room.seats[joinSeat].socketId = socket.id;
    room.seats[joinSeat].presence = 'active';
    room.seats[joinSeat].disconnectedAt = null;
    room.seats[joinSeat].bot = createBotController(getRequestedBotLevel(socket.id));
    room.status = 'playing';

    joinSocketToRoom(socket, room.id);
    emitOneVsOneRoomJoined(socket, room, joinSeat);

    const opponentSeat = getOpponentSeat(joinSeat);
    const opponentSocketId = room.seats[opponentSeat].socketId;
    if (opponentSocketId) {
        io.to(opponentSocketId).emit('opponent_joined', { opponentId: socket.id });
        socket.emit('opponent_joined', { opponentId: opponentSocketId });
    }

    emitRoomList();
    return true;
}

function createNMultiRoom(roomName: string, hostSocketId: string): NMultiRoom {
    const roomId = nodeCrypto.randomUUID();
    const host = createNMultiPlayer(null, hostSocketId);
    const room: NMultiRoom = {
        id: roomId,
        name: roomName,
        players: {
            [host.id]: host,
        },
        bySocket: {
            [hostSocketId]: host.id,
        },
        dirtyPlayers: new Set([host.id]),
        lastBroadcasted: {},
        broadcastInterval: setInterval(() => broadcastNMultiDelta(roomId), N_MULTI_BROADCAST_MS),
        simInterval: setInterval(() => tickNMultiRoom(roomId), N_MULTI_SIM_TICK_MS),
    };
    nMultiRooms[roomId] = room;
    return room;
}

function addNMultiPlayerToRoom(room: NMultiRoom, socket: Socket): { player: NMultiPlayer; isNew: boolean } {
    const existingPlayerId = room.bySocket[socket.id];
    if (existingPlayerId) {
        const existingPlayer = room.players[existingPlayerId];
        if (existingPlayer) {
            existingPlayer.socketId = socket.id;
            markNMultiPlayerActive(existingPlayer);
            markNMultiPlayerDirty(room, existingPlayer.id);
            return { player: existingPlayer, isNew: false };
        }
        delete room.bySocket[socket.id];
    }

    const player = createNMultiPlayer(room, socket.id);
    room.players[player.id] = player;
    room.bySocket[socket.id] = player.id;
    markNMultiPlayerDirty(room, player.id);
    return { player, isNew: true };
}

function emitNMultiRoomJoined(socket: Socket, room: NMultiRoom, player: NMultiPlayer): void {
    joinSocketToRoom(socket, room.id);
    socket.emit('nmulti_room_joined', buildNMultiRoomJoinedPayload(room, player));
}

function createAndJoinNMultiRoom(socket: Socket, roomName: string): NMultiRoom {
    const room = createNMultiRoom(roomName, socket.id);
    const host = Object.values(room.players)[0];
    emitNMultiRoomJoined(socket, room, host);
    emitNMultiRoomList();
    return room;
}

function joinExistingNMultiRoom(socket: Socket, room: NMultiRoom): void {
    const { player, isNew } = addNMultiPlayerToRoom(room, socket);
    emitNMultiRoomJoined(socket, room, player);
    if (isNew) {
        socket.to(room.id).emit('nmulti_player_joined', {
            playerId: player.id,
            playerName: player.name,
        });
    }
    emitNMultiRoomList();
}

function ensureSocketDetachedFromNMultiRooms(socketId: string, retainRoomId: string | null = null): void {
    for (const room of Object.values(nMultiRooms)) {
        if (retainRoomId && room.id === retainRoomId) continue;
        const playerId = room.bySocket[socketId];
        if (!playerId) continue;
        permanentlyRemovePlayerFromNMultiRoom(room, playerId);
    }
}

function isNMultiRoomFull(room: NMultiRoom): boolean {
    return Object.keys(room.players).length >= 100;
}

const oneVsOneModePolicy: RoomModePolicy<OneVsOneRoom> = {
    normalizeName: normalizeRoomName,
    findRoomById: (roomId) => oneVsOneRooms[roomId] || null,
    findJoinableRoomByName: (roomName) => Object.values(oneVsOneRooms)
        .find((room) => room.name === roomName && room.status === 'waiting') || null,
    createAndJoinRoom: (socket, roomName) => {
        createAndJoinOneVsOneRoom(socket, roomName);
    },
    tryJoinRoom: (socket, room) => (joinOneVsOneRoom(socket, room) ? 'joined' : 'join_failed'),
    emitJoinError: (socket) => {
        socket.emit('room_error', {
            code: 'ROOM_NOT_FOUND_OR_FULL',
            message: 'Room is full or does not exist.',
        });
    },
};

const nMultiModePolicy: RoomModePolicy<NMultiRoom> = {
    normalizeName: normalizeRoomName,
    findRoomById: (roomId) => nMultiRooms[roomId] || null,
    findJoinableRoomByName: (roomName) => Object.values(nMultiRooms)
        .find((room) => room.name === roomName) || null,
    createAndJoinRoom: (socket, roomName) => {
        createAndJoinNMultiRoom(socket, roomName);
    },
    tryJoinRoom: (socket, room) => {
        if (isNMultiRoomFull(room)) {
            return 'full';
        }
        joinExistingNMultiRoom(socket, room);
        return 'joined';
    },
    emitJoinError: (socket, reason) => {
        if (reason === 'full') {
            socket.emit('nmulti_room_error', {
                code: 'ROOM_FULL',
                message: 'Room is full (100 players max).',
            });
            return;
        }
        socket.emit('nmulti_room_error', {
            code: 'ROOM_NOT_FOUND',
            message: 'Room does not exist.',
        });
    },
};

const oneVsOneResumePolicy: TokenLifecyclePolicy<{ room: OneVsOneRoom; seat: Seat }> = {
    findByToken: findOneVsOneByToken,
    execute: (socket, found) => {
        const { room, seat } = found;
        room.seats[seat].socketId = socket.id;
        room.seats[seat].presence = 'active';
        room.seats[seat].disconnectedAt = null;
        joinSocketToRoom(socket, room.id);

        const opponentSeat = getOpponentSeat(seat);
        const resumedPayload = {
            roomId: room.id,
            isHost: seat === 'p1',
            roomName: room.name,
            resumeToken: room.seats[seat].token,
            authSeed: room.authSeeds ? room.authSeeds[seat] : null,
            shadowSelf: room.authMatch ? buildBinarySnapshotSide(room.authMatch.getSnapshotFor(seat).self) : undefined,
            shadowOpponent: room.authMatch ? buildBinarySnapshotSide(room.authMatch.getSnapshotFor(seat).opponent) : undefined,
            pendingGarbage: [],
            serverSeqBase: room.authMatch ? room.authMatch.tick : 0,
        };
        socket.emit('room_resumed', resumedPayload);

        if (room.authMatch) {
            socket.emit('auth_snapshot', buildOneVsOneAuthSnapshot(room.authMatch, seat));
        }

        const opponentSocketId = room.seats[opponentSeat].socketId;
        if (opponentSocketId) {
            io.to(opponentSocketId).emit('opponent_joined', { opponentId: socket.id });
        }
    },
    onMissing: (socket) => {
        socket.emit('room_error', {
            code: 'RESUME_TOKEN_INVALID',
            message: 'Resume token expired or invalid.',
        });
    },
};

const oneVsOneRestartPolicy: RoomLifecyclePolicy<OneVsOneRoom> = {
    findRoomById: (roomId) => oneVsOneRooms[roomId] || null,
    execute: (socket, room) => {
        const seat = getSeatBySocket(room, socket.id);
        if (!seat) return;
        room.seats.p1.ready = false;
        room.seats.p2.ready = false;
        room.authMatch = null;
        room.authSeeds = null;
        room.roundOver = false;
        stopOneVsOneLoop(room);
        io.to(room.id).emit('restart_signal');
    },
};

const nMultiRestartPolicy: RoomLifecyclePolicy<NMultiRoom> = {
    findRoomById: (roomId) => nMultiRooms[roomId] || null,
    execute: (socket, room) => {
        const playerEntry = getNMultiPlayerBySocket(room, socket.id);
        if (!playerEntry) return;

        const { playerId, player } = playerEntry;
        resetNMultiPlayerMatch(player);
        markNMultiPlayerDirty(room, playerId);

        socket.emit('nmulti_restarted', {
            roomId: room.id,
            authSeed: player.authMatch.seeds.p1,
            authSnapshot: buildNMultiAuthSnapshot(player),
        });
    },
};

function stopOneVsOneLoop(room: OneVsOneRoom): void {
    if (!room.authInterval) return;
    clearInterval(room.authInterval);
    room.authInterval = null;
}

function startOneVsOneRound(room: OneVsOneRoom): void {
    room.roundOver = false;
    const seedP1 = nodeCrypto.randomInt(1, 0x7fffffff);
    const seedP2 = nodeCrypto.randomInt(1, 0x7fffffff);
    room.authSeeds = { p1: seedP1, p2: seedP2 };
    room.authMatch = new AuthoritativeMatch('P1', 'P2', seedP1, seedP2);
    for (const seat of ['p1', 'p2'] as Seat[]) {
        const bot = room.seats[seat].bot;
        if (!bot) continue;
        bot.inputSeq = 0;
        bot.plannedPiece = null;
        bot.plannedActions = [];
    }

    stopOneVsOneLoop(room);
    room.authInterval = setInterval(() => tickOneVsOneRoom(room.id), AUTH_TICK_MS);

    if (room.seats.p1.socketId) {
        io.to(room.seats.p1.socketId).emit('game_start', {
            roomId: room.id,
            authSeed: seedP1,
            authSnapshot: buildOneVsOneAuthSnapshot(room.authMatch, 'p1'),
        });
    }
    if (room.seats.p2.socketId) {
        io.to(room.seats.p2.socketId).emit('game_start', {
            roomId: room.id,
            authSeed: seedP2,
            authSnapshot: buildOneVsOneAuthSnapshot(room.authMatch, 'p2'),
        });
    }
}

function maybeFinishOneVsOneRound(room: OneVsOneRoom): void {
    if (!room.authMatch || room.roundOver) return;
    const p1Alive = room.authMatch.players.p1.isAlive;
    const p2Alive = room.authMatch.players.p2.isAlive;
    if (p1Alive && p2Alive) return;
    room.roundOver = true;
    room.seats.p1.ready = false;
    room.seats.p2.ready = false;
    io.to(room.id).emit('auth_round_over', {
        winner: p1Alive ? 'p1' : (p2Alive ? 'p2' : null),
    });
}

function tickOneVsOneRoom(roomId: string): void {
    const room = oneVsOneRooms[roomId];
    if (!room || !room.authMatch) {
        if (room) stopOneVsOneLoop(room);
        return;
    }

    enqueueBotInputsForOneVsOne(room);

    const step = room.authMatch.step();

    if (step.toP1 > 0 && room.seats.p1.socketId) {
        io.to(room.seats.p1.socketId).emit('auth_receive_garbage', { count: step.toP1 });
    }
    if (step.toP2 > 0 && room.seats.p2.socketId) {
        io.to(room.seats.p2.socketId).emit('auth_receive_garbage', { count: step.toP2 });
    }

    if (room.seats.p1.socketId) {
        io.to(room.seats.p1.socketId).emit('auth_snapshot', buildOneVsOneAuthSnapshot(room.authMatch, 'p1'));
    }
    if (room.seats.p2.socketId) {
        io.to(room.seats.p2.socketId).emit('auth_snapshot', buildOneVsOneAuthSnapshot(room.authMatch, 'p2'));
    }

    maybeFinishOneVsOneRound(room);
}

function findOneVsOneByToken(token: string): { room: OneVsOneRoom; seat: Seat } | null {
    for (const room of Object.values(oneVsOneRooms)) {
        if (room.seats.p1.token === token) return { room, seat: 'p1' };
        if (room.seats.p2.token === token) return { room, seat: 'p2' };
    }
    return null;
}

function handleOneVsOneDisconnect(socketId: string): void {
    for (const room of Object.values(oneVsOneRooms)) {
        const seat = getSeatBySocket(room, socketId);
        if (!seat) continue;

        const seatState = room.seats[seat];
        seatState.socketId = null;
        seatState.presence = 'inactive';
        seatState.disconnectedAt = null;
        seatState.ready = false;
        seatState.token = createToken();
        seatState.bot = null;

        const opponentSeat = getOpponentSeat(seat);
        room.seats[opponentSeat].ready = false;
        room.status = 'waiting';
        room.authMatch = null;
        room.authSeeds = null;
        room.roundOver = false;
        stopOneVsOneLoop(room);

        const opponentSocketId = room.seats[opponentSeat].socketId;
        if (opponentSocketId) {
            io.to(opponentSocketId).emit('opponent_disconnected', {
                message: 'Opponent left the room. Waiting for a new player.',
            });
        }

        if (!room.seats.p1.socketId && !room.seats.p2.socketId) {
            delete oneVsOneRooms[room.id];
        }
    }

    emitRoomList();
}

function markNMultiPlayerDirty(room: NMultiRoom, playerId: string): void {
    room.dirtyPlayers.add(playerId);
}

function applyNMultiInactiveKnockout(room: NMultiRoom): void {
    void room;
}

function chooseNMultiAttackTarget(room: NMultiRoom, senderId: string): NMultiPlayer | null {
    const aliveTargets = Object.values(room.players).filter((player) => player.id !== senderId && player.isAlive);
    if (aliveTargets.length === 0) return null;
    const idx = Math.floor(Math.random() * aliveTargets.length);
    return aliveTargets[idx] || null;
}

function tickNMultiRoom(roomId: string): void {
    const room = nMultiRooms[roomId];
    if (!room) return;

    applyNMultiInactiveKnockout(room);

    for (const player of Object.values(room.players)) {
        const match = player.authMatch;
        const wasAlive = player.isAlive;

        if (player.isAlive) {
            enqueueBotInputsForNMultiPlayer(player);
            const step = match.step();
            if (step.toP2 > 0) {
                const target = chooseNMultiAttackTarget(room, player.id);
                if (target) {
                    target.authMatch.applyGarbageTo('p1', step.toP2);
                    if (target.socketId) {
                        io.to(target.socketId).emit('nmulti_receive_garbage', {
                            count: step.toP2,
                            fromId: player.id,
                        });
                    }
                }
            }
        }

        const snapshot = match.getSnapshotFor('p1');
        const self = buildBinarySnapshotSide(snapshot.self);
        const nextAck = Number.isFinite(match.players.p1.lastSeq) ? match.players.p1.lastSeq : player.lastAckInputSeq;
        const compressedBoard = self.board as Uint8Array;
        const changed = !BoardCodec.areUint8ArraysEqual(player.board, compressedBoard)
            || player.score !== self.score
            || player.level !== self.level
            || player.lines !== self.lines
            || player.isAlive !== self.isAlive
            || player.lastAckInputSeq !== nextAck;

        player.board = compressedBoard;
        player.score = self.score;
        player.level = self.level;
        player.lines = self.lines;
        player.isAlive = self.isAlive;
        player.lastAckInputSeq = nextAck;

        if (player.socketId) {
            io.to(player.socketId).emit('nmulti_auth_snapshot', {
                tick: snapshot.tick,
                self,
                serverAckInputSeq: player.lastAckInputSeq,
            });
        }

        if (changed || (wasAlive && !player.isAlive)) {
            player.v += 1;
            markNMultiPlayerDirty(room, player.id);
        }
    }
}

function broadcastNMultiDelta(roomId: string): void {
    const room = nMultiRooms[roomId];
    if (!room) return;

    applyNMultiInactiveKnockout(room);

    const dirty = Array.from(room.dirtyPlayers);
    if (dirty.length === 0) return;

    const delta: Record<string, NMultiPlayerPayload> = {};

    for (const playerId of dirty) {
        const player = room.players[playerId];
        if (!player) continue;
        const previous = room.lastBroadcasted[playerId] || 0;
        if (player.v <= previous) continue;
        delta[playerId] = {
            name: player.name,
            score: player.score,
            level: player.level,
            lines: player.lines,
            board: player.board,
            isAlive: player.isAlive,
            v: player.v,
        };
        room.lastBroadcasted[playerId] = player.v;
    }

    room.dirtyPlayers.clear();

    if (Object.keys(delta).length > 0) {
        io.to(roomId).emit('nmulti_snapshot', {
            players: delta,
            isDelta: true,
        });
    }
}

function permanentlyRemovePlayerFromNMultiRoom(room: NMultiRoom, playerId: string): void {
    const player = room.players[playerId];
    if (!player) return;

    if (player.socketId) {
        const socket = io.sockets.sockets.get(player.socketId);
        if (socket) {
            socket.leave(room.id);
        }
        delete room.bySocket[player.socketId];
    }

    delete room.players[playerId];
    delete room.lastBroadcasted[playerId];
    room.dirtyPlayers.delete(playerId);

    io.to(room.id).emit('nmulti_player_left', { playerId });

    if (Object.keys(room.players).length === 0) {
        clearInterval(room.broadcastInterval);
        clearInterval(room.simInterval);
        delete nMultiRooms[room.id];
    }

    emitNMultiRoomList();
}

function handleNMultiDisconnect(socket: Socket): void {
    for (const room of Object.values(nMultiRooms)) {
        const playerId = room.bySocket[socket.id];
        if (!playerId) continue;
        permanentlyRemovePlayerFromNMultiRoom(room, playerId);
    }
}

io.on('connection', (socket: Socket) => {
    socket.on('get_rooms', () => {
        socket.emit('room_list', getOneVsOneRoomList());
    });

    socket.on('create_room', (roomName: unknown) => {
        rememberRequestedBotLevel(socket.id, roomName);
        handleCreateWithPolicy(socket, roomName, 'My Room', oneVsOneModePolicy);
    });

    socket.on('join_room', (roomIdCandidate: unknown) => {
        rememberRequestedBotLevel(socket.id, roomIdCandidate);
        handleJoinByIdWithPolicy(socket, extractRoomId(roomIdCandidate), oneVsOneModePolicy);
    });

    socket.on('join_or_create', (roomNameCandidate: unknown) => {
        rememberRequestedBotLevel(socket.id, roomNameCandidate);
        handleJoinOrCreateWithPolicy(socket, roomNameCandidate, 'Room', oneVsOneModePolicy);
    });

    socket.on('player_ready', (payload: unknown) => {
        if (!isPlayerReadyPayload(payload)) return;
        const room = oneVsOneRooms[payload.roomId];
        if (!room) return;
        const seat = getSeatBySocket(room, socket.id);
        if (!seat) return;
        room.seats[seat].ready = true;
        if (!room.seats.p1.ready || !room.seats.p2.ready) return;
        startOneVsOneRound(room);
    });

    socket.on('auth_input', (payload: unknown) => {
        if (!isAuthInputPayload(payload)) return;
        const room = oneVsOneRooms[payload.roomId];
        if (!room || !room.authMatch) return;
        const seat = getSeatBySocket(room, socket.id);
        if (!seat) return;
        if (room.seats[seat].bot) return;
        room.authMatch.enqueue(seat, payload.direction, payload.state, payload.seq);
    });

    socket.on('auth_presence', (payload: unknown) => {
        if (!isAuthPresencePayload(payload)) return;
        const room = oneVsOneRooms[payload.roomId];
        if (!room) return;
        const seat = getSeatBySocket(room, socket.id);
        if (!seat) return;
        room.seats[seat].presence = payload.state;
    });

    socket.on('auth_snapshot', () => {
        // The redesigned server is fully authoritative.
        // Client shadow snapshots are ignored for fairness.
    });

    socket.on('auth_send_garbage', () => {
        // The redesigned server computes attacks from authoritative state.
        // Client-side attack claims are ignored.
    });

    socket.on('resume_auth', (payload: unknown) => {
        if (!isResumeAuthPayload(payload)) return;
        handleTokenLifecycleWithPolicy(socket, payload.resumeToken, oneVsOneResumePolicy);
    });

    socket.on('game_over', (payload: unknown) => {
        const roomId = extractRoomId(payload);
        if (!roomId) return;
        const room = oneVsOneRooms[roomId];
        if (!room || !room.authMatch) return;
        const seat = getSeatBySocket(room, socket.id);
        if (!seat) return;
        room.authMatch.players[seat].isAlive = false;
        maybeFinishOneVsOneRound(room);
    });

    socket.on('request_restart', (payload: unknown) => {
        if (!isRequestRestartPayload(payload)) return;
        handleRoomLifecycleByIdWithPolicy(socket, payload.roomId, oneVsOneRestartPolicy);
    });

    socket.on('update_state', (payload: unknown) => {
        if (!isUpdateStatePayload(payload)) return;
        const room = oneVsOneRooms[payload.roomId];
        if (!room) return;
        const seat = getSeatBySocket(room, socket.id);
        if (!seat) return;
        socket.to(room.id).emit('opponent_state_update', payload);
    });

    socket.on('send_garbage', (payload: unknown) => {
        if (!isSendGarbagePayload(payload)) return;
        const room = oneVsOneRooms[payload.roomId];
        if (!room) return;
        const seat = getSeatBySocket(room, socket.id);
        if (!seat) return;
        socket.to(room.id).emit('receive_garbage', payload);
    });

    socket.on('nmulti_get_rooms', () => {
        socket.emit('nmulti_room_list', getNMultiRoomList());
    });

    socket.on('nmulti_create_room', (roomNameCandidate: unknown) => {
        ensureSocketDetachedFromNMultiRooms(socket.id);
        rememberRequestedBotLevel(socket.id, roomNameCandidate);
        handleCreateWithPolicy(socket, roomNameCandidate, 'Room', nMultiModePolicy);
    });

    socket.on('nmulti_join_room', (payload: unknown) => {
        const targetRoomId = extractRoomId(payload);
        ensureSocketDetachedFromNMultiRooms(socket.id, targetRoomId);
        rememberRequestedBotLevel(socket.id, payload);
        handleJoinByIdWithPolicy(socket, targetRoomId, nMultiModePolicy);
    });

    socket.on('nmulti_join_or_create', (roomNameCandidate: unknown) => {
        ensureSocketDetachedFromNMultiRooms(socket.id);
        rememberRequestedBotLevel(socket.id, roomNameCandidate);
        handleJoinOrCreateWithPolicy(socket, roomNameCandidate, 'Room', nMultiModePolicy);
    });

    socket.on('nmulti_leave_room', (payload: unknown) => {
        const roomId = extractRoomId(payload);
        if (!roomId) return;
        const room = nMultiRooms[roomId];
        if (!room) return;
        const playerId = room.bySocket[socket.id];
        if (!playerId) return;
        permanentlyRemovePlayerFromNMultiRoom(room, playerId);
    });

    socket.on('nmulti_update_state', (payload: unknown) => {
        if (!isNMultiUpdateStatePayload(payload)) return;
        const room = nMultiRooms[payload.roomId];
        if (!room) return;
        const playerEntry = getNMultiPlayerBySocket(room, socket.id);
        if (!playerEntry) return;

        const { player } = playerEntry;
        // Authoritative mode: gameplay state is owned by server simulation.
        // Keep this event as heartbeat/backward compatibility only.
        markNMultiPlayerActive(player);
    });

    socket.on('nmulti_auth_input', (payload: unknown) => {
        if (!isNMultiAuthInputPayload(payload)) return;
        const room = nMultiRooms[payload.roomId];
        if (!room) return;
        const playerEntry = getNMultiPlayerBySocket(room, socket.id);
        if (!playerEntry) return;

        const { player } = playerEntry;
        if (!player.isAlive) return;
        if (player.bot) return;

        player.authMatch.enqueue('p1', payload.direction, payload.state, payload.seq);
        markNMultiPlayerActive(player);
    });

    socket.on('nmulti_presence', (payload: unknown) => {
        if (!payload || typeof payload !== 'object') return;
        const record = payload as Record<string, unknown>;
        if (typeof record.roomId !== 'string') return;
        if (record.state !== 'active' && record.state !== 'inactive') return;

        const room = nMultiRooms[record.roomId];
        if (!room) return;
        const playerEntry = getNMultiPlayerBySocket(room, socket.id);
        if (!playerEntry) return;

        const { player } = playerEntry;
        player.presence = record.state;
        if (record.state === 'active') {
            markNMultiPlayerActive(player);
        }
    });

    socket.on('nmulti_send_garbage', (payload: unknown) => {
        if (!isNMultiSendGarbagePayload(payload)) return;
        // Authoritative mode: client-side garbage claims are ignored.
    });

    socket.on('nmulti_game_over', (payload: unknown) => {
        if (!isNMultiRoomPayload(payload)) return;
        // Authoritative mode: server owns alive/dead transitions.
    });

    socket.on('nmulti_request_full_sync', (payload: unknown) => {
        if (!isNMultiRoomPayload(payload)) return;
        const room = nMultiRooms[payload.roomId];
        if (!room) return;
        const playerEntry = getNMultiPlayerBySocket(room, socket.id);
        if (!playerEntry) return;

        const { playerId, player: self } = playerEntry;

        socket.emit('nmulti_snapshot', {
            players: getNMultiPlayersPayload(room, playerId),
            isDelta: false,
        });

        socket.emit('nmulti_auth_snapshot', buildNMultiAuthSnapshot(self));
    });

    socket.on('nmulti_restart', (payload: unknown) => {
        if (!isNMultiRoomPayload(payload)) return;
        handleRoomLifecycleByIdWithPolicy(socket, payload.roomId, nMultiRestartPolicy);
    });

    socket.on('disconnect', () => {
        handleOneVsOneDisconnect(socket.id);
        handleNMultiDisconnect(socket);
        delete requestedBotLevelBySocket[socket.id];
    });
});

const PORT = process.env.PORT || 3031;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export {};

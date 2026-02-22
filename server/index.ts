import express = require('express');
import http = require('http');
import { Server, Socket } from 'socket.io';
import path = require('path');
import nodeCrypto = require('crypto');
import { RANDOM_NAMES } from './randomNames';
import { AuthoritativeMatch } from '../src/shared/core/authoritativeMatch';
import {
    extractRoomId,
    isNMultiRoomPayload,
    isNMultiSendGarbagePayload,
    isNMultiUpdateStatePayload,
    isSendGarbagePayload,
    isUpdateStatePayload,
    isAuthInputPayload,
    isPlayerReadyPayload,
    isRequestRestartPayload,
    isResumeAuthPayload,
    normalizeRoomName,
    type AuthRoundOverPayload,
} from '../src/shared/types/socketPayloads';

type Seat = 'p1' | 'p2';

interface AuthSeeds {
    p1: number;
    p2: number;
}

interface RoomState {
    id: string;
    name: string;
    p1: string | null;
    p2: string | null;
    status: 'waiting' | 'playing';
    p1Token: string;
    p2Token: string | null;
    p1Ready?: boolean;
    p2Ready?: boolean;
    authMatch: InstanceType<typeof AuthoritativeMatch> | null;
    authInterval: NodeJS.Timeout | null;
    authSeeds: AuthSeeds | null;
}

interface NMultiPlayer {
    name: string;
    score: number;
    level: number;
    lines: number;
    board: string | null;
    isAlive: boolean;
    v: number;
}

interface NMultiRoomState {
    id: string;
    name: string;
    playerCounter: number;
    players: Record<string, NMultiPlayer>;
    lastBroadcasted: Record<string, number>;
    dirtyPlayers: Set<string>;
    _broadcastInterval: NodeJS.Timeout;
}

function generateRandomName(room: NMultiRoomState): string {
    const usedNames = new Set(Object.values(room.players).map((p) => p.name));
    // Try random picks first (fast path)
    for (let i = 0; i < 20; i++) {
        const name = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
        if (!usedNames.has(name)) return name;
    }
    // Fallback: filter available names
    const available = RANDOM_NAMES.filter((n: string) => !usedNames.has(n));
    if (available.length > 0) {
        return available[Math.floor(Math.random() * available.length)];
    }
    // All 1000 names used: append number
    return 'Player' + (Object.keys(room.players).length + 1);
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    path: '/server',
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const buildDir = path.join(process.cwd(), 'build');

app.use(express.static(buildDir));

app.get('*path', (_req: express.Request, res: express.Response) => {
    res.sendFile(path.join(buildDir, 'index.html'));
});

// rooms = { roomId: { id, name, p1: socketId, p2: socketId, status: 'waiting'|'playing' } }
let rooms: Record<string, RoomState> = {};

// N-Multi rooms
let nMultiRooms: Record<string, NMultiRoomState> = {};
// nMultiRooms[roomId] = {
//   id: string,
//   name: string,
//   playerCounter: number,
//   players: { [socketId]: { name, score, level, lines, board, isAlive, v } },
//   lastBroadcasted: { [socketId]: string },
//   dirtyPlayers: Set<string>,
//   _broadcastInterval: NodeJS.Timer
// }

function createNMultiRoom(roomId: string, roomName: string, hostSocketId: string, hostName: string): NMultiRoomState {
    nMultiRooms[roomId] = {
        id: roomId,
        name: roomName,
        playerCounter: 1,
        players: {
            [hostSocketId]: {
                name: hostName,
                score: 0,
                level: 1,
                lines: 0,
                board: null,
                isAlive: true,
                v: 0
            }
        },
        lastBroadcasted: {},
        dirtyPlayers: new Set([hostSocketId]),
        _broadcastInterval: setInterval(() => {
            broadcastNMultiSnapshot(roomId);
        }, 500)
    };

    return nMultiRooms[roomId];
}

function createResumeToken(): string {
    return nodeCrypto.randomUUID();
}

function findRoomByResumeToken(token: string): { roomId: string; room: RoomState; seat: Seat } | null {
    for (const roomId in rooms) {
        const room = rooms[roomId];
        if (room.p1Token === token) return { roomId, room, seat: 'p1' };
        if (room.p2Token === token) return { roomId, room, seat: 'p2' };
    }
    return null;
}

function getPlayerSeat(room: RoomState | null, socketId: string): Seat | null {
    if (!room) return null;
    if (room.p1 === socketId) return 'p1';
    if (room.p2 === socketId) return 'p2';
    return null;
}

function stopRoomAuthLoop(room: RoomState | null): void {
    if (!room || !room.authInterval) return;
    clearInterval(room.authInterval);
    room.authInterval = null;
}

function buildAuthSnapshot(room: RoomState, seat: Seat): any {
    return room.authMatch.getSnapshotFor(seat);
}

function broadcastRoomAuthSnapshot(room: RoomState, roomId: string): void {
    if (!room || !room.authMatch) return;

    if (room.p1) {
        io.to(room.p1).emit('auth_snapshot', buildAuthSnapshot(room, 'p1'));
    }
    if (room.p2) {
        io.to(room.p2).emit('auth_snapshot', buildAuthSnapshot(room, 'p2'));
    }

    const p1Alive = room.authMatch.players.p1.isAlive;
    const p2Alive = room.authMatch.players.p2.isAlive;
    if (!p1Alive || !p2Alive) {
        const payload: AuthRoundOverPayload = { winner: p1Alive ? 'p1' : (p2Alive ? 'p2' : null) };
        io.to(roomId).emit('auth_round_over', payload);
    }
}

function ensureRoomAuthLoop(room: RoomState, roomId: string): void {
    if (!room || !room.authMatch || room.authInterval) return;
    room.authInterval = setInterval(() => {
        if (!rooms[roomId] || rooms[roomId] !== room) {
            stopRoomAuthLoop(room);
            return;
        }
        const stepResult = room.authMatch.step();
        if (room.p1 && stepResult.toP1 > 0) {
            io.to(room.p1).emit('auth_receive_garbage', { count: stepResult.toP1 });
        }
        if (room.p2 && stepResult.toP2 > 0) {
            io.to(room.p2).emit('auth_receive_garbage', { count: stepResult.toP2 });
        }
        broadcastRoomAuthSnapshot(room, roomId);
    }, 100);
}

function startAuthoritativeRoom(roomId: string): void {
    const room = rooms[roomId];
    if (!room || !room.p1 || !room.p2) return;
    if (!room.authMatch) {
        const seedP1 = nodeCrypto.randomInt(1, 0x7fffffff);
        const seedP2 = nodeCrypto.randomInt(1, 0x7fffffff);
        room.authSeeds = { p1: seedP1, p2: seedP2 };
        room.authMatch = new AuthoritativeMatch('P1', 'P2', seedP1, seedP2);
    }
    ensureRoomAuthLoop(room, roomId);
}

function markNMultiPlayerDirty(room: NMultiRoomState, playerId: string): void {
    if (!room || !playerId) return;
    if (!room.dirtyPlayers) {
        room.dirtyPlayers = new Set();
    }
    room.dirtyPlayers.add(playerId);
}

io.on('connection', (socket: Socket) => {
    console.log('A user connected:', socket.id);

    // Send initial room list
    socket.on('get_rooms', () => {
        socket.emit('room_list', getRoomList());
    });

    socket.on('create_room', (roomName: unknown) => {
        const normalizedRoomName = normalizeRoomName(roomName, 'My Room');
        const roomId = nodeCrypto.randomUUID();
        const p1Token = createResumeToken();
        rooms[roomId] = {
            id: roomId,
            name: normalizedRoomName,
            p1: socket.id,
            p2: null,
            status: 'waiting',
            p1Token,
            p2Token: null,
            authMatch: null,
            authInterval: null,
            authSeeds: null,
        };
        
        socket.join(roomId);
        socket.emit('room_joined', { roomId, isHost: true, roomName: normalizedRoomName, resumeToken: p1Token });
        io.emit('room_list', getRoomList()); // Broadcast update
        console.log(`Room created: ${normalizedRoomName} (${roomId})`);
    });

    socket.on('join_room', (roomId: unknown) => {
        const extractedRoomId = extractRoomId(roomId);
        if (!extractedRoomId) {
            socket.emit('room_error', 'Room is full or does not exist.');
            return;
        }
        const room = rooms[extractedRoomId];
        if (room && room.status === 'waiting' && !room.p2) {
            room.p2 = socket.id;
            room.p2Token = createResumeToken();
            room.status = 'playing';

            socket.join(extractedRoomId);
            socket.emit('room_joined', { roomId: extractedRoomId, isHost: false, roomName: room.name, resumeToken: room.p2Token });
            
            // Notify P1 (host)
            io.to(room.p1).emit('opponent_joined', { opponentId: socket.id });
             // Notify P2
            socket.emit('opponent_joined', { opponentId: room.p1 });

            io.emit('room_list', getRoomList()); // Update list (room full)
        } else {
            socket.emit('room_error', 'Room is full or does not exist.');
        }
    });

    socket.on('player_ready', (data: unknown) => {
        if (!isPlayerReadyPayload(data)) return;
        const room = rooms[data.roomId];
        if (room) {
            if (socket.id === room.p1) room.p1Ready = true;
            if (socket.id === room.p2) room.p2Ready = true;

            if (room.p1Ready && room.p2Ready) {
                 // Start Game
                startAuthoritativeRoom(data.roomId);
                if (room.p1) {
                    io.to(room.p1).emit('game_start', {
                        roomId: data.roomId,
                        authSeed: room.authSeeds ? room.authSeeds.p1 : (room.authMatch && room.authMatch.seeds ? room.authMatch.seeds.p1 : null),
                    });
                }
                if (room.p2) {
                    io.to(room.p2).emit('game_start', {
                        roomId: data.roomId,
                        authSeed: room.authSeeds ? room.authSeeds.p2 : (room.authMatch && room.authMatch.seeds ? room.authMatch.seeds.p2 : null),
                    });
                }
                console.log(`Game started in room ${data.roomId}`);
            }
        }
    });

    socket.on('auth_input', (data: unknown) => {
        if (!isAuthInputPayload(data)) return;
        const room = rooms[data.roomId];
        if (!room || !room.authMatch) return;
        const seat = getPlayerSeat(room, socket.id);
        if (!seat) return;
        room.authMatch.enqueue(seat, data.direction, data.state, data.seq);
    });

    socket.on('resume_auth', (data: unknown) => {
        if (!isResumeAuthPayload(data)) return;
        const found = findRoomByResumeToken(data.resumeToken);
        if (!found) {
            socket.emit('room_error', 'Resume token expired or invalid.');
            return;
        }
        const { roomId, room, seat } = found;
        if (!room) return;

        if (seat === 'p1') room.p1 = socket.id;
        if (seat === 'p2') room.p2 = socket.id;

        socket.join(roomId);
        socket.emit('room_resumed', {
            roomId,
            isHost: seat === 'p1',
            roomName: room.name,
            resumeToken: data.resumeToken,
            authSeed: room.authSeeds ? room.authSeeds[seat] : (room.authMatch && room.authMatch.seeds ? room.authMatch.seeds[seat] : null),
        });

        if (room.authMatch) {
            const snapshot = buildAuthSnapshot(room, seat);
            socket.emit('auth_snapshot', snapshot);
        }
    });

    socket.on('update_state', (data: unknown) => {
        if (!isUpdateStatePayload(data)) return;
        socket.to(data.roomId).emit('opponent_state_update', data);
    });

    socket.on('send_garbage', (data: unknown) => {
        if (!isSendGarbagePayload(data)) return;
        socket.to(data.roomId).emit('receive_garbage', data);
    });

    socket.on('game_over', (data: unknown) => {
        const roomId = extractRoomId(data);
        if (!roomId) return;
        socket.to(roomId).emit('opponent_game_over');
    });

    socket.on('request_restart', (data: unknown) => {
        if (!isRequestRestartPayload(data)) return;
        const room = rooms[data.roomId];
        if (room) {
            // Reset ready states
            room.p1Ready = false;
            room.p2Ready = false;
            room.authMatch = null;
            room.authSeeds = null;
            stopRoomAuthLoop(room);
            // Notify both players to reset and get ready
            io.to(data.roomId).emit('restart_signal');
        }
    });

    socket.on('join_or_create', (data: unknown) => {
        const roomName = normalizeRoomName(data, 'Room');

        // Find existing room by name (check both waiting and playing)
        let existingWaitingRoomId = null;
        let existingPlayingRoomId = null;
        for (const roomId in rooms) {
            if (rooms[roomId].name === roomName) {
                if (rooms[roomId].status === 'waiting') {
                    existingWaitingRoomId = roomId;
                    break;
                } else if (rooms[roomId].status === 'playing') {
                    existingPlayingRoomId = roomId;
                }
            }
        }

        if (existingWaitingRoomId) {
            // Join existing room as p2
            const room = rooms[existingWaitingRoomId];
            room.p2 = socket.id;
            room.p2Token = createResumeToken();
            room.status = 'playing';

            socket.join(existingWaitingRoomId);
            socket.emit('room_joined', { roomId: existingWaitingRoomId, isHost: false, roomName: room.name, resumeToken: room.p2Token });

            io.to(room.p1).emit('opponent_joined', { opponentId: socket.id });
            socket.emit('opponent_joined', { opponentId: room.p1 });

            io.emit('room_list', getRoomList());
        } else if (existingPlayingRoomId) {
            socket.emit('room_error', 'Game is already in progress in this room.');
        } else {
            // Create new room
            const roomId = nodeCrypto.randomUUID();
            const p1Token = createResumeToken();
            rooms[roomId] = {
                id: roomId,
                name: roomName,
                p1: socket.id,
                p2: null,
                status: 'waiting',
                p1Token,
                p2Token: null,
                authMatch: null,
                authInterval: null,
                authSeeds: null,
            };

            socket.join(roomId);
            socket.emit('room_joined', { roomId, isHost: true, roomName, resumeToken: p1Token });
            io.emit('room_list', getRoomList());
            console.log(`Room created via join_or_create: ${roomName} (${roomId})`);
        }
    });

    // ===== N-Multi Events =====

    socket.on('nmulti_get_rooms', () => {
        socket.emit('nmulti_room_list', getNMultiRoomList());
    });

    socket.on('nmulti_create_room', (data: unknown) => {
        const roomName = normalizeRoomName(data, 'Room');
        const roomId = nodeCrypto.randomUUID();
        const playerName = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];

        const room = createNMultiRoom(roomId, roomName, socket.id, playerName);

        socket.join(roomId);

        socket.emit('nmulti_room_joined', {
            roomId,
            playerId: socket.id,
            playerName,
            roomName: room.name,
            players: getPlayersMap(room, socket.id)
        });

        io.emit('nmulti_room_list', getNMultiRoomList());
        console.log(`N-Multi room created: ${roomName} (${roomId})`);
    });

    socket.on('nmulti_join_room', (data: unknown) => {
        const roomId = extractRoomId(data);
        if (!roomId) {
            socket.emit('nmulti_room_error', 'Room does not exist.');
            return;
        }
        const room = nMultiRooms[roomId];
        if (!room) {
            socket.emit('nmulti_room_error', 'Room does not exist.');
            return;
        }
        const playerCount = Object.keys(room.players).length;
        if (playerCount >= 100) {
            socket.emit('nmulti_room_error', 'Room is full (100 players max).');
            return;
        }
        if (room.players[socket.id]) {
            socket.emit('nmulti_room_error', 'Already in this room.');
            return;
        }

        room.playerCounter++;
        const playerName = generateRandomName(room);

        room.players[socket.id] = {
            name: playerName,
            score: 0,
            level: 1,
            lines: 0,
            board: null,
            isAlive: true,
            v: 0
        };
        markNMultiPlayerDirty(room, socket.id);

        socket.join(roomId);

        socket.emit('nmulti_room_joined', {
            roomId,
            playerId: socket.id,
            playerName,
            roomName: room.name,
            players: getPlayersMap(room, socket.id)
        });

        // Notify others
        socket.to(roomId).emit('nmulti_player_joined', {
            playerId: socket.id,
            playerName
        });

        io.emit('nmulti_room_list', getNMultiRoomList());
    });

    socket.on('nmulti_leave_room', (data: unknown) => {
        const roomId = extractRoomId(data);
        if (!roomId) return;
        removeFromNMultiRoom(socket, roomId);
    });

    socket.on('nmulti_update_state', (data: unknown) => {
        if (!isNMultiUpdateStatePayload(data)) return;
        const room = nMultiRooms[data.roomId];
        if (!room || !room.players[socket.id]) return;

        const player = room.players[socket.id];
        let changed = false;
        if (data.score !== undefined && player.score !== data.score) { player.score = data.score; changed = true; }
        if (data.level !== undefined && player.level !== data.level) { player.level = data.level; changed = true; }
        if (data.lines !== undefined && player.lines !== data.lines) { player.lines = data.lines; changed = true; }
        if (data.board !== undefined && player.board !== data.board) { player.board = data.board; changed = true; }
        
        if (changed) {
            player.v++;
            markNMultiPlayerDirty(room, socket.id);
        }
    });

    socket.on('nmulti_send_garbage', (data: unknown) => {
        if (!isNMultiSendGarbagePayload(data)) return;
        const room = nMultiRooms[data.roomId];
        if (!room || !room.players[socket.id]) return;
        const sender = room.players[socket.id];
        const target = room.players[data.targetId];
        if (!target) return;
        if (data.targetId === socket.id) return;
        if (sender.isAlive === false || target.isAlive === false) return;
        io.to(data.targetId).emit('nmulti_receive_garbage', {
            count: data.count,
            fromId: socket.id
        });
    });

    socket.on('nmulti_game_over', (data: unknown) => {
        if (!isNMultiRoomPayload(data)) return;
        const room = nMultiRooms[data.roomId];
        if (!room || !room.players[socket.id]) return;
        room.players[socket.id].isAlive = false;
        room.players[socket.id].v++;
        markNMultiPlayerDirty(room, socket.id);
    });

    socket.on('nmulti_join_or_create', (data: unknown) => {
        const roomName = normalizeRoomName(data, 'Room');

        // Find existing room by name
        let existingRoomId = null;
        for (const roomId in nMultiRooms) {
            if (nMultiRooms[roomId].name === roomName) {
                existingRoomId = roomId;
                break;
            }
        }

        if (existingRoomId) {
            // Join existing room
            const room = nMultiRooms[existingRoomId];
            const playerCount = Object.keys(room.players).length;
            if (playerCount >= 100) {
                socket.emit('nmulti_room_error', 'Room is full (100 players max).');
                return;
            }
            if (room.players[socket.id]) {
                socket.emit('nmulti_room_error', 'Already in this room.');
                return;
            }

            room.playerCounter++;
            const playerName = generateRandomName(room);

            room.players[socket.id] = {
                name: playerName,
                score: 0,
                level: 1,
                lines: 0,
                board: null,
                isAlive: true,
                v: 0
            };
            markNMultiPlayerDirty(room, socket.id);

            socket.join(existingRoomId);

            socket.emit('nmulti_room_joined', {
                roomId: existingRoomId,
                playerId: socket.id,
                playerName,
                roomName: room.name,
                players: getPlayersMap(room, socket.id)
            });

            socket.to(existingRoomId).emit('nmulti_player_joined', {
                playerId: socket.id,
                playerName
            });

            io.emit('nmulti_room_list', getNMultiRoomList());
        } else {
            // Create new room
            const roomId = nodeCrypto.randomUUID();
            const playerName = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];

            const room = createNMultiRoom(roomId, roomName, socket.id, playerName);

            socket.join(roomId);

            socket.emit('nmulti_room_joined', {
                roomId,
                playerId: socket.id,
                playerName,
                roomName,
                players: getPlayersMap(room, socket.id)
            });

            io.emit('nmulti_room_list', getNMultiRoomList());
            console.log(`N-Multi room created via join_or_create: ${roomName} (${roomId})`);
        }
    });

    socket.on('nmulti_request_full_sync', (data: unknown) => {
        if (!isNMultiRoomPayload(data)) return;
        const room = nMultiRooms[data.roomId];
        if (!room || !room.players[socket.id]) return;

        socket.emit('nmulti_snapshot', {
            players: getPlayersMap(room, socket.id),
            isDelta: false
        });
    });

    socket.on('nmulti_restart', (data: unknown) => {
        if (!isNMultiRoomPayload(data)) return;
        const room = nMultiRooms[data.roomId];
        if (!room || !room.players[socket.id]) return;
        const player = room.players[socket.id];
        player.score = 0;
        player.level = 1;
        player.lines = 0;
        player.board = null;
        player.isAlive = true;
        player.v++;
        markNMultiPlayerDirty(room, socket.id);
    });

    // ===== Disconnect =====

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Clean up 1v1 rooms
        let roomChanged = false;
        for (const roomId in rooms) {
            const room = rooms[roomId];
            if (room.p1 !== socket.id && room.p2 !== socket.id) {
                continue;
            }

            if (room.status === 'playing' && room.authMatch) {
                roomChanged = true;
                if (room.p1 === socket.id) {
                    room.p1 = null;
                }
                if (room.p2 === socket.id) {
                    room.p2 = null;
                }
                continue;
            }

            roomChanged = true;

            // Host left: promote guest to host and keep room waiting.
            if (room.p1 === socket.id && room.p2) {
                const remainingPlayer = room.p2;
                room.p1 = remainingPlayer;
                room.p2 = null;
                room.status = 'waiting';
                room.p1Ready = true;
                room.p2Ready = false;
                io.to(remainingPlayer).emit('opponent_disconnected', {
                    message: 'Opponent left. Waiting for a new player...'
                });
                continue;
            }

            // Guest left: keep host in the room and return to waiting state.
            if (room.p2 === socket.id) {
                room.p2 = null;
                room.status = 'waiting';
                room.p1Ready = true;
                room.p2Ready = false;
                io.to(room.p1).emit('opponent_disconnected', {
                    message: 'Opponent left. Waiting for a new player...'
                });
                continue;
            }

            // Host left while waiting: remove empty room.
            if (room.p1 === socket.id) {
                stopRoomAuthLoop(room);
                delete rooms[roomId];
            }
        }
        if (roomChanged) {
            io.emit('room_list', getRoomList());
        }

        // Clean up N-Multi rooms
        for (const roomId in nMultiRooms) {
            const room = nMultiRooms[roomId];
            if (room.players[socket.id]) {
                removeFromNMultiRoom(socket, roomId);
            }
        }
    });
});

// ===== N-Multi Helper Functions =====

function getNMultiRoomList(): Array<{ id: string; name: string; playerCount: number }> {
    return Object.values(nMultiRooms).map((r) => ({
        id: r.id,
        name: r.name,
        playerCount: Object.keys(r.players).length
    }));
}

function getPlayersMap(room: NMultiRoomState, excludeId: string | null = null): Record<string, NMultiPlayer> {
    const map: Record<string, NMultiPlayer> = {};
    for (const [sid, player] of Object.entries(room.players)) {
        if (excludeId && sid === excludeId) continue;
        map[sid] = {
            name: player.name,
            score: player.score,
            level: player.level,
            lines: player.lines,
            board: player.board,
            isAlive: player.isAlive,
            v: player.v
        };
    }
    return map;
}

function broadcastNMultiSnapshot(roomId: string): void {
    const room = nMultiRooms[roomId];
    if (!room) return;

    const dirtyPlayers = room.dirtyPlayers ? Array.from(room.dirtyPlayers) : [];
    if (dirtyPlayers.length === 0) return;

    const deltaSnapshot: Record<string, NMultiPlayer> = {};

    for (const sid of dirtyPlayers as string[]) {
        const p = room.players[sid];
        if (!p) continue;
        
        if (room.lastBroadcasted[sid] !== p.v) {
            deltaSnapshot[sid] = {
                name: p.name,
                score: p.score,
                level: p.level,
                lines: p.lines,
                board: p.board,
                isAlive: p.isAlive,
                v: p.v
            };
            room.lastBroadcasted[sid] = p.v;
        }
    }

    room.dirtyPlayers.clear();

    if (Object.keys(deltaSnapshot).length > 0) {
        // Broadcast single packet to all
        io.to(roomId).emit('nmulti_snapshot', { 
            players: deltaSnapshot,
            isDelta: true 
        });
    }
}

function removeFromNMultiRoom(socket: Socket, roomId: string): void {
    const room = nMultiRooms[roomId];
    if (!room || !room.players[socket.id]) return;

    delete room.players[socket.id];
    if (room.lastBroadcasted) delete room.lastBroadcasted[socket.id];
    if (room.dirtyPlayers) room.dirtyPlayers.delete(socket.id);
    socket.leave(roomId);

    const remaining = Object.keys(room.players).length;
    if (remaining === 0) {
        // Room empty, clean up
        if (room._broadcastInterval) {
            clearInterval(room._broadcastInterval);
        }
        delete nMultiRooms[roomId];
    } else {
        // Notify remaining players
        socket.to(roomId).emit('nmulti_player_left', { playerId: socket.id });
    }

    io.emit('nmulti_room_list', getNMultiRoomList());
}

// ===== 1v1 Helper Functions =====

function getRoomList(): Array<{ id: string; name: string; players: number; status: string }> {
    return Object.values(rooms).map((r) => ({
        id: r.id,
        name: r.name,
        players: (r.p1 ? 1 : 0) + (r.p2 ? 1 : 0),
        status: r.status
    })).filter(r => r.status === 'waiting'); // Only show waiting rooms? Or all? Let's show waiting for now.
}

const PORT = process.env.PORT || 3031;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export {};

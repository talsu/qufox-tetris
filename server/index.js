const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const crypto = require('crypto');
const { RANDOM_NAMES } = require('./randomNames');

function generateRandomName(room) {
    const usedNames = new Set(Object.values(room.players).map(p => p.name));
    // Try random picks first (fast path)
    for (let i = 0; i < 20; i++) {
        const name = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
        if (!usedNames.has(name)) return name;
    }
    // Fallback: filter available names
    const available = RANDOM_NAMES.filter(n => !usedNames.has(n));
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

app.use(express.static(path.join(__dirname, '../build')));

app.get('*path', (req, res) => {
    res.sendFile(path.join(__dirname, '../build/index.html'));
});

// rooms = { roomId: { id, name, p1: socketId, p2: socketId, status: 'waiting'|'playing' } }
let rooms = {};

// N-Multi rooms
let nMultiRooms = {};
// nMultiRooms[roomId] = {
//   id: string,
//   name: string,
//   playerCounter: number,
//   players: { [socketId]: { name, score, level, lines, board, isAlive, v } },
//   lastBroadcasted: { [socketId]: string },
//   dirtyPlayers: Set<string>,
//   _broadcastInterval: NodeJS.Timer
// }

function createNMultiRoom(roomId, roomName, hostSocketId, hostName) {
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

function markNMultiPlayerDirty(room, playerId) {
    if (!room || !playerId) return;
    if (!room.dirtyPlayers) {
        room.dirtyPlayers = new Set();
    }
    room.dirtyPlayers.add(playerId);
}

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Send initial room list
    socket.on('get_rooms', () => {
        socket.emit('room_list', getRoomList());
    });

    socket.on('create_room', (roomName) => {
        const roomId = crypto.randomUUID();
        rooms[roomId] = {
            id: roomId,
            name: roomName,
            p1: socket.id,
            p2: null,
            status: 'waiting'
        };
        
        socket.join(roomId);
        socket.emit('room_joined', { roomId, isHost: true, roomName });
        io.emit('room_list', getRoomList()); // Broadcast update
        console.log(`Room created: ${roomName} (${roomId})`);
    });

    socket.on('join_room', (roomId) => {
        const room = rooms[roomId];
        if (room && room.status === 'waiting' && !room.p2) {
            room.p2 = socket.id;
            room.status = 'playing';

            socket.join(roomId);
            socket.emit('room_joined', { roomId, isHost: false, roomName: room.name });
            
            // Notify P1 (host)
            io.to(room.p1).emit('opponent_joined', { opponentId: socket.id });
             // Notify P2
            socket.emit('opponent_joined', { opponentId: room.p1 });

            io.emit('room_list', getRoomList()); // Update list (room full)
        } else {
            socket.emit('room_error', 'Room is full or does not exist.');
        }
    });

    socket.on('player_ready', (data) => {
        const room = rooms[data.roomId];
        if (room) {
            if (socket.id === room.p1) room.p1Ready = true;
            if (socket.id === room.p2) room.p2Ready = true;

            if (room.p1Ready && room.p2Ready) {
                 // Start Game
                io.to(data.roomId).emit('game_start', { roomId: data.roomId });
                console.log(`Game started in room ${data.roomId}`);
            }
        }
    });

    socket.on('update_state', (data) => {
        socket.to(data.roomId).emit('opponent_state_update', data);
    });

    socket.on('send_garbage', (data) => {
        socket.to(data.roomId).emit('receive_garbage', data);
    });

    socket.on('game_over', (data) => {
        socket.to(data.roomId).emit('opponent_game_over');
    });

    socket.on('request_restart', (data) => {
        const room = rooms[data.roomId];
        if (room) {
            // Reset ready states
            room.p1Ready = false;
            room.p2Ready = false;
            // Notify both players to reset and get ready
            io.to(data.roomId).emit('restart_signal');
        }
    });

    socket.on('join_or_create', (data) => {
        const roomName = (data && data.roomName) || 'Room';

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
            room.status = 'playing';

            socket.join(existingWaitingRoomId);
            socket.emit('room_joined', { roomId: existingWaitingRoomId, isHost: false, roomName: room.name });

            io.to(room.p1).emit('opponent_joined', { opponentId: socket.id });
            socket.emit('opponent_joined', { opponentId: room.p1 });

            io.emit('room_list', getRoomList());
        } else if (existingPlayingRoomId) {
            socket.emit('room_error', 'Game is already in progress in this room.');
        } else {
            // Create new room
            const roomId = crypto.randomUUID();
            rooms[roomId] = {
                id: roomId,
                name: roomName,
                p1: socket.id,
                p2: null,
                status: 'waiting'
            };

            socket.join(roomId);
            socket.emit('room_joined', { roomId, isHost: true, roomName });
            io.emit('room_list', getRoomList());
            console.log(`Room created via join_or_create: ${roomName} (${roomId})`);
        }
    });

    // ===== N-Multi Events =====

    socket.on('nmulti_get_rooms', () => {
        socket.emit('nmulti_room_list', getNMultiRoomList());
    });

    socket.on('nmulti_create_room', (data) => {
        const roomName = (data && data.roomName) || 'Room';
        const roomId = crypto.randomUUID();
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

    socket.on('nmulti_join_room', (data) => {
        const roomId = data && data.roomId;
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

    socket.on('nmulti_leave_room', (data) => {
        const roomId = data && data.roomId;
        removeFromNMultiRoom(socket, roomId);
    });

    socket.on('nmulti_update_state', (data) => {
        if (!data || !data.roomId) return;
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

    socket.on('nmulti_send_garbage', (data) => {
        if (!data || !data.roomId || !data.targetId || !data.count) return;
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

    socket.on('nmulti_game_over', (data) => {
        if (!data || !data.roomId) return;
        const room = nMultiRooms[data.roomId];
        if (!room || !room.players[socket.id]) return;
        room.players[socket.id].isAlive = false;
        room.players[socket.id].v++;
        markNMultiPlayerDirty(room, socket.id);
    });

    socket.on('nmulti_join_or_create', (data) => {
        const roomName = (data && data.roomName) || 'Room';

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
            const roomId = crypto.randomUUID();
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

    socket.on('nmulti_request_full_sync', (data) => {
        if (!data || !data.roomId) return;
        const room = nMultiRooms[data.roomId];
        if (!room || !room.players[socket.id]) return;

        socket.emit('nmulti_snapshot', {
            players: getPlayersMap(room, socket.id),
            isDelta: false
        });
    });

    socket.on('nmulti_restart', (data) => {
        if (!data || !data.roomId) return;
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
                delete rooms[roomId];
            }
        }
        if (roomChanged) {
            io.emit('room_list', getRoomList());
        }

        // Clean up N-Multi rooms
        let nMultiChanged = false;
        for (const roomId in nMultiRooms) {
            const room = nMultiRooms[roomId];
            if (room.players[socket.id]) {
                removeFromNMultiRoom(socket, roomId);
                nMultiChanged = true;
            }
        }
    });
});

// ===== N-Multi Helper Functions =====

function getNMultiRoomList() {
    return Object.values(nMultiRooms).map(r => ({
        id: r.id,
        name: r.name,
        playerCount: Object.keys(r.players).length
    }));
}

function getPlayersMap(room, excludeId = null) {
    const map = {};
    for (const [sid, p] of Object.entries(room.players)) {
        if (excludeId && sid === excludeId) continue;
        map[sid] = {
            name: p.name,
            score: p.score,
            level: p.level,
            lines: p.lines,
            board: p.board,
            isAlive: p.isAlive,
            v: p.v
        };
    }
    return map;
}

function broadcastNMultiSnapshot(roomId) {
    const room = nMultiRooms[roomId];
    if (!room) return;

    const dirtyPlayers = room.dirtyPlayers ? Array.from(room.dirtyPlayers) : [];
    if (dirtyPlayers.length === 0) return;

    const deltaSnapshot = {};

    for (const sid of dirtyPlayers) {
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

function removeFromNMultiRoom(socket, roomId) {
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

function getRoomList() {
    return Object.values(rooms).map(r => ({
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

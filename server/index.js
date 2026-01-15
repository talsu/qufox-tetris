const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(express.static(path.join(__dirname, '../dist')));

// rooms = { roomId: { id, name, p1: socketId, p2: socketId, status: 'waiting'|'playing' } }
let rooms = {};

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Send initial room list
    socket.on('get_rooms', () => {
        socket.emit('room_list', getRoomList());
    });

    socket.on('create_room', (roomName) => {
        const roomId = uuidv4();
        rooms[roomId] = {
            id: roomId,
            name: roomName,
            p1: socket.id,
            p2: null,
            status: 'waiting'
        };
        
        socket.join(roomId);
        socket.emit('room_joined', { roomId, isHost: true });
        io.emit('room_list', getRoomList()); // Broadcast update
        console.log(`Room created: ${roomName} (${roomId})`);
    });

    socket.on('join_room', (roomId) => {
        const room = rooms[roomId];
        if (room && room.status === 'waiting' && !room.p2) {
            room.p2 = socket.id;
            room.status = 'playing';
            
            socket.join(roomId);
            socket.emit('room_joined', { roomId, isHost: false });
            
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

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Clean up rooms where this user was a player
        let roomChanged = false;
        for (const roomId in rooms) {
            const room = rooms[roomId];
            if (room.p1 === socket.id || room.p2 === socket.id) {
                // For simplicity, if a player leaves, close the room
                io.to(roomId).emit('opponent_disconnected');
                delete rooms[roomId];
                roomChanged = true;
            }
        }
        if (roomChanged) {
            io.emit('room_list', getRoomList());
        }
    });
});

function getRoomList() {
    return Object.values(rooms).map(r => ({
        id: r.id,
        name: r.name,
        players: (r.p1 ? 1 : 0) + (r.p2 ? 1 : 0),
        status: r.status
    })).filter(r => r.status === 'waiting'); // Only show waiting rooms? Or all? Let's show waiting for now.
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
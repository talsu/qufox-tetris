const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for simplicity in development
        methods: ["GET", "POST"]
    }
});

app.use(express.static(path.join(__dirname, '../dist')));

let waitingPlayer = null;
let rooms = {};

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join_game', () => {
        if (waitingPlayer && waitingPlayer.id !== socket.id) {
            // Match found!
            const roomId = waitingPlayer.id + '#' + socket.id;
            const opponent = waitingPlayer;
            waitingPlayer = null;

            socket.join(roomId);
            opponent.join(roomId);

            rooms[roomId] = {
                p1: opponent.id,
                p2: socket.id
            };

            // Notify players
            io.to(roomId).emit('game_start', { roomId });
            
            // Assign roles/seeds if necessary (e.g. same random seed)
            const seed = Math.random();
            opponent.emit('match_found', { opponentId: socket.id, role: 'p1', seed });
            socket.emit('match_found', { opponentId: opponent.id, role: 'p2', seed });

            console.log(`Game started in room ${roomId}`);
        } else {
            // Wait for opponent
            waitingPlayer = socket;
            socket.emit('waiting_for_opponent');
            console.log(`User ${socket.id} waiting for opponent`);
        }
    });

    socket.on('update_state', (data) => {
        // Relay board/piece state to opponent
        // data should contain { roomId, board: [...], ... }
        socket.to(data.roomId).emit('opponent_state_update', data);
    });

    socket.on('send_garbage', (data) => {
        // Relay garbage attack
        // data: { roomId, count }
        socket.to(data.roomId).emit('receive_garbage', data);
    });

    socket.on('game_over', (data) => {
        socket.to(data.roomId).emit('opponent_game_over');
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        if (waitingPlayer === socket) {
            waitingPlayer = null;
        }
        // Handle active game disconnection logic here if needed
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

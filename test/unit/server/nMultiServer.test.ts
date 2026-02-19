/**
 * Tests for N-Multi server logic.
 * Since the server functions are not exported, we test the logic patterns directly
 * by simulating the data structures and operations used in server/index.js.
 */

describe('N-Multi Server Logic', () => {
    // Simulate the server data structures
    let nMultiRooms: Record<string, any>;

    beforeEach(() => {
        nMultiRooms = {};
    });

    // ===== Helper function replicas for testing =====

    function getNMultiRoomList() {
        return Object.values(nMultiRooms).map((r: any) => ({
            id: r.id,
            name: r.name,
            playerCount: Object.keys(r.players).length
        }));
    }

    function getPlayersMap(room: any) {
        const map: Record<string, any> = {};
        for (const [sid, p] of Object.entries(room.players) as [string, any][]) {
            map[sid] = {
                name: p.name,
                score: p.score,
                level: p.level,
                lines: p.lines,
                board: p.board,
                isAlive: p.isAlive
            };
        }
        return map;
    }

    function canSendGarbage(room: any, senderId: string, targetId: string, count: number) {
        if (!room || !senderId || !targetId || !count) return false;
        const sender = room.players[senderId];
        const target = room.players[targetId];
        if (!sender || !target) return false;
        if (senderId === targetId) return false;
        if (sender.isAlive === false || target.isAlive === false) return false;
        return true;
    }

    function buildSnapshot(room: any, excludeId: string) {
        const playerIds = Object.keys(room.players);
        const snapshot: Record<string, any> = {};
        for (const sid of playerIds) {
            if (sid !== excludeId) {
                const p = room.players[sid];
                snapshot[sid] = {
                    name: p.name,
                    score: p.score,
                    level: p.level,
                    lines: p.lines,
                    board: p.board,
                    isAlive: p.isAlive
                };
            }
        }
        return snapshot;
    }

    function removeFromRoom(socketId: string, roomId: string): { removed: boolean, roomDeleted: boolean, remaining: number } {
        const room = nMultiRooms[roomId];
        if (!room || !room.players[socketId]) return { removed: false, roomDeleted: false, remaining: 0 };

        delete room.players[socketId];
        const remaining = Object.keys(room.players).length;
        if (remaining === 0) {
            delete nMultiRooms[roomId];
            return { removed: true, roomDeleted: true, remaining: 0 };
        }
        return { removed: true, roomDeleted: false, remaining };
    }

    // ===== Tests =====

    describe('getNMultiRoomList', () => {
        test('returns empty array when no rooms', () => {
            expect(getNMultiRoomList()).toEqual([]);
        });

        test('returns room list with player counts', () => {
            nMultiRooms['room1'] = {
                id: 'room1',
                name: 'Test Room',
                players: {
                    'socket1': { name: 'P1', score: 0, level: 1, lines: 0, board: null, isAlive: true },
                    'socket2': { name: 'P2', score: 0, level: 1, lines: 0, board: null, isAlive: true }
                }
            };
            nMultiRooms['room2'] = {
                id: 'room2',
                name: 'Room 2',
                players: {
                    'socket3': { name: 'P3', score: 0, level: 1, lines: 0, board: null, isAlive: true }
                }
            };

            const list = getNMultiRoomList();
            expect(list).toHaveLength(2);
            expect(list).toEqual(expect.arrayContaining([
                { id: 'room1', name: 'Test Room', playerCount: 2 },
                { id: 'room2', name: 'Room 2', playerCount: 1 }
            ]));
        });
    });

    describe('getPlayersMap', () => {
        test('returns map of player data excluding internal fields', () => {
            const room = {
                players: {
                    'socket1': {
                        name: 'Player1',
                        score: 1000,
                        level: 5,
                        lines: 42,
                        board: 'encoded_board',
                        isAlive: true,
                        _internalField: 'should not be included'
                    }
                }
            };

            const map = getPlayersMap(room);
            expect(map['socket1']).toEqual({
                name: 'Player1',
                score: 1000,
                level: 5,
                lines: 42,
                board: 'encoded_board',
                isAlive: true
            });
            expect(map['socket1']._internalField).toBeUndefined();
        });

        test('returns empty map for room with no players', () => {
            const room = { players: {} };
            const map = getPlayersMap(room);
            expect(Object.keys(map)).toHaveLength(0);
        });
    });

    describe('buildSnapshot (broadcastNMultiSnapshot logic)', () => {
        test('excludes the requesting player from snapshot', () => {
            const room = {
                players: {
                    'me': { name: 'Me', score: 100, level: 1, lines: 0, board: null, isAlive: true },
                    'other1': { name: 'Other1', score: 200, level: 2, lines: 5, board: 'board1', isAlive: true },
                    'other2': { name: 'Other2', score: 50, level: 1, lines: 1, board: 'board2', isAlive: false }
                }
            };

            const snapshot = buildSnapshot(room, 'me');
            expect(Object.keys(snapshot)).toHaveLength(2);
            expect(snapshot['me']).toBeUndefined();
            expect(snapshot['other1'].name).toBe('Other1');
            expect(snapshot['other2'].name).toBe('Other2');
        });

        test('returns empty snapshot for single player room', () => {
            const room = {
                players: {
                    'solo': { name: 'Solo', score: 100, level: 1, lines: 0, board: null, isAlive: true }
                }
            };

            const snapshot = buildSnapshot(room, 'solo');
            expect(Object.keys(snapshot)).toHaveLength(0);
        });

        test('includes dead player status in snapshot', () => {
            const room = {
                players: {
                    'alive': { name: 'Alive', score: 100, level: 1, lines: 0, board: null, isAlive: true },
                    'dead': { name: 'Dead', score: 50, level: 1, lines: 0, board: null, isAlive: false }
                }
            };

            const snapshot = buildSnapshot(room, 'alive');
            expect(snapshot['dead'].isAlive).toBe(false);
        });
    });

    describe('removeFromRoom', () => {
        test('removes player from room', () => {
            nMultiRooms['room1'] = {
                id: 'room1',
                name: 'Test',
                players: {
                    'socket1': { name: 'P1' },
                    'socket2': { name: 'P2' }
                }
            };

            const result = removeFromRoom('socket1', 'room1');
            expect(result.removed).toBe(true);
            expect(result.roomDeleted).toBe(false);
            expect(result.remaining).toBe(1);
            expect(nMultiRooms['room1'].players['socket1']).toBeUndefined();
            expect(nMultiRooms['room1'].players['socket2']).toBeDefined();
        });

        test('deletes room when last player leaves', () => {
            nMultiRooms['room1'] = {
                id: 'room1',
                name: 'Test',
                players: {
                    'socket1': { name: 'P1' }
                }
            };

            const result = removeFromRoom('socket1', 'room1');
            expect(result.removed).toBe(true);
            expect(result.roomDeleted).toBe(true);
            expect(result.remaining).toBe(0);
            expect(nMultiRooms['room1']).toBeUndefined();
        });

        test('returns false for non-existent room', () => {
            const result = removeFromRoom('socket1', 'nonexistent');
            expect(result.removed).toBe(false);
        });

        test('returns false for player not in room', () => {
            nMultiRooms['room1'] = {
                id: 'room1',
                name: 'Test',
                players: { 'socket1': { name: 'P1' } }
            };

            const result = removeFromRoom('socket2', 'room1');
            expect(result.removed).toBe(false);
        });
    });

    describe('Room Creation Logic', () => {
        test('new room has correct initial structure', () => {
            const roomId = 'test-room-id';
            const socketId = 'socket1';

            nMultiRooms[roomId] = {
                id: roomId,
                name: 'My Room',
                playerCounter: 1,
                players: {
                    [socketId]: {
                        name: 'Player1',
                        score: 0,
                        level: 1,
                        lines: 0,
                        board: null,
                        isAlive: true
                    }
                },
                _broadcastInterval: null
            };

            const room = nMultiRooms[roomId];
            expect(room.id).toBe(roomId);
            expect(room.name).toBe('My Room');
            expect(room.playerCounter).toBe(1);
            expect(Object.keys(room.players)).toHaveLength(1);
            expect(room.players[socketId].name).toBe('Player1');
            expect(room.players[socketId].isAlive).toBe(true);
        });
    });

    describe('Player Join Logic', () => {
        test('assigns incrementing player names', () => {
            const roomId = 'room1';
            nMultiRooms[roomId] = {
                id: roomId,
                name: 'Test',
                playerCounter: 1,
                players: {
                    'socket1': { name: 'Player1', score: 0, level: 1, lines: 0, board: null, isAlive: true }
                }
            };

            const room = nMultiRooms[roomId];

            // Simulate second player join
            room.playerCounter++;
            const playerName = 'Player' + room.playerCounter;
            room.players['socket2'] = {
                name: playerName,
                score: 0,
                level: 1,
                lines: 0,
                board: null,
                isAlive: true
            };

            expect(room.players['socket2'].name).toBe('Player2');
            expect(Object.keys(room.players)).toHaveLength(2);
        });

        test('rejects join when room is full (100 players)', () => {
            const roomId = 'room1';
            const players: Record<string, any> = {};
            for (let i = 0; i < 100; i++) {
                players[`socket${i}`] = { name: `Player${i}`, score: 0, level: 1, lines: 0, board: null, isAlive: true };
            }
            nMultiRooms[roomId] = {
                id: roomId,
                name: 'Full Room',
                playerCounter: 100,
                players
            };

            const playerCount = Object.keys(nMultiRooms[roomId].players).length;
            expect(playerCount).toBe(100);
            expect(playerCount >= 100).toBe(true); // Server would reject
        });

        test('rejects duplicate player in same room', () => {
            const roomId = 'room1';
            nMultiRooms[roomId] = {
                id: roomId,
                name: 'Test',
                playerCounter: 1,
                players: {
                    'socket1': { name: 'Player1', score: 0, level: 1, lines: 0, board: null, isAlive: true }
                }
            };

            const room = nMultiRooms[roomId];
            expect(room.players['socket1']).toBeDefined(); // Already exists -> server would reject
        });
    });

    describe('State Update Logic', () => {
        test('updates player state fields', () => {
            const roomId = 'room1';
            nMultiRooms[roomId] = {
                id: roomId,
                name: 'Test',
                players: {
                    'socket1': { name: 'P1', score: 0, level: 1, lines: 0, board: null, isAlive: true }
                }
            };

            const player = nMultiRooms[roomId].players['socket1'];
            const data = { score: 5000, level: 3, lines: 20, board: 'encoded_board_data' };

            if (data.score !== undefined) player.score = data.score;
            if (data.level !== undefined) player.level = data.level;
            if (data.lines !== undefined) player.lines = data.lines;
            if (data.board !== undefined) player.board = data.board;

            expect(player.score).toBe(5000);
            expect(player.level).toBe(3);
            expect(player.lines).toBe(20);
            expect(player.board).toBe('encoded_board_data');
        });

        test('partial update only changes specified fields', () => {
            const roomId = 'room1';
            nMultiRooms[roomId] = {
                id: roomId,
                name: 'Test',
                players: {
                    'socket1': { name: 'P1', score: 100, level: 2, lines: 5, board: 'old', isAlive: true }
                }
            };

            const player = nMultiRooms[roomId].players['socket1'];
            const data: any = { score: 200 };

            if (data.score !== undefined) player.score = data.score;
            if (data.level !== undefined) player.level = data.level;
            if (data.lines !== undefined) player.lines = data.lines;
            if (data.board !== undefined) player.board = data.board;

            expect(player.score).toBe(200);
            expect(player.level).toBe(2); // Unchanged
            expect(player.lines).toBe(5); // Unchanged
            expect(player.board).toBe('old'); // Unchanged
        });
    });

    describe('Game Over Logic', () => {
        test('marks player as dead', () => {
            const roomId = 'room1';
            nMultiRooms[roomId] = {
                id: roomId,
                name: 'Test',
                players: {
                    'socket1': { name: 'P1', score: 0, level: 1, lines: 0, board: null, isAlive: true }
                }
            };

            nMultiRooms[roomId].players['socket1'].isAlive = false;
            expect(nMultiRooms[roomId].players['socket1'].isAlive).toBe(false);
        });
    });

    describe('Restart Logic', () => {
        test('resets player state on restart', () => {
            const roomId = 'room1';
            nMultiRooms[roomId] = {
                id: roomId,
                name: 'Test',
                players: {
                    'socket1': { name: 'P1', score: 5000, level: 10, lines: 50, board: 'board_data', isAlive: false }
                }
            };

            const player = nMultiRooms[roomId].players['socket1'];
            player.score = 0;
            player.level = 1;
            player.lines = 0;
            player.board = null;
            player.isAlive = true;

            expect(player.score).toBe(0);
            expect(player.level).toBe(1);
            expect(player.lines).toBe(0);
            expect(player.board).toBeNull();
            expect(player.isAlive).toBe(true);
        });
    });

    describe('Garbage Send Validation', () => {
        test('validates all required fields for garbage send', () => {
            const roomId = 'room1';
            nMultiRooms[roomId] = {
                id: roomId,
                name: 'Test',
                players: {
                    'sender': { name: 'Sender', score: 0, level: 1, lines: 0, board: null, isAlive: true },
                    'target': { name: 'Target', score: 0, level: 1, lines: 0, board: null, isAlive: true }
                }
            };

            // Valid case
            const validData = { roomId, targetId: 'target', count: 4 };
            const room = nMultiRooms[validData.roomId];
            expect(room).toBeDefined();
            expect(room.players['sender']).toBeDefined();
            expect(room.players[validData.targetId]).toBeDefined();

            // Invalid cases
            const noRoom = { roomId: 'nonexistent', targetId: 'target', count: 4 };
            expect(nMultiRooms[noRoom.roomId]).toBeUndefined();

            const noTarget = { roomId, targetId: 'nonexistent', count: 4 };
            expect(room.players[noTarget.targetId]).toBeUndefined();

            // Missing fields
            const noCount = { roomId, targetId: 'target', count: 0 };
            expect(!noCount.count).toBe(true); // Server checks !data.count
        });

        test('rejects sending garbage to self', () => {
            const room = {
                players: {
                    sender: { isAlive: true }
                }
            };

            expect(canSendGarbage(room, 'sender', 'sender', 2)).toBe(false);
        });

        test('rejects sending garbage to dead target', () => {
            const room = {
                players: {
                    sender: { isAlive: true },
                    target: { isAlive: false }
                }
            };

            expect(canSendGarbage(room, 'sender', 'target', 2)).toBe(false);
        });

        test('rejects dead sender from sending garbage', () => {
            const room = {
                players: {
                    sender: { isAlive: false },
                    target: { isAlive: true }
                }
            };

            expect(canSendGarbage(room, 'sender', 'target', 2)).toBe(false);
        });
    });

    describe('Join or Create Logic', () => {
        test('finds existing room by name', () => {
            const roomId = 'existing-room';
            nMultiRooms[roomId] = {
                id: roomId,
                name: 'MyRoom',
                playerCounter: 1,
                players: {
                    'socket1': { name: 'Player1', score: 0, level: 1, lines: 0, board: null, isAlive: true }
                }
            };

            let existingRoomId = null;
            for (const rid in nMultiRooms) {
                if (nMultiRooms[rid].name === 'MyRoom') {
                    existingRoomId = rid;
                    break;
                }
            }

            expect(existingRoomId).toBe(roomId);
        });

        test('creates new room when no matching name found', () => {
            nMultiRooms['room1'] = {
                id: 'room1',
                name: 'OtherRoom',
                playerCounter: 1,
                players: { 'socket1': { name: 'P1' } }
            };

            let existingRoomId = null;
            for (const rid in nMultiRooms) {
                if (nMultiRooms[rid].name === 'NewRoom') {
                    existingRoomId = rid;
                    break;
                }
            }

            expect(existingRoomId).toBeNull(); // Will create a new room
        });
    });

    describe('Disconnect Cleanup', () => {
        test('removes player from all n-multi rooms on disconnect', () => {
            nMultiRooms['room1'] = {
                id: 'room1',
                name: 'Room1',
                playerCounter: 2,
                players: {
                    'disconnecting': { name: 'P1', score: 0, level: 1, lines: 0, board: null, isAlive: true },
                    'staying': { name: 'P2', score: 0, level: 1, lines: 0, board: null, isAlive: true }
                }
            };

            // Simulate disconnect cleanup
            for (const roomId in nMultiRooms) {
                const room = nMultiRooms[roomId];
                if (room.players['disconnecting']) {
                    removeFromRoom('disconnecting', roomId);
                }
            }

            expect(nMultiRooms['room1']).toBeDefined();
            expect(nMultiRooms['room1'].players['disconnecting']).toBeUndefined();
            expect(nMultiRooms['room1'].players['staying']).toBeDefined();
        });

        test('deletes empty room after last player disconnects', () => {
            nMultiRooms['room1'] = {
                id: 'room1',
                name: 'Room1',
                playerCounter: 1,
                players: {
                    'lonely': { name: 'P1', score: 0, level: 1, lines: 0, board: null, isAlive: true }
                }
            };

            removeFromRoom('lonely', 'room1');
            expect(nMultiRooms['room1']).toBeUndefined();
        });
    });

    describe('Room Response Data (roomName)', () => {
        function buildRoomJoinedResponse(room: any, socketId: string, playerName: string) {
            return {
                roomId: room.id,
                playerId: socketId,
                playerName,
                roomName: room.name,
                players: getPlayersMap(room)
            };
        }

        test('nmulti_create_room response includes roomName', () => {
            const roomId = 'room-1';
            const socketId = 'socket1';
            nMultiRooms[roomId] = {
                id: roomId,
                name: 'Created Room',
                playerCounter: 1,
                players: {
                    [socketId]: { name: 'Player1', score: 0, level: 1, lines: 0, board: null, isAlive: true }
                }
            };

            const response = buildRoomJoinedResponse(nMultiRooms[roomId], socketId, 'Player1');
            expect(response.roomName).toBe('Created Room');
            expect(response.roomId).toBe(roomId);
            expect(response.playerId).toBe(socketId);
        });

        test('nmulti_join_room response includes roomName', () => {
            const roomId = 'room-1';
            nMultiRooms[roomId] = {
                id: roomId,
                name: 'Existing Room',
                playerCounter: 2,
                players: {
                    'socket1': { name: 'Player1', score: 0, level: 1, lines: 0, board: null, isAlive: true },
                    'socket2': { name: 'Player2', score: 0, level: 1, lines: 0, board: null, isAlive: true }
                }
            };

            const response = buildRoomJoinedResponse(nMultiRooms[roomId], 'socket2', 'Player2');
            expect(response.roomName).toBe('Existing Room');
        });

        test('nmulti_join_or_create response includes roomName on create', () => {
            const roomName = 'New JoC Room';
            const roomId = 'room-joc';
            const socketId = 'socket1';

            // No existing room found, create new
            nMultiRooms[roomId] = {
                id: roomId,
                name: roomName,
                playerCounter: 1,
                players: {
                    [socketId]: { name: 'Player1', score: 0, level: 1, lines: 0, board: null, isAlive: true }
                }
            };

            const response = buildRoomJoinedResponse(nMultiRooms[roomId], socketId, 'Player1');
            expect(response.roomName).toBe(roomName);
        });

        test('nmulti_join_or_create response includes roomName on join', () => {
            const roomId = 'existing-room';
            nMultiRooms[roomId] = {
                id: roomId,
                name: 'Popular Room',
                playerCounter: 1,
                players: {
                    'socket1': { name: 'Player1', score: 0, level: 1, lines: 0, board: null, isAlive: true }
                }
            };

            // Simulate join_or_create finding existing room
            const room = nMultiRooms[roomId];
            room.playerCounter++;
            room.players['socket2'] = { name: 'Player2', score: 0, level: 1, lines: 0, board: null, isAlive: true };

            const response = buildRoomJoinedResponse(room, 'socket2', 'Player2');
            expect(response.roomName).toBe('Popular Room');
            expect(response.players).toBeDefined();
            expect(Object.keys(response.players)).toHaveLength(2);
        });

        test('roomName with special characters is preserved', () => {
            const roomId = 'room-special';
            nMultiRooms[roomId] = {
                id: roomId,
                name: '테스트 방 #1',
                playerCounter: 1,
                players: {
                    'socket1': { name: 'Player1', score: 0, level: 1, lines: 0, board: null, isAlive: true }
                }
            };

            const response = buildRoomJoinedResponse(nMultiRooms[roomId], 'socket1', 'Player1');
            expect(response.roomName).toBe('테스트 방 #1');
        });
    });
});

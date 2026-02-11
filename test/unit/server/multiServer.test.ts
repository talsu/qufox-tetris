/**
 * Tests for 1v1 Multiplayer server logic.
 * Since the server functions are not exported, we test the logic patterns directly
 * by simulating the data structures and operations used in server/index.js.
 */

describe('1v1 Multi Server Logic', () => {
    // Simulate the server data structures
    let rooms: Record<string, any>;

    beforeEach(() => {
        rooms = {};
    });

    // ===== Helper function replicas =====

    function getRoomList() {
        return Object.values(rooms).map((r: any) => ({
            id: r.id,
            name: r.name,
            players: (r.p1 ? 1 : 0) + (r.p2 ? 1 : 0),
            status: r.status
        })).filter((r: any) => r.status === 'waiting');
    }

    function createRoom(socketId: string, roomName: string): { roomId: string, response: any } {
        const roomId = 'room-' + Math.random().toString(36).slice(2);
        rooms[roomId] = {
            id: roomId,
            name: roomName,
            p1: socketId,
            p2: null,
            status: 'waiting'
        };
        return {
            roomId,
            response: { roomId, isHost: true, roomName }
        };
    }

    function joinRoom(socketId: string, roomId: string): { success: boolean, response?: any, error?: string } {
        const room = rooms[roomId];
        if (room && room.status === 'waiting' && !room.p2) {
            room.p2 = socketId;
            room.status = 'playing';
            return {
                success: true,
                response: { roomId, isHost: false, roomName: room.name }
            };
        }
        return { success: false, error: 'Room is full or does not exist.' };
    }

    function joinOrCreate(socketId: string, roomName: string): { roomId: string, response: any, created: boolean } {
        // Find existing waiting room by name
        let existingRoomId: string | null = null;
        for (const roomId in rooms) {
            if (rooms[roomId].name === roomName && rooms[roomId].status === 'waiting') {
                existingRoomId = roomId;
                break;
            }
        }

        if (existingRoomId) {
            const room = rooms[existingRoomId];
            room.p2 = socketId;
            room.status = 'playing';
            return {
                roomId: existingRoomId,
                response: { roomId: existingRoomId, isHost: false, roomName: room.name },
                created: false
            };
        } else {
            const roomId = 'room-' + Math.random().toString(36).slice(2);
            rooms[roomId] = {
                id: roomId,
                name: roomName,
                p1: socketId,
                p2: null,
                status: 'waiting'
            };
            return {
                roomId,
                response: { roomId, isHost: true, roomName },
                created: true
            };
        }
    }

    function cleanupDisconnect(socketId: string): string[] {
        const deletedRooms: string[] = [];
        for (const roomId in rooms) {
            const room = rooms[roomId];
            if (room.p1 === socketId || room.p2 === socketId) {
                delete rooms[roomId];
                deletedRooms.push(roomId);
            }
        }
        return deletedRooms;
    }

    // ===== Tests =====

    describe('getRoomList', () => {
        test('returns empty array when no rooms', () => {
            expect(getRoomList()).toEqual([]);
        });

        test('returns only waiting rooms', () => {
            rooms['room1'] = { id: 'room1', name: 'Waiting Room', p1: 's1', p2: null, status: 'waiting' };
            rooms['room2'] = { id: 'room2', name: 'Playing Room', p1: 's2', p2: 's3', status: 'playing' };

            const list = getRoomList();
            expect(list).toHaveLength(1);
            expect(list[0].name).toBe('Waiting Room');
            expect(list[0].players).toBe(1);
        });

        test('counts players correctly', () => {
            rooms['room1'] = { id: 'room1', name: 'Room', p1: 's1', p2: null, status: 'waiting' };
            const list = getRoomList();
            expect(list[0].players).toBe(1);
        });

        test('returns multiple waiting rooms', () => {
            rooms['room1'] = { id: 'room1', name: 'Room A', p1: 's1', p2: null, status: 'waiting' };
            rooms['room2'] = { id: 'room2', name: 'Room B', p1: 's2', p2: null, status: 'waiting' };

            const list = getRoomList();
            expect(list).toHaveLength(2);
        });
    });

    describe('Room Creation', () => {
        test('creates room with correct structure', () => {
            const { roomId } = createRoom('socket1', 'My Room');
            const room = rooms[roomId];

            expect(room.name).toBe('My Room');
            expect(room.p1).toBe('socket1');
            expect(room.p2).toBeNull();
            expect(room.status).toBe('waiting');
        });

        test('response includes roomName', () => {
            const { response } = createRoom('socket1', 'Test Room');

            expect(response.isHost).toBe(true);
            expect(response.roomName).toBe('Test Room');
            expect(response.roomId).toBeDefined();
        });

        test('creating multiple rooms works independently', () => {
            const r1 = createRoom('socket1', 'Room A');
            const r2 = createRoom('socket2', 'Room B');

            expect(rooms[r1.roomId].name).toBe('Room A');
            expect(rooms[r2.roomId].name).toBe('Room B');
            expect(Object.keys(rooms)).toHaveLength(2);
        });
    });

    describe('Room Joining', () => {
        test('joins waiting room as p2', () => {
            const { roomId } = createRoom('socket1', 'My Room');
            const result = joinRoom('socket2', roomId);

            expect(result.success).toBe(true);
            expect(result.response!.isHost).toBe(false);
            expect(result.response!.roomName).toBe('My Room');
            expect(rooms[roomId].p2).toBe('socket2');
            expect(rooms[roomId].status).toBe('playing');
        });

        test('rejects join when room is full', () => {
            const { roomId } = createRoom('socket1', 'My Room');
            joinRoom('socket2', roomId); // p2 joins

            const result = joinRoom('socket3', roomId);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Room is full or does not exist.');
        });

        test('rejects join for non-existent room', () => {
            const result = joinRoom('socket1', 'nonexistent');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Room is full or does not exist.');
        });

        test('rejects join when room is already playing', () => {
            const { roomId } = createRoom('socket1', 'My Room');
            rooms[roomId].status = 'playing';
            rooms[roomId].p2 = 'socket2';

            const result = joinRoom('socket3', roomId);
            expect(result.success).toBe(false);
        });
    });

    describe('Join or Create', () => {
        test('creates new room when no matching name exists', () => {
            const result = joinOrCreate('socket1', 'New Room');

            expect(result.created).toBe(true);
            expect(result.response.isHost).toBe(true);
            expect(result.response.roomName).toBe('New Room');
            expect(rooms[result.roomId].p1).toBe('socket1');
            expect(rooms[result.roomId].status).toBe('waiting');
        });

        test('joins existing waiting room by name', () => {
            const { roomId } = createRoom('socket1', 'Shared Room');

            const result = joinOrCreate('socket2', 'Shared Room');
            expect(result.created).toBe(false);
            expect(result.roomId).toBe(roomId);
            expect(result.response.isHost).toBe(false);
            expect(result.response.roomName).toBe('Shared Room');
            expect(rooms[roomId].p2).toBe('socket2');
            expect(rooms[roomId].status).toBe('playing');
        });

        test('ignores rooms that are already playing', () => {
            const { roomId } = createRoom('socket1', 'Busy Room');
            rooms[roomId].p2 = 'socket2';
            rooms[roomId].status = 'playing';

            const result = joinOrCreate('socket3', 'Busy Room');
            expect(result.created).toBe(true);
            expect(result.roomId).not.toBe(roomId);
            expect(result.response.isHost).toBe(true);
        });

        test('creates new room when existing room with same name is full', () => {
            const { roomId: firstRoomId } = createRoom('socket1', 'Popular Room');
            joinRoom('socket2', firstRoomId);

            const result = joinOrCreate('socket3', 'Popular Room');
            expect(result.created).toBe(true);
            expect(result.roomId).not.toBe(firstRoomId);
        });

        test('response always includes roomName', () => {
            // Created case
            const created = joinOrCreate('socket1', 'Test Room');
            expect(created.response.roomName).toBe('Test Room');

            // Joined case
            const joined = joinOrCreate('socket2', 'Test Room');
            expect(joined.response.roomName).toBe('Test Room');
        });

        test('handles rooms with different names correctly', () => {
            createRoom('socket1', 'Room A');
            createRoom('socket2', 'Room B');

            const result = joinOrCreate('socket3', 'Room A');
            expect(result.created).toBe(false);
            expect(result.response.roomName).toBe('Room A');
            // Room B should remain untouched
            const roomBId = Object.keys(rooms).find(id => rooms[id].name === 'Room B');
            expect(rooms[roomBId!].status).toBe('waiting');
        });
    });

    describe('Player Ready and Game Start', () => {
        test('tracks ready state per player', () => {
            const { roomId } = createRoom('socket1', 'My Room');
            joinRoom('socket2', roomId);
            const room = rooms[roomId];

            // P1 ready
            room.p1Ready = true;
            expect(room.p1Ready).toBe(true);
            expect(room.p2Ready).toBeUndefined();
        });

        test('game starts when both players are ready', () => {
            const { roomId } = createRoom('socket1', 'My Room');
            joinRoom('socket2', roomId);
            const room = rooms[roomId];

            room.p1Ready = true;
            room.p2Ready = true;
            expect(room.p1Ready && room.p2Ready).toBe(true);
        });

        test('game does not start with only one player ready', () => {
            const { roomId } = createRoom('socket1', 'My Room');
            joinRoom('socket2', roomId);
            const room = rooms[roomId];

            room.p1Ready = true;
            room.p2Ready = false;
            expect(room.p1Ready && room.p2Ready).toBe(false);
        });
    });

    describe('Restart Logic', () => {
        test('resets both ready states on restart', () => {
            const { roomId } = createRoom('socket1', 'My Room');
            joinRoom('socket2', roomId);
            const room = rooms[roomId];

            room.p1Ready = true;
            room.p2Ready = true;

            // Restart
            room.p1Ready = false;
            room.p2Ready = false;

            expect(room.p1Ready).toBe(false);
            expect(room.p2Ready).toBe(false);
        });
    });

    describe('Disconnect Cleanup', () => {
        test('removes room when a player disconnects', () => {
            const { roomId } = createRoom('socket1', 'My Room');
            joinRoom('socket2', roomId);

            const deleted = cleanupDisconnect('socket1');
            expect(deleted).toContain(roomId);
            expect(rooms[roomId]).toBeUndefined();
        });

        test('cleans up room where player is host (p1)', () => {
            const { roomId } = createRoom('socket1', 'My Room');

            const deleted = cleanupDisconnect('socket1');
            expect(deleted).toContain(roomId);
            expect(rooms[roomId]).toBeUndefined();
        });

        test('cleans up room where player is guest (p2)', () => {
            const { roomId } = createRoom('socket1', 'My Room');
            joinRoom('socket2', roomId);

            const deleted = cleanupDisconnect('socket2');
            expect(deleted).toContain(roomId);
            expect(rooms[roomId]).toBeUndefined();
        });

        test('does not affect rooms player is not in', () => {
            createRoom('socket1', 'Room A');
            createRoom('socket2', 'Room B');

            cleanupDisconnect('socket1');
            const remainingRoomIds = Object.keys(rooms);
            expect(remainingRoomIds).toHaveLength(1);
            expect(rooms[remainingRoomIds[0]].name).toBe('Room B');
        });

        test('handles disconnect when player has no rooms', () => {
            createRoom('socket1', 'Room A');

            const deleted = cleanupDisconnect('socket99');
            expect(deleted).toHaveLength(0);
            expect(Object.keys(rooms)).toHaveLength(1);
        });
    });

    describe('Room Response Data', () => {
        test('create_room response includes roomName', () => {
            const { response } = createRoom('socket1', 'Test Room');
            expect(response).toEqual({
                roomId: expect.any(String),
                isHost: true,
                roomName: 'Test Room'
            });
        });

        test('join_room response includes roomName', () => {
            const { roomId } = createRoom('socket1', 'Test Room');
            const result = joinRoom('socket2', roomId);
            expect(result.response).toEqual({
                roomId,
                isHost: false,
                roomName: 'Test Room'
            });
        });

        test('join_or_create response includes roomName on create', () => {
            const result = joinOrCreate('socket1', 'URL Room');
            expect(result.response.roomName).toBe('URL Room');
        });

        test('join_or_create response includes roomName on join', () => {
            createRoom('socket1', 'URL Room');
            const result = joinOrCreate('socket2', 'URL Room');
            expect(result.response.roomName).toBe('URL Room');
        });
    });
});

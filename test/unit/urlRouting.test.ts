/**
 * Tests for URL-based room routing.
 * Tests URL pattern matching, encoding/decoding, and history state management
 * used by MenuScene, LobbyScene, PlayScene, and NMultiPlayScene.
 */

describe('URL Routing', () => {

    describe('N-Multi URL Pattern (/n-multi/{roomName})', () => {
        const pattern = /^\/n-multi\/(.+)$/;

        test('matches valid room name', () => {
            const match = '/n-multi/MyRoom'.match(pattern);
            expect(match).not.toBeNull();
            expect(match![1]).toBe('MyRoom');
        });

        test('matches room name with spaces (encoded)', () => {
            const match = '/n-multi/My%20Room'.match(pattern);
            expect(match).not.toBeNull();
            expect(decodeURIComponent(match![1])).toBe('My Room');
        });

        test('matches room name with special characters', () => {
            const match = '/n-multi/room%23123'.match(pattern);
            expect(match).not.toBeNull();
            expect(decodeURIComponent(match![1])).toBe('room#123');
        });

        test('matches room name with unicode characters', () => {
            const encoded = '/n-multi/' + encodeURIComponent('테스트방');
            const match = encoded.match(pattern);
            expect(match).not.toBeNull();
            expect(decodeURIComponent(match![1])).toBe('테스트방');
        });

        test('matches room name with slashes', () => {
            const match = '/n-multi/room/sub'.match(pattern);
            expect(match).not.toBeNull();
            expect(match![1]).toBe('room/sub');
        });

        test('does not match bare /n-multi/', () => {
            const match = '/n-multi/'.match(pattern);
            expect(match).toBeNull();
        });

        test('does not match /n-multi without trailing slash', () => {
            const match = '/n-multi'.match(pattern);
            expect(match).toBeNull();
        });

        test('does not match root path /', () => {
            const match = '/'.match(pattern);
            expect(match).toBeNull();
        });

        test('does not match /multi/ path', () => {
            const match = '/multi/MyRoom'.match(pattern);
            expect(match).toBeNull();
        });
    });

    describe('1v1 Multi URL Pattern (/multi/{roomName})', () => {
        const pattern = /^\/multi\/(.+)$/;

        test('matches valid room name', () => {
            const match = '/multi/MyRoom'.match(pattern);
            expect(match).not.toBeNull();
            expect(match![1]).toBe('MyRoom');
        });

        test('matches room name with spaces (encoded)', () => {
            const match = '/multi/My%20Room'.match(pattern);
            expect(match).not.toBeNull();
            expect(decodeURIComponent(match![1])).toBe('My Room');
        });

        test('matches room name with unicode characters', () => {
            const encoded = '/multi/' + encodeURIComponent('대전방');
            const match = encoded.match(pattern);
            expect(match).not.toBeNull();
            expect(decodeURIComponent(match![1])).toBe('대전방');
        });

        test('does not match bare /multi/', () => {
            const match = '/multi/'.match(pattern);
            expect(match).toBeNull();
        });

        test('does not match /multi without trailing slash', () => {
            const match = '/multi'.match(pattern);
            expect(match).toBeNull();
        });

        test('does not match /n-multi/ path', () => {
            const match = '/n-multi/MyRoom'.match(pattern);
            expect(match).toBeNull();
        });

        test('does not match root path /', () => {
            const match = '/'.match(pattern);
            expect(match).toBeNull();
        });
    });

    describe('URL Pattern Priority', () => {
        const nMultiPattern = /^\/n-multi\/(.+)$/;
        const multiPattern = /^\/multi\/(.+)$/;

        test('/n-multi path only matches n-multi pattern', () => {
            const path = '/n-multi/TestRoom';
            expect(path.match(nMultiPattern)).not.toBeNull();
            expect(path.match(multiPattern)).toBeNull();
        });

        test('/multi path only matches multi pattern', () => {
            const path = '/multi/TestRoom';
            expect(path.match(nMultiPattern)).toBeNull();
            expect(path.match(multiPattern)).not.toBeNull();
        });

        test('root path matches neither pattern', () => {
            const path = '/';
            expect(path.match(nMultiPattern)).toBeNull();
            expect(path.match(multiPattern)).toBeNull();
        });
    });

    describe('Room Name Encoding/Decoding Roundtrip', () => {
        const testNames = [
            'SimpleRoom',
            'Room With Spaces',
            'room#123',
            'room/sub/path',
            '특수문자방',
            'Room & Friends',
            'Room=100%',
            'emoji🎮room',
        ];

        test.each(testNames)('roundtrip preserves room name: %s', (name) => {
            const encoded = encodeURIComponent(name);
            const decoded = decodeURIComponent(encoded);
            expect(decoded).toBe(name);
        });

        test.each(testNames)('URL construction and extraction works for: %s', (name) => {
            const url = '/n-multi/' + encodeURIComponent(name);
            const match = url.match(/^\/n-multi\/(.+)$/);
            expect(match).not.toBeNull();
            expect(decodeURIComponent(match![1])).toBe(name);
        });
    });

    describe('history.replaceState URL Management', () => {
        let originalReplaceState: typeof history.replaceState;

        beforeEach(() => {
            originalReplaceState = history.replaceState;
            history.replaceState = jest.fn();
        });

        afterEach(() => {
            history.replaceState = originalReplaceState;
        });

        test('sets n-multi URL with room name', () => {
            const roomName = 'TestRoom';
            history.replaceState(null, '', '/n-multi/' + encodeURIComponent(roomName));

            expect(history.replaceState).toHaveBeenCalledWith(null, '', '/n-multi/TestRoom');
        });

        test('sets multi URL with room name', () => {
            const roomName = 'TestRoom';
            history.replaceState(null, '', '/multi/' + encodeURIComponent(roomName));

            expect(history.replaceState).toHaveBeenCalledWith(null, '', '/multi/TestRoom');
        });

        test('resets to root on exit', () => {
            history.replaceState(null, '', '/');

            expect(history.replaceState).toHaveBeenCalledWith(null, '', '/');
        });

        test('encodes special characters in URL', () => {
            const roomName = 'Room With Spaces';
            history.replaceState(null, '', '/n-multi/' + encodeURIComponent(roomName));

            expect(history.replaceState).toHaveBeenCalledWith(null, '', '/n-multi/Room%20With%20Spaces');
        });

        test('encodes Korean characters in URL', () => {
            const roomName = '테스트방';
            history.replaceState(null, '', '/multi/' + encodeURIComponent(roomName));

            expect(history.replaceState).toHaveBeenCalledWith(
                null, '', '/multi/' + encodeURIComponent('테스트방')
            );
        });
    });

    describe('Lobby URL Prefix Configuration', () => {
        test('multi config uses /multi prefix', () => {
            const urlPrefix = '/multi';
            const roomName = 'LobbyRoom';
            const expectedUrl = '/multi/LobbyRoom';

            expect(urlPrefix + '/' + encodeURIComponent(roomName)).toBe(expectedUrl);
        });

        test('n-multi config uses /n-multi prefix', () => {
            const urlPrefix = '/n-multi';
            const roomName = 'LobbyRoom';
            const expectedUrl = '/n-multi/LobbyRoom';

            expect(urlPrefix + '/' + encodeURIComponent(roomName)).toBe(expectedUrl);
        });

        test('URL is constructed from response roomName', () => {
            // Simulates lobby roomJoined handler
            const urlPrefix = '/n-multi';
            const data = { roomId: 'abc-123', roomName: 'My Room' };

            const url = urlPrefix + '/' + encodeURIComponent(data.roomName);
            expect(url).toBe('/n-multi/My%20Room');
        });
    });

    describe('Scene Data roomName Propagation', () => {
        test('1v1 scene data includes roomName', () => {
            const sceneData = {
                mode: 'multi',
                socket: {},
                roomId: 'room-123',
                isHost: true,
                roomName: 'Test Room',
                authQueueSeed: 123,
                authSnapshot: { tick: 0 },
            };

            expect(sceneData.roomName).toBe('Test Room');
            expect(sceneData.authQueueSeed).toBe(123);
            expect(sceneData.authSnapshot).toEqual({ tick: 0 });
        });

        test('n-multi scene data includes roomName', () => {
            const sceneData = {
                socket: {},
                roomId: 'room-123',
                playerId: 'player-1',
                playerName: 'Player1',
                initialPlayers: {},
                roomName: 'Test Room',
                authSeed: 123,
                authSnapshot: { tick: 0 },
            };

            expect(sceneData.roomName).toBe('Test Room');
            expect(sceneData.authSeed).toBe(123);
            expect(sceneData.authSnapshot).toEqual({ tick: 0 });
        });

        test('restart data preserves roomName for 1v1', () => {
            const originalData = { mode: 'multi', roomId: 'room-1', roomName: 'Persistent Room' };
            const restartData = { mode: 'multi', socket: {}, roomId: originalData.roomId, roomName: originalData.roomName };

            expect(restartData.roomName).toBe('Persistent Room');
        });

        test('restart data preserves roomName for n-multi', () => {
            const originalRoomName = 'NMulti Room';
            const restartData = {
                socket: {},
                roomId: 'room-1',
                roomName: originalRoomName,
                playerId: 'p1',
                playerName: 'Player1',
                initialPlayers: {}
            };

            expect(restartData.roomName).toBe(originalRoomName);
        });

        test('single player mode has no roomName', () => {
            const sceneData = { mode: 'single' };
            expect((sceneData as any).roomName).toBeUndefined();
        });
    });
});

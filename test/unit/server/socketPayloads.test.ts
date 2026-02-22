import {
    extractSocketErrorMessage,
    extractRoomId,
    isAuthInputPayload,
    isAuthRoundOverPayload,
    isAuthSnapshotPayload,
    isNMultiAuthSnapshotPayload,
    isNMultiRoomErrorPayload,
    isNMultiPlayerJoinedPayload,
    isNMultiPlayerLeftPayload,
    isNMultiReceiveGarbagePayload,
    isNMultiRoomJoinedPayload,
    isNMultiRoomPayload,
    isNMultiSendGarbagePayload,
    isNMultiSnapshotPayload,
    isNMultiUpdateStatePayload,
    isOneVsOneRoomErrorPayload,
    isOneVsOneRoomJoinedPayload,
    isPlayerReadyPayload,
    isRequestRestartPayload,
    isResumeAuthPayload,
    normalizeRoomName,
} from '../../../src/shared/types/socketPayloads';

describe('socket payload guards', () => {
    test('accepts valid authoritative input payload', () => {
        expect(isAuthInputPayload({
            roomId: 'room-1',
            direction: 'left',
            state: 'press',
            seq: 10,
        })).toBe(true);
    });

    test('rejects invalid authoritative input payload', () => {
        expect(isAuthInputPayload({
            roomId: '',
            direction: 'left',
            state: 'press',
        })).toBe(false);
        expect(isAuthInputPayload({
            roomId: 'room-1',
            direction: 'left',
            state: 'press',
            seq: 'bad',
        })).toBe(false);
    });

    test('validates resume and room-scoped payloads', () => {
        expect(isResumeAuthPayload({ resumeToken: 'token-1' })).toBe(true);
        expect(isResumeAuthPayload({ resumeToken: '' })).toBe(false);

        expect(isPlayerReadyPayload({ roomId: 'room-1' })).toBe(true);
        expect(isPlayerReadyPayload({})).toBe(false);

        expect(isRequestRestartPayload({ roomId: 'room-1' })).toBe(true);
        expect(isRequestRestartPayload({ roomId: '' })).toBe(false);
    });

    test('validates auth round-over payload compatibility', () => {
        expect(isAuthRoundOverPayload({ winner: 'p1' })).toBe(true);
        expect(isAuthRoundOverPayload({ winner: 'p2' })).toBe(true);
        expect(isAuthRoundOverPayload({ winner: null })).toBe(true);
        expect(isAuthRoundOverPayload({ winner: 'draw' })).toBe(false);
    });

    test('validates auth snapshot payload shape', () => {
        const payload = {
            tick: 10,
            self: {
                board: '0'.repeat(200),
                score: 1,
                level: 1,
                lines: 0,
                isAlive: true,
                sync: {
                    boardCore: '0'.repeat(200),
                    active: { type: 'T', rotate: '0', col: 3, row: 0 },
                    hold: 'I',
                    canHold: false,
                    queue: ['S', 'Z', 'L', 'O', 'J'],
                    bag: ['T', 'I'],
                    queueRngState: 123,
                    gravityMsCounter: 40,
                },
            },
            opponent: { board: '0'.repeat(200), score: 2, level: 1, lines: 0, isAlive: false },
            serverAckInputSeq: 7,
        };
        expect(isAuthSnapshotPayload(payload)).toBe(true);
        expect(isAuthSnapshotPayload({ ...payload, serverAckInputSeq: 'bad' })).toBe(false);
        expect(isAuthSnapshotPayload({ ...payload, self: { ...payload.self, score: 'bad' } })).toBe(false);
        expect(isAuthSnapshotPayload({
            ...payload,
            self: {
                ...payload.self,
                sync: {
                    ...payload.self.sync,
                    queueRngState: 'bad',
                },
            },
        })).toBe(false);
    });

    test('normalizes roomName and extracts roomId for compatibility', () => {
        expect(normalizeRoomName('  My Room  ', 'Room')).toBe('My Room');
        expect(normalizeRoomName({ roomName: ' Joined ' }, 'Room')).toBe('Joined');
        expect(normalizeRoomName({ nope: true }, 'Room')).toBe('Room');

        expect(extractRoomId('room-1')).toBe('room-1');
        expect(extractRoomId({ roomId: 'room-2' })).toBe('room-2');
        expect(extractRoomId({})).toBeNull();
    });

    test('validates n-multi room/update/garbage payload guards', () => {
        expect(isNMultiRoomPayload({ roomId: 'r1' })).toBe(true);
        expect(isNMultiRoomPayload({ roomId: '' })).toBe(false);

        expect(isNMultiUpdateStatePayload({ roomId: 'r1', score: 100, level: 2, lines: 3, board: '0'.repeat(200) })).toBe(true);
        expect(isNMultiUpdateStatePayload({ roomId: 'r1', score: 'bad' })).toBe(false);

        expect(isNMultiSendGarbagePayload({ roomId: 'r1', targetId: 'p2', count: 4 })).toBe(true);
        expect(isNMultiSendGarbagePayload({ roomId: 'r1', targetId: 'p2', count: 0 })).toBe(false);
    });

    test('validates n-multi snapshot and player event payloads', () => {
        expect(isNMultiSnapshotPayload({ players: { a: { score: 1 } }, isDelta: true })).toBe(true);
        expect(isNMultiSnapshotPayload({ players: null })).toBe(false);

        expect(isNMultiPlayerJoinedPayload({ playerId: 'a', playerName: 'Alpha' })).toBe(true);
        expect(isNMultiPlayerJoinedPayload({ playerId: '', playerName: 'Alpha' })).toBe(false);

        expect(isNMultiPlayerLeftPayload({ playerId: 'a' })).toBe(true);
        expect(isNMultiPlayerLeftPayload({})).toBe(false);

        expect(isNMultiReceiveGarbagePayload({ count: 3, fromId: 'x' })).toBe(true);
        expect(isNMultiReceiveGarbagePayload({ count: 0 })).toBe(false);
    });

    test('validates room joined payload guards for lobby/url flows', () => {
        const oneVsOnePayload = {
            roomId: 'room-1',
            isHost: true,
            roomName: 'My Room',
            resumeToken: 'resume-123',
        };
        expect(isOneVsOneRoomJoinedPayload(oneVsOnePayload)).toBe(true);
        expect(isOneVsOneRoomJoinedPayload({ ...oneVsOnePayload, resumeToken: '' })).toBe(false);

        const nMultiAuthSnapshot = {
            tick: 10,
            serverAckInputSeq: 4,
            self: {
                board: '0'.repeat(200),
                score: 20,
                level: 1,
                lines: 2,
                isAlive: true,
            },
        };
        expect(isNMultiAuthSnapshotPayload(nMultiAuthSnapshot)).toBe(true);

        const nMultiRoomJoined = {
            roomId: 'room-n-1',
            playerId: 'player-1',
            playerName: 'Alpha',
            roomName: 'Battle',
            authSeed: 123,
            authSnapshot: nMultiAuthSnapshot,
            players: {
                'player-2': {
                    name: 'Beta',
                    score: 10,
                    level: 1,
                    lines: 0,
                    board: '0'.repeat(200),
                    isAlive: true,
                    v: 1,
                },
            },
        };
        expect(isNMultiRoomJoinedPayload(nMultiRoomJoined)).toBe(true);
        expect(isNMultiRoomJoinedPayload({ ...nMultiRoomJoined, authSeed: 'bad' })).toBe(false);
        expect(isNMultiRoomJoinedPayload({ ...nMultiRoomJoined, players: { p: { score: 1 } } })).toBe(false);
    });

    test('validates typed room error payloads and message extraction', () => {
        const oneVsOneError = {
            code: 'ROOM_NOT_FOUND_OR_FULL',
            message: 'Room is full or does not exist.',
        } as const;
        expect(isOneVsOneRoomErrorPayload(oneVsOneError)).toBe(true);

        const resumeError = {
            code: 'RESUME_TOKEN_INVALID',
            message: 'Resume token expired or invalid.',
        } as const;
        expect(isOneVsOneRoomErrorPayload(resumeError)).toBe(true);

        const nMultiError = {
            code: 'ROOM_FULL',
            message: 'Room is full (100 players max).',
        } as const;
        expect(isNMultiRoomErrorPayload(nMultiError)).toBe(true);

        expect(extractSocketErrorMessage(oneVsOneError, 'fallback')).toBe(oneVsOneError.message);
        expect(extractSocketErrorMessage(nMultiError, 'fallback')).toBe(nMultiError.message);
        expect(extractSocketErrorMessage('legacy string', 'fallback')).toBe('legacy string');
        expect(extractSocketErrorMessage({ nope: true }, 'fallback')).toBe('fallback');
    });
});

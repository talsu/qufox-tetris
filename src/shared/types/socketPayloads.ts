export interface RoomScopedPayload {
    roomId: string;
}

export interface PlayerReadyPayload extends RoomScopedPayload {}

export interface RequestRestartPayload extends RoomScopedPayload {}

export interface ResumeAuthPayload {
    resumeToken: string;
}

export interface AuthInputPayload extends RoomScopedPayload {
    direction: string;
    state: string;
    seq?: number;
}

export interface AuthRoundOverPayload {
    winner: 'p1' | 'p2' | null;
}

export interface AuthSnapshotSide {
    board: string;
    score: number;
    level: number;
    lines: number;
    isAlive: boolean;
    sync?: AuthSyncState;
}

export interface AuthActiveState {
    type: string;
    rotate: string;
    col: number;
    row: number;
}

export interface AuthSyncState {
    boardCore: string;
    active: AuthActiveState | null;
    hold: string | null;
    canHold: boolean;
    queue: string[];
    bag: string[];
    queueRngState: number;
    gravityMsCounter: number;
}

export interface AuthSnapshotPayload {
    tick: number;
    self: AuthSnapshotSide;
    opponent: AuthSnapshotSide;
}

export interface CreateRoomPayload {
    roomName: string;
}

export interface JoinOrCreatePayload {
    roomName: string;
}

export interface UpdateStatePayload extends RoomScopedPayload {
    board?: string;
}

export interface SendGarbagePayload extends RoomScopedPayload {
    count: number;
}

export interface NMultiRoomScopedPayload extends RoomScopedPayload {}

export interface NMultiCreateRoomPayload {
    roomName: string;
}

export interface NMultiJoinRoomPayload extends RoomScopedPayload {}

export interface NMultiLeaveRoomPayload extends RoomScopedPayload {}

export interface NMultiUpdateStatePayload extends RoomScopedPayload {
    score?: number;
    level?: number;
    lines?: number;
    board?: string;
}

export interface NMultiSendGarbagePayload extends RoomScopedPayload {
    targetId: string;
    count: number;
}

export interface NMultiPlayerPayload {
    name: string;
    score: number;
    level: number;
    lines: number;
    board: string | null;
    isAlive: boolean;
    v: number;
}

export interface NMultiSnapshotPayload {
    players: Record<string, Partial<NMultiPlayerPayload>>;
    isDelta?: boolean;
}

export interface NMultiPlayerJoinedPayload {
    playerId: string;
    playerName: string;
}

export interface NMultiPlayerLeftPayload {
    playerId: string;
}

export interface NMultiReceiveGarbagePayload {
    count: number;
    fromId?: string;
}

export interface RoomResumedPayload {
    roomId: string;
    isHost: boolean;
    roomName: string;
    resumeToken: string;
    authSeed: number | null;
}

export interface GameStartPayload {
    roomId: string;
    authSeed: number | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function hasRoomId(value: unknown): value is RoomScopedPayload {
    return isRecord(value) && typeof value.roomId === 'string' && value.roomId.length > 0;
}

export function isPlayerReadyPayload(value: unknown): value is PlayerReadyPayload {
    return hasRoomId(value);
}

export function isRequestRestartPayload(value: unknown): value is RequestRestartPayload {
    return hasRoomId(value);
}

export function isResumeAuthPayload(value: unknown): value is ResumeAuthPayload {
    return isRecord(value) && typeof value.resumeToken === 'string' && value.resumeToken.length > 0;
}

export function isAuthInputPayload(value: unknown): value is AuthInputPayload {
    if (!hasRoomId(value) || !isRecord(value)) {
        return false;
    }
    return typeof value.direction === 'string'
        && value.direction.length > 0
        && typeof value.state === 'string'
        && value.state.length > 0
        && (value.seq === undefined || Number.isFinite(value.seq));
}

export function isAuthRoundOverPayload(value: unknown): value is AuthRoundOverPayload {
    return isRecord(value)
        && (value.winner === null || value.winner === 'p1' || value.winner === 'p2');
}

function isStringRecord(value: unknown): value is Record<string, unknown> {
    return isRecord(value);
}

function isFiniteOrUndefined(value: unknown): boolean {
    return value === undefined || Number.isFinite(value);
}

function isAuthSnapshotSide(value: unknown): value is AuthSnapshotSide {
    if (!isRecord(value)) return false;
    const basic = typeof value.board === 'string'
        && Number.isFinite(value.score)
        && Number.isFinite(value.level)
        && Number.isFinite(value.lines)
        && typeof value.isAlive === 'boolean';
    if (!basic) return false;
    if (value.sync === undefined) return true;
    return isAuthSyncState(value.sync);
}

function isAuthActiveState(value: unknown): value is AuthActiveState {
    return isRecord(value)
        && typeof value.type === 'string'
        && typeof value.rotate === 'string'
        && Number.isFinite(value.col)
        && Number.isFinite(value.row);
}

function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isAuthSyncState(value: unknown): value is AuthSyncState {
    if (!isRecord(value)) return false;
    const activeOk = value.active === null || isAuthActiveState(value.active);
    const holdOk = value.hold === null || typeof value.hold === 'string';
    return typeof value.boardCore === 'string'
        && activeOk
        && holdOk
        && typeof value.canHold === 'boolean'
        && isStringArray(value.queue)
        && isStringArray(value.bag)
        && Number.isFinite(value.queueRngState)
        && Number.isFinite(value.gravityMsCounter);
}

export function isAuthSnapshotPayload(value: unknown): value is AuthSnapshotPayload {
    if (!isRecord(value)) return false;
    return Number.isFinite(value.tick)
        && isAuthSnapshotSide(value.self)
        && isAuthSnapshotSide(value.opponent);
}

export function isCreateRoomPayload(value: unknown): value is CreateRoomPayload {
    return typeof value === 'string' || (isRecord(value) && typeof value.roomName === 'string');
}

export function normalizeRoomName(value: unknown, fallback = 'Room'): string {
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
    if (isRecord(value) && typeof value.roomName === 'string' && value.roomName.trim().length > 0) {
        return value.roomName.trim();
    }
    return fallback;
}

export function isRoomIdString(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0;
}

export function extractRoomId(value: unknown): string | null {
    if (typeof value === 'string' && value.length > 0) return value;
    if (isRecord(value) && typeof value.roomId === 'string' && value.roomId.length > 0) return value.roomId;
    return null;
}

export function isUpdateStatePayload(value: unknown): value is UpdateStatePayload {
    if (!hasRoomId(value) || !isRecord(value)) return false;
    return value.board === undefined || typeof value.board === 'string';
}

export function isSendGarbagePayload(value: unknown): value is SendGarbagePayload {
    if (!hasRoomId(value) || !isRecord(value)) return false;
    return Number.isFinite(value.count) && (value.count as number) > 0;
}

export function isNMultiRoomPayload(value: unknown): value is NMultiRoomScopedPayload {
    return hasRoomId(value);
}

export function isNMultiUpdateStatePayload(value: unknown): value is NMultiUpdateStatePayload {
    if (!hasRoomId(value) || !isRecord(value)) return false;
    const boardOk = value.board === undefined || typeof value.board === 'string';
    return boardOk
        && isFiniteOrUndefined(value.score)
        && isFiniteOrUndefined(value.level)
        && isFiniteOrUndefined(value.lines);
}

export function isNMultiSendGarbagePayload(value: unknown): value is NMultiSendGarbagePayload {
    if (!hasRoomId(value) || !isRecord(value)) return false;
    return typeof value.targetId === 'string'
        && value.targetId.length > 0
        && Number.isFinite(value.count)
        && (value.count as number) > 0;
}

export function isNMultiPlayerJoinedPayload(value: unknown): value is NMultiPlayerJoinedPayload {
    return isRecord(value)
        && typeof value.playerId === 'string'
        && value.playerId.length > 0
        && typeof value.playerName === 'string';
}

export function isNMultiPlayerLeftPayload(value: unknown): value is NMultiPlayerLeftPayload {
    return isRecord(value)
        && typeof value.playerId === 'string'
        && value.playerId.length > 0;
}

export function isNMultiReceiveGarbagePayload(value: unknown): value is NMultiReceiveGarbagePayload {
    return isRecord(value)
        && Number.isFinite(value.count)
        && (value.count as number) > 0
        && (value.fromId === undefined || typeof value.fromId === 'string');
}

export function isNMultiSnapshotPayload(value: unknown): value is NMultiSnapshotPayload {
    if (!isRecord(value)) return false;
    if (!isStringRecord(value.players)) return false;
    if (value.isDelta !== undefined && typeof value.isDelta !== 'boolean') return false;
    return true;
}

export function isRoomResumedPayload(value: unknown): value is RoomResumedPayload {
    if (!isRecord(value)) return false;
    return typeof value.roomId === 'string'
        && typeof value.isHost === 'boolean'
        && typeof value.roomName === 'string'
        && typeof value.resumeToken === 'string'
        && (value.authSeed === null || Number.isFinite(value.authSeed));
}

export function isGameStartPayload(value: unknown): value is GameStartPayload {
    if (!isRecord(value)) return false;
    return typeof value.roomId === 'string'
        && (value.authSeed === null || Number.isFinite(value.authSeed));
}

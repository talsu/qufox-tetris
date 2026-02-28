import { InputDirection, InputState, isInputDirection } from "../../tetris/const/const";

export interface RoomScopedPayload {
    roomId: string;
}

export interface PlayerReadyPayload extends RoomScopedPayload {}

export interface RequestRestartPayload extends RoomScopedPayload {}

export interface ResumeAuthPayload {
    resumeToken: string;
    roomId?: string;
    lastSnapshotSeq?: number;
    lastInputSeq?: number;
}

export interface AuthInputPayload extends RoomScopedPayload {
    direction: InputDirection;
    state: InputState;
    seq?: number;
}

export interface AuthRoundOverPayload {
    winner: 'p1' | 'p2' | null;
}

export interface AuthInputAckPayload extends RoomScopedPayload {
    serverAckInputSeq: number;
    serverTime: number;
}

export interface AuthPresencePayload extends RoomScopedPayload {
    state: 'active' | 'inactive';
    lastSnapshotSeq?: number;
    lastInputSeq?: number;
}

export interface AuthSnapshotStats {
    tetrises: number;
    tspins: number;
    combos: number;
}

export interface AuthLockFeedback {
    id: number;
    actionName: string | null;
    combo: number;
}

export interface AuthSnapshotSide {
    board: string | Uint8Array | ArrayBuffer;
    score: number;
    level: number;
    lines: number;
    isAlive: boolean;
    stats?: AuthSnapshotStats;
    lockFeedback?: AuthLockFeedback;
    sync?: AuthSyncState;
}

export interface AuthActiveState {
    type: string;
    rotate: string;
    col: number;
    row: number;
}

export interface AuthSyncState {
    boardCore: string | Uint8Array | ArrayBuffer;
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
    serverAckInputSeq?: number;
    shadowRelay?: boolean;
}

export interface AuthClientSnapshotPayload extends RoomScopedPayload {
    snapshotSeq: number;
    clientTick: number;
    lastInputSeq: number;
    self: AuthSnapshotSide;
}

export interface CreateRoomPayload {
    roomName: string;
}

export interface JoinOrCreatePayload {
    roomName: string;
}

export interface UpdateStatePayload extends RoomScopedPayload {
    board?: string | Uint8Array | ArrayBuffer;
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
    board?: string | Uint8Array | ArrayBuffer;
}

export interface NMultiAuthInputPayload extends RoomScopedPayload {
    direction: InputDirection;
    state: InputState;
    seq?: number;
}

export interface NMultiAuthSnapshotPayload {
    tick: number;
    self: AuthSnapshotSide;
    serverAckInputSeq: number;
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
    board: string | Uint8Array | ArrayBuffer | null;
    isAlive: boolean;
    v: number;
}

export interface NMultiPlayerDeltaPayload {
    name?: string;
    score?: number;
    level?: number;
    lines?: number;
    board?: string | Uint8Array | ArrayBuffer | null;
    isAlive?: boolean;
    v?: number;
}

export interface NMultiSnapshotPayload {
    players: Record<string, NMultiPlayerDeltaPayload>;
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
    shadowSelf?: AuthSnapshotSide;
    shadowOpponent?: AuthSnapshotSide;
    pendingGarbage?: Array<{ count: number; garbageSeq: number; from: 'p1' | 'p2' }>;
    serverSeqBase?: number;
}

export interface GameStartPayload {
    roomId: string;
    authSeed: number | null;
    authSnapshot?: AuthSnapshotPayload;
}

export interface OneVsOneRoomJoinedPayload {
    roomId: string;
    isHost: boolean;
    roomName: string;
    resumeToken: string;
    botLevel: number;
    authSeed?: number | null;
    authSnapshot?: AuthSnapshotPayload;
}

export interface NMultiRoomJoinedPayload {
    roomId: string;
    playerId: string;
    playerName: string;
    roomName: string;
    players: Record<string, NMultiPlayerPayload>;
    authSeed: number;
    botLevel: number;
    authSnapshot: NMultiAuthSnapshotPayload;
}

export type OneVsOneRoomErrorCode = 'ROOM_NOT_FOUND_OR_FULL' | 'RESUME_TOKEN_INVALID';

export interface OneVsOneRoomErrorPayload {
    code: OneVsOneRoomErrorCode;
    message: string;
}

export type NMultiRoomErrorCode = 'ROOM_NOT_FOUND' | 'ROOM_FULL';

export interface NMultiRoomErrorPayload {
    code: NMultiRoomErrorCode;
    message: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isBinaryLike(value: unknown): value is Uint8Array | ArrayBuffer {
    return value instanceof Uint8Array
        || value instanceof ArrayBuffer
        || (isRecord(value) && value.constructor != null && (
            (value.constructor as { name?: string }).name === 'Uint8Array'
            || (value.constructor as { name?: string }).name === 'ArrayBuffer'
        ));
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
    if (!isRecord(value) || typeof value.resumeToken !== 'string' || value.resumeToken.length <= 0) {
        return false;
    }
    return (value.roomId === undefined || typeof value.roomId === 'string')
        && isFiniteOrUndefined(value.lastSnapshotSeq)
        && isFiniteOrUndefined(value.lastInputSeq);
}

export function isAuthInputPayload(value: unknown): value is AuthInputPayload {
    if (!hasRoomId(value) || !isRecord(value)) {
        return false;
    }
    return isInputDirection(value.direction)
        && isInputState(value.state)
        && (value.seq === undefined || Number.isFinite(value.seq));
}

export function isAuthRoundOverPayload(value: unknown): value is AuthRoundOverPayload {
    return isRecord(value)
        && (value.winner === null || value.winner === 'p1' || value.winner === 'p2');
}

export function isAuthPresencePayload(value: unknown): value is AuthPresencePayload {
    if (!hasRoomId(value) || !isRecord(value)) return false;
    const stateOk = value.state === 'active' || value.state === 'inactive';
    return stateOk
        && isFiniteOrUndefined(value.lastSnapshotSeq)
        && isFiniteOrUndefined(value.lastInputSeq);
}

function isStringRecord(value: unknown): value is Record<string, unknown> {
    return isRecord(value);
}

function isFiniteOrUndefined(value: unknown): boolean {
    return value === undefined || Number.isFinite(value);
}

function isInputState(value: unknown): value is InputState {
    return value === InputState.PRESS
        || value === InputState.RELEASE
        || value === InputState.HOLD;
}

function isAuthSnapshotStats(value: unknown): value is AuthSnapshotStats {
    return isRecord(value)
        && Number.isFinite(value.tetrises)
        && Number.isFinite(value.tspins)
        && Number.isFinite(value.combos);
}

function isAuthLockFeedback(value: unknown): value is AuthLockFeedback {
    return isRecord(value)
        && Number.isFinite(value.id)
        && (value.actionName === null || typeof value.actionName === 'string')
        && Number.isFinite(value.combo);
}

function isAuthSnapshotSide(value: unknown): value is AuthSnapshotSide {
    if (!isRecord(value)) return false;
    const boardOk = typeof value.board === 'string' || isBinaryLike(value.board);
    const statsOk = value.stats === undefined || isAuthSnapshotStats(value.stats);
    const lockFeedbackOk = value.lockFeedback === undefined || isAuthLockFeedback(value.lockFeedback);
    const basic = boardOk
        && Number.isFinite(value.score)
        && Number.isFinite(value.level)
        && Number.isFinite(value.lines)
        && typeof value.isAlive === 'boolean'
        && statsOk
        && lockFeedbackOk;
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

function isNMultiPlayerPayload(value: unknown): value is NMultiPlayerPayload {
    if (!isRecord(value)) return false;
    const boardOk = value.board === null || typeof value.board === 'string' || isBinaryLike(value.board);
    return typeof value.name === 'string'
        && Number.isFinite(value.score)
        && Number.isFinite(value.level)
        && Number.isFinite(value.lines)
        && boardOk
        && typeof value.isAlive === 'boolean'
        && Number.isFinite(value.v);
}

function isNMultiPlayersMap(value: unknown): value is Record<string, NMultiPlayerPayload> {
    if (!isRecord(value)) return false;
    return Object.values(value).every((entry) => isNMultiPlayerPayload(entry));
}

function isNMultiPlayerDeltaPayload(value: unknown): value is NMultiPlayerDeltaPayload {
    if (!isRecord(value)) return false;
    const boardOk = value.board === undefined
        || value.board === null
        || typeof value.board === 'string'
        || isBinaryLike(value.board);
    return (value.name === undefined || typeof value.name === 'string')
        && (value.score === undefined || Number.isFinite(value.score))
        && (value.level === undefined || Number.isFinite(value.level))
        && (value.lines === undefined || Number.isFinite(value.lines))
        && boardOk
        && (value.isAlive === undefined || typeof value.isAlive === 'boolean')
        && (value.v === undefined || Number.isFinite(value.v));
}

function isAuthSyncState(value: unknown): value is AuthSyncState {
    if (!isRecord(value)) return false;
    const boardCoreOk = typeof value.boardCore === 'string' || isBinaryLike(value.boardCore);
    const activeOk = value.active === null || isAuthActiveState(value.active);
    const holdOk = value.hold === null || typeof value.hold === 'string';
    return boardCoreOk
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
        && isAuthSnapshotSide(value.opponent)
        && isFiniteOrUndefined(value.serverAckInputSeq)
        && (value.shadowRelay === undefined || typeof value.shadowRelay === 'boolean');
}

export function isAuthClientSnapshotPayload(value: unknown): value is AuthClientSnapshotPayload {
    if (!hasRoomId(value) || !isRecord(value)) return false;
    return Number.isFinite(value.snapshotSeq)
        && Number.isFinite(value.clientTick)
        && Number.isFinite(value.lastInputSeq)
        && isAuthSnapshotSide(value.self);
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

export function toFiniteNumberOrNull(value: unknown): number | null {
    return Number.isFinite(value) ? Number(value) : null;
}

export function isUpdateStatePayload(value: unknown): value is UpdateStatePayload {
    if (!hasRoomId(value) || !isRecord(value)) return false;
    return value.board === undefined || typeof value.board === 'string' || isBinaryLike(value.board);
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
    const boardOk = value.board === undefined || typeof value.board === 'string' || isBinaryLike(value.board);
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
    return Object.values(value.players).every((entry) => isNMultiPlayerDeltaPayload(entry));
}

export function isRoomResumedPayload(value: unknown): value is RoomResumedPayload {
    if (!isRecord(value)) return false;
    const pendingGarbage = value.pendingGarbage;
    const pendingGarbageOk = pendingGarbage === undefined || (
        Array.isArray(pendingGarbage)
        && pendingGarbage.every((entry) => isRecord(entry)
            && Number.isFinite(entry.count)
            && Number.isFinite(entry.garbageSeq)
            && (entry.from === 'p1' || entry.from === 'p2'))
    );
    const shadowSelfOk = value.shadowSelf === undefined || isAuthSnapshotSide(value.shadowSelf);
    const shadowOpponentOk = value.shadowOpponent === undefined || isAuthSnapshotSide(value.shadowOpponent);
    return typeof value.roomId === 'string'
        && typeof value.isHost === 'boolean'
        && typeof value.roomName === 'string'
        && typeof value.resumeToken === 'string'
        && (value.authSeed === null || Number.isFinite(value.authSeed))
        && shadowSelfOk
        && shadowOpponentOk
        && pendingGarbageOk
        && isFiniteOrUndefined(value.serverSeqBase);
}

export function isNMultiAuthInputPayload(value: unknown): value is NMultiAuthInputPayload {
    if (!hasRoomId(value) || !isRecord(value)) {
        return false;
    }
    return isInputDirection(value.direction)
        && isInputState(value.state)
        && (value.seq === undefined || Number.isFinite(value.seq));
}

export function isNMultiAuthSnapshotPayload(value: unknown): value is NMultiAuthSnapshotPayload {
    if (!isRecord(value)) return false;
    return Number.isFinite(value.tick)
        && Number.isFinite(value.serverAckInputSeq)
        && isAuthSnapshotSide(value.self);
}

export function isGameStartPayload(value: unknown): value is GameStartPayload {
    if (!isRecord(value)) return false;
    return typeof value.roomId === 'string'
        && (value.authSeed === null || Number.isFinite(value.authSeed))
        && (value.authSnapshot === undefined || isAuthSnapshotPayload(value.authSnapshot));
}

export function isOneVsOneRoomJoinedPayload(value: unknown): value is OneVsOneRoomJoinedPayload {
    if (!isRecord(value)) return false;
    return typeof value.roomId === 'string'
        && value.roomId.length > 0
        && typeof value.isHost === 'boolean'
        && typeof value.roomName === 'string'
        && typeof value.resumeToken === 'string'
        && value.resumeToken.length > 0
        && Number.isFinite(value.botLevel)
        && (value.authSeed === undefined || value.authSeed === null || Number.isFinite(value.authSeed))
        && (value.authSnapshot === undefined || isAuthSnapshotPayload(value.authSnapshot));
}

export function isNMultiRoomJoinedPayload(value: unknown): value is NMultiRoomJoinedPayload {
    if (!isRecord(value)) return false;
    return typeof value.roomId === 'string'
        && value.roomId.length > 0
        && typeof value.playerId === 'string'
        && value.playerId.length > 0
        && typeof value.playerName === 'string'
        && typeof value.roomName === 'string'
        && Number.isFinite(value.authSeed)
        && Number.isFinite(value.botLevel)
        && isNMultiPlayersMap(value.players)
        && isNMultiAuthSnapshotPayload(value.authSnapshot);
}

export function isOneVsOneRoomErrorPayload(value: unknown): value is OneVsOneRoomErrorPayload {
    if (!isRecord(value)) return false;
    return (value.code === 'ROOM_NOT_FOUND_OR_FULL' || value.code === 'RESUME_TOKEN_INVALID')
        && typeof value.message === 'string';
}

export function isNMultiRoomErrorPayload(value: unknown): value is NMultiRoomErrorPayload {
    if (!isRecord(value)) return false;
    return (value.code === 'ROOM_NOT_FOUND' || value.code === 'ROOM_FULL')
        && typeof value.message === 'string';
}

export function extractSocketErrorMessage(value: unknown, fallback: string): string {
    if (typeof value === 'string') {
        return value;
    }
    if (isOneVsOneRoomErrorPayload(value) || isNMultiRoomErrorPayload(value)) {
        return value.message;
    }
    return fallback;
}

import { EnginePhase } from '../objects/playField';
import type { AuthLockFeedback, AuthSnapshotStats, AuthSyncState } from '../../shared/types/socketPayloads';
import { BoardCodec } from '../net/boardCodec';

interface BootstrapSelfSnapshot {
    score: number;
    level: number;
    lines: number;
    stats?: AuthSnapshotStats;
    lockFeedback?: AuthLockFeedback;
    sync?: AuthSyncState;
}

interface BootstrapSnapshot<TOpponent = unknown> {
    self: BootstrapSelfSnapshot;
    opponent?: TOpponent;
}

export function applyAuthoritativeBootstrapSnapshot<TOpponent>(
    snapshot: BootstrapSnapshot<TOpponent> | null,
    handlers: {
        applySelfSync: (
            sync: AuthSyncState,
            stats: { score: number; level: number; lines: number; stats?: AuthSnapshotStats; lockFeedback?: AuthLockFeedback }
        ) => void;
        applyOpponent?: (opponent: TOpponent) => void;
    },
): boolean {
    if (!snapshot) {
        return false;
    }

    if (snapshot.self.sync) {
        handlers.applySelfSync(snapshot.self.sync, {
            score: snapshot.self.score,
            level: snapshot.self.level,
            lines: snapshot.self.lines,
            stats: snapshot.self.stats,
            lockFeedback: snapshot.self.lockFeedback,
        });
    }
    if (handlers.applyOpponent && snapshot.opponent !== undefined) {
        handlers.applyOpponent(snapshot.opponent);
    }

    return true;
}

export function isResyncTransitionPhase(phase: EnginePhase): boolean {
    return phase === EnginePhase.PATTERN
        || phase === EnginePhase.ITERATE
        || phase === EnginePhase.ANIMATE
        || phase === EnginePhase.ELIMINATE;
}

export function shouldSkipResyncByAck(serverAckInputSeq: number | undefined, localInputSeq: number): boolean {
    return Number.isFinite(serverAckInputSeq) && Number(serverAckInputSeq) < localInputSeq;
}

export function computeResyncMismatchState(params: {
    localBoard: string;
    remoteBoard: string | Uint8Array | ArrayBuffer;
    tick: number;
    mismatchStreak: number;
    needsAuthoritativeResync: boolean;
    mismatchThreshold: number;
    minTick?: number;
}): { mismatchStreak: number; needsAuthoritativeResync: boolean } {
    const isMatch = typeof params.remoteBoard === 'string'
        ? params.localBoard === params.remoteBoard
        : BoardCodec.areUint8ArraysEqual(BoardCodec.stringToBinary(params.localBoard), params.remoteBoard);
    if (isMatch) {
        return {
            mismatchStreak: 0,
            needsAuthoritativeResync: params.needsAuthoritativeResync,
        };
    }

    const nextStreak = params.mismatchStreak + 1;
    const minTick = params.minTick ?? 4;
    const shouldResync = params.tick >= minTick && nextStreak >= params.mismatchThreshold;
    return {
        mismatchStreak: nextStreak,
        needsAuthoritativeResync: params.needsAuthoritativeResync || shouldResync,
    };
}

export function bindDocumentVisibilityHandler(
    existingHandler: (() => void) | null,
    nextHandler: () => void,
): (() => void) | null {
    if (typeof document === 'undefined' || existingHandler) {
        return existingHandler;
    }
    document.addEventListener('visibilitychange', nextHandler);
    return nextHandler;
}

export function unbindDocumentVisibilityHandler(existingHandler: (() => void) | null): null {
    if (!existingHandler || typeof document === 'undefined') {
        return null;
    }
    document.removeEventListener('visibilitychange', existingHandler);
    return null;
}

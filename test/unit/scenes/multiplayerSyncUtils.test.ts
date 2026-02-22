import { EnginePhase } from '../../../src/tetris/objects/playField';
import {
    applyAuthoritativeBootstrapSnapshot,
    bindDocumentVisibilityHandler,
    computeResyncMismatchState,
    isResyncTransitionPhase,
    shouldSkipResyncByAck,
    unbindDocumentVisibilityHandler,
} from '../../../src/tetris/scenes/multiplayerSyncUtils';

describe('multiplayerSyncUtils', () => {
    test('identifies transition phases correctly', () => {
        expect(isResyncTransitionPhase(EnginePhase.PATTERN)).toBe(true);
        expect(isResyncTransitionPhase(EnginePhase.ITERATE)).toBe(true);
        expect(isResyncTransitionPhase(EnginePhase.ANIMATE)).toBe(true);
        expect(isResyncTransitionPhase(EnginePhase.ELIMINATE)).toBe(true);
        expect(isResyncTransitionPhase(EnginePhase.FALLING)).toBe(false);
    });

    test('skips resync while server ack is behind', () => {
        expect(shouldSkipResyncByAck(2, 3)).toBe(true);
        expect(shouldSkipResyncByAck(3, 3)).toBe(false);
        expect(shouldSkipResyncByAck(undefined, 3)).toBe(false);
    });

    test('computes mismatch streak and resync trigger', () => {
        const first = computeResyncMismatchState({
            localBoard: 'A',
            remoteBoard: 'B',
            tick: 4,
            mismatchStreak: 0,
            needsAuthoritativeResync: false,
            mismatchThreshold: 2,
        });
        expect(first).toEqual({ mismatchStreak: 1, needsAuthoritativeResync: false });

        const second = computeResyncMismatchState({
            localBoard: 'A',
            remoteBoard: 'B',
            tick: 4,
            mismatchStreak: first.mismatchStreak,
            needsAuthoritativeResync: first.needsAuthoritativeResync,
            mismatchThreshold: 2,
        });
        expect(second).toEqual({ mismatchStreak: 2, needsAuthoritativeResync: true });

        const sameBoard = computeResyncMismatchState({
            localBoard: 'SAME',
            remoteBoard: 'SAME',
            tick: 10,
            mismatchStreak: 5,
            needsAuthoritativeResync: true,
            mismatchThreshold: 2,
        });
        expect(sameBoard).toEqual({ mismatchStreak: 0, needsAuthoritativeResync: true });
    });

    test('respects minTick before triggering authoritative resync', () => {
        const beforeMinTick = computeResyncMismatchState({
            localBoard: 'A',
            remoteBoard: 'B',
            tick: 2,
            mismatchStreak: 1,
            needsAuthoritativeResync: false,
            mismatchThreshold: 2,
            minTick: 4,
        });
        expect(beforeMinTick).toEqual({ mismatchStreak: 2, needsAuthoritativeResync: false });

        const atMinTick = computeResyncMismatchState({
            localBoard: 'A',
            remoteBoard: 'B',
            tick: 4,
            mismatchStreak: 1,
            needsAuthoritativeResync: false,
            mismatchThreshold: 2,
            minTick: 4,
        });
        expect(atMinTick).toEqual({ mismatchStreak: 2, needsAuthoritativeResync: true });
    });

    test('applies authoritative bootstrap self and opponent callbacks', () => {
        const applySelfSync = jest.fn();
        const applyOpponent = jest.fn();

        const applied = applyAuthoritativeBootstrapSnapshot(
            {
                self: {
                    score: 100,
                    level: 2,
                    lines: 4,
                    sync: {
                        boardCore: '0'.repeat(200),
                        active: null,
                        hold: null,
                        canHold: true,
                        queue: ['I', 'O', 'T'],
                        bag: ['S', 'Z', 'L', 'J'],
                        queueRngState: 42,
                        gravityMsCounter: 0,
                    },
                },
                opponent: { board: 'op-board' },
            },
            {
                applySelfSync,
                applyOpponent,
            },
        );

        expect(applied).toBe(true);
        expect(applySelfSync).toHaveBeenCalledWith(expect.any(Object), {
            score: 100,
            level: 2,
            lines: 4,
        });
        expect(applyOpponent).toHaveBeenCalledWith({ board: 'op-board' });
    });

    test('returns false when bootstrap snapshot is null', () => {
        const applySelfSync = jest.fn();
        const applied = applyAuthoritativeBootstrapSnapshot(null, { applySelfSync });
        expect(applied).toBe(false);
        expect(applySelfSync).not.toHaveBeenCalled();
    });

    test('binds and unbinds document visibility handler safely', () => {
        const addSpy = jest.spyOn(document, 'addEventListener');
        const removeSpy = jest.spyOn(document, 'removeEventListener');
        const handler = () => {
            // no-op
        };

        const bound = bindDocumentVisibilityHandler(null, handler);
        expect(bound).toBe(handler);
        expect(addSpy).toHaveBeenCalledWith('visibilitychange', handler);

        const unbound = unbindDocumentVisibilityHandler(bound);
        expect(unbound).toBeNull();
        expect(removeSpy).toHaveBeenCalledWith('visibilitychange', handler);

        addSpy.mockRestore();
        removeSpy.mockRestore();
    });
});

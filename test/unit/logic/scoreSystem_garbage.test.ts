import { ScoreSystem } from '../../../src/tetris/logic/scoreSystem';
import { TetrominoType, RotateType } from '../../../src/tetris/const/const';

/**
 * Tests for the garbage (attack) calculation in ScoreSystem.
 * This complements the existing scoreSystem.test.ts with multiplayer-specific tests.
 */
describe('ScoreSystem - Garbage Calculation', () => {
    let scoreSystem: ScoreSystem;

    const defaultDrop = { softDrop: 0, hardDrop: 0, autoDrop: 0 };
    const noCorner = { pointSide: 0, flatSide: 0 };

    beforeEach(() => {
        scoreSystem = new ScoreSystem();
    });

    test('no clear produces 0 garbage', () => {
        const result = scoreSystem.onLock(
            0, TetrominoType.I, RotateType.UP, RotateType.UP, 'drop', 0,
            defaultDrop, noCorner
        );
        expect(result.garbage).toBe(0);
    });

    test('Single clear produces 0 garbage', () => {
        const result = scoreSystem.onLock(
            1, TetrominoType.I, RotateType.UP, RotateType.UP, 'drop', 0,
            defaultDrop, noCorner
        );
        expect(result.garbage).toBe(0);
    });

    test('Double clear produces 1 garbage', () => {
        const result = scoreSystem.onLock(
            2, TetrominoType.I, RotateType.UP, RotateType.UP, 'drop', 0,
            defaultDrop, noCorner
        );
        expect(result.garbage).toBe(1);
    });

    test('Triple clear produces 2 garbage', () => {
        const result = scoreSystem.onLock(
            3, TetrominoType.I, RotateType.UP, RotateType.UP, 'drop', 0,
            defaultDrop, noCorner
        );
        expect(result.garbage).toBe(2);
    });

    test('Tetris clear produces 4 garbage', () => {
        const result = scoreSystem.onLock(
            4, TetrominoType.I, RotateType.UP, RotateType.UP, 'drop', 0,
            defaultDrop, noCorner
        );
        expect(result.garbage).toBe(4);
    });

    test('T-Spin Single produces 2 garbage', () => {
        const result = scoreSystem.onLock(
            1, TetrominoType.T, RotateType.UP, RotateType.RIGHT, 'rotate', 0,
            defaultDrop, { pointSide: 2, flatSide: 1 }
        );
        expect(result.garbage).toBe(2);
    });

    test('T-Spin Double produces 4 garbage', () => {
        const result = scoreSystem.onLock(
            2, TetrominoType.T, RotateType.UP, RotateType.RIGHT, 'rotate', 0,
            defaultDrop, { pointSide: 2, flatSide: 1 }
        );
        expect(result.garbage).toBe(4);
    });

    test('T-Spin Triple produces 6 garbage', () => {
        const result = scoreSystem.onLock(
            3, TetrominoType.T, RotateType.UP, RotateType.RIGHT, 'rotate', 0,
            defaultDrop, { pointSide: 2, flatSide: 1 }
        );
        expect(result.garbage).toBe(6);
    });

    test('Back-to-Back Tetris adds 1 bonus garbage', () => {
        // First Tetris: 4 garbage
        scoreSystem.onLock(
            4, TetrominoType.I, RotateType.UP, RotateType.UP, 'drop', 0,
            defaultDrop, noCorner
        );

        // Second Tetris: back-to-back = 4 + 1 = 5 garbage
        const result = scoreSystem.onLock(
            4, TetrominoType.I, RotateType.UP, RotateType.UP, 'drop', 0,
            defaultDrop, noCorner
        );
        expect(result.isBackToBack).toBe(true);
        // 4 base + 1 b2b + combo bonus (combo=1, <2 so no extra)
        expect(result.garbage).toBe(5);
    });

    test('combo >= 2 adds extra garbage', () => {
        // Clear 1: Single (combo 0)
        scoreSystem.onLock(
            1, TetrominoType.I, RotateType.UP, RotateType.UP, 'drop', 0,
            defaultDrop, noCorner
        );
        // Clear 2: Single (combo 1)
        scoreSystem.onLock(
            1, TetrominoType.I, RotateType.UP, RotateType.UP, 'drop', 0,
            defaultDrop, noCorner
        );
        // Clear 3: Double (combo 2) -> +1 combo garbage
        const result = scoreSystem.onLock(
            2, TetrominoType.I, RotateType.UP, RotateType.UP, 'drop', 0,
            defaultDrop, noCorner
        );
        expect(result.combo).toBe(2);
        expect(result.garbage).toBe(2); // 1 base + 1 combo
    });

    test('high combo adds more garbage', () => {
        // Build up combo to 4 (combo 4-5 adds +2)
        for (let i = 0; i < 4; i++) {
            scoreSystem.onLock(
                1, TetrominoType.I, RotateType.UP, RotateType.UP, 'drop', 0,
                defaultDrop, noCorner
            );
        }
        // 5th consecutive clear: combo = 4 -> +2 combo garbage
        const result = scoreSystem.onLock(
            2, TetrominoType.I, RotateType.UP, RotateType.UP, 'drop', 0,
            defaultDrop, noCorner
        );
        expect(result.combo).toBe(4);
        expect(result.garbage).toBe(3); // 1 base + 2 combo
    });

    test('combo resets on no-clear lock', () => {
        // Build combo
        scoreSystem.onLock(
            1, TetrominoType.I, RotateType.UP, RotateType.UP, 'drop', 0,
            defaultDrop, noCorner
        );
        scoreSystem.onLock(
            1, TetrominoType.I, RotateType.UP, RotateType.UP, 'drop', 0,
            defaultDrop, noCorner
        );

        // No clear -> combo reset
        scoreSystem.onLock(
            0, TetrominoType.I, RotateType.UP, RotateType.UP, 'drop', 0,
            defaultDrop, noCorner
        );

        // Next clear: combo = 0
        const result = scoreSystem.onLock(
            2, TetrominoType.I, RotateType.UP, RotateType.UP, 'drop', 0,
            defaultDrop, noCorner
        );
        expect(result.combo).toBe(0);
        expect(result.garbage).toBe(1); // Just base, no combo bonus
    });

    test('Back-to-Back T-Spin Double adds b2b bonus garbage', () => {
        const tSpinCorner = { pointSide: 2, flatSide: 1 };

        // T-Spin Double
        scoreSystem.onLock(
            2, TetrominoType.T, RotateType.UP, RotateType.RIGHT, 'rotate', 0,
            defaultDrop, tSpinCorner
        );

        // Back-to-Back T-Spin Double
        const result = scoreSystem.onLock(
            2, TetrominoType.T, RotateType.UP, RotateType.RIGHT, 'rotate', 0,
            defaultDrop, tSpinCorner
        );
        expect(result.isBackToBack).toBe(true);
        // 4 base + 1 b2b = 5 (combo is 1, <2 so no combo bonus)
        expect(result.garbage).toBe(5);
    });
});

describe('ScoreSystem - getStats', () => {
    let scoreSystem: ScoreSystem;

    beforeEach(() => {
        scoreSystem = new ScoreSystem();
    });

    test('returns initial stats', () => {
        const stats = scoreSystem.getStats(0);
        expect(stats.score).toBe(0);
        expect(stats.level).toBe(1);
        expect(stats.lines).toBe(0);
        expect(stats.time).toBe('00:00.00');
        expect(stats.tetrises).toBe(0);
        expect(stats.tspins).toBe(0);
        expect(stats.combos).toBe(0);
        expect(stats.tpm).toBe(0);
        expect(stats.lpm).toBe(0);
    });

    test('formats time correctly', () => {
        // 1 minute 30 seconds 500ms
        const stats = scoreSystem.getStats(90500);
        expect(stats.time).toBe('01:30.50');
    });

    test('tracks tetris count', () => {
        scoreSystem.onLock(
            4, TetrominoType.I, RotateType.UP, RotateType.UP, 'drop', 0,
            { softDrop: 0, hardDrop: 0, autoDrop: 0 },
            { pointSide: 0, flatSide: 0 }
        );
        const stats = scoreSystem.getStats(60000);
        expect(stats.tetrises).toBe(1);
    });

    test('tracks T-Spin count', () => {
        scoreSystem.onLock(
            2, TetrominoType.T, RotateType.UP, RotateType.RIGHT, 'rotate', 0,
            { softDrop: 0, hardDrop: 0, autoDrop: 0 },
            { pointSide: 2, flatSide: 1 }
        );
        const stats = scoreSystem.getStats(60000);
        expect(stats.tspins).toBe(1);
    });

    test('computes TPM and LPM', () => {
        // Lock 6 pieces clearing 12 lines in 2 minutes
        for (let i = 0; i < 6; i++) {
            scoreSystem.onLock(
                2, TetrominoType.I, RotateType.UP, RotateType.UP, 'drop', 0,
                { softDrop: 0, hardDrop: 0, autoDrop: 0 },
                { pointSide: 0, flatSide: 0 }
            );
        }
        const stats = scoreSystem.getStats(120000); // 2 minutes
        expect(stats.tpm).toBe(3); // 6 pieces / 2 minutes
        expect(stats.lpm).toBe(6); // 12 lines / 2 minutes
    });

    test('goal decreases as lines are cleared', () => {
        const statsBefore = scoreSystem.getStats(0);
        const initialGoal = statsBefore.goal;

        scoreSystem.onLock(
            1, TetrominoType.I, RotateType.UP, RotateType.UP, 'drop', 0,
            { softDrop: 0, hardDrop: 0, autoDrop: 0 },
            { pointSide: 0, flatSide: 0 }
        );

        const statsAfter = scoreSystem.getStats(0);
        expect(statsAfter.goal).toBeLessThan(initialGoal);
    });
});

describe('ScoreSystem - Auto Drop Delay', () => {
    let scoreSystem: ScoreSystem;

    beforeEach(() => {
        scoreSystem = new ScoreSystem();
    });

    test('level 1 has base drop delay', () => {
        const delay = scoreSystem.getAutoDropDelay();
        // Formula: (0.8 - (0 * 0.007))^0 * 1000 = 1 * 1000 = 1000
        expect(delay).toBe(1000);
    });

    test('drop delay decreases as level increases', () => {
        const delayL1 = scoreSystem.getAutoDropDelay();

        // Level up by clearing a Tetris
        scoreSystem.onLock(
            4, TetrominoType.I, RotateType.UP, RotateType.UP, 'drop', 0,
            { softDrop: 0, hardDrop: 0, autoDrop: 0 },
            { pointSide: 0, flatSide: 0 }
        );

        const delayL2 = scoreSystem.getAutoDropDelay();
        expect(delayL2).toBeLessThan(delayL1);
    });
});

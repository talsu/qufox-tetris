import { ScoreSystem } from "../../../src/tetris/logic/scoreSystem";
import { TetrominoType, RotateType } from "../../../src/tetris/const/const";

describe('ScoreSystem', () => {
    let scoreSystem: ScoreSystem;

    beforeEach(() => {
        scoreSystem = new ScoreSystem();
    });

    test('initial state', () => {
        expect(scoreSystem.getScore()).toBe(0);
        expect(scoreSystem.getLevel()).toBe(1);
        expect(scoreSystem.getClearedLines()).toBe(0);
    });

    test('Single clear updates score and lines', () => {
        const result = scoreSystem.onLock(
            1, TetrominoType.I, RotateType.UP, RotateType.UP, 'drop', 0,
            { softDrop: 0, hardDrop: 0, autoDrop: 0 },
            { pointSide: 0, flatSide: 0 }
        );

        expect(result.scoreAdded).toBe(100);
        expect(scoreSystem.getScore()).toBe(100);
        expect(scoreSystem.getClearedLines()).toBe(1);
        expect(result.actionName).toBe('Single');
    });

    test('Tetris clear updates score and lines', () => {
        const result = scoreSystem.onLock(
            4, TetrominoType.I, RotateType.UP, RotateType.UP, 'drop', 0,
            { softDrop: 0, hardDrop: 0, autoDrop: 0 },
            { pointSide: 0, flatSide: 0 }
        );

        expect(result.scoreAdded).toBe(800);
        expect(scoreSystem.getScore()).toBe(800);
        expect(result.actionName).toBe('Tetris');
    });

    test('Back to Back Tetris', () => {
        // First Tetris
        scoreSystem.onLock(4, TetrominoType.I, RotateType.UP, RotateType.UP, 'drop', 0, { softDrop: 0, hardDrop: 0, autoDrop: 0 }, { pointSide: 0, flatSide: 0 });

        // Second Tetris
        const result = scoreSystem.onLock(
            4, TetrominoType.I, RotateType.UP, RotateType.UP, 'drop', 0,
            { softDrop: 0, hardDrop: 0, autoDrop: 0 },
            { pointSide: 0, flatSide: 0 }
        );

        // 800 * 1.5 = 1200 * Level 2 + Combo 100 = 2500
        expect(result.scoreAdded).toBe(2500);
        expect(result.isBackToBack).toBe(true);
        expect(result.actionName).toContain('Back to Back');
    });

    test('Level up', () => {
        const result = scoreSystem.onLock(
            4, TetrominoType.I, RotateType.UP, RotateType.UP, 'drop', 0,
            { softDrop: 0, hardDrop: 0, autoDrop: 0 },
            { pointSide: 0, flatSide: 0 }
        );

        // Tetris gives 8 lines count. Level 1 requires 5. Should level up.
        expect(scoreSystem.getLevel()).toBeGreaterThan(1);
    });
});

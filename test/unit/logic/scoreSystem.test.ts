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

    test('T-Spin Mini Double uses configured base score', () => {
        const result = scoreSystem.onLock(
            2, TetrominoType.T, RotateType.UP, RotateType.RIGHT, 'rotate', 0,
            { softDrop: 0, hardDrop: 0, autoDrop: 0 },
            { pointSide: 1, flatSide: 2 }
        );

        expect(result.actionName).toBe('T-Spin Mini Double');
        expect(result.scoreAdded).toBe(400);
    });

    test('J-Spin Single keeps base line-clear scoring and adds only label', () => {
        const result = scoreSystem.onLock(
            1, TetrominoType.J, RotateType.UP, RotateType.RIGHT, 'rotate', 0,
            { softDrop: 0, hardDrop: 0, autoDrop: 0 },
            { pointSide: 0, flatSide: 0 },
            { isImmobile: true }
        );

        expect(result.actionName).toBe('J-Spin Single');
        expect(result.scoreAdded).toBe(100);
    });

    test('labels non-T spins by tetromino type', () => {
        const nonTTypes = [
            TetrominoType.I,
            TetrominoType.J,
            TetrominoType.L,
            TetrominoType.O,
            TetrominoType.S,
            TetrominoType.Z,
        ];

        for (const type of nonTTypes) {
            const isolatedScoreSystem = new ScoreSystem();
            const result = isolatedScoreSystem.onLock(
                1, type, RotateType.UP, RotateType.RIGHT, 'rotate', 0,
                { softDrop: 0, hardDrop: 0, autoDrop: 0 },
                { pointSide: 0, flatSide: 0 },
                { isImmobile: true }
            );
            expect(result.actionName).toBe(`${type}-Spin Single`);
            expect(result.scoreAdded).toBe(100);
        }
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

        // First tetris keeps level 1 (4 lines).
        // 2nd tetris: 800 * 1.5 * level1 + combo(50*1*1) = 1250
        expect(result.scoreAdded).toBe(1250);
        expect(result.isBackToBack).toBe(true);
        expect(result.actionName).toContain('Back to Back');
    });

    test('Level up', () => {
        const result = scoreSystem.onLock(
            4, TetrominoType.I, RotateType.UP, RotateType.UP, 'drop', 0,
            { softDrop: 0, hardDrop: 0, autoDrop: 0 },
            { pointSide: 0, flatSide: 0 }
        );

        // Single tetris clears 4 lines, so level should stay at 1 (need 5 lines).
        expect(scoreSystem.getLevel()).toBe(1);

        scoreSystem.onLock(1, TetrominoType.I, RotateType.UP, RotateType.UP, 'drop', 0, { softDrop: 0, hardDrop: 0, autoDrop: 0 }, { pointSide: 0, flatSide: 0 });
        expect(scoreSystem.getLevel()).toBe(2);
    });
});

import { ScoreSystem } from '../../src/tetris/logic/scoreSystem';
import { TetrominoType, RotateType } from '../../src/tetris/const/const';

describe('ScoreSystem Statistics', () => {
    let scoreSystem: ScoreSystem;

    beforeEach(() => {
        scoreSystem = new ScoreSystem();
    });

    test('should track Total Lines Cleared', () => {
        scoreSystem.onLock(
            1, TetrominoType.I, RotateType.UP, RotateType.UP, 'autoDrop', 0,
            { softDrop: 0, hardDrop: 0, autoDrop: 0 }, { pointSide: 0, flatSide: 0 }
        );
        expect(scoreSystem.getStats(0).lines).toBe(1);

        scoreSystem.onLock(
            4, TetrominoType.I, RotateType.UP, RotateType.UP, 'autoDrop', 0,
            { softDrop: 0, hardDrop: 0, autoDrop: 0 }, { pointSide: 0, flatSide: 0 }
        );
        expect(scoreSystem.getStats(0).lines).toBe(5);
    });

    test('should track Tetrises count', () => {
        // Single
        scoreSystem.onLock(1, TetrominoType.I, RotateType.UP, RotateType.UP, 'autoDrop', 0, { softDrop: 0, hardDrop: 0, autoDrop: 0 }, {pointSide:0, flatSide:0});
        expect(scoreSystem.getStats(0).tetrises).toBe(0);

        // Tetris
        scoreSystem.onLock(4, TetrominoType.I, RotateType.UP, RotateType.UP, 'autoDrop', 0, { softDrop: 0, hardDrop: 0, autoDrop: 0 }, {pointSide:0, flatSide:0});
        expect(scoreSystem.getStats(0).tetrises).toBe(1);
    });

    test('should track T-Spins count', () => {
        // Normal T lock
        scoreSystem.onLock(
            0, TetrominoType.T, RotateType.UP, RotateType.UP, 'autoDrop', 0, { softDrop: 0, hardDrop: 0, autoDrop: 0 }, { pointSide: 0, flatSide: 0 }
        );
        expect(scoreSystem.getStats(0).tspins).toBe(0);

        // T-Spin
        scoreSystem.onLock(
            1, TetrominoType.T, RotateType.RIGHT, RotateType.UP, 'rotate', 0, { softDrop: 0, hardDrop: 0, autoDrop: 0 }, { pointSide: 3, flatSide: 0 }
        );
        expect(scoreSystem.getStats(0).tspins).toBe(1);
    });

    test('should track Max Combo', () => {
        // 1st Line Clear (Combo 0)
        scoreSystem.onLock(1, TetrominoType.I, RotateType.UP, RotateType.UP, 'autoDrop', 0, { softDrop: 0, hardDrop: 0, autoDrop: 0 }, {pointSide:0, flatSide:0});
        expect(scoreSystem.getStats(0).combos).toBe(0);

        // 2nd Line Clear (Combo 1)
        scoreSystem.onLock(1, TetrominoType.I, RotateType.UP, RotateType.UP, 'autoDrop', 0, { softDrop: 0, hardDrop: 0, autoDrop: 0 }, {pointSide:0, flatSide:0});
        expect(scoreSystem.getStats(0).combos).toBe(1);

        // Break Combo
        scoreSystem.onLock(0, TetrominoType.I, RotateType.UP, RotateType.UP, 'autoDrop', 0, { softDrop: 0, hardDrop: 0, autoDrop: 0 }, {pointSide:0, flatSide:0});

        // Stats should still show max combo
        expect(scoreSystem.getStats(0).combos).toBe(1);
    });

    test('should calculate TPM and LPM', () => {
        // 1 minute (60000ms)
        // 100 pieces locked, 200 lines cleared

        // Mock internal state manipulation for test
        for(let i=0; i<60; i++) {
             scoreSystem.onLock(2, TetrominoType.I, RotateType.UP, RotateType.UP, 'autoDrop', 0, { softDrop: 0, hardDrop: 0, autoDrop: 0 }, {pointSide:0, flatSide:0});
        }

        // 60 pieces, 120 lines.
        // At 1 minute.
        const stats = scoreSystem.getStats(60000);
        expect(stats.tpm).toBe(60);
        expect(stats.lpm).toBe(120);
    });

    test('should format time correctly', () => {
        // 1 min 30 sec 500 ms -> 01:30.50
        // 90500 ms
        const stats = scoreSystem.getStats(90500);
        expect(stats.time).toBe('01:30.50');
    });
});

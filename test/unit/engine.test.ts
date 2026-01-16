// Mock dependencies
const mockPlayField = {
    listeners: {} as Record<string, Function[]>,
    on: jest.fn((event, callback) => {
        if (!mockPlayField.listeners[event]) mockPlayField.listeners[event] = [];
        mockPlayField.listeners[event].push(callback);
    }),
    emit: jest.fn((event, ...args) => {
        if (mockPlayField.listeners[event]) {
            mockPlayField.listeners[event].forEach(cb => cb(...args));
        }
    }),
    clear: jest.fn(),
    spawnTetromino: jest.fn(),
    getInactiveBlocks: jest.fn().mockReturnValue([]),
    autoDropDelay: 0
};
const mockHoldBox = {
    clear: jest.fn(),
    hold: jest.fn()
};
const mockQueue = {
    clear: jest.fn(),
    randomTypeGenerator: jest.fn()
};
const mockLevelIndicator = {
    clear: jest.fn(),
    setLevel: jest.fn(),
    setLine: jest.fn(),
    setScore: jest.fn(),
    setAction: jest.fn(),
    setCombo: jest.fn()
};

import { Engine } from '../../src/tetris/engine';
import { PlayField } from '../../src/tetris/objects/playField';
import { TetrominoBox } from '../../src/tetris/objects/tetrominoBox';
import { TetrominoBoxQueue } from '../../src/tetris/objects/tetrominoBoxQueue';
import { LevelIndicator } from '../../src/tetris/objects/levelIndicator';
import { TetrominoType, RotateType } from '../../src/tetris/const/const';

describe('Engine', () => {
    let engine: Engine;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        mockPlayField.listeners = {};

        engine = new Engine(
            mockPlayField as any as PlayField,
            mockHoldBox as any as TetrominoBox,
            mockQueue as any as TetrominoBoxQueue,
            mockLevelIndicator as any as LevelIndicator
        );
        engine.start();
    });

    test('should start game and reset stats', () => {
        expect(mockPlayField.clear).toHaveBeenCalled();
        expect(mockHoldBox.clear).toHaveBeenCalled();
        expect(mockQueue.clear).toHaveBeenCalled();
        expect(mockLevelIndicator.setLevel).toHaveBeenCalledWith(1);
        expect(mockLevelIndicator.setScore).toHaveBeenCalledWith(0);
        expect(mockPlayField.spawnTetromino).toHaveBeenCalled();
    });

    test('should calculate score for single line clear', () => {
        mockPlayField.emit('lock',
            1, // clearedLineCount
            TetrominoType.I,
            RotateType.UP,
            RotateType.UP,
            'down',
            0,
            { softDrop: 0, hardDrop: 0, autoDrop: 0 },
            { pointSide: 0, flatSide: 0 }
        );

        // Score: Base 100 * level 1 = 100.
        expect(mockLevelIndicator.setScore).toHaveBeenCalledWith(100);
        expect(mockLevelIndicator.setAction).toHaveBeenCalledWith('Single');
    });

    test('should calculate score for Tetris (4 lines)', () => {
        mockPlayField.emit('lock',
            4,
            TetrominoType.I,
            RotateType.UP,
            RotateType.UP,
            'down',
            0,
            { softDrop: 0, hardDrop: 0, autoDrop: 0 },
            { pointSide: 0, flatSide: 0 }
        );

        // Score: Base 800 * level 1 = 800.
        expect(mockLevelIndicator.setScore).toHaveBeenCalledWith(800);
        expect(mockLevelIndicator.setAction).toHaveBeenCalledWith('Tetris');
    });

    test('should handle Back-to-Back Tetris', () => {
        // First Tetris
        // Score: 800.
        // Lines added: 8 (CONST.LINE_COUNT.Tetris).
        // Level up: 8 >= 5 -> Level 2.
        mockPlayField.emit('lock', 4, TetrominoType.I, RotateType.UP, RotateType.UP, 'down', 0, { softDrop: 0, hardDrop: 0, autoDrop: 0 }, { pointSide: 0, flatSide: 0 });

        // Second Tetris (Back-to-Back)
        // Level: 2.
        // B2B Bonus: 1.5.
        // Score: 800 * 1.5 * 2 = 2400.
        // Combo: 1. Score: 50 * 1 * 2 = 100.
        // Total added: 2500.
        // Total Score: 800 + 2500 = 3300.
        mockPlayField.emit('lock', 4, TetrominoType.I, RotateType.UP, RotateType.UP, 'down', 0, { softDrop: 0, hardDrop: 0, autoDrop: 0 }, { pointSide: 0, flatSide: 0 });

        expect(mockLevelIndicator.setScore).toHaveBeenLastCalledWith(3300);
        expect(mockLevelIndicator.setAction).toHaveBeenCalledWith('Back to Back Tetris');
    });

    test('should detect T-Spin', () => {
        // T-Spin Double
        // T piece, rotated, corner occupied > 2
        mockPlayField.emit('lock',
            2, // Double
            TetrominoType.T,
            RotateType.RIGHT, // Dropped rotation
            RotateType.UP, // Locked rotation (implies last move was rotate)
            'rotate', // Movement
            0, // Kick index
            { softDrop: 0, hardDrop: 0, autoDrop: 0 },
            { pointSide: 2, flatSide: 1 } // 3 corners
        );

        // T-Spin Double Base: 1200
        expect(mockLevelIndicator.setScore).toHaveBeenCalledWith(1200);
        expect(mockLevelIndicator.setAction).toHaveBeenCalledWith('T-Spin Double');
    });

    test('should level up after clearing lines', () => {
        // Level 1 requires 5 lines.
        // Clear 4 lines (Tetris)
        mockPlayField.emit('lock', 4, TetrominoType.I, RotateType.UP, RotateType.UP, 'down', 0, { softDrop: 0, hardDrop: 0, autoDrop: 0 }, { pointSide: 0, flatSide: 0 });
        expect(mockLevelIndicator.setLevel).toHaveBeenCalledWith(1);

        // Clear 1 more line
        mockPlayField.emit('lock', 1, TetrominoType.I, RotateType.UP, RotateType.UP, 'down', 0, { softDrop: 0, hardDrop: 0, autoDrop: 0 }, { pointSide: 0, flatSide: 0 });

        // Should be level 2 now
        expect(mockLevelIndicator.setLevel).toHaveBeenCalledWith(2);
    });
});

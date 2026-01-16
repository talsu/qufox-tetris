import { Tetromino } from '../../src/tetris/objects/tetromino';
import { TetrominoType, RotateType } from '../../src/tetris/const/const';
import PhaserMock from '../mocks/phaserMock';

describe('Tetromino', () => {
    let mockScene: any;

    beforeEach(() => {
        mockScene = new PhaserMock.Scene();
    });

    test('should initialize with correct type and position', () => {
        const tetromino = new Tetromino(mockScene, TetrominoType.T, [], 5, 5);
        expect(tetromino.type).toBe(TetrominoType.T);
        expect(tetromino.col).toBe(5);
        expect(tetromino.row).toBe(5);
    });

    test('should move left', () => {
        const tetromino = new Tetromino(mockScene, TetrominoType.T, [], 5, 5);
        const success = tetromino.moveLeft();
        expect(success).toBe(true);
        expect(tetromino.col).toBe(4);
    });

    test('should move right', () => {
        const tetromino = new Tetromino(mockScene, TetrominoType.T, [], 5, 5);
        const success = tetromino.moveRight();
        expect(success).toBe(true);
        expect(tetromino.col).toBe(6);
    });

    test('should move down', () => {
        const tetromino = new Tetromino(mockScene, TetrominoType.T, [], 5, 5);
        const success = tetromino.moveDown('softDrop');
        expect(success).toBe(true);
        expect(tetromino.row).toBe(6);
    });

    test('should fail to move if blocked', () => {
        const blockedPositions = [[4, 6]];
        const tetromino = new Tetromino(mockScene, TetrominoType.I, blockedPositions, 5, 5);
        const success = tetromino.moveLeft();
        expect(success).toBe(false);
        expect(tetromino.col).toBe(5);
    });

    test('should rotate clockwise (SRS)', () => {
        const tetromino = new Tetromino(mockScene, TetrominoType.T, [], 5, 5);
        expect(tetromino.rotateType).toBe(RotateType.UP);

        const success = tetromino.rotate(true);
        expect(success).toBe(true);
        expect(tetromino.rotateType).toBe(RotateType.RIGHT);
    });

    test('should wall kick when rotating near wall', () => {
        // Spawn I piece at safe location (5, 5)
        const iPiece = new Tetromino(mockScene, TetrominoType.I, [], 5, 5);
        expect(iPiece.isSpawnSuccess).toBe(true);

        // Rotate to RIGHT
        iPiece.rotate(true);
        expect(iPiece.rotateType).toBe(RotateType.RIGHT);

        // Move to wall (col 7)
        iPiece.moveRight(); // 6
        iPiece.moveRight(); // 7
        expect(iPiece.col).toBe(7);

        // Now rotate Left (Anti-clockwise) -> UP
        // Normal rotation would put it at (7, 5) with UP orientation
        // UP blocks at 7: (7,6), (8,6), (9,6), (10,6) -> 10 is invalid
        // Kick should move it to 6.

        const success = iPiece.rotate(false);

        expect(success).toBe(true);
        expect(iPiece.rotateType).toBe(RotateType.UP);
        expect(iPiece.col).toBe(6); // Should have kicked left by 1.
    });
});

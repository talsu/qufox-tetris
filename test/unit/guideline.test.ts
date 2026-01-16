import { PlayField } from '../../src/tetris/objects/playField';
import { Tetromino } from '../../src/tetris/objects/tetromino';
import { TetrominoType, RotateType } from '../../src/tetris/const/const';
import PhaserMock from '../mocks/phaserMock';

describe('2009 Guideline Compliance', () => {
    let playField: PlayField;
    let mockScene: any;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        mockScene = new PhaserMock.Scene();
        playField = new PlayField(mockScene, 0, 0, 300, 600);

        // Handle random type generation to prevent undefined type errors
        playField.on('generateRandomType', (callback: (type: TetrominoType) => void) => {
            callback(TetrominoType.T);
        });

        // Force spawn a tetromino to test input handling
        playField.spawnTetromino(TetrominoType.T);
    });

    test('Extended Placement: Lock delay should reset on movement', () => {
        const tetromino = (playField as any).activeTetromino;
        // Mock isLockable to return true (simulating hitting ground)
        tetromino.isLockable = jest.fn().mockReturnValue(true);

        // Mock animation methods to prevent actual locking logic execution during this test
        // We only want to verify that the "timer" (animation) is restarted
        tetromino.playLockAnimation = jest.fn();
        tetromino.stopLockAnimation = jest.fn();

        // Spy on PlayField methods to verify orchestration
        const stopSpy = jest.spyOn(playField, 'stopLockTimer');
        const startSpy = jest.spyOn(playField, 'startLockTimer');

        // Initial state
        expect(tetromino.manipulationCount).toBe(0);

        // Simulate a successful move input that triggers lock timer check
        playField.setLockTimer(true);

        expect(stopSpy).toHaveBeenCalled();
        expect(startSpy).toHaveBeenCalled();

        // Check that playLockAnimation was called (which starts the "timer")
        expect(tetromino.playLockAnimation).toHaveBeenCalled();
    });

    test('Extended Placement: Lock delay reset limit (15 moves)', () => {
        const tetromino = (playField as any).activeTetromino;
        tetromino.isLockable = jest.fn().mockReturnValue(true);
        tetromino.playLockAnimation = jest.fn();
        tetromino.stopLockAnimation = jest.fn();

        const stopSpy = jest.spyOn(playField, 'stopLockTimer');
        const startSpy = jest.spyOn(playField, 'startLockTimer');

        // Perform 15 manipulations
        for (let i = 0; i < 15; i++) {
            tetromino.manipulationCount = i; // Simulate count in Tetromino
            playField.setLockTimer(true);

            // Should reset
            expect(stopSpy).toHaveBeenCalledTimes(i + 1);
            expect(startSpy).toHaveBeenCalledTimes(i + 1);
        }

        // 16th manipulation (manipulationCount = 15)
        stopSpy.mockClear();
        startSpy.mockClear();
        (tetromino.playLockAnimation as jest.Mock).mockClear();

        tetromino.manipulationCount = 15;
        playField.setLockTimer(true);

        // If manipulationCount >= 15, we expect it to do NOTHING.
        // This allows the EXISTING timer to continue running without reset.

        expect(stopSpy).not.toHaveBeenCalled();
        expect(startSpy).not.toHaveBeenCalled();
        expect(tetromino.playLockAnimation).not.toHaveBeenCalled();
    });

    test('Spawn Position: I Piece', () => {
        // Re-create I piece to check spawn
        const iPiece = new Tetromino(mockScene, TetrominoType.I, []);
        expect(iPiece.col).toBe(3);

        // I piece blocks Y offsets: 1 (from const BLOCKS.I[0])
        // Init row is -2.
        // Block Ys should be -2 + 1 = -1.
        const blocks = iPiece.getBlocks();
        blocks.forEach(b => expect(b[1]).toBe(-1));
    });

    test('Spawn Position: T Piece', () => {
        const tPiece = new Tetromino(mockScene, TetrominoType.T, []);
        expect(tPiece.col).toBe(3);
        expect(tPiece.row).toBe(-2);

        const blocks = tPiece.getBlocks();
        const yCoords = blocks.map(b => b[1]);
        // T piece (UP): [[1, 0], [0, 1], [1, 1], [2, 1]]
        // Row -2.
        // Ys: -2+0=-2, -2+1=-1.
        expect(yCoords).toContain(-2);
        expect(yCoords).toContain(-1);
    });

    test('Game Over: Lock Out condition', () => {
        // Mock game over listener
        const gameOverSpy = jest.fn();
        playField.on('gameOver', gameOverSpy);

        const tetromino = (playField as any).activeTetromino;
        // Mock locking logic to bypass animation
        tetromino.playLockAnimation = (cb: Function) => cb();

        // Force position entirely above visible area (rows < 0)
        tetromino.row = -5; // well above
        // Update block positions (usually handled by move)
        // We can just rely on getBlocks() using this.row

        // Ensure it's considered lockable so lock() proceeds
        tetromino.isLockable = jest.fn().mockReturnValue(true);

        // Trigger lock
        playField.lock();

        expect(gameOverSpy).toHaveBeenCalledWith('Lock Out');
    });
});

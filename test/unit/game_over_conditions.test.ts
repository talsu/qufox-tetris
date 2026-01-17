import { PlayField } from '../../src/tetris/objects/playField';
import { Tetromino } from '../../src/tetris/objects/tetromino';
import { TetrominoType, CONST } from '../../src/tetris/const/const';
import { Scene } from '../mocks/phaserMock';

describe('Game Over Conditions', () => {
    let scene: any;
    let playField: PlayField;

    beforeEach(() => {
        scene = new Scene();
        playField = new PlayField(scene, 0, 0, 300, 600);

        // Mock random type generator to prevent crash in delayed spawnTetromino calls
        playField.on('generateRandomType', (callback: Function) => {
            callback(TetrominoType.I);
        });
    });

    test('Block Out (Game Over)', (done) => {
        // Fill the spawn area with blocks
        const blocks = [];
        // Spawn usually happens around row -2, col 3-6.
        // Let's block the entire spawn area.
        for (let r = -4; r < 0; r++) {
            for (let c = 3; c < 7; c++) {
                blocks.push({ col: c, row: r, type: TetrominoType.I });
            }
        }

        // Add dummy tetromino to block the space
        const dummy = new Tetromino(scene, TetrominoType.I, [], 0, 0);
        dummy.setInactiveBlocks(blocks);
        playField['inactiveTetrominos'].push(dummy);

        playField.on('gameOver', (reason: string) => {
            expect(reason).toBe('Block Out');
            done();
        });

        playField.spawnTetromino(TetrominoType.T);
    });

    test('Lock Out (Game Over)', (done) => {
        playField.spawnTetromino(TetrominoType.I);
        const tetromino = playField['activeTetromino'];

        // Move it completely above Skyline (row 0)
        // I-piece is 4x1 or 1x4.
        // Let's force it to row -5.
        // We can use private move method or just set col/row and update
        tetromino['move'](3, -5, 'test');

        // Mock isLockable to true so it locks immediately
        jest.spyOn(tetromino, 'isLockable').mockReturnValue(true);

        playField.on('gameOver', (reason: string) => {
            expect(reason).toBe('Lock Out');
            done();
        });

        playField.lock();
    });

    test('Lock Down - Peeking (No Game Over)', () => {
        playField.spawnTetromino(TetrominoType.T);
        const tPiece = playField['activeTetromino'];

        // T UP: [[1, 0], [0, 1], [1, 1], [2, 1]]
        // If row is -1.
        // Block 0: row 0 + (-1) = -1 (Above Skyline)
        // Block 1: row 1 + (-1) = 0 (At/Below Skyline)
        // This is Peeking.
        tPiece['move'](3, -1, 'test');

        const gameOverSpy = jest.fn();
        playField.on('gameOver', gameOverSpy);

        // Mock lockable
        jest.spyOn(tPiece, 'isLockable').mockReturnValue(true);

        playField.lock();

        expect(gameOverSpy).not.toHaveBeenCalled();
        // Should be in inactive list
        expect(playField['inactiveTetrominos']).toContain(tPiece);
    });

    test('Existing Blocks Forced Up (No Game Over)', () => {
        // Place a block at row 10.
        const blocks = [{ col: 0, row: 10, type: TetrominoType.I }];
        const dummy = new Tetromino(scene, TetrominoType.I, [], 0, 0);
        dummy.setInactiveBlocks(blocks);
        playField['inactiveTetrominos'].push(dummy);

        const gameOverSpy = jest.fn();
        playField.on('gameOver', gameOverSpy);

        // Push up by 15. New row: 10 - 15 = -5.
        // -5 is > -20. So inside buffer zone. No Game Over.
        playField.insertGarbage(15);

        expect(gameOverSpy).not.toHaveBeenCalled();
        // Verify position
        const updatedBlocks = dummy.getBlocks();
        expect(updatedBlocks[0][1]).toBe(-5);
    });

    test('Top Out (Game Over)', (done) => {
        // Place a block at row -10.
        const blocks = [{ col: 0, row: -10, type: TetrominoType.I }];
        const dummy = new Tetromino(scene, TetrominoType.I, [], 0, 0);
        dummy.setInactiveBlocks(blocks);
        playField['inactiveTetrominos'].push(dummy);

        playField.on('gameOver', (reason: string) => {
            expect(reason).toBe('Top Out');
            done();
        });

        // Push up by 15. New row: -10 - 15 = -25.
        // -25 < -20 (Buffer Zone top is -20). Top Out.
        playField.insertGarbage(15);
    });
});

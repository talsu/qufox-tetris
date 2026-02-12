import { PlayField } from '../../src/tetris/objects/playField';
import { TetrominoType, CONST } from '../../src/tetris/const/const';
import { Scene } from '../mocks/phaserMock';

function access(obj: any): any {
    return obj;
}

describe('Line Clear and Garbage Race Condition', () => {
    let scene: any;
    let playField: PlayField;

    beforeEach(() => {
        jest.useFakeTimers();
        scene = new Scene();
        playField = new PlayField(scene, 0, 0, 300, 600);
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    test('should correctly clear lines even if garbage is inserted during animation', () => {
        // 1. Setup a full line at the bottom (row 19)
        const blocks = [];
        for (let col = 0; col < CONST.PLAY_FIELD.COL_COUNT; col++) {
            blocks.push({ col, row: CONST.PLAY_FIELD.ROW_COUNT - 1, type: TetrominoType.I });
        }
        // Add one block above (row 18) to verify it falls correctly
        blocks.push({ col: 0, row: CONST.PLAY_FIELD.ROW_COUNT - 2, type: TetrominoType.J });
        
        access(playField).deserialize(blocks);
        
        expect(access(playField).inactiveTetrominos.length).toBe(1);
        
        // 2. Trigger lock (with a dummy active tetromino that is lockable at row 19)
        const lockedTetromino = access(playField).inactiveTetrominos[0];
        const clearedRows = playField.getClearedRows(lockedTetromino);
        expect(clearedRows).toEqual([CONST.PLAY_FIELD.ROW_COUNT - 1]);

        // Start clear animation (mocking what PlayField.lock does)
        let clearRowsCalled = false;
        access(playField).pendingClearedRows = clearedRows;
        playField.playClearAnimation(clearedRows, () => {
            if (access(playField).pendingClearedRows) {
                playField.clearRows(access(playField).pendingClearedRows);
                access(playField).pendingClearedRows = null;
            }
            clearRowsCalled = true;
        });

        // 3. During animation delay (400ms), insert garbage
        // Fast forward a bit but not to completion
        jest.advanceTimersByTime(200);
        
        // Insert 1 line of garbage
        // This will move row 19 to 18, and row 18 to 17.
        playField.insertGarbage(1);
        
        // 4. Complete animation
        jest.advanceTimersByTime(200);
        
        expect(clearRowsCalled).toBe(true);

        // 5. Verify results
        const inactiveBlocks = playField.getInactiveBlocks();
        
        // The garbage line (inserted at row 19)
        const row19Blocks = inactiveBlocks.filter(b => b[1] === CONST.PLAY_FIELD.ROW_COUNT - 1);
        expect(row19Blocks.length).toBe(CONST.PLAY_FIELD.COL_COUNT - 1); 
        
        // The block that was at row 18 (moved to 17, should fall back to 18)
        const row18Blocks = inactiveBlocks.filter(b => b[1] === CONST.PLAY_FIELD.ROW_COUNT - 2);
        expect(row18Blocks.some(b => b[0] === 0)).toBe(true);
        
        // The line that was at row 19 (moved to 18) should be GONE.
        // If bug exists, row 18 will have 11 blocks (10 from full line + 1 fallen block).
        expect(row18Blocks.length).toBe(1); 
    });
});

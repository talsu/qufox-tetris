import { PlayField } from '../../src/tetris/objects/playField';
import { Tetromino } from '../../src/tetris/objects/tetromino';
import { TetrominoType, CONST } from '../../src/tetris/const/const';
import * as Phaser from 'phaser';

describe('PlayField Line Clear Bug', () => {
    let scene: any;
    let playField: PlayField;

    beforeEach(() => {
        scene = new Phaser.Scene();
        // Setup simple PlayField
        playField = new PlayField(scene, 0, 0, 100, 200);
    });

    test('should fail to clear lines correctly if rows are processed bottom-up (19 then 18)', () => {
        // Setup state:
        // Row 18: Full (represented by one tetromino block for simplicity)
        // Row 19: Full (represented by one tetromino block)
        // Row 17: Block that should fall to 19 after clearing 18 and 19.

        // Create mock tetrominos
        // We use a simplified mock that mimics the behavior needed for clearLine

        // Block at 17 (Mock)
        const block17 = {
            container: { destroy: jest.fn(), remove: jest.fn() },
            destroy: jest.fn(),
            clearLine: jest.fn(),
            moveBlockImages: jest.fn(),
            getBlocks: () => [[0, 17]],
            row: 0,
            inactiveBlocks: [[0, 17]]
        };
        // Implement clearLine logic manually for the mock to track state changes
        (block17.clearLine as jest.Mock).mockImplementation((row: number) => {
            // Remove block if it matches row (using inactiveBlocks)
            const initialLen = block17.inactiveBlocks.length;
            block17.inactiveBlocks = block17.inactiveBlocks.filter(b => row !== (block17.row + b[1]));
            const removed = initialLen !== block17.inactiveBlocks.length;

            // Shift down blocks above
            block17.inactiveBlocks.forEach(b => {
                if (row > (block17.row + b[1])) {
                    b[1] += 1;
                }
            });
            return block17.inactiveBlocks.length === 0;
        });

        // Block at 18
        const block18 = {
            container: { destroy: jest.fn(), remove: jest.fn() },
            destroy: jest.fn(),
            clearLine: jest.fn(),
            moveBlockImages: jest.fn(),
            getBlocks: () => [[0, 18]],
            row: 0,
            inactiveBlocks: [[0, 18]]
        };
        (block18.clearLine as jest.Mock).mockImplementation((row: number) => {
            const initialLen = block18.inactiveBlocks.length;
            block18.inactiveBlocks = block18.inactiveBlocks.filter(b => row !== (block18.row + b[1]));
            block18.inactiveBlocks.forEach(b => {
                if (row > (block18.row + b[1])) {
                    b[1] += 1;
                }
            });
            return block18.inactiveBlocks.length === 0;
        });

        // Block at 19
        const block19 = {
            container: { destroy: jest.fn(), remove: jest.fn() },
            destroy: jest.fn(),
            clearLine: jest.fn(),
            moveBlockImages: jest.fn(),
            getBlocks: () => [[0, 19]],
            row: 0,
            inactiveBlocks: [[0, 19]]
        };
        (block19.clearLine as jest.Mock).mockImplementation((row: number) => {
             const initialLen = block19.inactiveBlocks.length;
            block19.inactiveBlocks = block19.inactiveBlocks.filter(b => row !== (block19.row + b[1]));
            block19.inactiveBlocks.forEach(b => {
                if (row > (block19.row + b[1])) {
                    b[1] += 1;
                }
            });
            return block19.inactiveBlocks.length === 0;
        });

        // Inject into playField
        (playField as any).inactiveTetrominos = [block17, block18, block19] as any;

        // Execute clearRows with problematic order: [19, 18]
        playField.clearRows([19, 18]);

        // Assertions

        // 1. Block 19 should be removed.
        expect(block19.inactiveBlocks.length).toBe(0);

        // 2. Block 18 should be removed.
        // IF BUGGY: Block 18 moves to 19 (when 19 is cleared first), then when 18 is cleared, it misses the block (now at 19).
        // So Block 18 remains (at row 19).
        // IF FIXED: Block 18 cleared first. Block 17 moves to 18. Then 19 cleared. 17(at 18) moves to 19.

        // Check block18 status
        const isBlock18Remaining = block18.inactiveBlocks.length > 0;

        // Check block17 position
        // It started at 17.
        // If correct: 17 -> 19.
        // If buggy (19 then 18):
        //   Clear 19: 17->17 (19>17).
        //   Clear 18: 17->18.
        //   Result: 17 ends at 18.
        const block17Row = block17.inactiveBlocks[0][1];

        // We expect this to FAIL if the code is not sorting rows.
        // So we write the expectation for the CORRECT behavior.
        expect(isBlock18Remaining).toBe(false); // Should be cleared
        expect(block17Row).toBe(19); // Should have fallen 2 rows
    });
});

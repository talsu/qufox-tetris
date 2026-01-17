import { PlayField } from '../../src/tetris/objects/playField';
import * as Phaser from 'phaser';

describe('PlayField Complex Clear', () => {
    let scene: any;
    let playField: PlayField;

    beforeEach(() => {
        scene = new Phaser.Scene();
        playField = new PlayField(scene, 0, 0, 100, 200);
    });

    test('should correctly clear lines 15 and 19 and shift blocks appropriately', () => {
        // Mock Tetromino helper
        const createMockTetromino = (row: number, relRows: number[]) => {
            const t: any = {
                container: { destroy: jest.fn(), remove: jest.fn() },
                destroy: jest.fn(),
                moveBlockImages: jest.fn(),
                row: row,
                inactiveBlocks: relRows.map(r => [0, r]),
                getBlocks: () => t.inactiveBlocks.map(b => [0, t.row + b[1]]),
                animateBlocksInRows: jest.fn()
            };

            // Implement clearLine logic (copied from source)
            t.clearLine = (rowToClear: number) => {
                const initialLen = t.inactiveBlocks.length;
                t.inactiveBlocks = t.inactiveBlocks.filter(b => rowToClear !== (t.row + b[1]));
                // t.moveBlockImages(); // mocked

                // Shift logic
                t.inactiveBlocks.forEach(b => {
                    if (rowToClear > (t.row + b[1])) {
                        b[1] += 1;
                    }
                });
                return t.inactiveBlocks.length === 0;
            };
            return t;
        };

        // Scenario:
        // T1 at Row 10. (Blocks at 10). Should shift 2 (15 & 19). End at 12.
        // T2 at Row 15. (Blocks at 15). Should be cleared.
        // T3 at Row 17. (Blocks at 17). Should shift 1 (19). End at 18.
        // T4 at Row 19. (Blocks at 19). Should be cleared.
        // T5 at Row 20. (Blocks at 20). Should stay at 20.

        const t1 = createMockTetromino(10, [0]);
        const t2 = createMockTetromino(15, [0]);
        const t3 = createMockTetromino(17, [0]);
        const t4 = createMockTetromino(19, [0]);
        const t5 = createMockTetromino(20, [0]);

        (playField as any).inactiveTetrominos = [t1, t2, t3, t4, t5];

        // Execute clearRows with UNSORTED array to verify sorting
        playField.clearRows([19, 15]);

        // Check T2 and T4 removed
        expect(t2.inactiveBlocks.length).toBe(0);
        expect(t4.inactiveBlocks.length).toBe(0);

        // Check T5 (Row 20)
        // 20 > 15 (False). 20 > 19 (False). Stay 20.
        // Note: t5.row is 20. b[1] is 0. Abs 20.
        expect(t5.inactiveBlocks[0][1] + t5.row).toBe(20);

        // Check T3 (Row 17)
        // 17 > 15 (False).
        // 17 < 19. Shift 1. End 18.
        expect(t3.inactiveBlocks[0][1] + t3.row).toBe(18);

        // Check T1 (Row 10)
        // 10 < 15. Shift 1 -> 11.
        // 11 < 19. Shift 1 -> 12.
        expect(t1.inactiveBlocks[0][1] + t1.row).toBe(12);
    });

    test('should handle multi-block tetromino split by clear', () => {
         const createMockTetromino = (row: number, relRows: number[]) => {
            const t: any = {
                container: { destroy: jest.fn(), remove: jest.fn() },
                destroy: jest.fn(),
                moveBlockImages: jest.fn(),
                row: row,
                inactiveBlocks: relRows.map(r => [0, r]),
                getBlocks: () => t.inactiveBlocks.map(b => [0, t.row + b[1]]),
                animateBlocksInRows: jest.fn()
            };
            t.clearLine = (rowToClear: number) => {
                t.inactiveBlocks = t.inactiveBlocks.filter(b => rowToClear !== (t.row + b[1]));
                t.inactiveBlocks.forEach(b => {
                    if (rowToClear > (t.row + b[1])) {
                        b[1] += 1;
                    }
                });
                return t.inactiveBlocks.length === 0;
            };
            return t;
        };

        // T1 spans 14, 15, 16. (Base 14. Rel 0, 1, 2).
        // Clear 15.
        // 14 should shift to 15.
        // 15 removed.
        // 16 stays at 16.
        // Result: Blocks at 15 and 16.
        const t1 = createMockTetromino(14, [0, 1, 2]);

        (playField as any).inactiveTetrominos = [t1];
        playField.clearRows([15]);

        expect(t1.inactiveBlocks.length).toBe(2);

        // Check blocks
        const rows = t1.inactiveBlocks.map(b => t1.row + b[1]).sort();
        // Original 14 (Rel 0). 15 > 14 True. Rel 0 -> 1. Abs 14+1 = 15.
        // Original 16 (Rel 2). 15 > 16 False. Rel 2 -> 2. Abs 14+2 = 16.
        expect(rows).toEqual([15, 16]);
    });
});

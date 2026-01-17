
import {CONST, TetrominoType} from "../const/const";

/**
 * Logic for generating garbage lines.
 */
export class GarbageGenerator {

    /**
     * Generates a batch of garbage blocks with a single hole.
     * @param count Number of lines to generate.
     * @param previousHoleIndex The column index of the hole in the topmost garbage line (to ensure offset). -1 if none.
     * @returns Object containing the list of lines (each line is an array of blocks) and the new hole index.
     */
    static generate(count: number, previousHoleIndex: number = -1): { lines: any[][], holeIndex: number } {
        let holeIndex;

        // Ensure the new hole is not in the same column as the previous one (Tetris Guideline)
        if (previousHoleIndex !== -1) {
            // Shift 1 to (ColCount-1)
            const shift = Math.floor(Math.random() * (CONST.PLAY_FIELD.COL_COUNT - 1)) + 1;
            holeIndex = (previousHoleIndex + shift) % CONST.PLAY_FIELD.COL_COUNT;
        } else {
            holeIndex = Math.floor(Math.random() * CONST.PLAY_FIELD.COL_COUNT);
        }

        const lines = [];
        for (let i = 0; i < count; i++) {
            const lineBlocks = [];
            // Fill bottom-most rows.
            const targetRow = CONST.PLAY_FIELD.ROW_COUNT - 1 - i;

            for (let col = 0; col < CONST.PLAY_FIELD.COL_COUNT; col++) {
                if (col !== holeIndex) {
                    lineBlocks.push({ col: col, row: targetRow, type: TetrominoType.GARBAGE });
                }
            }
            lines.push(lineBlocks);
        }

        return { lines, holeIndex };
    }
}

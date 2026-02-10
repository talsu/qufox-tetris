import { GarbageGenerator } from '../../../src/tetris/logic/garbageGenerator';
import { CONST, TetrominoType } from '../../../src/tetris/const/const';

describe('GarbageGenerator', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('generates correct number of lines', () => {
        const { lines } = GarbageGenerator.generate(3);
        expect(lines).toHaveLength(3);
    });

    test('each line has COL_COUNT - 1 blocks (one hole)', () => {
        const { lines } = GarbageGenerator.generate(2);
        for (const line of lines) {
            expect(line).toHaveLength(CONST.PLAY_FIELD.COL_COUNT - 1);
        }
    });

    test('all blocks have GARBAGE type', () => {
        const { lines } = GarbageGenerator.generate(2);
        for (const line of lines) {
            for (const block of line) {
                expect(block.type).toBe(TetrominoType.GARBAGE);
            }
        }
    });

    test('lines fill from bottom rows upward', () => {
        const { lines } = GarbageGenerator.generate(3);
        // First line at row 19 (bottom), second at 18, third at 17
        expect(lines[0][0].row).toBe(CONST.PLAY_FIELD.ROW_COUNT - 1);
        expect(lines[1][0].row).toBe(CONST.PLAY_FIELD.ROW_COUNT - 2);
        expect(lines[2][0].row).toBe(CONST.PLAY_FIELD.ROW_COUNT - 3);
    });

    test('all lines within a batch share the same hole index', () => {
        const { lines, holeIndex } = GarbageGenerator.generate(5);
        for (const line of lines) {
            const cols = new Set(line.map(b => b.col));
            // The hole should be missing
            expect(cols.has(holeIndex)).toBe(false);
            // All other columns should be present
            for (let c = 0; c < CONST.PLAY_FIELD.COL_COUNT; c++) {
                if (c !== holeIndex) {
                    expect(cols.has(c)).toBe(true);
                }
            }
        }
    });

    test('returns holeIndex within valid range', () => {
        for (let i = 0; i < 20; i++) {
            const { holeIndex } = GarbageGenerator.generate(1);
            expect(holeIndex).toBeGreaterThanOrEqual(0);
            expect(holeIndex).toBeLessThan(CONST.PLAY_FIELD.COL_COUNT);
        }
    });

    test('hole index is at expected position for deterministic random', () => {
        // Mock random to return 0.5 -> floor(0.5 * 10) = 5
        jest.spyOn(global.Math, 'random').mockReturnValue(0.5);
        const { holeIndex } = GarbageGenerator.generate(1);
        expect(holeIndex).toBe(5);
    });

    test('ensures different hole from previous when previousHoleIndex is provided', () => {
        const previousHole = 3;
        // Mock random to control shift: floor(0.5 * 9) + 1 = 5
        // New hole = (3 + 5) % 10 = 8
        jest.spyOn(global.Math, 'random').mockReturnValue(0.5);
        const { holeIndex } = GarbageGenerator.generate(1, previousHole);
        expect(holeIndex).toBe(8);
        expect(holeIndex).not.toBe(previousHole);
    });

    test('new hole is never same as previous hole', () => {
        // Test across many random values
        for (let prev = 0; prev < CONST.PLAY_FIELD.COL_COUNT; prev++) {
            for (let r = 0; r < 10; r++) {
                jest.spyOn(global.Math, 'random').mockReturnValueOnce(r / 10);
                const { holeIndex } = GarbageGenerator.generate(1, prev);
                expect(holeIndex).not.toBe(prev);
            }
        }
    });

    test('generates zero lines for count 0', () => {
        const { lines } = GarbageGenerator.generate(0);
        expect(lines).toHaveLength(0);
    });

    test('generates single line correctly', () => {
        const { lines, holeIndex } = GarbageGenerator.generate(1);
        expect(lines).toHaveLength(1);
        expect(lines[0]).toHaveLength(CONST.PLAY_FIELD.COL_COUNT - 1);

        const cols = lines[0].map(b => b.col);
        expect(cols).not.toContain(holeIndex);
    });
});

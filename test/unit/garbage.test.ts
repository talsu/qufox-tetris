import { PlayField } from '../../src/tetris/objects/playField';
import { TetrominoType, CONST } from '../../src/tetris/const/const';
import { Scene, Math as PhaserMath } from '../mocks/phaserMock';

// We need to access the private properties of PlayField to verify state.
// Helper to cast to any.
function access(obj: any): any {
    return obj;
}

describe('Garbage Line (Broken Line) Implementation', () => {
    let scene: any;
    let playField: PlayField;

    beforeEach(() => {
        scene = new Scene();
        playField = new PlayField(scene, 0, 0, 300, 600);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('should insert garbage lines from bottom with same hole for single attack', () => {
        const garbageCount = 3;
        
        // Mock Math.random to return a fixed value for the hole index.
        // Phaser.Math.Between(0, 9) uses Math.random().
        // If we want hole at index 5:
        // floor(random * 10) + 0 = 5 => random must be between 0.5 and 0.6
        jest.spyOn(global.Math, 'random').mockReturnValue(0.55);

        playField.insertGarbage(garbageCount);

        const inactiveTetrominos = access(playField).inactiveTetrominos;
        
        // Expect 3 garbage tetrominos
        expect(inactiveTetrominos.length).toBe(3);

        // Verify each line
        // They are pushed: i=0 (row 19), i=1 (row 18), i=2 (row 17)
        // inactiveTetrominos array order depends on push order.
        // Implementation:
        // for (let i = 0; i < count; i++) { ... push ... }
        // So first pushed is row 19 (bottom), last is row 17 (top of garbage).

        // Get blocks from each
        const line0 = inactiveTetrominos[0].getBlocks(); // row 19
        const line1 = inactiveTetrominos[1].getBlocks(); // row 18
        const line2 = inactiveTetrominos[2].getBlocks(); // row 17

        // Helper to find hole
        const findHole = (blocks: any[], row: number) => {
            const cols = new Set(blocks.map(b => b[0]));
            for (let c = 0; c < CONST.PLAY_FIELD.COL_COUNT; c++) {
                if (!cols.has(c)) return c;
            }
            return -1;
        };

        const hole0 = findHole(line0, CONST.PLAY_FIELD.ROW_COUNT - 1);
        const hole1 = findHole(line1, CONST.PLAY_FIELD.ROW_COUNT - 2);
        const hole2 = findHole(line2, CONST.PLAY_FIELD.ROW_COUNT - 3);

        // Expect holes to be 5 (from our mock)
        expect(hole0).toBe(5);
        expect(hole1).toBe(5);
        expect(hole2).toBe(5);

        // Verify rows are correct
        expect(line0[0][1]).toBe(CONST.PLAY_FIELD.ROW_COUNT - 1);
        expect(line1[0][1]).toBe(CONST.PLAY_FIELD.ROW_COUNT - 2);
        expect(line2[0][1]).toBe(CONST.PLAY_FIELD.ROW_COUNT - 3);
    });

    test('should shift existing blocks up when inserting garbage', () => {
        // Spawn a piece and let it lock at the bottom (or mock it)
        // Let's manually add a dummy block at row 19 (bottom)
        const dummyBlock = { col: 0, row: CONST.PLAY_FIELD.ROW_COUNT - 1, type: TetrominoType.O };
        access(playField).deserialize([dummyBlock]); 
        
        let inactiveTetrominos = access(playField).inactiveTetrominos;
        expect(inactiveTetrominos.length).toBe(1);
        expect(inactiveTetrominos[0].getBlocks()[0][1]).toBe(CONST.PLAY_FIELD.ROW_COUNT - 1);

        // Insert 1 line of garbage
        playField.insertGarbage(1);

        // Existing block should move up by 1 (row 19 -> row 18)
        expect(inactiveTetrominos[0].getBlocks()[0][1]).toBe(CONST.PLAY_FIELD.ROW_COUNT - 2);
        
        // New garbage line should be at row 19
        inactiveTetrominos = access(playField).inactiveTetrominos;
        expect(inactiveTetrominos.length).toBe(2);
        const garbage = inactiveTetrominos[1]; // Pushed after
        expect(garbage.getBlocks()[0][1]).toBe(CONST.PLAY_FIELD.ROW_COUNT - 1);
    });

    test('should change hole position for separate attacks', () => {
        // Attack 1: 1 line, hole at 2 (random 0.25)
        jest.spyOn(global.Math, 'random').mockReturnValueOnce(0.25);
        playField.insertGarbage(1);

        // Attack 2: 1 line, hole at 7 (random 0.75)
        jest.spyOn(global.Math, 'random').mockReturnValueOnce(0.75);
        playField.insertGarbage(1);

        const inactiveTetrominos = access(playField).inactiveTetrominos;
        expect(inactiveTetrominos.length).toBe(2);

        // First garbage: shifted up (row 18). Hole was 2.
        const blocks1 = inactiveTetrominos[0].getBlocks();
        const hole1 = blocks1.find(b => b[1] === CONST.PLAY_FIELD.ROW_COUNT - 2) ? undefined : -1; 
        // Logic to find hole:
        const cols1 = new Set(blocks1.map(b => b[0]));
        expect(cols1.has(2)).toBe(false);
        expect(cols1.has(0)).toBe(true);

        // Second garbage: row 19.
        // Logic: Previous Hole (2) + Shift.
        // Random 0.75 -> Shift: floor(0.75 * 9) + 1 = 7.
        // New Hole = (2 + 7) % 10 = 9.
        
        const blocks2 = inactiveTetrominos[1].getBlocks();
        const cols2 = new Set(blocks2.map(b => b[0]));
        
        // Hole is 9, so col 7 should be present.
        expect(cols2.has(7)).toBe(true);
        // Col 9 should be missing (hole).
        expect(cols2.has(9)).toBe(false);
        expect(cols2.has(0)).toBe(true);
    });

    test('should ensure different hole position from previous garbage line', () => {
        // Attack 1: Hole at 5
        jest.spyOn(global.Math, 'random').mockReturnValue(0.55); // 5
        playField.insertGarbage(1);
        
        const garbage1 = access(playField).inactiveTetrominos[0];
        // Check hole 5
        const blocks1 = garbage1.getBlocks();
        const cols1 = new Set(blocks1.map(b => b[0]));
        expect(cols1.has(5)).toBe(false);

        // Attack 2: Mock random to return 5 again
        jest.spyOn(global.Math, 'random').mockReturnValue(0.55); // 5 again
        playField.insertGarbage(1);
        
        const garbage2 = access(playField).inactiveTetrominos[1];
        // Check hole should NOT be 5
        const blocks2 = garbage2.getBlocks();
        const cols2 = new Set(blocks2.map(b => b[0]));
        
        // This expectation will FAIL with current implementation
        expect(cols2.has(5)).toBe(true); // Should HAVE column 5 (meaning hole is NOT 5)
    });
});

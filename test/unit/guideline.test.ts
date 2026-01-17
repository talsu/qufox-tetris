import { TetrominoBoxQueue } from '../../src/tetris/objects/tetrominoBoxQueue';
import { Tetromino } from '../../src/tetris/objects/tetromino';
import { PlayField } from '../../src/tetris/objects/playField';
import { Engine } from '../../src/tetris/engine';
import { TetrominoType, RotateType, CONST } from '../../src/tetris/const/const';
import { Scene } from '../mocks/phaserMock';

describe('2009 Tetris Guideline Compliance', () => {
    let scene: any;

    beforeEach(() => {
        scene = new Scene();
    });

    describe('7-Bag Random Generator', () => {
        test('should generate a sequence containing all 7 tetromino types in every 7 generations', () => {
            const queue = new TetrominoBoxQueue(scene, 0, 0, 5);
            const typesGenerated: TetrominoType[] = [];

            // Generate 7 types
            for (let i = 0; i < 7; i++) {
                typesGenerated.push(queue.randomTypeGenerator());
            }

            // Check if all 7 unique types are present
            const uniqueTypes = new Set(typesGenerated);
            expect(uniqueTypes.size).toBe(7);
            expect(uniqueTypes.has(TetrominoType.I)).toBeTruthy();
            expect(uniqueTypes.has(TetrominoType.T)).toBeTruthy();
            expect(uniqueTypes.has(TetrominoType.O)).toBeTruthy();
            expect(uniqueTypes.has(TetrominoType.L)).toBeTruthy();
            expect(uniqueTypes.has(TetrominoType.J)).toBeTruthy();
            expect(uniqueTypes.has(TetrominoType.S)).toBeTruthy();
            expect(uniqueTypes.has(TetrominoType.Z)).toBeTruthy();

            // Generate another 7
            typesGenerated.length = 0;
            for (let i = 0; i < 7; i++) {
                typesGenerated.push(queue.randomTypeGenerator());
            }
            const uniqueTypes2 = new Set(typesGenerated);
            expect(uniqueTypes2.size).toBe(7);
        });
    });

    describe('Hold Piece', () => {
        test('should allow holding a piece and swapping it', () => {
            const playField = new PlayField(scene, 0, 0, 300, 600);

            // Initial spawn
            playField.spawnTetromino(TetrominoType.T);
            const initialPiece = playField['activeTetromino'];
            expect(initialPiece.type).toBe(TetrominoType.T);

            // Mock the hold receiver callback
            const onHold = jest.fn();
            playField.on('hold', onHold);

            // Perform Hold
            playField.onInput('hold', 'press' as any);

            // Expect 'hold' event to be emitted with the held type
            expect(onHold).toHaveBeenCalled();
            const heldType = onHold.mock.calls[0][0]; // First arg
            expect(heldType).toBe(TetrominoType.T);
        });
    });

    describe('Super Rotation System (SRS)', () => {
        test('T-Piece should rotate clockwise (0->R)', () => {
            const tetromino = new Tetromino(scene, TetrominoType.T);
            // Default spawn: col 3, row -2. RotateType UP (0)

            // Move to a safe place
            tetromino['move'](5, 5, 'test');

            const success = tetromino.rotate(true); // Clockwise
            expect(success).toBe(true);
            expect(tetromino.rotateType).toBe(RotateType.RIGHT);
        });

        test('I-Piece should kick when blocked', () => {
            const tetromino = new Tetromino(scene, TetrominoType.I);

            // Force move to 5,5
            tetromino['move'](5, 5, 'test');

            // Mock blocked positions logic (via isValidPosition override)
            const originalIsValid = tetromino.isValidPosition.bind(tetromino);

            jest.spyOn(tetromino, 'isValidPosition').mockImplementation((rot, col, row) => {
                // If checking the basic rotation (offset 0,0), fail
                if (col === 5 && row === 5) return false;
                // If checking the first kick (offset -2, 0 -> newCol 3, newRow 5), pass
                if (col === 3 && row === 5) return true;

                return originalIsValid(rot, col, row);
            });

            const success = tetromino.rotate(true); // 0 -> R

            expect(success).toBe(true);
            expect(tetromino.rotateType).toBe(RotateType.RIGHT);
            expect(tetromino.col).toBe(3); // Kicked -2
        });
    });

    describe('Extended Placement (Lock Down)', () => {
         test('should lock after 500ms if not manipulated', () => {
            jest.useFakeTimers();
            const playField = new PlayField(scene, 0, 0, 300, 600);
            playField.spawnTetromino(TetrominoType.T);
            const tetromino = playField['activeTetromino'];

            // Move down to bottom to trigger lockable state
            // Mock isLockable to return true
            jest.spyOn(tetromino, 'isLockable').mockReturnValue(true);

            // Trigger moveDown (autoDrop) which starts lock timer
            playField['startLockTimer']();

            // Fast forward 500ms
            jest.advanceTimersByTime(500);

            // Verify the piece is locked (active is null, inactive list has it)
            expect(playField['activeTetromino']).toBeNull();
            expect(playField['inactiveTetrominos'].length).toBeGreaterThan(0);
         });

         test('should reset lock timer on manipulation up to 15 times', () => {
             // To test this, we need to inspect 'manipulationCount' on the tetromino
             const tetromino = new Tetromino(scene, TetrominoType.T);
             tetromino['move'](5, 18, 'test'); // Bottom

             // Mock isLockable
             jest.spyOn(tetromino, 'isLockable').mockReturnValue(true);

             // Initial state
             expect(tetromino.manipulationCount).toBe(0);

             // Move Right
             tetromino.moveRight();
             expect(tetromino.manipulationCount).toBe(1);

             // Rotate
             tetromino.rotate(true);
             expect(tetromino.manipulationCount).toBe(2);

             // Do 13 more
             // Wiggle back and forth to ensure validity
             for(let i=0; i<13; i++) {
                 if (i % 2 === 0) tetromino.moveLeft();
                 else tetromino.moveRight();
             }
             expect(tetromino.manipulationCount).toBe(15);

             // 16th move
             tetromino.moveRight();
             expect(tetromino.manipulationCount).toBe(16);
         });
    });

    describe('Scoring System', () => {
        let engine: Engine;
        let playField: PlayField;
        let holdBox: any;
        let queue: TetrominoBoxQueue;
        let levelIndicator: any;

        beforeEach(() => {
            playField = new PlayField(scene, 0, 0, 300, 600);
            holdBox = { clear: jest.fn(), hold: jest.fn() };
            queue = new TetrominoBoxQueue(scene, 0, 0, 5);
            levelIndicator = {
                clear: jest.fn(),
                setLevel: jest.fn(),
                setLine: jest.fn(),
                setScore: jest.fn(),
                setAction: jest.fn(),
                setCombo: jest.fn(),
                updateStats: jest.fn()
            };

            engine = new Engine(playField, holdBox, queue, levelIndicator);
        });

        test('Single Line Clear', () => {
            engine.onLock(
                1, // 1 line
                TetrominoType.I,
                RotateType.UP, RotateType.UP,
                'autoDrop',
                0,
                { softDrop: 0, hardDrop: 0, autoDrop: 0 },
                { pointSide: 0, flatSide: 0 }
            );

            expect(engine.getScore()).toBe(100); // Level 1 Single
        });

        test('Tetris (4 lines)', () => {
            engine.onLock(
                4,
                TetrominoType.I,
                RotateType.UP, RotateType.UP,
                'autoDrop',
                0,
                { softDrop: 0, hardDrop: 0, autoDrop: 0 },
                { pointSide: 0, flatSide: 0 }
            );

            expect(engine.getScore()).toBe(800); // Level 1 Tetris
        });

        test('Back-to-Back Tetris', () => {
             // First Tetris
             engine.onLock(4, TetrominoType.I, RotateType.UP, RotateType.UP, 'autoDrop', 0, {softDrop:0,hardDrop:0,autoDrop:0}, {pointSide:0,flatSide:0});
             let score1 = engine.getScore(); // 800

             // Second Tetris
             engine.onLock(4, TetrominoType.I, RotateType.UP, RotateType.UP, 'autoDrop', 0, {softDrop:0,hardDrop:0,autoDrop:0}, {pointSide:0,flatSide:0});

             let score2 = engine.getScore() - score1;

             // Level 2 (triggered by first tetris)
             // Base 800 * B2B 1.5 * Level 2 = 2400
             // Combo 1 (50*1*2) = 100
             // Total 2500
             expect(score2).toBe(2500);
        });

        test('T-Spin Double', () => {
            // T-Spin conditions: T type, rotated, 3 corners occupied
            engine.onLock(
                2, // Double
                TetrominoType.T,
                RotateType.RIGHT, RotateType.UP, // Rotated (dropped != locked)
                'rotate', // Last move was rotate
                0,
                { softDrop: 0, hardDrop: 0, autoDrop: 0 },
                { pointSide: 3, flatSide: 0 } // 3 corners
            );

            expect(engine.getScore()).toBe(1200); // Level 1 T-Spin Double
        });
    });
});

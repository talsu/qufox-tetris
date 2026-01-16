import { TetrominoBoxQueue } from '../../src/tetris/objects/tetrominoBoxQueue';
import { CONST } from '../../src/tetris/const/const';
import PhaserMock from '../mocks/phaserMock';

describe('TetrominoBoxQueue', () => {
    let queue: TetrominoBoxQueue;
    let mockScene: any;

    beforeEach(() => {
        mockScene = new PhaserMock.Scene();
        // queueSize 5
        queue = new TetrominoBoxQueue(mockScene, 0, 0, 5);
    });

    test('should generate 7-bag random sequence', () => {
        const generatedTypes: string[] = [];
        // Generate enough types to cover multiple bags
        for (let i = 0; i < 70; i++) {
            generatedTypes.push(queue.randomTypeGenerator());
        }

        // Check each bag of 7
        for (let i = 0; i < 10; i++) {
            const bag = generatedTypes.slice(i * 7, (i + 1) * 7);
            const uniqueTypes = new Set(bag);

            // In 7-bag system, every 7 pieces must contain all 7 tetromino types exactly once
            expect(uniqueTypes.size).toBe(7);
            expect(bag).toContain('I');
            expect(bag).toContain('J');
            expect(bag).toContain('L');
            expect(bag).toContain('O');
            expect(bag).toContain('S');
            expect(bag).toContain('T');
            expect(bag).toContain('Z');
        }
    });

    test('should fill queue initially', () => {
        const type = queue.randomTypeGenerator();
        expect(CONST.TETROMINO.TYPES).toContain(type);
    });
});

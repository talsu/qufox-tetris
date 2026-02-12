import { BotManager } from "../../../src/tetris/logic/botManager";
import { TetrominoType, RotateType, InputState } from "../../../src/tetris/const/const";

// Mock objects
const mockEngine = {
    onInput: jest.fn(),
    queueInstance: {
        peek: jest.fn().mockReturnValue(TetrominoType.T)
    },
    holdBoxInstance: {
        type: null
    }
} as any;

const mockPlayField = {
    activeTetrominoInstance: {
        type: TetrominoType.T,
        col: 4,
        row: 0,
        rotateType: RotateType.UP
    },
    getInactiveBlocks: jest.fn().mockReturnValue([]),
    canHoldFlag: true
} as any;

describe('BotManager', () => {
    let botManager: BotManager;

    beforeEach(() => {
        jest.clearAllMocks();
        botManager = new BotManager(mockEngine, mockPlayField, 100);
    });

    test('should adjust input delay based on botLevel', () => {
        const highLevelBot = new BotManager(mockEngine, mockPlayField, 100);
        const lowLevelBot = new BotManager(mockEngine, mockPlayField, 1);
        
        expect((highLevelBot as any).nextInputDelay).toBeLessThan((lowLevelBot as any).nextInputDelay);
    });

    test('should calculate a move and populate input queue when started', () => {
        botManager.start();
        
        // Mock time for update
        botManager.update(1000, 16);
        
        expect((botManager as any).currentTarget).not.toBeNull();
        expect((botManager as any).inputQueue.length).toBeGreaterThan(0);
    });

    test('should execute inputs over time', () => {
        botManager.start();
        
        // First update to calculate target and generate queue
        botManager.update(1000, 16);
        const initialQueueLength = (botManager as any).inputQueue.length;
        
        // Second update after some delay to execute first input
        const delay = (botManager as any).nextInputDelay + 10;
        botManager.update(1000 + delay, 16);
        
        expect(mockEngine.onInput).toHaveBeenCalled();
        expect((botManager as any).inputQueue.length).toBe(initialQueueLength - 1);
    });

    test('should handle hold action if evaluated as best move', () => {
        // Force a situation where holding might be better (though heuristic is simple)
        // For now, we just test if useHold logic in generateInputQueue works
        (botManager as any).currentTarget = { col: 5, rotate: RotateType.UP, useHold: true, type: TetrominoType.T };
        (botManager as any).generateInputQueue({ rotateType: RotateType.UP, col: 3 });
        
        expect((botManager as any).inputQueue).toContain('hold');
    });

    test('should stop executing when stopped', () => {
        botManager.start();
        botManager.update(1000, 16);
        botManager.stop();
        
        const delay = (botManager as any).nextInputDelay + 10;
        botManager.update(1000 + delay, 16);
        
        // Should not have executed more inputs after stop
        // Note: the first update might have already triggered one if we aren't careful, 
        // but here we check if it continues.
        const callsAfterStop = mockEngine.onInput.mock.calls.length;
        botManager.update(1000 + delay * 2, 16);
        expect(mockEngine.onInput.mock.calls.length).toBe(callsAfterStop);
    });

    test('evaluateBoard should penalize holes', () => {
        const blocksWithNoHoles: [number, number][] = [[0, 19], [1, 19], [2, 19]];
        const blocksWithHole: [number, number][] = [[0, 18], [0, 19]]; // Hole at (0, 19) is covered by (0, 18)
        
        // We need to use private method access for testing evaluation
        const scoreNoHoles = (botManager as any).evaluateBoard([[3, 19]], blocksWithNoHoles);
        const scoreWithHole = (botManager as any).evaluateBoard([[0, 17]], blocksWithHole);
        
        // Higher score is better. scoreWithHole should be lower because it has a hole.
        // Actually, evaluateBoard calculates for the WHOLE board including new blocks.
        // Let's refine the test to be more direct.
        const normalBoard: [number, number][] = [[0, 19], [1, 19], [2, 19], [3, 19], [4, 19], [5, 19], [6, 19], [7, 19], [8, 19]];
        const holeBoard: [number, number][] = [[0, 18], [1, 19], [2, 19], [3, 19], [4, 19], [5, 19], [6, 19], [7, 19], [8, 19]]; // Hole at (0, 19)

        const scoreNormal = (botManager as any).evaluateBoard([[9, 19]], normalBoard); // Completes a line
        const scoreHole = (botManager as any).evaluateBoard([[9, 19]], holeBoard); // Completes a line but still has a hole

        expect(scoreNormal).toBeGreaterThan(scoreHole);
    });
});

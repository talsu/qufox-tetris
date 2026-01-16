import { PlayField } from '../../src/tetris/objects/playField';
import { TetrominoType, CONST } from '../../src/tetris/const/const';
import { Scene } from '../mocks/phaserMock';

function access(obj: any): any {
    return obj;
}

describe('Garbage Collision Update Bug', () => {
    let scene: any;
    let playField: PlayField;

    beforeEach(() => {
        scene = new Scene();
        playField = new PlayField(scene, 0, 0, 300, 600);
    });

    test('Active tetromino should update blocked positions after garbage insertion', () => {
        // 1. Spawn a piece
        playField.spawnTetromino(TetrominoType.T);
        const activeTetromino = access(playField).activeTetromino;
        expect(activeTetromino).not.toBeNull();

        // Initial blocked positions should be empty (or contain whatever was there, assuming empty field)
        expect(access(activeTetromino).blockedPositions.length).toBe(0);

        // 2. Insert Garbage
        // This will add blocks to PlayField and move active piece up.
        playField.insertGarbage(5);

        // PlayField now has inactive blocks
        const inactiveBlocks = playField.getInactiveBlocks();
        expect(inactiveBlocks.length).toBeGreaterThan(0);

        // 3. Check Active Tetromino's blocked positions
        // BUG EXPECTATION: The active tetromino still has 0 blocked positions, 
        // because it wasn't notified of the update.
        const currentBlockedPositions = access(activeTetromino).blockedPositions;
        
        // If the bug exists, this will be 0.
        // If the bug is fixed, this should equal inactiveBlocks.length.
        // We write the test to FAIL if the bug exists (or pass if we assert the bug behavior).
        // Since I want to PROVE the bug, I will assert the incorrect behavior first or assert the correct behavior and watch it fail.
        
        // I will assert the CORRECT behavior, so the test fails, confirming the bug.
        expect(currentBlockedPositions.length).toBe(inactiveBlocks.length);
    });
});

import { Tetromino } from '../../src/tetris/objects/tetromino';
import { TetrominoType } from '../../src/tetris/const/const';
import * as Phaser from 'phaser';

describe('Tetromino Visual Sync', () => {
    let scene: any;

    beforeEach(() => {
        scene = new Phaser.Scene();
        // Mock tweens
        scene.tweens = { add: jest.fn() };
    });

    test('should maintain sync between inactiveBlocks and blockImages when clearing a line', () => {
        // Create Tetromino (Type I)
        const t = new Tetromino(scene, TetrominoType.I, [], 0, 0);

        // Manually setup inactiveBlocks to simulate a mixed state (like after deserialization)
        // Block A at Row 10. Block B at Row 12.
        // t.row is 0.
        t['inactiveBlocks'] = [[0, 10], [0, 12]];

        // Manually setup blockImages
        // We need to access the private container.
        const imagesContainer = t['blockImages'];
        imagesContainer.removeAll(true); // Clear defaults

        const imgA: any = scene.add.image(0, 0, 'texture', 'frameA');
        imgA.name = 'ImageA';
        const imgB: any = scene.add.image(0, 0, 'texture', 'frameB');
        imgB.name = 'ImageB';

        imagesContainer.add(imgA);
        imagesContainer.add(imgB);

        // Verify initial state
        expect(t['inactiveBlocks'].length).toBe(2);
        expect(imagesContainer.list.length).toBe(2);
        expect(imagesContainer.list[0]).toBe(imgA);
        expect(imagesContainer.list[1]).toBe(imgB);

        // Clear Row 10 (Block A).
        // This should remove Block A and Image A.
        // Block B should remain (shifted if logic allows, but here 10 is cleared).
        // 10 is above 12. 12 should shift to? 10 > 12 is False.
        // Wait, 10 < 12. Row 10 cleared.
        // 10 > (0 + 12) False.
        // So Block B stays at 12.
        // (Wait, clearing a row usually shifts upper blocks. 12 is BELOW 10. So it stays.)

        t.clearLine(10);

        // Check Logic
        expect(t['inactiveBlocks'].length).toBe(1);
        expect(t['inactiveBlocks'][0]).toEqual([0, 12]); // Block B remains

        // Check Visuals (THE BUG CHECK)
        // Current implementation uses splice on array, but does NOT remove from image container explicitly by index/ref.
        // Then calls moveBlockImages which reassigns list[0] to Block B.
        // So Image A (list[0]) will be used for Block B.
        // Image B (list[1]) will be hidden.

        // If bug exists:
        // list[0] is still imgA.
        // list[1] is still imgB.
        // imgA is visible. imgB is hidden.

        // We WANT:
        // imgA destroyed/removed.
        // list[0] is imgB.

        const remainingImages = imagesContainer.list.filter((i: any) => i.active); // active is phaser prop, usually
        // But our mock container just has a list.

        // In the current implementation (Buggy), the images list is NOT modified (no destroy call on specific image).
        // So list length remains 2 (until moveBlockImages potentially hides one).

        // Let's assert what we expect for a CORRECT implementation.
        // We expect the image associated with the cleared block to be removed from the list.
        expect(imagesContainer.list.length).toBe(1);
        expect(imagesContainer.list[0]).toBe(imgB);
    });
});

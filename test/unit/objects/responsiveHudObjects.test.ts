import { TetrominoBoxQueue } from '../../../src/tetris/objects/tetrominoBoxQueue';
import { LevelIndicator } from '../../../src/tetris/objects/levelIndicator';
import { Scene } from '../../mocks/phaserMock';

describe('responsive HUD runtime objects', () => {
    let scene: Phaser.Scene;

    beforeEach(() => {
        scene = new Scene() as unknown as Phaser.Scene;
    });

    test('updates queue display size between desktop and mobile counts', () => {
        const queue = new TetrominoBoxQueue(scene, 0, 0, 6);

        expect(queue.getDisplayQueueSize()).toBe(6);
        expect(queue.container.list.length).toBe(6);

        queue.setDisplayQueueSize(1);
        expect(queue.getDisplayQueueSize()).toBe(1);
        expect(queue.container.list.length).toBe(1);

        queue.setDisplayQueueSize(6);
        expect(queue.getDisplayQueueSize()).toBe(6);
        expect(queue.container.list.length).toBe(6);
        expect(queue.peekMany(6)).toHaveLength(6);
    });

    test('switches level indicator compact mode while preserving stats', () => {
        const indicator = new LevelIndicator(scene, 0, 0);
        indicator.updateStats({
            score: 1234,
            time: '00:10.00',
            lines: 8,
            level: 3,
            goal: 5,
            tetrises: 1,
            tspins: 0,
            combos: 2,
            tpm: 1,
            lpm: 1,
        });

        const desktopChildren = indicator.container.list.length;
        expect(desktopChildren).toBeGreaterThan(10);

        indicator.setCompactMode(true, { compactShowRank: true });
        const compactChildren = indicator.container.list.length;
        expect(compactChildren).toBeLessThan(desktopChildren);
        expect((indicator as unknown as { scoreValueText: { text: string } }).scoreValueText.text).toBe('1234');

        indicator.setCompactMode(false);
        expect(indicator.container.list.length).toBeGreaterThan(compactChildren);
        expect((indicator as unknown as { scoreValueText: { text: string } }).scoreValueText.text).toBe('1234');
    });
});

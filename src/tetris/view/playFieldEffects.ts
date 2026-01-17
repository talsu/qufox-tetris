import { Tetromino } from "../objects/tetromino";
import { CONST, getBlockSize } from "../const/const";

const BLOCK_SIZE = getBlockSize();

export class PlayFieldEffects {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;

    constructor(scene: Phaser.Scene, container: Phaser.GameObjects.Container) {
        this.scene = scene;
        this.container = container;
    }

    /**
     * Play hard drop effect.
     * @param {Tetromino} tetromino - The tetromino that hard dropped.
     * @param {number} distance - The distance the tetromino dropped.
     */
    playHardDropEffect(tetromino: Tetromino, distance: number) {
        const graphics = this.scene.add.graphics();
        const blocks = tetromino.getBlocks();

        // Draw trail
        if (distance > 0) {
            // Only draw trail for the top-most block in each column
            const trails = new Map<number, number>(); // col -> minRow
            blocks.forEach(([col, row]) => {
                if (!trails.has(col) || row < trails.get(col)) {
                    trails.set(col, row);
                }
            });

            trails.forEach((row, col) => {
                const x = col * BLOCK_SIZE;
                const y = (row - distance) * BLOCK_SIZE;
                const width = BLOCK_SIZE;
                const height = distance * BLOCK_SIZE;

                graphics.fillGradientStyle(0xFFFFFF, 0xFFFFFF, 0xFFFFFF, 0xFFFFFF, 0, 0, 0.4, 0.4);
                graphics.fillRect(x, y, width, height);
            });
        }

        // Draw impact flash
        graphics.fillStyle(0xFFFFFF, 0.6);
        blocks.forEach(([col, row]) => {
            graphics.fillRect(
                col * BLOCK_SIZE,
                row * BLOCK_SIZE,
                BLOCK_SIZE,
                BLOCK_SIZE
            );
        });

        this.container.add(graphics);

        // Particles
        if (!this.scene.textures.exists('starFragment')) {
            const g = this.scene.make.graphics({x: 0, y: 0});
            g.fillStyle(0xFFFFFF);
            g.fillRect(0, 0, 4, 4);
            g.generateTexture('starFragment', 4, 4);
        }

        const emitter = this.scene.add.particles(0, 0, 'starFragment', {
            speed: { min: 50, max: 150 },
            angle: { min: 200, max: 340 },
            scale: { start: 1, end: 0 },
            lifespan: 500,
            gravityY: 200,
            quantity: 4,
            emitting: false
        });

        this.container.add(emitter);

        blocks.forEach(([col, row]) => {
            emitter.explode(4, col * BLOCK_SIZE + BLOCK_SIZE / 2, row * BLOCK_SIZE + BLOCK_SIZE / 2);
        });

        this.scene.tweens.add({
            targets: graphics,
            alpha: 0,
            duration: CONST.PLAY_FIELD.LOCK_DELAY_MS,
            onComplete: () => {
                graphics.destroy();
                emitter.destroy();
            }
        });
    }

    /**
     * Play clear animation on specific rows.
     * @param {Tetromino[]} tetrominos - The tetrominos to animate.
     * @param {number[]} rows - Rows to animate.
     * @param {Function} onComplete - Callback when animation finishes.
     */
    playClearAnimation(tetrominos: Tetromino[], rows: number[], onComplete: Function) {
        // Play animation on each tetromino
        tetrominos.forEach(tetromino => {
             tetromino.animateBlocksInRows(rows, CONST.PLAY_FIELD.LINE_CLEAR_DELAY_MS);
        });

        // Wait for delay
        this.scene.time.delayedCall(CONST.PLAY_FIELD.LINE_CLEAR_DELAY_MS, () => {
             if (onComplete) onComplete();
        });
    }
}

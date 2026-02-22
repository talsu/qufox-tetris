import { CONST, getBlockSize, TetrominoType } from "../const/const";
import { ObjectBase } from './objectBase';
import { TetrominoBox } from "./tetrominoBox";
import { nextLcg, normalizeSeed } from '../../shared/core/random';
const BLOCK_SIZE = getBlockSize();

export class TetrominoBoxQueue extends ObjectBase {
    public container: Phaser.GameObjects.Container;
    private boxes: TetrominoBox[] = [];
    private randomBag: TetrominoType[] = [];
    private typeQueue: TetrominoType[] = [];
    private seedState: number | null = null;

    // Layout Constants
    private readonly BOX_WIDTH = 5 * BLOCK_SIZE;
    private readonly NEXT_BOX_HEIGHT = 3 * BLOCK_SIZE;
    private readonly QUEUE_BOX_HEIGHT = 3 * BLOCK_SIZE;
    private readonly BOX_X = 1 * BLOCK_SIZE;
    private readonly GAP = 0.4 * BLOCK_SIZE;

    constructor(scene: Phaser.Scene, x: number, y: number, queueSize: number) {
        super(scene);
        // Create container.
        this.container = scene.add.container(x, y);
        this.initUI(queueSize);
    }

    private initUI(queueSize: number) {
        let currentY = BLOCK_SIZE;

        // 1. First Item (Next Piece)
        if (queueSize > 0) {
            this.createBox(this.BOX_X, currentY, this.BOX_WIDTH, this.NEXT_BOX_HEIGHT, "NEXT");
            currentY += this.NEXT_BOX_HEIGHT + this.GAP;
        }

        // 2. Remaining Items (Queue)
        if (queueSize > 1) {
            const remainingCount = queueSize - 1;

            // // Create shared background for the queue
            // const bgHeight = this.QUEUE_BOX_HEIGHT * remainingCount;
            // this.createBackground(this.BOX_X, currentY, this.BOX_WIDTH, bgHeight);

            // Create boxes for queue items
            for (let i = 0; i < remainingCount; ++i) {
                this.createBox(this.BOX_X, currentY, this.BOX_WIDTH, this.QUEUE_BOX_HEIGHT);
                // Adjust spacing for queue items
                currentY += this.QUEUE_BOX_HEIGHT + this.GAP;
            }
        }
    }

    private createBackground(x: number, y: number, width: number, height: number) {
        const background = this.scene.add.graphics();
        background.fillStyle(0x000000, 0.2);
        background.fillRect(0, 0, width, height);
        background.lineStyle(1, 0xEEEEEE, 1.0);
        background.strokeRect(0, 0, width, height);

        background.x = x;
        background.y = y;
        this.container.add(background);
    }

    private createBox(x: number, y: number, width: number, height: number, header: string = "") {
        const box = new TetrominoBox(this.scene, x, y, width, height, header);
        this.boxes.push(box);
        this.container.add(box.container);
    }

    private nextRandom(): number {
        if (this.seedState === null) {
            return Math.random();
        }
        const next = nextLcg(this.seedState);
        this.seedState = next.state;
        return next.value;
    }

    public setSeed(seed: number | null): void {
        if (seed === null || seed === undefined || !Number.isFinite(seed)) {
            this.seedState = null;
            this.randomBag = [];
            this.typeQueue = [];
            this.boxes.forEach((box) => {
                box.hold();
            });
            return;
        }

        this.seedState = normalizeSeed(seed);
        this.randomBag = [];
        this.typeQueue = [];
        this.boxes.forEach((box) => {
            box.hold();
        });
    }

    /**
     * Random tetromino type generator.
     * Push new type to Queue and return shifted item.
     * @link https://tetris.wiki/Random_Generator
     * @returns {TetrominoType} Generated tetromino type.
     */
    randomTypeGenerator(): TetrominoType {
        // Repeat until type queue is full.
        while (this.typeQueue.length < (this.boxes.length + 1)) {
            // If random bag is empty. copy tetromino types to random bag.
            if (!this.randomBag.length) this.randomBag = CONST.TETROMINO.TYPES.slice();
            // Get random item (type) from random bag.
            let type = this.randomBag.splice(Math.floor(this.nextRandom() * this.randomBag.length), 1)[0];
            // Push random type to type queue.
            this.typeQueue.push(type);
        }

        // Shift type from type queue.
        let gotType = this.typeQueue.shift();

        // Update boxes for UI.
        this.boxes.forEach((box, index) => {
            box.hold(this.typeQueue[index]);
        });

        // Return shifted type.
        return gotType;
    }

    /**
     * Peek next tetromino type.
     */
    peek(): TetrominoType {
        return this.typeQueue[0];
    }

    peekMany(count: number): TetrominoType[] {
        if (count <= 0) return [];
        return this.typeQueue.slice(0, count);
    }

    public setAuthoritativeState(queue: TetrominoType[], bag: TetrominoType[], queueRngState: number): void {
        this.typeQueue = queue.slice();
        this.randomBag = bag.slice();
        if (Number.isFinite(queueRngState)) {
            this.seedState = normalizeSeed(queueRngState);
        }

        this.boxes.forEach((box, index) => {
            box.hold(this.typeQueue[index]);
        });
    }

    /**
     * Clear type queue and boxes.
     */
    clear() {
        this.typeQueue = [];
        this.randomBag = [];
        this.boxes.forEach((box) => {
            box.hold();
        });
    }
}

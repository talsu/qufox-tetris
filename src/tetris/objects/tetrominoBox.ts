import {TetrominoType} from "../const/const";
import {ObjectBase} from './objectBase';
import {Tetromino} from "./tetromino";

/**
 * Tetromino box.
 */
export class TetrominoBox extends ObjectBase {
    private tetromino: Tetromino;

    public container: Phaser.GameObjects.Container;

    constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number, hasBackground: boolean = true) {
        super(scene);
        this.container = scene.add.container(x, y);
        this.container.width = width;
        this.container.height = height;

        if (hasBackground) {
            // Create background.
            let background = scene.add.graphics();
            // Set background color.
            background.fillStyle(0x000000, 0.2);
            background.fillRect(0, 0, this.container.width, this.container.height);
            // Set background border
            background.lineStyle(1, 0xEEEEEE, 1.0);
            background.strokeRect(0, 0, this.container.width, this.container.height);
            // Add background graphic to container.
            this.container.add(background);
        }
    }

    /**
     * Hold Tetromino type and return released type.
     * @param {TetrominoType} type - hold type.
     * @returns {TetrominoType} - released type.
     */
    hold(type?: TetrominoType): TetrominoType {
        let existType: TetrominoType = null;
        if (this.tetromino) { // remove exist tetromino.
            existType = this.tetromino.type;
            this.container.remove(this.tetromino.container);
            this.tetromino.destroy();
            this.tetromino = null;
        }

        // if new type is invalid, do not create new tetromino.
        if (!type) return existType;

        // create new tetromino.
        let position = {
            I: [1, 0.5],
            J: [1.5, 1],
            L: [1.5, 1],
            T: [1.5, 1],
            O: [1, 1],
            Z: [1.5, 1],
            S: [1.5, 1]
        }[type];
        this.tetromino = new Tetromino(this.scene, type, [], position[0], position[1]);
        this.tetromino.inactive();
        this.container.add(this.tetromino.container);

        return existType;
    }

    /**
     * Clear held tetromino.
     */
    clear() {
        this.hold();
    }
}
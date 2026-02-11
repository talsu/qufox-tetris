import { TetrominoType } from "../const/const";
import { ObjectBase } from './objectBase';
import { Tetromino } from "./tetromino";
import { getBlockSize } from "../const/const";
import { TextStyles, drawPanelBackground, createStyledText } from "../ui/uiStyles";

const BLOCK_SIZE = getBlockSize();

/**
 * Tetromino box - displays a single held or next piece.
 */
export class TetrominoBox extends ObjectBase {
    private tetromino: Tetromino;

    public container: Phaser.GameObjects.Container;

    constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number, header: string = "") {
        super(scene);
        this.container = scene.add.container(x, y);
        this.container.width = width;
        this.container.height = height;

        // Background panel (shared style with LevelIndicator)
        const bg = scene.add.graphics();
        drawPanelBackground(bg, width, height);
        this.container.add(bg);

        if (header) {
            this.createHeader(header);
        }
    }

    private createHeader(text: string) {
        const headerText = createStyledText(
            this.scene, this.container,
            this.container.width / 2, -(BLOCK_SIZE * 0.55),
            text, { ...TextStyles.header, align: 'center' },
        );
        headerText.setOrigin(0.5, 0);
    }

    /**
     * Hold Tetromino type and return released type.
     * @param {TetrominoType} type - hold type.
     * @returns {TetrominoType} - released type.
     */
    hold(type?: TetrominoType): TetrominoType {
        let existType: TetrominoType = null;
        if (this.tetromino) {
            existType = this.tetromino.type;
            this.container.remove(this.tetromino.container);
            this.tetromino.destroy();
            this.tetromino = null;
        }

        if (!type) return existType;

        // Centering offsets per tetromino type
        const position = {
            I: [0.5, 0],
            J: [1, 0.5],
            L: [1, 0.5],
            T: [1, 0.5],
            O: [0.5, 0.5],
            Z: [1, 0.5],
            S: [1, 0.5]
        }[type];
        this.tetromino = new Tetromino(this.scene, type, [], position[0], position[1]);
        this.tetromino.inactive();
        this.container.add(this.tetromino.container);

        return existType;
    }

    clear() {
        this.hold();
    }
}

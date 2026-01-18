import { TetrominoType } from "../const/const";
import { ObjectBase } from './objectBase';
import { Tetromino } from "./tetromino";
import { getBlockSize } from "../const/const";
const BLOCK_SIZE = getBlockSize();

/**
 * Tetromino box.
 */
export class TetrominoBox extends ObjectBase {
    private tetromino: Tetromino;

    public container: Phaser.GameObjects.Container;

    constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number, header: string = "") {
        super(scene);
        this.container = scene.add.container(x, y);
        this.container.width = width;
        this.container.height = height;

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

        this.createHeader(header);
    }

    private createHeader(text: string) {
        // Text Styles
        const commonStroke = '#000000';
        const commonThickness = 4;
        const commonShadow = { offsetX: 2, offsetY: 2, color: '#000000', blur: 2, stroke: true, fill: true };

        const headerStyle = {
            fontFamily: "Arial Black",
            fontSize: `${BLOCK_SIZE * 0.7}px`,
            color: "#ffffff",
            align: 'center'
        };

        // Helper to apply visibility styles
        const applyVisibility = (textObj: Phaser.GameObjects.Text, thickness: number = commonThickness) => {
            textObj.setStroke(commonStroke, thickness);
            textObj.setShadow(commonShadow.offsetX, commonShadow.offsetY, commonShadow.color, commonShadow.blur, commonShadow.stroke, commonShadow.fill);
            return textObj;
        };

        // Create Header Text at center of top.
        const headerText = this.scene.add.text(this.container.width / 2, -(BLOCK_SIZE * 0.55), text, headerStyle);
        headerText.setOrigin(0.5, 0);
        applyVisibility(headerText, commonThickness);
        this.container.add(headerText);
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

    /**
     * Clear held tetromino.
     */
    clear() {
        this.hold();
    }
}
import { CONST, BLOCK_SIZE, TetrominoType, RotateType, ColRow } from '../const/const';
import { ObjectBase } from './objectBase';

/**
 * Tetromino
 */
export class Tetromino extends ObjectBase {
    private col: number;
    private row: number;
    private deactiveBlocks: ColRow[] = null;
    private blockedPositions: ColRow[];
    private rotateType: RotateType = RotateType.UP;
    private ghostBlockGraphics: Phaser.GameObjects.Graphics;
    private blockImages: Phaser.GameObjects.Container;
    private lockAnimationTween: Phaser.Tweens.Tween;

    public isSpawnSuccess: boolean;
    public container: Phaser.GameObjects.Container;
    public type: TetrominoType;
    
    constructor(scene: Phaser.Scene, type: TetrominoType, blockedPositions?: ColRow[], col?:number, row?:number) {
        super(scene);
        // Create main container.
        this.container = scene.add.container(0, 0);

        // Set Container size.
        let tetrominoSize = CONST.TETROMINO.SIZE[type];
        this.container.width = BLOCK_SIZE * tetrominoSize[0];
        this.container.height = BLOCK_SIZE * tetrominoSize[1];

        // Set type
        this.type = type;
        // Set blocked position array.
        this.blockedPositions = blockedPositions || [];

        // Create block image container.
        this.blockImages = this.scene.add.container(0,0);
        this.container.add(this.blockImages);

        // Create block images.
        CONST.TETROMINO.BLOCKS[this.type][this.rotateType].forEach(colRow => {
            let imageOffset = BLOCK_SIZE / 2;
            let blockImage = this.scene.add.image(
                colRow[0] * BLOCK_SIZE + imageOffset,
                colRow[1] * BLOCK_SIZE + imageOffset,
                CONST.TETROMINO.IMAGES[this.type]
            )
            .setScale(BLOCK_SIZE / CONST.PLAY_FIELD.BLOCK_IMAGE_SIZE);
            // Add images to image container.
            this.blockImages.add(blockImage);
        });
        // Move block image in block image container.
        this.moveBlockImages();

        // Create ghost block graphics.
        this.ghostBlockGraphics = this.scene.add.graphics();
        this.container.add(this.ghostBlockGraphics);

        // Initial position
        let initCol = col === undefined ? 3 : col;
        let initRow = row || 0;

        // Move to initial position and set spawn state.
        this.isSpawnSuccess = this.move(initCol, initRow);
    }

    /**
     * Move tetromino.
     * @param {number} col - Col position. 
     * @param {number} row - Row position.
     * @returns {boolean} - Is move success.
     */
    move(col:number, row:number):boolean {
        // Check new position is valid and if it's invalie return false.
        if (!this.isValidPosition(this.rotateType, col, row)) return false;
        
        // Set col, row positions.
        this.col = col;
        this.row = row;
        // Set container x, y.
        this.container.x = this.col * BLOCK_SIZE;
        this.container.y = this.row * BLOCK_SIZE;

        // Move block images.
        this.moveBlockImages();
        // Draw ghost block.
        this.drawGhostBlocks();
    
        // Return true - move success.
        return true;
    }

    /**
     * Move tetromino left.
     */
    moveLeft():boolean { return this.move(this.col - 1, this.row); }
    
    /**
     * Move tetromino right.
     */
    moveRight():boolean { return this.move(this.col + 1, this.row); }

    /**
     * Move tetromino up.
     */
    moveUp():boolean { return this.move(this.col, this.row - 1); }

    /**
     * Move tetromino down.
     */
    moveDown():boolean { return this.move(this.col, this.row + 1); }

    /**
     * Move tetromino to end of down position.
     */
    hardDrop() { while (this.moveDown()) {} }

    /**
     * Is lockable on next position.
     * - Check next down position is invalid.
     */
    isLockable():boolean { return !this.isValidPosition(this.rotateType, this.col, this.row + 1); }

    /**
     * Clear line and pull down upper blocks.
     * @param {number} row - Row to clear. 
     */
    clearLine(row: number):boolean {
        // remove row blocks..
        this.deactiveBlocks
            .filter(colRow => row == (this.row + colRow[1]))
            .forEach((colRow) => this.deactiveBlocks.splice(this.deactiveBlocks.indexOf(colRow), 1));
        // pull down upper blocks.
        this.deactiveBlocks
            .filter(colRow => row > (this.row + colRow[1]))
            .forEach(colRow => colRow[1] = colRow[1] + 1);

        // draw deactive blocks
        this.moveBlockImages();

        // if Tetromino is empty return true;
        return !this.deactiveBlocks.length;
    }

    /**
     * Move block images.
     */
    moveBlockImages() {
        // Calculate image position offset.
        const imageOffset = BLOCK_SIZE / 2;
        let index = 0;
        // Get block positions.
        let blockOffsets = this.getBlockOffsets();
        this.blockImages.each((blockImage) => {
            let colRow = blockOffsets[index];
            if (colRow){ // if block position exists, set position.
                blockImage.x = colRow[0] * BLOCK_SIZE + imageOffset;
                blockImage.y = colRow[1] * BLOCK_SIZE + imageOffset;
            } else {
                // if block is not exists, hide block image.
                blockImage.alpha = 0; 
            }
            index++;
        });
    }

    /**
     * Draw ghost blocks.
     */
    drawGhostBlocks() {
        // Get ghost row position offset.
        let ghostRowOffset = this.getGhostRowOffset();
        // Clear old ghost graphic.
        this.ghostBlockGraphics.clear();

        // If block is deactive or show ghost option is off or ghost row offset is not exist, stop draw.
        if (this.deactiveBlocks || !CONST.TETROMINO.SHOW_GHOST || !ghostRowOffset) return;

        // Set color and alpha.
        this.ghostBlockGraphics.fillStyle(CONST.TETROMINO.COLOR[this.type]);
        this.ghostBlockGraphics.alpha = 0.3;
        
        // Draw rect each position.
        this.getBlockOffsets().forEach(colRow => {
            this.ghostBlockGraphics.fillRect(
                colRow[0] * BLOCK_SIZE,
                (colRow[1] + ghostRowOffset) * BLOCK_SIZE,
                BLOCK_SIZE,
                BLOCK_SIZE);
        });
    }

    /**
     * Deactive tetromino.
     */
    deactive() {
        // Destroy ghost graphics.
        this.ghostBlockGraphics.destroy();
        // Copy current block position offsets to deactive positions.
        this.deactiveBlocks = this.getBlockOffsets().map(colRow => [colRow[0], colRow[1]]);
    }

    /**
     * Rotate tetromino.
     * @link https://tetris.wiki/SRS
     * @param {boolean} isClockwise - Rotate direction. 
     */
    rotate(isClockwise:boolean):boolean {
        // Get current rotate position index.
        let index = CONST.TETROMINO.ROTATE_SEQ.indexOf(this.rotateType);
        // Move rotate position index
        index += isClockwise ? 1 : -1;
        index = (CONST.TETROMINO.ROTATE_SEQ.length + index) % CONST.TETROMINO.ROTATE_SEQ.length;
        // Get new rotate type.
        let newRotateType = CONST.TETROMINO.ROTATE_SEQ[index];

        // Get kick data.
        let kickData = null;
        switch (this.type) {
            case "O": kickData = []; break; // 'O' block is not kickable and no move.
            case "I": kickData = CONST.TETROMINO.I_KICK_DATA[this.rotateType + '>' + newRotateType]; break;
            default: kickData = CONST.TETROMINO.JLSTZ_KICK_DATA[this.rotateType + '>' + newRotateType]; break;
        }

        // Get first available position from kick data and move.
        return !kickData.length || kickData.some(colRow => {
            let newCol = this.col + colRow[0];
            let newRow = this.row - colRow[1]; // kickData Y is opposite Row.
            if (this.isValidPosition(newRotateType, newCol, newRow)) { // if valid position.
                // Set new rotate type.
                this.rotateType = newRotateType;
                // Move
                this.move(newCol, newRow);
                // return function.
                return true;
            }
        });
    }

    /**
     * Get block position offsets.
     * @param {RotateType} rotateType - Rotate type.
     * @returns {ColRow[]} - Position offsets.
     */
    getBlockOffsets (rotateType?:RotateType): ColRow[] {
        return this.deactiveBlocks || CONST.TETROMINO.BLOCKS[this.type][rotateType || this.rotateType];
    }
    
    /**
     * Get block positions.
     * @param {RotateType} rotateType - Rotate type.
     * @param {number} col - Col position.
     * @param {number} row - Row position.
     * @returns {ColRow[]} - Block positions.
     */
    getBlocks (rotateType?:RotateType, col?:number, row?:number): ColRow[] {
        let colBase = (col === undefined) ? this.col : col;
        let rowBase = (row === undefined) ? this.row : row;
        // Add opsition offsets and return.
        return this.getBlockOffsets(rotateType).map(colRow => {
          return [colBase + colRow[0], rowBase + colRow[1]];
        });
    }

    /**
     * Get ghost row offset.
     * @returns {number} - Ghost row offset.
     */
    getGhostRowOffset(): number {
        let row = this.row;
        // Increase row value while position is valid. (like hard drop)
        while (this.isValidPosition(this.rotateType, this.col, row)) { row++; }
        // Calculate offset and return;
        return row - this.row - 1;
    }

    /**
     * Check is valid position.
     * @param {RotateType} rotateType - Rotate type.
     * @param {number} col - Col position.
     * @param {number} row - Row position.
     * @returns {boolean} - Is valid.
     */
    isValidPosition (rotateType:RotateType, col:number, row:number): boolean {
        // Check all block is not duplicate with blocked positions. 
        return this.getBlocks(rotateType, col, row).every(colRow => {
            let newCol = colRow[0];
            let newRow = colRow[1];
            // If any block is duplicate, return false. (invalid)
            if (this.blockedPositions.some(colRow => colRow[0] === newCol && colRow[1] === newRow)) return false;
            // If position is out of range, return false. (invalid)
            if (newCol < 0 || CONST.PLAY_FIELD.COL_COUNT <= newCol) return false;
            if (newRow < 0 || CONST.PLAY_FIELD.ROW_COUNT <= newRow) return false;

            return true;
        });
    }

    /**
     * Destroy tetromino.
     */
    destroy() {
        // Destroy block images.
        this.blockImages.each(blockImage => blockImage.destroy());
        this.blockImages.destroy();

        // Destroy ghost graphics.
        this.ghostBlockGraphics.clear();
        this.ghostBlockGraphics.destroy();

        // Remove objects from container.
        this.container.remove(this.blockImages);
        this.container.remove(this.ghostBlockGraphics);

        // Destroy containter.
        this.container.destroy();
    }

    /**
     * Play lock animation.
     * @param {Function} callback - Callback function on complete. 
     */
    playLockAnimation(callback?: Function) {
        // If animiation is exists, stop animation.
        if (this.lockAnimationTween) this.stopLockAnimation();
        // Create animation.
        this.lockAnimationTween = this.scene.add.tween({
            targets: this.blockImages,
            ease: 'Sine.easeInOut',
            duration: CONST.PLAY_FIELD.LOCK_DELAY_MS,
            delay: 0,
            alpha: { // Alpha to 0.
                getStart: () => 1.0,
                getEnd: () => 0.0
            },
            onComplete: () => { // When complete.
                // Set alpha to 1.0
                this.blockImages.alpha = 1.0;
                // Remove animation.
                this.lockAnimationTween = null;
                // Call callback function.
                if (callback) callback();
            }
        });
    }

    /**
     * Is lock animation is Playing.
     */
    isPlayingLockAnimation(): boolean { return Boolean(this.lockAnimationTween); }

    /**
     * Stop lock animation.
     */
    stopLockAnimation() {
        if (this.lockAnimationTween) {
            this.lockAnimationTween.pause();
            this.lockAnimationTween.stop();
            this.lockAnimationTween = null;
            this.blockImages.alpha = 1.0;
        }
    }
}
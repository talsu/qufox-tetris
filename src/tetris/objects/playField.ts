import {CONST, TetrominoType, ColRow, InputState, RotateType, getBlockSize} from "../const/const";
import {ObjectBase} from './objectBase';
import {Tetromino} from "./tetromino";

const BLOCK_SIZE = getBlockSize();
/**
 * Play field
 */
export class PlayField extends ObjectBase {
    private inactiveTetrominos: Tetromino[] = [];
    private activeTetromino: Tetromino = null;
    private canHold: boolean;
    private container: Phaser.GameObjects.Container;
    private autoDropTimer: Phaser.Time.TimerEvent;
    private droppedRotateType: RotateType;
    public autoDropDelay: number = 1000;

    constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
        super(scene);

        // Create background.
        const topPadding = BLOCK_SIZE / 3;
        let background = scene.add.graphics();
        // Set background color.
        background.fillStyle(0x000000, 0.4);
        background.fillRect(x, y-topPadding, width, height+topPadding);
        // Set background border
        const borderThick = 1;
        background.lineStyle(borderThick, 0xEEEEEE, 1.0);
        background.strokeRect(x-borderThick, y-topPadding-borderThick, width+(borderThick*2), height+topPadding+(borderThick*2));

        // background grid
        for (let row = 0; row < CONST.PLAY_FIELD.ROW_COUNT; ++row)
        for (let col = 0; col < CONST.PLAY_FIELD.COL_COUNT; ++col) {
            const backgroundBlock = this.scene.add.image(
                x+(col * BLOCK_SIZE),
                y+(row * BLOCK_SIZE),
                'blockSheet', 10);
            backgroundBlock.setOrigin(0);
            backgroundBlock.setAlpha(0.3);
            if (BLOCK_SIZE != CONST.SCREEN.BLOCK_IMAGE_SIZE) backgroundBlock.setScale(BLOCK_SIZE / CONST.SCREEN.BLOCK_IMAGE_SIZE);
        }

        // Create container and set size.
        this.container = scene.add.container(x, y);
        this.container.width = width;
        this.container.height = height;

        const maskShape = this.scene.make.graphics({});

        //  Create a Graphics object for mask.
        maskShape.fillStyle(0xffffff);

        //  You have to begin a path for a Geometry mask to work
        // maskShape.beginPath();
        maskShape.fillRect(x, y - (BLOCK_SIZE / 3), width, height + (BLOCK_SIZE / 3));
        this.container.setMask(maskShape.createGeometryMask());
    }

    /**
     * Clear all tetromino
     */
    clear() {
        // Destroy active tetromino.
        if (this.activeTetromino) {
            this.container.remove(this.activeTetromino.container);
            this.activeTetromino.destroy();
        }
        // Destroy all inactive tetrominos.
        this.inactiveTetrominos.forEach(tetromino => {
            this.container.remove(tetromino.container);
            tetromino.destroy();
        });

        // Clear active tetromino.
        this.activeTetromino = null;
        // Clear inactive tetrominos.
        this.inactiveTetrominos = [];
    }

    /**
     * Spawn new tetromino.
     * @param {TetrominoType} type - Tetromino type.
     */
    spawnTetromino(type?: TetrominoType): void {
        // Get tetrominoType from param or generate random type from queue.
        let tetrominoType = type;
        if (!tetrominoType) this.emit('generateRandomType', (genType: TetrominoType) => tetrominoType = genType);
        // Create new tetromino.
        let tetromino = new Tetromino(this.scene, tetrominoType, this.getInactiveBlocks());
        // Check spawn is success
        if (tetromino.isSpawnSuccess) { // If spawn is success.
            // Set active tetromino with new tetromino.
            this.activeTetromino = tetromino;
            // Add tetromino ui to play field container.
            this.container.add(this.activeTetromino.container);
            // Check is lockable
            if (this.activeTetromino.isLockable()) {
                // If created is lockable (may be spawned top of play field.)
                // Start lock timer();
                this.startLockTimer();
            } else {
                // Normal state.
                // Move down one row immediately. - Tetris guide 2009 - 3.4
                this.activeTetromino.moveDown('autoDrop');
                if (this.activeTetromino.isLockable()) {
                    this.startLockTimer();
                }
            }
            // Start drop timer;
            this.restartAutoDropTimer();
        } else { // If spawn is fail, it means Block Out GAME OVER. - Tetris Guide 2009 Chapter 10.7
            // Destroy created tetromino.
            tetromino.destroy();
            // Emit game over event
            this.emit('gameOver', 'Block Out');
        }
        // Set can hold flag true.
        // You can only 1 time hold in 1 tetromino spawn.
        this.canHold = true;
    }

    /**
     * Get inactive block positions.
     */
    getInactiveBlocks(): ColRow[] {
        // Get all inactive tetromino blocks and aggregate.
        return this.inactiveTetrominos.map(tetromino => tetromino.getBlocks()).reduce((a, b) => a.concat(b), []);
    }

    /**
     * On input process.
     * @param {string} input - input value (ex. Z, X, C, UP, Down...)
     * @param {InputState} state - state (ex, PRESS -> HOLD -> HOLD -> RELEASE)
     */
    onInput(input: string, state: InputState) {
        // If active tetromino is not exists, ignore input.
        if (!this.activeTetromino) return;

        // PRESS or HOLD action.
        if (state == InputState.PRESS || state == InputState.HOLD) {
            let wasLockable: boolean;
            switch (input) {
                case "left":
                    wasLockable = this.activeTetromino.isLockable();
                    this.setLockTimer(this.activeTetromino.moveLeft(), true);
                    // If exit lockable state with action, restart auto drop timer.
                    if (wasLockable && !this.activeTetromino.isLockable()) this.restartAutoDropTimer();
                    break;
                case "right":
                    wasLockable = this.activeTetromino.isLockable();
                    this.setLockTimer(this.activeTetromino.moveRight(), true);
                    // If exit lockable state with action, restart auto drop timer.
                    if (wasLockable && !this.activeTetromino.isLockable()) this.restartAutoDropTimer();
                    break;
                case "softDrop":
                    let softDropSuccess = this.activeTetromino.moveDown('softDrop');
                    this.setLockTimer(softDropSuccess, true);
                    if (softDropSuccess) this.restartAutoDropTimer();
                    break;
            }

        }

        // Only PRESS action.
        if (state == InputState.PRESS) {
            switch (input) {
                case "clockwise":
                case "anticlockwise":
                    let beforeRow = this.activeTetromino.row;
                    this.setLockTimer(this.activeTetromino.rotate(input == "clockwise"));
                    // if dropped by rotate action. reset drop timer;
                    if (beforeRow < this.activeTetromino.row) this.restartAutoDropTimer();
                    break;
                case "hardDrop":
                    this.activeTetromino.hardDrop();
                    this.droppedRotateType = this.activeTetromino.rotateType;
                    this.lock();
                    // TODO: hard Drop effect animation
                    break;
                case "hold":
                    // If canHold flag is true and active tetromino is exists, do hold.
                    if (this.canHold && this.activeTetromino) {
                        const holdType = this.activeTetromino.type;
                        // Destroy active tetromino.
                        this.container.remove(this.activeTetromino.container);
                        this.activeTetromino.destroy();
                        this.activeTetromino = null;

                        // Do hold type and get released type.
                        this.emit('hold', holdType, (releasedType: TetrominoType) => {
                            // Spawn new tetromino with un held type.
                            this.spawnTetromino(releasedType);
                        });

                        // Set can hold flag false.
                        // You can only 1 time hold in 1 tetromino spawn.
                        this.canHold = false;
                    }
                    break;
            }
        }
    }

    /**
     * Clear line.
     * @param {Tetromino} lockedTetromino - locked tetromino.
     * @returns {number} Cleared line count.
     */
    clearLine(lockedTetromino: Tetromino) {
        // get rows for check clear line.
        const rowsToCheck = new Set(lockedTetromino.getBlocks().map(([, row]) => row));

        const needClearRows: number[] = [];
        const inactiveBlocks = this.getInactiveBlocks();
        
        // get target of clear line rows.
        for (const row of rowsToCheck) {
            const numberOfRowBlocks = inactiveBlocks.filter(([, r]) => r === row).length;
            if (numberOfRowBlocks >= CONST.PLAY_FIELD.COL_COUNT) needClearRows.push(row);
        }

        // call clear line method each tetromino.
        needClearRows.forEach(row => {
            const emptyTetrominos = this.inactiveTetrominos.filter(tetromino => tetromino.clearLine(row));
            // remove empty tetromino.
            emptyTetrominos.forEach(tetromino => {
                this.container.remove(tetromino.container);
                tetromino.destroy();
                this.inactiveTetrominos.splice(this.inactiveTetrominos.indexOf(tetromino), 1);
            });
        });

        return needClearRows.length;
    }

    /**
     * Lock tetromino.
     */
    lock() {
        // Stop lock timer.
        this.stopLockTimer();
        // If lockable active tetromino is not exist, stop function.
        if (!this.activeTetromino) return;
        if (!this.activeTetromino.isLockable()) return;
        // Stop auto drop timer.
        this.stopAutoDropTimer();
        // Inactive tetromino.
        let lockedTetromino = this.activeTetromino;
        lockedTetromino.inactive();
        this.inactiveTetrominos.push(lockedTetromino);
        this.activeTetromino = null;

        // Check locked Tetromino is inside buffer zone entire.
        // Row position is smaller then zero means buffer zone.
        if (lockedTetromino.getBlocks().every(colRow => colRow[1] < 0)) {
            // Lock Out Game Over.
            // Emit game over event
            this.emit('gameOver', 'Lock Out');
            return;
        }

        // clear line 
        // TODO: clear line delay and animation
        let clearedLineCount = this.clearLine(lockedTetromino);

        // Emit lock event.
        this.emit('lock',
            clearedLineCount,
            lockedTetromino.type,
            this.droppedRotateType,
            lockedTetromino.rotateType,
            lockedTetromino.lastMovement,
            lockedTetromino.lastKickDataIndex,
            lockedTetromino.dropCounter,
            lockedTetromino.getTSpinCornerOccupiedCount()
        );

        // ARE
        this.scene.time.delayedCall(CONST.PLAY_FIELD.ARE_MS, () => this.spawnTetromino(), [], this);
    }

    /**
     * Start auto drop timer.
     */
    startAutoDropTimer() {
        if (this.autoDropTimer) return;
        this.autoDropTimer = this.scene.time.addEvent({
            delay: this.autoDropDelay,
            callback: () => {
                // If active tetromino is lockable, start lock timer.
                if (this.activeTetromino &&
                    this.activeTetromino.moveDown('autoDrop') &&
                    this.activeTetromino.isLockable()
                ) {
                    // Set dropped rotate type.
                    this.droppedRotateType = this.activeTetromino.rotateType;
                    this.startLockTimer();
                }
            },
            callbackScope: this,
            loop: true
        });
    }

    /**
     * Stop auto drop timer.
     */
    stopAutoDropTimer() {
        if (!this.autoDropTimer) return;
        this.autoDropTimer.destroy();
        this.autoDropTimer = null;
    }

    /**
     * Stop and start auto drop timer.
     */
    restartAutoDropTimer() {
        this.stopAutoDropTimer();
        this.startAutoDropTimer();
    }

    /**
     * Start lock timer.
     */
    startLockTimer() {
        if (this.activeTetromino) {
            // Lock tetromino after lock animation finished.
            this.activeTetromino.playLockAnimation(() => this.lock());
        }
    }

    /**
     * Stop lock timer.
     */
    stopLockTimer() {
        if (this.activeTetromino && this.activeTetromino.isPlayingLockAnimation()) {
            this.activeTetromino.stopLockAnimation();
        }
    }

    /**
     * setLockTimer
     * @param {boolean} moveSuccess Was successful move.
     * @param {boolean} setDroppedRotate Set dropped rotate.
     */
    setLockTimer(moveSuccess: boolean, setDroppedRotate?: boolean): void {
        // If tetromino move success.
        if (moveSuccess) {
            // If active tetromino is lockable.
            if (this.activeTetromino.isLockable()) {
                // Set dropped rotate type.
                if (setDroppedRotate) this.droppedRotateType = this.activeTetromino.rotateType;
                
                // Restart lock timer only if manipulation count < 15 (Extended Placement).
                if (this.activeTetromino.manipulationCount < 15) {
                    this.stopLockTimer();
                    this.startLockTimer();
                }
            } else {
                // Stop lock timer.
                this.stopLockTimer();
            }
        }
    }
}
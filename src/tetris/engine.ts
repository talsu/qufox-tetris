import {PlayField} from "./objects/playField";
import {TetrominoBox} from "./objects/tetrominoBox";
import {TetrominoBoxQueue} from "./objects/tetrominoBoxQueue";
import {LevelIndicator} from "./objects/levelIndicator";
import {InputState, TetrominoType, RotateType} from "./const/const";
import {ScoreSystem} from "./logic/scoreSystem";

/**
 * Tetris game engine.
 */
export class Engine {
    private playField: PlayField;
    private holdBox: TetrominoBox;
    private queue: TetrominoBoxQueue;
    private levelIndicator: LevelIndicator;
    private scoreSystem: ScoreSystem;
    private gameTime: number = 0;

    private onAttack: (count: number) => void;

    constructor(playField: PlayField, holdBox: TetrominoBox, queue: TetrominoBoxQueue, levelIndicator: LevelIndicator) {
        this.playField = playField;
        this.holdBox = holdBox;
        this.queue = queue;
        this.levelIndicator = levelIndicator;
        this.scoreSystem = new ScoreSystem();

        this.playField.on('start', this.start.bind(this));
        this.playField.on('gameOver', this.gameOver.bind(this));
        this.playField.on('generateRandomType', this.onPlayFieldGenerateType.bind(this));
        this.playField.on('hold', this.onPlayFieldHold.bind(this));
        this.playField.on('lock', this.onLock.bind(this));
        this.clear();
    }

    public setAttackHandler(handler: (count: number) => void) {
        this.onAttack = handler;
    }

    /**
     * Clear - reset stats
     */
    clear() {
        this.scoreSystem.clear();
    }

    /**
     * Start game.
     */
    start() {
        // Clear stats.
        this.clear();
        this.gameTime = 0;
        this.scoreSystem.start();

        // Clear tetromino hold box.
        this.holdBox.clear();
        // Clear next tetromino queue.
        this.queue.clear();
        // Clear Play field.
        this.playField.clear();
        // Set auto drop delay.
        this.playField.autoDropDelay = this.scoreSystem.getAutoDropDelay();
        // Clear level indicator.
        this.levelIndicator.clear();

        // Spawn tetromino.
        this.playField.spawnTetromino();
    }

    /**
     * Update loop
     */
    update(time: number, delta: number) {
        this.gameTime += delta;
        const stats = this.scoreSystem.getStats(this.gameTime);
        this.levelIndicator.updateStats(stats);
    }

    /**
     * Generate tetromino type request from play field.
     * get type from queue, and pass type to play field.
     * @param typeReceiver Generated tetromino type receive callback.
     */
    onPlayFieldGenerateType(typeReceiver: (type: TetrominoType) => void) {
        if (typeReceiver) typeReceiver(this.queue.randomTypeGenerator());
    }

    /**
     * Hold tetromino type request from play field.
     * insert type to hold box and get released type, and pass released type to play field.
     * @param type Tetromino type to hold.
     * @param typeReceiver Released type receive callback.
     */
    onPlayFieldHold(type: TetrominoType, typeReceiver: (type: TetrominoType) => void) {
        if (typeReceiver) typeReceiver(this.holdBox.hold(type));
    }

    /**
     * Update stats when line cleared.
     * @param {number} clearedLineCount - Cleared line count.
     * @param {TetrominoType} tetrominoType - Tetromino type.
     * @param {RotateType} droppedRotateType - Rotate type when dropped.
     * @param {RotateType} lockedRotateType - Rotate type when locked.
     * @param {string} movement - Last movement.
     * @param {number} kickDataIndex - Kick data index. (how many kick occurred.)
     * @param {{ softDrop: number, hardDrop: number, autoDrop: number }} dropCounter - Drop count data.
     * @param {{ pointSide: number, flatSide: number }} tSpinCornerOccupiedCount - T tetromino corner occupied count.
     */
    onLock(
        clearedLineCount: number,
        tetrominoType: TetrominoType,
        droppedRotateType: RotateType,
        lockedRotateType: RotateType,
        movement: string,
        kickDataIndex: number,
        dropCounter: { softDrop: number, hardDrop: number, autoDrop: number },
        tSpinCornerOccupiedCount: { pointSide: number, flatSide: number }
    ) {
        const result = this.scoreSystem.onLock(
            clearedLineCount,
            tetrominoType,
            droppedRotateType,
            lockedRotateType,
            movement,
            kickDataIndex,
            dropCounter,
            tSpinCornerOccupiedCount
        );

        if (result.scoreAdded > 0 && result.actionName) {
            console.log(`${result.actionName} - ${result.scoreAdded}`);
        }
        if (result.combo > 0) {
            const comboScore = 50 * result.combo * result.level; // Logic duplication for logging?
            // Better rely on ScoreSystem to return combo score details if we want detailed logs,
            // but for now simple log is fine.
             console.log(`Combo ${result.combo}`);
        }

        // Update indicator.
        if (result.actionName) this.levelIndicator.setAction(result.actionName);
        this.levelIndicator.setCombo(result.combo);
        // this.levelIndicator.setLevel(result.level);
        // this.levelIndicator.setLine(this.scoreSystem.getClearedLines(), this.scoreSystem.getNextLevelRequireClearedLines());
        // this.levelIndicator.setScore(this.scoreSystem.getScore());
        
        // Immediate update stats
        const stats = this.scoreSystem.getStats(this.gameTime);
        this.levelIndicator.updateStats(stats);

        // Update drop delay
        this.playField.autoDropDelay = this.scoreSystem.getAutoDropDelay();

        // Calculate Garbage (Multiplayer)
        let garbage = result.garbage;

        // Perfect Clear
        if (this.playField.getInactiveBlocks().length === 0) {
            garbage += 10;
        }

        // Send Garbage
        if (garbage > 0 && this.onAttack) {
            this.onAttack(garbage);
        }
    }

    /**
     * Get current score.
     */
    getScore(): number {
        return this.scoreSystem.getScore();
    }

    /**
     * Game over. emit from play field, when can not create tetromino anymore.
     */
    gameOver(gameOverType) {
        console.log(`Game Over - ${gameOverType}`);
    }

    /**
     * on input
     * @param direction direction
     * @param state key state - press, hold, release
     */
    onInput(direction: string, state: InputState) {
        this.playField.onInput(direction, state);
    }
}

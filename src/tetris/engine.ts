import {PlayField} from "./objects/playField";
import {TetrominoBox} from "./objects/tetrominoBox";
import {TetrominoBoxQueue} from "./objects/tetrominoBoxQueue";
import {LevelIndicator} from "./objects/levelIndicator";
import {InputState, TetrominoType, RotateType, CONST} from "./const/const";

/**
 * Tetris game engine.
 */
export class Engine {
    private playField: PlayField;
    private holdBox: TetrominoBox;
    private queue: TetrominoBoxQueue;
    private levelIndicator: LevelIndicator;
    private isBackToBackChain: boolean = false;

    private level: number;
    private score: number;
    private clearedLines: number;
    private nextLevelRequireClearedLines: number;

    private comboCount: number = -1;
    private onAttack: (count: number) => void;

    constructor(playField: PlayField, holdBox: TetrominoBox, queue: TetrominoBoxQueue, levelIndicator: LevelIndicator) {
        this.playField = playField;
        this.holdBox = holdBox;
        this.queue = queue;
        this.levelIndicator = levelIndicator;
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
        this.level = 1;
        this.nextLevelRequireClearedLines = this.level * 5;
        this.score = 0;
        this.clearedLines = 0;
    }

    /**
     * Start game.
     */
    start() {
        // Clear stats.
        this.clear();
        // Clear tetromino hold box.
        this.holdBox.clear();
        // Clear next tetromino queue.
        this.queue.clear();
        // Clear Play field.
        this.playField.clear();
        // Set auto drop delay.
        this.playField.autoDropDelay = this.getAutoDropDelay();
        // Clear level indicator.
        this.levelIndicator.clear();

        // Set level indicator.
        this.levelIndicator.setLevel(this.level);
        this.levelIndicator.setLine(0, this.nextLevelRequireClearedLines);
        this.levelIndicator.setScore(this.score);

        // Spawn tetromino.
        this.playField.spawnTetromino();
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
        const { pointSide, flatSide } = tSpinCornerOccupiedCount;

        // Is T-Spin
        const isTSpin =
            tetrominoType == TetrominoType.T &&
            droppedRotateType != lockedRotateType &&
            movement == 'rotate' &&
            pointSide + flatSide > 2;

        // Is T-Spin mini
        const isTSpinMini =
            isTSpin &&
            pointSide < 2 &&
            kickDataIndex < 3;

        /**
         * Back to Back
         * t-Spins and Mini t-Spins that do not clear any lines do not receive the Back-to-Back Bonus;
         * instead they are scored as normal. they also cannot start a Back-to-Back sequence,
         * however, they do not break an existing Back-to-Back sequence and so are included in the Back-to-Back description.
         */
        let isBackToBackBonus = false;
        if (this.isBackToBackChain) { // back to back chain is running.
            // if T-Spin or Tetris, keep up back to back chain.
            this.isBackToBackChain = Boolean(isTSpin || clearedLineCount == 4 || !clearedLineCount);
            // if back to back chain and cleared line, get back to back bonus.
            isBackToBackBonus = this.isBackToBackChain && clearedLineCount > 0;
        } else { // back to back chain is no running.
            // is Start chain ?
            // if T-Spin with clear line or Tetris, start chain.
            this.isBackToBackChain = Boolean((isTSpin && clearedLineCount) || clearedLineCount == 4);
        }

        // Combine action segment.
        const actionNameArray: string[] = [];
        if (isTSpin) actionNameArray.push('T-Spin');
        if (isTSpinMini) actionNameArray.push('Mini');
        if (clearedLineCount) actionNameArray.push(['Single', 'Double', 'Triple', 'Tetris'][clearedLineCount - 1]);

        // Create action name and get base score.
        let actionName: string | null = null;
        let scoreBase = 0;
        if (actionNameArray.length) {
            actionName = actionNameArray.join(' ');
            scoreBase = CONST.SCORE[actionName] || 0;
            if (!scoreBase) console.error(`Unexpected action - ${actionName}`);
        }

        // Add action score.
        if (scoreBase) {
            const score = scoreBase * (isBackToBackBonus ? 1.5 : 1) * this.level;
            this.score += score;
            const actionFullName = `${isBackToBackBonus ? 'Back to Back ' : ''}${actionName}`;
            this.levelIndicator.setAction(actionFullName);
            console.log(`${actionFullName} - ${score} (${scoreBase}${isBackToBackBonus ? ' x 1.5' : ''} x ${this.level})`);
        }

        // Add combo score.
        if (clearedLineCount) this.comboCount++;
        else this.comboCount = -1;

        this.levelIndicator.setCombo(this.comboCount);

        if (this.comboCount > 0) {
            const comboScore = 50 * this.comboCount * this.level;
            this.score += comboScore;
            console.log(`Combo ${this.comboCount} - ${comboScore} (50 x ${this.comboCount} x ${this.level})`);
        }

        // Add drop score.
        this.score += dropCounter.softDrop; // Soft drop is 1 point per cell.
        this.score += dropCounter.hardDrop * 2; // Hard drop is 2 point per cell.

        // Calculate level.
        if (actionName) {
            let lineCount = CONST.LINE_COUNT[actionName];
            if (isBackToBackBonus) lineCount = Math.ceil(lineCount * 1.5);
            this.addLineCount(lineCount);
        }

        // Update indicator.
        this.levelIndicator.setLevel(this.level);
        this.levelIndicator.setLine(this.clearedLines, this.nextLevelRequireClearedLines);
        this.levelIndicator.setScore(this.score);

        // Calculate Garbage (Multiplayer)
        let garbage = 0;
        
        // Basic Line Clears & T-Spins
        if (isTSpin) {
            if (clearedLineCount === 1) garbage = 2; // T-Spin Single
            else if (clearedLineCount === 2) garbage = 4; // T-Spin Double
            else if (clearedLineCount === 3) garbage = 6; // T-Spin Triple
        } else if (isTSpinMini) {
             if (clearedLineCount === 2) garbage = 1; // Mini T-Spin Double
        } else {
            if (clearedLineCount === 2) garbage = 1; // Double
            else if (clearedLineCount === 3) garbage = 2; // Triple
            else if (clearedLineCount === 4) garbage = 4; // Tetris
        }

        // Back-to-Back
        if (isBackToBackBonus) {
            garbage += 1;
        }

        // Combo
        // Ren (Combo) table: 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 4... (varies)
        // Guideline 2009:
        // 0-1: 0
        // 2-3: 1
        // 4-5: 2
        // 6-7: 3
        // 8-9: 4
        // 10+: 5
        if (this.comboCount >= 2) {
            if (this.comboCount < 4) garbage += 1;
            else if (this.comboCount < 6) garbage += 2;
            else if (this.comboCount < 8) garbage += 3;
            else if (this.comboCount < 10) garbage += 4;
            else garbage += 5;
        }

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
     * Add cleared line count and level up.
     */
    addLineCount(count: number) {
        this.clearedLines += count;
        if (this.clearedLines >= this.nextLevelRequireClearedLines) {
            while (true) {
                this.level++;
                this.nextLevelRequireClearedLines += this.level * 5;
                if (this.clearedLines < this.nextLevelRequireClearedLines) break;
            }
            this.levelIndicator.setLevel(this.level);
            this.playField.autoDropDelay = this.getAutoDropDelay();
        }
    }

    /**
     * Get auto drop speed. (milliseconds per line)
     * Calculate with level.
     */
    getAutoDropDelay() {
        return Math.pow((0.8 - ((this.level - 1) * 0.007)), (this.level - 1)) * 1000;
    }

    /**
     * Game over. emit from play field, when can not create tetromino anymore.
     */
    gameOver(gameOverType) {
        console.log(`Game Over - ${gameOverType}`);

        // TODO: Show game over screen and score.
        this.start();
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
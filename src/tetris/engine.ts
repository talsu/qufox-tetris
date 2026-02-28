import {PlayField} from "./objects/playField";
import {TetrominoBox} from "./objects/tetrominoBox";
import {TetrominoBoxQueue} from "./objects/tetrominoBoxQueue";
import {LevelIndicator} from "./objects/levelIndicator";
import {InputState, TetrominoType, RotateType} from "./const/const";
import {ScoreSystem, GameStats} from "./logic/scoreSystem";
import { AuthSnapshotSide, AuthSyncState } from '../shared/types/socketPayloads';

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
    private readonly isDebugLogging: boolean = typeof process !== 'undefined' ? process.env.NODE_ENV !== 'production' : true;

    private onAttack: (count: number) => void;

    public get holdBoxInstance(): TetrominoBox {
        return this.holdBox;
    }

    public get queueInstance(): TetrominoBoxQueue {
        return this.queue;
    }

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

        if (this.isDebugLogging && result.scoreAdded > 0 && result.actionName) {
            console.log(`${result.actionName} - ${result.scoreAdded}`);
        }
        if (this.isDebugLogging && result.combo > 0) {
             console.log(`Combo ${result.combo}`);
        }

        // Show action/combo popup at the center of the play field.
        this.playField.showPopup(result.actionName, result.combo);

        // Update indicator (sidebar stats only – action/combo moved to field popup).
        this.levelIndicator.setAction(result.actionName);
        this.levelIndicator.setCombo(result.combo);

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
     * Get current game stats (score, level, lines, etc.)
     */
    public getStats(): GameStats {
        return this.scoreSystem.getStats(this.gameTime);
    }

    public setRank(rank: number | null) {
        this.levelIndicator.setRank(rank);
    }

    public setPlayerName(name: string | null) {
        this.levelIndicator.setPlayerName(name);
    }

    public applyAuthoritativeSync(sync: AuthSyncState, stats: { score: number; level: number; lines: number }): void {
        const isPlayableType = (value: string): value is Exclude<TetrominoType, TetrominoType.GARBAGE> => {
            return value === TetrominoType.I
                || value === TetrominoType.J
                || value === TetrominoType.L
                || value === TetrominoType.O
                || value === TetrominoType.S
                || value === TetrominoType.T
                || value === TetrominoType.Z;
        };

        const queue = sync.queue.filter(isPlayableType);
        const bag = sync.bag.filter(isPlayableType);
        this.queue.setAuthoritativeState(queue, bag, sync.queueRngState);

        this.holdBox.clear();
        if (sync.hold && isPlayableType(sync.hold)) {
            this.holdBox.hold(sync.hold);
        }

        this.playField.applyAuthoritativeState(sync.boardCore, sync.active, sync.canHold);

        this.scoreSystem.setAuthoritativeState(stats.score, stats.level, stats.lines);
        this.playField.autoDropDelay = this.scoreSystem.getAutoDropDelay();
        this.levelIndicator.updateStats(this.scoreSystem.getStats(this.gameTime));
    }

    public getShadowSnapshotSide(): AuthSnapshotSide {
        const queueState = this.queue.getAuthoritativeState();
        const stats = this.getStats();
        return {
            board: this.playField.serializeEncoded(),
            score: stats.score,
            level: stats.level,
            lines: stats.lines,
            isAlive: true,
            sync: {
                boardCore: this.playField.serializeEncoded(),
                active: null,
                hold: this.holdBox.type,
                canHold: this.playField.canHoldFlag,
                queue: queueState.queue,
                bag: queueState.bag,
                queueRngState: queueState.queueRngState,
                gravityMsCounter: 0,
            },
        };
    }

    /**
     * Game over. emit from play field, when can not create tetromino anymore.
     */
    gameOver(gameOverType: string) {
        if (this.isDebugLogging) {
            console.log(`Game Over - ${gameOverType}`);
        }
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

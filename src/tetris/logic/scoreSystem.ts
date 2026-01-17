import { GameRules } from "./gameRules";
import { TetrominoType, RotateType } from "../const/const";

export interface LockResult {
    scoreAdded: number;
    actionName: string | null;
    isBackToBack: boolean;
    garbage: number;
    clearedLines: number;
    combo: number;
    level: number;
}

export class ScoreSystem {
    private level: number = 1;
    private score: number = 0;
    private clearedLines: number = 0;
    private nextLevelRequireClearedLines: number = 5;
    private comboCount: number = -1;
    private isBackToBackChain: boolean = false;

    // New stats
    private startTime: number = 0;
    private totalLinesCleared: number = 0;
    private tetrisCount: number = 0;
    private tSpinCount: number = 0;
    private maxCombo: number = 0;
    private totalPiecesLocked: number = 0;

    constructor() {
        this.clear();
    }

    clear() {
        this.level = 1;
        this.score = 0;
        this.clearedLines = 0;
        this.nextLevelRequireClearedLines = 5;
        this.comboCount = -1;
        this.isBackToBackChain = false;

        // Reset new stats
        this.startTime = Date.now();
        this.totalLinesCleared = 0;
        this.tetrisCount = 0;
        this.tSpinCount = 0;
        this.maxCombo = 0;
        this.totalPiecesLocked = 0;
    }

    start() {
        this.startTime = Date.now();
    }

    getLevel() {
        return this.level;
    }

    getScore() {
        return this.score;
    }

    getClearedLines() {
        return this.clearedLines;
    }

    getNextLevelRequireClearedLines() {
        return this.nextLevelRequireClearedLines;
    }

    getCombo() {
        return this.comboCount;
    }

    /**
     * Calculate score and stats when a piece locks.
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
    ): LockResult {
        this.totalPiecesLocked++;
        this.totalLinesCleared += clearedLineCount;

        const { pointSide, flatSide } = tSpinCornerOccupiedCount;

        // Is T-Spin
        const isTSpin =
            tetrominoType == TetrominoType.T &&
            droppedRotateType != lockedRotateType &&
            movement == 'rotate' &&
            pointSide + flatSide > 2;

        if (isTSpin) this.tSpinCount++;
        if (clearedLineCount === 4) this.tetrisCount++;

        // Is T-Spin mini
        const isTSpinMini =
            isTSpin &&
            pointSide < 2 &&
            kickDataIndex < 3;

        let isBackToBackBonus = false;
        if (this.isBackToBackChain) {
            this.isBackToBackChain = Boolean(isTSpin || clearedLineCount == 4 || !clearedLineCount);
            isBackToBackBonus = this.isBackToBackChain && clearedLineCount > 0;
        } else {
            this.isBackToBackChain = Boolean((isTSpin && clearedLineCount) || clearedLineCount == 4);
        }

        const actionNameArray: string[] = [];
        if (isTSpin) actionNameArray.push('T-Spin');
        if (isTSpinMini) actionNameArray.push('Mini');
        if (clearedLineCount) actionNameArray.push(['Single', 'Double', 'Triple', 'Tetris'][clearedLineCount - 1]);

        let actionName: string | null = null;
        let scoreBase = 0;
        if (actionNameArray.length) {
            actionName = actionNameArray.join(' ');
            scoreBase = GameRules.getBaseScore(actionName);
        }

        let scoreAdded = 0;
        if (scoreBase) {
            const score = scoreBase * (isBackToBackBonus ? 1.5 : 1) * this.level;
            scoreAdded += score;
        }

        // Combo
        if (clearedLineCount) this.comboCount++;
        else this.comboCount = -1;

        if (this.comboCount > this.maxCombo) {
            this.maxCombo = this.comboCount;
        }

        if (this.comboCount > 0) {
            const comboScore = 50 * this.comboCount * this.level;
            scoreAdded += comboScore;
        }

        // Drop Score
        scoreAdded += dropCounter.softDrop;
        scoreAdded += dropCounter.hardDrop * 2;

        this.score += scoreAdded;

        // Calculate Level
        if (actionName) {
            let lineCount = GameRules.getLineCount(actionName);
            if (isBackToBackBonus) lineCount = Math.ceil(lineCount * 1.5);
            this.addLineCount(lineCount);
        }

        // Calculate Garbage
        let garbage = 0;
        if (isTSpin) {
            if (clearedLineCount === 1) garbage = 2;
            else if (clearedLineCount === 2) garbage = 4;
            else if (clearedLineCount === 3) garbage = 6;
        } else if (isTSpinMini) {
            if (clearedLineCount === 2) garbage = 1;
        } else {
            if (clearedLineCount === 2) garbage = 1;
            else if (clearedLineCount === 3) garbage = 2;
            else if (clearedLineCount === 4) garbage = 4;
        }

        if (isBackToBackBonus) garbage += 1;

        if (this.comboCount >= 2) {
            if (this.comboCount < 4) garbage += 1;
            else if (this.comboCount < 6) garbage += 2;
            else if (this.comboCount < 8) garbage += 3;
            else if (this.comboCount < 10) garbage += 4;
            else garbage += 5;
        }

        // Return result
        return {
            scoreAdded,
            actionName: actionName ? `${isBackToBackBonus ? 'Back to Back ' : ''}${actionName}` : null,
            isBackToBack: isBackToBackBonus,
            garbage,
            clearedLines: clearedLineCount,
            combo: this.comboCount,
            level: this.level
        };
    }

    private addLineCount(count: number) {
        this.clearedLines += count;
        if (this.clearedLines >= this.nextLevelRequireClearedLines) {
            while (true) {
                this.level++;
                this.nextLevelRequireClearedLines += this.level * 5;
                if (this.clearedLines < this.nextLevelRequireClearedLines) break;
            }
        }
    }

    getAutoDropDelay() {
        return Math.pow((0.8 - ((this.level - 1) * 0.007)), (this.level - 1)) * 1000;
    }

    getStats(gameTime: number) {
        // Format Time: MM:SS.ms
        const minutes = Math.floor(gameTime / 60000);
        const seconds = Math.floor((gameTime % 60000) / 1000);
        const ms = Math.floor((gameTime % 1000) / 10); // Display 2 digits (centiseconds)

        const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;

        const minutesFloat = gameTime / 60000;
        const tpm = minutesFloat > 0 ? Math.floor(this.totalPiecesLocked / minutesFloat) : 0;
        const lpm = minutesFloat > 0 ? Math.floor(this.totalLinesCleared / minutesFloat) : 0;

        return {
            score: this.score,
            level: this.level,
            lines: this.totalLinesCleared,
            time: timeStr,
            goal: this.nextLevelRequireClearedLines - this.clearedLines,
            tetrises: this.tetrisCount,
            tspins: this.tSpinCount,
            combos: this.maxCombo,
            tpm: tpm,
            lpm: lpm
        };
    }
}

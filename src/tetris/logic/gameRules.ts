import { CONST, TetrominoType } from "../const/const";

/**
 * Game Rules Logic
 * Handles SRS Kick Data retrieval and Scoring rules.
 */
export class GameRules {
    /**
     * Get Wall Kick Data for SRS.
     * @param type The type of Tetromino.
     * @param rotationState The rotation state string (e.g. "0>R").
     * @returns Array of [x, y] offsets.
     */
    static getKickData(type: TetrominoType, rotationState: string): number[][] {
        if (type === TetrominoType.O) return [];
        if (type === TetrominoType.I) return CONST.TETROMINO.I_KICK_DATA[rotationState] || [];
        return CONST.TETROMINO.JLSTZ_KICK_DATA[rotationState] || [];
    }

    /**
     * Get Base Score for an action.
     * @param actionName The name of the action (e.g. "Single", "T-Spin Double").
     * @returns The base score points.
     */
    static getBaseScore(actionName: string): number {
        return CONST.SCORE[actionName] || 0;
    }

    /**
     * Get additional score bonus for an action.
     * This is intentionally separate from base score so optional rules
     * can be enabled by editing constants without changing scoring flow.
     */
    static getActionScoreBonus(actionName: string): number {
        return CONST.ACTION_SCORE_BONUS[actionName] || 0;
    }

    /**
     * Get the number of lines to send/count for an action.
     * @param actionName The name of the action.
     * @returns The line count.
     */
    static getLineCount(actionName: string): number {
        return CONST.LINE_COUNT[actionName] || 0;
    }

    /**
     * Get additional garbage bonus for an action.
     * Kept decoupled from base attack math for optional future tuning.
     */
    static getActionGarbageBonus(actionName: string): number {
        return CONST.ACTION_GARBAGE_BONUS[actionName] || 0;
    }
}

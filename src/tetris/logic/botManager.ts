import { Engine } from "../engine";
import { PlayField } from "../objects/playField";
import { TetrominoType, RotateType, InputState, CONST, ColRow } from "../const/const";
import { GameRules } from "./gameRules";

interface BotTarget {
    col: number;
    rotate: RotateType;
    useHold: boolean;
    type?: TetrominoType;
}

/**
 * Bot manager for Tetris.
 * Decides best moves and executes them via inputs.
 */
export class BotManager {
    private engine: Engine;
    private playField: PlayField;
    private botLevel: number;
    private isRunning: boolean = false;
    private currentTarget: BotTarget = null;
    private inputQueue: string[] = [];
    private lastInputTime: number = 0;
    private nextInputDelay: number = 100;

    constructor(engine: Engine, playField: PlayField, botLevel: number) {
        this.engine = engine;
        this.playField = playField;
        this.botLevel = Math.max(1, Math.min(100, botLevel));

        // Adjust speed based on level
        // Level 1: ~500ms per input, Level 100: ~30ms per input
        this.nextInputDelay = 500 - (this.botLevel * 4.7);
    }

    public start() {
        this.isRunning = true;
    }

    public stop() {
        this.isRunning = false;
        this.currentTarget = null;
        this.inputQueue = [];
    }

    public update(time: number, delta: number) {
        if (!this.isRunning) return;

        // If no active tetromino, wait
        const active = this.playField.activeTetrominoInstance;
        if (!active) {
            this.currentTarget = null;
            this.inputQueue = [];
            return;
        }

        // If no target or active tetromino changed, calculate new target
        if (!this.currentTarget || this.currentTarget.type !== active.type) {
            const bestMove = this.calculateBestMove(active);
            if (bestMove) {
                this.currentTarget = bestMove;
                this.currentTarget.type = active.type;
                this.generateInputQueue(active);
            }
        }

        // Execute input from queue
        if (this.inputQueue.length > 0 && time - this.lastInputTime > this.nextInputDelay) {
            const input = this.inputQueue.shift();
            this.engine.onInput(input, InputState.PRESS);
            this.lastInputTime = time;
        }
    }

    private calculateBestMove(active: any): BotTarget {
        const inactiveBlocks = this.playField.getInactiveBlocks();
        const nextType = this.engine.queueInstance.peek();
        const holdType = this.engine.holdBoxInstance.type;
        const canHold = this.playField.canHoldFlag;

        let bestScore = -Infinity;
        let bestMove = { col: active.col, rotate: active.rotateType, useHold: false };

        // Evaluate current piece
        const moves = this.getAllPossibleMoves(active.type, inactiveBlocks);
        for (const move of moves) {
            const score = this.evaluateBoard(move.blocks, inactiveBlocks);
            if (score > bestScore) {
                bestScore = score;
                bestMove = { col: move.col, rotate: move.rotate, useHold: false };
            }
        }

        // Evaluate hold piece
        if (canHold) {
            const targetHoldType = holdType || nextType;
            const holdMoves = this.getAllPossibleMoves(targetHoldType, inactiveBlocks);
            for (const move of holdMoves) {
                // Slightly penalize holding to avoid constant swapping if scores are close
                const score = this.evaluateBoard(move.blocks, inactiveBlocks) - 5;
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = { col: move.col, rotate: move.rotate, useHold: true };
                }
            }
        }

        // Add randomness for lower levels - reduced for level 50+
        if (this.botLevel < 95) {
            // Steep curve: level 50 has about 3% chance of random move, level 20 has 20%, level 80 has 0.4%
            const randomnessThreshold = Math.pow((100 - this.botLevel) / 100, 3) * 20;
            if (Math.random() * 100 < randomnessThreshold) {
                const randomMove = moves[Math.floor(Math.random() * moves.length)];
                if (randomMove) {
                    bestMove = { col: randomMove.col, rotate: randomMove.rotate, useHold: false };
                }
            }
        }

        return bestMove;
    }

    private getAllPossibleMoves(type: TetrominoType, inactiveBlocks: ColRow[]) {
        const moves: { col: number, rotate: RotateType, blocks: ColRow[] }[] = [];
        const rotations = CONST.TETROMINO.ROTATE_SEQ;

        for (const rotate of rotations) {
            // Find min/max column for this rotation
            const offsets = CONST.TETROMINO.BLOCKS[type][rotate];
            const minOffsetCol = Math.min(...offsets.map(o => o[0]));
            const maxOffsetCol = Math.max(...offsets.map(o => o[0]));

            for (let col = -minOffsetCol; col < CONST.PLAY_FIELD.COL_COUNT - maxOffsetCol; col++) {
                const finalRow = this.getFinalRow(type, rotate, col, inactiveBlocks);
                if (finalRow !== null) {
                    const blocks = CONST.TETROMINO.BLOCKS[type][rotate].map(o => [col + o[0], finalRow + o[1]] as ColRow);
                    moves.push({ col, rotate, blocks });
                }
            }
        }
        return moves;
    }

    private getFinalRow(type: TetrominoType, rotate: RotateType, col: number, inactiveBlocks: ColRow[]): number {
        let row = -2; // Start from spawn row
        if (!this.isValidPosition(type, rotate, col, row, inactiveBlocks)) return null;
        
        while (this.isValidPosition(type, rotate, col, row + 1, inactiveBlocks)) {
            row++;
        }
        return row;
    }

    private isValidPosition(type: TetrominoType, rotate: RotateType, col: number, row: number, inactiveBlocks: ColRow[]): boolean {
        const blocks = CONST.TETROMINO.BLOCKS[type][rotate].map(o => [col + o[0], row + o[1]]);
        return blocks.every(b => {
            if (b[0] < 0 || b[0] >= CONST.PLAY_FIELD.COL_COUNT || b[1] >= CONST.PLAY_FIELD.ROW_COUNT) return false;
            if (inactiveBlocks.some(ib => ib[0] === b[0] && ib[1] === b[1])) return false;
            return true;
        });
    }

    private evaluateBoard(newBlocks: ColRow[], inactiveBlocks: ColRow[]): number {
        const combined = [...inactiveBlocks, ...newBlocks];
        const heights = new Array(CONST.PLAY_FIELD.COL_COUNT).fill(0);
        let holes = 0;
        let aggregateHeight = 0;
        let bumpiness = 0;
        let clearedLines = 0;

        // Calculate heights and lines
        const rowCounts: Record<number, number> = {};
        combined.forEach(b => {
            const [c, r] = b;
            if (r >= 0) {
                heights[c] = Math.max(heights[c], CONST.PLAY_FIELD.ROW_COUNT - r);
                rowCounts[r] = (rowCounts[r] || 0) + 1;
            }
        });

        for (let r = 0; r < CONST.PLAY_FIELD.ROW_COUNT; r++) {
            if (rowCounts[r] === CONST.PLAY_FIELD.COL_COUNT) clearedLines++;
        }

        // Aggregate height
        heights.forEach(h => aggregateHeight += h);

        // Bumpiness
        for (let i = 0; i < heights.length - 1; i++) {
            bumpiness += Math.abs(heights[i] - heights[i + 1]);
        }

        // Holes
        for (let c = 0; c < CONST.PLAY_FIELD.COL_COUNT; c++) {
            let blockFound = false;
            for (let r = 0; r < CONST.PLAY_FIELD.ROW_COUNT; r++) {
                const hasBlock = combined.some(b => b[0] === c && b[1] === r);
                if (hasBlock) blockFound = true;
                else if (blockFound) holes++;
            }
        }

        // Standard Heuristic Weights (Tuned for better performance)
        // a * clearedLines + b * aggregateHeight + c * holes + d * bumpiness
        const a = 15.0;  // High reward for clearing lines
        const b = -4.0;  // Penalty for height
        const c = -25.0; // Very high penalty for creating holes
        const d = -3.0;  // Penalty for uneven board

        return (a * clearedLines) + (b * aggregateHeight) + (c * holes) + (d * bumpiness);
    }

    private generateInputQueue(active: any) {
        this.inputQueue = [];
        if (!this.currentTarget) return;

        if (this.currentTarget.useHold) {
            this.inputQueue.push('hold');
            return; // Target will be re-calculated next update
        }

        // Rotate
        const currentRotateIdx = CONST.TETROMINO.ROTATE_SEQ.indexOf(active.rotateType);
        const targetRotateIdx = CONST.TETROMINO.ROTATE_SEQ.indexOf(this.currentTarget.rotate);
        let rotateDiff = (targetRotateIdx - currentRotateIdx + 4) % 4;
        
        // Optimize rotation direction
        if (rotateDiff === 3) {
            this.inputQueue.push('anticlockwise');
        } else {
            for (let i = 0; i < rotateDiff; i++) {
                this.inputQueue.push('clockwise');
            }
        }

        // Move Horizontal
        // Note: active.col is the current col. We need to reach this.currentTarget.col.
        // Rotation might have changed the col if we use SRS, but we'll assume simple moves for now.
        // Actually, SRS kicks can change col. But our simple heuristic doesn't account for kicks yet.
        // For debugging/load testing, simple is fine.
        
        // Re-check current col after rotation simulation? 
        // For now, just generate based on current col vs target col.
        const colDiff = this.currentTarget.col - active.col;
        if (colDiff < 0) {
            for (let i = 0; i < Math.abs(colDiff); i++) this.inputQueue.push('left');
        } else if (colDiff > 0) {
            for (let i = 0; i < colDiff; i++) this.inputQueue.push('right');
        }

        // Hard Drop
        this.inputQueue.push('hardDrop');
    }
}

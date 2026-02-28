import { Engine } from "../engine";
import { PlayField } from "../objects/playField";
import { Tetromino } from "../objects/tetromino";
import { TetrominoType, RotateType, InputDirection, InputState, CONST, ColRow } from "../const/const";
import { GameRules } from "./gameRules";
import { ScoreSystem } from "./scoreSystem";

interface BotMoveResult {
    col: number;
    rotate: RotateType;
    blocks: ColRow[];
    isTSpin: boolean;
    garbage: number;
    clearedLines: number;
    isPerfectClear: boolean;
    isHardDrop: boolean;
    approachRotate?: RotateType;
    approachCol?: number;
    approachRow?: number;
    useHold: boolean;
    type?: TetrominoType;
}

interface LockOutcome {
    clearedLines: number;
    isPerfectClear: boolean;
}

interface TSpinCornerCount {
    pointSide: number;
    flatSide: number;
}

interface BotSearchState {
    combo: number;
    backToBack: boolean;
}

interface ResolvedBoard {
    board: ColRow[];
    clearedLines: number;
    isPerfectClear: boolean;
}

interface BranchCandidate {
    move: BotMoveResult;
    score: number;
}

interface PieceState {
    col: number;
    row: number;
    rotate: RotateType;
}

export class BotManager {
    private engine: Engine;
    private playField: PlayField;
    private botLevel: number;
    private isRunning: boolean = false;
    private currentTarget: BotMoveResult = null;
    private inputQueue: InputDirection[] = [];
    private lastInputTime: number = 0;
    private nextInputDelay: number = 100;
    private lastActiveTetromino: Tetromino = null;
    private predictedBackToBackChain: boolean = false;
    private predictedComboCount: number = -1;
    private seenCurrentBag = new Set<TetrominoType>();

    constructor(engine: Engine, playField: PlayField, botLevel: number) {
        this.engine = engine;
        this.playField = playField;
        this.botLevel = Math.max(1, Math.min(100, botLevel));
        this.nextInputDelay = 500 - (this.botLevel * 4.7);
    }

    public start() {
        this.isRunning = true;
    }

    public stop() {
        this.isRunning = false;
        this.currentTarget = null;
        this.inputQueue = [];
        this.lastActiveTetromino = null;
        this.predictedBackToBackChain = false;
        this.predictedComboCount = -1;
        this.seenCurrentBag.clear();
    }

    public update(time: number, delta: number) {
        if (!this.isRunning) return;

        const active = this.playField.activeTetrominoInstance;
        if (!active) {
            this.currentTarget = null;
            this.inputQueue = [];
            this.lastActiveTetromino = null;
            return;
        }

        if (this.lastActiveTetromino && active !== this.lastActiveTetromino && this.currentTarget && !this.currentTarget.useHold) {
            this.updatePredictedChains(this.currentTarget);
        }

        if (active !== this.lastActiveTetromino) {
            this.lastActiveTetromino = active;
            this.currentTarget = null;
            this.inputQueue = [];
            this.trackSeenBag(active.type);
        }

        if (!this.currentTarget) {
            const bestMove = this.calculateBestMove(active);
            if (bestMove) {
                this.currentTarget = bestMove;
                this.currentTarget.type = active.type;
                this.generateInputQueue(active);
            }
        }

        if (this.inputQueue.length > 0 && time - this.lastInputTime > this.nextInputDelay) {
            const input = this.inputQueue.shift();
            this.engine.onInput(input, InputState.PRESS);
            this.lastInputTime = time;
        }
    }

    private calculateBestMove(active: Tetromino): BotMoveResult {
        const inactiveBlocks = this.playField.getInactiveBlocks();
        const inactiveBlockSet = this.toBlockSet(inactiveBlocks);
        const nextType = this.engine.queueInstance.peek();
        const holdType = this.engine.holdBoxInstance.type;
        const canHold = this.playField.canHoldFlag;

        const searchState: BotSearchState = {
            combo: this.predictedComboCount,
            backToBack: this.predictedBackToBackChain
        };

        const lookaheadDepth = this.getLookaheadDepth();
        const upcoming = this.getUpcomingTypes(lookaheadDepth + 2);
        const activeStart: PieceState = { col: active.col, row: active.row, rotate: active.rotateType };

        let bestScore = -Infinity;
        let bestMove: BotMoveResult = null;

        const activeEval = this.evaluateMoveSet(active.type, inactiveBlocks, inactiveBlockSet, searchState, upcoming, lookaheadDepth, activeStart);
        if (activeEval) {
            bestScore = activeEval.score;
            bestMove = activeEval.move;
        }

        if (canHold) {
            const targetHoldType = holdType || nextType;
            const holdStart: PieceState = { col: 3, row: -2, rotate: RotateType.UP };
            const holdEval = this.evaluateMoveSet(targetHoldType, inactiveBlocks, inactiveBlockSet, searchState, upcoming, lookaheadDepth, holdStart);
            if (holdEval && holdEval.score - 18 > bestScore) {
                bestScore = holdEval.score - 18;
                bestMove = {
                    ...holdEval.move,
                    useHold: true,
                    type: targetHoldType
                };
            }
        }

        const currentMoves = this.getCandidateMoves(active.type, inactiveBlocks, inactiveBlockSet, activeStart);
        const randomnessThreshold = this.getRandomnessThreshold();
        if (this.botLevel < 95 && currentMoves.length > 0 && Math.random() * 100 < randomnessThreshold) {
            const randomMove = currentMoves[Math.floor(Math.random() * currentMoves.length)];
            if (randomMove) bestMove = randomMove;
        }

        return bestMove;
    }

    private evaluateMoveSet(
        type: TetrominoType,
        inactiveBlocks: ColRow[],
        inactiveBlockSet: Set<string>,
        searchState: BotSearchState,
        upcoming: TetrominoType[],
        depth: number,
        startState: PieceState = { col: 3, row: -2, rotate: RotateType.UP }
    ): BranchCandidate | null {
        const candidates = this.getCandidateMoves(type, inactiveBlocks, inactiveBlockSet, startState);
        if (candidates.length === 0) return null;

        let bestScore = -Infinity;
        let bestMove: BotMoveResult = null;
        for (const move of candidates) {
            const score = this.scoreMoveWithLookahead(move, inactiveBlocks, searchState, upcoming, depth);
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        return bestMove ? { move: bestMove, score: bestScore } : null;
    }

    private scoreMoveWithLookahead(
        move: BotMoveResult,
        inactiveBlocks: ColRow[],
        state: BotSearchState,
        upcoming: TetrominoType[],
        depth: number
    ): number {
        const immediate = this.evaluateBoard(move.blocks, inactiveBlocks, move, state, upcoming);
        if (depth <= 1 || upcoming.length === 0) return immediate;

        const survivalMode = this.getBoardFillRatio(inactiveBlocks) >= 0.65;

        const resolved = this.resolveBoardAfterLock(move.blocks, inactiveBlocks);
        const nextState = this.transitionState(state, move, resolved.clearedLines);

        const nextType = upcoming[0];
        const rest = upcoming.slice(1);
        const nextSet = this.toBlockSet(resolved.board);
        const nextCandidates = this.getCandidateMoves(nextType, resolved.board, nextSet, { col: 3, row: -2, rotate: RotateType.UP });
        if (nextCandidates.length === 0) return immediate - 8000;

        const beam = this.getBranchWidth();
        const ranked = nextCandidates
            .map(candidate => ({
                move: candidate,
                score: this.evaluateBoard(candidate.blocks, resolved.board, candidate, nextState, rest)
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, beam);

        let futureBest = -Infinity;
        for (const option of ranked) {
            const value = this.scoreMoveWithLookahead(option.move, resolved.board, nextState, rest, depth - 1);
            if (value > futureBest) futureBest = value;
        }

        const discount = survivalMode ? 0.24 : this.getFutureDiscount();
        return immediate + (futureBest * discount);
    }

    private getCandidateMoves(type: TetrominoType, inactiveBlocks: ColRow[], inactiveBlockSet: Set<string>, startState: PieceState): BotMoveResult[] {
        const moves = this.getAllPossibleMoves(type, inactiveBlocks);
        const result: BotMoveResult[] = [];

        for (const move of moves) {
            const outcome = this.getLockOutcome(move.blocks, inactiveBlocks);
            result.push({
                col: move.col,
                rotate: move.rotate,
                blocks: move.blocks,
                isTSpin: false,
                garbage: this.estimateGarbage(outcome.clearedLines, false, outcome.isPerfectClear, this.predictedComboCount, this.predictedBackToBackChain),
                clearedLines: outcome.clearedLines,
                isPerfectClear: outcome.isPerfectClear,
                isHardDrop: true,
                useHold: false,
                type
            });
        }

        if (type === TetrominoType.T) {
            result.push(...this.getAllTSpinMoves(inactiveBlocks, inactiveBlockSet, startState));
        }

        return result;
    }

    private getAllPossibleMoves(type: TetrominoType, inactiveBlocks: ColRow[]): { col: number, rotate: RotateType, blocks: ColRow[] }[] {
        const inactiveBlockSet = this.toBlockSet(inactiveBlocks);
        const moves: { col: number, rotate: RotateType, blocks: ColRow[] }[] = [];
        const rotations = CONST.TETROMINO.ROTATE_SEQ;

        for (const rotate of rotations) {
            const offsets = CONST.TETROMINO.BLOCKS[type][rotate];
            const minOffsetCol = Math.min(...offsets.map(offset => offset[0]));
            const maxOffsetCol = Math.max(...offsets.map(offset => offset[0]));

            for (let col = -minOffsetCol; col < CONST.PLAY_FIELD.COL_COUNT - maxOffsetCol; col++) {
                const finalRow = this.getFinalRow(type, rotate, col, inactiveBlockSet);
                if (finalRow === null) continue;

                const blocks = CONST.TETROMINO.BLOCKS[type][rotate].map(offset => [col + offset[0], finalRow + offset[1]] as ColRow);
                moves.push({ col, rotate, blocks });
            }
        }

        return moves;
    }

    private getAllTSpinMoves(inactiveBlocks: ColRow[], inactiveBlockSet: Set<string>, startState: PieceState): BotMoveResult[] {
        const result: BotMoveResult[] = [];
        const approachRotations = CONST.TETROMINO.ROTATE_SEQ;

        for (const approachRotate of approachRotations) {
            const approachOffsets = CONST.TETROMINO.BLOCKS[TetrominoType.T][approachRotate];
            const minOffsetCol = Math.min(...approachOffsets.map(offset => offset[0]));
            const maxOffsetCol = Math.max(...approachOffsets.map(offset => offset[0]));

            for (let col = -minOffsetCol; col < CONST.PLAY_FIELD.COL_COUNT - maxOffsetCol; col++) {
                const approachRow = this.getFinalRow(TetrominoType.T, approachRotate, col, inactiveBlockSet);
                if (approachRow === null) continue;

                const clockwiseTarget = this.getNextRotate(approachRotate, true);
                const anticlockwiseTarget = this.getNextRotate(approachRotate, false);
                const attempts: { rotate: RotateType, key: string }[] = [
                    { rotate: clockwiseTarget, key: `${approachRotate}>${clockwiseTarget}` },
                    { rotate: anticlockwiseTarget, key: `${approachRotate}>${anticlockwiseTarget}` }
                ];

                for (const attempt of attempts) {
                    const kickData = GameRules.getKickData(TetrominoType.T, attempt.key);
                    for (const kick of kickData) {
                        const newCol = col + kick[0];
                        const newRow = approachRow - kick[1];

                        if (!this.isValidPosition(TetrominoType.T, attempt.rotate, newCol, newRow, inactiveBlockSet)) continue;
                        if (this.isValidPosition(TetrominoType.T, attempt.rotate, newCol, newRow + 1, inactiveBlockSet)) continue;

                        const cornerCount = this.countOccupiedCorners(newCol, newRow, attempt.rotate, inactiveBlockSet);
                        const blocks = CONST.TETROMINO.BLOCKS[TetrominoType.T][attempt.rotate]
                            .map(offset => [newCol + offset[0], newRow + offset[1]] as ColRow);
                        const outcome = this.getLockOutcome(blocks, inactiveBlocks);

                        if (!this.shouldAcceptTSpinCandidate(approachRotate, attempt.rotate, cornerCount, outcome)) continue;
                        if (!this.isExecutableTSpinSequence(
                            inactiveBlockSet,
                            startState,
                            approachRotate,
                            col,
                            approachRow,
                            attempt.rotate,
                            newCol,
                            newRow
                        )) continue;

                        result.push({
                            col: newCol,
                            rotate: attempt.rotate,
                            blocks,
                            isTSpin: true,
                            garbage: this.estimateGarbage(outcome.clearedLines, true, outcome.isPerfectClear, this.predictedComboCount, this.predictedBackToBackChain),
                            clearedLines: outcome.clearedLines,
                            isPerfectClear: outcome.isPerfectClear,
                            isHardDrop: false,
                            approachRotate,
                            approachCol: col,
                            approachRow,
                            useHold: false,
                            type: TetrominoType.T
                        });
                    }
                }
            }
        }

        return result;
    }

    private getFinalRow(type: TetrominoType, rotate: RotateType, col: number, inactiveBlocks: Set<string>): number {
        let row = -2;
        if (!this.isValidPosition(type, rotate, col, row, inactiveBlocks)) return null;

        while (this.isValidPosition(type, rotate, col, row + 1, inactiveBlocks)) {
            row++;
        }

        return row;
    }

    private isValidPosition(type: TetrominoType, rotate: RotateType, col: number, row: number, inactiveBlocks: Set<string>): boolean {
        const blocks = CONST.TETROMINO.BLOCKS[type][rotate].map(offset => [col + offset[0], row + offset[1]] as ColRow);
        return blocks.every(([blockCol, blockRow]) => {
            if (blockCol < 0 || blockCol >= CONST.PLAY_FIELD.COL_COUNT || blockRow >= CONST.PLAY_FIELD.ROW_COUNT) return false;
            if (inactiveBlocks.has(this.blockKey(blockCol, blockRow))) return false;
            return true;
        });
    }

    private evaluateBoard(
        newBlocks: ColRow[],
        inactiveBlocks: ColRow[],
        move: BotMoveResult,
        searchState?: BotSearchState,
        upcoming?: TetrominoType[]
    ): number {
        const resolved = this.resolveBoardAfterLock(newBlocks, inactiveBlocks);
        const grid = this.boardToGrid(resolved.board);

        const heights = new Array<number>(CONST.PLAY_FIELD.COL_COUNT).fill(0);
        let holes = 0;
        let aggregateHeight = 0;
        let bumpiness = 0;
        let rowTransitions = 0;
        let columnTransitions = 0;
        let wellSum = 0;
        let maxHeight = 0;
        let topDangerCells = 0;

        for (let col = 0; col < CONST.PLAY_FIELD.COL_COUNT; col++) {
            let firstBlockRow = -1;
            let wellDepth = 0;

            for (let row = 0; row < CONST.PLAY_FIELD.ROW_COUNT; row++) {
                if (grid[row][col] && firstBlockRow === -1) firstBlockRow = row;

                const leftFilled = col === 0 || grid[row][col - 1];
                const rightFilled = col === CONST.PLAY_FIELD.COL_COUNT - 1 || grid[row][col + 1];
                if (!grid[row][col] && leftFilled && rightFilled) {
                    wellDepth++;
                    wellSum += wellDepth;
                } else {
                    wellDepth = 0;
                }
            }

            if (firstBlockRow !== -1) {
                heights[col] = CONST.PLAY_FIELD.ROW_COUNT - firstBlockRow;
                for (let row = firstBlockRow + 1; row < CONST.PLAY_FIELD.ROW_COUNT; row++) {
                    if (!grid[row][col]) holes++;
                }
            }

            aggregateHeight += heights[col];
            if (heights[col] > maxHeight) maxHeight = heights[col];
        }

        for (let i = 0; i < heights.length - 1; i++) {
            bumpiness += Math.abs(heights[i] - heights[i + 1]);
        }

        for (let row = 0; row < CONST.PLAY_FIELD.ROW_COUNT; row++) {
            let prevFilled = true;
            for (let col = 0; col < CONST.PLAY_FIELD.COL_COUNT; col++) {
                const filled = grid[row][col];
                if (filled !== prevFilled) rowTransitions++;
                prevFilled = filled;
            }
            if (!prevFilled) rowTransitions++;
        }

        for (let col = 0; col < CONST.PLAY_FIELD.COL_COUNT; col++) {
            let prevFilled = true;
            for (let row = 0; row < CONST.PLAY_FIELD.ROW_COUNT; row++) {
                const filled = grid[row][col];
                if (filled !== prevFilled) columnTransitions++;
                prevFilled = filled;
            }
            if (!prevFilled) columnTransitions++;
        }

        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < CONST.PLAY_FIELD.COL_COUNT; col++) {
                if (grid[row][col]) topDangerCells++;
            }
        }

        const activeState = searchState ?? { combo: this.predictedComboCount, backToBack: this.predictedBackToBackChain };
        const nextState = this.transitionState(activeState, move, resolved.clearedLines);
        const predictedGarbage = this.estimateGarbage(
            resolved.clearedLines,
            move.isTSpin,
            resolved.isPerfectClear,
            activeState.combo,
            activeState.backToBack
        );

        const tSpinSetupPotential = this.countTSpinSetupPotential(grid);
        const hasTetrisWell = this.hasTetrisWell(heights);
        const lookahead = upcoming ?? [];
        const fillRatio = this.getBoardFillRatio(resolved.board);
        const survivalMode = fillRatio >= 0.65;

        const isDangerState = maxHeight >= 14 || topDangerCells >= 3;
        const isCriticalState = maxHeight >= 16 || topDangerCells >= 6;

        const kpiWeights = this.getKpiWeights();
        const tetrisKpi = move.clearedLines === 4 ? 1 : 0;
        const tSpinKpi = move.isTSpin ? (move.clearedLines >= 2 ? 1.6 : 0.6) : 0;
        const comboKpi = nextState.combo > 0 ? nextState.combo : 0;

        const garbageScore = predictedGarbage * (survivalMode ? 70 : isDangerState ? 88 : 145);
        const clearUrgencyBonus = resolved.clearedLines * (survivalMode ? 170 : isDangerState ? 96 : 18);
        const setupBonus = (!isDangerState && !survivalMode ? tSpinSetupPotential * 16 : 0);
        const stackDangerPenalty = Math.max(0, maxHeight - 13) * 60;
        const nearTopPenalty = topDangerCells * 40;
        const criticalNoClearPenalty = (isCriticalState || survivalMode) && resolved.clearedLines === 0 ? 420 : 0;
        const weakTSpinPenalty = move.isTSpin && resolved.clearedLines < 2 ? (survivalMode ? 220 : 140) : 0;

        const iSoon = this.isPieceLikelySoon(TetrominoType.I, lookahead);
        const tSoon = this.isPieceLikelySoon(TetrominoType.T, lookahead);
        const tetrisPlanBonus = (!isDangerState && !survivalMode && hasTetrisWell && iSoon) ? 48 : 0;
        const tSpinPlanBonus = (!isDangerState && !survivalMode && tSpinSetupPotential > 0 && tSoon) ? 52 : 0;

        return garbageScore
            + clearUrgencyBonus
            + setupBonus
            + tetrisPlanBonus
            + tSpinPlanBonus
            + (tetrisKpi * kpiWeights.tetris)
            + (tSpinKpi * kpiWeights.tSpin)
            + (comboKpi * kpiWeights.combo)
            - weakTSpinPenalty
            - stackDangerPenalty
            - nearTopPenalty
            - criticalNoClearPenalty
            - (aggregateHeight * 2.4)
            - (holes * 30)
            - (bumpiness * 2.0)
            - (rowTransitions * 3.8)
            - (columnTransitions * 4.8)
            - (wellSum * 2.1);
    }

    private generateInputQueue(active: Tetromino) {
        this.inputQueue = [];
        if (!this.currentTarget) return;

        if (this.currentTarget.useHold) {
            this.inputQueue.push("hold");
            return;
        }

        if (!this.currentTarget.isHardDrop && this.currentTarget.approachRotate !== undefined) {
            this.pushRotationInputs(active.rotateType, this.currentTarget.approachRotate);

            const approachColDiff = this.currentTarget.approachCol - active.col;
            if (approachColDiff < 0) {
                for (let i = 0; i < Math.abs(approachColDiff); i++) this.inputQueue.push("left");
            } else if (approachColDiff > 0) {
                for (let i = 0; i < approachColDiff; i++) this.inputQueue.push("right");
            }

            const softDropCount = Math.max(0, this.currentTarget.approachRow - active.row);
            for (let i = 0; i < softDropCount; i++) {
                this.inputQueue.push("softDrop");
            }

            this.pushSingleRotation(this.currentTarget.approachRotate, this.currentTarget.rotate);
            return;
        }

        this.pushRotationInputs(active.rotateType, this.currentTarget.rotate);

        const colDiff = this.currentTarget.col - active.col;
        if (colDiff < 0) {
            for (let i = 0; i < Math.abs(colDiff); i++) this.inputQueue.push("left");
        } else if (colDiff > 0) {
            for (let i = 0; i < colDiff; i++) this.inputQueue.push("right");
        }

        this.inputQueue.push("hardDrop");
    }

    private pushRotationInputs(fromRotate: RotateType, toRotate: RotateType) {
        const currentRotateIdx = CONST.TETROMINO.ROTATE_SEQ.indexOf(fromRotate);
        const targetRotateIdx = CONST.TETROMINO.ROTATE_SEQ.indexOf(toRotate);
        const rotateDiff = (targetRotateIdx - currentRotateIdx + 4) % 4;

        if (rotateDiff === 3) {
            this.inputQueue.push("anticlockwise");
        } else {
            for (let i = 0; i < rotateDiff; i++) {
                this.inputQueue.push("clockwise");
            }
        }
    }

    private pushSingleRotation(fromRotate: RotateType, toRotate: RotateType) {
        const fromIdx = CONST.TETROMINO.ROTATE_SEQ.indexOf(fromRotate);
        const toIdx = CONST.TETROMINO.ROTATE_SEQ.indexOf(toRotate);
        const diff = (toIdx - fromIdx + 4) % 4;

        if (diff === 1) {
            this.inputQueue.push("clockwise");
        } else if (diff === 3) {
            this.inputQueue.push("anticlockwise");
        } else if (diff === 2) {
            this.inputQueue.push("clockwise");
            this.inputQueue.push("clockwise");
        }
    }

    private estimateGarbage(
        clearedLines: number,
        isTSpin: boolean,
        isPerfectClear: boolean,
        comboCount: number = this.predictedComboCount,
        backToBackActive: boolean = this.predictedBackToBackChain
    ): number {
        const nextCombo = clearedLines > 0 ? comboCount + 1 : -1;
        const isBackToBackBonus = clearedLines > 0 && backToBackActive && (isTSpin || clearedLines === 4);
        return ScoreSystem.calculateGarbageAttack({
            clearedLineCount: clearedLines,
            isTSpin,
            isTSpinMini: false,
            isBackToBackBonus,
            comboCount: nextCombo,
            isPerfectClear,
        });
    }

    private getLockOutcome(newBlocks: ColRow[], inactiveBlocks: ColRow[]): LockOutcome {
        const resolved = this.resolveBoardAfterLock(newBlocks, inactiveBlocks);
        return {
            clearedLines: resolved.clearedLines,
            isPerfectClear: resolved.isPerfectClear
        };
    }

    private resolveBoardAfterLock(newBlocks: ColRow[], inactiveBlocks: ColRow[]): ResolvedBoard {
        const combined = [...inactiveBlocks, ...newBlocks];
        const preGrid = this.createEmptyGrid();

        for (const [col, row] of combined) {
            if (row < 0 || row >= CONST.PLAY_FIELD.ROW_COUNT || col < 0 || col >= CONST.PLAY_FIELD.COL_COUNT) continue;
            preGrid[row][col] = true;
        }

        const fullRows = new Set<number>();
        for (let row = 0; row < CONST.PLAY_FIELD.ROW_COUNT; row++) {
            if (preGrid[row].every(Boolean)) fullRows.add(row);
        }

        const grid = this.createEmptyGrid();
        let writeRow = CONST.PLAY_FIELD.ROW_COUNT - 1;
        for (let row = CONST.PLAY_FIELD.ROW_COUNT - 1; row >= 0; row--) {
            if (fullRows.has(row)) continue;
            for (let col = 0; col < CONST.PLAY_FIELD.COL_COUNT; col++) {
                grid[writeRow][col] = preGrid[row][col];
            }
            writeRow--;
        }

        const board: ColRow[] = [];
        for (let row = 0; row < CONST.PLAY_FIELD.ROW_COUNT; row++) {
            for (let col = 0; col < CONST.PLAY_FIELD.COL_COUNT; col++) {
                if (grid[row][col]) board.push([col, row] as ColRow);
            }
        }

        return {
            board,
            clearedLines: fullRows.size,
            isPerfectClear: fullRows.size > 0 && board.length === 0
        };
    }

    private boardToGrid(board: ColRow[]): boolean[][] {
        const grid = this.createEmptyGrid();
        for (const [col, row] of board) {
            if (row < 0 || row >= CONST.PLAY_FIELD.ROW_COUNT || col < 0 || col >= CONST.PLAY_FIELD.COL_COUNT) continue;
            grid[row][col] = true;
        }
        return grid;
    }

    private countOccupiedCorners(col: number, row: number, rotate: RotateType, inactiveBlockSet: Set<string>): TSpinCornerCount {
        const result = { pointSide: 0, flatSide: 0 };
        const occupiedCorners = CONST.TETROMINO.T_SPIN_CORNER
            .map(([dx, dy]) => [col + dx, row + dy] as ColRow)
            .map(([cornerCol, cornerRow]) => {
                if (cornerCol < 0 || cornerCol >= CONST.PLAY_FIELD.COL_COUNT || cornerRow >= CONST.PLAY_FIELD.ROW_COUNT) {
                    return true;
                }
                if (cornerRow < 0) return false;
                return inactiveBlockSet.has(this.blockKey(cornerCol, cornerRow));
            });

        const rotateIndex = CONST.TETROMINO.ROTATE_SEQ.indexOf(rotate);
        for (let offset = 0; offset < 4; offset++) {
            const index = (CONST.TETROMINO.ROTATE_SEQ.length + rotateIndex + offset) % CONST.TETROMINO.ROTATE_SEQ.length;
            if (!occupiedCorners[index]) continue;
            if (offset < 2) result.pointSide++;
            else result.flatSide++;
        }

        return result;
    }

    private getNextRotate(rotate: RotateType, clockwise: boolean): RotateType {
        const index = CONST.TETROMINO.ROTATE_SEQ.indexOf(rotate);
        const nextIndex = clockwise
            ? (index + 1) % CONST.TETROMINO.ROTATE_SEQ.length
            : (CONST.TETROMINO.ROTATE_SEQ.length + index - 1) % CONST.TETROMINO.ROTATE_SEQ.length;
        return CONST.TETROMINO.ROTATE_SEQ[nextIndex];
    }

    private transitionState(state: BotSearchState, move: BotMoveResult, clearedLines: number): BotSearchState {
        const combo = clearedLines > 0 ? state.combo + 1 : -1;
        const isB2BAction = move.isTSpin || clearedLines === 4;
        let backToBack = state.backToBack;

        if (backToBack) {
            backToBack = Boolean(isB2BAction || clearedLines === 0);
        } else {
            backToBack = Boolean(isB2BAction);
        }

        return { combo, backToBack };
    }

    private updatePredictedChains(target: BotMoveResult) {
        const next = this.transitionState(
            { combo: this.predictedComboCount, backToBack: this.predictedBackToBackChain },
            target,
            target.clearedLines
        );
        this.predictedComboCount = next.combo;
        this.predictedBackToBackChain = next.backToBack;
    }

    private trackSeenBag(type: TetrominoType) {
        if (this.seenCurrentBag.size >= CONST.TETROMINO.TYPES.length) {
            this.seenCurrentBag.clear();
        }
        this.seenCurrentBag.add(type);
    }

    private getUpcomingTypes(count: number): TetrominoType[] {
        const queue = this.engine.queueInstance as unknown as { peekMany?: (c: number) => TetrominoType[], peek?: () => TetrominoType };
        if (typeof queue.peekMany === "function") {
            return queue.peekMany(count).filter(Boolean);
        }
        if (typeof queue.peek === "function") {
            const next = queue.peek();
            return next ? [next] : [];
        }
        return [];
    }

    private getLookaheadDepth(): number {
        if (this.botLevel >= 85) return 2;
        if (this.botLevel >= 45) return 2;
        return 1;
    }

    private getBranchWidth(): number {
        if (this.botLevel >= 85) return 6;
        if (this.botLevel >= 60) return 5;
        if (this.botLevel >= 30) return 4;
        return 3;
    }

    private getFutureDiscount(): number {
        return 0.62 + (this.botLevel / 100) * 0.18;
    }

    private getRandomnessThreshold(): number {
        return Math.pow((100 - this.botLevel) / 100, 2.4) * 26;
    }

    private getKpiWeights(): { tetris: number, tSpin: number, combo: number } {
        const quality = this.botLevel / 100;
        return {
            tetris: 45 + quality * 80,
            tSpin: 55 + quality * 95,
            combo: 18 + quality * 42
        };
    }

    private isPieceLikelySoon(type: TetrominoType, upcoming: TetrominoType[]): boolean {
        if (upcoming.includes(type)) return true;
        if (!this.seenCurrentBag.has(type) && this.seenCurrentBag.size > 0 && this.seenCurrentBag.size < CONST.TETROMINO.TYPES.length) {
            return true;
        }
        return false;
    }

    private hasTetrisWell(heights: number[]): boolean {
        for (let col = 0; col < heights.length; col++) {
            const current = heights[col];
            const left = col === 0 ? heights[col + 1] : heights[col - 1];
            const right = col === heights.length - 1 ? heights[col - 1] : heights[col + 1];
            if (left - current >= 3 && right - current >= 3) return true;
        }
        return false;
    }

    private countTSpinSetupPotential(grid: boolean[][]): number {
        let potential = 0;

        for (let row = 1; row < CONST.PLAY_FIELD.ROW_COUNT - 1; row++) {
            for (let col = 1; col < CONST.PLAY_FIELD.COL_COUNT - 1; col++) {
                if (grid[row][col]) continue;

                const cornerOccupiedCount = Number(grid[row - 1][col - 1])
                    + Number(grid[row - 1][col + 1])
                    + Number(grid[row + 1][col - 1])
                    + Number(grid[row + 1][col + 1]);
                if (cornerOccupiedCount < 3) continue;

                const sideSupportCount = Number(grid[row][col - 1]) + Number(grid[row][col + 1]);
                if (sideSupportCount < 1) continue;
                if (row > 1 && grid[row - 1][col]) continue;

                potential++;
            }
        }

        return potential;
    }

    private shouldAcceptTSpinCandidate(
        approachRotate: RotateType,
        lockedRotate: RotateType,
        cornerCount: TSpinCornerCount,
        outcome: LockOutcome
    ): boolean {
        if (approachRotate === lockedRotate) return false;
        if (cornerCount.pointSide + cornerCount.flatSide < 3) return false;
        if (outcome.clearedLines <= 0) return false;
        return true;
    }

    private isExecutableTSpinSequence(
        inactiveBlockSet: Set<string>,
        startState: PieceState,
        approachRotate: RotateType,
        approachCol: number,
        approachRow: number,
        targetRotate: RotateType,
        targetCol: number,
        targetRow: number
    ): boolean {
        const current: PieceState = { ...startState };
        if (!this.isValidPosition(TetrominoType.T, current.rotate, current.col, current.row, inactiveBlockSet)) return false;

        if (!this.applyRotationPath(current, approachRotate, inactiveBlockSet)) return false;

        const horizontalStep = approachCol > current.col ? 1 : -1;
        while (current.col !== approachCol) {
            const nextCol = current.col + horizontalStep;
            if (!this.isValidPosition(TetrominoType.T, current.rotate, nextCol, current.row, inactiveBlockSet)) return false;
            current.col = nextCol;
        }

        while (current.row < approachRow) {
            const nextRow = current.row + 1;
            if (!this.isValidPosition(TetrominoType.T, current.rotate, current.col, nextRow, inactiveBlockSet)) return false;
            current.row = nextRow;
        }

        if (current.row !== approachRow) return false;
        if (!this.applySingleRotation(current, targetRotate, inactiveBlockSet)) return false;

        if (current.rotate !== targetRotate || current.col !== targetCol || current.row !== targetRow) return false;
        if (this.isValidPosition(TetrominoType.T, current.rotate, current.col, current.row + 1, inactiveBlockSet)) return false;

        const corner = this.countOccupiedCorners(current.col, current.row, current.rotate, inactiveBlockSet);
        return corner.pointSide + corner.flatSide >= 3;
    }

    private applyRotationPath(current: PieceState, targetRotate: RotateType, inactiveBlockSet: Set<string>): boolean {
        while (current.rotate !== targetRotate) {
            const currentIndex = CONST.TETROMINO.ROTATE_SEQ.indexOf(current.rotate);
            const targetIndex = CONST.TETROMINO.ROTATE_SEQ.indexOf(targetRotate);
            const clockwiseDistance = (targetIndex - currentIndex + CONST.TETROMINO.ROTATE_SEQ.length) % CONST.TETROMINO.ROTATE_SEQ.length;
            const useClockwise = clockwiseDistance <= 2;
            if (!this.tryRotateState(current, useClockwise, inactiveBlockSet)) return false;
        }
        return true;
    }

    private applySingleRotation(current: PieceState, targetRotate: RotateType, inactiveBlockSet: Set<string>): boolean {
        const fromIndex = CONST.TETROMINO.ROTATE_SEQ.indexOf(current.rotate);
        const toIndex = CONST.TETROMINO.ROTATE_SEQ.indexOf(targetRotate);
        const diff = (toIndex - fromIndex + CONST.TETROMINO.ROTATE_SEQ.length) % CONST.TETROMINO.ROTATE_SEQ.length;

        if (diff === 0) return true;
        if (diff === 1) return this.tryRotateState(current, true, inactiveBlockSet);
        if (diff === 3) return this.tryRotateState(current, false, inactiveBlockSet);
        if (diff === 2) {
            return this.tryRotateState(current, true, inactiveBlockSet) && this.tryRotateState(current, true, inactiveBlockSet);
        }
        return false;
    }

    private tryRotateState(current: PieceState, clockwise: boolean, inactiveBlockSet: Set<string>): boolean {
        const nextRotate = this.getNextRotate(current.rotate, clockwise);
        const key = `${current.rotate}>${nextRotate}`;
        const kickData = GameRules.getKickData(TetrominoType.T, key);

        for (const [kickX, kickY] of kickData) {
            const nextCol = current.col + kickX;
            const nextRow = current.row - kickY;
            if (!this.isValidPosition(TetrominoType.T, nextRotate, nextCol, nextRow, inactiveBlockSet)) continue;
            current.col = nextCol;
            current.row = nextRow;
            current.rotate = nextRotate;
            return true;
        }

        return false;
    }

    private createEmptyGrid(): boolean[][] {
        return Array.from({ length: CONST.PLAY_FIELD.ROW_COUNT }, () => new Array<boolean>(CONST.PLAY_FIELD.COL_COUNT).fill(false));
    }

    private getBoardFillRatio(board: ColRow[]): number {
        const total = CONST.PLAY_FIELD.ROW_COUNT * CONST.PLAY_FIELD.COL_COUNT;
        if (total === 0) return 0;
        return board.length / total;
    }

    private toBlockSet(blocks: ColRow[]): Set<string> {
        const set = new Set<string>();
        for (const [col, row] of blocks) {
            set.add(this.blockKey(col, row));
        }
        return set;
    }

    private blockKey(col: number, row: number): string {
        return `${col},${row}`;
    }
}

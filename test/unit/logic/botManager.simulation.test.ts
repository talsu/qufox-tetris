import { BotManager } from "../../../src/tetris/logic/botManager";
import { TetrominoType, RotateType, ColRow } from "../../../src/tetris/const/const";

type MockTetromino = {
    type: TetrominoType;
    col: number;
    row: number;
    rotateType: RotateType;
};

type SimMove = {
    blocks: ColRow[];
    garbage: number;
    isTSpin: boolean;
    clearedLines: number;
};

type SimResult = {
    topOut: boolean;
    piecesPlaced: number;
    linesCleared: number;
    totalGarbage: number;
    tSpinMoves: number;
    tSpinHighValueMoves: number;
    tetrisMoves: number;
    maxCombo: number;
    highValueAttacks: number;
    maxHeight: number;
};

const callPrivateMethod = <T>(instance: unknown, key: string, ...args: unknown[]): T => {
    const method = Reflect.get(instance as object, key) as (...innerArgs: unknown[]) => unknown;
    return method.apply(instance, args) as T;
};

const createSequence = (bagCount: number): TetrominoType[] => {
    const bag: TetrominoType[] = [
        TetrominoType.I,
        TetrominoType.J,
        TetrominoType.L,
        TetrominoType.O,
        TetrominoType.S,
        TetrominoType.T,
        TetrominoType.Z
    ];

    const sequence: TetrominoType[] = [];
    for (let i = 0; i < bagCount; i++) {
        sequence.push(...bag);
    }
    return sequence;
};

const createMessyStartBoard = (): ColRow[] => {
    const holePattern = [4, 7, 2, 6, 3, 8, 1, 5];
    const blocks: ColRow[] = [];

    for (let row = 12; row < 20; row++) {
        const hole = holePattern[row - 12];
        for (let col = 0; col < 10; col++) {
            if (col === hole) continue;
            blocks.push([col, row] as ColRow);
        }
    }

    return blocks;
};

const collapseBoard = (blocks: ColRow[]): { board: ColRow[]; clearedLines: number } => {
    const rowCount = 20;
    const colCount = 10;
    const grid = Array.from({ length: rowCount }, () => new Array<boolean>(colCount).fill(false));

    for (const [col, row] of blocks) {
        if (col < 0 || col >= colCount || row < 0 || row >= rowCount) continue;
        grid[row][col] = true;
    }

    const fullRows = new Set<number>();
    for (let row = 0; row < rowCount; row++) {
        if (grid[row].every(Boolean)) fullRows.add(row);
    }

    const collapsed = Array.from({ length: rowCount }, () => new Array<boolean>(colCount).fill(false));
    let writeRow = rowCount - 1;
    for (let row = rowCount - 1; row >= 0; row--) {
        if (fullRows.has(row)) continue;
        for (let col = 0; col < colCount; col++) {
            collapsed[writeRow][col] = grid[row][col];
        }
        writeRow--;
    }

    const result: ColRow[] = [];
    for (let row = 0; row < rowCount; row++) {
        for (let col = 0; col < colCount; col++) {
            if (collapsed[row][col]) result.push([col, row] as ColRow);
        }
    }

    return {
        board: result,
        clearedLines: fullRows.size
    };
};

const getBoardMaxHeight = (board: ColRow[]): number => {
    const heights = new Array<number>(10).fill(0);
    for (const [col, row] of board) {
        heights[col] = Math.max(heights[col], 20 - row);
    }
    return Math.max(...heights);
};

const runBotSimulation = (sequence: TetrominoType[], initialBoard: ColRow[] = [], botLevel: number = 100): SimResult => {
    let board = [...initialBoard];
    let holdType: TetrominoType | null = null;
    let queueIndex = 0;

    const engine = {
        onInput: jest.fn(),
        queueInstance: {
            peek: jest.fn().mockReturnValue(TetrominoType.I),
            peekMany: jest.fn().mockImplementation((count: number) => {
                const next = sequence.slice(queueIndex, queueIndex + count);
                return next;
            })
        },
        holdBoxInstance: { type: null as TetrominoType | null }
    };

    const playField = {
        activeTetrominoInstance: null as MockTetromino | null,
        getInactiveBlocks: jest.fn(() => board),
        canHoldFlag: true
    };

    const botManager = new BotManager(engine as never, playField as never, botLevel);

    let topOut = false;
    let linesCleared = 0;
    let piecesPlaced = 0;
    let totalGarbage = 0;
    let tSpinMoves = 0;
    let tSpinHighValueMoves = 0;
    let tetrisMoves = 0;
    let combo = -1;
    let maxCombo = -1;
    let highValueAttacks = 0;
    let maxHeight = getBoardMaxHeight(board);

    while (queueIndex < sequence.length) {
        let activeType = sequence[queueIndex];
        queueIndex++;
        engine.queueInstance.peek.mockReturnValue(sequence[queueIndex] ?? TetrominoType.I);

        let active: MockTetromino = {
            type: activeType,
            col: 4,
            row: 0,
            rotateType: RotateType.UP
        };
        playField.activeTetrominoInstance = active;
        playField.canHoldFlag = true;

        let move = callPrivateMethod<SimMove & { useHold?: boolean } | null>(botManager, "calculateBestMove", active);
        if (!move) {
            topOut = true;
            break;
        }

        if (move.useHold) {
            if (holdType === null) {
                holdType = activeType;
                if (queueIndex >= sequence.length) {
                    topOut = true;
                    break;
                }
                activeType = sequence[queueIndex];
                queueIndex++;
            } else {
                const swapped = holdType;
                holdType = activeType;
                activeType = swapped;
            }

            engine.queueInstance.peek.mockReturnValue(sequence[queueIndex] ?? TetrominoType.I);
            active = {
                type: activeType,
                col: 4,
                row: 0,
                rotateType: RotateType.UP
            };
            playField.activeTetrominoInstance = active;
            playField.canHoldFlag = false;

            move = callPrivateMethod<SimMove | null>(botManager, "calculateBestMove", active);
            if (!move) {
                topOut = true;
                break;
            }
        }

        if (move.blocks.some(([, row]) => row < 0)) {
            topOut = true;
            break;
        }

        const combined = [...board, ...move.blocks];
        const collapsed = collapseBoard(combined);
        board = collapsed.board;
        piecesPlaced++;

        linesCleared += collapsed.clearedLines;
        totalGarbage += move.garbage;
        if (collapsed.clearedLines > 0) {
            combo++;
            if (combo > maxCombo) maxCombo = combo;
        } else {
            combo = -1;
        }
        if (collapsed.clearedLines === 4 && !move.isTSpin) tetrisMoves++;
        if (move.isTSpin) {
            tSpinMoves++;
            if (move.clearedLines >= 2) tSpinHighValueMoves++;
        }
        if (move.garbage >= 4) highValueAttacks++;

        maxHeight = Math.max(maxHeight, getBoardMaxHeight(board));
    }

    return {
        topOut,
        piecesPlaced,
        linesCleared,
        totalGarbage,
        tSpinMoves,
        tSpinHighValueMoves,
        tetrisMoves,
        maxCombo,
        highValueAttacks,
        maxHeight
    };
};

describe("BotManager simulation", () => {
    test("bot survives long deterministic sequence on clean board", () => {
        const sequence = createSequence(12);
        const result = runBotSimulation(sequence);

        expect(result.piecesPlaced).toBeGreaterThanOrEqual(50);
        expect(result.linesCleared).toBeGreaterThan(20);
        expect(result.maxHeight).toBeLessThanOrEqual(20);
    });

    test("bot survives messy board and still creates high-value attacks", () => {
        const sequence = createSequence(10);
        const result = runBotSimulation(sequence, createMessyStartBoard());

        expect(result.piecesPlaced).toBeGreaterThanOrEqual(40);
        expect(result.totalGarbage).toBeGreaterThan(0);
        expect(result.tSpinMoves).toBeGreaterThanOrEqual(1);
    });

    test("bot level 100 outperforms bot level 1 on KPI metrics", () => {
        const sequence = createSequence(10);
        const low = runBotSimulation(sequence, createMessyStartBoard(), 1);
        const high = runBotSimulation(sequence, createMessyStartBoard(), 100);

        expect(high.piecesPlaced).toBeGreaterThanOrEqual(low.piecesPlaced);
        expect(high.totalGarbage).toBeGreaterThanOrEqual(low.totalGarbage);
        expect(high.tetrisMoves).toBeGreaterThanOrEqual(low.tetrisMoves);
        expect(high.highValueAttacks).toBeGreaterThanOrEqual(low.highValueAttacks);
        expect(high.tSpinHighValueMoves).toBeGreaterThanOrEqual(low.tSpinHighValueMoves);
        expect(high.maxCombo).toBeGreaterThanOrEqual(low.maxCombo);
    });
});

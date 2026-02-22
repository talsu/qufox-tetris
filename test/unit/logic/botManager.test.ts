import { BotManager } from "../../../src/tetris/logic/botManager";
import { TetrominoType, RotateType, InputState, ColRow } from "../../../src/tetris/const/const";

type MockTetromino = {
    type: TetrominoType;
    col: number;
    row: number;
    rotateType: RotateType;
};

type BotMoveResult = {
    col: number;
    rotate: RotateType;
    clearedLines: number;
    isTSpin: boolean;
    isHardDrop: boolean;
};

type LockOutcome = {
    clearedLines: number;
    isPerfectClear: boolean;
};

const getPrivateValue = <T>(instance: unknown, key: string): T => {
    const value = Reflect.get(instance as object, key);
    return value as T;
};

const setPrivateValue = (instance: unknown, key: string, value: unknown): void => {
    Reflect.set(instance as object, key, value);
};

const callPrivateMethod = <T>(instance: unknown, key: string, ...args: unknown[]): T => {
    const method = Reflect.get(instance as object, key) as (...innerArgs: unknown[]) => unknown;
    return method.apply(instance, args) as T;
};

const createRowGapStack = (startRow: number, endRow: number, gapCol: number): ColRow[] => {
    const blocks: ColRow[] = [];
    for (let row = startRow; row <= endRow; row++) {
        for (let col = 0; col < 10; col++) {
            if (col === gapCol) continue;
            blocks.push([col, row] as ColRow);
        }
    }
    return blocks;
};

const createDenseBoardWithHole = (): ColRow[] => {
    const blocks: ColRow[] = [];
    for (let row = 7; row < 20; row++) {
        for (let col = 0; col < 10; col++) {
            if (row === 19 && col === 4) continue;
            blocks.push([col, row] as ColRow);
        }
    }
    return blocks;
};

const createMocks = () => {
    const activeTetromino: MockTetromino = {
        type: TetrominoType.T,
        col: 4,
        row: 0,
        rotateType: RotateType.UP
    };

    const engine = {
        onInput: jest.fn(),
        queueInstance: { peek: jest.fn().mockReturnValue(TetrominoType.T) },
        holdBoxInstance: { type: null as TetrominoType | null }
    };

    const playField = {
        activeTetrominoInstance: activeTetromino,
        getInactiveBlocks: jest.fn().mockReturnValue([] as ColRow[]),
        canHoldFlag: true
    };

    return { engine, playField, activeTetromino };
};

describe("BotManager", () => {
    test("adjusts input delay based on bot level", () => {
        const { engine, playField } = createMocks();
        const highLevelBot = new BotManager(engine as never, playField as never, 100);
        const lowLevelBot = new BotManager(engine as never, playField as never, 1);

        const highDelay = getPrivateValue<number>(highLevelBot, "nextInputDelay");
        const lowDelay = getPrivateValue<number>(lowLevelBot, "nextInputDelay");
        expect(highDelay).toBeLessThan(lowDelay);
    });

    test("computes a target and fills queue when started", () => {
        const { engine, playField } = createMocks();
        const botManager = new BotManager(engine as never, playField as never, 100);

        botManager.start();
        botManager.update(1000, 16);

        const currentTarget = getPrivateValue<unknown>(botManager, "currentTarget");
        const queue = getPrivateValue<string[]>(botManager, "inputQueue");
        expect(currentTarget).not.toBeNull();
        expect(queue.length).toBeGreaterThan(0);
    });

    test("executes queued inputs over time", () => {
        const { engine, playField } = createMocks();
        const botManager = new BotManager(engine as never, playField as never, 100);

        botManager.start();
        botManager.update(1000, 16);
        const initialQueueLength = getPrivateValue<string[]>(botManager, "inputQueue").length;
        const inputDelay = getPrivateValue<number>(botManager, "nextInputDelay");

        botManager.update(1000 + inputDelay + 10, 16);

        expect(engine.onInput).toHaveBeenCalledWith(expect.any(String), InputState.PRESS);
        expect(getPrivateValue<string[]>(botManager, "inputQueue").length).toBe(initialQueueLength - 1);
    });

    test("chooses a tetris clear on a clean four-line well", () => {
        const { engine, playField } = createMocks();
        playField.canHoldFlag = false;
        playField.getInactiveBlocks.mockReturnValue(createRowGapStack(16, 19, 0));

        const botManager = new BotManager(engine as never, playField as never, 100);
        const active: MockTetromino = { type: TetrominoType.I, col: 4, row: 0, rotateType: RotateType.UP };

        const bestMove = callPrivateMethod<BotMoveResult>(botManager, "calculateBestMove", active);

        expect(bestMove.clearedLines).toBe(4);
        expect(bestMove.isHardDrop).toBe(true);
        expect(bestMove.isTSpin).toBe(false);
    });

    test("generates soft-drop plus final rotation for tspin targets", () => {
        const { engine, playField, activeTetromino } = createMocks();
        const botManager = new BotManager(engine as never, playField as never, 100);

        setPrivateValue(botManager, "currentTarget", {
            col: 4,
            rotate: RotateType.RIGHT,
            blocks: [],
            isTSpin: true,
            garbage: 2,
            clearedLines: 1,
            isPerfectClear: false,
            isHardDrop: false,
            approachRotate: RotateType.UP,
            approachCol: 4,
            approachRow: 3,
            useHold: false,
            type: TetrominoType.T
        });

        callPrivateMethod<void>(botManager, "generateInputQueue", activeTetromino);

        const queue = getPrivateValue<string[]>(botManager, "inputQueue");
        expect(queue).toContain("softDrop");
        expect(queue).not.toContain("hardDrop");
        expect(queue[queue.length - 1]).toBe("clockwise");
    });

    test("adds back-to-back garbage bonus for tetris and tspin", () => {
        const { engine, playField } = createMocks();
        const botManager = new BotManager(engine as never, playField as never, 100);
        setPrivateValue(botManager, "predictedBackToBackChain", true);

        const tetrisGarbage = callPrivateMethod<number>(botManager, "estimateGarbage", 4, false, false);
        const tSpinDoubleGarbage = callPrivateMethod<number>(botManager, "estimateGarbage", 2, true, false);

        expect(tetrisGarbage).toBe(5);
        expect(tSpinDoubleGarbage).toBe(5);
    });

    test("rejects tspin candidates that clear no lines", () => {
        const { engine, playField } = createMocks();
        const botManager = new BotManager(engine as never, playField as never, 100);

        const accepted = callPrivateMethod<boolean>(
            botManager,
            "shouldAcceptTSpinCandidate",
            RotateType.UP,
            RotateType.RIGHT,
            { pointSide: 2, flatSide: 1 },
            { clearedLines: 0, isPerfectClear: false } as LockOutcome
        );

        expect(accepted).toBe(false);
    });

    test("scores tspin double higher than tspin single on same board", () => {
        const { engine, playField } = createMocks();
        const botManager = new BotManager(engine as never, playField as never, 100);
        const board = createRowGapStack(16, 19, 4);
        const newBlocks: ColRow[] = [[4, 15], [4, 14], [4, 13], [4, 12]];

        const singleScore = callPrivateMethod<number>(
            botManager,
            "evaluateBoard",
            newBlocks,
            board,
            {
                col: 4,
                rotate: RotateType.RIGHT,
                blocks: newBlocks,
                isTSpin: true,
                garbage: 2,
                clearedLines: 1,
                isPerfectClear: false,
                isHardDrop: false,
                useHold: false,
                type: TetrominoType.T
            }
        );

        const doubleScore = callPrivateMethod<number>(
            botManager,
            "evaluateBoard",
            newBlocks,
            board,
            {
                col: 4,
                rotate: RotateType.RIGHT,
                blocks: newBlocks,
                isTSpin: true,
                garbage: 4,
                clearedLines: 2,
                isPerfectClear: false,
                isHardDrop: false,
                useHold: false,
                type: TetrominoType.T
            }
        );

        expect(doubleScore).toBeGreaterThan(singleScore);
    });

    test("rejects non-executable tspin soft-drop sequence", () => {
        const { engine, playField } = createMocks();
        const botManager = new BotManager(engine as never, playField as never, 100);

        const blocked = new Set<string>(["5,0", "5,1", "5,2", "6,1"]);
        const executable = callPrivateMethod<boolean>(
            botManager,
            "isExecutableTSpinSequence",
            blocked,
            { col: 4, row: 0, rotate: RotateType.UP },
            RotateType.UP,
            5,
            1,
            RotateType.RIGHT,
            5,
            1
        );

        expect(executable).toBe(false);
    });

    test("prioritizes immediate line clears when board fill exceeds 65%", () => {
        const { engine, playField } = createMocks();
        const botManager = new BotManager(engine as never, playField as never, 100);
        const denseBoard = createDenseBoardWithHole();

        const clearMove: BotMoveResult & { blocks: ColRow[]; isPerfectClear: boolean; garbage: number; useHold: boolean; type: TetrominoType } = {
            col: 4,
            rotate: RotateType.UP,
            clearedLines: 1,
            isTSpin: false,
            isHardDrop: true,
            blocks: [[4, 19], [4, 18], [4, 17], [4, 16]],
            isPerfectClear: false,
            garbage: 0,
            useHold: false,
            type: TetrominoType.I
        };

        const noClearMove = {
            ...clearMove,
            clearedLines: 0,
            blocks: [[0, 6], [1, 6], [2, 6], [3, 6]] as ColRow[]
        };

        const clearScore = callPrivateMethod<number>(
            botManager,
            "evaluateBoard",
            clearMove.blocks,
            denseBoard,
            clearMove,
            { combo: -1, backToBack: false },
            []
        );
        const noClearScore = callPrivateMethod<number>(
            botManager,
            "evaluateBoard",
            noClearMove.blocks,
            denseBoard,
            noClearMove,
            { combo: -1, backToBack: false },
            []
        );

        expect(clearScore).toBeGreaterThan(noClearScore);
    });
});

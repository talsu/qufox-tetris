import { CONST, RotateType, TetrominoType } from '../src/tetris/const/const';
import { BoardCodec } from '../src/tetris/net/boardCodec';

type PieceType = Exclude<TetrominoType, TetrominoType.GARBAGE>;

export type BotDirection = 'left' | 'right' | 'clockwise' | 'anticlockwise' | 'hardDrop';

export interface BotSyncState {
    boardCore: string | Uint8Array | ArrayBuffer;
    active: {
        type: string;
        rotate: string;
        col: number;
        row: number;
    } | null;
}

export interface BotControllerState {
    level: number;
    inputSeq: number;
    plannedPiece: string | null;
    plannedActions: BotDirection[];
}

const ROWS = CONST.PLAY_FIELD.ROW_COUNT;
const COLS = CONST.PLAY_FIELD.COL_COUNT;
const ROTATIONS = CONST.TETROMINO.ROTATE_SEQ as RotateType[];
const PIECES = CONST.TETROMINO.BLOCKS as unknown as Record<PieceType, Record<RotateType, Array<[number, number]>>>;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isPieceType(value: string): value is PieceType {
    return Object.prototype.hasOwnProperty.call(PIECES, value);
}

function isRotation(value: string): value is RotateType {
    return ROTATIONS.includes(value as RotateType);
}

function boardFromCore(boardCore: string | Uint8Array | ArrayBuffer): boolean[][] {
    const grid = Array.from({ length: ROWS }, () => new Array<boolean>(COLS).fill(false));
    const blocks = BoardCodec.decode(boardCore);
    for (const b of blocks) {
        if (b.row >= 0 && b.row < ROWS && b.col >= 0 && b.col < COLS) {
            grid[b.row][b.col] = true;
        }
    }
    return grid;
}

function canPlace(grid: boolean[][], type: PieceType, rotate: RotateType, col: number, row: number): boolean {
    const offsets = PIECES[type][rotate];
    for (const [dx, dy] of offsets) {
        const x = col + dx;
        const y = row + dy;
        if (x < 0 || x >= COLS || y >= ROWS) {
            return false;
        }
        if (y >= 0 && grid[y][x]) {
            return false;
        }
    }
    return true;
}

function getLandingRow(grid: boolean[][], type: PieceType, rotate: RotateType, col: number): number | null {
    let row = -2;
    if (!canPlace(grid, type, rotate, col, row)) {
        return null;
    }
    while (canPlace(grid, type, rotate, col, row + 1)) {
        row += 1;
    }
    return row;
}

function scorePlacement(grid: boolean[][], type: PieceType, rotate: RotateType, col: number, row: number): number {
    const next = grid.map((line) => line.slice());
    const offsets = PIECES[type][rotate];
    for (const [dx, dy] of offsets) {
        const x = col + dx;
        const y = row + dy;
        if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
            next[y][x] = true;
        }
    }

    let cleared = 0;
    const kept: boolean[][] = [];
    for (let r = 0; r < ROWS; r += 1) {
        const full = next[r].every(Boolean);
        if (full) {
            cleared += 1;
        } else {
            kept.push(next[r]);
        }
    }
    while (kept.length < ROWS) {
        kept.unshift(new Array<boolean>(COLS).fill(false));
    }

    const heights = new Array<number>(COLS).fill(0);
    let holes = 0;
    for (let colIndex = 0; colIndex < COLS; colIndex += 1) {
        let seenBlock = false;
        for (let rowIndex = 0; rowIndex < ROWS; rowIndex += 1) {
            if (kept[rowIndex][colIndex]) {
                if (!seenBlock) {
                    heights[colIndex] = ROWS - rowIndex;
                    seenBlock = true;
                }
            } else if (seenBlock) {
                holes += 1;
            }
        }
    }

    let bumpiness = 0;
    let aggregateHeight = 0;
    for (let i = 0; i < COLS; i += 1) {
        aggregateHeight += heights[i];
        if (i < COLS - 1) {
            bumpiness += Math.abs(heights[i] - heights[i + 1]);
        }
    }

    return (cleared * 220) - (holes * 40) - (aggregateHeight * 2) - (bumpiness * 5);
}

function buildPlan(currentRotate: RotateType, currentCol: number, targetRotate: RotateType, targetCol: number): BotDirection[] {
    const actions: BotDirection[] = [];
    const from = ROTATIONS.indexOf(currentRotate);
    const to = ROTATIONS.indexOf(targetRotate);
    const clockwiseDistance = (to - from + ROTATIONS.length) % ROTATIONS.length;
    const antiDistance = (from - to + ROTATIONS.length) % ROTATIONS.length;
    if (clockwiseDistance <= antiDistance) {
        for (let i = 0; i < clockwiseDistance; i += 1) {
            actions.push('clockwise');
        }
    } else {
        for (let i = 0; i < antiDistance; i += 1) {
            actions.push('anticlockwise');
        }
    }

    const deltaCol = targetCol - currentCol;
    if (deltaCol > 0) {
        for (let i = 0; i < deltaCol; i += 1) {
            actions.push('right');
        }
    } else if (deltaCol < 0) {
        for (let i = 0; i < Math.abs(deltaCol); i += 1) {
            actions.push('left');
        }
    }

    actions.push('hardDrop');
    return actions;
}

export function extractBotLevel(payload: unknown): number {
    if (!isRecord(payload)) {
        return 0;
    }
    const candidate = payload.botLevel ?? payload.bot;
    const numeric = typeof candidate === 'string' ? Number.parseInt(candidate, 10) : Number(candidate);
    if (!Number.isFinite(numeric)) {
        return 0;
    }
    return Math.max(0, Math.min(100, Math.floor(numeric)));
}

export function createBotController(level: number): BotControllerState | null {
    const clamped = Math.max(0, Math.min(100, Math.floor(level)));
    if (clamped <= 0) {
        return null;
    }
    return {
        level: clamped,
        inputSeq: 0,
        plannedPiece: null,
        plannedActions: [],
    };
}

function shouldAct(level: number, rng: () => number): boolean {
    const chance = Math.min(1, 0.28 + (level / 100) * 0.82);
    return rng() <= chance;
}

function getActionsPerTick(level: number): number {
    if (level >= 95) return 3;
    if (level >= 80) return 2;
    return 1;
}

export function nextBotInputs(controller: BotControllerState, syncState: BotSyncState, rng: () => number = Math.random): BotDirection[] {
    if (!syncState.active) {
        controller.plannedActions = [];
        controller.plannedPiece = null;
        return [];
    }
    if (!isPieceType(syncState.active.type) || !isRotation(syncState.active.rotate)) {
        controller.plannedActions = [];
        controller.plannedPiece = null;
        return [];
    }

    const activeType = syncState.active.type;
    const activeRotate = syncState.active.rotate;
    const activeCol = syncState.active.col;

    if (controller.plannedPiece !== activeType || controller.plannedActions.length === 0) {
        const grid = boardFromCore(syncState.boardCore);
        let bestScore = -Infinity;
        let bestRotate: RotateType = activeRotate;
        let bestCol = activeCol;

        for (const rotate of ROTATIONS) {
            const offsets = PIECES[activeType][rotate];
            const minOffset = Math.min(...offsets.map(([dx]) => dx));
            const maxOffset = Math.max(...offsets.map(([dx]) => dx));
            for (let col = -minOffset; col <= (COLS - 1 - maxOffset); col += 1) {
                const landingRow = getLandingRow(grid, activeType, rotate, col);
                if (landingRow === null) {
                    continue;
                }
                const score = scorePlacement(grid, activeType, rotate, col, landingRow);
                if (score > bestScore) {
                    bestScore = score;
                    bestRotate = rotate;
                    bestCol = col;
                }
            }
        }

        controller.plannedActions = buildPlan(activeRotate, activeCol, bestRotate, bestCol);
        controller.plannedPiece = activeType;
    }

    if (!shouldAct(controller.level, rng)) {
        return [];
    }

    const emitted: BotDirection[] = [];
    const budget = getActionsPerTick(controller.level);
    for (let i = 0; i < budget; i += 1) {
        const next = controller.plannedActions.shift();
        if (!next) {
            break;
        }
        emitted.push(next);
        if (next === 'hardDrop') {
            controller.plannedPiece = null;
            controller.plannedActions = [];
            break;
        }
    }
    return emitted;
}

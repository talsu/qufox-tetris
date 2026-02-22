import { nextLcg, normalizeSeed } from './random';
import { CONST, RotateType, TetrominoType } from '../../tetris/const/const';
import { GameRules } from '../../tetris/logic/gameRules';
import { ScoreSystem } from '../../tetris/logic/scoreSystem';

const BOARD_ROWS = 20;
const BOARD_COLS = 10;
const AUTH_TICK_MS = 100;
const PREVIEW_QUEUE_SIZE = 6;

const ROTATIONS = CONST.TETROMINO.ROTATE_SEQ as Rotation[];
type Rotation = RotateType;
type PlayerKey = 'p1' | 'p2';

type PieceType = Exclude<TetrominoType, TetrominoType.GARBAGE>;

type ActivePiece = {
    type: PieceType;
    rotate: Rotation;
    col: number;
    row: number;
    lowestRow: number;
    manipulationCount: number;
    lockDelayMsCounter: number;
    droppedRotateType: Rotation;
    lastMovement: string;
    lastKickDataIndex: number;
    dropCounter: { softDrop: number; hardDrop: number; autoDrop: number };
};

type PlayerState = {
    name: string;
    seed: number;
    queueRngState: number;
    garbageRngState: number;
    board: string[][];
    bag: PieceType[];
    queue: PieceType[];
    active: ActivePiece | null;
    hold: PieceType | null;
    canHold: boolean;
    score: number;
    level: number;
    lines: number;
    scoreSystem: ScoreSystem;
    isAlive: boolean;
    pendingGarbage: number;
    lastHole: number;
    gravityMsCounter: number;
    inputQueue: Array<{ direction: string; state: string }>;
    lastSeq: number;
};

type SyncState = {
    boardCore: string;
    active: {
        type: PieceType;
        rotate: Rotation;
        col: number;
        row: number;
    } | null;
    hold: PieceType | null;
    canHold: boolean;
    queue: PieceType[];
    bag: PieceType[];
    queueRngState: number;
    gravityMsCounter: number;
};

const PIECES = CONST.TETROMINO.BLOCKS as unknown as Record<PieceType, Record<Rotation, Array<[number, number]>>>;

const TYPES = Object.keys(PIECES) as PieceType[];

function randomHole(except: number, nextRandom: () => number): number {
    if (except < 0 || except >= BOARD_COLS) {
        return Math.floor(nextRandom() * BOARD_COLS);
    }
    let next = Math.floor(nextRandom() * (BOARD_COLS - 1));
    if (next >= except) next += 1;
    return next;
}

function emptyBoard(): string[][] {
    return Array.from({ length: BOARD_ROWS }, () => new Array(BOARD_COLS).fill('0'));
}

function createPlayer(name: string, seed: number): PlayerState {
    const queueSeed = normalizeSeed(seed);
    const garbageSeed = (queueSeed ^ 0x9e3779b9) >>> 0 || 1;
    const scoreSystem = new ScoreSystem();
    scoreSystem.start();
    return {
        name,
        seed,
        queueRngState: queueSeed,
        garbageRngState: garbageSeed,
        board: emptyBoard(),
        bag: [],
        queue: [],
        active: null,
        hold: null,
        canHold: true,
        score: 0,
        level: 1,
        lines: 0,
        scoreSystem,
        isAlive: true,
        pendingGarbage: 0,
        lastHole: -1,
        gravityMsCounter: 0,
        inputQueue: [],
        lastSeq: 0,
    };
}

function nextQueueRandom(player: PlayerState): number {
    const next = nextLcg(player.queueRngState);
    player.queueRngState = next.state;
    return next.value;
}

function nextGarbageRandom(player: PlayerState): number {
    const next = nextLcg(player.garbageRngState);
    player.garbageRngState = next.state;
    return next.value;
}

function getAutoDropDelay(level: number): number {
    return Math.pow((0.8 - ((level - 1) * 0.007)), (level - 1)) * 1000;
}

function cloneActiveBlocks(active: ActivePiece | null): Array<[number, number]> {
    if (!active) return [];
    return PIECES[active.type][active.rotate].map(([dx, dy]) => [active.col + dx, active.row + dy]);
}

function canPlace(player: PlayerState, active: ActivePiece, col: number, row: number, rotate: Rotation): boolean {
    const blocks = PIECES[active.type][rotate];
    for (const [dx, dy] of blocks) {
        const x = col + dx;
        const y = row + dy;
        if (x < 0 || x >= BOARD_COLS || y >= BOARD_ROWS) {
            return false;
        }
        if (y >= 0 && player.board[y][x] !== '0') {
            return false;
        }
    }
    return true;
}

function ensureQueue(player: PlayerState): void {
    while (player.queue.length < PREVIEW_QUEUE_SIZE) {
        if (player.bag.length === 0) {
            player.bag = TYPES.slice();
        }
        const pickIndex = Math.floor(nextQueueRandom(player) * player.bag.length);
        const [nextType] = player.bag.splice(pickIndex, 1);
        player.queue.push(nextType as PieceType);
    }
}

function spawn(player: PlayerState, type?: PieceType): boolean {
    if (!player.isAlive) return false;
    ensureQueue(player);
    const nextType = type || (player.queue.shift() as PieceType);
    ensureQueue(player);
    const active: ActivePiece = {
        type: nextType,
        rotate: RotateType.UP,
        col: 3,
        row: -2,
        lowestRow: -2,
        manipulationCount: 0,
        lockDelayMsCounter: 0,
        droppedRotateType: RotateType.UP,
        lastMovement: 'spawn',
        lastKickDataIndex: 0,
        dropCounter: {
            softDrop: 0,
            hardDrop: 0,
            autoDrop: 0,
        },
    };
    if (!canPlace(player, active, active.col, active.row, active.rotate)) {
        player.isAlive = false;
        player.active = null;
        return false;
    }
    player.active = active;
    player.canHold = true;
    return true;
}

function isCellOccupied(player: PlayerState, col: number, row: number): boolean {
    if (col < 0 || col >= BOARD_COLS || row < -BOARD_ROWS || row >= BOARD_ROWS) {
        return true;
    }
    if (row < 0) {
        return false;
    }
    return player.board[row][col] !== '0';
}

function getTSpinCornerOccupiedCount(player: PlayerState, active: ActivePiece): { pointSide: number; flatSide: number } {
    if (active.type !== TetrominoType.T) {
        return { pointSide: 0, flatSide: 0 };
    }

    const cornerOccupiedArray = CONST.TETROMINO.T_SPIN_CORNER
        .map(([dx, dy]) => [active.col + dx, active.row + dy] as const)
        .map(([col, row]) => isCellOccupied(player, col, row));

    const rotateIndex = ROTATIONS.indexOf(active.rotate);
    let pointSide = 0;
    let flatSide = 0;

    for (let offset = 0; offset < 4; offset += 1) {
        const index = (ROTATIONS.length + rotateIndex + offset) % ROTATIONS.length;
        if (!cornerOccupiedArray[index]) {
            continue;
        }
        if (offset < 2) {
            pointSide += 1;
        } else {
            flatSide += 1;
        }
    }

    return { pointSide, flatSide };
}

function applyGarbage(player: PlayerState): void {
    if (!player.isAlive || player.pendingGarbage <= 0) return;
    const count = player.pendingGarbage;
    player.pendingGarbage = 0;

    for (let i = 0; i < count; i += 1) {
        player.board.shift();
        const hole = randomHole(player.lastHole, () => nextGarbageRandom(player));
        player.lastHole = hole;
        const row = new Array(BOARD_COLS).fill('G');
        row[hole] = '0';
        player.board.push(row);
    }

    if (player.active) {
        player.active.row -= count;
        if (!canPlace(player, player.active, player.active.col, player.active.row, player.active.rotate)) {
            player.isAlive = false;
            player.active = null;
        }
    }
}

function clearLines(player: PlayerState): number {
    const kept: string[][] = [];
    let cleared = 0;
    for (let r = 0; r < BOARD_ROWS; r += 1) {
        const full = player.board[r].every((c) => c !== '0');
        if (full) cleared += 1;
        else kept.push(player.board[r]);
    }
    while (kept.length < BOARD_ROWS) {
        kept.unshift(new Array(BOARD_COLS).fill('0'));
    }
    player.board = kept;
    return cleared;
}

function lockPiece(player: PlayerState): number {
    if (!player.active || !player.isAlive) return 0;
    const blocks = cloneActiveBlocks(player.active);
    for (const [x, y] of blocks) {
        if (y < 0) {
            player.isAlive = false;
            player.active = null;
            return 0;
        }
        player.board[y][x] = player.active.type;
    }

    const locked = player.active;
    const cleared = clearLines(player);
    const tSpinCornerOccupiedCount = getTSpinCornerOccupiedCount(player, locked);
    const scoreResult = player.scoreSystem.onLock(
        cleared,
        locked.type,
        locked.droppedRotateType,
        locked.rotate,
        locked.lastMovement,
        locked.lastKickDataIndex,
        locked.dropCounter,
        tSpinCornerOccupiedCount,
    );

    const stats = player.scoreSystem.getStats(0);
    player.score = stats.score;
    player.level = stats.level;
    player.lines = stats.lines;

    let garbage = scoreResult.garbage;
    if (player.board.every((row) => row.every((cell) => cell === '0'))) {
        garbage += 10;
    }

    player.active = null;
    spawn(player);
    return garbage;
}

function moveDown(player: PlayerState, dropType: 'softDrop' | 'hardDrop' | 'autoDrop' = 'autoDrop'): boolean {
    if (!player.active || !player.isAlive) return false;
    const { active } = player;
    const nextRow = active.row + 1;
    if (canPlace(player, active, active.col, nextRow, active.rotate)) {
        active.row = nextRow;
        active.lastMovement = 'down';
        active.dropCounter[dropType] += 1;
        if (active.row > active.lowestRow) {
            active.lowestRow = active.row;
            active.manipulationCount = 0;
        }
        if (active.row > -2) {
            active.droppedRotateType = active.rotate;
        }
        return true;
    }
    return false;
}

function isLockable(player: PlayerState, active: ActivePiece): boolean {
    return !canPlace(player, active, active.col, active.row + 1, active.rotate);
}

function handleSuccessfulManipulation(player: PlayerState): void {
    if (!player.active) return;
    const active = player.active;

    if (active.row > active.lowestRow) {
        active.lowestRow = active.row;
        active.manipulationCount = 0;
    } else {
        active.manipulationCount += 1;
    }

    if (isLockable(player, active) && active.manipulationCount <= 15) {
        active.lockDelayMsCounter = 0;
    }
}

function applyInput(player: PlayerState, input: { direction: string; state: string }): number {
    if (!player.active || !player.isAlive) return 0;
    const { direction, state } = input;
    if (state !== 'press' && state !== 'hold') return 0;
    const isOneShotAction = direction === 'hardDrop'
        || direction === 'hold'
        || direction === 'clockwise'
        || direction === 'anticlockwise';
    if (isOneShotAction && state !== 'press') return 0;

    const { active } = player;
    if (direction === 'left') {
        const col = active.col - 1;
        if (canPlace(player, active, col, active.row, active.rotate)) {
            active.col = col;
            active.lastMovement = 'left';
            handleSuccessfulManipulation(player);
        }
        return 0;
    }
    if (direction === 'right') {
        const col = active.col + 1;
        if (canPlace(player, active, col, active.row, active.rotate)) {
            active.col = col;
            active.lastMovement = 'right';
            handleSuccessfulManipulation(player);
        }
        return 0;
    }
    if (direction === 'softDrop') {
        if (moveDown(player, 'softDrop') && player.active && isLockable(player, player.active)) {
            player.active.lockDelayMsCounter = 0;
        }
        return 0;
    }
    if (direction === 'hardDrop') {
        while (moveDown(player, 'hardDrop')) {
        }
        active.lastMovement = 'hardDrop';
        return lockPiece(player);
    }
    if (direction === 'clockwise' || direction === 'anticlockwise') {
        const idx = ROTATIONS.indexOf(active.rotate);
        const nextIdx = direction === 'clockwise'
            ? (idx + 1) % ROTATIONS.length
            : (idx + ROTATIONS.length - 1) % ROTATIONS.length;
        const rotate = ROTATIONS[nextIdx];
        const kickData = GameRules.getKickData(active.type as TetrominoType, `${active.rotate}>${rotate}`);
        const attempts = kickData.length > 0 ? kickData : [[0, 0]];

        for (let attemptIndex = 0; attemptIndex < attempts.length; attemptIndex += 1) {
            const [kickX, kickY] = attempts[attemptIndex];
            const kickedCol = active.col + kickX;
            const kickedRow = active.row - kickY;
            if (!canPlace(player, active, kickedCol, kickedRow, rotate)) {
                continue;
            }
            active.rotate = rotate;
            active.col = kickedCol;
            active.row = kickedRow;
            active.lastMovement = 'rotate';
            active.lastKickDataIndex = attemptIndex;
            active.droppedRotateType = rotate;
            handleSuccessfulManipulation(player);
            break;
        }
        return 0;
    }
    if (direction === 'hold' && player.canHold) {
        const swapType = player.hold;
        player.hold = active.type;
        player.active = null;
        player.canHold = false;
        spawn(player, swapType || undefined);
        return 0;
    }
    return 0;
}

function boardString(player: PlayerState): string {
    const grid = player.board.map((row) => row.slice());
    const activeBlocks = cloneActiveBlocks(player.active);
    for (const [x, y] of activeBlocks) {
        if (y >= 0 && y < BOARD_ROWS && x >= 0 && x < BOARD_COLS && player.active) {
            grid[y][x] = player.active.type;
        }
    }

    let out = '';
    for (let y = 0; y < BOARD_ROWS; y += 1) {
        for (let x = 0; x < BOARD_COLS; x += 1) {
            const c = grid[y][x];
            out += c === '0' ? '0' : (c === 'G' ? 'G' : c);
        }
    }
    return out;
}

function boardCoreString(player: PlayerState): string {
    let out = '';
    for (let y = 0; y < BOARD_ROWS; y += 1) {
        for (let x = 0; x < BOARD_COLS; x += 1) {
            const c = player.board[y][x];
            out += c === '0' ? '0' : (c === 'G' ? 'G' : c);
        }
    }
    return out;
}

function syncSnapshot(player: PlayerState): SyncState {
    return {
        boardCore: boardCoreString(player),
        active: player.active
            ? {
                type: player.active.type,
                rotate: player.active.rotate,
                col: player.active.col,
                row: player.active.row,
            }
            : null,
        hold: player.hold,
        canHold: player.canHold,
        queue: player.queue.slice(),
        bag: player.bag.slice(),
        queueRngState: player.queueRngState,
        gravityMsCounter: player.gravityMsCounter,
    };
}

function snapshot(player: PlayerState): { board: string; score: number; level: number; lines: number; isAlive: boolean } {
    return {
        board: boardString(player),
        score: player.score,
        level: player.level,
        lines: player.lines,
        isAlive: player.isAlive,
    };
}

export class AuthoritativeMatch {
    players: Record<PlayerKey, PlayerState>;
    seeds: Record<PlayerKey, number>;
    tick: number;

    constructor(p1Name?: string, p2Name?: string, p1Seed?: number, p2Seed?: number) {
        const seed1 = Number.isFinite(p1Seed) ? (p1Seed as number) : 1;
        const seed2 = Number.isFinite(p2Seed) ? (p2Seed as number) : 2;
        this.players = {
            p1: createPlayer(p1Name || 'P1', seed1),
            p2: createPlayer(p2Name || 'P2', seed2),
        };
        this.seeds = { p1: seed1, p2: seed2 };
        this.tick = 0;
        spawn(this.players.p1);
        spawn(this.players.p2);
    }

    enqueue(playerKey: PlayerKey, direction: string, state: string, seq?: number): void {
        const player = this.players[playerKey];
        if (!player || !player.isAlive) return;
        if (typeof seq === 'number') {
            if (seq <= player.lastSeq) return;
            player.lastSeq = seq;
        }
        player.inputQueue.push({ direction, state });
    }

    applyGarbageTo(playerKey: PlayerKey, count: number): void {
        const player = this.players[playerKey];
        if (!player || !player.isAlive || count <= 0) return;
        player.pendingGarbage += count;
    }

    step(): { toP1: number; toP2: number } {
        this.tick += 1;

        applyGarbage(this.players.p1);
        applyGarbage(this.players.p2);

        const attacks: Record<PlayerKey, number> = { p1: 0, p2: 0 };

        for (const key of ['p1', 'p2'] as PlayerKey[]) {
            const player = this.players[key];
            if (!player.isAlive) continue;

            const queue = player.inputQueue.splice(0);
            for (const input of queue) {
                attacks[key] += applyInput(player, input);
                if (!player.isAlive) break;
            }

            if (!player.isAlive) continue;

            player.gravityMsCounter += 100;
            const dropDelay = getAutoDropDelay(player.level);
            while (player.isAlive && player.active && player.gravityMsCounter >= dropDelay) {
                player.gravityMsCounter -= dropDelay;
                if (!moveDown(player)) {
                    break;
                }
            }

            if (!player.isAlive || !player.active) continue;

            if (isLockable(player, player.active)) {
                player.active.lockDelayMsCounter += AUTH_TICK_MS;
                if (player.active.lockDelayMsCounter >= CONST.PLAY_FIELD.LOCK_DELAY_MS) {
                    attacks[key] += lockPiece(player);
                }
            } else {
                player.active.lockDelayMsCounter = 0;
            }
        }

        if (attacks.p1 > 0 && this.players.p2.isAlive) {
            this.applyGarbageTo('p2', attacks.p1);
        }
        if (attacks.p2 > 0 && this.players.p1.isAlive) {
            this.applyGarbageTo('p1', attacks.p2);
        }

        return {
            toP1: attacks.p2,
            toP2: attacks.p1,
        };
    }

    getSnapshotFor(playerKey: PlayerKey): {
        tick: number;
        self: { board: string; score: number; level: number; lines: number; isAlive: boolean; sync: SyncState };
        opponent: { board: string; score: number; level: number; lines: number; isAlive: boolean };
    } {
        const self = this.players[playerKey];
        const opponent = playerKey === 'p1' ? this.players.p2 : this.players.p1;
        const selfSnapshot = snapshot(self);
        return {
            tick: this.tick,
            self: {
                ...selfSnapshot,
                sync: syncSnapshot(self),
            },
            opponent: snapshot(opponent),
        };
    }
}

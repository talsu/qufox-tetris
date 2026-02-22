import { nextLcg, normalizeSeed } from './random';

const BOARD_ROWS = 20;
const BOARD_COLS = 10;

const ROTATIONS = ['0', 'R', '2', 'L'] as const;
type Rotation = (typeof ROTATIONS)[number];
type PlayerKey = 'p1' | 'p2';

type PieceType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

type ActivePiece = {
    type: PieceType;
    rotate: Rotation;
    col: number;
    row: number;
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
    combo: number;
    backToBack: boolean;
    isAlive: boolean;
    pendingGarbage: number;
    lastHole: number;
    gravityMsCounter: number;
    inputQueue: Array<{ direction: string; state: string }>;
    lastSeq: number;
};

type SyncState = {
    boardCore: string;
    active: ActivePiece | null;
    hold: PieceType | null;
    canHold: boolean;
    queue: PieceType[];
    bag: PieceType[];
    queueRngState: number;
    gravityMsCounter: number;
};

const PIECES: Record<PieceType, Record<Rotation, Array<[number, number]>>> = {
    I: {
        '0': [[0, 1], [1, 1], [2, 1], [3, 1]],
        R: [[2, 0], [2, 1], [2, 2], [2, 3]],
        '2': [[0, 2], [1, 2], [2, 2], [3, 2]],
        L: [[1, 0], [1, 1], [1, 2], [1, 3]],
    },
    J: {
        '0': [[0, 0], [0, 1], [1, 1], [2, 1]],
        R: [[1, 0], [2, 0], [1, 1], [1, 2]],
        '2': [[0, 1], [1, 1], [2, 1], [2, 2]],
        L: [[1, 0], [1, 1], [0, 2], [1, 2]],
    },
    L: {
        '0': [[2, 0], [0, 1], [1, 1], [2, 1]],
        R: [[1, 0], [2, 2], [1, 1], [1, 2]],
        '2': [[0, 1], [1, 1], [2, 1], [0, 2]],
        L: [[1, 0], [1, 1], [0, 0], [1, 2]],
    },
    O: {
        '0': [[1, 0], [2, 0], [1, 1], [2, 1]],
        R: [[1, 0], [2, 0], [1, 1], [2, 1]],
        '2': [[1, 0], [2, 0], [1, 1], [2, 1]],
        L: [[1, 0], [2, 0], [1, 1], [2, 1]],
    },
    S: {
        '0': [[1, 0], [2, 0], [0, 1], [1, 1]],
        R: [[1, 0], [1, 1], [2, 1], [2, 2]],
        '2': [[1, 1], [2, 1], [0, 2], [1, 2]],
        L: [[0, 0], [0, 1], [1, 1], [1, 2]],
    },
    T: {
        '0': [[1, 0], [0, 1], [1, 1], [2, 1]],
        R: [[1, 0], [1, 1], [2, 1], [1, 2]],
        '2': [[0, 1], [1, 1], [2, 1], [1, 2]],
        L: [[1, 0], [0, 1], [1, 1], [1, 2]],
    },
    Z: {
        '0': [[0, 0], [1, 0], [1, 1], [2, 1]],
        R: [[2, 0], [1, 1], [2, 1], [1, 2]],
        '2': [[0, 1], [1, 1], [2, 2], [1, 2]],
        L: [[1, 0], [0, 1], [1, 1], [0, 2]],
    },
};

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
        combo: -1,
        backToBack: false,
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
    while (player.queue.length < 5) {
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
        rotate: '0',
        col: 3,
        row: -2,
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

function garbageFromClear(cleared: number, combo: number, backToBack: boolean, didB2BAction: boolean): number {
    let garbage = 0;
    if (cleared === 2) garbage = 1;
    else if (cleared === 3) garbage = 2;
    else if (cleared === 4) garbage = 4;

    if (didB2BAction && backToBack) {
        garbage += 1;
    }

    if (combo >= 2) {
        if (combo < 4) garbage += 1;
        else if (combo < 6) garbage += 2;
        else if (combo < 8) garbage += 3;
        else if (combo < 10) garbage += 4;
        else garbage += 5;
    }

    return garbage;
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

    const cleared = clearLines(player);
    const didB2BAction = cleared === 4;
    if (cleared > 0) {
        player.combo += 1;
        player.lines += cleared;
        player.score += (cleared * 100) + (player.combo > 0 ? player.combo * 50 : 0);
        player.level = Math.max(1, Math.floor(player.lines / 10) + 1);
    } else {
        player.combo = -1;
    }

    const garbage = garbageFromClear(cleared, player.combo, player.backToBack, didB2BAction);
    if (didB2BAction) {
        player.backToBack = true;
    } else if (cleared > 0) {
        player.backToBack = false;
    }

    player.active = null;
    spawn(player);
    return garbage;
}

function moveDown(player: PlayerState): boolean {
    if (!player.active || !player.isAlive) return false;
    const { active } = player;
    const nextRow = active.row + 1;
    if (canPlace(player, active, active.col, nextRow, active.rotate)) {
        active.row = nextRow;
        return true;
    }
    return false;
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
        if (canPlace(player, active, col, active.row, active.rotate)) active.col = col;
        return 0;
    }
    if (direction === 'right') {
        const col = active.col + 1;
        if (canPlace(player, active, col, active.row, active.rotate)) active.col = col;
        return 0;
    }
    if (direction === 'softDrop') {
        if (!moveDown(player)) {
            return lockPiece(player);
        }
        return 0;
    }
    if (direction === 'hardDrop') {
        while (moveDown(player)) {
        }
        return lockPiece(player);
    }
    if (direction === 'clockwise' || direction === 'anticlockwise') {
        const idx = ROTATIONS.indexOf(active.rotate);
        const nextIdx = direction === 'clockwise'
            ? (idx + 1) % ROTATIONS.length
            : (idx + ROTATIONS.length - 1) % ROTATIONS.length;
        const rotate = ROTATIONS[nextIdx];
        if (canPlace(player, active, active.col, active.row, rotate)) {
            active.rotate = rotate;
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
                    attacks[key] += lockPiece(player);
                    break;
                }
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

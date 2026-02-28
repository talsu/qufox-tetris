export enum TetrominoType { I = "I", J = "J", L = "L", O = "O", S = "S", T = "T", Z = "Z", GARBAGE = "GARBAGE" }

export enum RotateType { UP = "0", LEFT = "L", DOWN = "2", RIGHT = "R" }

export enum InputState { PRESS = "press", RELEASE = "release", HOLD = "hold" }

export const INPUT_DIRECTIONS = [
    'left',
    'right',
    'softDrop',
    'hardDrop',
    'clockwise',
    'anticlockwise',
    'hold',
] as const;

export type InputDirection = typeof INPUT_DIRECTIONS[number];

const INPUT_DIRECTION_SET = new Set<string>(INPUT_DIRECTIONS);

export function isInputDirection(value: unknown): value is InputDirection {
    return typeof value === 'string' && INPUT_DIRECTION_SET.has(value);
}

export enum BackgroundTheme {
    AURORA = "aurora",
    LASER_GRID = "laser-grid",
    COSMIC_PULSE = "cosmic-pulse",
    SUNSET_STREAM = "sunset-stream",
    OCEAN_DRIFT = "ocean-drift",
    VOLCANIC_CORE = "volcanic-core",
    CYBER_SWIRL = "cyber-swirl",
    FOREST_CANOPY = "forest-canopy",
    NEON_RAIN = "neon-rain",
    MONO_CHROME = "mono-chrome"
}

export interface ColRow extends Array<number> {
    [key: number]: number;
}

const NON_T_SPIN_ACTION_BONUS_DEFAULTS = {
    'I-Spin': 0,
    'I-Spin Single': 0,
    'I-Spin Double': 0,
    'I-Spin Triple': 0,
    'I-Spin Tetris': 0,
    'J-Spin': 0,
    'J-Spin Single': 0,
    'J-Spin Double': 0,
    'J-Spin Triple': 0,
    'J-Spin Tetris': 0,
    'L-Spin': 0,
    'L-Spin Single': 0,
    'L-Spin Double': 0,
    'L-Spin Triple': 0,
    'L-Spin Tetris': 0,
    'O-Spin': 0,
    'O-Spin Single': 0,
    'O-Spin Double': 0,
    'O-Spin Triple': 0,
    'O-Spin Tetris': 0,
    'S-Spin': 0,
    'S-Spin Single': 0,
    'S-Spin Double': 0,
    'S-Spin Triple': 0,
    'S-Spin Tetris': 0,
    'Z-Spin': 0,
    'Z-Spin Single': 0,
    'Z-Spin Double': 0,
    'Z-Spin Triple': 0,
    'Z-Spin Tetris': 0,
};

export const CONST = {
    SCORE: {
        'Single': 100,
        'T-Spin Mini': 100,
        'T-Spin Mini Single': 200,
        'T-Spin Mini Double': 400,
        'Double': 300,
        'T-Spin': 400,
        'Triple': 500,
        'Tetris': 800,
        'T-Spin Single': 800,
        'T-Spin Double': 1200,
        'T-Spin Triple': 1600
    },
    LINE_COUNT: {
        'Single': 1,
        'T-Spin Mini': 1,
        'T-Spin Mini Single': 2,
        'T-Spin Mini Double': 4,
        'Double': 3,
        'T-Spin': 4,
        'Triple': 5,
        'Tetris': 8,
        'T-Spin Single': 8,
        'T-Spin Double': 12,
        'T-Spin Triple': 16
    },
    ACTION_SCORE_BONUS: {
        // Reserved for optional mode-specific bonuses.
        // Keep zero by default so spin labels can be introduced without balance changes.
        ...NON_T_SPIN_ACTION_BONUS_DEFAULTS
    },
    ACTION_GARBAGE_BONUS: {
        // Reserved for optional mode-specific garbage bonuses.
        // Keep zero by default so spin labels can be introduced without attack changes.
        ...NON_T_SPIN_ACTION_BONUS_DEFAULTS
    },
    SCREEN : {
        BLOCK_IMAGE_SIZE: 36,
        ROW_COUNT: 22,
        COL_COUNT: 26,
    },
    PLAY_FIELD: {
        ROW_COUNT: 20,
        COL_COUNT: 10,
        DAS_MS: 183, // tetris friends : 267, 183, 150, 133, 117
        AR_MS: 50, // tetris friends : 50, 33, 22, 20, 17
        LOCK_DELAY_MS: 500,
        ARE_MS: 200,//417
        LINE_CLEAR_DELAY_MS: 400
    },
    TETROMINO: {
        SHOW_GHOST: true,
        TYPES: [
            TetrominoType.I,
            TetrominoType.J,
            TetrominoType.L,
            TetrominoType.O,
            TetrominoType.S,
            TetrominoType.T,
            TetrominoType.Z
        ],
        SPRITE_IMAGE_FRAME: {
            I: 6,
            J: 2,
            L: 3,
            O: 5,
            S: 0,
            T: 4,
            Z: 1
        },
        BLOCKS: {
            I: {
                0: [[0, 1], [1, 1], [2, 1], [3, 1]],
                R: [[2, 0], [2, 1], [2, 2], [2, 3]],
                2: [[0, 2], [1, 2], [2, 2], [3, 2]],
                L: [[1, 0], [1, 1], [1, 2], [1, 3]]
            },
            J: {
                0: [[0, 0], [0, 1], [1, 1], [2, 1]],
                R: [[1, 0], [2, 0], [1, 1], [1, 2]],
                2: [[0, 1], [1, 1], [2, 1], [2, 2]],
                L: [[1, 0], [1, 1], [0, 2], [1, 2]]
            },
            L: {
                0: [[2, 0], [0, 1], [1, 1], [2, 1]],
                R: [[1, 0], [2, 2], [1, 1], [1, 2]],
                2: [[0, 1], [1, 1], [2, 1], [0, 2]],
                L: [[1, 0], [1, 1], [0, 0], [1, 2]]
            },
            O: {
                0: [[1, 0], [2, 0], [1, 1], [2, 1]],
                R: [[1, 0], [2, 0], [1, 1], [2, 1]],
                2: [[1, 0], [2, 0], [1, 1], [2, 1]],
                L: [[1, 0], [2, 0], [1, 1], [2, 1]]
            },
            S: {
                0: [[1, 0], [2, 0], [0, 1], [1, 1]],
                R: [[1, 0], [1, 1], [2, 1], [2, 2]],
                2: [[1, 1], [2, 1], [0, 2], [1, 2]],
                L: [[0, 0], [0, 1], [1, 1], [1, 2]]
            },
            T: {
                0: [[1, 0], [0, 1], [1, 1], [2, 1]],
                R: [[1, 0], [1, 1], [2, 1], [1, 2]],
                2: [[0, 1], [1, 1], [2, 1], [1, 2]],
                L: [[1, 0], [0, 1], [1, 1], [1, 2]]
            },
            Z: {
                0: [[0, 0], [1, 0], [1, 1], [2, 1]],
                R: [[2, 0], [1, 1], [2, 1], [1, 2]],
                2: [[0, 1], [1, 1], [2, 2], [1, 2]],
                L: [[1, 0], [0, 1], [1, 1], [0, 2]]
            }
        },
        T_SPIN_CORNER: [[0, 0], [2, 0], [2, 2], [0, 2]],
        ROTATE_SEQ: [RotateType.UP, RotateType.RIGHT, RotateType.DOWN, RotateType.LEFT],
        COLOR: {
            I: 0x1cd6ff,
            J: 0x126fc4,
            L: 0xdf9a00,
            T: 0x9826c7,
            O: 0xede40b,
            Z: 0xc92323,
            S: 0x26a723
        },
        SIZE: {
            I: [4, 4],
            J: [3, 3],
            L: [3, 3],
            T: [3, 3],
            O: [4, 2],
            Z: [3, 3],
            S: [3, 3]
        },
        I_KICK_DATA: {
            "0>R": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
            "R>0": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
            "R>2": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
            "2>R": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
            "2>L": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
            "L>2": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
            "L>0": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
            "0>L": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]]
        },
        JLSTZ_KICK_DATA: {
            "0>R": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
            "R>0": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
            "R>2": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
            "2>R": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
            "2>L": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
            "L>2": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
            "L>0": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
            "0>L": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]]
        },
        I_ARIKA_KICK_DATA: {
            "0->R": [[0, 0], [-2, 0], [1, 0], [1, 2], [-2, -1]],
            "0->L": [[0, 0], [2, 0], [-1, 0], [-1, 2], [2, -1]],
            "2->R": [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -1]],
            "2->L": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -1]],
            "R->0": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
            "L->0": [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
            "R->2": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
            "L->2": [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]]
        }
    }
};

export const getBlockSize = () => {
    return 32; // Fixed base size, scaling handled by Camera
};

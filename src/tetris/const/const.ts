export enum TetrominoType { I = "I", J = "J", L = "L", O = "O", S = "S", T = "T", Z = "Z", GARBAGE = "GARBAGE" }

export enum RotateType { UP = "0", LEFT = "L", DOWN = "2", RIGHT = "R" }

export enum InputState { PRESS = "press", RELEASE = "release", HOLD = "hold" }

export interface ColRow extends Array<number> {
    [key: number]: number;
}

export let CONST = {
    SCORE: {
        'Single': 100,
        'T-Spin Mini': 100,
        'T-Spin Mini Single': 200,
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
        'Double': 3,
        'T-Spin': 4,
        'Triple': 5,
        'Tetris': 8,
        'T-Spin Single': 8,
        'T-Spin Double': 12,
        'T-Spin Triple': 16
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
        ARE_MS: 200//417
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
        IMAGES: {
            I: 'cyan-block',
            J: 'blue-block',
            L: 'orange-block',
            O: 'yellow-block',
            S: 'green-block',
            T: 'purple-block',
            Z: 'red-block'
        },
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
import { PlayField } from '../../src/tetris/objects/playField';
import { Tetromino } from '../../src/tetris/objects/tetromino';
import { CONST, TetrominoType, InputState } from '../../src/tetris/const/const';

// Mock Phaser
const mockGraphics = {
    fillStyle: jest.fn(),
    fillRect: jest.fn(),
    destroy: jest.fn(),
    clear: jest.fn(),
    alpha: 1,
    lineStyle: jest.fn(),
    strokeRect: jest.fn()
};

const mockTween = {
    play: jest.fn()
};

const mockScene = {
    add: {
        graphics: jest.fn(() => mockGraphics),
        container: jest.fn(() => ({
            add: jest.fn(),
            width: 0,
            height: 0,
            setMask: jest.fn(),
            remove: jest.fn(),
            destroy: jest.fn(),
            each: jest.fn()
        })),
        image: jest.fn(() => ({
            setOrigin: jest.fn(),
            setAlpha: jest.fn(),
            setScale: jest.fn(),
            destroy: jest.fn(),
            visible: true,
            x: 0,
            y: 0
        })),
        tween: jest.fn(() => mockTween)
    },
    make: {
        graphics: jest.fn(() => ({
            fillStyle: jest.fn(),
            fillRect: jest.fn(),
            createGeometryMask: jest.fn()
        }))
    },
    tweens: {
        add: jest.fn()
    },
    time: {
        addEvent: jest.fn(),
        delayedCall: jest.fn()
    }
};

describe('Visual Effects', () => {
    let playField: PlayField;

    beforeEach(() => {
        jest.clearAllMocks();
        playField = new PlayField(mockScene as any, 0, 0, 800, 600);
    });

    test('Hard Drop should trigger visual effect', () => {
        // Setup active tetromino
        playField.spawnTetromino(TetrominoType.T);
        const tetromino = playField['activeTetromino'];

        // Spy on playHardDropEffect
        const effectSpy = jest.spyOn(playField, 'playHardDropEffect');

        // Trigger Hard Drop
        playField.onInput('hardDrop', InputState.PRESS);

        expect(effectSpy).toHaveBeenCalledWith(tetromino);

        // Check if graphics were created
        expect(mockScene.add.graphics).toHaveBeenCalled();

        // Check if tween was added for fade out
        expect(mockScene.tweens.add).toHaveBeenCalledWith(expect.objectContaining({
            targets: mockGraphics,
            alpha: 0,
            duration: 300
        }));
    });
});

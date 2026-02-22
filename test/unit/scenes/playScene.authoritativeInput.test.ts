import { PlayScene } from '../../../src/tetris/scenes/playScene';

describe('PlayScene authoritative input forwarding', () => {
    test('forwards hardDrop press only to auth_input', () => {
        const scene = new PlayScene() as any;
        const emit = jest.fn();
        const engineOnInput = jest.fn();

        scene.mode = 'multi';
        scene.useAuthoritativeServer = true;
        scene.socket = { emit };
        scene.roomId = 'room-1';
        scene.isGameRunning = true;
        scene.isGameEnded = false;
        scene.inputSeq = 0;
        scene.inGameMenu = { isMenuOpen: false };
        scene.engine = { onInput: engineOnInput };
        scene.cache = { audio: { exists: jest.fn(() => false) } };
        scene.sound = { play: jest.fn() };

        scene.onInput('hardDrop', 'release');
        expect(emit).not.toHaveBeenCalled();
        expect(scene.inputSeq).toBe(0);

        scene.onInput('hardDrop', 'hold');
        expect(emit).not.toHaveBeenCalled();
        expect(scene.inputSeq).toBe(0);

        scene.onInput('hardDrop', 'press');
        expect(scene.inputSeq).toBe(1);
        expect(emit).toHaveBeenCalledTimes(1);
        expect(emit).toHaveBeenCalledWith('auth_input', {
            roomId: 'room-1',
            direction: 'hardDrop',
            state: 'press',
            seq: 1,
        });

        emit.mockClear();
        scene.onInput('clockwise', 'hold');
        expect(emit).not.toHaveBeenCalled();
    });

    test('still forwards non-hardDrop hold inputs for movement', () => {
        const scene = new PlayScene() as any;
        const emit = jest.fn();

        scene.mode = 'multi';
        scene.useAuthoritativeServer = true;
        scene.socket = { emit };
        scene.roomId = 'room-1';
        scene.isGameRunning = true;
        scene.isGameEnded = false;
        scene.inputSeq = 0;
        scene.inGameMenu = { isMenuOpen: false };
        scene.engine = { onInput: jest.fn() };
        scene.cache = { audio: { exists: jest.fn(() => false) } };
        scene.sound = { play: jest.fn() };

        scene.onInput('left', 'hold');

        expect(scene.inputSeq).toBe(1);
        expect(emit).toHaveBeenCalledWith('auth_input', {
            roomId: 'room-1',
            direction: 'left',
            state: 'hold',
            seq: 1,
        });
    });
});

import { PlayField } from '../../src/tetris/objects/playField';
import { Tetromino } from '../../src/tetris/objects/tetromino';
import { TetrominoType, CONST } from '../../src/tetris/const/const';
import * as Phaser from 'phaser';

describe('PlayField Delay', () => {
    let scene: any;
    let playField: PlayField;

    beforeEach(() => {
        scene = new Phaser.Scene();
        // PlayField expects a scene with factory methods
        playField = new PlayField(scene, 0, 0, 100, 200);
    });

    test('should delay clearing rows when a line is completed', () => {
        jest.useFakeTimers();

        const playClearAnimationSpy = jest.spyOn(playField, 'playClearAnimation');
        const clearRowsSpy = jest.spyOn(playField, 'clearRows');
        const emitSpy = jest.spyOn(playField, 'emit');

        // Mock getClearedRows to return a row
        jest.spyOn(playField, 'getClearedRows').mockReturnValue([19]);

        // Mock lockedTetromino
        const lockedTetromino = {
            getBlocks: () => [[0, 19]],
            inactive: () => {},
            type: TetrominoType.I,
            rotateType: '0',
            lastMovement: 'drop',
            lastKickDataIndex: 0,
            dropCounter: { softDrop: 0, hardDrop: 0, autoDrop: 0 },
            getTSpinCornerOccupiedCount: () => ({ pointSide: 0, flatSide: 0 }),
            isLockable: () => true,
            animateBlocksInRows: jest.fn(), // Add this
            clearLine: jest.fn().mockReturnValue(false), // Add this
        } as unknown as Tetromino;

        // Inject activeTetromino so lock() works
        (playField as any).droppedRotateType = '0'; // Fix undefined
        (playField as any).activeTetromino = lockedTetromino;
        (playField as any).startLockTimer = jest.fn();
        (playField as any).stopLockTimer = jest.fn();
        (playField as any).stopAutoDropTimer = jest.fn();

        // Call lock()
        playField.lock();

        // Verify animation started
        expect(playClearAnimationSpy).toHaveBeenCalledWith([19], expect.any(Function));

        // Verify clearRows NOT called yet
        expect(clearRowsSpy).not.toHaveBeenCalled();
        // Verify lock NOT emitted yet (it is inside the proceed callback which runs after animation)
        expect(emitSpy).not.toHaveBeenCalledWith('lock', expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything());

        // Advance time by LINE_CLEAR_DELAY_MS
        jest.advanceTimersByTime(CONST.PLAY_FIELD.LINE_CLEAR_DELAY_MS);

        // Verify clearRows called
        expect(clearRowsSpy).toHaveBeenCalledWith([19]);

        // Verify lock emitted
        expect(emitSpy).toHaveBeenCalledWith('lock', 1, expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything());
    });

    test('should NOT delay if no lines cleared', () => {
         jest.useFakeTimers();

         const playClearAnimationSpy = jest.spyOn(playField, 'playClearAnimation');
         const clearRowsSpy = jest.spyOn(playField, 'clearRows');
         const emitSpy = jest.spyOn(playField, 'emit');

         jest.spyOn(playField, 'getClearedRows').mockReturnValue([]);

         const lockedTetromino = {
            getBlocks: () => [[0, 10]],
            inactive: () => {},
            type: TetrominoType.I,
            rotateType: '0',
            lastMovement: 'drop',
            lastKickDataIndex: 0,
            dropCounter: { softDrop: 0, hardDrop: 0, autoDrop: 0 },
            getTSpinCornerOccupiedCount: () => ({ pointSide: 0, flatSide: 0 }),
            isLockable: () => true,
        } as unknown as Tetromino;

        (playField as any).droppedRotateType = '0';
        (playField as any).activeTetromino = lockedTetromino;
        (playField as any).startLockTimer = jest.fn();
        (playField as any).stopLockTimer = jest.fn();
        (playField as any).stopAutoDropTimer = jest.fn();

        playField.lock();

        expect(playClearAnimationSpy).not.toHaveBeenCalled();
        expect(clearRowsSpy).not.toHaveBeenCalled();
        // Lock emitted immediately
        expect(emitSpy).toHaveBeenCalledWith('lock', 0, expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything());
    });
});

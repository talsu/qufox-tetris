/**
 * @author       talsu  <talsu84@gmail.com>
 * @copyright    2018 talsu.net
 * @license      MIT
 */

import {PlayField} from '../objects/playField';
import {CONST, getBlockSize, InputState} from "../const/const";
import {TetrominoBox} from "../objects/tetrominoBox";
import {TetrominoBoxQueue} from "../objects/tetrominoBoxQueue";
import {LevelIndicator} from '../objects/levelIndicator';
import {Engine} from '../engine';
let BLOCK_SIZE = getBlockSize();

/**
 * Main scene
 */
export class MainScene extends Phaser.Scene {
    private keys: {
        LEFT: Phaser.Input.Keyboard.Key;
        RIGHT: Phaser.Input.Keyboard.Key;
        CTRL: Phaser.Input.Keyboard.Key;
        UP: Phaser.Input.Keyboard.Key;
        SPACE: Phaser.Input.Keyboard.Key;
        DOWN: Phaser.Input.Keyboard.Key;
        Z: Phaser.Input.Keyboard.Key;
        X: Phaser.Input.Keyboard.Key;
        C: Phaser.Input.Keyboard.Key;
    };

    private playField: PlayField;
    private engine: Engine;
    private dasFlags: Record<string, number> = {};
    private isPause: boolean = false;

    constructor() {
        super({key: "MainScene", mapAdd: {game: 'game'}});
    }

    /**
     * preload - call after constructor.
     */
    preload(): void {
        // Load background image.
        this.load.image('background', 'assets/image/bongtalk-background-default.jpg');
        // Load tetromino block images.
        // Puyo tetromino image.
        this.load.spritesheet('blockSheet', 'assets/image/PPTdefaultMinoOnly.png', {frameHeight:CONST.SCREEN.BLOCK_IMAGE_SIZE, frameWidth:CONST.SCREEN.BLOCK_IMAGE_SIZE, margin:4, spacing:8});
    }

    /**
     * create - call after preload.
     */
    create(): void {
        // Set background image.
        this.setBackgroundImage();
        // Create tetromino hold box.
        const holdBox = new TetrominoBox(this, BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE * 6, BLOCK_SIZE * 4);
        // Create level indicator.
        const levelIndicator = new LevelIndicator(this, BLOCK_SIZE, BLOCK_SIZE * 6);

        // Calculate play field size.
        const playFieldWidth = BLOCK_SIZE * CONST.PLAY_FIELD.COL_COUNT;
        const playFieldHeight = BLOCK_SIZE * CONST.PLAY_FIELD.ROW_COUNT;

        // Create tetromino queue. length = 6
        const tetrominoQueue = new TetrominoBoxQueue(this, holdBox.container.width + playFieldWidth + (2 * BLOCK_SIZE), 0, 6);

        // Create play field.
        this.playField = new PlayField(this, holdBox.container.width + (2 * BLOCK_SIZE), BLOCK_SIZE, playFieldWidth, playFieldHeight);

        // Create input key bindings.
        this.keys = {
            LEFT: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
            RIGHT: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
            CTRL: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL),
            UP: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
            SPACE: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
            DOWN: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
            Z: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
            X: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X),
            C: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C)
        };

        // Pause and resume with window key down event, because Phaser key event is not working when pause.
        window.onkeydown = (event:KeyboardEvent) => {
            if (event.code == 'Escape' || event.key == 'Escape') {
                if (this.isPause)
                    this.scene.resume('MainScene');
                else
                    this.scene.pause('MainScene');
                this.isPause = !this.isPause;
            }
        };

        this.engine = new Engine(this.playField, holdBox, tetrominoQueue, levelIndicator);
        this.engine.start();
    }

    private setBackgroundImage() {
        // Add background Image.
        const backgroundImage = this.textures.get('background').getSourceImage();
        const backgroundImageScale = Math.max(window.innerWidth / backgroundImage.width, window.innerHeight / backgroundImage.height);
        const xOffset = (window.innerWidth - backgroundImage.width * backgroundImageScale) / 2;
        const yOffset = (window.innerHeight - backgroundImage.height * backgroundImageScale) / 2;
        this.add.image(xOffset, yOffset, 'background').setOrigin(0).setScale(backgroundImageScale);
    }

    resize (width, height)
    {
        if (width === undefined) { width = this.sys.game.config.width; }
        if (height === undefined) { height = this.sys.game.config.height; }

        this.cameras.resize(width, height);
    }
    /**
     * update - call when every tick.
     * @param {number} time - current time.
     * @param {number} delta - time difference with before update time.
     */
    update(time: number, delta: number): void {
        // Charge DAS with key pressed state.
        this.chargeDAS("left", this.keys.LEFT.isDown, delta);
        this.chargeDAS("right", this.keys.RIGHT.isDown, delta);
        this.chargeDAS("softDrop", this.keys.DOWN.isDown, delta, this.playField.autoDropDelay / 20, this.playField.autoDropDelay / 20);
        this.chargeDAS("hardDrop", this.keys.SPACE.isDown, delta);
        this.chargeDAS("anticlockwise", this.keys.Z.isDown || this.keys.CTRL.isDown, delta);
        this.chargeDAS("clockwise", this.keys.X.isDown || this.keys.UP.isDown, delta);
        this.chargeDAS("hold", this.keys.C.isDown, delta);
    }

    /*
        https://tetris.wiki/DAS
    */
    chargeDAS(input: string, isPressed: boolean, time: number, init?: number, repeat?: number) {
        // Set initial value to 0.
        if (!this.dasFlags[input]) this.dasFlags[input] = 0;
        // Copy old value.
        const oldValue = this.dasFlags[input];
        // If pressed increase value by time. (ms)
        if (isPressed) this.dasFlags[input] += time;
        // If not pressed reset value to 0.
        else this.dasFlags[input] = 0;
        // Copy new value.
        const newValue = this.dasFlags[input];

        // If old value is 0 and new value is positive, key is pressed.
        if (oldValue == 0 && newValue) this.onInput(input, InputState.PRESS);
        // If old value is positive but new value is 0, key is release.
        if (oldValue && newValue == 0) this.onInput(input, InputState.RELEASE);

        // If new value is 0, stop this function.
        if (newValue == 0) return;

        // Delay value between 'press' and first 'hold' state.
        const initDelay = init || CONST.PLAY_FIELD.DAS_MS;
        // Delay value between 'hold' and next 'hold' state.
        const repeatDelay = repeat || CONST.PLAY_FIELD.AR_MS;
        // Last 'hold' state called time.
        let rOld = Math.floor((oldValue - initDelay) / repeatDelay);
        // New 'hold' state time.
        let rNew = Math.floor((newValue - initDelay) / repeatDelay);

        // Call 'hold' state.
        if (rNew >= 0 && rOld < rNew) {
            if (rOld < 0) rOld = -1;
            for (let i = 0; i < (rNew - rOld); ++i) {
                this.onInput(input, InputState.HOLD);
            }
        }
    }

    /**
     * on input
     * @param direction direction
     * @param state key state - press, hold, release
     */
    onInput(direction: string, state: InputState) {
        this.engine.onInput(direction, state);
    }
}

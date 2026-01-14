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
import { io, Socket } from "socket.io-client";

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
    private opponentPlayField: PlayField;
    private engine: Engine;
    private dasFlags: Record<string, number> = {};
    private isPause: boolean = false;
    private socket: Socket;
    private roomId: string;
    private statusText: Phaser.GameObjects.Text;
    private lastUpdateSend: number = 0;
    private isGameRunning: boolean = false;
    
    // Logical base resolution
    private readonly GAME_WIDTH = 1920;
    private readonly GAME_HEIGHT = 1080;

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
        this.setBackgroundImage();

        // Register resize handler
        this.scale.on('resize', this.resize, this);
        
        // Initial resize to set zoom
        this.resize(this.scale.width, this.scale.height);

        // UI Text (Center of Logical Screen)
        this.statusText = this.add.text(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2, 'Connecting to server...', {
            fontSize: '32px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Connect to server (assume localhost:3000 for now, or relative if proxied)
        // Since we serve via webpack dev server 8080 and socket is 3000
        this.socket = io('http://localhost:3000');

        this.socket.on('connect', () => {
            this.statusText.setText('Connected! Waiting for opponent...');
            this.socket.emit('join_game');
        });

        this.socket.on('waiting_for_opponent', () => {
            this.statusText.setText('Waiting for opponent...');
        });

        this.socket.on('game_start', (data) => {
            this.roomId = data.roomId;
            this.statusText.setVisible(false);
            this.startGame();
        });

        this.socket.on('opponent_state_update', (data) => {
            if (this.opponentPlayField) {
                this.opponentPlayField.deserialize(data.board);
            }
        });

        this.socket.on('receive_garbage', (data) => {
            if (this.playField) {
                this.playField.insertGarbage(data.count);
                // Shake effect?
                this.cameras.main.shake(200, 0.01);
            }
        });

        this.socket.on('opponent_game_over', () => {
             this.add.text(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2, 'YOU WIN!', {
                fontSize: '64px',
                color: '#00ff00',
                stroke: '#000000',
                strokeThickness: 6
            }).setOrigin(0.5);
            this.isGameRunning = false;
        });

        // Setup Input Keys (but don't process yet)
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
    }

    startGame() {
        this.isGameRunning = true;
        
        // Calculate dimensions
        const playFieldWidth = BLOCK_SIZE * CONST.PLAY_FIELD.COL_COUNT;
        const playFieldHeight = BLOCK_SIZE * CONST.PLAY_FIELD.ROW_COUNT;
        
        // Center position for P1 (Left side of Logical Screen)
        const p1X = (this.GAME_WIDTH * 0.25) - (playFieldWidth / 2);
        const p1Y = (this.GAME_HEIGHT - playFieldHeight) / 2;

        // P2 (Right side of Logical Screen)
        const p2X = (this.GAME_WIDTH * 0.75) - (playFieldWidth / 2);
        const p2Y = (this.GAME_HEIGHT - playFieldHeight) / 2;

        // --- Player 1 Setup ---
        const holdBox = new TetrominoBox(this, BLOCK_SIZE, BLOCK_SIZE, p1X - (BLOCK_SIZE * 5), p1Y); // Adjust pos
        const levelIndicator = new LevelIndicator(this, BLOCK_SIZE, p1X - (BLOCK_SIZE * 5)); // Adjust pos
        const tetrominoQueue = new TetrominoBoxQueue(this, p1X + playFieldWidth + BLOCK_SIZE, p1Y, 6);
        
        this.playField = new PlayField(this, p1X, p1Y, playFieldWidth, playFieldHeight);
        
        // Engine setup
        this.engine = new Engine(this.playField, holdBox, tetrominoQueue, levelIndicator);
        
        // Attach Attack Handler
        this.engine.setAttackHandler((count) => {
            this.socket.emit('send_garbage', { roomId: this.roomId, count });
        });
        
        // Game Over Handler
        this.playField.on('gameOver', () => {
            this.socket.emit('game_over', { roomId: this.roomId });
            this.isGameRunning = false;
            this.add.text(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2, 'GAME OVER', {
                fontSize: '64px',
                color: '#ff0000',
                stroke: '#000000',
                strokeThickness: 6
            }).setOrigin(0.5);
        });

        this.engine.start();


        // --- Player 2 Setup (Opponent) ---
        // Opponent needs a PlayField.
        this.opponentPlayField = new PlayField(this, p2X, p2Y, playFieldWidth, playFieldHeight);
        // Opponent Name Tag
        this.add.text(p2X, p2Y - 30, 'Opponent', { fontSize: '20px', color: '#ffffff' });
    }

    private setBackgroundImage() {
        // Add background Image.
        const backgroundImage = this.textures.get('background').getSourceImage();
        // Just place it at 0,0 of logical screen and scale to cover logical screen
        const scaleX = this.GAME_WIDTH / backgroundImage.width;
        const scaleY = this.GAME_HEIGHT / backgroundImage.height;
        const scale = Math.max(scaleX, scaleY);
        
        this.add.image(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2, 'background')
            .setOrigin(0.5)
            .setScale(scale);
    }

    resize (gameSize, baseSize?, displaySize?, resolution?)
    {
        // Handle different call signatures of resize event
        const width = (typeof gameSize === 'number') ? gameSize : gameSize.width;
        const height = (typeof gameSize === 'number') ? baseSize : gameSize.height;

        this.cameras.resize(width, height);

        // Zoom to fit
        const zoomX = width / this.GAME_WIDTH;
        const zoomY = height / this.GAME_HEIGHT;
        const zoom = Math.min(zoomX, zoomY);

        this.cameras.main.setZoom(zoom);
        this.cameras.main.centerOn(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2);
    }
    /**
     * update - call when every tick.
     * @param {number} time - current time.
     * @param {number} delta - time difference with before update time.
     */
    update(time: number, delta: number): void {
        if (!this.isGameRunning) return;

        // Charge DAS with key pressed state.
        this.chargeDAS("left", this.keys.LEFT.isDown, delta);
        this.chargeDAS("right", this.keys.RIGHT.isDown, delta);
        this.chargeDAS("softDrop", this.keys.DOWN.isDown, delta, this.playField.autoDropDelay / 20, this.playField.autoDropDelay / 20);
        this.chargeDAS("hardDrop", this.keys.SPACE.isDown, delta);
        this.chargeDAS("anticlockwise", this.keys.Z.isDown || this.keys.CTRL.isDown, delta);
        this.chargeDAS("clockwise", this.keys.X.isDown || this.keys.UP.isDown, delta);
        this.chargeDAS("hold", this.keys.C.isDown, delta);
        
        // Network Sync
        if (time - this.lastUpdateSend > 100) { // 10Hz sync
            this.lastUpdateSend = time;
            if (this.playField && this.socket) {
                this.socket.emit('update_state', {
                    roomId: this.roomId,
                    board: this.playField.serialize()
                });
            }
        }
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
        if (this.engine) {
            this.engine.onInput(direction, state);
        }
    }
}

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
import {InputManager} from "../input/inputManager";
import {InGameMenu} from "../ui/inGameMenu";

let BLOCK_SIZE = getBlockSize();

/**
 * Play scene
 */
export class PlayScene extends Phaser.Scene {
    private playField: PlayField;
    private opponentPlayField: PlayField;
    private engine: Engine;

    // Managers
    private inputManager: InputManager;
    private inGameMenu: InGameMenu;

    private isPause: boolean = false;
    private socket: Socket;
    private roomId: string;
    private statusText: Phaser.GameObjects.Text;
    private lastUpdateSend: number = 0;
    private isGameRunning: boolean = false;
    private mode: string = 'single';
    private backgroundImage: Phaser.GameObjects.Image;
    private isGameEnded: boolean = false;

    // Configurable Scales
    private readonly MAIN_SCALE = 2;
    private readonly SIDE_SCALE = 0.85;
    
    // Logical base resolution
    private GAME_WIDTH: number;
    private GAME_HEIGHT: number;

    private holdBox: TetrominoBox;

    // Menu Navigation Keys (separate from Game Input)
    private enterKey: Phaser.Input.Keyboard.Key;
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    private spaceKey: Phaser.Input.Keyboard.Key; // For Menu Enter substitute

    constructor() {
        super({key: "PlayScene", mapAdd: {game: 'game'}});
        this.GAME_WIDTH = 1920;
        this.GAME_HEIGHT = 1080;
    }

    init(data: any): void {
        // Detect Mobile Portrait
        if (window.innerWidth < window.innerHeight) {
            this.GAME_WIDTH = 1080;
            this.GAME_HEIGHT = 1920;
        } else {
            this.GAME_WIDTH = 1920;
            this.GAME_HEIGHT = 1080;
        }

        this.mode = data.mode || 'single';
        if (this.mode === 'multi') {
            this.socket = data.socket;
            this.roomId = data.roomId;
        }
        
        // Reset state
        this.isPause = false;
        this.isGameRunning = false;
        this.isGameEnded = false;
        this.lastUpdateSend = 0;
    }

    preload(): void {
        if (this.mode === 'single') {
            this.load.image('background', 'assets/image/background.png');
        } else {
             this.load.image('background', 'assets/image/background_multi.png');
        }
    }

    create(): void {
        this.setBackgroundImage();
        
        // Setup Navigation Keys for Menu
        this.cursors = this.input.keyboard.createCursorKeys();
        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        this.scale.on('resize', this.resize, this);
        this.resize(window.innerWidth, window.innerHeight);

        // UI Text (Center of Logical Screen)
        this.statusText = this.add.text(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2, '', {
            fontSize: '32px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Initialize Managers
        this.inputManager = new InputManager(this, (direction, state) => this.onInput(direction, state));

        this.inGameMenu = new InGameMenu(this, this.GAME_WIDTH, this.GAME_HEIGHT, {
            onResume: () => this.toggleMenu(),
            onExit: () => this.exitGame(),
            onRestart: () => this.restartGame(),
            onToggleBackground: (btn) => this.toggleBackground(btn)
        });

        if (this.mode === 'single') {
             this.startGame();
        } else {
             this.setupMultiplayer();
        }

        this.events.on('shutdown', this.shutdown, this);
    }

    setupMultiplayer() {
        this.statusText.setText('Waiting for opponent...');

        if (this.socket) {
            this.socket.on('game_start', (data) => {
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
                   this.cameras.main.shake(200, 0.01);
               }
            });

            this.socket.on('opponent_game_over', () => {
               const score = this.engine ? this.engine.getScore() : 0;
               this.showEndGameMessage('YOU WIN!', '#00ff00', score);
            });

            this.socket.on('restart_signal', () => {
                this.scene.restart({ mode: 'multi', socket: this.socket, roomId: this.roomId });
            });

            this.socket.on('opponent_disconnected', () => {
                alert('Opponent disconnected!');
                this.scene.start('LobbyScene');
            });

            // Notify server we are ready to receive game_start
            this.socket.emit('player_ready', { roomId: this.roomId });
        }
    }

    shutdown() {
        this.scale.off('resize', this.resize, this);
        if (this.socket) {
            this.socket.off('game_start');
            this.socket.off('opponent_state_update');
            this.socket.off('receive_garbage');
            this.socket.off('opponent_game_over');
            this.socket.off('restart_signal');
            this.socket.off('opponent_disconnected');
        }
    }

    toggleMenu() {
        this.inGameMenu.togglePauseMenu();
        
        const isOpen = this.inGameMenu.isMenuOpen;

        // In Single Player, pause the game
        if (this.mode === 'single') {
            if (isOpen) {
                this.isPause = true;
                this.time.paused = true;
                this.tweens.pauseAll();
                this.physics.world.pause();
                this.inputManager.isEnabled = false;
            } else {
                this.isPause = false;
                this.time.paused = false;
                this.tweens.resumeAll();
                this.physics.world.resume();
                this.inputManager.isEnabled = true;
            }
        }
    }

    toggleBackground(btn: Phaser.GameObjects.Text) {
        const isVisible = this.backgroundImage.visible;
        this.backgroundImage.setVisible(!isVisible);
        btn.setText(`Background: ${!isVisible ? 'ON' : 'OFF'}`);
        btn.setColor(!isVisible ? '#fff' : '#aaa');
    }

    exitGame() {
        this.time.paused = false; // Reset time before leaving
        if (this.socket) {
            this.socket.disconnect();
        }
        
        if (this.mode === 'single') {
            this.scene.start("MenuScene");
        } else {
            this.scene.start("LobbyScene");
        }
    }

    restartGame() {
         if (this.mode === 'single') {
             this.scene.restart({ mode: 'single' });
         } else if (this.mode === 'multi' && this.socket) {
             this.socket.emit('request_restart', { roomId: this.roomId });
         }
    }

    showEndGameMessage(mainText: string, color: string, score?: number) {
        this.isGameRunning = false;
        this.isGameEnded = true;
        this.inputManager.isEnabled = false;
        if (this.playField) {
            this.playField.stop();
        }
        this.inGameMenu.showEndGame(mainText, color, score);
    }

    startGame() {
        this.isGameRunning = true;
        this.inputManager.isEnabled = true;
        
        // Calculate dimensions (Unscaled)
        const rawPlayFieldWidth = BLOCK_SIZE * CONST.PLAY_FIELD.COL_COUNT;
        const rawPlayFieldHeight = BLOCK_SIZE * CONST.PLAY_FIELD.ROW_COUNT;
        
        // Determine Scales
        const currentMainScale = (this.mode === 'single') ? this.MAIN_SCALE : 1;
        const currentSideScale = (this.mode === 'single') ? this.SIDE_SCALE : 1;

        let p1X, p1Y;
        
        if (this.mode === 'single') {
            // Center for Single Player (Account for Scale)
            p1X = (this.GAME_WIDTH - (rawPlayFieldWidth * currentMainScale)) / 2;
            p1Y = (this.GAME_HEIGHT - (rawPlayFieldHeight * currentMainScale)) / 2;
        } else {
            // P1 (Left side) for Multiplayer (Default Scale)
            p1X = (this.GAME_WIDTH * 0.25) - (rawPlayFieldWidth / 2);
            p1Y = (this.GAME_HEIGHT - rawPlayFieldHeight) / 2;
        }

        // --- Layout Constants ---
        const GAP = BLOCK_SIZE;
        const HOLD_WIDTH = BLOCK_SIZE * 6;
        const HOLD_HEIGHT = BLOCK_SIZE * 4;

        // --- Player 1 Setup ---
        const holdX = p1X - GAP - (HOLD_WIDTH * currentSideScale);
        const holdY = p1Y;
        this.holdBox = new TetrominoBox(this, holdX, holdY, HOLD_WIDTH, HOLD_HEIGHT);
        this.holdBox.container.setScale(currentSideScale);
        
        // Hold Touch Zone
        const holdZone = this.add.zone(holdX, holdY, HOLD_WIDTH * currentSideScale, HOLD_HEIGHT * currentSideScale).setOrigin(0);
        holdZone.setInteractive();
        holdZone.on('pointerdown', () => {
            if (!this.isGameRunning || this.isPause || this.inGameMenu.isMenuOpen || this.isGameEnded) return;
            this.onInput('hold', InputState.PRESS);
            this.time.delayedCall(100, () => this.onInput('hold', InputState.RELEASE));
        });

        const infoX = holdX;
        const infoY = holdY + (HOLD_HEIGHT * currentSideScale) + (GAP * 0.5);
        const levelIndicator = new LevelIndicator(this, infoX, infoY);
        levelIndicator.container.setScale(currentSideScale);

        const queueX = p1X + (rawPlayFieldWidth * currentMainScale) + GAP - (BLOCK_SIZE * currentSideScale);
        const queueY = p1Y - (BLOCK_SIZE * currentSideScale);
        const tetrominoQueue = new TetrominoBoxQueue(this, queueX, queueY, 6);
        tetrominoQueue.container.setScale(currentSideScale);
        
        this.playField = new PlayField(this, p1X, p1Y, rawPlayFieldWidth, rawPlayFieldHeight);
        this.playField.setScale(currentMainScale);
        
        this.engine = new Engine(this.playField, this.holdBox, tetrominoQueue, levelIndicator);
        
        this.engine.setAttackHandler((count) => {
            if (this.mode === 'multi' && this.socket) {
                this.socket.emit('send_garbage', { roomId: this.roomId, count });
            }
        });
        
        this.playField.on('gameOver', () => {
            if (this.mode === 'multi' && this.socket) {
                this.socket.emit('game_over', { roomId: this.roomId });
            }
            const score = this.engine ? this.engine.getScore() : 0;
            this.showEndGameMessage('GAME OVER', '#ff0000', score);
        });

        this.engine.start();
        this.inputManager.setDragThresholdScale(currentMainScale);

        if (this.mode === 'multi') {
            const p2X = (this.GAME_WIDTH * 0.75) - (rawPlayFieldWidth / 2);
            const p2Y = (this.GAME_HEIGHT - rawPlayFieldHeight) / 2;
            this.opponentPlayField = new PlayField(this, p2X, p2Y, rawPlayFieldWidth, rawPlayFieldHeight);
            this.add.text(p2X, p2Y - 30, 'Opponent', { fontSize: '20px', color: '#ffffff' });
        }
    }

    private setBackgroundImage() {
        const backgroundImage = this.textures.get('background').getSourceImage();
        const scaleX = this.GAME_WIDTH / backgroundImage.width;
        const scaleY = this.GAME_HEIGHT / backgroundImage.height;
        const scale = Math.max(scaleX, scaleY);
        
        this.backgroundImage = this.add.image(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2, 'background')
            .setOrigin(0.5)
            .setScale(scale);
    }

    resize (gameSize, baseSize?, displaySize?, resolution?)
    {
        if (!this.cameras || !this.cameras.main) {
            return;
        }

        const width = (typeof gameSize === 'number') ? gameSize : gameSize.width;
        const height = (typeof gameSize === 'number') ? baseSize : gameSize.height;

        this.cameras.resize(width, height);

        const zoomX = width / this.GAME_WIDTH;
        const zoomY = height / this.GAME_HEIGHT;
        const zoom = Math.min(zoomX, zoomY);

        this.cameras.main.setZoom(zoom);
        this.cameras.main.centerOn(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2);
    }

    update(time: number, delta: number): void {
        if (Phaser.Input.Keyboard.JustDown(this.inputManager.escKey)) {
            this.toggleMenu();
        }

        // Menu Navigation
        if (this.inGameMenu.isMenuOpen || this.isGameEnded) {
            if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
                this.inGameMenu.onKey('up');
            } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
                this.inGameMenu.onKey('down');
            } else if (Phaser.Input.Keyboard.JustDown(this.enterKey) || Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
                this.inGameMenu.onKey('enter');
            }
            return;
        }

        if (!this.isGameRunning || this.isPause) return;

        if (this.engine) {
            this.engine.update(time, delta);
        }

        const softDropSpeed = this.playField ? (this.playField.autoDropDelay / 20) : CONST.PLAY_FIELD.AR_MS;
        this.inputManager.updateCustom(time, delta, softDropSpeed, softDropSpeed);
        
        // Network Sync
        if (this.mode === 'multi' && time - this.lastUpdateSend > 100) { // 10Hz sync
            this.lastUpdateSend = time;
            if (this.playField && this.socket) {
                this.socket.emit('update_state', {
                    roomId: this.roomId,
                    board: this.playField.serialize()
                });
            }
        }
    }

    onInput(direction: string, state: InputState) {
        if (this.engine) {
            this.engine.onInput(direction, state);
        }
    }
}

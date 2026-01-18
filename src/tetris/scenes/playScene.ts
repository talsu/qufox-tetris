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
 * Play scene
 */
export class PlayScene extends Phaser.Scene {
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
        ESC: Phaser.Input.Keyboard.Key;
    };

    private playField: PlayField;
    private opponentPlayField: PlayField;
    private engine: Engine;
    private dasFlags: Record<string, number> = {};
    // Touch Control State
    private touchStartX: number = 0;
    private touchStartY: number = 0;
    private touchStartTime: number = 0;
    private lastPointerX: number = 0;
    private lastPointerY: number = 0;
    private isTap: boolean = false;

    private isPause: boolean = false;
    private socket: Socket;
    private roomId: string;
    private statusText: Phaser.GameObjects.Text;
    private lastUpdateSend: number = 0;
    private isGameRunning: boolean = false;
    private mode: string = 'single';
    private backgroundImage: Phaser.GameObjects.Image;
    private menuContainer: Phaser.GameObjects.Container;
    private isMenuOpen: boolean = false;
    private isGameEnded: boolean = false;

    // Configurable Scales
    private readonly MAIN_SCALE = 2;
    private readonly SIDE_SCALE = 0.85;
    
    // Logical base resolution
    private GAME_WIDTH: number;
    private GAME_HEIGHT: number;

    private holdBox: TetrominoBox;

    private menuButtons: Phaser.GameObjects.Text[] = [];
    private selectedMenuIndex: number = 0;
    private endGameButtons: Phaser.GameObjects.Text[] = [];
    private selectedEndGameButtonIndex: number = 0;
    private enterKey: Phaser.Input.Keyboard.Key;
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys;

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
        this.isMenuOpen = false;
        this.isPause = false;
        this.isGameRunning = false;
        this.isGameEnded = false;
        this.dasFlags = {};
        this.lastUpdateSend = 0;
        this.selectedMenuIndex = 0;
    }

    // ... preload ...

    create(): void {
        this.setBackgroundImage();
        
        this.cursors = this.input.keyboard.createCursorKeys();
        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

        // ... existing create logic ...

        this.scale.on('resize', this.resize, this);
        
        // Initial resize to set zoom
        this.resize(window.innerWidth, window.innerHeight);

        // UI Text (Center of Logical Screen)
        this.statusText = this.add.text(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2, '', {
            fontSize: '32px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        if (this.mode === 'single') {
             this.startGame();
        } else {
             // Multiplayer setup
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
            C: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C),
            ESC: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
        };

        this.events.on('shutdown', this.shutdown, this);
        this.setupTouchControls();
        this.createMenuButton();
        this.createMenu();
    }

    createMenuButton() {
        const menuBtn = this.add.text(40, 40, "MENU", { fontSize: '40px', color: '#ffffff' });
        menuBtn.setInteractive({ useHandCursor: true });
        menuBtn.on('pointerdown', () => {
            this.toggleMenu();
        });
    }

    setupTouchControls() {
        this.input.addPointer(1);

        // Prevent default browser touch actions (scrolling, zooming) to ensure pointermove fires correctly
        this.game.canvas.style.touchAction = 'none';

        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
            if (!this.isGameRunning || this.isPause || this.isMenuOpen || this.isGameEnded) return;

            if (currentlyOver && currentlyOver.length > 0) return;

            this.touchStartX = pointer.worldX;
            this.touchStartY = pointer.worldY;
            this.touchStartTime = pointer.time;
            this.lastPointerX = pointer.worldX;
            this.lastPointerY = pointer.worldY;
            this.isTap = true;
        });

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
             if (!this.isGameRunning || this.isPause || this.isMenuOpen || this.isGameEnded) return;
             if (!pointer.isDown) return;

             const dist = Phaser.Math.Distance.Between(this.touchStartX, this.touchStartY, pointer.worldX, pointer.worldY);
             if (dist > 10) {
                 this.isTap = false;
             }

             // Horizontal Move
             const deltaX = pointer.worldX - this.lastPointerX;
             if (Math.abs(deltaX) > (BLOCK_SIZE * this.MAIN_SCALE)) {
                 if (deltaX > 0) {
                     this.onInput('right', InputState.PRESS);
                     this.time.delayedCall(50, () => this.onInput('right', InputState.RELEASE));
                 } else {
                     this.onInput('left', InputState.PRESS);
                     this.time.delayedCall(50, () => this.onInput('left', InputState.RELEASE));
                 }
                 this.lastPointerX = pointer.worldX;
             }

             // Vertical Move (Soft Drop)
             const deltaY = pointer.worldY - this.lastPointerY;
             if (Math.abs(deltaY) > (BLOCK_SIZE * this.MAIN_SCALE) && !this.isTap) {
                if (deltaY > 0) {
                    this.onInput('softDrop', InputState.PRESS);
                    this.time.delayedCall(50, () => this.onInput('softDrop', InputState.RELEASE)) ;
                } else {

                }
                this.lastPointerY = pointer.worldY;
             }
        });

        this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            if (!this.isGameRunning || this.isPause || this.isMenuOpen || this.isGameEnded) return;

            const duration = pointer.time - this.touchStartTime;
            const deltaY = pointer.worldY - this.touchStartY;

            // Release Soft Drop
            this.onInput('softDrop', InputState.RELEASE);

            if (this.isTap) {
                // Check Rotation
                if (pointer.worldX < this.GAME_WIDTH / 2) {
                    this.onInput('anticlockwise', InputState.PRESS);
                    this.time.delayedCall(100, () => this.onInput('anticlockwise', InputState.RELEASE));
                } else {
                    this.onInput('clockwise', InputState.PRESS);
                    this.time.delayedCall(100, () => this.onInput('clockwise', InputState.RELEASE));
                }
            } else {
                // Check Hard Drop (Flick)
                // Short duration, significant down movement
                if (duration < 300 && deltaY > 50) {
                    this.onInput('hardDrop', InputState.PRESS);
                    this.time.delayedCall(100, () => this.onInput('hardDrop', InputState.RELEASE));
                }
            }
        });
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

    createMenu() {
        this.menuContainer = this.add.container(0, 0);
        this.menuContainer.setVisible(false);
        this.menuContainer.setDepth(1000); // Ensure it's on top

        // Dimmed background
        const dim = this.add.rectangle(this.GAME_WIDTH/2, this.GAME_HEIGHT/2, this.GAME_WIDTH, this.GAME_HEIGHT, 0x000000, 0.7);
        dim.setInteractive(); // Block clicks below

        // Menu Box
        const menuBg = this.add.rectangle(this.GAME_WIDTH/2, this.GAME_HEIGHT/2, 500, 450, 0x333333).setStrokeStyle(4, 0xffffff);
        
        // Title
        const title = this.add.text(this.GAME_WIDTH/2, this.GAME_HEIGHT/2 - 150, "PAUSED", { fontSize: '64px', color: '#fff' }).setOrigin(0.5);

        // Settings: Background Toggle
        const bgBtn = this.add.text(this.GAME_WIDTH/2, this.GAME_HEIGHT/2 - 50, "Background: ON", { fontSize: '40px', color: '#fff' }).setOrigin(0.5).setInteractive();
        bgBtn.on('pointerdown', () => {
            this.toggleBackground(bgBtn);
        });
        bgBtn.on('pointerover', () => { this.selectedMenuIndex = 0; this.updateMenuAppearance(); });

        // Exit Button
        const exitBtn = this.add.text(this.GAME_WIDTH/2, this.GAME_HEIGHT/2 + 50, "EXIT GAME", { fontSize: '40px', color: '#f00' }).setOrigin(0.5).setInteractive();
        exitBtn.on('pointerdown', () => {
            this.exitGame();
        });
        exitBtn.on('pointerover', () => { this.selectedMenuIndex = 1; this.updateMenuAppearance(); });

        // Resume Button
        const resumeBtn = this.add.text(this.GAME_WIDTH/2, this.GAME_HEIGHT/2 + 150, "RESUME", { fontSize: '40px', color: '#fff' }).setOrigin(0.5).setInteractive();
        resumeBtn.on('pointerdown', () => {
            this.toggleMenu();
        });
        resumeBtn.on('pointerover', () => { this.selectedMenuIndex = 2; this.updateMenuAppearance(); });

        this.menuContainer.add([dim, menuBg, title, bgBtn, exitBtn, resumeBtn]);
        
        this.menuButtons = [bgBtn, exitBtn, resumeBtn];
        this.updateMenuAppearance();
    }

    updateMenuAppearance() {
        this.menuButtons.forEach((btn, index) => {
            if (index === this.selectedMenuIndex) {
                btn.setStyle({ backgroundColor: '#555' });
            } else {
                btn.setStyle({ backgroundColor: 'transparent' });
            }
        });
    }

    toggleMenu() {
        this.isMenuOpen = !this.isMenuOpen;
        this.menuContainer.setVisible(this.isMenuOpen);
        
        if (this.isMenuOpen) {
            this.selectedMenuIndex = 0;
            this.updateMenuAppearance();
        }

        // In Single Player, pause the game
        if (this.mode === 'single') {
            if (this.isMenuOpen) {
                this.isPause = true;
                this.time.paused = true;
                this.tweens.pauseAll();
                this.physics.world.pause();
            } else {
                this.isPause = false;
                this.time.paused = false;
                this.tweens.resumeAll();
                this.physics.world.resume();
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

    showEndGameMessage(mainText: string, color: string, score?: number) {
        this.isGameRunning = false;
        this.isGameEnded = true;
        if (this.playField) {
            this.playField.stop();
        }

        const centerX = this.GAME_WIDTH / 2;
        const centerY = this.GAME_HEIGHT / 2;

        // Container for Game Over UI
        const gameOverContainer = this.add.container(0, 0);
        gameOverContainer.setDepth(2000); // Ensure it's on top

        // Dimmed background
        const dim = this.add.rectangle(centerX, centerY, this.GAME_WIDTH, this.GAME_HEIGHT, 0x000000, 0.7);
        dim.setInteractive(); // Block clicks below

        // Panel
        const panel = this.add.rectangle(centerX, centerY, 600, 500, 0x333333).setStrokeStyle(4, 0xffffff);

        // Main Text
        const titleText = this.add.text(centerX, centerY - 150, mainText, {
            fontSize: '64px',
            color: color,
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Score
        let scoreTextObj;
        if (score !== undefined) {
            scoreTextObj = this.add.text(centerX, centerY - 50, `SCORE: ${score}`, {
                fontSize: '48px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4
            }).setOrigin(0.5);
        }

        // Restart Button
        const restartBtn = this.add.text(centerX, centerY + 50, "RESTART", { fontSize: '36px', color: '#fff' }).setOrigin(0.5).setInteractive();
        restartBtn.on('pointerdown', () => {
             if (this.mode === 'single') {
                 this.scene.restart({ mode: 'single' });
             } else if (this.mode === 'multi' && this.socket) {
                 this.socket.emit('request_restart', { roomId: this.roomId });
             }
        });
        restartBtn.on('pointerover', () => {
            this.selectedEndGameButtonIndex = 0;
            this.updateEndGameMenuAppearance();
        });

        // Exit Button
        const exitBtn = this.add.text(centerX, centerY + 130, "EXIT", { fontSize: '36px', color: '#fff' }).setOrigin(0.5).setInteractive();
        exitBtn.on('pointerdown', () => {
            this.exitGame();
        });
        exitBtn.on('pointerover', () => {
            this.selectedEndGameButtonIndex = 1;
            this.updateEndGameMenuAppearance();
        });

        const elements = [dim, panel, titleText, restartBtn, exitBtn];
        if (scoreTextObj) elements.push(scoreTextObj);

        gameOverContainer.add(elements);

        // Setup navigation
        this.endGameButtons = [restartBtn, exitBtn];
        this.selectedEndGameButtonIndex = 0;
        this.updateEndGameMenuAppearance();
    }

    startGame() {
        this.isGameRunning = true;
        
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
        // Hold Queue (Top-Left)
        // Position: p1X - Gap - (HoldWidth * Scale)
        const holdX = p1X - GAP - (HOLD_WIDTH * currentSideScale);
        const holdY = p1Y;
        this.holdBox = new TetrominoBox(this, holdX, holdY, HOLD_WIDTH, HOLD_HEIGHT);
        this.holdBox.container.setScale(currentSideScale);
        
        const holdZone = this.add.zone(holdX, holdY, HOLD_WIDTH * currentSideScale, HOLD_HEIGHT * currentSideScale).setOrigin(0);
        holdZone.setInteractive();
        holdZone.on('pointerdown', () => {
            if (!this.isGameRunning || this.isPause || this.isMenuOpen || this.isGameEnded) return;
            this.onInput('hold', InputState.PRESS);
            this.time.delayedCall(100, () => this.onInput('hold', InputState.RELEASE));
        });

        // Game Info (Left, Below Hold Queue)
        const infoX = holdX;
        const infoY = holdY + (HOLD_HEIGHT * currentSideScale) + (GAP * 0.5);
        const levelIndicator = new LevelIndicator(this, infoX, infoY);
        levelIndicator.container.setScale(currentSideScale);

        // Next Queue (Top-Right)
        // Position: p1X + (FieldWidth * Scale) + Gap - (VisualOffset * Scale)
        const queueX = p1X + (rawPlayFieldWidth * currentMainScale) + GAP - (BLOCK_SIZE * currentSideScale);
        const queueY = p1Y - (BLOCK_SIZE * currentSideScale);
        const tetrominoQueue = new TetrominoBoxQueue(this, queueX, queueY, 6);
        tetrominoQueue.container.setScale(currentSideScale);
        
        this.playField = new PlayField(this, p1X, p1Y, rawPlayFieldWidth, rawPlayFieldHeight);
        this.playField.setScale(currentMainScale);
        
        // Engine setup
        this.engine = new Engine(this.playField, this.holdBox, tetrominoQueue, levelIndicator);
        
        // Attach Attack Handler
        this.engine.setAttackHandler((count) => {
            if (this.mode === 'multi' && this.socket) {
                this.socket.emit('send_garbage', { roomId: this.roomId, count });
            }
        });
        
        // Game Over Handler
        this.playField.on('gameOver', () => {
            if (this.mode === 'multi' && this.socket) {
                this.socket.emit('game_over', { roomId: this.roomId });
            }
            const score = this.engine ? this.engine.getScore() : 0;
            this.showEndGameMessage('GAME OVER', '#ff0000', score);
        });

        this.engine.start();

        // --- Player 2 Setup (Opponent) ---
        if (this.mode === 'multi') {
            const p2X = (this.GAME_WIDTH * 0.75) - (rawPlayFieldWidth / 2);
            const p2Y = (this.GAME_HEIGHT - rawPlayFieldHeight) / 2;
            this.opponentPlayField = new PlayField(this, p2X, p2Y, rawPlayFieldWidth, rawPlayFieldHeight);
            this.add.text(p2X, p2Y - 30, 'Opponent', { fontSize: '20px', color: '#ffffff' });
        }
    }

    changeMenuSelection(change: number) {
        let newIndex = this.selectedMenuIndex + change;
        if (newIndex < 0) newIndex = this.menuButtons.length - 1;
        if (newIndex >= this.menuButtons.length) newIndex = 0;
        
        this.selectedMenuIndex = newIndex;
        this.updateMenuAppearance();
    }

    triggerMenuSelection() {
        if (this.menuButtons.length > 0) {
             const btn = this.menuButtons[this.selectedMenuIndex];
             btn.emit('pointerdown');
        }
    }

    changeEndGameSelection(change: number) {
        let newIndex = this.selectedEndGameButtonIndex + change;
        if (newIndex < 0) newIndex = this.endGameButtons.length - 1;
        if (newIndex >= this.endGameButtons.length) newIndex = 0;

        this.selectedEndGameButtonIndex = newIndex;
        this.updateEndGameMenuAppearance();
    }

    updateEndGameMenuAppearance() {
        this.endGameButtons.forEach((btn, index) => {
            if (index === this.selectedEndGameButtonIndex) {
                btn.setStyle({ color: '#ff0' });
            } else {
                btn.setStyle({ color: '#fff' });
            }
        });
    }

    triggerEndGameSelection() {
        if (this.endGameButtons.length > 0) {
            const btn = this.endGameButtons[this.selectedEndGameButtonIndex];
            btn.emit('pointerdown');
        }
    }

    private setBackgroundImage() {
        // Add background Image.
        const backgroundImage = this.textures.get('background').getSourceImage();
        // Just place it at 0,0 of logical screen and scale to cover logical screen
        const scaleX = this.GAME_WIDTH / backgroundImage.width;
        const scaleY = this.GAME_HEIGHT / backgroundImage.height;
        const scale = Math.max(scaleX, scaleY);
        
        this.backgroundImage = this.add.image(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2, 'background')
            .setOrigin(0.5)
            .setScale(scale);
    }

    resize (gameSize, baseSize?, displaySize?, resolution?)
    {
        // Check if cameras are available
        if (!this.cameras || !this.cameras.main) {
            return;
        }

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
        if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) {
            this.toggleMenu();
        }

        if (this.isMenuOpen) {
            if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
                this.changeMenuSelection(-1);
            } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
                this.changeMenuSelection(1);
            } else if (Phaser.Input.Keyboard.JustDown(this.enterKey) || Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
                this.triggerMenuSelection();
            }
            return; // Don't process game input if menu is open
        }

        if (this.isGameEnded) {
            if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
                this.changeEndGameSelection(-1);
            } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
                this.changeEndGameSelection(1);
            } else if (Phaser.Input.Keyboard.JustDown(this.enterKey) || Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
                this.triggerEndGameSelection();
            }
            return;
        }

        if (!this.isGameRunning || this.isPause) return;

        // Update Engine (Score, Time, etc)
        if (this.engine) {
            this.engine.update(time, delta);
        }

        // Charge DAS with key pressed state.
        this.chargeDAS("left", this.keys.LEFT.isDown, delta);
        this.chargeDAS("right", this.keys.RIGHT.isDown, delta);
        this.chargeDAS("softDrop", this.keys.DOWN.isDown, delta, this.playField.autoDropDelay / 20, this.playField.autoDropDelay / 20);
        this.chargeDAS("hardDrop", this.keys.SPACE.isDown, delta);
        this.chargeDAS("anticlockwise", this.keys.Z.isDown || this.keys.CTRL.isDown, delta);
        this.chargeDAS("clockwise", this.keys.X.isDown || this.keys.UP.isDown, delta);
        this.chargeDAS("hold", this.keys.C.isDown, delta);
        
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

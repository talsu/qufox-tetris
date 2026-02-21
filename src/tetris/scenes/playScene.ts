/**
 * @author       talsu  <talsu84@gmail.com>
 * @copyright    2018 talsu.net
 * @license      MIT
 */

import { PlayField } from '../objects/playField';
import { CONST, getBlockSize, InputState } from "../const/const";
import { Engine } from '../engine';
import { io, Socket } from "socket.io-client";
import { InputManager } from "../input/inputManager";
import { InGameMenu } from "../ui/inGameMenu";
import { BaseScene } from "./baseScene";
import { BotManager } from "../logic/botManager";
import { GAME_FONT_FAMILY } from "../ui/uiStyles";
import { GameOverlayControls } from "../ui/gameOverlayControls";
import {
    createGameLayout,
    calcSinglePlayerPosition,
    calcNMultiPlayerPosition,
    calcPlaySceneDimensions,
    calcPortraitPosition,
    calcPlaySceneOpponentLayout,
} from "../ui/gameLayout";

/**
 * Play scene - handles single player and 2-player multiplayer.
 */
export class PlayScene extends BaseScene {
    private playField: PlayField;
    private opponentPlayField: PlayField;
    private engine: Engine;

    private inputManager: InputManager;
    private inGameMenu: InGameMenu;

    private isPause: boolean = false;
    private socket: Socket;
    private roomId: string;
    private statusText: Phaser.GameObjects.Text;
    private lastUpdateSend: number = 0;
    private isGameRunning: boolean = false;
    private mode: string = 'single';
    private roomName: string;
    private isGameEnded: boolean = false;
    private botLevel: number = 0;
    private botManager: BotManager;
    private disconnectNoticeDOM: Phaser.GameObjects.DOMElement | null = null;
    private startImmediately: boolean = false;
    private overlayControls: GameOverlayControls | null = null;

    // Configurable Scales
    private readonly MAIN_SCALE = 1;
    private readonly SIDE_SCALE = 1;

    constructor() {
        super({ key: "PlayScene", mapAdd: { game: 'game' } });
    }

    init(data: any): void {
        this.handleResolution();

        this.mode = data.mode || 'single';
        this.roomName = data.roomName;
        this.botLevel = data.botLevel || 0;
        if (this.mode === 'multi') {
            this.socket = data.socket;
            this.roomId = data.roomId;
        }

        const dims = calcPlaySceneDimensions(this.layoutMode, this.mode);
        this.GAME_WIDTH = dims.width;
        this.GAME_HEIGHT = dims.height;

        this.isPause = false;
        this.isGameRunning = false;
        this.isGameEnded = false;
        this.lastUpdateSend = 0;
        this.startImmediately = data.startImmediately || false;
    }

    preload(): void { }

    create(): void {
        this.createBackground();

        // Pause Toggle
        this.input.keyboard.on('keydown-ESC', () => {
            if (!this.isGameEnded) {
                this.toggleMenu();
            }
        });

        this.scale.on('resize', this.resize, this);
        this.resize(window.innerWidth, window.innerHeight);

        this.statusText = this.add.text(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2, '', {
            fontFamily: GAME_FONT_FAMILY,
            fontSize: '32px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        this.inputManager = new InputManager(this, (direction, state) => this.onInput(direction, state));

        this.inGameMenu = new InGameMenu(this, {
            onResume: () => this.toggleMenu(),
            onExit: () => this.exitGame(),
            onRestart: () => this.restartGame(),
            onToggleBackground: (btn) => this.toggleBackground(btn)
        });

        this.overlayControls = new GameOverlayControls({
            scene: this,
            onMenuClick: () => this.toggleMenu(),
            isMobilePortrait: this.layoutMode === 'mobile-portrait',
        });

        if (this.mode === 'single') {
            this.startGame();
        } else {
            this.setupMultiplayer();
            if (this.startImmediately) {
                this.statusText.setVisible(false);
                this.startGame();
            }
        }

        this.events.on('shutdown', this.shutdown, this);
    }

    private setupMultiplayer() {
        this.statusText.setText('Waiting for opponent...');

        if (this.socket) {
            this.socket.on('game_start', () => {
                if (this.isGameRunning) return;

                if (this.playField) {
                    // Previous game objects exist — restart scene cleanly
                    this.scene.restart({
                        mode: 'multi',
                        socket: this.socket,
                        roomId: this.roomId,
                        roomName: this.roomName,
                        botLevel: this.botLevel,
                        startImmediately: true
                    });
                    return;
                }

                if (this.disconnectNoticeDOM) {
                    this.disconnectNoticeDOM.destroy();
                    this.disconnectNoticeDOM = null;
                }
                this.statusText.setVisible(false);
                this.startGame();
            });

            this.socket.on('opponent_state_update', (data) => {
                if (this.opponentPlayField) {
                    if (typeof data.board === 'string') {
                        this.opponentPlayField.deserializeEncoded(data.board);
                    } else {
                        this.opponentPlayField.deserialize(data.board);
                    }
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
                this.scene.restart({ mode: 'multi', socket: this.socket, roomId: this.roomId, roomName: this.roomName, botLevel: this.botLevel });
            });

            this.socket.on('opponent_disconnected', (data?: { message?: string }) => {
                this.handleOpponentDisconnected(data?.message);
            });

            this.socket.emit('player_ready', { roomId: this.roomId });
        }
    }

    private handleOpponentDisconnected(message?: string) {
        if (this.mode !== 'multi' || !this.socket) {
            return;
        }

        this.isGameRunning = false;
        this.isGameEnded = false;
        this.inputManager.isEnabled = false;

        if (this.botManager) {
            this.botManager.stop();
        }
        if (this.playField) {
            this.playField.stop();
        }

        this.showDisconnectNotice(message || 'Opponent left. Waiting for a new player...');

        this.socket.emit('player_ready', { roomId: this.roomId });
    }

    private showDisconnectNotice(message: string) {
        if (this.disconnectNoticeDOM) {
            this.disconnectNoticeDOM.destroy();
            this.disconnectNoticeDOM = null;
        }

        this.statusText
            .setText('Waiting for opponent...')
            .setVisible(true)
            .setDepth(1000);

        const html = `
        <div class="disconnect-notice-overlay" style="width: ${this.GAME_WIDTH}px; height: ${this.GAME_HEIGHT}px;">
            <div class="menu-panel disconnect-notice-panel">
                <div class="menu-title disconnect-notice-title">NOTICE</div>
                <div class="disconnect-notice-message">${message}</div>
            </div>
        </div>
        `;

        this.disconnectNoticeDOM = this.add.dom(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2).createFromHTML(html);
        this.disconnectNoticeDOM.setDepth(1001);
        this.disconnectNoticeDOM.setScale(this.cameras.main.zoom);

        this.time.delayedCall(2500, () => {
            if (!this.disconnectNoticeDOM) {
                return;
            }
            this.disconnectNoticeDOM.destroy();
            this.disconnectNoticeDOM = null;
        });
    }

    private shutdown() {
        this.scale.off('resize', this.resize, this);
        if (this.botManager) {
            this.botManager.stop();
        }
        if (this.socket) {
            this.socket.off('game_start');
            this.socket.off('opponent_state_update');
            this.socket.off('receive_garbage');
            this.socket.off('opponent_game_over');
            this.socket.off('restart_signal');
            this.socket.off('opponent_disconnected');
        }
        if (this.disconnectNoticeDOM) {
            this.disconnectNoticeDOM.destroy();
            this.disconnectNoticeDOM = null;
        }
        if (this.inGameMenu) {
            this.inGameMenu.destroy();
        }
        if (this.overlayControls) {
            this.overlayControls.destroy();
            this.overlayControls = null;
        }
    }

    private toggleMenu() {
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

    private toggleBackground(btn: HTMLElement) {
        const isVisible = this.backgroundGraphics.visible;
        this.backgroundGraphics.setVisible(!isVisible);
        btn.innerText = `Background: ${!isVisible ? 'ON' : 'OFF'}`;
    }

    private exitGame() {
        this.time.paused = false;
        if (this.socket) {
            this.socket.disconnect();
        }

        if (this.mode === 'multi') {
            history.replaceState(null, '', '/');
        }

        if (this.mode === 'single') {
            this.scene.start("MenuScene");
        } else {
            this.scene.start("LobbyScene");
        }
    }

    private restartGame() {
        if (this.mode === 'single') {
            this.scene.restart({ mode: 'single' });
        } else if (this.mode === 'multi' && this.socket) {
            this.socket.emit('request_restart', { roomId: this.roomId });
        }
    }

    private showEndGameMessage(mainText: string, color: string, score?: number) {
        this.isGameRunning = false;
        this.isGameEnded = true;
        this.inputManager.isEnabled = false;
        if (this.botManager) {
            this.botManager.stop();
        }
        if (this.playField) {
            this.playField.stop();
        }
        this.inGameMenu.showEndGame(mainText, color, score);
    }

    private startGame() {
        this.isGameRunning = true;
        this.inputManager.isEnabled = true;

        const isPortrait = this.layoutMode === 'mobile-portrait';
        const currentMainScale = (this.mode === 'single') ? this.MAIN_SCALE : 1;
        const currentSideScale = (this.mode === 'single') ? this.SIDE_SCALE : 1;

        // Calculate play field position based on mode and layout
        let pos: { x: number; y: number };
        if (isPortrait) {
            pos = calcPortraitPosition(this.GAME_WIDTH);
            pos.y -= getBlockSize() * 0.75;
        } else if (this.mode === 'single') {
            pos = calcSinglePlayerPosition(this.GAME_WIDTH, this.GAME_HEIGHT, currentMainScale);
        } else {
            pos = calcNMultiPlayerPosition(this.GAME_HEIGHT);
        }

        // Create standard game layout
        const layout = createGameLayout({
            scene: this,
            fieldX: pos.x,
            fieldY: pos.y,
            mainScale: isPortrait ? 1 : currentMainScale,
            sideScale: isPortrait ? 1 : currentSideScale,
            onHoldInput: (dir, state) => this.onInput(dir, state),
            isInputBlocked: () => !this.isGameRunning || this.isPause || this.inGameMenu.isMenuOpen || this.isGameEnded,
            layoutMode: this.layoutMode,
        });

        this.playField = layout.playField;
        this.engine = layout.engine;

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
        this.inputManager.setDragThresholdScale(isPortrait ? 1 : currentMainScale);

        if (this.botLevel > 0) {
            this.botManager = new BotManager(this.engine, this.playField, this.botLevel);
            this.botManager.start();
        }

        // Opponent field for 2-player mode
        if (this.mode === 'multi') {
            const rawPlayFieldWidth = getBlockSize() * CONST.PLAY_FIELD.COL_COUNT;
            const rawPlayFieldHeight = getBlockSize() * CONST.PLAY_FIELD.ROW_COUNT;
            const opponentLayout = calcPlaySceneOpponentLayout(this.layoutMode, this.GAME_WIDTH, this.GAME_HEIGHT, pos.y);
            this.opponentPlayField = new PlayField(this, opponentLayout.x, opponentLayout.y, rawPlayFieldWidth, rawPlayFieldHeight);
            this.opponentPlayField.setScale(opponentLayout.scale);
        }
    }


    resize(gameSize, baseSize?, displaySize?, resolution?) {
        super.resize(gameSize, baseSize, displaySize, resolution);
        if (this.disconnectNoticeDOM && this.cameras && this.cameras.main) {
            this.disconnectNoticeDOM.setScale(this.cameras.main.zoom);
        }
        if (this.overlayControls) {
            this.overlayControls.layout();
        }
    }

    update(time: number, delta: number): void {
        if (this.inGameMenu.isMenuOpen || this.isGameEnded) {
            return;
        }

        if (!this.isGameRunning || this.isPause) return;

        if (this.engine) {
            this.engine.update(time, delta);
        }

        if (this.botManager) {
            this.botManager.update(time, delta);
        }

        const softDropSpeed = this.playField ? (this.playField.autoDropDelay / 20) : CONST.PLAY_FIELD.AR_MS;
        this.inputManager.updateCustom(time, delta, softDropSpeed, softDropSpeed);

        // Network Sync (10Hz)
        if (this.mode === 'multi' && time - this.lastUpdateSend > 100) {
            this.lastUpdateSend = time;
            if (this.playField && this.socket) {
                this.socket.emit('update_state', {
                    roomId: this.roomId,
                    board: this.playField.serializeEncoded()
                });
            }
        }
    }

    private onInput(direction: string, state: InputState) {
        if (this.engine) {
            this.engine.onInput(direction, state);
        }
    }
}

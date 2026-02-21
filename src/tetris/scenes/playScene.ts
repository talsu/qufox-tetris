import { PlayField } from '../objects/playField';
import { CONST, getBlockSize } from "../const/const";
import { BasePlayScene } from "./basePlayScene";
import { BotManager } from "../logic/botManager";
import {
    createGameLayout,
    calcSinglePlayerPosition,
    calcNMultiPlayerPosition,
    calcPlaySceneDimensions,
    calcPortraitPlayFieldPosition,
    calcPlaySceneOpponentLayout,
} from "../ui/gameLayout";
import { preloadKenneyAssets } from '../ui/kenneyAssets';

export class PlayScene extends BasePlayScene {
    private opponentPlayField: PlayField;
    private mode: string = 'single';
    private startImmediately: boolean = false;
    private disconnectNoticeContainer: Phaser.GameObjects.Container | null = null;
    private disconnectNoticeBg: Phaser.GameObjects.Rectangle | null = null;
    private disconnectNoticePanel: Phaser.GameObjects.Graphics | null = null;
    private disconnectNoticeTitle: Phaser.GameObjects.Text | null = null;
    private disconnectNoticeMessage: Phaser.GameObjects.Text | null = null;
    private disconnectNoticeTimer: Phaser.Time.TimerEvent | null = null;

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

    preload(): void {
        preloadKenneyAssets(this);
    }

    create(): void {
        this.createBaseUI({
            onResume: () => this.toggleMenu(),
            onExit: () => this.exitGame(),
            onRestart: () => this.restartGame(),
            onCycleBackgroundTheme: () => this.cycleBackgroundThemeLabel(),
            getBackgroundThemeLabel: () => this.getBackgroundThemeLabelValue(),
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

    protected toggleMenu(): void {
        this.inGameMenu.togglePauseMenu();
        const isOpen = this.inGameMenu.isMenuOpen;
        this.inputManager.isEnabled = !isOpen;
        if (this.mode === 'single') {
            if (isOpen) {
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

    private setupMultiplayer(): void {
        this.statusText.setText('Waiting for opponent...');
        if (!this.socket) return;

        this.socket.on('game_start', () => {
            if (this.isGameRunning) return;

            if (this.playField) {
                this.scene.restart({
                    mode: 'multi',
                    socket: this.socket,
                    roomId: this.roomId,
                    roomName: this.roomName,
                    botLevel: this.botLevel,
                    startImmediately: true,
                });
                return;
            }

            this.hideDisconnectNotice();
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

    private handleOpponentDisconnected(message?: string): void {
        if (this.mode !== 'multi' || !this.socket) return;

        this.isGameRunning = false;
        this.isGameEnded = false;
        this.inputManager.isEnabled = false;
        if (this.botManager) this.botManager.stop();
        if (this.playField) this.playField.stop();

        this.showDisconnectNotice(message || 'Opponent left. Waiting for a new player...');
        this.socket.emit('player_ready', { roomId: this.roomId });
    }

    private showDisconnectNotice(message: string): void {
        this.hideDisconnectNotice();

        this.statusText.setText('Waiting for opponent...').setVisible(true).setDepth(1000);

        this.disconnectNoticeContainer = this.add.container(0, 0).setDepth(1001);
        this.disconnectNoticeBg = this.add.rectangle(0, 0, 1, 1, 0x0b1635, 0.8).setOrigin(0);
        this.disconnectNoticePanel = this.add.graphics();
        this.disconnectNoticeTitle = this.add.text(0, 0, 'NOTICE', {
            fontFamily: 'Connection, Pretendard, sans-serif',
            fontSize: '56px',
            color: '#ffffff',
            fontStyle: 'bold',
        }).setOrigin(0.5, 0);
        this.disconnectNoticeTitle.setStroke('#3559a5', 8);
        this.disconnectNoticeMessage = this.add.text(0, 0, message, {
            fontFamily: 'Pretendard, sans-serif',
            fontSize: '30px',
            color: '#1e376a',
            fontStyle: 'bold',
            align: 'center',
            wordWrap: { width: 540 },
        }).setOrigin(0.5, 0);

        this.disconnectNoticeContainer.add([
            this.disconnectNoticeBg,
            this.disconnectNoticePanel,
            this.disconnectNoticeTitle,
            this.disconnectNoticeMessage,
        ]);

        this.layoutDisconnectNotice();

        this.disconnectNoticeTimer = this.time.delayedCall(2500, () => {
            this.hideDisconnectNotice();
        });
    }

    private layoutDisconnectNotice(): void {
        if (!this.disconnectNoticeContainer || !this.disconnectNoticeBg || !this.disconnectNoticePanel || !this.disconnectNoticeTitle || !this.disconnectNoticeMessage) {
            return;
        }

        const cam = this.cameras.main;
        cam.preRender();
        const worldPerPixel = 1 / (cam.zoom || 1);
        const viewWidth = cam.width * worldPerPixel;
        const viewHeight = cam.height * worldPerPixel;
        const isPortrait = cam.height > cam.width;

        this.disconnectNoticeContainer.setPosition(cam.worldView.x, cam.worldView.y);
        this.disconnectNoticeBg.setPosition(0, 0);
        this.disconnectNoticeBg.setSize(viewWidth, viewHeight);

        const panelWidth = Math.min(viewWidth * (isPortrait ? 0.9 : 0.66), 640 * worldPerPixel);
        const panelHeight = Math.min(viewHeight * (isPortrait ? 0.42 : 0.5), 340 * worldPerPixel);
        const panelX = (viewWidth - panelWidth) / 2;
        const panelY = (viewHeight - panelHeight) / 2;

        this.disconnectNoticePanel.clear();
        this.disconnectNoticePanel.fillStyle(0x4b71c2, 0.96);
        this.disconnectNoticePanel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 14);
        this.disconnectNoticePanel.fillGradientStyle(0xfbfeff, 0xfbfeff, 0xdfecff, 0xdfecff, 0.98);
        this.disconnectNoticePanel.fillRoundedRect(panelX + 6, panelY + 6, Math.max(1, panelWidth - 12), Math.max(1, panelHeight - 12), 10);
        this.disconnectNoticePanel.lineStyle(3, 0x84a9ed, 0.95);
        this.disconnectNoticePanel.strokeRoundedRect(panelX + 2, panelY + 2, Math.max(1, panelWidth - 4), Math.max(1, panelHeight - 4), 12);
        this.disconnectNoticePanel.lineStyle(2, 0x325491, 0.9);
        this.disconnectNoticePanel.strokeRoundedRect(panelX + 8, panelY + 8, Math.max(1, panelWidth - 16), Math.max(1, panelHeight - 16), 8);

        this.disconnectNoticeTitle.setFontSize(Math.round((isPortrait ? 46 : 56) * worldPerPixel));
        this.disconnectNoticeTitle.setPosition(panelX + panelWidth / 2, panelY + 28 * worldPerPixel);

        this.disconnectNoticeMessage.setFontSize(Math.round((isPortrait ? 20 : 26) * worldPerPixel));
        this.disconnectNoticeMessage.setWordWrapWidth(Math.max(140 * worldPerPixel, panelWidth - 68 * worldPerPixel));
        this.disconnectNoticeMessage.setPosition(panelX + panelWidth / 2, panelY + 118 * worldPerPixel);
    }

    private hideDisconnectNotice(): void {
        if (this.disconnectNoticeTimer) {
            this.disconnectNoticeTimer.remove(false);
            this.disconnectNoticeTimer = null;
        }
        if (this.disconnectNoticeContainer) {
            this.disconnectNoticeContainer.destroy(true);
            this.disconnectNoticeContainer = null;
            this.disconnectNoticeBg = null;
            this.disconnectNoticePanel = null;
            this.disconnectNoticeTitle = null;
            this.disconnectNoticeMessage = null;
        }
    }

    private shutdown(): void {
        if (this.socket) {
            this.socket.off('game_start');
            this.socket.off('opponent_state_update');
            this.socket.off('receive_garbage');
            this.socket.off('opponent_game_over');
            this.socket.off('restart_signal');
            this.socket.off('opponent_disconnected');
        }
        this.hideDisconnectNotice();
        this.shutdownBase();
    }

    protected exitGame(): void {
        this.time.paused = false;
        if (this.socket) this.socket.disconnect();
        if (this.mode === 'multi') history.replaceState(null, '', '/');
        this.scene.start(this.mode === 'single' ? 'MenuScene' : 'LobbyScene');
    }

    protected restartGame(): void {
        if (this.mode === 'single') {
            this.scene.restart({ mode: 'single' });
        } else if (this.mode === 'multi' && this.socket) {
            this.socket.emit('request_restart', { roomId: this.roomId });
        }
    }

    protected startGame(): void {
        this.isGameRunning = true;
        this.inputManager.isEnabled = true;

        const isPortrait = this.layoutMode === 'mobile-portrait';
        const currentMainScale = this.mode === 'single' ? this.MAIN_SCALE : 1;
        const currentSideScale = this.mode === 'single' ? this.SIDE_SCALE : 1;

        let pos: { x: number; y: number };
        if (isPortrait) {
            pos = calcPortraitPlayFieldPosition(this.GAME_WIDTH);
        } else if (this.mode === 'single') {
            pos = calcSinglePlayerPosition(this.GAME_WIDTH, this.GAME_HEIGHT, currentMainScale);
        } else {
            pos = calcNMultiPlayerPosition(this.GAME_HEIGHT);
        }

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
        this.bindKenneyImpactEvents();

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

        if (this.mode === 'multi') {
            const rawPlayFieldWidth = getBlockSize() * CONST.PLAY_FIELD.COL_COUNT;
            const rawPlayFieldHeight = getBlockSize() * CONST.PLAY_FIELD.ROW_COUNT;
            const opponentLayout = calcPlaySceneOpponentLayout(this.layoutMode, this.GAME_WIDTH, this.GAME_HEIGHT, pos.y);
            this.opponentPlayField = new PlayField(this, opponentLayout.x, opponentLayout.y, rawPlayFieldWidth, rawPlayFieldHeight);
            this.opponentPlayField.setScale(opponentLayout.scale);
        }
    }

    protected networkUpdate(time: number): void {
        if (this.mode === 'multi' && time - this.lastUpdateSend > 100) {
            this.lastUpdateSend = time;
            if (this.playField && this.socket) {
                this.socket.emit('update_state', {
                    roomId: this.roomId,
                    board: this.playField.serializeEncoded(),
                });
            }
        }
    }

    resize(gameSize, baseSize?, displaySize?, resolution?) {
        super.resize(gameSize, baseSize, displaySize, resolution);
        this.layoutDisconnectNotice();
    }
}

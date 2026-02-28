import { PlayField } from '../objects/playField';
import { BoardCodec } from '../net/boardCodec';
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
import {
    type AuthSnapshotPayload,
    isAuthRoundOverPayload,
    isAuthSnapshotPayload,
    isGameStartPayload,
    isNMultiReceiveGarbagePayload,
    isRoomResumedPayload,
    toFiniteNumberOrNull,
} from '../../shared/types/socketPayloads';
import {
    applyAuthoritativeBootstrapSnapshot,
    bindDocumentVisibilityHandler,
    computeResyncMismatchState,
    isResyncTransitionPhase,
    shouldSkipResyncByAck,
    unbindDocumentVisibilityHandler,
} from './multiplayerSyncUtils';

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
    private resumeToken: string | null = null;
    private useAuthoritativeServer: boolean = false;
    private inputSeq: number = 0;
    private isHost: boolean = false;
    private authQueueSeed: number | null = null;
    private initialAuthSnapshot: AuthSnapshotPayload | null = null;
    private needsAuthoritativeResync: boolean = false;
    private localMismatchStreak: number = 0;
    private forceAuthoritativeResyncOnce: boolean = false;
    private lastOpponentBoardSnapshot: string | Uint8Array | ArrayBuffer | null = null;
    private visibilityHandler: (() => void) | null = null;
    private bootstrapRenderObjects: Array<{ setVisible: (visible: boolean) => unknown }> | null = null;
    private awaitingInitialAuthSnapshot: boolean = false;

    private readonly MAIN_SCALE = 1;
    private readonly SIDE_SCALE = 1;
    private emitAuthPresence(state: 'active' | 'inactive'): void {
        if (!this.socket || !this.roomId) return;
        this.socket.emit('auth_presence', {
            roomId: this.roomId,
            state,
            lastInputSeq: this.inputSeq,
        });
    }

    private resolveEndGameScore(authoritativeScore?: number): number {
        if (this.engine) {
            return this.engine.getScore();
        }
        if (Number.isFinite(authoritativeScore)) {
            return Number(authoritativeScore);
        }
        return 0;
    }

    private bindVisibilitySync(): void {
        if (!this.useAuthoritativeServer || typeof document === 'undefined' || this.visibilityHandler) {
            return;
        }

        this.visibilityHandler = bindDocumentVisibilityHandler(this.visibilityHandler, () => {
            const hidden = document.visibilityState === 'hidden';
            if (hidden) {
                this.needsAuthoritativeResync = true;
                this.localMismatchStreak = 0;
                this.forceAuthoritativeResyncOnce = false;
                if (this.inputManager) {
                    this.inputManager.isEnabled = false;
                }
                this.emitAuthPresence('inactive');
                return;
            }

            if (this.isGameRunning && !this.isGameEnded && this.inputManager) {
                this.inputManager.isEnabled = !this.inGameMenu.isMenuOpen;
            }

            this.emitAuthPresence('active');

            if (this.needsAuthoritativeResync && this.socket && this.resumeToken) {
                this.forceAuthoritativeResyncOnce = true;
                this.socket.emit('resume_auth', { resumeToken: this.resumeToken });
            }
        });
    }

    private unbindVisibilitySync(): void {
        this.visibilityHandler = unbindDocumentVisibilityHandler(this.visibilityHandler);
    }

    private maybeResyncLocalStateFromSnapshot(data: AuthSnapshotPayload): void {
        if (!this.useAuthoritativeServer || !this.playField || !this.engine || !this.isGameRunning || this.isGameEnded) {
            return;
        }

        if (shouldSkipResyncByAck(data.serverAckInputSeq, this.inputSeq)) {
            return;
        }

        if (isResyncTransitionPhase(this.playField.phase)) {
            this.localMismatchStreak = 0;
            return;
        }

        const mismatch = computeResyncMismatchState({
            localBoard: this.playField.serializeEncoded(),
            remoteBoard: data.self.board,
            tick: data.tick,
            mismatchStreak: this.localMismatchStreak,
            needsAuthoritativeResync: this.needsAuthoritativeResync,
            mismatchThreshold: 6,
        });
        this.localMismatchStreak = mismatch.mismatchStreak;
        this.needsAuthoritativeResync = mismatch.needsAuthoritativeResync;
        const shouldApplyForcedResync = this.forceAuthoritativeResyncOnce && this.needsAuthoritativeResync;

        if (!this.needsAuthoritativeResync) {
            return;
        }

        if (this.localMismatchStreak === 0 && !shouldApplyForcedResync) {
            return;
        }

        if (data.self.sync) {
            this.engine.applyAuthoritativeSync(data.self.sync, {
                score: data.self.score,
                level: data.self.level,
                lines: data.self.lines,
            });
            this.localMismatchStreak = 0;
            this.needsAuthoritativeResync = false;
            this.forceAuthoritativeResyncOnce = false;
        }
    }

    private applyOpponentBoardSnapshot(encodedBoard: string | Uint8Array | ArrayBuffer): void {
        if (!this.opponentPlayField) return;
        if (BoardCodec.areUint8ArraysEqual(encodedBoard, this.lastOpponentBoardSnapshot)) return;
        this.opponentPlayField.deserializeEncoded(encodedBoard);
        this.lastOpponentBoardSnapshot = encodedBoard;
    }

    constructor() {
        super({ key: "PlayScene", mapAdd: { game: 'game' } });
    }

    init(data: any): void {
        this.handleResolution();

        this.mode = data.mode || 'single';
        this.roomName = data.roomName;
        this.botLevel = data.botLevel || 0;
        this.isHost = false;
        this.authQueueSeed = null;
        this.initialAuthSnapshot = null;
        if (this.mode === 'multi') {
            this.socket = data.socket;
            this.roomId = data.roomId;
            this.resumeToken = data.resumeToken || null;
            this.isHost = Boolean(data.isHost);
            this.authQueueSeed = toFiniteNumberOrNull(data.authQueueSeed);
            this.initialAuthSnapshot = isAuthSnapshotPayload(data.authSnapshot) ? data.authSnapshot : null;
            this.useAuthoritativeServer = true;
        }

        const dims = calcPlaySceneDimensions(this.layoutMode, this.mode);
        this.GAME_WIDTH = dims.width;
        this.GAME_HEIGHT = dims.height;

        this.isPause = false;
        this.isGameRunning = false;
        this.isGameEnded = false;
        this.lastUpdateSend = 0;
        this.needsAuthoritativeResync = false;
        this.localMismatchStreak = 0;
        this.forceAuthoritativeResyncOnce = false;
        this.lastOpponentBoardSnapshot = null;
        this.startImmediately = data.startImmediately || false;
    }

    private applyInitialAuthoritativeBootstrap(): void {
        if (!this.useAuthoritativeServer || !this.initialAuthSnapshot || !this.engine) {
            return;
        }

        const snapshot = this.initialAuthSnapshot;
        applyAuthoritativeBootstrapSnapshot(snapshot, {
            applySelfSync: (sync, stats) => {
                this.engine.applyAuthoritativeSync(sync, stats);
            },
            applyOpponent: (opponent) => {
                if (opponent.board && this.opponentPlayField) {
                    this.applyOpponentBoardSnapshot(opponent.board);
                }
            },
        });

        this.localMismatchStreak = 0;
        this.needsAuthoritativeResync = false;
        this.forceAuthoritativeResyncOnce = false;
        this.initialAuthSnapshot = null;
    }

    private revealBootstrapRenderObjectsIfReady(): void {
        if (!this.bootstrapRenderObjects) {
            return;
        }

        this.bootstrapRenderObjects.forEach((obj) => {
            obj.setVisible(true);
        });
        this.bootstrapRenderObjects = null;

        if (this.inputManager && this.isGameRunning && !this.isGameEnded) {
            this.inputManager.isEnabled = !this.inGameMenu.isMenuOpen;
        }
    }

    private applyInitialAuthoritativeSnapshotFromLiveTick(data: AuthSnapshotPayload): void {
        if (!this.awaitingInitialAuthSnapshot || !this.useAuthoritativeServer || !this.engine || !this.playField) {
            return;
        }

        if (data.self.sync) {
            this.engine.applyAuthoritativeSync(data.self.sync, {
                score: data.self.score,
                level: data.self.level,
                lines: data.self.lines,
            });
        }

        if (data.opponent.board && this.opponentPlayField) {
            this.applyOpponentBoardSnapshot(data.opponent.board);
        }

        this.localMismatchStreak = 0;
        this.needsAuthoritativeResync = false;
        this.forceAuthoritativeResyncOnce = false;
        this.awaitingInitialAuthSnapshot = false;
        this.revealBootstrapRenderObjectsIfReady();
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
        this.bindVisibilitySync();

        this.socket.on('connect', () => {
            if (this.resumeToken) {
                this.socket.emit('resume_auth', { resumeToken: this.resumeToken });
            }
        });

        this.socket.on('room_resumed', (data: unknown) => {
            if (!isRoomResumedPayload(data)) return;
            const shouldApplyResumeSync = this.needsAuthoritativeResync;
            if (data.resumeToken) {
                this.resumeToken = data.resumeToken;
            }
            if (typeof data.isHost === 'boolean') {
                this.isHost = data.isHost;
            }
            this.authQueueSeed = toFiniteNumberOrNull(data.authSeed) ?? this.authQueueSeed;

            if (shouldApplyResumeSync && data.shadowSelf && data.shadowSelf.sync && this.engine) {
                this.engine.applyAuthoritativeSync(data.shadowSelf.sync, {
                    score: Number(data.shadowSelf.score || 0),
                    level: Number(data.shadowSelf.level || 1),
                    lines: Number(data.shadowSelf.lines || 0),
                });
                this.needsAuthoritativeResync = false;
                this.localMismatchStreak = 0;
                this.forceAuthoritativeResyncOnce = false;
            }
            if (shouldApplyResumeSync && data.shadowOpponent && typeof data.shadowOpponent.board === 'string') {
                this.applyOpponentBoardSnapshot(data.shadowOpponent.board);
            }
            if (shouldApplyResumeSync && Array.isArray(data.pendingGarbage) && this.playField) {
                for (const pending of data.pendingGarbage) {
                    const count = Number(pending.count || 0);
                    if (count > 0) {
                        this.playField.insertGarbage(count);
                    }
                }
            }
        });

        this.socket.on('game_start', (startData: unknown) => {
            if (this.isGameRunning) return;
            if (!isGameStartPayload(startData)) return;

            this.authQueueSeed = toFiniteNumberOrNull(startData.authSeed) ?? this.authQueueSeed;
            if (startData.authSnapshot && isAuthSnapshotPayload(startData.authSnapshot)) {
                this.initialAuthSnapshot = startData.authSnapshot;
            }

            if (this.playField) {
                this.scene.restart({
                    mode: 'multi',
                    socket: this.socket,
                    roomId: this.roomId,
                    roomName: this.roomName,
                    botLevel: this.botLevel,
                    isHost: this.isHost,
                    resumeToken: this.resumeToken,
                    authQueueSeed: this.authQueueSeed,
                    authSnapshot: this.initialAuthSnapshot,
                    startImmediately: true,
                });
                return;
            }

            this.hideDisconnectNotice();
            this.statusText.setVisible(false);
            this.startGame();
        });

        this.socket.on('opponent_state_update', (data) => {
            if (this.useAuthoritativeServer) return;
            if (this.opponentPlayField) {
                if (typeof data.board === 'string') {
                    this.applyOpponentBoardSnapshot(data.board);
                } else {
                    this.opponentPlayField.deserialize(data.board);
                    this.lastOpponentBoardSnapshot = null;
                }
            }
        });

        this.socket.on('receive_garbage', (data) => {
            if (this.useAuthoritativeServer) return;
            if (this.playField) {
                this.playField.insertGarbage(data.count);
                this.cameras.main.shake(200, 0.01);
            }
        });

        this.socket.on('opponent_game_over', () => {
            if (!this.isGameRunning || this.isGameEnded) return;
            const score = this.engine ? this.engine.getScore() : 0;
            this.showEndGameMessage('YOU WIN!', '#00ff00', score);
        });

        this.socket.on('auth_snapshot', (data: unknown) => {
            if (!this.useAuthoritativeServer || !this.playField || !this.opponentPlayField) return;
            if (!isAuthSnapshotPayload(data)) return;

            this.applyInitialAuthoritativeSnapshotFromLiveTick(data);

            if (!data.shadowRelay) {
                this.maybeResyncLocalStateFromSnapshot(data);
            }

            if (data.opponent.board) {
                this.applyOpponentBoardSnapshot(data.opponent.board);
            }

            if (this.isGameRunning && data.self.isAlive === false && !this.isGameEnded) {
                this.showEndGameMessage('GAME OVER', '#ff0000', this.resolveEndGameScore(data.self.score));
            }
            if (this.isGameRunning && data.opponent.isAlive === false && !this.isGameEnded) {
                this.showEndGameMessage('YOU WIN!', '#00ff00', this.resolveEndGameScore(data.self.score));
            }
        });

        this.socket.on('auth_receive_garbage', (data: unknown) => {
            if (!this.useAuthoritativeServer || !this.playField || !this.isGameRunning || this.isGameEnded) return;
            if (!isNMultiReceiveGarbagePayload(data)) return;
            const count = Number(data.count || 0);
            if (count <= 0) return;
            this.playField.insertGarbage(count);
            this.cameras.main.shake(200, 0.01);
        });

        this.socket.on('auth_round_over', (data: unknown) => {
            if (!this.useAuthoritativeServer || !this.isGameRunning || this.isGameEnded) return;
            if (!isAuthRoundOverPayload(data)) return;

            if (data.winner === null) {
                const score = this.resolveEndGameScore();
                this.showEndGameMessage('DRAW', '#ffd166', score);
                return;
            }

            const localSeat = this.isHost ? 'p1' : 'p2';
            const didWin = data.winner === localSeat;
            const score = this.resolveEndGameScore();
            this.showEndGameMessage(didWin ? 'YOU WIN!' : 'GAME OVER', didWin ? '#00ff00' : '#ff0000', score);
        });

        this.socket.on('restart_signal', () => {
            this.scene.restart({
                mode: 'multi',
                socket: this.socket,
                roomId: this.roomId,
                roomName: this.roomName,
                botLevel: this.botLevel,
                isHost: this.isHost,
                resumeToken: this.resumeToken,
                authQueueSeed: this.authQueueSeed,
                authSnapshot: this.initialAuthSnapshot,
            });
        });

        this.socket.on('opponent_disconnected', (data?: { message?: string }) => {
            this.handleOpponentDisconnected(data?.message);
        });

        this.socket.emit('player_ready', { roomId: this.roomId });
        this.emitAuthPresence('active');
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
        this.unbindVisibilitySync();
        if (this.socket) {
            this.socket.off('game_start');
            this.socket.off('connect');
            this.socket.off('room_resumed');
            this.socket.off('opponent_state_update');
            this.socket.off('receive_garbage');
            this.socket.off('opponent_game_over');
            this.socket.off('restart_signal');
            this.socket.off('opponent_disconnected');
            this.socket.off('auth_snapshot');
            this.socket.off('auth_receive_garbage');
            this.socket.off('auth_round_over');
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
        this.inputManager.isEnabled = false;

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

        const shouldGateBootstrapRender = this.mode === 'multi' && this.useAuthoritativeServer;
        const localRenderObjects: Array<{ setVisible: (visible: boolean) => unknown }> = [
            layout.playField.container,
            layout.holdBox.container,
            layout.levelIndicator.container,
            layout.tetrominoQueue.container,
        ];
        if (shouldGateBootstrapRender) {
            this.bootstrapRenderObjects = localRenderObjects;
            this.awaitingInitialAuthSnapshot = true;
            localRenderObjects.forEach((obj) => {
                obj.setVisible(false);
            });
        } else {
            this.bootstrapRenderObjects = null;
            this.awaitingInitialAuthSnapshot = false;
        }

        if (this.engine) {
            if (this.mode === 'multi' && this.useAuthoritativeServer && this.authQueueSeed !== null) {
                this.engine.queueInstance.setSeed(this.authQueueSeed);
            }
            this.engine.setAttackHandler((count) => {
                if (this.mode === 'multi' && this.socket) {
                    if (this.useAuthoritativeServer) {
                        this.socket.emit('auth_send_garbage', { roomId: this.roomId, count });
                    } else {
                        this.socket.emit('send_garbage', { roomId: this.roomId, count });
                    }
                }
            });
        }

        this.playField.on('gameOver', () => {
            if (this.mode === 'multi' && this.socket) {
                this.socket.emit('game_over', { roomId: this.roomId });
            }
            const score = this.engine ? this.engine.getScore() : 0;
            this.showEndGameMessage('GAME OVER', '#ff0000', score);
        });

        if (this.engine) {
            this.engine.start();
        }

        if (this.mode === 'multi') {
            const rawPlayFieldWidth = getBlockSize() * CONST.PLAY_FIELD.COL_COUNT;
            const rawPlayFieldHeight = getBlockSize() * CONST.PLAY_FIELD.ROW_COUNT;
            const opponentLayout = calcPlaySceneOpponentLayout(this.layoutMode, this.GAME_WIDTH, this.GAME_HEIGHT, pos.y);
            this.opponentPlayField = new PlayField(this, opponentLayout.x, opponentLayout.y, rawPlayFieldWidth, rawPlayFieldHeight);
            this.opponentPlayField.setScale(opponentLayout.scale);
            this.applyInitialAuthoritativeBootstrap();
        }

        if (!shouldGateBootstrapRender) {
            localRenderObjects.forEach((obj) => {
                obj.setVisible(true);
            });
        }

        this.inputManager.setDragThresholdScale(isPortrait ? 1 : currentMainScale);
        this.inputManager.isEnabled = shouldGateBootstrapRender ? false : true;

        if (this.mode === 'single' && this.botLevel > 0 && this.engine) {
            this.botManager = new BotManager(this.engine, this.playField, this.botLevel);
            this.botManager.start();
        }

    }

    protected networkUpdate(time: number): void {
        if (this.mode === 'multi' && this.useAuthoritativeServer) {
            void time;
            return;
        }
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

    protected onInput(direction: string, state: any): void {
        if (this.mode === 'multi' && this.useAuthoritativeServer && this.socket && this.isGameRunning && !this.isGameEnded) {
            if (this.isOneShotInput(direction) && state !== 'press') {
                super.onInput(direction, state);
                return;
            }
            this.inputSeq += 1;
            this.socket.emit('auth_input', {
                roomId: this.roomId,
                direction,
                state,
                seq: this.inputSeq,
            });
        }
        super.onInput(direction, state);
    }

    resize(gameSize, baseSize?, displaySize?, resolution?) {
        super.resize(gameSize, baseSize, displaySize, resolution);
        this.layoutDisconnectNotice();
    }
}

import { CONST, getBlockSize, InputDirection, InputState } from "../const/const";
import { MiniPlayField } from "../objects/miniPlayField";
import { BasePlayScene } from "./basePlayScene";
import { SnapshotManager } from "../net/snapshotManager";
import { SocketListenerRegistry } from "../net/socketListenerRegistry";
import {
    createGameLayout,
    calcNMultiPlayerPosition,
    calcNMultiSceneDimensions,
    calcPortraitPlayFieldPosition,
    calcNMultiOpponentArea,
    getLayoutMetrics,
} from "../ui/gameLayout";
import { applyRuntimeHudLayout } from "../ui/runtimeHudLayout";
import { preloadKenneyAssets } from "../ui/kenneyAssets";
import {
    type NMultiAuthSnapshotPayload,
    isNMultiAuthSnapshotPayload,
    isNMultiPlayerJoinedPayload,
    isNMultiPlayerLeftPayload,
    isNMultiReceiveGarbagePayload,
    isNMultiSnapshotPayload,
    toFiniteNumberOrNull,
} from "../../shared/types/socketPayloads";
import {
    applyAuthoritativeBootstrapSnapshot,
    bindDocumentVisibilityHandler,
    computeResyncMismatchState,
    isResyncTransitionPhase,
    shouldSkipResyncByAck,
    unbindDocumentVisibilityHandler,
} from './multiplayerSyncUtils';

export class NMultiPlayScene extends BasePlayScene {
    private playerId: string;
    private playerName: string;
    private miniFields: Map<string, MiniPlayField> = new Map();
    private opponentContainer: Phaser.GameObjects.Container;
    private snapshotManager: SnapshotManager;
    private visibilityHandler: (() => void) | null = null;
    private inputSeq: number = 0;
    private needsAuthoritativeResync: boolean = false;
    private localMismatchStreak: number = 0;
    private forceAuthoritativeResyncOnce: boolean = false;
    private authQueueSeed: number | null = null;
    private initialAuthSnapshot: NMultiAuthSnapshotPayload | null = null;
    private bootstrapRenderObjects: Array<{ setVisible: (visible: boolean) => unknown }> | null = null;
    private awaitingInitialAuthSnapshot: boolean = false;
    private opponentWallPanel: Phaser.GameObjects.Graphics | null = null;
    private opponentWallTitle: Phaser.GameObjects.Text | null = null;
    private opponentWallHint: Phaser.GameObjects.Text | null = null;
    private readonly socketListeners = new SocketListenerRegistry();

    private refreshSceneDimensions(): void {
        const dims = calcNMultiSceneDimensions(this.layoutMode);
        this.GAME_WIDTH = dims.width;
        this.GAME_HEIGHT = dims.height;
    }

    private resolvePlayerFieldPosition(): { x: number; y: number } {
        if (this.layoutMode === 'mobile-portrait') {
            return calcPortraitPlayFieldPosition(this.GAME_WIDTH);
        }
        return calcNMultiPlayerPosition(this.GAME_HEIGHT, this.GAME_WIDTH);
    }

    private relayoutRuntimeObjects(): void {
        if (!this.playField || !this.engine) {
            return;
        }

        const pos = this.resolvePlayerFieldPosition();
        applyRuntimeHudLayout({
            playField: this.playField,
            holdBox: this.engine.holdBoxInstance,
            queue: this.engine.queueInstance,
            levelIndicator: this.engine.levelIndicatorInstance,
            holdInputZone: this.holdInputZone,
        }, {
            layoutMode: this.layoutMode,
            fieldX: pos.x,
            fieldY: pos.y,
            mainScale: 1,
            sideScale: 1,
            compactShowRank: true,
        });
    }

    constructor() {
        super({ key: "NMultiPlayScene" });
    }

    init(data: any): void {
        this.handleResolution();

        const dims = calcNMultiSceneDimensions(this.layoutMode);
        this.GAME_WIDTH = dims.width;
        this.GAME_HEIGHT = dims.height;

        this.socket = data.socket;
        this.roomId = data.roomId;
        this.roomName = data.roomName;
        this.playerId = data.playerId;
        this.playerName = data.playerName;
        this.botLevel = data.botLevel || 0;
        this.authQueueSeed = toFiniteNumberOrNull(data.authSeed);
        this.initialAuthSnapshot = isNMultiAuthSnapshotPayload(data.authSnapshot) ? data.authSnapshot : null;

        this.snapshotManager = new SnapshotManager(this.playerId, data.initialPlayers ?? {});

        this.isPause = false;
        this.isGameRunning = false;
        this.isGameEnded = false;
        this.lastUpdateSend = 0;
        this.inputSeq = 0;
        this.needsAuthoritativeResync = false;
        this.localMismatchStreak = 0;
        this.forceAuthoritativeResyncOnce = false;
    }

    private applyInitialAuthoritativeBootstrap(): void {
        if (!this.initialAuthSnapshot || !this.engine) {
            return;
        }

        applyAuthoritativeBootstrapSnapshot(this.initialAuthSnapshot, {
            applySelfSync: (sync, stats) => {
                this.engine.applyAuthoritativeSync(sync, stats, {
                    showLockFeedback: false,
                });
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

    private applyInitialAuthoritativeSnapshotFromLiveTick(data: NMultiAuthSnapshotPayload): void {
        if (!this.awaitingInitialAuthSnapshot || !this.engine || !this.playField) {
            return;
        }

        if (data.self.sync) {
            this.engine.applyAuthoritativeSync(data.self.sync, {
                score: data.self.score,
                level: data.self.level,
                lines: data.self.lines,
                stats: data.self.stats,
                lockFeedback: data.self.lockFeedback,
            }, {
                showLockFeedback: false,
            });
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

        this.opponentWallPanel = this.add.graphics().setDepth(1100);
        this.opponentContainer = this.add.container(0, 0).setDepth(1110);
        this.opponentWallTitle = this.add.text(0, 0, 'TACTICAL WALL', {
            fontFamily: 'Connection, Pretendard, sans-serif',
            fontSize: '20px',
            color: '#f8fdff',
            fontStyle: 'bold',
        }).setOrigin(0.5, 0).setDepth(1120);
        this.opponentWallTitle.setStroke('#12376f', 4);
        this.opponentWallHint = this.add.text(0, 0, 'SAFE / WARM / HOT / OUT', {
            fontFamily: 'Pretendard, sans-serif',
            fontSize: '12px',
            color: '#c9ddff',
        }).setOrigin(0.5, 0).setDepth(1120);
        this.opponentWallHint.setStroke('#092145', 2);

        this.setupSocketEvents();
        this.bindVisibilitySync();

        for (const [id, p] of this.snapshotManager.getPlayers()) {
            this.addMiniField(id, p.name);
        }

        this.startGame();
        this.events.on('shutdown', this.shutdown, this);
    }

    private setupSocketEvents(): void {
        this.socketListeners.clear(this.socket);

        this.socketListeners.bind(this.socket, 'nmulti_snapshot', (data: unknown) => {
            if (!isNMultiSnapshotPayload(data)) return;

            const { needsFullSync } = this.snapshotManager.applySnapshot(data);
            if (needsFullSync) {
                console.warn('Network gap detected, requesting full sync...');
                this.socket.emit('nmulti_request_full_sync', { roomId: this.roomId });
            }

            for (const [id, p] of this.snapshotManager.getPlayers()) {
                let mini = this.miniFields.get(id);
                if (!mini) {
                    this.addMiniField(id, p.name);
                    mini = this.miniFields.get(id);
                }
                if (mini) mini.updateState(p.board, p.score, p.isAlive);
            }

            if (data.isDelta === false) {
                for (const [id, mini] of this.miniFields) {
                    if (!this.snapshotManager.hasPlayer(id)) {
                        mini.destroy();
                        this.miniFields.delete(id);
                    }
                }
            }

            this.updateRanks();
        });

        this.socketListeners.bind(this.socket, 'nmulti_auth_snapshot', (data: unknown) => {
            if (!isNMultiAuthSnapshotPayload(data)) return;
            this.applyInitialAuthoritativeSnapshotFromLiveTick(data);
            const maybeApplyAuthoritativeHud = (this.engine as unknown as { applyAuthoritativeHud?: (payload: {
                score: number;
                level: number;
                lines: number;
                stats?: unknown;
                lockFeedback?: unknown;
            }) => void })?.applyAuthoritativeHud;
            if (maybeApplyAuthoritativeHud) {
                maybeApplyAuthoritativeHud.call(this.engine, {
                    score: data.self.score,
                    level: data.self.level,
                    lines: data.self.lines,
                    stats: data.self.stats,
                    lockFeedback: data.self.lockFeedback,
                });
            }
            this.maybeResyncLocalStateFromSnapshot(data);

            if (this.isGameRunning && data.self.isAlive === false && !this.isGameEnded) {
                const score = this.engine ? this.engine.getScore() : data.self.score;
                this.showEndGameMessage('GAME OVER', '#ff0000', score);
            }
        });

        this.socketListeners.bind(this.socket, 'nmulti_restarted', (data: unknown) => {
            if (!data || typeof data !== 'object') {
                return;
            }
            const payload = data as Record<string, unknown>;
            if (typeof payload.roomId !== 'string' || payload.roomId !== this.roomId) {
                return;
            }
            const restartSnapshot = isNMultiAuthSnapshotPayload(payload.authSnapshot)
                ? payload.authSnapshot
                : null;
            const restartSeed = toFiniteNumberOrNull(payload.authSeed);

            this.scene.restart({
                socket: this.socket,
                roomId: this.roomId,
                roomName: this.roomName,
                playerId: this.playerId,
                playerName: this.playerName,
                initialPlayers: this.snapshotManager.getAllPlayers(),
                botLevel: this.botLevel,
                authSeed: restartSeed,
                authSnapshot: restartSnapshot,
            });
        });

        this.socketListeners.bind(this.socket, 'nmulti_player_joined', (data: unknown) => {
            if (!isNMultiPlayerJoinedPayload(data)) return;
            if (!this.miniFields.has(data.playerId)) {
                this.addMiniField(data.playerId, data.playerName);
                this.relayoutOpponents();
            }
        });

        this.socketListeners.bind(this.socket, 'nmulti_player_left', (data: unknown) => {
            if (!isNMultiPlayerLeftPayload(data)) return;
            const mini = this.miniFields.get(data.playerId);
            if (mini) {
                mini.destroy();
                this.miniFields.delete(data.playerId);
                this.snapshotManager.removePlayer(data.playerId);
                this.relayoutOpponents();
                this.updateRanks();
            }
        });

        this.socketListeners.bind(this.socket, 'nmulti_receive_garbage', (data: unknown) => {
            if (!isNMultiReceiveGarbagePayload(data)) return;
            if (this.playField && this.isGameRunning && !this.isGameEnded) {
                this.playField.insertGarbage(data.count);
                this.cameras.main.shake(200, 0.01);
            }
        });
    }

    private maybeResyncLocalStateFromSnapshot(data: NMultiAuthSnapshotPayload): void {
        if (!this.playField || !this.engine || !this.isGameRunning || this.isGameEnded) {
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
            mismatchThreshold: 4,
        });
        this.localMismatchStreak = mismatch.mismatchStreak;
        this.needsAuthoritativeResync = mismatch.needsAuthoritativeResync;

        const shouldApplyForcedResync = this.forceAuthoritativeResyncOnce && this.needsAuthoritativeResync;

        if (this.localMismatchStreak === 0 && !shouldApplyForcedResync) {
            return;
        }

        if (!this.needsAuthoritativeResync || !data.self.sync) {
            return;
        }

        this.engine.applyAuthoritativeSync(data.self.sync, {
            score: data.self.score,
            level: data.self.level,
            lines: data.self.lines,
            stats: data.self.stats,
            lockFeedback: data.self.lockFeedback,
        }, {
            showLockFeedback: false,
        });
        this.localMismatchStreak = 0;
        this.needsAuthoritativeResync = false;
        this.forceAuthoritativeResyncOnce = false;
    }

    private emitPresence(state: 'active' | 'inactive'): void {
        if (!this.socket || !this.roomId) return;
        this.socket.emit('nmulti_presence', {
            roomId: this.roomId,
            state,
        });
    }

    private bindVisibilitySync(): void {
        if (typeof document === 'undefined' || this.visibilityHandler) {
            return;
        }

        this.visibilityHandler = bindDocumentVisibilityHandler(this.visibilityHandler, () => {
            const hidden = document.visibilityState === 'hidden';
            if (hidden) {
                this.emitPresence('inactive');
                this.needsAuthoritativeResync = true;
                this.localMismatchStreak = 0;
                this.forceAuthoritativeResyncOnce = false;
                if (this.inputManager) this.inputManager.isEnabled = false;
                return;
            }

            this.emitPresence('active');
            if (this.isGameRunning && !this.isGameEnded && this.inputManager) {
                this.inputManager.isEnabled = !this.inGameMenu.isMenuOpen;
            }
            if (this.socket) {
                this.forceAuthoritativeResyncOnce = this.needsAuthoritativeResync;
                this.socket.emit('nmulti_request_full_sync', { roomId: this.roomId });
            }
        });
    }

    private unbindVisibilitySync(): void {
        this.visibilityHandler = unbindDocumentVisibilityHandler(this.visibilityHandler);
    }

    private addMiniField(id: string, name: string): void {
        const mini = new MiniPlayField(this, id, name);
        this.miniFields.set(id, mini);
        this.opponentContainer.add(mini.getContainer());
        this.relayoutOpponents();
    }

    private relayoutOpponents(): void {
        const metrics = getLayoutMetrics();
        const blockSize = getBlockSize();
        const isPortrait = this.layoutMode === 'mobile-portrait';
        const opponentArea = calcNMultiOpponentArea(this.layoutMode, this.GAME_WIDTH, this.GAME_HEIGHT);
        const titleHeight = blockSize * (
            isPortrait
                ? metrics.nMultiWallTitleHeightPortraitBlocks
                : metrics.nMultiWallTitleHeightDesktopBlocks
        );
        const panelRadius = blockSize * (
            isPortrait
                ? metrics.nMultiWallPanelRadiusPortraitBlocks
                : metrics.nMultiWallPanelRadiusDesktopBlocks
        );
        const panelPadding = blockSize * (
            isPortrait
                ? metrics.nMultiWallPanelPaddingPortraitBlocks
                : metrics.nMultiWallPanelPaddingDesktopBlocks
        );

        if (this.opponentWallPanel) {
            this.opponentWallPanel.clear();
            this.opponentWallPanel.fillStyle(0x07152f, 0.64);
            this.opponentWallPanel.fillRoundedRect(opponentArea.x, opponentArea.y, opponentArea.width, opponentArea.height, panelRadius);
            this.opponentWallPanel.lineStyle(2, 0x7cb6ff, 0.85);
            this.opponentWallPanel.strokeRoundedRect(opponentArea.x, opponentArea.y, opponentArea.width, opponentArea.height, panelRadius);
            this.opponentWallPanel.fillStyle(0x0f274d, 0.82);
            this.opponentWallPanel.fillRoundedRect(
                opponentArea.x + panelPadding,
                opponentArea.y + panelPadding,
                opponentArea.width - panelPadding * 2,
                titleHeight,
                Math.max(4, panelRadius - 3),
            );
        }

        if (this.opponentWallTitle) {
            this.opponentWallTitle.setPosition(
                opponentArea.x + opponentArea.width / 2,
                opponentArea.y + panelPadding + blockSize * metrics.nMultiWallTitleYOffsetBlocks,
            );
            this.opponentWallTitle.setFontSize(this.layoutMode === 'mobile-portrait' ? 13 : 18);
        }
        if (this.opponentWallHint) {
            this.opponentWallHint.setPosition(
                opponentArea.x + opponentArea.width / 2,
                opponentArea.y + panelPadding + titleHeight - blockSize * metrics.nMultiWallHintYOffsetBlocks,
            );
            this.opponentWallHint.setFontSize(this.layoutMode === 'mobile-portrait' ? 9 : 11);
        }

        const contentX = opponentArea.x + panelPadding;
        const contentY = opponentArea.y + panelPadding + titleHeight + panelPadding;
        const contentWidth = opponentArea.width - panelPadding * 2;
        const contentHeight = opponentArea.height - titleHeight - panelPadding * 3;

        const count = this.miniFields.size;
        if (count === 0) return;

        const TOTAL_ROWS = 24;

        let bestCols = 1;
        let bestCellSize = 1;

        for (let cols = 1; cols <= count; cols++) {
            const rows = Math.ceil(count / cols);
            const cellWidth = contentWidth / cols;
            const cellHeight = contentHeight / rows;
            const cellSizeFromWidth = (
                cellWidth - blockSize * metrics.nMultiWallMiniCellWidthInsetBlocks
            ) / CONST.PLAY_FIELD.COL_COUNT;
            const cellSizeFromHeight = (
                cellHeight - blockSize * metrics.nMultiWallMiniCellHeightInsetBlocks
            ) / TOTAL_ROWS;
            const cellSize = Math.min(cellSizeFromWidth, cellSizeFromHeight);
            if (cellSize > bestCellSize) {
                bestCellSize = cellSize;
                bestCols = cols;
            }
        }

        const bestRows = Math.ceil(count / bestCols);
        const cellWidth = contentWidth / bestCols;
        const cellHeight = contentHeight / bestRows;
        const cellSize = Math.max(1, bestCellSize);
        const nameHeight = Math.max(8, Math.min(Math.floor(cellSize * 2), 18)) + 4;

        let idx = 0;
        for (const [, mini] of this.miniFields) {
            const col = idx % bestCols;
            const row = Math.floor(idx / bestCols);
            mini.setPosition(
                contentX + col * cellWidth + blockSize * metrics.nMultiWallMiniCellOffsetXBlocks,
                contentY + row * cellHeight + nameHeight,
            );
            mini.resize(cellSize);
            idx++;
        }
    }

    private updateRanks(): void {
        const entries: { playerId: string; score: number }[] = [];

        if (this.engine) {
            entries.push({ playerId: this.playerId, score: this.engine.getStats().score });
        }

        for (const [id, p] of this.snapshotManager.getPlayers()) {
            entries.push({ playerId: id, score: p.score || 0 });
        }

        entries.sort((a, b) => b.score - a.score);

        const rankMap = new Map<string, number>();
        entries.forEach((e, i) => {
            rankMap.set(e.playerId, i + 1);
        });

        if (this.engine) {
            this.engine.setRank(rankMap.get(this.playerId) ?? null);
        }

        for (const [id, mini] of this.miniFields) {
            const rank = rankMap.get(id);
            if (rank !== undefined) mini.updateRank(rank);
        }
    }

    private shutdown(): void {
        this.unbindVisibilitySync();
        this.socketListeners.clear(this.socket);
        for (const [, mini] of this.miniFields) {
            mini.destroy();
        }
        this.miniFields.clear();
        if (this.opponentWallPanel) {
            this.opponentWallPanel.destroy();
            this.opponentWallPanel = null;
        }
        if (this.opponentWallTitle) {
            this.opponentWallTitle.destroy();
            this.opponentWallTitle = null;
        }
        if (this.opponentWallHint) {
            this.opponentWallHint.destroy();
            this.opponentWallHint = null;
        }
        this.shutdownBase();
    }

    protected exitGame(): void {
        this.time.paused = false;
        if (this.socket) this.socket.emit('nmulti_leave_room', { roomId: this.roomId });
        history.replaceState(null, '', '/');
        this.scene.start("NMultiLobbyScene");
    }

    protected restartGame(): void {
        if (this.socket) this.socket.emit('nmulti_restart', { roomId: this.roomId });
        this.inGameMenu.resetState();
        this.isGameEnded = false;
        this.isGameRunning = false;
        this.statusText.setText('Restarting...').setVisible(true);
        this.inputManager.isEnabled = false;
        if (this.playField) this.playField.stop();
        if (this.botManager) this.botManager.stop();
    }

    protected showEndGameMessage(mainText: string, color: string, score?: number): void {
        if (this.socket) this.socket.emit('nmulti_game_over', { roomId: this.roomId });
        super.showEndGameMessage(mainText, color, score);
    }

    protected startGame(): void {
        this.isGameRunning = true;
        this.inputManager.isEnabled = false;

        const pos = this.resolvePlayerFieldPosition();

        const layout = createGameLayout({
            scene: this,
            fieldX: pos.x,
            fieldY: pos.y,
            onHoldInput: (dir, state) => this.onInput(dir, state),
            isInputBlocked: () => !this.isGameRunning || this.isPause || this.inGameMenu.isMenuOpen || this.isGameEnded,
            layoutMode: this.layoutMode,
            compactShowRank: true,
        });

        this.playField = layout.playField;
        this.engine = layout.engine;
        this.holdInputZone = layout.holdInputZone;
        this.bindKenneyImpactEvents();
        const maybeSetAuthoritativeHudMode = (this.engine as unknown as {
            setAuthoritativeHudMode?: (enabled: boolean) => void;
        })?.setAuthoritativeHudMode;
        if (maybeSetAuthoritativeHudMode) {
            maybeSetAuthoritativeHudMode.call(this.engine, true);
        }
        this.engine.setPlayerName(this.playerName);

        const localRenderObjects: Array<{ setVisible: (visible: boolean) => unknown }> = [
            layout.playField.container,
            layout.holdBox.container,
            layout.levelIndicator.container,
            layout.tetrominoQueue.container,
        ];
        this.bootstrapRenderObjects = localRenderObjects;
        this.awaitingInitialAuthSnapshot = true;
        localRenderObjects.forEach((obj) => {
            obj.setVisible(false);
        });

        if (this.authQueueSeed !== null) {
            this.engine.queueInstance.setSeed(this.authQueueSeed);
        }

        this.engine.setAttackHandler(() => {
            // Server-authoritative mode: attacks are computed on server simulation only.
        });

        this.playField.on('gameOver', () => {
            const score = this.engine ? this.engine.getScore() : 0;
            this.showEndGameMessage('GAME OVER', '#ff0000', score);
        });

        this.engine.start();
        this.applyInitialAuthoritativeBootstrap();
        this.inputManager.setDragThresholdScale(1);
        this.inputManager.isEnabled = false;

        this.relayoutRuntimeObjects();
        this.relayoutOpponents();
        this.updateRanks();
    }

    protected networkUpdate(time: number): void {
        void time;
    }

    private pickRandomAliveOpponentId(): string | null {
        const alive: string[] = [];
        for (const [id, p] of this.snapshotManager.getPlayers()) {
            if (p.isAlive !== false) alive.push(id);
        }
        if (alive.length === 0) return null;
        return alive[Math.floor(Math.random() * alive.length)];
    }

    protected onInput(direction: InputDirection, state: InputState): void {
        if (this.socket && this.isGameRunning && !this.isGameEnded) {
            const isOneShot = this.isOneShotInput(direction);
            if (!isOneShot || state === InputState.PRESS) {
                this.inputSeq += 1;
                this.socket.emit('nmulti_auth_input', {
                    roomId: this.roomId,
                    direction,
                    state,
                    seq: this.inputSeq,
                });
            }
        }
        super.onInput(direction, state);
    }

    resize(gameSize, baseSize?, displaySize?, resolution?) {
        this.handleResolution();
        this.refreshSceneDimensions();
        super.resize(gameSize, baseSize, displaySize, resolution);
        this.relayoutRuntimeObjects();
        this.relayoutOpponents();
    }

}

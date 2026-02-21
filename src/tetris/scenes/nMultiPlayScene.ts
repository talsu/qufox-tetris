import { CONST } from "../const/const";
import { MiniPlayField } from "../objects/miniPlayField";
import { BotManager } from "../logic/botManager";
import { BasePlayScene } from "./basePlayScene";
import { SnapshotManager } from "../net/snapshotManager";
import {
    createGameLayout,
    calcNMultiPlayerPosition,
    calcNMultiSceneDimensions,
    calcPortraitPlayFieldPosition,
    calcNMultiOpponentArea,
} from "../ui/gameLayout";

export class NMultiPlayScene extends BasePlayScene {
    private playerId: string;
    private playerName: string;
    private miniFields: Map<string, MiniPlayField> = new Map();
    private opponentContainer: Phaser.GameObjects.Container;
    private snapshotManager: SnapshotManager;

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

        this.snapshotManager = new SnapshotManager(this.playerId, data.initialPlayers ?? {});

        this.isPause = false;
        this.isGameRunning = false;
        this.isGameEnded = false;
        this.lastUpdateSend = 0;
    }

    preload(): void {}

    create(): void {
        this.createBaseUI({
            onResume: () => this.toggleMenu(),
            onExit: () => this.exitGame(),
            onRestart: () => this.restartGame(),
            onToggleBackground: (btn) => this.toggleBackground(btn),
        });

        this.opponentContainer = this.add.container(0, 0);

        this.setupSocketEvents();

        for (const [id, p] of this.snapshotManager.getPlayers()) {
            this.addMiniField(id, p.name);
        }

        this.startGame();
        this.events.on('shutdown', this.shutdown, this);
    }

    private setupSocketEvents(): void {
        this.socket.on('nmulti_snapshot', (data: any) => {
            if (!data?.players) return;

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

        this.socket.on('nmulti_player_joined', (data: any) => {
            if (!this.miniFields.has(data.playerId)) {
                this.addMiniField(data.playerId, data.playerName);
                this.relayoutOpponents();
            }
        });

        this.socket.on('nmulti_player_left', (data: any) => {
            const mini = this.miniFields.get(data.playerId);
            if (mini) {
                mini.destroy();
                this.miniFields.delete(data.playerId);
                this.snapshotManager.removePlayer(data.playerId);
                this.relayoutOpponents();
                this.updateRanks();
            }
        });

        this.socket.on('nmulti_receive_garbage', (data: any) => {
            if (this.playField && this.isGameRunning && !this.isGameEnded) {
                this.playField.insertGarbage(data.count);
                this.cameras.main.shake(200, 0.01);
            }
        });
    }

    private addMiniField(id: string, name: string): void {
        const mini = new MiniPlayField(this, id, name);
        this.miniFields.set(id, mini);
        this.opponentContainer.add(mini.getContainer());
        this.relayoutOpponents();
    }

    private relayoutOpponents(): void {
        const count = this.miniFields.size;
        if (count === 0) return;

        const opponentArea = calcNMultiOpponentArea(this.layoutMode, this.GAME_WIDTH, this.GAME_HEIGHT);
        const TOTAL_ROWS = 24;

        let bestCols = 1;
        let bestCellSize = 1;

        for (let cols = 1; cols <= count; cols++) {
            const rows = Math.ceil(count / cols);
            const cellWidth = opponentArea.width / cols;
            const cellHeight = opponentArea.height / rows;
            const cellSizeFromWidth = (cellWidth - 4) / CONST.PLAY_FIELD.COL_COUNT;
            const cellSizeFromHeight = (cellHeight - 8) / TOTAL_ROWS;
            const cellSize = Math.min(cellSizeFromWidth, cellSizeFromHeight);
            if (cellSize > bestCellSize) {
                bestCellSize = cellSize;
                bestCols = cols;
            }
        }

        const bestRows = Math.ceil(count / bestCols);
        const cellWidth = opponentArea.width / bestCols;
        const cellHeight = opponentArea.height / bestRows;
        const cellSize = Math.max(1, bestCellSize);
        const nameHeight = Math.max(8, Math.min(Math.floor(cellSize * 2), 18)) + 4;

        let idx = 0;
        for (const [, mini] of this.miniFields) {
            const col = idx % bestCols;
            const row = Math.floor(idx / bestCols);
            mini.setPosition(opponentArea.x + col * cellWidth + 2, opponentArea.y + row * cellHeight + nameHeight);
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
        entries.forEach((e, i) => rankMap.set(e.playerId, i + 1));

        if (this.engine) {
            this.engine.setRank(rankMap.get(this.playerId) ?? null);
        }

        for (const [id, mini] of this.miniFields) {
            const rank = rankMap.get(id);
            if (rank !== undefined) mini.updateRank(rank);
        }
    }

    private shutdown(): void {
        if (this.socket) {
            this.socket.off('nmulti_snapshot');
            this.socket.off('nmulti_player_joined');
            this.socket.off('nmulti_player_left');
            this.socket.off('nmulti_receive_garbage');
        }
        for (const [, mini] of this.miniFields) {
            mini.destroy();
        }
        this.miniFields.clear();
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
        if (this.playField) this.playField.stop();
        this.scene.restart({
            socket: this.socket,
            roomId: this.roomId,
            roomName: this.roomName,
            playerId: this.playerId,
            playerName: this.playerName,
            initialPlayers: this.snapshotManager.getAllPlayers(),
            botLevel: this.botLevel,
        });
    }

    protected showEndGameMessage(mainText: string, color: string, score?: number): void {
        if (this.socket) this.socket.emit('nmulti_game_over', { roomId: this.roomId });
        super.showEndGameMessage(mainText, color, score);
    }

    protected startGame(): void {
        this.isGameRunning = true;
        this.inputManager.isEnabled = true;

        const isPortrait = this.layoutMode === 'mobile-portrait';
        const pos = isPortrait
            ? calcPortraitPlayFieldPosition(this.GAME_WIDTH)
            : calcNMultiPlayerPosition(this.GAME_HEIGHT);

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
        this.engine.setPlayerName(this.playerName);

        this.engine.setAttackHandler((count) => {
            if (!this.socket) return;
            const targetId = this.pickRandomAliveOpponentId();
            if (!targetId) return;
            this.socket.emit('nmulti_send_garbage', { roomId: this.roomId, targetId, count });
        });

        this.playField.on('gameOver', () => {
            const score = this.engine ? this.engine.getScore() : 0;
            this.showEndGameMessage('GAME OVER', '#ff0000', score);
        });

        this.engine.start();
        this.inputManager.setDragThresholdScale(1);

        if (this.botLevel > 0) {
            this.botManager = new BotManager(this.engine, this.playField, this.botLevel);
            this.botManager.start();
        }

        this.relayoutOpponents();
        this.updateRanks();
    }

    protected networkUpdate(time: number): void {
        if (time - this.lastUpdateSend > 200) {
            this.lastUpdateSend = time;
            if (this.playField && this.socket) {
                const stats = this.engine.getStats();
                this.socket.emit('nmulti_update_state', {
                    roomId: this.roomId,
                    score: stats.score,
                    level: stats.level,
                    lines: stats.lines,
                    board: this.playField.serializeEncoded(),
                });
            }
        }
    }

    private pickRandomAliveOpponentId(): string | null {
        const alive: string[] = [];
        for (const [id, p] of this.snapshotManager.getPlayers()) {
            if (p.isAlive !== false) alive.push(id);
        }
        if (alive.length === 0) return null;
        return alive[Math.floor(Math.random() * alive.length)];
    }
}

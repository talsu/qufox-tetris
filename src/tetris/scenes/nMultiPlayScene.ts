import { PlayField } from '../objects/playField';
import { CONST, InputState } from "../const/const";
import { Engine } from '../engine';
import { Socket } from "socket.io-client";
import { InputManager } from "../input/inputManager";
import { InGameMenu } from "../ui/inGameMenu";
import { BaseScene } from "./baseScene";
import { MiniPlayField } from "../objects/miniPlayField";
import { BotManager } from "../logic/botManager";
import { GAME_FONT_FAMILY } from "../ui/uiStyles";
import { GameOverlayControls } from "../ui/gameOverlayControls";
import {
    createGameLayout,
    calcNMultiPlayerPosition,
    calcNMultiSceneDimensions,
    calcPortraitPosition,
    calcNMultiOpponentArea,
} from "../ui/gameLayout";

export class NMultiPlayScene extends BaseScene {
    private playField: PlayField;
    private engine: Engine;
    private inputManager: InputManager;
    private inGameMenu: InGameMenu;

    private isPause: boolean = false;
    private socket: Socket;
    private roomId: string;
    private roomName: string;
    private playerId: string;
    private playerName: string;
    private statusText: Phaser.GameObjects.Text;
    private lastUpdateSend: number = 0;
    private isGameRunning: boolean = false;
    private isGameEnded: boolean = false;
    private botLevel: number = 0;
    private botManager: BotManager;
    private overlayControls: GameOverlayControls;

    // Opponents
    private miniFields: Map<string, MiniPlayField> = new Map();
    private opponentContainer: Phaser.GameObjects.Container;

    // Snapshot data for rank computation
    private snapshotPlayers: Record<string, any> = {};

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

        // Initialize opponent data from initial players (exclude self)
        this.snapshotPlayers = {};
        if (data.initialPlayers) {
            for (const [id, p] of Object.entries(data.initialPlayers) as [string, any][]) {
                if (id !== this.playerId) {
                    this.snapshotPlayers[id] = p;
                }
            }
        }

        this.isPause = false;
        this.isGameRunning = false;
        this.isGameEnded = false;
        this.lastUpdateSend = 0;
    }

    preload(): void { }

    create(): void {
        this.createBackground();

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
        });

        this.opponentContainer = this.add.container(0, 0);

        this.setupSocketEvents();

        // Create initial mini fields for opponents already in room
        for (const [id, p] of Object.entries(this.snapshotPlayers)) {
            this.addMiniField(id, (p as any).name);
        }

        this.startGame();
        this.events.on('shutdown', this.shutdown, this);
    }

    private setupSocketEvents() {
        this.socket.on('nmulti_snapshot', (data: any) => {
            if (!data || !data.players) return;
            
            const isDelta = data.isDelta !== false;
            let hasGap = false;

            // Merge delta or replace full state
            if (!isDelta) {
                this.snapshotPlayers = data.players;
            } else {
                for (const [id, p] of Object.entries(data.players) as [string, any][]) {
                    if (id === this.playerId) continue; // Ignore self

                    const localPlayer = this.snapshotPlayers[id];
                    if (localPlayer) {
                        // Check for version gap
                        if (p.v > (localPlayer.v || 0) + 1) {
                            hasGap = true;
                        }
                        // Merge attributes
                        Object.assign(localPlayer, p);
                    } else {
                        // New player in delta
                        this.snapshotPlayers[id] = p;
                    }
                }
            }

            // If gap detected, request full sync
            if (hasGap) {
                console.warn('Network gap detected, requesting full sync...');
                this.socket.emit('nmulti_request_full_sync', { roomId: this.roomId });
            }

            // Update mini fields
            for (const [id, p] of Object.entries(this.snapshotPlayers) as [string, any][]) {
                if (id === this.playerId) continue;

                let mini = this.miniFields.get(id);
                if (!mini) {
                    this.addMiniField(id, p.name);
                    mini = this.miniFields.get(id);
                }
                if (mini) {
                    mini.updateState(p.board, p.score, p.isAlive);
                }
            }

            // Remove mini fields for players no longer in room (only relevant in full sync or via left event)
            if (!isDelta) {
                for (const [id, mini] of this.miniFields) {
                    if (!this.snapshotPlayers[id]) {
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
                delete this.snapshotPlayers[data.playerId];
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

    private addMiniField(id: string, name: string) {
        const mini = new MiniPlayField(this, id, name);
        this.miniFields.set(id, mini);
        this.opponentContainer.add(mini.getContainer());
        this.relayoutOpponents();
    }

    private relayoutOpponents() {
        const count = this.miniFields.size;
        if (count === 0) return;

        const opponentArea = calcNMultiOpponentArea(this.layoutMode, this.GAME_WIDTH, this.GAME_HEIGHT);
        // Height factor: 20 field rows + 2 name + 2 info = 24 cell-size units
        const TOTAL_ROWS = 24;

        // Find optimal grid layout (maximize mini field size)
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

        // Name height matches the capped font size in MiniPlayField.resize()
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

    private updateRanks() {
        const entries: { playerId: string; score: number }[] = [];

        // Add self
        if (this.engine) {
            const stats = this.engine.getStats();
            entries.push({ playerId: this.playerId, score: stats.score });
        }

        // Add opponents from snapshot
        for (const [id, p] of Object.entries(this.snapshotPlayers) as [string, any][]) {
            entries.push({ playerId: id, score: p.score || 0 });
        }

        // Sort by score descending
        entries.sort((a, b) => b.score - a.score);

        // Build rank map
        const rankMap = new Map<string, number>();
        entries.forEach((e, i) => rankMap.set(e.playerId, i + 1));

        // Update mini fields with their rank
        for (const [id, mini] of this.miniFields) {
            const rank = rankMap.get(id);
            if (rank !== undefined) {
                mini.updateRank(rank);
            }
        }
    }

    private shutdown() {
        this.scale.off('resize', this.resize, this);
        if (this.botManager) {
            this.botManager.stop();
        }
        if (this.socket) {
            this.socket.off('nmulti_snapshot');
            this.socket.off('nmulti_player_joined');
            this.socket.off('nmulti_player_left');
            this.socket.off('nmulti_receive_garbage');
        }
        if (this.inGameMenu) {
            this.inGameMenu.destroy();
        }
        if (this.overlayControls) {
            this.overlayControls.destroy();
        }
        for (const [, mini] of this.miniFields) {
            mini.destroy();
        }
        this.miniFields.clear();
    }

    private toggleMenu() {
        this.inGameMenu.togglePauseMenu();
    }

    private toggleBackground(btn: HTMLElement) {
        const isVisible = this.backgroundGraphics.visible;
        this.backgroundGraphics.setVisible(!isVisible);
        btn.innerText = `Background: ${!isVisible ? 'ON' : 'OFF'}`;
    }

    private exitGame() {
        this.time.paused = false;
        if (this.socket) {
            this.socket.emit('nmulti_leave_room', { roomId: this.roomId });
        }
        history.replaceState(null, '', '/');
        this.scene.start("NMultiLobbyScene");
    }

    private restartGame() {
        if (this.socket) {
            this.socket.emit('nmulti_restart', { roomId: this.roomId });
        }
        this.inGameMenu.hideMenu();
        this.inGameMenu.isMenuOpen = false;
        this.inGameMenu.isGameEnded = false;
        this.isGameEnded = false;

        if (this.playField) {
            this.playField.stop();
        }

        this.scene.restart({
            socket: this.socket,
            roomId: this.roomId,
            roomName: this.roomName,
            playerId: this.playerId,
            playerName: this.playerName,
            initialPlayers: this.snapshotPlayers,
            botLevel: this.botLevel
        });
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
        if (this.socket) {
            this.socket.emit('nmulti_game_over', { roomId: this.roomId });
        }
        this.inGameMenu.showEndGame(mainText, color, score);
    }

    private startGame() {
        this.isGameRunning = true;
        this.inputManager.isEnabled = true;

        const isPortrait = this.layoutMode === 'mobile-portrait';
        const pos = isPortrait
            ? calcPortraitPosition(this.GAME_WIDTH)
            : calcNMultiPlayerPosition(this.GAME_HEIGHT);

        const layout = createGameLayout({
            scene: this,
            fieldX: pos.x,
            fieldY: pos.y,
            onHoldInput: (dir, state) => this.onInput(dir, state),
            isInputBlocked: () => !this.isGameRunning || this.isPause || this.inGameMenu.isMenuOpen || this.isGameEnded,
            layoutMode: this.layoutMode,
        });

        this.playField = layout.playField;
        this.engine = layout.engine;

        // Send garbage to a random alive opponent
        this.engine.setAttackHandler((count) => {
            if (!this.socket) return;
            const aliveOpponents: string[] = [];
            for (const [id, p] of Object.entries(this.snapshotPlayers) as [string, any][]) {
                if (p.isAlive !== false) {
                    aliveOpponents.push(id);
                }
            }
            if (aliveOpponents.length === 0) return;
            const targetId = aliveOpponents[Math.floor(Math.random() * aliveOpponents.length)];
            this.socket.emit('nmulti_send_garbage', {
                roomId: this.roomId,
                targetId,
                count
            });
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
    }

    resize(gameSize, baseSize?, displaySize?, resolution?) {
        super.resize(gameSize, baseSize, displaySize, resolution);
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

        // Send state at 5Hz (200ms)
        if (time - this.lastUpdateSend > 200) {
            this.lastUpdateSend = time;
            if (this.playField && this.socket) {
                const stats = this.engine.getStats();
                const board = this.playField.serializeEncoded();
                this.socket.emit('nmulti_update_state', {
                    roomId: this.roomId,
                    score: stats.score,
                    level: stats.level,
                    lines: stats.lines,
                    board: board
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

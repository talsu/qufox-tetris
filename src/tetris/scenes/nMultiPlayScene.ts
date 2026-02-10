import { PlayField } from '../objects/playField';
import { CONST, getBlockSize, InputState } from "../const/const";
import { TetrominoBox } from "../objects/tetrominoBox";
import { TetrominoBoxQueue } from "../objects/tetrominoBoxQueue";
import { LevelIndicator } from '../objects/levelIndicator';
import { Engine } from '../engine';
import { Socket } from "socket.io-client";
import { InputManager } from "../input/inputManager";
import { InGameMenu } from "../ui/inGameMenu";
import { BaseScene } from "./baseScene";
import { MiniPlayField } from "../objects/miniPlayField";
import { LeaderboardPanel, LeaderboardEntry } from "../ui/leaderboardPanel";
import { BoardCodec } from "../net/boardCodec";

const BLOCK_SIZE = getBlockSize();

export class NMultiPlayScene extends BaseScene {
    private playField: PlayField;
    private engine: Engine;
    private inputManager: InputManager;
    private inGameMenu: InGameMenu;

    private isPause: boolean = false;
    private socket: Socket;
    private roomId: string;
    private playerId: string;
    private playerName: string;
    private statusText: Phaser.GameObjects.Text;
    private lastUpdateSend: number = 0;
    private isGameRunning: boolean = false;
    private isGameEnded: boolean = false;

    private holdBox: TetrominoBox;

    // Opponents
    private miniFields: Map<string, MiniPlayField> = new Map();
    private opponentContainer: Phaser.GameObjects.Container;
    private leaderboard: LeaderboardPanel;

    // Snapshot data for leaderboard
    private snapshotPlayers: Record<string, any> = {};

    constructor() {
        super({ key: "NMultiPlayScene" });
    }

    init(data: any): void {
        this.handleResolution();

        this.GAME_WIDTH = BLOCK_SIZE * 36;
        this.GAME_HEIGHT = BLOCK_SIZE * 22;

        this.socket = data.socket;
        this.roomId = data.roomId;
        this.playerId = data.playerId;
        this.playerName = data.playerName;

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

    preload(): void {
    }

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
            fontSize: '32px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        this.inputManager = new InputManager(this, (direction, state) => this.onInput(direction, state));

        this.inGameMenu = new InGameMenu(this, this.GAME_WIDTH, this.GAME_HEIGHT, {
            onResume: () => this.toggleMenu(),
            onExit: () => this.exitGame(),
            onRestart: () => this.restartGame(),
            onToggleBackground: (btn) => this.toggleBackground(btn)
        });

        // Create opponent container
        this.opponentContainer = this.add.container(0, 0);

        // Create leaderboard
        this.leaderboard = new LeaderboardPanel(this.playerId);

        // Setup socket events
        this.setupSocketEvents();

        // Create initial mini fields for opponents already in room
        for (const [id, p] of Object.entries(this.snapshotPlayers)) {
            this.addMiniField(id, (p as any).name);
        }

        // Start game immediately
        this.startGame();

        this.events.on('shutdown', this.shutdown, this);
    }

    setupSocketEvents() {
        this.socket.on('nmulti_snapshot', (data: any) => {
            if (!data || !data.players) return;
            this.snapshotPlayers = data.players;

            // Update mini fields
            for (const [id, p] of Object.entries(data.players) as [string, any][]) {
                let mini = this.miniFields.get(id);
                if (!mini) {
                    this.addMiniField(id, p.name);
                    mini = this.miniFields.get(id);
                }
                if (mini) {
                    mini.updateState(p.board, p.score, p.isAlive);
                }
            }

            // Remove mini fields for players no longer in snapshot
            for (const [id, mini] of this.miniFields) {
                if (!data.players[id]) {
                    mini.destroy();
                    this.miniFields.delete(id);
                }
            }

            // Update leaderboard
            this.updateLeaderboard();
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
                this.updateLeaderboard();
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

        // Opponent area: right portion after the player area (starts at block 23.5)
        const areaX = BLOCK_SIZE * 23.5;
        const areaY = BLOCK_SIZE * 1;
        const areaWidth = this.GAME_WIDTH - areaX - BLOCK_SIZE * 0.5;
        const areaHeight = this.GAME_HEIGHT - BLOCK_SIZE * 2;

        const textHeight = 24; // name + score text height

        // Find optimal grid layout
        let bestCols = 1;
        let bestFieldWidth = 0;

        for (let cols = 1; cols <= count; cols++) {
            const rows = Math.ceil(count / cols);
            const cellWidth = areaWidth / cols;
            const cellHeight = areaHeight / rows;
            // Each mini field is 1:2 ratio (10 cols x 20 rows)
            const fieldWidthFromWidth = cellWidth - 4; // gap
            const fieldWidthFromHeight = (cellHeight - textHeight - 4) * 0.5;
            const fieldWidth = Math.min(fieldWidthFromWidth, fieldWidthFromHeight);
            if (fieldWidth > bestFieldWidth) {
                bestFieldWidth = fieldWidth;
                bestCols = cols;
            }
        }

        const bestRows = Math.ceil(count / bestCols);
        const cellWidth = areaWidth / bestCols;
        const cellHeight = areaHeight / bestRows;
        const cellSize = Math.max(1, bestFieldWidth / 10);

        let idx = 0;
        for (const [, mini] of this.miniFields) {
            const col = idx % bestCols;
            const row = Math.floor(idx / bestCols);
            const x = areaX + col * cellWidth + 2;
            const y = areaY + row * cellHeight + textHeight;
            mini.setPosition(x, y);
            mini.resize(cellSize);
            idx++;
        }
    }

    private updateLeaderboard() {
        const entries: LeaderboardEntry[] = [];

        // Add self
        if (this.engine) {
            const stats = this.engine.getStats();
            entries.push({
                playerId: this.playerId,
                name: this.playerName,
                score: stats.score,
                isAlive: !this.isGameEnded
            });
        }

        // Add opponents from snapshot
        for (const [id, p] of Object.entries(this.snapshotPlayers) as [string, any][]) {
            entries.push({
                playerId: id,
                name: p.name,
                score: p.score || 0,
                isAlive: p.isAlive !== false
            });
        }

        this.leaderboard.update(entries);
    }

    shutdown() {
        this.scale.off('resize', this.resize, this);
        if (this.socket) {
            this.socket.off('nmulti_snapshot');
            this.socket.off('nmulti_player_joined');
            this.socket.off('nmulti_player_left');
        }
        if (this.inGameMenu) {
            this.inGameMenu.destroy();
        }
        if (this.leaderboard) {
            this.leaderboard.destroy();
        }
        // Destroy all mini fields
        for (const [, mini] of this.miniFields) {
            mini.destroy();
        }
        this.miniFields.clear();
    }

    toggleMenu() {
        this.inGameMenu.togglePauseMenu();
    }

    toggleBackground(btn: HTMLElement) {
        const isVisible = this.backgroundGraphics.visible;
        this.backgroundGraphics.setVisible(!isVisible);
        btn.innerText = `Background: ${!isVisible ? 'ON' : 'OFF'}`;
    }

    exitGame() {
        this.time.paused = false;
        if (this.socket) {
            this.socket.emit('nmulti_leave_room', { roomId: this.roomId });
        }
        this.scene.start("NMultiLobbyScene");
    }

    restartGame() {
        if (this.socket) {
            this.socket.emit('nmulti_restart', { roomId: this.roomId });
        }
        // Restart locally
        this.inGameMenu.hideMenu();
        this.inGameMenu.isMenuOpen = false;
        this.inGameMenu.isGameEnded = false;
        this.isGameEnded = false;

        // Remove old game objects and restart
        if (this.playField) {
            this.playField.stop();
        }

        // Restart the scene keeping the socket alive
        this.scene.restart({
            socket: this.socket,
            roomId: this.roomId,
            playerId: this.playerId,
            playerName: this.playerName,
            initialPlayers: this.snapshotPlayers
        });
    }

    showEndGameMessage(mainText: string, color: string, score?: number) {
        this.isGameRunning = false;
        this.isGameEnded = true;
        this.inputManager.isEnabled = false;
        if (this.playField) {
            this.playField.stop();
        }
        if (this.socket) {
            this.socket.emit('nmulti_game_over', { roomId: this.roomId });
        }
        this.inGameMenu.showEndGame(mainText, color, score);
    }

    startGame() {
        this.isGameRunning = true;
        this.inputManager.isEnabled = true;

        const rawPlayFieldWidth = BLOCK_SIZE * CONST.PLAY_FIELD.COL_COUNT;
        const rawPlayFieldHeight = BLOCK_SIZE * CONST.PLAY_FIELD.ROW_COUNT;

        // Player area (hold + playfield + queue) is ~21 blocks wide.
        // Center it in the left 23-block portion, leaving right side for opponents.
        const PLAYER_AREA_BLOCKS = 23;
        const leftArea = BLOCK_SIZE * PLAYER_AREA_BLOCKS;
        const p1X = (leftArea - rawPlayFieldWidth) / 2;
        const p1Y = (this.GAME_HEIGHT - rawPlayFieldHeight) / 2;

        const GAP = BLOCK_SIZE * 0.5;
        const HOLD_WIDTH = BLOCK_SIZE * 5;
        const HOLD_HEIGHT = BLOCK_SIZE * 3;

        const holdX = p1X - GAP - HOLD_WIDTH;
        const holdY = p1Y;
        this.holdBox = new TetrominoBox(this, holdX, holdY, HOLD_WIDTH, HOLD_HEIGHT, "HOLD");

        // Hold touch zone
        const holdZone = this.add.zone(holdX, holdY, HOLD_WIDTH, HOLD_HEIGHT).setOrigin(0);
        holdZone.setInteractive();
        holdZone.on('pointerdown', () => {
            if (!this.isGameRunning || this.isPause || this.inGameMenu.isMenuOpen || this.isGameEnded) return;
            this.onInput('hold', InputState.PRESS);
            this.time.delayedCall(100, () => this.onInput('hold', InputState.RELEASE));
        });

        const infoX = holdX;
        const infoY = holdY + HOLD_HEIGHT + GAP;
        const levelIndicator = new LevelIndicator(this, infoX, infoY);

        const queueX = p1X + rawPlayFieldWidth + GAP - BLOCK_SIZE;
        const queueY = p1Y - BLOCK_SIZE;
        const tetrominoQueue = new TetrominoBoxQueue(this, queueX, queueY, 6);

        this.playField = new PlayField(this, p1X, p1Y, rawPlayFieldWidth, rawPlayFieldHeight);

        this.engine = new Engine(this.playField, this.holdBox, tetrominoQueue, levelIndicator);
        // No attack handler - no garbage in N-Multi

        this.playField.on('gameOver', () => {
            const score = this.engine ? this.engine.getScore() : 0;
            this.showEndGameMessage('GAME OVER', '#ff0000', score);
        });

        this.engine.start();
        this.inputManager.setDragThresholdScale(1);

        // Initial layout of opponents
        this.relayoutOpponents();
    }

    update(time: number, delta: number): void {
        if (this.inGameMenu.isMenuOpen || this.isGameEnded) {
            return;
        }

        if (!this.isGameRunning || this.isPause) return;

        if (this.engine) {
            this.engine.update(time, delta);
        }

        const softDropSpeed = this.playField ? (this.playField.autoDropDelay / 20) : CONST.PLAY_FIELD.AR_MS;
        this.inputManager.updateCustom(time, delta, softDropSpeed, softDropSpeed);

        // Send state at 5Hz (200ms)
        if (time - this.lastUpdateSend > 200) {
            this.lastUpdateSend = time;
            if (this.playField && this.socket) {
                const stats = this.engine.getStats();
                const boardBlocks = this.playField.serialize();
                const board = BoardCodec.encode(boardBlocks);
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

    onInput(direction: string, state: InputState) {
        if (this.engine) {
            this.engine.onInput(direction, state);
        }
    }
}

import { BoardCodec } from "../net/boardCodec";

const COLS = 10;
const ROWS = 20;

const TYPE_COLORS: Record<string, number> = {
    'I': 0x1cd6ff,
    'J': 0x126fc4,
    'L': 0xdf9a00,
    'O': 0xede40b,
    'S': 0x26a723,
    'T': 0x9826c7,
    'Z': 0xc92323,
    'GARBAGE': 0x888888
};

export class MiniPlayField {
    private scene: Phaser.Scene;
    private graphics: Phaser.GameObjects.Graphics;
    private nameText: Phaser.GameObjects.Text;
    private scoreText: Phaser.GameObjects.Text;
    private container: Phaser.GameObjects.Container;

    private _x: number = 0;
    private _y: number = 0;
    private _cellSize: number = 4;
    private _isAlive: boolean = true;
    private _board: string | null = null;

    public playerId: string;
    public playerName: string;

    constructor(scene: Phaser.Scene, playerId: string, playerName: string) {
        this.scene = scene;
        this.playerId = playerId;
        this.playerName = playerName;

        this.container = scene.add.container(0, 0);

        this.graphics = scene.add.graphics();
        this.container.add(this.graphics);

        this.nameText = scene.add.text(0, 0, playerName, {
            fontSize: '12px',
            color: '#ffffff',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0, 1);
        this.container.add(this.nameText);

        this.scoreText = scene.add.text(0, 0, '0', {
            fontSize: '10px',
            color: '#ffff00',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 1
        }).setOrigin(0, 0);
        this.container.add(this.scoreText);
    }

    updateState(board: string | null, score: number, isAlive: boolean) {
        this._board = board;
        this._isAlive = isAlive;
        this.scoreText.setText(score.toString());
        this.redraw();
    }

    setPosition(x: number, y: number) {
        this._x = x;
        this._y = y;
        this.container.setPosition(x, y);
    }

    resize(cellSize: number) {
        this._cellSize = cellSize;
        const fieldWidth = cellSize * COLS;

        const fontSize = Math.max(8, Math.floor(cellSize * 2.5));
        const scoreFontSize = Math.max(6, Math.floor(cellSize * 2));

        this.nameText.setFontSize(fontSize);
        this.nameText.setPosition(0, -2);

        this.scoreText.setFontSize(scoreFontSize);
        this.scoreText.setPosition(0, cellSize * ROWS + 2);

        this.redraw();
    }

    private redraw() {
        this.graphics.clear();

        const cellSize = this._cellSize;
        const fieldWidth = cellSize * COLS;
        const fieldHeight = cellSize * ROWS;

        // Background
        this.graphics.fillStyle(0x000000, 0.5);
        this.graphics.fillRect(0, 0, fieldWidth, fieldHeight);

        // Border
        this.graphics.lineStyle(1, 0xaaaaaa, 0.5);
        this.graphics.strokeRect(0, 0, fieldWidth, fieldHeight);

        // Draw blocks
        if (this._board) {
            const blocks = BoardCodec.decode(this._board);
            for (const b of blocks) {
                const color = TYPE_COLORS[b.type] || 0xffffff;
                this.graphics.fillStyle(color, 1);
                this.graphics.fillRect(
                    b.col * cellSize,
                    b.row * cellSize,
                    cellSize - 0.5,
                    cellSize - 0.5
                );
            }
        }

        // Game over overlay
        if (!this._isAlive) {
            this.graphics.fillStyle(0x000000, 0.6);
            this.graphics.fillRect(0, 0, fieldWidth, fieldHeight);
        }
    }

    destroy() {
        this.container.destroy();
    }

    getContainer(): Phaser.GameObjects.Container {
        return this.container;
    }
}

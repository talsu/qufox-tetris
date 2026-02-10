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

const COMMON_STROKE = '#000000';
const COMMON_SHADOW = { offsetX: 2, offsetY: 2, color: '#000000', blur: 2, stroke: true, fill: true };

export class MiniPlayField {
    private scene: Phaser.Scene;
    private graphics: Phaser.GameObjects.Graphics;
    private nameText: Phaser.GameObjects.Text;
    private scoreText: Phaser.GameObjects.Text;
    private gameOverText: Phaser.GameObjects.Text;
    private gameOverScoreText: Phaser.GameObjects.Text;
    private container: Phaser.GameObjects.Container;

    private _x: number = 0;
    private _y: number = 0;
    private _cellSize: number = 4;
    private _isAlive: boolean = true;
    private _board: string | null = null;
    private _score: number = 0;

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
            fontFamily: 'Arial Black',
        }).setOrigin(0, 1);
        this.applyTextStyle(this.nameText, 3);
        this.container.add(this.nameText);

        this.scoreText = scene.add.text(0, 0, '0', {
            fontSize: '10px',
            color: '#ffffff',
            fontFamily: 'Arial Black',
        }).setOrigin(0, 0);
        this.applyTextStyle(this.scoreText, 2);
        this.container.add(this.scoreText);

        // Game over overlay texts (hidden by default)
        this.gameOverText = scene.add.text(0, 0, 'GAME OVER', {
            fontSize: '12px',
            color: '#ff0000',
            fontFamily: 'Arial Black',
            align: 'center'
        }).setOrigin(0.5, 0.5);
        this.applyTextStyle(this.gameOverText, 3);
        this.gameOverText.setVisible(false);
        this.container.add(this.gameOverText);

        this.gameOverScoreText = scene.add.text(0, 0, '', {
            fontSize: '10px',
            color: '#ffff00',
            fontFamily: 'Arial Black',
            align: 'center'
        }).setOrigin(0.5, 0.5);
        this.applyTextStyle(this.gameOverScoreText, 2);
        this.gameOverScoreText.setVisible(false);
        this.container.add(this.gameOverScoreText);
    }

    private applyTextStyle(textObj: Phaser.GameObjects.Text, strokeThickness: number) {
        textObj.setStroke(COMMON_STROKE, strokeThickness);
        textObj.setShadow(
            COMMON_SHADOW.offsetX, COMMON_SHADOW.offsetY,
            COMMON_SHADOW.color, COMMON_SHADOW.blur,
            COMMON_SHADOW.stroke, COMMON_SHADOW.fill
        );
    }

    updateState(board: string | null, score: number, isAlive: boolean) {
        this._board = board;
        this._isAlive = isAlive;
        this._score = score;
        this.scoreText.setText(score.toString());
        this.redraw();
        this.updateGameOverOverlay();
    }

    setPosition(x: number, y: number) {
        this._x = x;
        this._y = y;
        this.container.setPosition(x, y);
    }

    resize(cellSize: number) {
        this._cellSize = cellSize;
        const fieldWidth = cellSize * COLS;
        const fieldHeight = cellSize * ROWS;

        const fontSize = Math.max(8, Math.floor(cellSize * 2.5));
        const scoreFontSize = Math.max(6, Math.floor(cellSize * 2));

        this.nameText.setFontSize(fontSize);
        this.nameText.setPosition(0, -2);

        this.scoreText.setFontSize(scoreFontSize);
        this.scoreText.setPosition(0, fieldHeight + 2);

        // Game over text sizing and positioning
        const goFontSize = Math.max(8, Math.floor(cellSize * 2));
        const goScoreFontSize = Math.max(6, Math.floor(cellSize * 1.5));
        this.gameOverText.setFontSize(goFontSize);
        this.gameOverText.setPosition(fieldWidth / 2, fieldHeight / 2 - goFontSize * 0.6);
        this.gameOverScoreText.setFontSize(goScoreFontSize);
        this.gameOverScoreText.setPosition(fieldWidth / 2, fieldHeight / 2 + goFontSize * 0.6);

        this.redraw();
    }

    private updateGameOverOverlay() {
        if (!this._isAlive) {
            this.gameOverText.setVisible(true);
            this.gameOverScoreText.setText(this._score.toString());
            this.gameOverScoreText.setVisible(true);
        } else {
            this.gameOverText.setVisible(false);
            this.gameOverScoreText.setVisible(false);
        }
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

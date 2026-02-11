import { CONST } from "../const/const";
import { BoardCodec } from "../net/boardCodec";
import { applyTextEffect } from "../ui/uiStyles";

const COLS = 10;
const ROWS = 20;
const BLOCK_IMAGE_SIZE = CONST.SCREEN.BLOCK_IMAGE_SIZE;

const SPRITE_FRAMES: Record<string, number> = {
    'I': CONST.TETROMINO.SPRITE_IMAGE_FRAME.I,
    'J': CONST.TETROMINO.SPRITE_IMAGE_FRAME.J,
    'L': CONST.TETROMINO.SPRITE_IMAGE_FRAME.L,
    'O': CONST.TETROMINO.SPRITE_IMAGE_FRAME.O,
    'S': CONST.TETROMINO.SPRITE_IMAGE_FRAME.S,
    'T': CONST.TETROMINO.SPRITE_IMAGE_FRAME.T,
    'Z': CONST.TETROMINO.SPRITE_IMAGE_FRAME.Z,
    'GARBAGE': 7,
};

export class MiniPlayField {
    private scene: Phaser.Scene;
    private bgGraphics: Phaser.GameObjects.Graphics;
    private blockContainer: Phaser.GameObjects.Container;
    private dimGraphics: Phaser.GameObjects.Graphics;
    private nameText: Phaser.GameObjects.Text;
    private scoreText: Phaser.GameObjects.Text;
    private gameOverText: Phaser.GameObjects.Text;
    private gameOverScoreText: Phaser.GameObjects.Text;
    private container: Phaser.GameObjects.Container;

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

        // Background and border
        this.bgGraphics = scene.add.graphics();
        this.container.add(this.bgGraphics);

        // Block images container
        this.blockContainer = scene.add.container(0, 0);
        this.container.add(this.blockContainer);

        // Dim overlay for game over
        this.dimGraphics = scene.add.graphics();
        this.dimGraphics.setVisible(false);
        this.container.add(this.dimGraphics);

        // Info texts
        this.nameText = this.createText(playerName, { fontSize: '12px', color: '#ffffff' }, 3);
        this.nameText.setOrigin(0, 1);

        this.scoreText = this.createText('0', { fontSize: '10px', color: '#ffffff' }, 2);

        // Game over overlay texts (hidden by default)
        this.gameOverText = this.createText('GAME OVER', { fontSize: '12px', color: '#ff0000', align: 'center' }, 3);
        this.gameOverText.setOrigin(0.5, 0.5).setVisible(false);

        this.gameOverScoreText = this.createText('', { fontSize: '10px', color: '#ffff00', align: 'center' }, 2);
        this.gameOverScoreText.setOrigin(0.5, 0.5).setVisible(false);
    }

    private createText(
        content: string,
        style: Partial<Phaser.Types.GameObjects.Text.TextStyle>,
        strokeThickness: number,
    ): Phaser.GameObjects.Text {
        const text = this.scene.add.text(0, 0, content, {
            fontFamily: 'Arial Black',
            ...style,
        });
        applyTextEffect(text, strokeThickness);
        this.container.add(text);
        return text;
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

        // Game over text sizing
        const goFontSize = Math.max(8, Math.floor(cellSize * 2));
        const goScoreFontSize = Math.max(6, Math.floor(cellSize * 1.5));
        this.gameOverText.setFontSize(goFontSize);
        this.gameOverText.setPosition(fieldWidth / 2, fieldHeight / 2 - goFontSize * 0.6);
        this.gameOverScoreText.setFontSize(goScoreFontSize);
        this.gameOverScoreText.setPosition(fieldWidth / 2, fieldHeight / 2 + goFontSize * 0.6);

        this.redraw();
    }

    private updateGameOverOverlay() {
        const fieldWidth = this._cellSize * COLS;
        const fieldHeight = this._cellSize * ROWS;

        if (!this._isAlive) {
            this.dimGraphics.clear();
            this.dimGraphics.fillStyle(0x000000, 0.6);
            this.dimGraphics.fillRect(0, 0, fieldWidth, fieldHeight);
            this.dimGraphics.setVisible(true);
            this.gameOverText.setVisible(true);
            this.gameOverScoreText.setText(this._score.toString());
            this.gameOverScoreText.setVisible(true);
        } else {
            this.dimGraphics.setVisible(false);
            this.gameOverText.setVisible(false);
            this.gameOverScoreText.setVisible(false);
        }
    }

    private redraw() {
        const cellSize = this._cellSize;
        const fieldWidth = cellSize * COLS;
        const fieldHeight = cellSize * ROWS;
        const blockScale = cellSize / BLOCK_IMAGE_SIZE;

        // Background
        this.bgGraphics.clear();
        this.bgGraphics.fillStyle(0x000000, 0.5);
        this.bgGraphics.fillRect(0, 0, fieldWidth, fieldHeight);
        this.bgGraphics.lineStyle(1, 0xaaaaaa, 0.5);
        this.bgGraphics.strokeRect(0, 0, fieldWidth, fieldHeight);

        // Clear old block images
        this.blockContainer.removeAll(true);

        // Draw blocks
        if (this._board) {
            const blocks = BoardCodec.decode(this._board);
            for (const b of blocks) {
                const frame = SPRITE_FRAMES[b.type] ?? 7;
                const img = this.scene.add.image(
                    b.col * cellSize,
                    b.row * cellSize,
                    'blockSheet',
                    frame
                );
                img.setOrigin(0);
                img.setScale(blockScale);
                this.blockContainer.add(img);
            }
        }
    }

    destroy() {
        this.container.destroy();
    }

    getContainer(): Phaser.GameObjects.Container {
        return this.container;
    }
}

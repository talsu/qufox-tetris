import { CONST } from "../const/const";
import { BoardCodec } from "../net/boardCodec";
import { applyTextEffect, GAME_FONT_FAMILY } from "../ui/uiStyles";

const COLS = 10;
const ROWS = 20;
const BLOCK_IMAGE_SIZE = CONST.SCREEN.BLOCK_IMAGE_SIZE;
const STATUS_FRAME_RADIUS_FACTOR = 0.34;
const STATUS_FRAME_RADIUS_MIN = 1;

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
    private statusFrameGraphics: Phaser.GameObjects.Graphics;
    private blockContainer: Phaser.GameObjects.Container;
    private dimGraphics: Phaser.GameObjects.Graphics;
    private nameText: Phaser.GameObjects.Text;
    private statusText: Phaser.GameObjects.Text;
    private rankText: Phaser.GameObjects.Text;
    private scoreText: Phaser.GameObjects.Text;
    private gameOverText: Phaser.GameObjects.Text;
    private gameOverScoreText: Phaser.GameObjects.Text;
    private container: Phaser.GameObjects.Container;

    private _cellSize: number = 4;
    private _isAlive: boolean = true;
    private _board: string | Uint8Array | ArrayBuffer | null = null;
    private _score: number = 0;
    private _lastRenderedBoard: string | Uint8Array | ArrayBuffer | null = null;
    private _dangerValue: number = 0;
    private _rank: number | null = null;
    private _nameBandHeight: number = 14;
    private _infoBandHeight: number = 12;
    private blockPool: Phaser.GameObjects.Image[] = [];

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

        this.statusFrameGraphics = scene.add.graphics();
        this.container.add(this.statusFrameGraphics);

        // Block images container
        this.blockContainer = scene.add.container(0, 0);
        this.container.add(this.blockContainer);

        // Dim overlay for game over
        this.dimGraphics = scene.add.graphics();
        this.dimGraphics.setVisible(false);
        this.container.add(this.dimGraphics);

        // Name text (above field)
        this.nameText = this.createText(playerName, { fontSize: '12px', color: '#ffffff' }, 3);
        this.nameText.setOrigin(0, 1);

        this.statusText = this.createText('', { fontSize: '10px', color: '#eaf4ff' }, 2);
        this.statusText.setOrigin(1, 0.5);

        // Rank text (below field, left-aligned)
        this.rankText = this.createText('', { fontSize: '10px', color: '#ffbe0b' }, 2);
        this.rankText.setOrigin(0, 0);

        // Score text (below field, right-aligned)
        this.scoreText = this.createText('0', { fontSize: '10px', color: '#ffffff' }, 2);
        this.scoreText.setOrigin(1, 0);

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
            fontFamily: GAME_FONT_FAMILY,
            ...style,
        });
        applyTextEffect(text, strokeThickness);
        this.container.add(text);
        return text;
    }

    updateState(board: string | Uint8Array | ArrayBuffer | null, score: number, isAlive: boolean) {
        const boardChanged = !BoardCodec.areUint8ArraysEqual(this._board, board);
        const aliveChanged = this._isAlive !== isAlive;

        this._board = board;
        this._isAlive = isAlive;
        this._score = score;
        this.scoreText.setText(score.toString());

        if (boardChanged) {
            this.redrawBoard();
        }

        if (aliveChanged || boardChanged) {
            this.updateGameOverOverlay();
            this.updateStatusVisual();
        }
    }

    updateRank(rank: number) {
        this._rank = rank;
        this.rankText.setText(`#${rank}`);
        this.updateStatusVisual();
    }

    setPosition(x: number, y: number) {
        this.container.setPosition(x, y);
    }

    resize(cellSize: number) {
        this._cellSize = cellSize;
        const fieldWidth = cellSize * COLS;
        const fieldHeight = cellSize * ROWS;

        // Name: scale with cellSize but cap to prevent overflow
        const nameFontSize = Math.max(8, Math.min(Math.floor(cellSize * 2), 18));
        this._nameBandHeight = Math.max(10, nameFontSize + 6);
        this.nameText.setFontSize(nameFontSize);
        this.nameText.setPosition(0, -2);
        // Crop name text to fieldWidth to prevent horizontal overflow
        this.nameText.setCrop(0, 0, fieldWidth, nameFontSize * 2);

        // Bottom info row: rank (left) + score (right)
        const infoFontSize = Math.max(6, Math.min(Math.floor(cellSize * 1.8), 14));
        this._infoBandHeight = Math.max(8, infoFontSize + 6);
        this.rankText.setFontSize(infoFontSize);
        this.rankText.setPosition(0, fieldHeight + 2);

        this.scoreText.setFontSize(infoFontSize);
        this.scoreText.setPosition(fieldWidth, fieldHeight + 2);

        // Game over text sizing
        const goFontSize = Math.max(8, Math.floor(cellSize * 2));
        const goScoreFontSize = Math.max(6, Math.floor(cellSize * 1.5));
        this.gameOverText.setFontSize(goFontSize);
        this.gameOverText.setPosition(fieldWidth / 2, fieldHeight / 2 - goFontSize * 0.6);
        this.gameOverScoreText.setFontSize(goScoreFontSize);
        this.gameOverScoreText.setPosition(fieldWidth / 2, fieldHeight / 2 + goFontSize * 0.6);

        const statusFontSize = Math.max(7, Math.min(Math.floor(cellSize * 1.55), 13));
        this.statusText.setFontSize(statusFontSize);
        this.statusText.setPosition(fieldWidth / 2, Math.max(6, Math.floor(cellSize * 0.75)));

        this.redrawBackground();
        this.redrawBoard(true);
        this.updateStatusVisual();
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

    private redrawBackground() {
        const cellSize = this._cellSize;
        const fieldWidth = cellSize * COLS;
        const fieldHeight = cellSize * ROWS;

        // Background
        this.bgGraphics.clear();
        this.bgGraphics.fillStyle(0x000000, 0.5);
        this.bgGraphics.fillRect(0, 0, fieldWidth, fieldHeight);
        this.bgGraphics.lineStyle(1, 0xaaaaaa, 0.5);
        this.bgGraphics.strokeRect(0, 0, fieldWidth, fieldHeight);
    }

    private redrawBoard(force = false) {
        const cellSize = this._cellSize;
        const blockScale = cellSize / BLOCK_IMAGE_SIZE;

        if (!force && this._board === this._lastRenderedBoard) {
            return;
        }

        let used = 0;

        if (this._board) {
            const blocks = BoardCodec.decode(this._board);
            let highestFilledRow = ROWS;
            for (const b of blocks) {
                const frame = SPRITE_FRAMES[b.type] ?? 7;
                const img = this.ensurePooledImage(used++);
                img.setFrame(frame);
                img.setPosition(b.col * cellSize, b.row * cellSize);
                img.setScale(blockScale);
                img.setVisible(true);
                highestFilledRow = Math.min(highestFilledRow, b.row);
            }

            if (blocks.length > 0) {
                const stackHeight = ROWS - highestFilledRow;
                const occupancy = blocks.length / (ROWS * COLS);
                this._dangerValue = Math.min(1, (stackHeight / ROWS) * 0.7 + occupancy * 0.3);
            } else {
                this._dangerValue = 0;
            }
        } else {
            this._dangerValue = 0;
        }

        for (let i = used; i < this.blockPool.length; i++) {
            this.blockPool[i].setVisible(false);
        }

        this._lastRenderedBoard = this._board;
        this.updateStatusVisual();
    }

    private updateStatusVisual() {
        const fieldWidth = this._cellSize * COLS;
        const fieldHeight = this._cellSize * ROWS;
        const frameTop = -this._nameBandHeight;
        const frameHeight = fieldHeight + this._nameBandHeight + this._infoBandHeight;
        const borderWidth = Math.max(0.75, this._cellSize * 0.12);
        const radius = Math.max(STATUS_FRAME_RADIUS_MIN, Math.floor(this._cellSize * STATUS_FRAME_RADIUS_FACTOR));
        const statusRightPadding = Math.max(3, Math.floor(this._cellSize * 0.45));

        const { borderColor, label, labelColor } = this.resolveStatusStyle();

        this.statusFrameGraphics.clear();
        this.statusFrameGraphics.lineStyle(borderWidth, borderColor, this._isAlive ? 0.92 : 0.72);
        this.statusFrameGraphics.strokeRoundedRect(0, frameTop, fieldWidth, frameHeight, radius);
        this.statusFrameGraphics.fillStyle(borderColor, this._isAlive ? 0.14 : 0.16);
        this.statusFrameGraphics.fillRoundedRect(
            0,
            frameTop,
            fieldWidth,
            this._nameBandHeight,
            Math.max(2, radius - 1),
        );

        this.statusText.setPosition(fieldWidth - statusRightPadding, frameTop + this._nameBandHeight * 0.5);
        this.statusText.setText(label);
        this.statusText.setColor(labelColor);
        this.statusText.setStroke('#041528', 2);
    }

    private resolveStatusStyle(): { borderColor: number; label: string; labelColor: string } {
        if (!this._isAlive) {
            return { borderColor: 0x8a96a8, label: 'OUT', labelColor: '#f2f5fa' };
        }

        if (this._rank === 1) {
            return { borderColor: 0x4ee3ff, label: 'LEAD', labelColor: '#e6fbff' };
        }

        if (this._dangerValue >= 0.72) {
            return { borderColor: 0xff5a5a, label: '', labelColor: '#ffe8e8' };
        }
        if (this._dangerValue >= 0.48) {
            return { borderColor: 0xffb347, label: '', labelColor: '#fff3df' };
        }
        return { borderColor: 0x58d68d, label: '', labelColor: '#ebfff3' };
    }

    private ensurePooledImage(index: number): Phaser.GameObjects.Image {
        if (!this.blockPool[index]) {
            const img = this.scene.add.image(0, 0, 'blockSheet', 0);
            img.setOrigin(0);
            this.blockContainer.add(img);
            this.blockPool[index] = img;
        }

        return this.blockPool[index];
    }

    destroy() {
        this.container.destroy();
    }

    getContainer(): Phaser.GameObjects.Container {
        return this.container;
    }
}

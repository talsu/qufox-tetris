import { ObjectBase } from "./objectBase";
import { getBlockSize } from "../const/const";
import { GameStats } from "../logic/scoreSystem";
import {
    TextStyles,
    drawPanelBackground,
    createStyledText,
    createStatRow,
} from "../ui/uiStyles";

const BLOCK_SIZE = getBlockSize();

// Layout constants (standard vertical mode)
const BG_WIDTH = BLOCK_SIZE * 5;
const BG_HEIGHT = BLOCK_SIZE * 16.5;
const PADDING_LEFT = BLOCK_SIZE * 0.5;
const ROW_HEIGHT = BLOCK_SIZE * 0.8;
const SECTION_GAP = BLOCK_SIZE * 1.5;
const HEADER_ROW_HEIGHT = BLOCK_SIZE;
const VALUE_ROW_HEIGHT = BLOCK_SIZE * 1.5;
const TEMP_TEXT_DURATION = 3000;

// Compact horizontal mode constants
const COMPACT_WIDTH = BLOCK_SIZE * 10;

export interface LevelIndicatorOptions {
    compact?: boolean;
    compactShowRank?: boolean;
}

export class LevelIndicator extends ObjectBase {
    public container: Phaser.GameObjects.Container;
    private compact: boolean;
    private compactShowRank: boolean;
    private compactLevel: number = 1;
    private compactRank: number | null = null;
    private compactPlayerName: string = '';
    private compactRankText: Phaser.GameObjects.Text;
    private compactLevelText: Phaser.GameObjects.Text;
    private compactNameText: Phaser.GameObjects.Text;

    // Large value displays
    private scoreValueText: Phaser.GameObjects.Text;
    private timeValueText: Phaser.GameObjects.Text;

    // Stat row values
    private linesValueText: Phaser.GameObjects.Text;
    private levelValueText: Phaser.GameObjects.Text;
    private goalValueText: Phaser.GameObjects.Text;
    private tetrisesValueText: Phaser.GameObjects.Text;
    private tSpinsValueText: Phaser.GameObjects.Text;
    private combosValueText: Phaser.GameObjects.Text;
    private tpmValueText: Phaser.GameObjects.Text;
    private lpmValueText: Phaser.GameObjects.Text;

    // Temporary feedback texts
    private actionText: Phaser.GameObjects.Text;
    private actionTextShowEvent: Phaser.Time.TimerEvent;
    private comboText: Phaser.GameObjects.Text;
    private comboTextShowEvent: Phaser.Time.TimerEvent;

    constructor(scene: Phaser.Scene, x: number, y: number, options?: LevelIndicatorOptions) {
        super(scene);
        this.compact = options?.compact ?? false;
        this.compactShowRank = options?.compactShowRank ?? false;
        this.container = scene.add.container(x, y);
        if (this.compact) {
            this.createCompactUI();
        } else {
            this.createUI();
        }
    }

    private createCompactUI() {
        const pad = 0;
        const centerY = BLOCK_SIZE * 0.45;

        this.compactRankText = createStyledText(
            this.scene,
            this.container,
            pad,
            centerY,
            '',
            { ...TextStyles.header, fontSize: `${BLOCK_SIZE * 0.5}px`, color: '#ffbe0b' },
            2,
        ).setOrigin(0, 0.5);

        this.compactLevelText = createStyledText(
            this.scene,
            this.container,
            pad,
            centerY,
            'LV 1',
            { ...TextStyles.label, fontSize: `${BLOCK_SIZE * 0.52}px`, color: '#22c55e' },
            2,
        ).setOrigin(0, 0.5);

        this.compactNameText = createStyledText(
            this.scene,
            this.container,
            pad,
            centerY,
            '',
            { ...TextStyles.label, fontSize: `${BLOCK_SIZE * 0.52}px` },
            2,
        ).setOrigin(0, 0.5);

        this.scoreValueText = createStyledText(
            this.scene,
            this.container,
            COMPACT_WIDTH - pad,
            centerY,
            '0',
            { ...TextStyles.valueLarge, fontSize: `${BLOCK_SIZE * 0.65}px` },
            2,
        );
        this.scoreValueText.setOrigin(1, 0.5);

        this.timeValueText = createStyledText(
            this.scene,
            this.container,
            -9999,
            -9999,
            '00:00',
            { ...TextStyles.valueSmall, fontSize: '1px' },
            1,
        );

        this.levelValueText = this.scene.add.text(-9999, -9999, '1', { ...TextStyles.valueSmall, fontSize: '1px' });
        this.linesValueText = this.scene.add.text(-9999, -9999, '0', { ...TextStyles.valueSmall, fontSize: '1px' });
        this.goalValueText = this.scene.add.text(-9999, -9999, '0', { ...TextStyles.valueSmall, fontSize: '1px' });

        // Hidden stats (tracked internally but not shown)
        const hiddenStyle = { ...TextStyles.valueSmall, fontSize: '1px' };
        this.tetrisesValueText = this.scene.add.text(-9999, -9999, '0', hiddenStyle);
        this.tSpinsValueText = this.scene.add.text(-9999, -9999, '0', hiddenStyle);
        this.combosValueText = this.scene.add.text(-9999, -9999, '0', hiddenStyle);
        this.tpmValueText = this.scene.add.text(-9999, -9999, '0', hiddenStyle);
        this.lpmValueText = this.scene.add.text(-9999, -9999, '0', hiddenStyle);

        this.actionText = createStyledText(
            this.scene, this.container,
            -9999, -9999, '', { ...TextStyles.action, fontSize: '1px' },
        );

        this.comboText = createStyledText(
            this.scene, this.container,
            -9999, -9999, '', { ...TextStyles.combo, fontSize: '1px' },
        );

        this.refreshCompactInfoText();
    }

    private createUI() {
        // Background panel
        const bg = this.scene.add.graphics();
        drawPanelBackground(bg, BG_WIDTH, BG_HEIGHT);
        this.container.add(bg);

        let y = PADDING_LEFT; // top padding

        // SCORE section
        y = this.createLargeValueSection(y, 'SCORE', '0', (text) => { this.scoreValueText = text; });

        // TIME section
        y = this.createLargeValueSection(y, 'TIME', '00:00.00', (text) => { this.timeValueText = text; });

        // Spacer
        y += PADDING_LEFT;

        // Stats Block 1: Lines, Level, Goal
        const rightX = BG_WIDTH - PADDING_LEFT;
        this.linesValueText = createStatRow(this.scene, this.container, y, 'LINES', PADDING_LEFT, rightX);
        y += ROW_HEIGHT;
        this.levelValueText = createStatRow(this.scene, this.container, y, 'LEVEL', PADDING_LEFT, rightX);
        y += ROW_HEIGHT;
        this.goalValueText = createStatRow(this.scene, this.container, y, 'GOAL', PADDING_LEFT, rightX);
        y += SECTION_GAP;

        // Stats Block 2: Tetrises, T-Spins, Combos, TPM, LPM
        this.tetrisesValueText = createStatRow(this.scene, this.container, y, 'TETRISES', PADDING_LEFT, rightX);
        y += ROW_HEIGHT;
        this.tSpinsValueText = createStatRow(this.scene, this.container, y, 'T-SPINS', PADDING_LEFT, rightX);
        y += ROW_HEIGHT;
        this.combosValueText = createStatRow(this.scene, this.container, y, 'COMBOS', PADDING_LEFT, rightX);
        y += ROW_HEIGHT;
        this.tpmValueText = createStatRow(this.scene, this.container, y, 'TPM', PADDING_LEFT, rightX);
        y += ROW_HEIGHT;
        this.lpmValueText = createStatRow(this.scene, this.container, y, 'LPM', PADDING_LEFT, rightX);
        y += BLOCK_SIZE;

        // Action/Combo texts are now shown as animated popups inside the PlayField.
        // Keep hidden off-screen objects so setAction/setCombo calls don't crash.
        this.actionText = this.scene.add.text(-9999, -9999, '', TextStyles.action);
        this.comboText = this.scene.add.text(-9999, -9999, '', TextStyles.combo);
    }

    /**
     * Create a header label + large value text pair.
     * Returns the next Y position after the section.
     */
    private createLargeValueSection(
        y: number,
        label: string,
        initialValue: string,
        onCreated: (text: Phaser.GameObjects.Text) => void,
    ): number {
        createStyledText(this.scene, this.container, PADDING_LEFT, y, label, TextStyles.header);
        y += HEADER_ROW_HEIGHT;

        const valueText = createStyledText(this.scene, this.container, PADDING_LEFT, y, initialValue, TextStyles.valueLarge);
        onCreated(valueText);
        y += VALUE_ROW_HEIGHT;

        return y;
    }

    updateStats(stats: GameStats) {
        if (!stats) return;
        this.scoreValueText.setText(stats.score.toString());
        this.timeValueText.setText(stats.time);
        this.linesValueText.setText(stats.lines.toString());
        this.levelValueText.setText(stats.level.toString());
        this.goalValueText.setText(stats.goal.toString());
        this.tetrisesValueText.setText(stats.tetrises.toString());
        this.tSpinsValueText.setText(stats.tspins.toString());
        this.combosValueText.setText(stats.combos.toString());
        this.tpmValueText.setText(stats.tpm.toString());
        this.lpmValueText.setText(stats.lpm.toString());
        if (this.compact) {
            this.compactLevel = stats.level;
            this.refreshCompactInfoText();
        }
    }

    setRank(rank: number | null) {
        this.compactRank = rank;
        if (this.compact) {
            this.refreshCompactInfoText();
        }
    }

    setPlayerName(name: string | null) {
        this.compactPlayerName = (name || '').trim();
        if (this.compact) {
            this.refreshCompactInfoText();
        }
    }

    setAction(action?: string | null) {
        this.actionTextShowEvent?.destroy();
        this.actionTextShowEvent = null;

        this.actionText.setText(action || '');
        if (action) {
            this.actionTextShowEvent = this.scene.time.addEvent({
                delay: TEMP_TEXT_DURATION,
                callback: () => this.actionText.setText(''),
                callbackScope: this,
            });
        }
    }

    setCombo(combo: number = -1) {
        this.comboTextShowEvent?.destroy();
        this.comboTextShowEvent = null;

        if (combo > 0) {
            this.comboText.setText(combo + ' COMBO');
            this.comboTextShowEvent = this.scene.time.addEvent({
                delay: TEMP_TEXT_DURATION,
                callback: () => this.comboText.setText(''),
                callbackScope: this,
            });
        } else {
            this.comboText.setText('');
        }
    }

    clear() {
        this.compactRank = null;
        this.updateStats({
            score: 0,
            time: '00:00.00',
            lines: 0,
            level: 1,
            goal: 5,
            tetrises: 0,
            tspins: 0,
            combos: 0,
            tpm: 0,
            lpm: 0,
        });
    }

    private refreshCompactInfoText() {
        if (!this.compact || !this.compactLevelText || !this.scoreValueText) {
            return;
        }

        const pad = 0;
        const gap = BLOCK_SIZE * 0.2;
        const leftStartX = pad;

        this.compactRankText.setText(this.compactShowRank && this.compactRank !== null ? `#${this.compactRank}` : '');
        this.compactRankText.setPosition(leftStartX, this.compactRankText.y);

        const levelPrefix = this.compactRankText.text.length > 0 ? ' LV ' : 'LV ';
        this.compactLevelText.setText(`${levelPrefix}${this.compactLevel}`);
        this.compactLevelText.setPosition(leftStartX + this.compactRankText.width, this.compactLevelText.y);

        const scoreLeftEdge = this.scoreValueText.x - this.scoreValueText.width;
        const nameStartX = leftStartX + this.compactRankText.width + this.compactLevelText.width;
        const nameMaxWidth = Math.max(0, scoreLeftEdge - gap - nameStartX);
        const compactName = this.truncateNameToWidth(this.compactPlayerName, 10, nameMaxWidth);
        this.compactNameText.setText(compactName ? ` ${compactName}` : '');
        this.compactNameText.setPosition(nameStartX, this.compactNameText.y);
    }

    private truncateNameToWidth(name: string, maxChars: number, maxWidth: number): string {
        if (!name || maxWidth <= 0) {
            return '';
        }

        const maxLenName = name.length > maxChars ? `${name.slice(0, maxChars)}…` : name;
        const ctx = this.compactNameText.canvas.getContext('2d');
        if (!ctx) {
            return maxLenName;
        }

        const style = this.compactNameText.style;
        ctx.font = `${style.fontStyle || ''} ${style.fontSize} ${style.fontFamily}`.trim();

        if (ctx.measureText(maxLenName).width <= maxWidth) {
            return maxLenName;
        }

        let lo = 0;
        let hi = Math.min(maxChars, name.length);
        while (lo < hi) {
            const mid = Math.ceil((lo + hi) / 2);
            const trial = `${name.slice(0, mid)}…`;
            if (ctx.measureText(trial).width <= maxWidth) {
                lo = mid;
            } else {
                hi = mid - 1;
            }
        }

        if (lo <= 0) {
            return '';
        }
        return lo < name.length ? `${name.slice(0, lo)}…` : name.slice(0, lo);
    }
}

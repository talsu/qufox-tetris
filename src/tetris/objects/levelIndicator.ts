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
const COMPACT_HEIGHT = BLOCK_SIZE * 3;

export interface LevelIndicatorOptions {
    compact?: boolean;
}

export class LevelIndicator extends ObjectBase {
    public container: Phaser.GameObjects.Container;
    private compact: boolean;

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
        this.container = scene.add.container(x, y);
        if (this.compact) {
            this.createCompactUI();
        } else {
            this.createUI();
        }
    }

    private createCompactUI() {
        const bg = this.scene.add.graphics();
        drawPanelBackground(bg, COMPACT_WIDTH, COMPACT_HEIGHT);
        this.container.add(bg);

        const pad = BLOCK_SIZE * 0.4;
        const midY = BLOCK_SIZE * 0.3;
        const bottomY = BLOCK_SIZE * 1.6;
        const halfW = COMPACT_WIDTH / 2;

        // Row 1: SCORE (large, left-aligned) + TIME (right-aligned)
        createStyledText(this.scene, this.container, pad, midY, 'SCORE', TextStyles.label, 3);
        this.scoreValueText = createStyledText(
            this.scene, this.container, pad + BLOCK_SIZE * 2.2, midY, '0',
            { ...TextStyles.valueLarge, fontSize: `${BLOCK_SIZE * 0.7}px` }, 3
        );
        this.timeValueText = createStyledText(
            this.scene, this.container, COMPACT_WIDTH - pad, midY, '00:00',
            { ...TextStyles.valueSmall, fontSize: `${BLOCK_SIZE * 0.55}px` }, 3
        );
        this.timeValueText.setOrigin(1, 0);

        // Row 2: LV:x   LN:x
        const colW = (COMPACT_WIDTH - pad * 2) / 3;
        const makeCompactStat = (label: string, colIdx: number) => {
            const lx = pad + colW * colIdx;
            createStyledText(this.scene, this.container, lx, bottomY, label,
                { ...TextStyles.label, fontSize: `${BLOCK_SIZE * 0.4}px` }, 2);
            const vt = createStyledText(this.scene, this.container, lx + BLOCK_SIZE * 1.2, bottomY, '0',
                { ...TextStyles.valueSmall, fontSize: `${BLOCK_SIZE * 0.5}px` }, 2);
            return vt;
        };

        this.levelValueText = makeCompactStat('LV', 0);
        this.linesValueText = makeCompactStat('LN', 1);
        this.goalValueText = makeCompactStat('GL', 2);

        // Hidden stats (tracked internally but not shown)
        const hiddenStyle = { ...TextStyles.valueSmall, fontSize: '1px' };
        this.tetrisesValueText = this.scene.add.text(-9999, -9999, '0', hiddenStyle);
        this.tSpinsValueText = this.scene.add.text(-9999, -9999, '0', hiddenStyle);
        this.combosValueText = this.scene.add.text(-9999, -9999, '0', hiddenStyle);
        this.tpmValueText = this.scene.add.text(-9999, -9999, '0', hiddenStyle);
        this.lpmValueText = this.scene.add.text(-9999, -9999, '0', hiddenStyle);

        // Action/Combo text - overlaid centered above this container
        this.actionText = createStyledText(
            this.scene, this.container,
            halfW, -BLOCK_SIZE * 1.2, '', TextStyles.action,
        );
        this.actionText.setOrigin(0.5, 0);

        this.comboText = createStyledText(
            this.scene, this.container,
            halfW, -BLOCK_SIZE * 0.5, '', TextStyles.combo,
        );
        this.comboText.setOrigin(0.5, 0);
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

        // Action Text (temporary feedback)
        this.actionText = createStyledText(
            this.scene, this.container,
            BG_WIDTH / 2, y, '', TextStyles.action,
        );
        this.actionText.setOrigin(0.5, 0);
        y += BLOCK_SIZE;

        // Combo Text (temporary feedback)
        this.comboText = createStyledText(
            this.scene, this.container,
            BG_WIDTH / 2, y, '', TextStyles.combo,
        );
        this.comboText.setOrigin(0.5, 0);
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
}

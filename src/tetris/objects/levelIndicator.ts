import {ObjectBase} from "./objectBase";
import {getBlockSize} from "../const/const";
const BLOCK_SIZE = getBlockSize();

export class LevelIndicator extends ObjectBase {
    private readonly container: Phaser.GameObjects.Container;

    // UI Elements
    private scoreValueText: Phaser.GameObjects.Text;
    private timeValueText: Phaser.GameObjects.Text;

    private linesValueText: Phaser.GameObjects.Text;
    private levelValueText: Phaser.GameObjects.Text;
    private goalValueText: Phaser.GameObjects.Text;

    private tetrisesValueText: Phaser.GameObjects.Text;
    private tSpinsValueText: Phaser.GameObjects.Text;
    private combosValueText: Phaser.GameObjects.Text;
    private tpmValueText: Phaser.GameObjects.Text;
    private lpmValueText: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene);
        this.container = scene.add.container(x, y);
        this.createUI();
    }

    private createUI() {
        // Add Background Panel
        const bgWidth = BLOCK_SIZE * 7;
        const bgHeight = BLOCK_SIZE * 15;
        const bg = this.scene.add.rectangle(bgWidth/2 - BLOCK_SIZE*0.5, bgHeight/2 - BLOCK_SIZE*0.5, bgWidth, bgHeight, 0x000000, 0.5);
        bg.setStrokeStyle(2, 0xffffff);
        this.container.add(bg);

        // Text Styles with Stroke/Shadow for better visibility
        const commonStroke = '#000000';
        const commonThickness = 4;
        const commonShadow = { offsetX: 2, offsetY: 2, color: '#000000', blur: 2, stroke: true, fill: true };

        const headerStyle = {
             fontFamily: "Arial Black",
             fontSize: `${BLOCK_SIZE * 0.7}px`,
             color: "#ffffff",
             align: 'left'
        };

        const valueLargeStyle = {
             fontFamily: "Arial Black",
             fontSize: `${BLOCK_SIZE * 0.8}px`,
             color: "#ffffff",
             align: 'left'
        };

        const labelStyle = {
             fontFamily: "Arial Black",
             fontSize: `${BLOCK_SIZE * 0.5}px`,
             color: "#cccccc", // Slightly lighter gray for better contrast on black
             align: 'left'
        };

        const valueSmallStyle = {
             fontFamily: "Arial Black",
             fontSize: `${BLOCK_SIZE * 0.5}px`,
             color: "#ffffff",
             align: 'right',
        };

        let currentY = 0;

        // Helper to apply visibility styles
        const applyVisibility = (textObj: Phaser.GameObjects.Text) => {
            textObj.setStroke(commonStroke, commonThickness);
            textObj.setShadow(commonShadow.offsetX, commonShadow.offsetY, commonShadow.color, commonShadow.blur, commonShadow.stroke, commonShadow.fill);
            return textObj;
        };

        // SCORE
        const scoreLabel = this.scene.add.text(0, currentY, "SCORE", headerStyle);
        applyVisibility(scoreLabel);
        this.container.add(scoreLabel);
        currentY += BLOCK_SIZE;

        this.scoreValueText = this.scene.add.text(0, currentY, "0", valueLargeStyle);
        applyVisibility(this.scoreValueText);
        this.container.add(this.scoreValueText);
        currentY += BLOCK_SIZE * 1.5;

        // TIME
        const timeLabel = this.scene.add.text(0, currentY, "TIME", headerStyle);
        applyVisibility(timeLabel);
        this.container.add(timeLabel);
        currentY += BLOCK_SIZE;

        this.timeValueText = this.scene.add.text(0, currentY, "00:00.00", valueLargeStyle);
        applyVisibility(this.timeValueText);
        this.container.add(this.timeValueText);
        currentY += BLOCK_SIZE * 1.5;

        // Spacer
        currentY += BLOCK_SIZE * 0.5;

        // Stats Block 1: Lines, Level, Goal
        this.linesValueText = this.createStatRow(currentY, "LINES", labelStyle, valueSmallStyle, applyVisibility);
        currentY += BLOCK_SIZE * 0.8;
        this.levelValueText = this.createStatRow(currentY, "LEVEL", labelStyle, valueSmallStyle, applyVisibility);
        currentY += BLOCK_SIZE * 0.8;
        this.goalValueText = this.createStatRow(currentY, "GOAL", labelStyle, valueSmallStyle, applyVisibility);

        // Spacer
        currentY += BLOCK_SIZE * 1.5;

        // Stats Block 2: Tetrises, T-Spins, Combos, TPM, LPM
        this.tetrisesValueText = this.createStatRow(currentY, "TETRISES", labelStyle, valueSmallStyle, applyVisibility);
        currentY += BLOCK_SIZE * 0.8;
        this.tSpinsValueText = this.createStatRow(currentY, "T-SPINS", labelStyle, valueSmallStyle, applyVisibility);
        currentY += BLOCK_SIZE * 0.8;
        this.combosValueText = this.createStatRow(currentY, "COMBOS", labelStyle, valueSmallStyle, applyVisibility);
        currentY += BLOCK_SIZE * 0.8;
        this.tpmValueText = this.createStatRow(currentY, "TPM", labelStyle, valueSmallStyle, applyVisibility);
        currentY += BLOCK_SIZE * 0.8;
        this.lpmValueText = this.createStatRow(currentY, "LPM", labelStyle, valueSmallStyle, applyVisibility);
    }

    private createStatRow(y: number, label: string, labelStyle: any, valueStyle: any, styleApplicator: (t: Phaser.GameObjects.Text) => void): Phaser.GameObjects.Text {
        const labelText = this.scene.add.text(0, y, label, labelStyle);
        styleApplicator(labelText);

        // Assuming container width is around 6 blocks (192px).
        // Label on left, Value on right.
        const valueText = this.scene.add.text(BLOCK_SIZE * 6, y, "0", valueStyle).setOrigin(1, 0); // Right align origin
        styleApplicator(valueText);

        this.container.add(labelText);
        this.container.add(valueText);
        return valueText;
    }

    updateStats(stats: any) {
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

    // Deprecated/Compatibility methods to prevent crashes if I missed some calls
    setLevel(level: number) { /* No-op or redirect */ }
    setLine(cleared, nextGoal) { /* No-op */ }
    setScore(score: number) { /* No-op */ }
    setAction(action?: string) { /* No-op */ }
    setCombo(combo: number = -1) { /* No-op */ }
    clear() {
        this.updateStats({
            score: 0,
            time: "00:00.00",
            lines: 0,
            level: 1,
            goal: 5,
            tetrises: 0,
            tspins: 0,
            combos: 0,
            tpm: 0,
            lpm: 0
        });
    }
}

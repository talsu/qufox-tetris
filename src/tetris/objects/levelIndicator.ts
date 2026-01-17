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
             color: "#aaaaaa",
             align: 'left'
        };
        const valueSmallStyle = {
             fontFamily: "Arial Black",
             fontSize: `${BLOCK_SIZE * 0.5}px`,
             color: "#ffffff",
             align: 'right',
        };

        let currentY = 0;

        // SCORE
        this.container.add(this.scene.add.text(0, currentY, "SCORE", headerStyle));
        currentY += BLOCK_SIZE;
        this.scoreValueText = this.scene.add.text(0, currentY, "0", valueLargeStyle);
        this.container.add(this.scoreValueText);
        currentY += BLOCK_SIZE * 1.5;

        // TIME
        this.container.add(this.scene.add.text(0, currentY, "TIME", headerStyle));
        currentY += BLOCK_SIZE;
        this.timeValueText = this.scene.add.text(0, currentY, "00:00.00", valueLargeStyle);
        this.container.add(this.timeValueText);
        currentY += BLOCK_SIZE * 1.5;

        // Spacer
        currentY += BLOCK_SIZE * 0.5;

        // Stats Block 1: Lines, Level, Goal
        this.linesValueText = this.createStatRow(currentY, "LINES", labelStyle, valueSmallStyle);
        currentY += BLOCK_SIZE * 0.8;
        this.levelValueText = this.createStatRow(currentY, "LEVEL", labelStyle, valueSmallStyle);
        currentY += BLOCK_SIZE * 0.8;
        this.goalValueText = this.createStatRow(currentY, "GOAL", labelStyle, valueSmallStyle);

        // Spacer
        currentY += BLOCK_SIZE * 1.5;

        // Stats Block 2: Tetrises, T-Spins, Combos, TPM, LPM
        this.tetrisesValueText = this.createStatRow(currentY, "TETRISES", labelStyle, valueSmallStyle);
        currentY += BLOCK_SIZE * 0.8;
        this.tSpinsValueText = this.createStatRow(currentY, "T-SPINS", labelStyle, valueSmallStyle);
        currentY += BLOCK_SIZE * 0.8;
        this.combosValueText = this.createStatRow(currentY, "COMBOS", labelStyle, valueSmallStyle);
        currentY += BLOCK_SIZE * 0.8;
        this.tpmValueText = this.createStatRow(currentY, "TPM", labelStyle, valueSmallStyle);
        currentY += BLOCK_SIZE * 0.8;
        this.lpmValueText = this.createStatRow(currentY, "LPM", labelStyle, valueSmallStyle);
    }

    private createStatRow(y: number, label: string, labelStyle: any, valueStyle: any): Phaser.GameObjects.Text {
        const labelText = this.scene.add.text(0, y, label, labelStyle);
        // Assuming container width is around 6 blocks (192px).
        // Label on left, Value on right.
        const valueText = this.scene.add.text(BLOCK_SIZE * 6, y, "0", valueStyle).setOrigin(1, 0); // Right align origin

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

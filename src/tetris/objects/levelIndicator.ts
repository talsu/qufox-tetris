import {ObjectBase} from "./objectBase";
import {getBlockSize} from "../const/const";
const BLOCK_SIZE = getBlockSize();

export class LevelIndicator extends ObjectBase {
    private readonly container: Phaser.GameObjects.Container;
    private readonly levelText: Phaser.GameObjects.Text;
    private readonly lineText: Phaser.GameObjects.Text;
    private readonly scoreText: Phaser.GameObjects.Text;
    private readonly actionText: Phaser.GameObjects.Text;
    private readonly comboText: Phaser.GameObjects.Text;
    private actionTextShowEvent: Phaser.Time.TimerEvent;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene);
        // Create container.
        this.container = scene.add.container(x, y);
        const fontStyle = {
            fontFamily: "Arial Black",
            fontSize: BLOCK_SIZE,
            color: "#ffffff",
            thickness: BLOCK_SIZE/5
        };
        this.levelText = scene.add.text(0, 0, "Level 1", fontStyle);
        this.levelText.setStroke('#03396c', fontStyle.thickness);
        this.levelText.setShadow(2, 2, '#03396c', 0, true, false);
        this.container.add(this.levelText);

        this.lineText = scene.add.text(0, BLOCK_SIZE, "Goal 1", fontStyle);
        this.lineText.setStroke('#03396c', fontStyle.thickness);
        this.lineText.setShadow(2, 2, '#03396c', 0, true, false);
        this.container.add(this.lineText);

        this.scoreText = scene.add.text(0, BLOCK_SIZE*2, "Score 0", fontStyle);
        this.scoreText.setStroke('#03396c', fontStyle.thickness);
        this.scoreText.setShadow(2, 2, '#03396c', 0, true, false);
        this.container.add(this.scoreText);

        this.actionText = scene.add.text(0, BLOCK_SIZE*4, "", fontStyle);
        this.actionText.setStroke('#03396c', fontStyle.thickness);
        this.actionText.setShadow(2, 2, '#03396c', 0, true, false);
        this.container.add(this.actionText);

        this.comboText = scene.add.text(0, BLOCK_SIZE*5, "", fontStyle);
        this.comboText.setStroke('#03396c', fontStyle.thickness);
        this.comboText.setShadow(2, 2, '#03396c', 0, true, false);
        this.container.add(this.comboText);
    }

    setLevel(level: number) {
        this.levelText.setText(`Level ${level}`);
    }

    setLine(cleared, nextGoal) {
        this.lineText.setText(`Goal ${nextGoal - cleared}`);
    }

    setScore(score: number) {
        this.scoreText.setText(`Score ${score}`);
    }

    setAction(action?: string) {
        this.actionTextShowEvent?.destroy();
        this.actionTextShowEvent = null;

        this.actionText.setText(action || '');
        if (action) {
            this.actionTextShowEvent = this.scene.time.addEvent({
                delay: 3000,
                callback: () => {
                    this.actionText.setText('');
                },
                callbackScope: this
            });
        }
    }

    setCombo(combo: number = -1) {
        this.comboText.setText(combo > 0 ? `${combo} Combo` : '');
    }

    clear() {
        this.setLevel(1);
        this.setLine(0, 5);
        this.setScore(0);
        this.setAction();
        this.setCombo();
    }
}
import { TextStyles, createStyledText, drawPanelBackground } from "./uiStyles";

interface OverlayControlOptions {
    scene: Phaser.Scene;
    onMenuClick: () => void;
}

export class GameOverlayControls {
    private readonly scene: Phaser.Scene;
    private readonly onMenuClick: () => void;

    private root: Phaser.GameObjects.Container;
    private background: Phaser.GameObjects.Graphics;
    private label: Phaser.GameObjects.Text;
    private readonly width: number = 108;
    private readonly height: number = 40;

    constructor(options: OverlayControlOptions) {
        this.scene = options.scene;
        this.onMenuClick = options.onMenuClick;

        this.root = this.scene.add.container(0, 0).setDepth(3000);

        this.background = this.scene.add.graphics();
        this.drawDefault();

        this.label = createStyledText(
            this.scene,
            this.root,
            this.width / 2,
            this.height / 2,
            'MENU',
            { ...TextStyles.header, align: 'center', fontSize: '18px' },
            3,
        ).setOrigin(0.5);

        const hitArea = this.scene.add.rectangle(0, 0, this.width, this.height, 0x000000, 0);
        hitArea.setOrigin(0, 0);
        hitArea.setInteractive({ useHandCursor: true });
        hitArea.on('pointerdown', () => this.drawPressed());
        hitArea.on('pointerup', () => {
            this.drawDefault();
            this.onMenuClick();
        });
        hitArea.on('pointerout', () => this.drawDefault());

        this.root.add([this.background, hitArea, this.label]);
        this.layout();
    }

    public layout() {
        const cam = this.scene.cameras.main;
        const view = cam.worldView;
        this.root.setPosition(view.x + 12, view.y + 10);
    }

    public destroy() {
        this.root.destroy(true);
    }

    private drawDefault() {
        this.background.clear();
        drawPanelBackground(this.background, this.width, this.height);
        this.background.lineStyle(1, 0x67e8f9, 0.9);
        this.background.strokeRect(2, 2, this.width - 4, this.height - 4);
    }

    private drawPressed() {
        this.background.clear();
        drawPanelBackground(this.background, this.width, this.height);
        this.background.fillStyle(0x0f172a, 0.45);
        this.background.fillRect(0, 0, this.width, this.height);
        this.background.lineStyle(1, 0x67e8f9, 1);
        this.background.strokeRect(2, 2, this.width - 4, this.height - 4);
    }
}

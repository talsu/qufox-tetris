import { TextStyles, createStyledText, drawPanelBackground } from "./uiStyles";

interface OverlayControlOptions {
    scene: Phaser.Scene;
    onMenuClick: () => void;
}

export class GameOverlayControls {
    private readonly scene: Phaser.Scene;
    private readonly onMenuClick: () => void;

    private root: Phaser.GameObjects.Container;
    private menuButton: Phaser.GameObjects.Container;
    private hitArea: Phaser.GameObjects.Zone;

    constructor(options: OverlayControlOptions) {
        this.scene = options.scene;
        this.onMenuClick = options.onMenuClick;

        this.root = this.scene.add.container(0, 0).setDepth(3000);
        this.root.setScrollFactor(0);

        this.menuButton = this.createMenuButton();
        this.root.add(this.menuButton);

        this.layout();
    }

    public layout() {
        this.menuButton.setPosition(16, 16);
    }

    public destroy() {
        this.root.destroy(true);
    }

    private createMenuButton(): Phaser.GameObjects.Container {
        const width = 108;
        const height = 40;
        const button = this.scene.add.container(0, 0);

        const bg = this.scene.add.graphics();
        drawPanelBackground(bg, width, height);

        // HOLD/NEXT 스타일과 어울리도록 강조 라인 추가
        bg.lineStyle(1, 0x67e8f9, 0.9);
        bg.strokeRect(2, 2, width - 4, height - 4);

        const label = createStyledText(
            this.scene,
            button,
            width / 2,
            height / 2,
            'MENU',
            { ...TextStyles.header, align: 'center', fontSize: '18px' },
            3,
        );
        label.setOrigin(0.5);

        this.hitArea = this.scene.add.zone(0, 0, width, height).setOrigin(0);
        this.hitArea.setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                bg.clear();
                drawPanelBackground(bg, width, height);
                bg.fillStyle(0x0f172a, 0.45);
                bg.fillRect(0, 0, width, height);
                bg.lineStyle(1, 0x67e8f9, 1);
                bg.strokeRect(2, 2, width - 4, height - 4);
                this.onMenuClick();
            })
            .on('pointerup', () => {
                bg.clear();
                drawPanelBackground(bg, width, height);
                bg.lineStyle(1, 0x67e8f9, 0.9);
                bg.strokeRect(2, 2, width - 4, height - 4);
            })
            .on('pointerout', () => {
                bg.clear();
                drawPanelBackground(bg, width, height);
                bg.lineStyle(1, 0x67e8f9, 0.9);
                bg.strokeRect(2, 2, width - 4, height - 4);
            });

        button.add([bg, this.hitArea]);
        return button;
    }
}

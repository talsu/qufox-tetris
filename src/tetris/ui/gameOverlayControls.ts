import { PANEL_BG, TextStyles } from "./uiStyles";
import { getBlockSize } from "../const/const";

interface OverlayControlOptions {
    scene: Phaser.Scene;
    onMenuClick: () => void;
}

type GuidePartKind = 'action' | 'key' | 'sep';

interface GuidePart {
    text: string;
    kind: GuidePartKind;
}

export class GameOverlayControls {
    private readonly scene: Phaser.Scene;
    private readonly onMenuClick: () => void;

    private root: Phaser.GameObjects.Container;
    private navBackground: Phaser.GameObjects.Graphics;
    private menuBackground: Phaser.GameObjects.Graphics;
    private menuLabel: Phaser.GameObjects.Text;
    private guideContainer: Phaser.GameObjects.Container;
    private guideTexts: Phaser.GameObjects.Text[] = [];
    private menuHitArea: Phaser.GameObjects.Rectangle;

    private menuPressed: boolean = false;
    private destroyed: boolean = false;

    constructor(options: OverlayControlOptions) {
        this.scene = options.scene;
        this.onMenuClick = options.onMenuClick;

        this.root = this.scene.add.container(0, 0).setDepth(3000);

        this.navBackground = this.scene.add.graphics();
        this.menuBackground = this.scene.add.graphics();

        this.menuLabel = this.scene.add.text(0, 0, 'MENU', {
            ...TextStyles.header,
            align: 'center',
            fontSize: '16px',
            color: '#f8fdff',
        }).setOrigin(0.5);
        this.menuLabel.setStroke('#00111f', 2);
        this.menuLabel.setShadow(1, 1, '#00111f', 1, true, true);

        this.guideContainer = this.scene.add.container(0, 0);

        this.menuHitArea = this.scene.add.rectangle(0, 0, 1, 1, 0x000000, 0);
        this.menuHitArea.setOrigin(0, 0);
        this.menuHitArea.setInteractive({ useHandCursor: true });
        this.menuHitArea.on('pointerdown', () => {
            this.menuPressed = true;
            this.drawMenuButton();
        });
        this.menuHitArea.on('pointerup', () => {
            this.menuPressed = false;
            this.drawMenuButton();
            this.onMenuClick();
        });
        this.menuHitArea.on('pointerout', () => {
            this.menuPressed = false;
            this.drawMenuButton();
        });

        this.root.add([this.navBackground, this.menuBackground, this.menuHitArea, this.menuLabel, this.guideContainer]);
        this.layout();
    }

    public layout() {
        if (this.destroyed || !this.menuHitArea.scene) {
            return;
        }

        const cam = this.scene.cameras.main;
        cam.preRender();

        const zoom = cam.zoom || 1;
        const worldPerPixel = 1 / zoom;
        const viewX = cam.worldView.x;
        const viewY = cam.worldView.y;
        const viewWidthPx = cam.width;

        const isMobilePortrait = this.resolveIsMobilePortrait();
        const barHeightPx = Math.round(getBlockSize() * 1.5);

        const horizontalPaddingPx = Math.max(8, Math.round(barHeightPx * 0.35));
        const verticalPaddingPx = Math.max(2, Math.round(barHeightPx * 0.12));
        const menuHeightPx = Math.max(18, barHeightPx - verticalPaddingPx * 2);
        const menuWidthPx = Math.max(56, Math.round(menuHeightPx * 2.45));

        const menuFontSizePx = Math.max(11, Math.round(menuHeightPx * 0.52));
        this.menuLabel.setFontSize(`${Math.round(menuFontSizePx * worldPerPixel)}px`);

        const guideFontSizePx = isMobilePortrait
            ? Math.max(10, Math.round(menuHeightPx * 0.45))
            : Math.max(13, Math.round(menuHeightPx * 0.5));

        const barHeight = barHeightPx * worldPerPixel;
        const horizontalPadding = horizontalPaddingPx * worldPerPixel;
        const verticalPadding = verticalPaddingPx * worldPerPixel;
        const menuHeight = menuHeightPx * worldPerPixel;
        const menuWidth = menuWidthPx * worldPerPixel;
        const viewWidth = viewWidthPx * worldPerPixel;

        this.root.setPosition(viewX, viewY);
        this.drawNavBar(viewWidth, barHeight);

        this.menuHitArea.setPosition(horizontalPadding, verticalPadding);
        this.menuHitArea.setSize(menuWidth, menuHeight);
        this.menuLabel.setPosition(horizontalPadding + menuWidth / 2, barHeight / 2);
        this.drawMenuButton();

        const availableGuideWidth = Math.max(80 * worldPerPixel, viewWidth - (horizontalPadding * 3 + menuWidth));
        const guideParts = this.resolveGuideParts(isMobilePortrait, viewWidthPx);
        this.renderGuide(guideParts, guideFontSizePx * worldPerPixel, availableGuideWidth);
        this.guideContainer.setPosition(viewWidth - horizontalPadding, barHeight / 2);
    }

    public destroy() {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;
        this.root.destroy(true);
    }

    private drawNavBar(width: number, height: number) {
        if (this.destroyed) {
            return;
        }
        this.navBackground.clear();
        this.navBackground.fillStyle(PANEL_BG.fillColor, PANEL_BG.fillAlpha);
        this.navBackground.fillRect(0, 0, width, height);
    }

    private drawMenuButton() {
        if (this.destroyed || !this.menuHitArea.scene) {
            return;
        }

        const x = this.menuHitArea.x;
        const y = this.menuHitArea.y;
        const width = this.menuHitArea.width;
        const height = this.menuHitArea.height;
        const radius = Math.max(4, Math.round(height * 0.24));

        this.menuBackground.clear();

        const baseColor = this.menuPressed ? 0x0b3d59 : 0x0f5f82;
        const innerColor = this.menuPressed ? 0x155272 : 0x1b749d;

        this.menuBackground.fillStyle(baseColor, 1);
        this.menuBackground.fillRoundedRect(x, y, width, height, radius);

        this.menuBackground.fillStyle(innerColor, this.menuPressed ? 0.85 : 0.9);
        this.menuBackground.fillRoundedRect(x + 2, y + 2, Math.max(1, width - 4), Math.max(1, height - 4), Math.max(2, radius - 2));

        this.menuBackground.fillStyle(0xffffff, this.menuPressed ? 0.08 : 0.16);
        this.menuBackground.fillRoundedRect(
            x + 3,
            y + 3,
            Math.max(1, width - 6),
            Math.max(1, (height - 6) * 0.45),
            Math.max(2, radius - 3),
        );

        this.menuBackground.lineStyle(2, 0xbef8ff, this.menuPressed ? 0.85 : 0.95);
        this.menuBackground.strokeRoundedRect(x + 1, y + 1, Math.max(1, width - 2), Math.max(1, height - 2), Math.max(2, radius - 1));

        this.menuBackground.lineStyle(1, 0x062334, this.menuPressed ? 0.65 : 0.5);
        this.menuBackground.strokeRoundedRect(x + 3, y + 3, Math.max(1, width - 6), Math.max(1, height - 6), Math.max(2, radius - 3));

        if (!this.menuPressed) {
            this.menuBackground.lineStyle(1, 0x67e8f9, 0.28);
            this.menuBackground.strokeRoundedRect(x - 1, y - 1, width + 2, height + 2, radius + 1);
        }

        this.menuLabel.setColor(this.menuPressed ? '#dbeafe' : '#f0fbff');
        this.menuLabel.setPosition(x + width / 2, y + height / 2 + (this.menuPressed ? 1 : 0));
        this.root.bringToTop(this.menuLabel);
    }

    private resolveGuideParts(isMobilePortrait: boolean, viewWidth: number): GuidePart[] {
        if (isMobilePortrait) {
            return [
                { text: 'Move ', kind: 'action' },
                { text: '← →', kind: 'key' },
                { text: '  |  ', kind: 'sep' },
                { text: 'Drop ', kind: 'action' },
                { text: '↓', kind: 'key' },
                { text: '  |  ', kind: 'sep' },
                { text: 'Rotate ', kind: 'action' },
                { text: 'Tap', kind: 'key' },
            ];
        }
        if (viewWidth < 860) {
            return [
                { text: 'Move ', kind: 'action' },
                { text: '← →', kind: 'key' },
                { text: '  |  ', kind: 'sep' },
                { text: 'Rotate ', kind: 'action' },
                { text: 'Z X', kind: 'key' },
                { text: '  |  ', kind: 'sep' },
                { text: 'Drop ', kind: 'action' },
                { text: 'Space', kind: 'key' },
                { text: '  |  ', kind: 'sep' },
                { text: 'Hold ', kind: 'action' },
                { text: 'C', kind: 'key' },
            ];
        }
        return [
            { text: 'Move ', kind: 'action' },
            { text: '← →', kind: 'key' },
            { text: '  |  ', kind: 'sep' },
            { text: 'Rotate ', kind: 'action' },
            { text: 'Z X', kind: 'key' },
            { text: '  |  ', kind: 'sep' },
            { text: 'Drop ', kind: 'action' },
            { text: 'Space', kind: 'key' },
            { text: '  |  ', kind: 'sep' },
            { text: 'Hold ', kind: 'action' },
            { text: 'C', kind: 'key' },
        ];
    }

    private resolveIsMobilePortrait(): boolean {
        const w = window.innerWidth;
        const h = window.innerHeight;
        return Math.min(w, h) < 768 && w < h;
    }

    private renderGuide(parts: GuidePart[], fontSize: number, availableWidth: number) {
        for (const t of this.guideTexts) {
            t.destroy();
        }
        this.guideTexts = [];
        this.guideContainer.removeAll(true);

        let cursorX = 0;
        for (const part of parts) {
            const style = this.getGuideStyle(part.kind, fontSize);
            const textObj = this.scene.add.text(0, 0, part.text, style).setOrigin(0, 0.5);
            this.guideContainer.add(textObj);
            textObj.setPosition(cursorX, 0);
            cursorX += textObj.width;
            this.guideTexts.push(textObj);
        }

        const totalWidth = cursorX;
        const scaleX = totalWidth > availableWidth ? Math.max(0.62, availableWidth / totalWidth) : 1;
        this.guideContainer.setScale(scaleX, 1);

        for (const textObj of this.guideTexts) {
            textObj.setX(textObj.x - totalWidth);
        }
    }

    private getGuideStyle(kind: GuidePartKind, fontSize: number): Phaser.Types.GameObjects.Text.TextStyle {
        if (kind === 'key') {
            return {
                ...TextStyles.header,
                fontSize: `${Math.max(8, Math.round(fontSize))}px`,
                color: '#67e8f9',
                align: 'left',
                stroke: '#020b14',
                strokeThickness: 2,
                shadow: {
                    offsetX: 1,
                    offsetY: 1,
                    color: '#000000',
                    blur: 1,
                    stroke: true,
                    fill: true,
                },
            };
        }
        if (kind === 'sep') {
            return {
                ...TextStyles.label,
                fontSize: `${Math.max(8, Math.round(fontSize * 0.9))}px`,
                color: '#94a3b8',
                align: 'left',
                stroke: '#050b12',
                strokeThickness: 1,
                shadow: {
                    offsetX: 1,
                    offsetY: 1,
                    color: '#000000',
                    blur: 1,
                    stroke: true,
                    fill: true,
                },
            };
        }
        return {
            ...TextStyles.label,
            fontSize: `${Math.max(8, Math.round(fontSize * 0.92))}px`,
            color: '#e2e8f0',
            align: 'left',
            stroke: '#050b12',
            strokeThickness: 1,
            shadow: {
                offsetX: 1,
                offsetY: 1,
                color: '#000000',
                blur: 1,
                stroke: true,
                fill: true,
            },
        };
    }
}

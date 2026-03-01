import { PANEL_BG, TextStyles } from "./uiStyles";
import { getBlockSize } from "../const/const";

interface OverlayControlOptions {
    scene: Phaser.Scene;
    onMenuClick: () => void;
    onCopyJoinUrlClick?: () => void;
}

type GuidePartKind = 'action' | 'key' | 'sep';

interface GuidePart {
    text: string;
    kind: GuidePartKind;
}

export class GameOverlayControls {
    private readonly scene: Phaser.Scene;
    private readonly onMenuClick: () => void;
    private readonly onCopyJoinUrlClick: (() => void) | null;

    private root: Phaser.GameObjects.Container;
    private navBackground: Phaser.GameObjects.Graphics;
    private menuBackground: Phaser.GameObjects.Graphics;
    private menuLabel: Phaser.GameObjects.Text;
    private copyJoinBackground: Phaser.GameObjects.Graphics;
    private copyJoinLabel: Phaser.GameObjects.Text;
    private guideContainer: Phaser.GameObjects.Container;
    private guideTexts: Phaser.GameObjects.Text[] = [];
    private menuHitArea: Phaser.GameObjects.Rectangle;
    private copyJoinHitArea: Phaser.GameObjects.Rectangle;
    private copyToastContainer: Phaser.GameObjects.Container;
    private copyToastBg: Phaser.GameObjects.Graphics;
    private copyToastLabel: Phaser.GameObjects.Text;
    private copyToastTimer: Phaser.Time.TimerEvent | null = null;

    private menuPressed: boolean = false;
    private copyJoinPressed: boolean = false;
    private destroyed: boolean = false;

    constructor(options: OverlayControlOptions) {
        this.scene = options.scene;
        this.onMenuClick = options.onMenuClick;
        this.onCopyJoinUrlClick = options.onCopyJoinUrlClick ?? null;

        this.root = this.scene.add.container(0, 0).setDepth(3000);

        this.navBackground = this.scene.add.graphics();
        this.menuBackground = this.scene.add.graphics();
        this.copyJoinBackground = this.scene.add.graphics();

        this.menuLabel = this.scene.add.text(0, 0, 'MENU', {
            ...TextStyles.header,
            align: 'center',
            fontSize: '16px',
            color: '#f8fdff',
        }).setOrigin(0.5);
        this.menuLabel.setStroke('#00111f', 2);
        this.menuLabel.setShadow(1, 1, '#00111f', 1, true, true);

        this.copyJoinLabel = this.scene.add.text(0, 0, 'Copy Join URL', {
            ...TextStyles.header,
            align: 'center',
            fontSize: '13px',
            color: '#f8fdff',
        }).setOrigin(0.5);
        this.copyJoinLabel.setStroke('#00111f', 2);
        this.copyJoinLabel.setShadow(1, 1, '#00111f', 1, true, true);
        this.copyJoinLabel.setVisible(Boolean(this.onCopyJoinUrlClick));

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

        this.copyJoinHitArea = this.scene.add.rectangle(0, 0, 1, 1, 0x000000, 0);
        this.copyJoinHitArea.setOrigin(0, 0);
        this.copyJoinHitArea.setVisible(Boolean(this.onCopyJoinUrlClick));
        if (this.onCopyJoinUrlClick) {
            this.copyJoinHitArea.setInteractive({ useHandCursor: true });
            this.copyJoinHitArea.on('pointerdown', () => {
                this.copyJoinPressed = true;
                this.drawCopyJoinButton();
            });
            this.copyJoinHitArea.on('pointerup', () => {
                this.copyJoinPressed = false;
                this.drawCopyJoinButton();
                this.onCopyJoinUrlClick?.();
            });
            this.copyJoinHitArea.on('pointerout', () => {
                this.copyJoinPressed = false;
                this.drawCopyJoinButton();
            });
        }

        this.copyToastBg = this.scene.add.graphics();
        this.copyToastLabel = this.scene.add.text(0, 0, 'URL Copied', {
            ...TextStyles.label,
            align: 'center',
            fontSize: '14px',
            color: '#e2e8f0',
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
        }).setOrigin(0.5);
        this.copyToastContainer = this.scene.add.container(0, 0, [this.copyToastBg, this.copyToastLabel]).setVisible(false);

        this.root.add([
            this.navBackground,
            this.menuBackground,
            this.copyJoinBackground,
            this.menuHitArea,
            this.copyJoinHitArea,
            this.menuLabel,
            this.copyJoinLabel,
            this.guideContainer,
            this.copyToastContainer,
        ]);
        this.layout();
    }

    public layout() {
        if (this.destroyed || !this.menuHitArea.scene) {
            return;
        }

        const cam = this.scene.cameras.main;
        cam.preRender();

        const zoom = cam.zoom || 1;
        const viewX = cam.worldView.x;
        const viewY = cam.worldView.y;
        const viewWidthPx = cam.width;
        const viewWidth = cam.width / zoom;

        const isMobilePortrait = this.resolveIsMobilePortrait();
        const barHeight = getBlockSize() * 1.6;
        const horizontalPadding = barHeight * 0.22;
        const verticalPadding = barHeight * 0.12;
        const menuHeight = Math.max(1, barHeight - verticalPadding * 2);
        const menuWidth = Math.min(menuHeight * 2.45, Math.max(menuHeight * 1.9, viewWidth * 0.18));

        const menuFontSize = Math.max(10, Math.round(menuHeight * 0.46));
        this.menuLabel.setFontSize(`${menuFontSize}px`);

        const copyJoinWidth = this.onCopyJoinUrlClick
            ? Math.max(menuHeight * 3.2, Math.min(viewWidth * 0.32, menuHeight * 4.9))
            : 0;
        const copyJoinGap = this.onCopyJoinUrlClick ? Math.max(4, Math.round(menuHeight * 0.14)) : 0;
        const copyJoinFontSize = Math.max(9, Math.round(menuHeight * 0.33));
        this.copyJoinLabel.setFontSize(`${copyJoinFontSize}px`);

        const guideFontSize = isMobilePortrait
            ? Math.max(9, Math.round(menuHeight * 0.34))
            : Math.max(11, Math.round(menuHeight * 0.40));

        this.root.setPosition(viewX, viewY);
        this.drawNavBar(viewWidth, barHeight);

        this.menuHitArea.setPosition(horizontalPadding, verticalPadding);
        this.menuHitArea.setSize(menuWidth, menuHeight);
        this.menuLabel.setPosition(horizontalPadding + menuWidth / 2, barHeight / 2);
        this.drawMenuButton();

        if (this.onCopyJoinUrlClick) {
            const copyX = horizontalPadding + menuWidth + copyJoinGap;
            this.copyJoinHitArea.setPosition(copyX, verticalPadding);
            this.copyJoinHitArea.setSize(copyJoinWidth, menuHeight);
            this.copyJoinLabel.setPosition(copyX + copyJoinWidth / 2, barHeight / 2);
            this.drawCopyJoinButton();
        }

        const availableGuideWidth = Math.max(
            getBlockSize() * 2.5,
            viewWidth - (horizontalPadding * 3 + menuWidth + copyJoinGap + copyJoinWidth),
        );
        const guideParts = this.resolveGuideParts(isMobilePortrait, viewWidthPx);
        this.renderGuide(guideParts, guideFontSize, availableGuideWidth);
        this.guideContainer.setPosition(viewWidth - horizontalPadding, barHeight / 2);
        this.layoutCopyToast(viewWidth, barHeight);
    }

    public showCopyToast(): void {
        if (this.destroyed || !this.copyToastContainer.scene) {
            return;
        }

        if (this.copyToastTimer) {
            this.copyToastTimer.remove(false);
            this.copyToastTimer = null;
        }

        this.copyToastContainer.setAlpha(1);
        this.copyToastContainer.setVisible(true);
        this.copyToastTimer = this.scene.time.delayedCall(1050, () => {
            this.scene.tweens.add({
                targets: this.copyToastContainer,
                alpha: 0,
                duration: 180,
                onComplete: () => {
                    this.copyToastContainer.setVisible(false);
                    this.copyToastContainer.setAlpha(1);
                },
            });
        });
    }

    public destroy() {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;
        if (this.copyToastTimer) {
            this.copyToastTimer.remove(false);
            this.copyToastTimer = null;
        }
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

        this.drawControlButton({
            background: this.menuBackground,
            label: this.menuLabel,
            hitArea: this.menuHitArea,
            pressed: this.menuPressed,
        });
    }

    private drawCopyJoinButton() {
        if (this.destroyed || !this.copyJoinHitArea.scene || !this.onCopyJoinUrlClick) {
            return;
        }

        this.drawControlButton({
            background: this.copyJoinBackground,
            label: this.copyJoinLabel,
            hitArea: this.copyJoinHitArea,
            pressed: this.copyJoinPressed,
        });
    }

    private drawControlButton(options: {
        background: Phaser.GameObjects.Graphics;
        label: Phaser.GameObjects.Text;
        hitArea: Phaser.GameObjects.Rectangle;
        pressed: boolean;
    }): void {
        const x = options.hitArea.x;
        const y = options.hitArea.y;
        const width = options.hitArea.width;
        const height = options.hitArea.height;
        const radius = Math.max(4, Math.round(height * 0.24));
        const insetA = Math.max(1, Math.round(height * 0.06));
        const insetB = insetA + Math.max(1, Math.round(height * 0.04));

        options.background.clear();

        const baseColor = options.pressed ? 0x0b3d59 : 0x0f5f82;
        const innerColor = options.pressed ? 0x155272 : 0x1b749d;

        options.background.fillStyle(baseColor, 1);
        options.background.fillRoundedRect(x, y, width, height, radius);

        options.background.fillStyle(innerColor, options.pressed ? 0.85 : 0.9);
        options.background.fillRoundedRect(
            x + insetA,
            y + insetA,
            Math.max(1, width - insetA * 2),
            Math.max(1, height - insetA * 2),
            Math.max(2, radius - insetA),
        );

        options.background.fillStyle(0xffffff, options.pressed ? 0.08 : 0.16);
        options.background.fillRoundedRect(
            x + insetB,
            y + insetB,
            Math.max(1, width - insetB * 2),
            Math.max(1, (height - insetB * 2) * 0.45),
            Math.max(2, radius - insetB),
        );

        options.background.lineStyle(2, 0xbef8ff, options.pressed ? 0.85 : 0.95);
        options.background.strokeRoundedRect(
            x + insetA / 2,
            y + insetA / 2,
            Math.max(1, width - insetA),
            Math.max(1, height - insetA),
            Math.max(2, radius - insetA / 2),
        );

        options.background.lineStyle(1, 0x062334, options.pressed ? 0.65 : 0.5);
        options.background.strokeRoundedRect(
            x + insetB,
            y + insetB,
            Math.max(1, width - insetB * 2),
            Math.max(1, height - insetB * 2),
            Math.max(2, radius - insetB),
        );

        if (!options.pressed) {
            options.background.lineStyle(1, 0x67e8f9, 0.28);
            options.background.strokeRoundedRect(x - insetA / 2, y - insetA / 2, width + insetA, height + insetA, radius + insetA / 2);
        }

        options.label.setColor(options.pressed ? '#dbeafe' : '#f0fbff');
        options.label.setPosition(x + width / 2, y + height / 2 + (options.pressed ? Math.max(1, insetA * 0.5) : 0));
        this.root.bringToTop(options.label);
    }

    private layoutCopyToast(viewWidth: number, barHeight: number): void {
        if (this.destroyed || !this.copyToastContainer.scene) {
            return;
        }
        const toastWidth = Math.max(120, Math.min(220, viewWidth * 0.3));
        const toastHeight = Math.max(24, Math.round(barHeight * 0.75));
        const toastX = Math.round(viewWidth / 2);
        const toastY = Math.round(barHeight + toastHeight * 0.62);

        this.copyToastBg.clear();
        this.copyToastBg.fillStyle(PANEL_BG.fillColor, 0.95);
        this.copyToastBg.fillRoundedRect(-toastWidth / 2, -toastHeight / 2, toastWidth, toastHeight, 6);
        this.copyToastBg.lineStyle(2, PANEL_BG.strokeColor, PANEL_BG.strokeAlpha);
        this.copyToastBg.strokeRoundedRect(-toastWidth / 2, -toastHeight / 2, toastWidth, toastHeight, 6);

        this.copyToastLabel.setFontSize(`${Math.max(11, Math.round(toastHeight * 0.48))}px`);
        this.copyToastLabel.setPosition(0, 0);
        this.copyToastContainer.setPosition(toastX, toastY);
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

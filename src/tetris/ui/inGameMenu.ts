import { GAME_FONT_FAMILY } from './uiStyles';
import { KENNEY_UI_IMAGE_KEYS } from './kenneyAssets';

export interface MenuCallbacks {
    onResume: () => void;
    onExit: () => void;
    onRestart: () => void;
    onToggleBackground: () => boolean;
    getBackgroundVisible: () => boolean;
}

type MenuButtonKind = 'blue' | 'green' | 'red';
type MenuButtonState = 'normal' | 'hover' | 'pressed';

interface MenuButton {
    key: string;
    background: Phaser.GameObjects.Image;
    label: Phaser.GameObjects.Text;
    hitArea: Phaser.GameObjects.Rectangle;
    kind: MenuButtonKind;
    state: MenuButtonState;
    onClick: () => void;
}

export class InGameMenu {
    private readonly scene: Phaser.Scene;
    private readonly callbacks: MenuCallbacks;

    private readonly root: Phaser.GameObjects.Container;
    private readonly backdrop: Phaser.GameObjects.Rectangle;
    private readonly panelBg: Phaser.GameObjects.Graphics;
    private readonly panelInner: Phaser.GameObjects.Graphics;
    private readonly panelBorder: Phaser.GameObjects.Graphics;
    private readonly divider: Phaser.GameObjects.Graphics;
    private readonly titleText: Phaser.GameObjects.Text;
    private readonly scoreText: Phaser.GameObjects.Text;

    private buttons: MenuButton[] = [];
    private menuMode: 'pause' | 'endgame' | null = null;
    private destroyed: boolean = false;

    public isMenuOpen: boolean = false;
    public isGameEnded: boolean = false;

    constructor(scene: Phaser.Scene, callbacks: MenuCallbacks) {
        this.scene = scene;
        this.callbacks = callbacks;

        this.root = this.scene.add.container(0, 0).setDepth(10000).setVisible(false);
        this.backdrop = this.scene.add.rectangle(0, 0, 1, 1, 0x0b1635, 0.78).setOrigin(0);
        this.backdrop.setInteractive();

        this.panelBg = this.scene.add.graphics();
        this.panelInner = this.scene.add.graphics();
        this.panelBorder = this.scene.add.graphics();
        this.divider = this.scene.add.graphics();

        this.titleText = this.scene.add.text(0, 0, 'PAUSED', {
            fontFamily: GAME_FONT_FAMILY,
            fontSize: '64px',
            color: '#ffffff',
            fontStyle: 'bold',
        }).setOrigin(0.5, 0);
        this.titleText.setStroke('#3559a5', 8);

        this.scoreText = this.scene.add.text(0, 0, '', {
            fontFamily: GAME_FONT_FAMILY,
            fontSize: '34px',
            color: '#1e376a',
            fontStyle: 'bold',
        }).setOrigin(0.5, 0.5);
        this.scoreText.setVisible(false);

        this.root.add([
            this.backdrop,
            this.panelBg,
            this.panelInner,
            this.panelBorder,
            this.divider,
            this.titleText,
            this.scoreText,
        ]);
    }

    public togglePauseMenu(): void {
        if (this.destroyed) return;
        if (this.isGameEnded) return;

        this.isMenuOpen = !this.isMenuOpen;
        if (this.isMenuOpen) {
            this.showPauseMenu();
            return;
        }
        this.hideMenu();
    }

    public showEndGame(mainText: string, color: string, score?: number): void {
        if (this.destroyed) return;
        this.isGameEnded = true;
        this.isMenuOpen = true;
        this.menuMode = 'endgame';

        this.clearButtons();
        this.root.setVisible(true);

        this.titleText.setText(mainText);
        this.titleText.setStroke(color, 8);

        if (score !== undefined) {
            this.scoreText.setVisible(true);
            this.scoreText.setText(`SCORE: ${score}`);
        } else {
            this.scoreText.setVisible(false);
        }

        this.buttons = [
            this.createButton('restart', 'RESTART', 'green', () => this.callbacks.onRestart()),
            this.createButton('exit', 'EXIT', 'red', () => this.callbacks.onExit()),
        ];

        this.layout();
    }

    public hideMenu(): void {
        if (this.destroyed) return;
        this.isMenuOpen = false;
        this.root.setVisible(false);
        this.menuMode = null;
        this.clearButtons();
    }

    public resetState(): void {
        if (this.destroyed) return;
        this.hideMenu();
        this.isMenuOpen = false;
        this.isGameEnded = false;
        this.titleText.setStroke('#3559a5', 8);
        this.scoreText.setVisible(false);
    }

    public layout(): void {
        if (this.destroyed || !this.root.scene || !this.backdrop.scene) {
            return;
        }
        if (!this.root.visible && !this.isMenuOpen) {
            return;
        }

        const cam = this.scene.cameras.main;
        cam.preRender();
        const worldPerPixel = 1 / (cam.zoom || 1);
        const viewX = cam.worldView.x;
        const viewY = cam.worldView.y;
        const viewWidthPx = cam.width;
        const viewHeightPx = cam.height;
        const viewWidth = viewWidthPx * worldPerPixel;
        const viewHeight = viewHeightPx * worldPerPixel;

        this.root.setPosition(viewX, viewY);
        this.backdrop.setPosition(0, 0);
        this.backdrop.setSize(viewWidth, viewHeight);

        const isPortrait = viewHeightPx > viewWidthPx;
        const panelWidthPx = isPortrait ? Math.min(viewWidthPx * 0.86, 460) : Math.min(viewWidthPx * 0.6, 620);
        const panelHeightPx = this.menuMode === 'pause'
            ? (isPortrait ? Math.min(viewHeightPx * 0.74, 520) : Math.min(viewHeightPx * 0.8, 540))
            : (isPortrait ? Math.min(viewHeightPx * 0.72, 500) : Math.min(viewHeightPx * 0.74, 500));
        const panelWidth = panelWidthPx * worldPerPixel;
        const panelHeight = panelHeightPx * worldPerPixel;
        const panelX = (viewWidth - panelWidth) / 2;
        const panelY = (viewHeight - panelHeight) / 2;

        this.drawPanel(panelX, panelY, panelWidth, panelHeight);

        const titleSize = Math.round((isPortrait ? 42 : 56) * worldPerPixel);
        this.titleText.setFontSize(titleSize);
        this.titleText.setPosition(panelX + panelWidth / 2, panelY + 28 * worldPerPixel);

        const dividerY = panelY + 120 * worldPerPixel;
        this.drawDivider(panelX + 36 * worldPerPixel, dividerY, panelWidth - 72 * worldPerPixel, 6 * worldPerPixel);

        if (this.scoreText.visible) {
            this.scoreText.setFontSize(Math.round(28 * worldPerPixel));
            this.scoreText.setPosition(panelX + panelWidth / 2, panelY + 170 * worldPerPixel);
        }

        const buttonsTop = this.scoreText.visible ? panelY + 220 * worldPerPixel : panelY + 165 * worldPerPixel;
        const minButtonHeight = 44 * worldPerPixel;
        const buttonHeight = Math.max(minButtonHeight, Math.round((isPortrait ? 58 : 62) * worldPerPixel));
        const buttonWidth = panelWidth - 90 * worldPerPixel;
        const minButtonGap = 10 * worldPerPixel;
        const buttonGap = Math.max(minButtonGap, Math.round(16 * worldPerPixel));

        this.buttons.forEach((button, idx) => {
            const x = panelX + (panelWidth - buttonWidth) / 2;
            const y = buttonsTop + idx * (buttonHeight + buttonGap);
            this.layoutButton(button, x, y, buttonWidth, buttonHeight);
        });
    }

    public destroy(): void {
        if (this.destroyed) return;
        this.destroyed = true;
        this.clearButtons();
        this.root.destroy(true);
    }

    private showPauseMenu(): void {
        this.menuMode = 'pause';
        this.root.setVisible(true);
        this.clearButtons();

        this.titleText.setText('PAUSED');
        this.titleText.setStroke('#3559a5', 8);
        this.scoreText.setVisible(false);

        const backgroundVisible = this.callbacks.getBackgroundVisible();
        const bgLabel = `BACKGROUND: ${backgroundVisible ? 'ON' : 'OFF'}`;

        this.buttons = [
            this.createButton('resume', 'RESUME', 'blue', () => this.callbacks.onResume()),
            this.createButton('bg', bgLabel, 'blue', () => {
                const isOn = this.callbacks.onToggleBackground();
                const target = this.buttons.find((button) => button.key === 'bg');
                if (target) {
                    target.label.setText(`BACKGROUND: ${isOn ? 'ON' : 'OFF'}`);
                    this.layout();
                }
            }),
            this.createButton('exit', 'EXIT GAME', 'red', () => this.callbacks.onExit()),
        ];

        this.layout();
    }

    private createButton(key: string, text: string, kind: MenuButtonKind, onClick: () => void): MenuButton {
        const background = this.scene.add.image(0, 0, this.resolveButtonTexture(kind, 'normal')).setOrigin(0);

        const hitArea = this.scene.add.rectangle(0, 0, 1, 1, 0x000000, 0.001).setOrigin(0);
        hitArea.setInteractive({ useHandCursor: true });

        const label = this.scene.add.text(0, 0, text, {
            fontFamily: GAME_FONT_FAMILY,
            fontSize: '30px',
            color: '#ffffff',
            fontStyle: 'bold',
            align: 'center',
        }).setOrigin(0.5);
        label.setStroke('#163670', 4);

        hitArea.on('pointerdown', () => {
            this.setButtonState(button, 'pressed');
        });
        hitArea.on('pointerover', () => {
            if (button.state !== 'pressed') this.setButtonState(button, 'hover');
        });
        hitArea.on('pointerup', () => {
            this.setButtonState(button, 'hover');
            onClick();
        });
        hitArea.on('pointerout', () => {
            this.setButtonState(button, 'normal');
        });

        const button: MenuButton = { key, background, label, hitArea, kind, state: 'normal', onClick };
        this.root.add([background, hitArea, label]);
        return button;
    }

    private layoutButton(button: MenuButton, x: number, y: number, width: number, height: number): void {
        const worldPerPixel = 1 / (this.scene.cameras.main.zoom || 1);
        button.hitArea.setPosition(x, y);
        button.hitArea.setSize(width, height);

        button.background.setPosition(x, y);
        button.background.setDisplaySize(width, height);

        const labelYOffset = button.state === 'pressed' ? Math.max(1, Math.round(height * 0.04)) : 0;
        button.label.setPosition(x + width / 2, y + height / 2 + labelYOffset);
        button.label.setFontSize(Math.round(Math.max(20 * worldPerPixel, height * 0.45)));
        button.label.setColor(button.kind === 'green' ? '#0f3c2f' : '#ffffff');
        button.label.setStroke(button.kind === 'green' ? '#f8ffe8' : '#163670', 4);

        button.background.setTexture(this.resolveButtonTexture(button.kind, button.state));
    }

    private resolveButtonTexture(kind: MenuButtonKind, state: MenuButtonState): string {
        if (kind === 'green') {
            if (state === 'hover') return KENNEY_UI_IMAGE_KEYS.buttonGreenHover;
            if (state === 'pressed') return KENNEY_UI_IMAGE_KEYS.buttonGreenPressed;
            return KENNEY_UI_IMAGE_KEYS.buttonGreenNormal;
        }
        if (kind === 'red') {
            if (state === 'hover') return KENNEY_UI_IMAGE_KEYS.buttonRedHover;
            if (state === 'pressed') return KENNEY_UI_IMAGE_KEYS.buttonRedPressed;
            return KENNEY_UI_IMAGE_KEYS.buttonRedNormal;
        }
        if (state === 'hover') return KENNEY_UI_IMAGE_KEYS.buttonBlueHover;
        if (state === 'pressed') return KENNEY_UI_IMAGE_KEYS.buttonBluePressed;
        return KENNEY_UI_IMAGE_KEYS.buttonBlueNormal;
    }

    private setButtonState(button: MenuButton, state: MenuButtonState): void {
        button.state = state;
        const textureKey = this.resolveButtonTexture(button.kind, state);
        button.background.setTexture(textureKey);
        button.label.setScale(state === 'pressed' ? 0.985 : 1);
        this.layout();
    }

    private drawPanel(x: number, y: number, width: number, height: number): void {
        this.panelBg.clear();
        this.panelInner.clear();
        this.panelBorder.clear();

        this.panelBg.fillStyle(0x4b71c2, 0.96);
        this.panelBg.fillRoundedRect(x, y, width, height, 14);

        this.panelInner.fillGradientStyle(0xfbfeff, 0xfbfeff, 0xdfecff, 0xdfecff, 0.98);
        this.panelInner.fillRoundedRect(x + 6, y + 6, Math.max(1, width - 12), Math.max(1, height - 12), 10);

        this.panelBorder.lineStyle(3, 0x84a9ed, 0.95);
        this.panelBorder.strokeRoundedRect(x + 2, y + 2, Math.max(1, width - 4), Math.max(1, height - 4), 12);
        this.panelBorder.lineStyle(2, 0x325491, 0.9);
        this.panelBorder.strokeRoundedRect(x + 8, y + 8, Math.max(1, width - 16), Math.max(1, height - 16), 8);
    }

    private drawDivider(x: number, y: number, width: number, height: number): void {
        this.divider.clear();
        this.divider.fillStyle(0x4e72c4, 0.72);
        this.divider.fillRoundedRect(x, y, width, height, 3);
        this.divider.fillStyle(0xffffff, 0.24);
        this.divider.fillRoundedRect(x + 3, y + 1, Math.max(1, width - 6), Math.max(1, height - 2), 2);
    }

    private clearButtons(): void {
        if (this.destroyed) {
            this.buttons = [];
            return;
        }
        this.buttons.forEach((button) => {
            button.background.destroy();
            button.hitArea.destroy();
            button.label.destroy();
        });
        this.buttons = [];
    }
}

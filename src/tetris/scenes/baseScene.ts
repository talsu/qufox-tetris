
export type LayoutMode = 'desktop' | 'mobile-portrait' | 'mobile-landscape';

export abstract class BaseScene extends Phaser.Scene {
    // Logical base resolution
    protected GAME_WIDTH: number = 1920;
    protected GAME_HEIGHT: number = 1080;
    protected isMobile: boolean = false;
    protected layoutMode: LayoutMode = 'desktop';

    constructor(config: string | Phaser.Types.Scenes.SettingsConfig) {
        super(config);
    }

    protected getLayoutMode(): LayoutMode {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const isMobile = Math.min(w, h) < 768;
        if (!isMobile) return 'desktop';
        return w < h ? 'mobile-portrait' : 'mobile-landscape';
    }

    protected handleResolution(): void {
        this.layoutMode = this.getLayoutMode();
        this.isMobile = this.layoutMode !== 'desktop';
    }

    protected backgroundGraphics: Phaser.GameObjects.Graphics;

    protected resize(gameSize, baseSize?, displaySize?, resolution?) {
        if (!this.cameras || !this.cameras.main) {
            return;
        }

        const width = (typeof gameSize === 'number') ? gameSize : gameSize.width;
        const height = (typeof gameSize === 'number') ? baseSize : gameSize.height;

        this.cameras.resize(width, height);

        const zoomX = width / this.GAME_WIDTH;
        const zoomY = height / this.GAME_HEIGHT;
        const zoom = Math.min(zoomX, zoomY);

        this.cameras.main.setZoom(zoom);
        this.cameras.main.centerOn(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2);

        this.updateBackground();
    }

    protected createBackground() {
        this.backgroundGraphics = this.add.graphics();
        this.updateBackground();
    }

    protected updateBackground() {
        if (!this.backgroundGraphics || !this.cameras.main) return;

        const width = this.scale.width;
        const height = this.scale.height;

        this.backgroundGraphics.clear();
        this.backgroundGraphics.setScrollFactor(1);

        const zoom = this.cameras.main.zoom;
        const visibleWidth = width / zoom;
        const visibleHeight = height / zoom;

        const colorStart = 0xfefdcd;
        const colorEnd = 0xa3e6ff;

        this.backgroundGraphics.fillGradientStyle(
            colorStart, // Top-Left
            colorEnd,   // Top-Right
            colorStart, // Bottom-Left
            colorEnd,   // Bottom-Right
            1           // Alpha
        );

        const safety = 100;
        const drawX = (this.GAME_WIDTH - visibleWidth) / 2 - safety;
        const drawY = (this.GAME_HEIGHT - visibleHeight) / 2 - safety;
        const drawW = visibleWidth + safety * 2;
        const drawH = visibleHeight + safety * 2;

        this.backgroundGraphics.fillRect(drawX, drawY, drawW, drawH);

        this.backgroundGraphics.setDepth(-100);
    }
}

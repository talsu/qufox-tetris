
export abstract class BaseScene extends Phaser.Scene {
    // Logical base resolution
    protected GAME_WIDTH: number = 1920;
    protected GAME_HEIGHT: number = 1080;

    constructor(config: string | Phaser.Types.Scenes.SettingsConfig) {
        super(config);
    }

    protected handleResolution(): void {
        // Detect Mobile Portrait
        if (window.innerWidth < window.innerHeight) {
            this.GAME_WIDTH = 1080;
            this.GAME_HEIGHT = 1920;
        } else {
            this.GAME_WIDTH = 1920;
            this.GAME_HEIGHT = 1080;
        }
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
    protected updateBackground2() {
        if (!this.backgroundGraphics || !this.cameras.main) return;

        const width = this.scale.width;
        const height = this.scale.height;

        // Reset
        this.backgroundGraphics.clear();
        this.backgroundGraphics.setScrollFactor(1);

        // We want to cover the entire VISIBLE area.
        // Let's calculate the visible area size in world units.
        const zoom = this.cameras.main.zoom;
        const visibleWidth = width / zoom;
        const visibleHeight = height / zoom;

        // Colors: "Deep Space" Gradient
        // Top: Dark Blue/Black (#0f0c29) -> Bottom: Purple/Blue (#302b63 -> #24243e)
        // Let's use a nice vertical gradient.
        const colorTop = 0x0f0c29;
        const colorBottom = 0x24243e;

        this.backgroundGraphics.fillGradientStyle(colorTop, colorTop, colorBottom, colorBottom, 1);

        // Draw centered on the logical game size
        // The camera is centered on (GAME_WIDTH/2, GAME_HEIGHT/2)
        const safety = 100;
        this.backgroundGraphics.fillRect(
            (this.GAME_WIDTH - visibleWidth) / 2 - safety,
            (this.GAME_HEIGHT - visibleHeight) / 2 - safety,
            visibleWidth + safety * 2,
            visibleHeight + safety * 2
        );

        // Ensure it's behind everything
        this.backgroundGraphics.setDepth(-100);
    }
}

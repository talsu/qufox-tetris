
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
    }
}

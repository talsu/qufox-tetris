import { BackgroundTheme } from "../const/const";

export type LayoutMode = 'desktop' | 'mobile-portrait' | 'mobile-landscape';

export abstract class BaseScene extends Phaser.Scene {
    protected GAME_WIDTH: number = 1920;
    protected GAME_HEIGHT: number = 1080;
    protected isMobile: boolean = false;
    protected layoutMode: LayoutMode = 'desktop';
    protected backgroundGraphics: Phaser.GameObjects.Graphics;
    protected backgroundTheme: BackgroundTheme = BackgroundTheme.AURORA;

    private backgroundAnimTimeMs: number = 0;
    private backgroundDrawAccumulatorMs: number = 0;
    private readonly backgroundDrawIntervalMs: number = 33;

    private static readonly BACKGROUND_THEME_ORDER: BackgroundTheme[] = [
        BackgroundTheme.AURORA,
        BackgroundTheme.LASER_GRID,
        BackgroundTheme.COSMIC_PULSE,
        BackgroundTheme.SUNSET_STREAM,
        BackgroundTheme.OCEAN_DRIFT,
        BackgroundTheme.VOLCANIC_CORE,
        BackgroundTheme.CYBER_SWIRL,
        BackgroundTheme.FOREST_CANOPY,
        BackgroundTheme.NEON_RAIN,
        BackgroundTheme.MONO_CHROME,
    ];

    private static readonly BACKGROUND_THEME_LABELS: Record<BackgroundTheme, string> = {
        [BackgroundTheme.AURORA]: 'AURORA FLOW',
        [BackgroundTheme.LASER_GRID]: 'LASER GRID',
        [BackgroundTheme.COSMIC_PULSE]: 'COSMIC PULSE',
        [BackgroundTheme.SUNSET_STREAM]: 'SUNSET STREAM',
        [BackgroundTheme.OCEAN_DRIFT]: 'OCEAN DRIFT',
        [BackgroundTheme.VOLCANIC_CORE]: 'VOLCANIC CORE',
        [BackgroundTheme.CYBER_SWIRL]: 'CYBER SWIRL',
        [BackgroundTheme.FOREST_CANOPY]: 'FOREST CANOPY',
        [BackgroundTheme.NEON_RAIN]: 'NEON RAIN',
        [BackgroundTheme.MONO_CHROME]: 'MONO CHROME',
    };

    private static sharedBackgroundTheme: BackgroundTheme | null = null;

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

    protected resize(gameSize: { width: number; height: number } | number, baseSize?: number, displaySize?: unknown, resolution?: unknown) {
        this.handleResolution();
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
        this.syncBackgroundThemeWithShared();
        this.backgroundGraphics = this.add.graphics();
        this.renderBackground(true);
    }

    protected updateBackground() {
        this.renderBackground(true);
    }

    protected updateBackgroundAnimation(delta: number): void {
        if (!this.backgroundGraphics || !this.cameras.main || delta <= 0) return;
        this.backgroundAnimTimeMs += delta;
        this.backgroundDrawAccumulatorMs += delta;
        if (this.backgroundDrawAccumulatorMs < this.backgroundDrawIntervalMs) {
            return;
        }
        this.backgroundDrawAccumulatorMs = 0;
        this.renderBackground(false);
    }

    protected cycleBackgroundTheme(): string {
        const order = BaseScene.BACKGROUND_THEME_ORDER;
        const currentIndex = order.indexOf(this.backgroundTheme);
        const nextIndex = (currentIndex + 1) % order.length;
        this.backgroundTheme = order[nextIndex];
        BaseScene.sharedBackgroundTheme = this.backgroundTheme;
        this.renderBackground(true);
        return this.getBackgroundThemeLabel();
    }

    protected getBackgroundThemeLabel(): string {
        return BaseScene.BACKGROUND_THEME_LABELS[this.backgroundTheme];
    }

    protected randomizeBackgroundTheme(): string {
        this.backgroundTheme = BaseScene.pickRandomBackgroundTheme();
        BaseScene.sharedBackgroundTheme = this.backgroundTheme;
        if (this.backgroundGraphics) {
            this.renderBackground(true);
        }
        return this.getBackgroundThemeLabel();
    }

    protected syncBackgroundThemeWithShared(): void {
        if (BaseScene.sharedBackgroundTheme === null) {
            BaseScene.sharedBackgroundTheme = BaseScene.pickRandomBackgroundTheme();
        }
        this.backgroundTheme = BaseScene.sharedBackgroundTheme;
    }

    private static pickRandomBackgroundTheme(): BackgroundTheme {
        const order = BaseScene.BACKGROUND_THEME_ORDER;
        const randomIndex = Math.floor(Math.random() * order.length);
        return order[randomIndex];
    }

    private renderBackground(force: boolean): void {
        if (!this.backgroundGraphics || !this.cameras.main) return;
        if (!force && !this.backgroundGraphics.visible) return;

        const width = this.scale.width;
        const height = this.scale.height;

        this.backgroundGraphics.clear();
        this.backgroundGraphics.setScrollFactor(1);

        const zoom = this.cameras.main.zoom;
        const visibleWidth = width / zoom;
        const visibleHeight = height / zoom;

        const safety = 100;
        const drawX = (this.GAME_WIDTH - visibleWidth) / 2 - safety;
        const drawY = (this.GAME_HEIGHT - visibleHeight) / 2 - safety;
        const drawW = visibleWidth + safety * 2;
        const drawH = visibleHeight + safety * 2;

        if (this.backgroundTheme === BackgroundTheme.AURORA) {
            this.drawAuroraBackground(drawX, drawY, drawW, drawH);
        } else if (this.backgroundTheme === BackgroundTheme.LASER_GRID) {
            this.drawLaserGridBackground(drawX, drawY, drawW, drawH);
        } else if (this.backgroundTheme === BackgroundTheme.COSMIC_PULSE) {
            this.drawCosmicPulseBackground(drawX, drawY, drawW, drawH);
        } else if (this.backgroundTheme === BackgroundTheme.SUNSET_STREAM) {
            this.drawSunsetStreamBackground(drawX, drawY, drawW, drawH);
        } else if (this.backgroundTheme === BackgroundTheme.OCEAN_DRIFT) {
            this.drawOceanDriftBackground(drawX, drawY, drawW, drawH);
        } else if (this.backgroundTheme === BackgroundTheme.VOLCANIC_CORE) {
            this.drawVolcanicCoreBackground(drawX, drawY, drawW, drawH);
        } else if (this.backgroundTheme === BackgroundTheme.CYBER_SWIRL) {
            this.drawCyberSwirlBackground(drawX, drawY, drawW, drawH);
        } else if (this.backgroundTheme === BackgroundTheme.FOREST_CANOPY) {
            this.drawForestCanopyBackground(drawX, drawY, drawW, drawH);
        } else if (this.backgroundTheme === BackgroundTheme.NEON_RAIN) {
            this.drawNeonRainBackground(drawX, drawY, drawW, drawH);
        } else {
            this.drawMonoChromeBackground(drawX, drawY, drawW, drawH);
        }

        this.backgroundGraphics.setDepth(-100);
    }

    private drawAuroraBackground(drawX: number, drawY: number, drawW: number, drawH: number): void {
        const t = this.backgroundAnimTimeMs / 1000;
        const mix = (Math.sin(t * 0.42) + 1) / 2;
        const topLeft = this.lerpColor(0x0b1d45, 0x12386d, mix);
        const topRight = this.lerpColor(0x173873, 0x2a6cb8, mix);
        const bottomLeft = this.lerpColor(0x23336c, 0x1f6b82, mix);
        const bottomRight = this.lerpColor(0x2a7b97, 0x62c3b8, mix);

        this.backgroundGraphics.fillGradientStyle(topLeft, topRight, bottomLeft, bottomRight, 1);
        this.backgroundGraphics.fillRect(drawX, drawY, drawW, drawH);

        const bandCount = 7;
        for (let i = 0; i < bandCount; i++) {
            const phase = t * 0.26 + i * 0.7;
            const xRatio = (Math.sin(phase) + 1) / 2;
            const bandX = drawX + xRatio * drawW;
            const bandWidth = drawW * (0.07 + (i % 3) * 0.02);
            const alpha = 0.05 + (0.04 * ((Math.sin(t * 0.85 + i) + 1) / 2));
            const color = this.lerpColor(0x7bf7d4, 0xaed9ff, (i % 2) * 0.7);
            this.backgroundGraphics.fillStyle(color, alpha);
            this.backgroundGraphics.fillRect(bandX - (bandWidth / 2), drawY, bandWidth, drawH);
        }
    }

    private drawLaserGridBackground(drawX: number, drawY: number, drawW: number, drawH: number): void {
        const t = this.backgroundAnimTimeMs / 1000;
        this.backgroundGraphics.fillGradientStyle(0x070b19, 0x11193c, 0x0b1024, 0x162456, 1);
        this.backgroundGraphics.fillRect(drawX, drawY, drawW, drawH);

        const spacingX = 120;
        const spacingY = 96;
        const offsetX = (t * 36) % spacingX;
        const offsetY = (t * 28) % spacingY;
        const pulse = 0.15 + (((Math.sin(t * 1.6) + 1) / 2) * 0.15);

        for (let x = drawX - spacingX + offsetX; x <= drawX + drawW + spacingX; x += spacingX) {
            this.backgroundGraphics.fillStyle(0x3ed5ff, pulse);
            this.backgroundGraphics.fillRect(x, drawY, 2, drawH);
        }

        for (let y = drawY - spacingY + offsetY; y <= drawY + drawH + spacingY; y += spacingY) {
            this.backgroundGraphics.fillStyle(0xff4fd1, pulse * 0.8);
            this.backgroundGraphics.fillRect(drawX, y, drawW, 2);
        }
    }

    private drawCosmicPulseBackground(drawX: number, drawY: number, drawW: number, drawH: number): void {
        const t = this.backgroundAnimTimeMs / 1000;
        this.backgroundGraphics.fillGradientStyle(0x08021b, 0x18104d, 0x0a0d2b, 0x2d0f5d, 1);
        this.backgroundGraphics.fillRect(drawX, drawY, drawW, drawH);

        const starCount = 30;
        for (let i = 0; i < starCount; i++) {
            const baseX = this.hash01(i * 17.11 + 1.31);
            const baseY = this.hash01(i * 31.71 + 9.2);
            const drift = t * (0.006 + (i % 5) * 0.002);
            const y = drawY + (((baseY + drift) % 1) * drawH);
            const x = drawX + (baseX * drawW);
            const twinkle = 0.3 + (((Math.sin(t * (1.5 + (i % 4) * 0.3) + i) + 1) / 2) * 0.55);
            const size = 1 + (i % 3);
            this.backgroundGraphics.fillStyle(0xe5dcff, twinkle);
            this.backgroundGraphics.fillRect(x, y, size, size);
        }

        const pulse = ((Math.sin(t * 0.9) + 1) / 2);
        const pulseHeight = drawH * (0.18 + pulse * 0.24);
        const pulseY = drawY + (drawH - pulseHeight) / 2;
        this.backgroundGraphics.fillStyle(0xaa44ff, 0.12);
        this.backgroundGraphics.fillRect(drawX, pulseY, drawW, pulseHeight);
    }

    private drawSunsetStreamBackground(drawX: number, drawY: number, drawW: number, drawH: number): void {
        const t = this.backgroundAnimTimeMs / 1000;
        const warm = (Math.sin(t * 0.35) + 1) / 2;
        const topLeft = this.lerpColor(0xf9d27a, 0xf7b16f, warm);
        const topRight = this.lerpColor(0xff8f7d, 0xf9708d, warm);
        const bottomLeft = this.lerpColor(0xffb08a, 0xf99d9a, warm);
        const bottomRight = this.lerpColor(0x8f7bd3, 0x6b7edb, warm);

        this.backgroundGraphics.fillGradientStyle(topLeft, topRight, bottomLeft, bottomRight, 1);
        this.backgroundGraphics.fillRect(drawX, drawY, drawW, drawH);

        const streamCount = 8;
        for (let i = 0; i < streamCount; i++) {
            const phase = t * 0.65 + i * 0.8;
            const yRatio = (Math.sin(phase) + 1) / 2;
            const y = drawY + yRatio * drawH;
            const streamHeight = 10 + (i % 3) * 6;
            const alpha = 0.06 + (((Math.sin(t * 1.1 + i * 1.2) + 1) / 2) * 0.05);
            const color = (i % 2 === 0) ? 0xffe9b0 : 0xffd4f3;
            this.backgroundGraphics.fillStyle(color, alpha);
            this.backgroundGraphics.fillRect(drawX, y, drawW, streamHeight);
        }

        this.backgroundGraphics.fillStyle(0x19122e, 0.16);
        this.backgroundGraphics.fillRect(drawX, drawY + drawH * 0.72, drawW, drawH * 0.28);
    }

    private drawOceanDriftBackground(drawX: number, drawY: number, drawW: number, drawH: number): void {
        const t = this.backgroundAnimTimeMs / 1000;
        const tide = (Math.sin(t * 0.4) + 1) / 2;
        const topLeft = this.lerpColor(0x04253f, 0x0a3b60, tide);
        const topRight = this.lerpColor(0x0b4f7d, 0x1676a6, tide);
        const bottomLeft = this.lerpColor(0x0a4e63, 0x10827d, tide);
        const bottomRight = this.lerpColor(0x1ca0a3, 0x5ad4cf, tide);
        this.backgroundGraphics.fillGradientStyle(topLeft, topRight, bottomLeft, bottomRight, 1);
        this.backgroundGraphics.fillRect(drawX, drawY, drawW, drawH);

        for (let i = 0; i < 9; i++) {
            const wavePhase = t * (0.5 + (i % 3) * 0.18) + i * 0.7;
            const waveY = drawY + ((Math.sin(wavePhase) + 1) / 2) * drawH;
            const waveAlpha = 0.04 + ((Math.sin(t * 0.9 + i) + 1) / 2) * 0.05;
            this.backgroundGraphics.fillStyle(0x9cebf1, waveAlpha);
            this.backgroundGraphics.fillRect(drawX, waveY, drawW, 8 + (i % 2) * 6);
        }
    }

    private drawVolcanicCoreBackground(drawX: number, drawY: number, drawW: number, drawH: number): void {
        const t = this.backgroundAnimTimeMs / 1000;
        this.backgroundGraphics.fillGradientStyle(0x120202, 0x2c0909, 0x2b0808, 0x4b150c, 1);
        this.backgroundGraphics.fillRect(drawX, drawY, drawW, drawH);

        const emberCount = 24;
        for (let i = 0; i < emberCount; i++) {
            const xSeed = this.hash01(i * 19.2 + 2.4);
            const ySeed = this.hash01(i * 9.3 + 1.8);
            const rise = (t * (0.08 + (i % 4) * 0.02)) % 1;
            const y = drawY + drawH - (((ySeed + rise) % 1) * drawH);
            const x = drawX + xSeed * drawW;
            const glow = 0.3 + ((Math.sin(t * (1.2 + (i % 3) * 0.25) + i) + 1) / 2) * 0.45;
            const size = 2 + (i % 3);
            const color = (i % 2 === 0) ? 0xff6a2b : 0xffb347;
            this.backgroundGraphics.fillStyle(color, glow);
            this.backgroundGraphics.fillRect(x, y, size, size);
        }

        const lavaBandHeight = drawH * (0.12 + ((Math.sin(t * 0.7) + 1) / 2) * 0.08);
        this.backgroundGraphics.fillStyle(0xff4a1a, 0.22);
        this.backgroundGraphics.fillRect(drawX, drawY + drawH - lavaBandHeight, drawW, lavaBandHeight);
    }

    private drawCyberSwirlBackground(drawX: number, drawY: number, drawW: number, drawH: number): void {
        const t = this.backgroundAnimTimeMs / 1000;
        const hueMix = (Math.sin(t * 0.52) + 1) / 2;
        const topLeft = this.lerpColor(0x12052a, 0x1a0f44, hueMix);
        const topRight = this.lerpColor(0x1f1a58, 0x2b2b76, hueMix);
        const bottomLeft = this.lerpColor(0x122339, 0x143a56, hueMix);
        const bottomRight = this.lerpColor(0x244a71, 0x2a6d93, hueMix);
        this.backgroundGraphics.fillGradientStyle(topLeft, topRight, bottomLeft, bottomRight, 1);
        this.backgroundGraphics.fillRect(drawX, drawY, drawW, drawH);

        const streamCount = 12;
        for (let i = 0; i < streamCount; i++) {
            const flow = (i / streamCount + t * (0.05 + (i % 4) * 0.01)) % 1;
            const x = drawX + flow * drawW;
            const yCenter = drawY + drawH * (0.5 + Math.sin(flow * 9 + t * 1.6 + i * 0.9) * 0.34);
            const width = drawW * (0.08 + (i % 3) * 0.02);
            const height = 8 + (i % 4) * 4;
            const alpha = 0.05 + ((Math.sin(t * 1.8 + i * 0.7) + 1) / 2) * 0.08;
            const color = this.lerpColor(0x4df2ff, 0xff4fcb, (i % 5) / 4);
            this.backgroundGraphics.fillStyle(color, alpha);
            this.backgroundGraphics.fillRect(x - width / 2, yCenter - height / 2, width, height);
        }
    }

    private drawForestCanopyBackground(drawX: number, drawY: number, drawW: number, drawH: number): void {
        const t = this.backgroundAnimTimeMs / 1000;
        const breeze = (Math.sin(t * 0.5) + 1) / 2;
        this.backgroundGraphics.fillGradientStyle(
            this.lerpColor(0x102a14, 0x1f4a24, breeze),
            this.lerpColor(0x1e4722, 0x2f6635, breeze),
            this.lerpColor(0x274f26, 0x2f6a33, breeze),
            this.lerpColor(0x355f2f, 0x4d8243, breeze),
            1
        );
        this.backgroundGraphics.fillRect(drawX, drawY, drawW, drawH);

        for (let i = 0; i < 10; i++) {
            const phase = t * 0.55 + i * 0.9;
            const x = drawX + ((Math.sin(phase) + 1) / 2) * drawW;
            const width = drawW * (0.08 + (i % 3) * 0.02);
            const alpha = 0.05 + ((Math.sin(t * 0.8 + i) + 1) / 2) * 0.05;
            this.backgroundGraphics.fillStyle(0x83c96f, alpha);
            this.backgroundGraphics.fillRect(x - width / 2, drawY, width, drawH);
        }
    }

    private drawNeonRainBackground(drawX: number, drawY: number, drawW: number, drawH: number): void {
        const t = this.backgroundAnimTimeMs / 1000;
        this.backgroundGraphics.fillGradientStyle(0x06060d, 0x0d0f2b, 0x090a1b, 0x10153a, 1);
        this.backgroundGraphics.fillRect(drawX, drawY, drawW, drawH);

        const rainCount = 48;
        for (let i = 0; i < rainCount; i++) {
            const x = drawX + this.hash01(i * 77.1 + 4.9) * drawW;
            const fall = (t * (0.35 + (i % 5) * 0.08) + this.hash01(i * 13.7)) % 1;
            const y = drawY + fall * drawH;
            const len = 16 + (i % 4) * 9;
            const alpha = 0.2 + ((Math.sin(t * 2.2 + i) + 1) / 2) * 0.25;
            const color = (i % 2 === 0) ? 0x5df3ff : 0xff54f3;
            this.backgroundGraphics.fillStyle(color, alpha);
            this.backgroundGraphics.fillRect(x, y, 2, len);
        }
    }

    private drawMonoChromeBackground(drawX: number, drawY: number, drawW: number, drawH: number): void {
        const t = this.backgroundAnimTimeMs / 1000;
        const tint = (Math.sin(t * 0.45) + 1) / 2;
        const dark = this.lerpColor(0x0f0f10, 0x17181b, tint);
        const light = this.lerpColor(0x2b2c32, 0x3b3d45, tint);
        this.backgroundGraphics.fillGradientStyle(dark, light, dark, light, 1);
        this.backgroundGraphics.fillRect(drawX, drawY, drawW, drawH);

        const stripeGap = 52;
        const offset = (t * 28) % stripeGap;
        for (let y = drawY - stripeGap + offset; y < drawY + drawH + stripeGap; y += stripeGap) {
            this.backgroundGraphics.fillStyle(0xffffff, 0.04);
            this.backgroundGraphics.fillRect(drawX, y, drawW, 2);
        }
    }

    private lerpColor(from: number, to: number, t: number): number {
        const clamped = Math.max(0, Math.min(1, t));
        const fr = (from >> 16) & 0xff;
        const fg = (from >> 8) & 0xff;
        const fb = from & 0xff;
        const tr = (to >> 16) & 0xff;
        const tg = (to >> 8) & 0xff;
        const tb = to & 0xff;
        const rr = Math.round(fr + (tr - fr) * clamped);
        const rg = Math.round(fg + (tg - fg) * clamped);
        const rb = Math.round(fb + (tb - fb) * clamped);
        return (rr << 16) | (rg << 8) | rb;
    }

    private hash01(seed: number): number {
        const s = Math.sin(seed * 12.9898) * 43758.5453;
        return s - Math.floor(s);
    }
}

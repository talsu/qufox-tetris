import { BackgroundTheme } from '../../../src/tetris/const/const';
import { BaseScene } from '../../../src/tetris/scenes/baseScene';

class TestBackgroundScene extends BaseScene {
    constructor() {
        super({ key: 'TestBackgroundScene' });
    }

    public cycleTheme(): string {
        return this.cycleBackgroundTheme();
    }

    public currentTheme(): BackgroundTheme {
        return this.backgroundTheme;
    }

    public currentThemeLabel(): string {
        return this.getBackgroundThemeLabel();
    }

    public randomizeTheme(): string {
        return this.randomizeBackgroundTheme();
    }

    public syncSharedTheme(): void {
        this.syncBackgroundThemeWithShared();
    }
}

describe('BaseScene background theme cycle', () => {
    test('cycles through all themes in order and wraps', () => {
        const scene = new TestBackgroundScene();

        expect(scene.currentTheme()).toBe(BackgroundTheme.AURORA);
        expect(scene.currentThemeLabel()).toBe('AURORA FLOW');

        expect(scene.cycleTheme()).toBe('LASER GRID');
        expect(scene.currentTheme()).toBe(BackgroundTheme.LASER_GRID);

        expect(scene.cycleTheme()).toBe('COSMIC PULSE');
        expect(scene.currentTheme()).toBe(BackgroundTheme.COSMIC_PULSE);

        expect(scene.cycleTheme()).toBe('SUNSET STREAM');
        expect(scene.currentTheme()).toBe(BackgroundTheme.SUNSET_STREAM);

        expect(scene.cycleTheme()).toBe('OCEAN DRIFT');
        expect(scene.currentTheme()).toBe(BackgroundTheme.OCEAN_DRIFT);

        expect(scene.cycleTheme()).toBe('VOLCANIC CORE');
        expect(scene.currentTheme()).toBe(BackgroundTheme.VOLCANIC_CORE);

        expect(scene.cycleTheme()).toBe('CYBER SWIRL');
        expect(scene.currentTheme()).toBe(BackgroundTheme.CYBER_SWIRL);

        expect(scene.cycleTheme()).toBe('FOREST CANOPY');
        expect(scene.currentTheme()).toBe(BackgroundTheme.FOREST_CANOPY);

        expect(scene.cycleTheme()).toBe('NEON RAIN');
        expect(scene.currentTheme()).toBe(BackgroundTheme.NEON_RAIN);

        expect(scene.cycleTheme()).toBe('MONO CHROME');
        expect(scene.currentTheme()).toBe(BackgroundTheme.MONO_CHROME);

        expect(scene.cycleTheme()).toBe('AURORA FLOW');
        expect(scene.currentTheme()).toBe(BackgroundTheme.AURORA);
    });

    test('randomizes initial background theme', () => {
        const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.99);
        const scene = new TestBackgroundScene();

        expect(scene.randomizeTheme()).toBe('MONO CHROME');
        expect(scene.currentTheme()).toBe(BackgroundTheme.MONO_CHROME);

        randomSpy.mockRestore();
    });

    test('shares selected theme across scenes', () => {
        const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
        const firstScene = new TestBackgroundScene();
        firstScene.randomizeTheme();
        firstScene.cycleTheme();
        firstScene.cycleTheme();
        firstScene.cycleTheme();
        firstScene.cycleTheme();
        firstScene.cycleTheme();

        expect(firstScene.currentTheme()).toBe(BackgroundTheme.VOLCANIC_CORE);

        const secondScene = new TestBackgroundScene();
        secondScene.syncSharedTheme();

        expect(secondScene.currentTheme()).toBe(BackgroundTheme.VOLCANIC_CORE);
        expect(secondScene.currentThemeLabel()).toBe('VOLCANIC CORE');
        randomSpy.mockRestore();
    });
});

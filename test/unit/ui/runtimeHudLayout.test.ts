import {
    calcDesktopHudLayout,
    calcPortraitHudLayout,
    getLayoutMetrics,
} from '../../../src/tetris/ui/gameLayout';
import { applyRuntimeHudLayout } from '../../../src/tetris/ui/runtimeHudLayout';

type PositionRecord = { x: number; y: number };

class MockContainer {
    public scale = 1;
    public position: PositionRecord = { x: 0, y: 0 };

    setScale(scale: number): this {
        this.scale = scale;
        return this;
    }

    setPosition(x: number, y: number): this {
        this.position = { x, y };
        return this;
    }
}

class MockPlayField {
    public scale = 1;
    public position: PositionRecord = { x: 0, y: 0 };

    setScale(scale: number): this {
        this.scale = scale;
        return this;
    }

    setPosition(x: number, y: number): this {
        this.position = { x, y };
        return this;
    }
}

class MockQueue {
    public container = new MockContainer();
    public queueSize = 0;

    setDisplayQueueSize(queueSize: number): void {
        this.queueSize = queueSize;
    }
}

class MockLevelIndicator {
    public container = new MockContainer();
    public compact = false;
    public compactShowRank = false;

    setCompactMode(compact: boolean, options?: { compactShowRank?: boolean }): void {
        this.compact = compact;
        this.compactShowRank = options?.compactShowRank ?? false;
    }
}

class MockHoldZone {
    public position: PositionRecord = { x: 0, y: 0 };
    public width = 0;
    public height = 0;

    setPosition(x: number, y: number): this {
        this.position = { x, y };
        return this;
    }

    setSize(width: number, height: number): this {
        this.width = width;
        this.height = height;
        return this;
    }
}

describe('runtimeHudLayout', () => {
    test('applies desktop HUD layout with desktop queue and drag threshold scale', () => {
        const metrics = getLayoutMetrics();
        const playField = new MockPlayField();
        const holdBox = { container: new MockContainer() };
        const queue = new MockQueue();
        const levelIndicator = new MockLevelIndicator();
        const holdZone = new MockHoldZone();

        const result = applyRuntimeHudLayout({
            playField,
            holdBox,
            queue,
            levelIndicator,
            holdInputZone: holdZone,
        }, {
            layoutMode: 'desktop',
            fieldX: 120,
            fieldY: 180,
            mainScale: 1.08,
            sideScale: 0.95,
            compactShowRank: false,
        });

        const hud = calcDesktopHudLayout(120, 180, 1.08, 0.95);

        expect(result).toEqual({ isPortrait: false, dragThresholdScale: 1.08 });
        expect(playField.scale).toBeCloseTo(1.08, 5);
        expect(playField.position).toEqual({ x: 120, y: 180 });
        expect(queue.queueSize).toBe(metrics.queueSize);
        expect(levelIndicator.compact).toBe(false);
        expect(levelIndicator.compactShowRank).toBe(false);
        expect(holdBox.container.scale).toBeCloseTo(0.95, 5);
        expect(holdBox.container.position).toEqual({ x: hud.holdX, y: hud.holdY });
        expect(queue.container.position).toEqual({ x: hud.queueX, y: hud.queueY });
        expect(levelIndicator.container.position).toEqual({ x: hud.infoX, y: hud.infoY });
        expect(holdZone.position).toEqual({ x: hud.holdX, y: hud.holdY });
        expect(holdZone.width).toBeCloseTo(hud.holdTouchWidth, 5);
        expect(holdZone.height).toBeCloseTo(hud.holdTouchHeight, 5);
    });

    test('switches to portrait HUD layout and collapses queue to mobile size', () => {
        const metrics = getLayoutMetrics();
        const playField = new MockPlayField();
        const holdBox = { container: new MockContainer() };
        const queue = new MockQueue();
        const levelIndicator = new MockLevelIndicator();
        const holdZone = new MockHoldZone();

        applyRuntimeHudLayout({
            playField,
            holdBox,
            queue,
            levelIndicator,
            holdInputZone: holdZone,
        }, {
            layoutMode: 'desktop',
            fieldX: 120,
            fieldY: 180,
            mainScale: 1.08,
            sideScale: 0.95,
            compactShowRank: false,
        });

        const result = applyRuntimeHudLayout({
            playField,
            holdBox,
            queue,
            levelIndicator,
            holdInputZone: holdZone,
        }, {
            layoutMode: 'mobile-portrait',
            fieldX: 40,
            fieldY: 200,
            mainScale: 1.08,
            sideScale: 0.95,
            compactShowRank: true,
        });

        const hud = calcPortraitHudLayout(40, 200);

        expect(result).toEqual({ isPortrait: true, dragThresholdScale: 1 });
        expect(playField.scale).toBe(1);
        expect(playField.position).toEqual({ x: 40, y: 200 });
        expect(queue.queueSize).toBe(metrics.mobileQueueSize);
        expect(levelIndicator.compact).toBe(true);
        expect(levelIndicator.compactShowRank).toBe(true);
        expect(holdBox.container.scale).toBeCloseTo(metrics.mobileUiScale, 5);
        expect(queue.container.scale).toBeCloseTo(metrics.mobileUiScale, 5);
        expect(holdBox.container.position).toEqual({ x: hud.holdX, y: hud.holdY });
        expect(queue.container.position).toEqual({ x: hud.queueX, y: hud.queueY });
        expect(levelIndicator.container.position).toEqual({ x: hud.infoX, y: hud.infoY });
        expect(holdZone.position).toEqual({ x: hud.holdX, y: hud.holdY });
        expect(holdZone.width).toBeCloseTo(hud.holdWidth, 5);
        expect(holdZone.height).toBeCloseTo(hud.holdHeight, 5);
    });
});

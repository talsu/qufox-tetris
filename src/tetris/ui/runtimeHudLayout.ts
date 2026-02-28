import { LayoutMode } from "../scenes/baseScene";
import { calcDesktopHudLayout, calcPortraitHudLayout, getLayoutMetrics } from "./gameLayout";

interface RuntimeHudContainer {
    setScale: (scale: number) => unknown;
    setPosition: (x: number, y: number) => unknown;
}

interface RuntimeHoldZone {
    setPosition: (x: number, y: number) => unknown;
    setSize: (width: number, height: number) => unknown;
}

export interface RuntimeHudObjects {
    playField: {
        setScale: (scale: number) => unknown;
        setPosition: (x: number, y: number) => unknown;
    };
    holdBox: { container: RuntimeHudContainer };
    queue: {
        setDisplayQueueSize: (queueSize: number) => unknown;
        container: RuntimeHudContainer;
    };
    levelIndicator: {
        setCompactMode: (compact: boolean, options?: { compactShowRank?: boolean }) => unknown;
        container: RuntimeHudContainer;
    };
    holdInputZone?: RuntimeHoldZone | null;
}

export interface RuntimeHudLayoutOptions {
    layoutMode: LayoutMode;
    fieldX: number;
    fieldY: number;
    mainScale: number;
    sideScale: number;
    compactShowRank: boolean;
}

export interface RuntimeHudLayoutResult {
    isPortrait: boolean;
    dragThresholdScale: number;
}

export function applyRuntimeHudLayout(
    objects: RuntimeHudObjects,
    options: RuntimeHudLayoutOptions,
): RuntimeHudLayoutResult {
    const metrics = getLayoutMetrics();
    const isPortrait = options.layoutMode === 'mobile-portrait';
    const targetQueueSize = isPortrait ? metrics.mobileQueueSize : metrics.queueSize;
    const playFieldScale = isPortrait ? 1 : options.mainScale;

    objects.playField.setScale(playFieldScale);
    objects.playField.setPosition(options.fieldX, options.fieldY);
    objects.queue.setDisplayQueueSize(targetQueueSize);
    objects.levelIndicator.setCompactMode(isPortrait, { compactShowRank: options.compactShowRank });

    if (isPortrait) {
        const hud = calcPortraitHudLayout(options.fieldX, options.fieldY);
        objects.holdBox.container.setScale(metrics.mobileUiScale);
        objects.holdBox.container.setPosition(hud.holdX, hud.holdY);

        objects.queue.container.setScale(metrics.mobileUiScale);
        objects.queue.container.setPosition(hud.queueX, hud.queueY);

        objects.levelIndicator.container.setScale(1);
        objects.levelIndicator.container.setPosition(hud.infoX, hud.infoY);

        if (objects.holdInputZone) {
            objects.holdInputZone.setPosition(hud.holdX, hud.holdY);
            objects.holdInputZone.setSize(hud.holdWidth, hud.holdHeight);
        }

        return {
            isPortrait: true,
            dragThresholdScale: 1,
        };
    }

    const desktopHud = calcDesktopHudLayout(
        options.fieldX,
        options.fieldY,
        options.mainScale,
        options.sideScale,
    );
    objects.holdBox.container.setScale(options.sideScale);
    objects.holdBox.container.setPosition(desktopHud.holdX, desktopHud.holdY);

    objects.queue.container.setScale(options.sideScale);
    objects.queue.container.setPosition(desktopHud.queueX, desktopHud.queueY);

    objects.levelIndicator.container.setScale(options.sideScale);
    objects.levelIndicator.container.setPosition(desktopHud.infoX, desktopHud.infoY);

    if (objects.holdInputZone) {
        objects.holdInputZone.setPosition(desktopHud.holdX, desktopHud.holdY);
        objects.holdInputZone.setSize(desktopHud.holdTouchWidth, desktopHud.holdTouchHeight);
    }

    return {
        isPortrait: false,
        dragThresholdScale: options.mainScale,
    };
}

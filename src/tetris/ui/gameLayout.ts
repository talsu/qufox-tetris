import { CONST, getBlockSize, InputState } from "../const/const";
import { PlayField } from "../objects/playField";
import { TetrominoBox } from "../objects/tetrominoBox";
import { TetrominoBoxQueue } from "../objects/tetrominoBoxQueue";
import { LevelIndicator } from "../objects/levelIndicator";
import { Engine } from "../engine";
import { LayoutMode } from "../scenes/baseScene";

const BLOCK_SIZE = getBlockSize();

// ─── Layout Constants ───────────────────────────────────────────────
const GAP = BLOCK_SIZE * 0.5;
const HOLD_WIDTH = BLOCK_SIZE * 5;
const HOLD_HEIGHT = BLOCK_SIZE * 3;
const QUEUE_SIZE = 6;

// Mobile portrait constants
const MOBILE_UI_SCALE = 0.75;
const MOBILE_QUEUE_SIZE = 1;
const PLAYFIELD_WIDTH = BLOCK_SIZE * CONST.PLAY_FIELD.COL_COUNT;
const PLAYFIELD_HEIGHT = BLOCK_SIZE * CONST.PLAY_FIELD.ROW_COUNT;

export interface LayoutMetrics {
    gap: number;
    holdWidth: number;
    holdHeight: number;
    queueSize: number;
    mobileQueueSize: number;
    mobileUiScale: number;
    portraitFieldTopBlocks: number;
    multiPlayerAreaBlocks: number;
    multiPortraitOpponentOffsetBlocks: number;
    multiPortraitOpponentBottomMarginBlocks: number;
    nMultiDesktopAreaXBlocks: number;
    nMultiDesktopAreaYBlocks: number;
    nMultiDesktopAreaBottomPaddingBlocks: number;
    nMultiDesktopAreaRightPaddingBlocks: number;
    nMultiPortraitAreaXBlocks: number;
    nMultiPortraitAreaYBlocks: number;
    nMultiPortraitAreaBottomPaddingBlocks: number;
    nMultiPortraitAreaHorizontalPaddingBlocks: number;
    topNavBarBlocks: number;
    mobileTopNavBarBlocks: number;
    mobileInfoGapBlocks: number;
}

export interface PlaySceneOpponentLayout {
    x: number;
    y: number;
    scale: number;
    labelOffset: number;
}

export interface OpponentAreaLayout {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface PortraitHudLayout {
    holdX: number;
    holdY: number;
    holdWidth: number;
    holdHeight: number;
    queueX: number;
    queueY: number;
    queueWidth: number;
    queueHeight: number;
    infoX: number;
    infoY: number;
}

export interface GameLayoutResult {
    holdBox: TetrominoBox;
    levelIndicator: LevelIndicator;
    tetrominoQueue: TetrominoBoxQueue;
    playField: PlayField;
    engine: Engine;
}

export interface GameLayoutOptions {
    scene: Phaser.Scene;
    /** Top-left X of the play field */
    fieldX: number;
    /** Top-left Y of the play field */
    fieldY: number;
    /** Scale for play field (default 1) */
    mainScale?: number;
    /** Scale for side panels: hold, queue, indicator (default 1) */
    sideScale?: number;
    /** Callback for hold touch zone input */
    onHoldInput: (direction: string, state: InputState) => void;
    /** Guard function to check if input should be accepted */
    isInputBlocked: () => boolean;
    /** Layout mode for responsive positioning */
    layoutMode?: LayoutMode;
    compactShowRank?: boolean;
}

export function getLayoutMetrics(): LayoutMetrics {
    return {
        gap: GAP,
        holdWidth: HOLD_WIDTH,
        holdHeight: HOLD_HEIGHT,
        queueSize: QUEUE_SIZE,
        mobileQueueSize: MOBILE_QUEUE_SIZE,
        mobileUiScale: MOBILE_UI_SCALE,
        portraitFieldTopBlocks: 4.7,
        multiPlayerAreaBlocks: 23,
        multiPortraitOpponentOffsetBlocks: 1.5,
        multiPortraitOpponentBottomMarginBlocks: 0.5,
        nMultiDesktopAreaXBlocks: 23.5,
        nMultiDesktopAreaYBlocks: 1,
        nMultiDesktopAreaBottomPaddingBlocks: 2,
        nMultiDesktopAreaRightPaddingBlocks: 0.5,
        nMultiPortraitAreaXBlocks: 0.5,
        nMultiPortraitAreaYBlocks: 25.5,
        nMultiPortraitAreaBottomPaddingBlocks: 0.5,
        nMultiPortraitAreaHorizontalPaddingBlocks: 1,
        topNavBarBlocks: 1.5,
        mobileTopNavBarBlocks: 1.0,
        mobileInfoGapBlocks: 0.2,
    };
}


export function getTopNavBarHeight(layoutMode: LayoutMode = 'desktop'): number {
    const metrics = getLayoutMetrics();
    const blocks = layoutMode === 'mobile-portrait' ? metrics.mobileTopNavBarBlocks : metrics.topNavBarBlocks;
    return BLOCK_SIZE * blocks;
}

// ─── Dimension Calculators ──────────────────────────────────────────

/**
 * Calculate scene dimensions based on layout mode for PlayScene.
 */
export function calcPlaySceneDimensions(layoutMode: LayoutMode, mode: string): { width: number; height: number } {
    const metrics = getLayoutMetrics();

    const topNavBarHeight = getTopNavBarHeight(layoutMode);

    if (layoutMode === 'mobile-portrait') {
        if (mode === 'multi') {
            return { width: BLOCK_SIZE * 12, height: BLOCK_SIZE * 34 + topNavBarHeight };
        }
        return { width: BLOCK_SIZE * 12, height: BLOCK_SIZE * 26 + topNavBarHeight };
    }
    if (mode === 'multi') {
        return { width: BLOCK_SIZE * (metrics.multiPlayerAreaBlocks + 11), height: BLOCK_SIZE * 22 + topNavBarHeight };
    }
    return { width: BLOCK_SIZE * 22, height: BLOCK_SIZE * 22 + topNavBarHeight };
}

/**
 * Calculate scene dimensions based on layout mode for NMultiPlayScene.
 */
export function calcNMultiSceneDimensions(layoutMode: LayoutMode): { width: number; height: number } {
    const metrics = getLayoutMetrics();
    const topNavBarHeight = getTopNavBarHeight(layoutMode);
    if (layoutMode === 'mobile-portrait') {
        return { width: BLOCK_SIZE * 12, height: BLOCK_SIZE * 34 + topNavBarHeight };
    }
    return { width: BLOCK_SIZE * (metrics.multiPlayerAreaBlocks + 13), height: BLOCK_SIZE * 22 + topNavBarHeight };
}

// ─── Position Calculators ───────────────────────────────────────────

/**
 * Calculate the play field position for single-player mode (centered).
 */
export function calcSinglePlayerPosition(gameWidth: number, gameHeight: number, mainScale: number = 1, topInset: number = getTopNavBarHeight()) {
    const usableHeight = Math.max(0, gameHeight - topInset);
    return {
        x: (gameWidth - PLAYFIELD_WIDTH * mainScale) / 2,
        y: topInset + (usableHeight - PLAYFIELD_HEIGHT * mainScale) / 2,
    };
}

/**
 * Calculate the play field position for N-multi mode (centered in left player area).
 */
export function calcNMultiPlayerPosition(gameHeight: number, playerAreaBlocks: number = 23, topInset: number = getTopNavBarHeight()) {
    const metrics = getLayoutMetrics();
    const areaBlocks = playerAreaBlocks ?? metrics.multiPlayerAreaBlocks;
    const leftArea = BLOCK_SIZE * areaBlocks;
    const usableHeight = Math.max(0, gameHeight - topInset);
    return {
        x: (leftArea - PLAYFIELD_WIDTH) / 2,
        y: topInset + (usableHeight - PLAYFIELD_HEIGHT) / 2,
    };
}

/**
 * Portrait position: playfield centered horizontally, below hold+next row.
 */
export function calcPortraitPosition(gameWidth: number, topInset: number = getTopNavBarHeight('mobile-portrait')): { x: number; y: number } {
    const metrics = getLayoutMetrics();
    return {
        x: (gameWidth - PLAYFIELD_WIDTH) / 2,
        y: topInset + BLOCK_SIZE * metrics.portraitFieldTopBlocks,
    };
}

export function calcPortraitPlayFieldPosition(gameWidth: number): { x: number; y: number } {
    const pos = calcPortraitPosition(gameWidth);
    return { x: pos.x, y: pos.y - BLOCK_SIZE * 0.75 };
}

export function calcPlaySceneOpponentLayout(
    layoutMode: LayoutMode,
    gameWidth: number,
    gameHeight: number,
    playerFieldY: number,
): PlaySceneOpponentLayout {
    const metrics = getLayoutMetrics();

    if (layoutMode === 'mobile-portrait') {
        const y = playerFieldY + PLAYFIELD_HEIGHT + BLOCK_SIZE * metrics.multiPortraitOpponentOffsetBlocks;
        const availableHeight = gameHeight - y - BLOCK_SIZE * metrics.multiPortraitOpponentBottomMarginBlocks;
        const scale = availableHeight / PLAYFIELD_HEIGHT;
        const x = (gameWidth - PLAYFIELD_WIDTH * scale) / 2;
        return { x, y, scale, labelOffset: 20 };
    }

    const playerAreaWidth = BLOCK_SIZE * metrics.multiPlayerAreaBlocks;
    const rightAreaWidth = gameWidth - playerAreaWidth;
    const x = playerAreaWidth + (rightAreaWidth - PLAYFIELD_WIDTH) / 2;
    const topInset = getTopNavBarHeight(layoutMode);
    const usableHeight = Math.max(0, gameHeight - topInset);
    const y = topInset + (usableHeight - PLAYFIELD_HEIGHT) / 2;
    return { x, y, scale: 1, labelOffset: 30 };
}

export function calcNMultiOpponentArea(layoutMode: LayoutMode, gameWidth: number, gameHeight: number): OpponentAreaLayout {
    const metrics = getLayoutMetrics();

    const topInset = getTopNavBarHeight(layoutMode);

    if (layoutMode === 'mobile-portrait') {
        const x = BLOCK_SIZE * metrics.nMultiPortraitAreaXBlocks;
        const y = topInset + BLOCK_SIZE * metrics.nMultiPortraitAreaYBlocks;
        const width = gameWidth - BLOCK_SIZE * metrics.nMultiPortraitAreaHorizontalPaddingBlocks;
        const height = gameHeight - y - BLOCK_SIZE * metrics.nMultiPortraitAreaBottomPaddingBlocks;
        return { x, y, width, height };
    }

    const x = BLOCK_SIZE * metrics.nMultiDesktopAreaXBlocks;
    const y = topInset + BLOCK_SIZE * metrics.nMultiDesktopAreaYBlocks;
    const width = gameWidth - x - BLOCK_SIZE * metrics.nMultiDesktopAreaRightPaddingBlocks;
    const height = gameHeight - y - BLOCK_SIZE * metrics.nMultiDesktopAreaBottomPaddingBlocks;
    return { x, y, width, height };
}

export function calcPortraitHudLayout(fieldX: number, fieldY: number): PortraitHudLayout {
    const metrics = getLayoutMetrics();
    const holdWidth = metrics.holdWidth * metrics.mobileUiScale;
    const holdHeight = metrics.holdHeight * metrics.mobileUiScale;
    const queueWidth = (BLOCK_SIZE + metrics.holdWidth) * metrics.mobileUiScale;
    const queueHeight = BLOCK_SIZE * metrics.mobileUiScale + metrics.holdHeight * metrics.mobileUiScale;
    const holdY = fieldY - holdHeight - metrics.gap;
    const queueY = holdY - BLOCK_SIZE * metrics.mobileUiScale;

    return {
        holdX: fieldX,
        holdY,
        holdWidth,
        holdHeight,
        queueX: fieldX + PLAYFIELD_WIDTH - queueWidth,
        queueY,
        queueWidth,
        queueHeight,
        infoX: fieldX,
        infoY: fieldY + PLAYFIELD_HEIGHT + BLOCK_SIZE * metrics.mobileInfoGapBlocks,
    };
}

// ─── Layout Factory ─────────────────────────────────────────────────

/**
 * Create the standard game layout: Hold box, Level Indicator, Queue, PlayField, Engine.
 * Supports desktop and mobile-portrait layouts.
 */
export function createGameLayout(options: GameLayoutOptions): GameLayoutResult {
    const layoutMode = options.layoutMode ?? 'desktop';

    if (layoutMode === 'mobile-portrait') {
        return createPortraitLayout(options);
    }
    return createDesktopLayout(options);
}

function createDesktopLayout(options: GameLayoutOptions): GameLayoutResult {
    const { scene, fieldX, fieldY, onHoldInput, isInputBlocked } = options;
    const mainScale = options.mainScale ?? 1;
    const sideScale = options.sideScale ?? 1;
    const metrics = getLayoutMetrics();

    // Hold Box (left of play field)
    const holdX = fieldX - metrics.gap - (metrics.holdWidth * sideScale);
    const holdY = fieldY;
    const holdBox = new TetrominoBox(scene, holdX, holdY, metrics.holdWidth, metrics.holdHeight, "HOLD");
    holdBox.container.setScale(sideScale);

    // Hold Touch Zone
    const holdZone = scene.add.zone(holdX, holdY, metrics.holdWidth * sideScale, metrics.holdHeight * sideScale).setOrigin(0);
    holdZone.setInteractive();
    holdZone.on('pointerdown', () => {
        if (isInputBlocked()) return;
        onHoldInput('hold', InputState.PRESS);
        scene.time.delayedCall(100, () => onHoldInput('hold', InputState.RELEASE));
    });

    // Level Indicator (below hold box)
    const infoX = holdX;
    const infoY = holdY + (metrics.holdHeight * sideScale) + metrics.gap;
    const levelIndicator = new LevelIndicator(scene, infoX, infoY);
    levelIndicator.container.setScale(sideScale);

    // Queue (right of play field)
    const queueX = fieldX + (PLAYFIELD_WIDTH * mainScale) + metrics.gap - (BLOCK_SIZE * sideScale);
    const queueY = fieldY - (BLOCK_SIZE * sideScale);
    const tetrominoQueue = new TetrominoBoxQueue(scene, queueX, queueY, metrics.queueSize);
    tetrominoQueue.container.setScale(sideScale);

    // Play Field
    const playField = new PlayField(scene, fieldX, fieldY, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
    playField.setScale(mainScale);

    // Engine
    const engine = new Engine(playField, holdBox, tetrominoQueue, levelIndicator);

    return { holdBox, levelIndicator, tetrominoQueue, playField, engine };
}

function createPortraitLayout(options: GameLayoutOptions): GameLayoutResult {
    const { scene, fieldX, fieldY, onHoldInput, isInputBlocked } = options;
    const metrics = getLayoutMetrics();
    const hudLayout = calcPortraitHudLayout(fieldX, fieldY);

    // Hold Box (above-left of play field)
    const holdBox = new TetrominoBox(scene, hudLayout.holdX, hudLayout.holdY, metrics.holdWidth, metrics.holdHeight, "HOLD");
    holdBox.container.setScale(metrics.mobileUiScale);

    // Hold Touch Zone
    const holdZone = scene.add.zone(
        hudLayout.holdX,
        hudLayout.holdY,
        hudLayout.holdWidth,
        hudLayout.holdHeight,
    ).setOrigin(0);
    holdZone.setInteractive();
    holdZone.on('pointerdown', () => {
        if (isInputBlocked()) return;
        onHoldInput('hold', InputState.PRESS);
        scene.time.delayedCall(100, () => onHoldInput('hold', InputState.RELEASE));
    });

    // Queue (above-right of play field, single next piece)
    const tetrominoQueue = new TetrominoBoxQueue(scene, hudLayout.queueX, hudLayout.queueY, metrics.mobileQueueSize);
    tetrominoQueue.container.setScale(metrics.mobileUiScale);

    // Play Field
    const playField = new PlayField(scene, fieldX, fieldY, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);

    // Level Indicator (compact, below play field)
    const levelIndicator = new LevelIndicator(scene, hudLayout.infoX, hudLayout.infoY, {
        compact: true,
        compactShowRank: options.compactShowRank ?? false,
    });

    // Engine
    const engine = new Engine(playField, holdBox, tetrominoQueue, levelIndicator);

    return { holdBox, levelIndicator, tetrominoQueue, playField, engine };
}

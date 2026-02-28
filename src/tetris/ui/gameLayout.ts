import { CONST, getBlockSize, InputDirection, InputState } from "../const/const";
import { PlayField } from "../objects/playField";
import { TetrominoBox } from "../objects/tetrominoBox";
import { TetrominoBoxQueue } from "../objects/tetrominoBoxQueue";
import { LevelIndicator } from "../objects/levelIndicator";
import { Engine } from "../engine";
import { LayoutMode } from "../scenes/baseScene";

const BLOCK_SIZE = getBlockSize();

const GAP = BLOCK_SIZE * 0.5;
const HOLD_WIDTH = BLOCK_SIZE * 5;
const HOLD_HEIGHT = BLOCK_SIZE * 3;
const QUEUE_SIZE = 6;

const MOBILE_UI_SCALE = 0.75;
const MOBILE_QUEUE_SIZE = 1;
const PLAYFIELD_WIDTH = BLOCK_SIZE * CONST.PLAY_FIELD.COL_COUNT;
const PLAYFIELD_HEIGHT = BLOCK_SIZE * CONST.PLAY_FIELD.ROW_COUNT;

export type LayoutProfile = 'broadcast-command-center' | 'portrait-compact';

export interface LayoutMetrics {
    gap: number;
    holdWidth: number;
    holdHeight: number;
    queueSize: number;
    mobileQueueSize: number;
    mobileUiScale: number;
    portraitFieldTopBlocks: number;
    multiPortraitOpponentOffsetBlocks: number;
    multiPortraitOpponentBottomMarginBlocks: number;
    nMultiPortraitAreaXBlocks: number;
    nMultiPortraitAreaYBlocks: number;
    nMultiPortraitAreaBottomPaddingBlocks: number;
    nMultiPortraitAreaHorizontalPaddingBlocks: number;
    topNavBarBlocks: number;
    mobileTopNavBarBlocks: number;
    mobileInfoGapBlocks: number;
    commandCenterSingleWidthBlocks: number;
    commandCenterDuelWidthBlocks: number;
    commandCenterNMultiWidthBlocks: number;
    commandCenterHeightBlocks: number;
    commandCenterRailGapBlocks: number;
    commandCenterOuterPaddingBlocks: number;
    duelBoardGapBlocks: number;
    duelPlayerLeftBiasBlocks: number;
    duelQueueClearanceBlocks: number;
    duelOpponentQueueSize: number;
    duelOpponentQueueOffsetBlocks: number;
    duelOpponentSideScaleBase: number;
    duelOpponentSideScaleMin: number;
    duelOpponentSideScaleMax: number;
    duelOpponentPortraitPaddingBlocks: number;
    duelOpponentPortraitScaleMin: number;
    duelOpponentPortraitScaleMax: number;
    duelOpponentPortraitScaleBoost: number;
    duelOpponentIndicatorPaddingBlocks: number;
    duelOpponentIndicatorYOffsetBlocks: number;
    duelOpponentIndicatorPortraitScaleMin: number;
    duelOpponentIndicatorPortraitScaleMax: number;
    duelOpponentIndicatorPortraitScaleBoost: number;
    duelOpponentIndicatorDesktopScaleMin: number;
    nMultiDesktopWallWidthBlocks: number;
    nMultiDesktopWallTopBlocks: number;
    nMultiDesktopWallBottomPaddingBlocks: number;
    nMultiWallTitleHeightDesktopBlocks: number;
    nMultiWallTitleHeightPortraitBlocks: number;
    nMultiWallPanelRadiusDesktopBlocks: number;
    nMultiWallPanelRadiusPortraitBlocks: number;
    nMultiWallPanelPaddingDesktopBlocks: number;
    nMultiWallPanelPaddingPortraitBlocks: number;
    nMultiWallTitleYOffsetBlocks: number;
    nMultiWallHintYOffsetBlocks: number;
    nMultiWallMiniCellWidthInsetBlocks: number;
    nMultiWallMiniCellHeightInsetBlocks: number;
    nMultiWallMiniCellOffsetXBlocks: number;
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

export interface DesktopHudLayout extends PortraitHudLayout {
    holdTouchWidth: number;
    holdTouchHeight: number;
}

export interface GameLayoutResult {
    holdBox: TetrominoBox;
    levelIndicator: LevelIndicator;
    tetrominoQueue: TetrominoBoxQueue;
    playField: PlayField;
    engine: Engine;
    holdInputZone: Phaser.GameObjects.Zone;
}

export interface GameLayoutOptions {
    scene: Phaser.Scene;
    fieldX: number;
    fieldY: number;
    mainScale?: number;
    sideScale?: number;
    onHoldInput: (direction: InputDirection, state: InputState) => void;
    isInputBlocked: () => boolean;
    layoutMode?: LayoutMode;
    compactShowRank?: boolean;
}

export function resolveLayoutProfile(layoutMode: LayoutMode): LayoutProfile {
    return layoutMode === 'mobile-portrait' ? 'portrait-compact' : 'broadcast-command-center';
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
        multiPortraitOpponentOffsetBlocks: 1.5,
        multiPortraitOpponentBottomMarginBlocks: 0.5,
        nMultiPortraitAreaXBlocks: 0.5,
        nMultiPortraitAreaYBlocks: 25.5,
        nMultiPortraitAreaBottomPaddingBlocks: 0.5,
        nMultiPortraitAreaHorizontalPaddingBlocks: 1,
        topNavBarBlocks: 1.6,
        mobileTopNavBarBlocks: 1.6,
        mobileInfoGapBlocks: 0.2,
        commandCenterSingleWidthBlocks: 28,
        commandCenterDuelWidthBlocks: 39,
        commandCenterNMultiWidthBlocks: 44,
        commandCenterHeightBlocks: 24,
        commandCenterRailGapBlocks: 0.5,
        commandCenterOuterPaddingBlocks: 0.75,
        duelBoardGapBlocks: 1.75,
        duelPlayerLeftBiasBlocks: 3.5,
        duelQueueClearanceBlocks: 2.3,
        duelOpponentQueueSize: 4,
        duelOpponentQueueOffsetBlocks: 1,
        duelOpponentSideScaleBase: 0.78,
        duelOpponentSideScaleMin: 0.58,
        duelOpponentSideScaleMax: 0.86,
        duelOpponentPortraitPaddingBlocks: 0.25,
        duelOpponentPortraitScaleMin: 0.14,
        duelOpponentPortraitScaleMax: 0.56,
        duelOpponentPortraitScaleBoost: 1.6,
        duelOpponentIndicatorPaddingBlocks: 0.35,
        duelOpponentIndicatorYOffsetBlocks: 0.2,
        duelOpponentIndicatorPortraitScaleMin: 0.44,
        duelOpponentIndicatorPortraitScaleMax: 0.62,
        duelOpponentIndicatorPortraitScaleBoost: 1.35,
        duelOpponentIndicatorDesktopScaleMin: 0.92,
        nMultiDesktopWallWidthBlocks: 13,
        nMultiDesktopWallTopBlocks: 0.75,
        nMultiDesktopWallBottomPaddingBlocks: 0.75,
        nMultiWallTitleHeightDesktopBlocks: 1.125,
        nMultiWallTitleHeightPortraitBlocks: 0.875,
        nMultiWallPanelRadiusDesktopBlocks: 0.3125,
        nMultiWallPanelRadiusPortraitBlocks: 0.25,
        nMultiWallPanelPaddingDesktopBlocks: 0.25,
        nMultiWallPanelPaddingPortraitBlocks: 0.125,
        nMultiWallTitleYOffsetBlocks: 0.0625,
        nMultiWallHintYOffsetBlocks: 0.375,
        nMultiWallMiniCellWidthInsetBlocks: 0.125,
        nMultiWallMiniCellHeightInsetBlocks: 0.25,
        nMultiWallMiniCellOffsetXBlocks: 0.0625,
    };
}

export function getTopNavBarHeight(layoutMode: LayoutMode = 'desktop'): number {
    const metrics = getLayoutMetrics();
    const blocks = layoutMode === 'mobile-portrait' ? metrics.mobileTopNavBarBlocks : metrics.topNavBarBlocks;
    return BLOCK_SIZE * blocks;
}

export function calcPlaySceneDimensions(layoutMode: LayoutMode, mode: string): { width: number; height: number } {
    const metrics = getLayoutMetrics();
    const topNavBarHeight = getTopNavBarHeight(layoutMode);
    const profile = resolveLayoutProfile(layoutMode);

    if (profile === 'portrait-compact') {
        if (mode === 'multi') {
            return { width: BLOCK_SIZE * 12, height: BLOCK_SIZE * 34 + topNavBarHeight };
        }
        return { width: BLOCK_SIZE * 12, height: BLOCK_SIZE * 26 + topNavBarHeight };
    }

    if (mode === 'multi') {
        return {
            width: BLOCK_SIZE * metrics.commandCenterDuelWidthBlocks,
            height: BLOCK_SIZE * metrics.commandCenterHeightBlocks + topNavBarHeight,
        };
    }

    return {
        width: BLOCK_SIZE * metrics.commandCenterSingleWidthBlocks,
        height: BLOCK_SIZE * metrics.commandCenterHeightBlocks + topNavBarHeight,
    };
}

export function calcNMultiSceneDimensions(layoutMode: LayoutMode): { width: number; height: number } {
    const metrics = getLayoutMetrics();
    const topNavBarHeight = getTopNavBarHeight(layoutMode);
    const profile = resolveLayoutProfile(layoutMode);

    if (profile === 'portrait-compact') {
        return { width: BLOCK_SIZE * 12, height: BLOCK_SIZE * 34 + topNavBarHeight };
    }

    return {
        width: BLOCK_SIZE * metrics.commandCenterNMultiWidthBlocks,
        height: BLOCK_SIZE * metrics.commandCenterHeightBlocks + topNavBarHeight,
    };
}

export function calcSinglePlayerPosition(
    gameWidth: number,
    gameHeight: number,
    mainScale: number = 1,
    topInset: number = getTopNavBarHeight(),
): { x: number; y: number } {
    const usableHeight = Math.max(0, gameHeight - topInset);
    return {
        x: (gameWidth - PLAYFIELD_WIDTH * mainScale) / 2,
        y: topInset + (usableHeight - PLAYFIELD_HEIGHT * mainScale) / 2,
    };
}

export function calcDuelPlayerPosition(
    gameWidth: number,
    gameHeight: number,
    topInset: number = getTopNavBarHeight(),
): { x: number; y: number } {
    const metrics = getLayoutMetrics();
    const gap = BLOCK_SIZE * metrics.duelBoardGapBlocks;
    const usableHeight = Math.max(0, gameHeight - topInset);
    const outerPadding = BLOCK_SIZE * metrics.commandCenterOuterPaddingBlocks;
    const leftBias = BLOCK_SIZE * metrics.duelPlayerLeftBiasBlocks;
    const leftRailGap = BLOCK_SIZE * metrics.commandCenterRailGapBlocks;
    const minFieldXForLeftRail = outerPadding + leftRailGap + metrics.holdWidth;
    const centeredX = (gameWidth - (PLAYFIELD_WIDTH * 2 + gap)) / 2;

    return {
        x: Math.max(minFieldXForLeftRail, centeredX - leftBias),
        y: topInset + (usableHeight - PLAYFIELD_HEIGHT) / 2,
    };
}

export function calcNMultiPlayerPosition(
    gameHeight: number,
    gameWidth: number = BLOCK_SIZE * getLayoutMetrics().commandCenterNMultiWidthBlocks,
    topInset: number = getTopNavBarHeight(),
): { x: number; y: number } {
    const metrics = getLayoutMetrics();
    const wallWidth = BLOCK_SIZE * metrics.nMultiDesktopWallWidthBlocks;
    const outerPadding = BLOCK_SIZE * metrics.commandCenterOuterPaddingBlocks;
    const leftAreaWidth = Math.max(PLAYFIELD_WIDTH, gameWidth - wallWidth - outerPadding * 3);
    const usableHeight = Math.max(0, gameHeight - topInset);
    const leftBias = BLOCK_SIZE * metrics.duelPlayerLeftBiasBlocks;
    const centeredX = outerPadding + (leftAreaWidth - PLAYFIELD_WIDTH) / 2;

    return {
        x: Math.max(outerPadding, centeredX - leftBias),
        y: topInset + (usableHeight - PLAYFIELD_HEIGHT) / 2,
    };
}

export function calcPortraitPosition(
    gameWidth: number,
    topInset: number = getTopNavBarHeight('mobile-portrait'),
): { x: number; y: number } {
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

    if (resolveLayoutProfile(layoutMode) === 'portrait-compact') {
        const y = playerFieldY + PLAYFIELD_HEIGHT + BLOCK_SIZE * metrics.multiPortraitOpponentOffsetBlocks;
        const availableHeight = gameHeight - y - BLOCK_SIZE * metrics.multiPortraitOpponentBottomMarginBlocks;
        const scale = availableHeight / PLAYFIELD_HEIGHT;
        const x = (gameWidth - PLAYFIELD_WIDTH * scale) / 2;
        return { x, y, scale, labelOffset: 20 };
    }

    const playerPos = calcDuelPlayerPosition(gameWidth, gameHeight, getTopNavBarHeight(layoutMode));
    const hud = calcDesktopHudLayout(playerPos.x, playerPos.y, 1, 1);
    const clearance = BLOCK_SIZE * metrics.duelQueueClearanceBlocks;
    const rightPadding = BLOCK_SIZE * metrics.commandCenterOuterPaddingBlocks;
    const xByQueue = hud.queueX + hud.queueWidth + clearance;
    const x = Math.min(xByQueue, gameWidth - PLAYFIELD_WIDTH - rightPadding);

    return {
        x,
        y: playerPos.y,
        scale: 1,
        labelOffset: 24,
    };
}

export function calcNMultiOpponentArea(layoutMode: LayoutMode, gameWidth: number, gameHeight: number): OpponentAreaLayout {
    const metrics = getLayoutMetrics();
    const topInset = getTopNavBarHeight(layoutMode);

    if (resolveLayoutProfile(layoutMode) === 'portrait-compact') {
        const x = BLOCK_SIZE * metrics.nMultiPortraitAreaXBlocks;
        const y = topInset + BLOCK_SIZE * metrics.nMultiPortraitAreaYBlocks;
        const width = gameWidth - BLOCK_SIZE * metrics.nMultiPortraitAreaHorizontalPaddingBlocks;
        const height = gameHeight - y - BLOCK_SIZE * metrics.nMultiPortraitAreaBottomPaddingBlocks;
        return { x, y, width, height };
    }

    const playerPos = calcNMultiPlayerPosition(gameHeight, gameWidth, topInset);
    const hud = calcDesktopHudLayout(playerPos.x, playerPos.y, 1, 1);
    const clearance = BLOCK_SIZE * metrics.duelQueueClearanceBlocks;
    const x = hud.queueX + hud.queueWidth + clearance;
    const y = topInset + BLOCK_SIZE * metrics.nMultiDesktopWallTopBlocks;
    const width = Math.max(BLOCK_SIZE * 6, gameWidth - x - BLOCK_SIZE * metrics.commandCenterOuterPaddingBlocks);
    const height = gameHeight - y - BLOCK_SIZE * metrics.nMultiDesktopWallBottomPaddingBlocks;
    return { x, y, width, height };
}

export function calcDesktopHudLayout(
    fieldX: number,
    fieldY: number,
    mainScale: number = 1,
    sideScale: number = 1,
): DesktopHudLayout {
    const metrics = getLayoutMetrics();
    const railGap = BLOCK_SIZE * metrics.commandCenterRailGapBlocks;

    const holdX = fieldX - railGap - (metrics.holdWidth * sideScale);
    const holdY = fieldY;

    const queueX = fieldX + (PLAYFIELD_WIDTH * mainScale) + railGap - (BLOCK_SIZE * sideScale);
    // Queue's first visible box starts at +1 block inside container.
    // Shift container up by exactly 1 scaled block so NEXT top aligns with HOLD top.
    const queueY = holdY - (BLOCK_SIZE * sideScale);

    return {
        holdX,
        holdY,
        holdWidth: metrics.holdWidth * sideScale,
        holdHeight: metrics.holdHeight * sideScale,
        queueX,
        queueY,
        queueWidth: (BLOCK_SIZE + metrics.holdWidth) * sideScale,
        queueHeight: (BLOCK_SIZE + metrics.holdHeight) * sideScale,
        infoX: holdX,
        infoY: holdY + (metrics.holdHeight * sideScale) + metrics.gap * 1.15,
        holdTouchWidth: metrics.holdWidth * sideScale,
        holdTouchHeight: metrics.holdHeight * sideScale,
    };
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

export function createGameLayout(options: GameLayoutOptions): GameLayoutResult {
    const layoutMode = options.layoutMode ?? 'desktop';

    if (resolveLayoutProfile(layoutMode) === 'portrait-compact') {
        return createPortraitLayout(options);
    }
    return createDesktopLayout(options);
}

function createDesktopLayout(options: GameLayoutOptions): GameLayoutResult {
    const { scene, fieldX, fieldY, onHoldInput, isInputBlocked } = options;
    const mainScale = options.mainScale ?? 1;
    const sideScale = options.sideScale ?? 1;
    const metrics = getLayoutMetrics();
    const hudLayout = calcDesktopHudLayout(fieldX, fieldY, mainScale, sideScale);

    const holdBox = new TetrominoBox(scene, hudLayout.holdX, hudLayout.holdY, metrics.holdWidth, metrics.holdHeight, "HOLD");
    holdBox.container.setScale(sideScale);

    const holdZone = scene.add.zone(
        hudLayout.holdX,
        hudLayout.holdY,
        hudLayout.holdTouchWidth,
        hudLayout.holdTouchHeight,
    ).setOrigin(0);
    holdZone.setInteractive();
    holdZone.on('pointerdown', () => {
        if (isInputBlocked()) return;
        onHoldInput('hold', InputState.PRESS);
        scene.time.delayedCall(100, () => onHoldInput('hold', InputState.RELEASE));
    });

    const levelIndicator = new LevelIndicator(scene, hudLayout.infoX, hudLayout.infoY);
    levelIndicator.container.setScale(sideScale);

    const tetrominoQueue = new TetrominoBoxQueue(scene, hudLayout.queueX, hudLayout.queueY, metrics.queueSize);
    tetrominoQueue.container.setScale(sideScale);

    const playField = new PlayField(scene, fieldX, fieldY, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
    playField.setScale(mainScale);

    const engine = new Engine(playField, holdBox, tetrominoQueue, levelIndicator);

    return { holdBox, levelIndicator, tetrominoQueue, playField, engine, holdInputZone: holdZone };
}

function createPortraitLayout(options: GameLayoutOptions): GameLayoutResult {
    const { scene, fieldX, fieldY, onHoldInput, isInputBlocked } = options;
    const metrics = getLayoutMetrics();
    const hudLayout = calcPortraitHudLayout(fieldX, fieldY);

    const holdBox = new TetrominoBox(scene, hudLayout.holdX, hudLayout.holdY, metrics.holdWidth, metrics.holdHeight, "HOLD");
    holdBox.container.setScale(metrics.mobileUiScale);

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

    const tetrominoQueue = new TetrominoBoxQueue(scene, hudLayout.queueX, hudLayout.queueY, metrics.mobileQueueSize);
    tetrominoQueue.container.setScale(metrics.mobileUiScale);

    const playField = new PlayField(scene, fieldX, fieldY, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);

    const levelIndicator = new LevelIndicator(scene, hudLayout.infoX, hudLayout.infoY, {
        compact: true,
        compactShowRank: options.compactShowRank ?? false,
    });

    const engine = new Engine(playField, holdBox, tetrominoQueue, levelIndicator);

    return { holdBox, levelIndicator, tetrominoQueue, playField, engine, holdInputZone: holdZone };
}

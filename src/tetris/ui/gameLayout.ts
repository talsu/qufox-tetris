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
const MOBILE_HOLD_WIDTH = BLOCK_SIZE * 4;
const MOBILE_HOLD_HEIGHT = BLOCK_SIZE * 3;
const MOBILE_QUEUE_SIZE = 1;

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
}

// ─── Dimension Calculators ──────────────────────────────────────────

/**
 * Calculate scene dimensions based on layout mode for PlayScene.
 */
export function calcPlaySceneDimensions(layoutMode: LayoutMode, mode: string): { width: number; height: number } {
    if (layoutMode === 'mobile-portrait') {
        if (mode === 'multi') {
            return { width: BLOCK_SIZE * 12, height: BLOCK_SIZE * 35 };
        }
        return { width: BLOCK_SIZE * 12, height: BLOCK_SIZE * 27 };
    }
    if (mode === 'multi') {
        return { width: BLOCK_SIZE * 34, height: BLOCK_SIZE * 22 };
    }
    return { width: BLOCK_SIZE * 22, height: BLOCK_SIZE * 22 };
}

/**
 * Calculate scene dimensions based on layout mode for NMultiPlayScene.
 */
export function calcNMultiSceneDimensions(layoutMode: LayoutMode): { width: number; height: number } {
    if (layoutMode === 'mobile-portrait') {
        return { width: BLOCK_SIZE * 12, height: BLOCK_SIZE * 35 };
    }
    return { width: BLOCK_SIZE * 36, height: BLOCK_SIZE * 22 };
}

// ─── Position Calculators ───────────────────────────────────────────

/**
 * Calculate the play field position for single-player mode (centered).
 */
export function calcSinglePlayerPosition(gameWidth: number, gameHeight: number, mainScale: number = 1) {
    const rawWidth = BLOCK_SIZE * CONST.PLAY_FIELD.COL_COUNT;
    const rawHeight = BLOCK_SIZE * CONST.PLAY_FIELD.ROW_COUNT;
    return {
        x: (gameWidth - rawWidth * mainScale) / 2,
        y: (gameHeight - rawHeight * mainScale) / 2,
    };
}

/**
 * Calculate the play field position for N-multi mode (centered in left player area).
 */
export function calcNMultiPlayerPosition(gameHeight: number, playerAreaBlocks: number = 23) {
    const rawWidth = BLOCK_SIZE * CONST.PLAY_FIELD.COL_COUNT;
    const rawHeight = BLOCK_SIZE * CONST.PLAY_FIELD.ROW_COUNT;
    const leftArea = BLOCK_SIZE * playerAreaBlocks;
    return {
        x: (leftArea - rawWidth) / 2,
        y: (gameHeight - rawHeight) / 2,
    };
}

/**
 * Portrait position: playfield centered horizontally, below hold+next row.
 */
export function calcPortraitPosition(gameWidth: number): { x: number; y: number } {
    const rawWidth = BLOCK_SIZE * CONST.PLAY_FIELD.COL_COUNT;
    return {
        x: (gameWidth - rawWidth) / 2,
        y: BLOCK_SIZE * 4.7,  // Below hold+next row with header text clearance
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

    const rawPlayFieldWidth = BLOCK_SIZE * CONST.PLAY_FIELD.COL_COUNT;
    const rawPlayFieldHeight = BLOCK_SIZE * CONST.PLAY_FIELD.ROW_COUNT;

    // Hold Box (left of play field)
    const holdX = fieldX - GAP - (HOLD_WIDTH * sideScale);
    const holdY = fieldY;
    const holdBox = new TetrominoBox(scene, holdX, holdY, HOLD_WIDTH, HOLD_HEIGHT, "HOLD");
    holdBox.container.setScale(sideScale);

    // Hold Touch Zone
    const holdZone = scene.add.zone(holdX, holdY, HOLD_WIDTH * sideScale, HOLD_HEIGHT * sideScale).setOrigin(0);
    holdZone.setInteractive();
    holdZone.on('pointerdown', () => {
        if (isInputBlocked()) return;
        onHoldInput('hold', InputState.PRESS);
        scene.time.delayedCall(100, () => onHoldInput('hold', InputState.RELEASE));
    });

    // Level Indicator (below hold box)
    const infoX = holdX;
    const infoY = holdY + (HOLD_HEIGHT * sideScale) + GAP;
    const levelIndicator = new LevelIndicator(scene, infoX, infoY);
    levelIndicator.container.setScale(sideScale);

    // Queue (right of play field)
    const queueX = fieldX + (rawPlayFieldWidth * mainScale) + GAP - (BLOCK_SIZE * sideScale);
    const queueY = fieldY - (BLOCK_SIZE * sideScale);
    const tetrominoQueue = new TetrominoBoxQueue(scene, queueX, queueY, QUEUE_SIZE);
    tetrominoQueue.container.setScale(sideScale);

    // Play Field
    const playField = new PlayField(scene, fieldX, fieldY, rawPlayFieldWidth, rawPlayFieldHeight);
    playField.setScale(mainScale);

    // Engine
    const engine = new Engine(playField, holdBox, tetrominoQueue, levelIndicator);

    return { holdBox, levelIndicator, tetrominoQueue, playField, engine };
}

function createPortraitLayout(options: GameLayoutOptions): GameLayoutResult {
    const { scene, fieldX, fieldY, onHoldInput, isInputBlocked } = options;

    const rawPlayFieldWidth = BLOCK_SIZE * CONST.PLAY_FIELD.COL_COUNT;
    const rawPlayFieldHeight = BLOCK_SIZE * CONST.PLAY_FIELD.ROW_COUNT;

    // Hold Box (above-left of play field)
    const holdX = fieldX;
    const holdY = fieldY - MOBILE_HOLD_HEIGHT - GAP - BLOCK_SIZE * 0.6; // space for header text
    const holdBox = new TetrominoBox(scene, holdX, holdY, MOBILE_HOLD_WIDTH, MOBILE_HOLD_HEIGHT, "HOLD");

    // Hold Touch Zone
    const holdZone = scene.add.zone(holdX, holdY, MOBILE_HOLD_WIDTH, MOBILE_HOLD_HEIGHT).setOrigin(0);
    holdZone.setInteractive();
    holdZone.on('pointerdown', () => {
        if (isInputBlocked()) return;
        onHoldInput('hold', InputState.PRESS);
        scene.time.delayedCall(100, () => onHoldInput('hold', InputState.RELEASE));
    });

    // Queue (above-right of play field, single next piece)
    const queueX = fieldX + rawPlayFieldWidth - MOBILE_HOLD_WIDTH - BLOCK_SIZE;
    const queueY = holdY - BLOCK_SIZE;
    const tetrominoQueue = new TetrominoBoxQueue(scene, queueX, queueY, MOBILE_QUEUE_SIZE);

    // Play Field
    const playField = new PlayField(scene, fieldX, fieldY, rawPlayFieldWidth, rawPlayFieldHeight);

    // Level Indicator (compact, below play field)
    const infoX = fieldX;
    const infoY = fieldY + rawPlayFieldHeight + GAP;
    const levelIndicator = new LevelIndicator(scene, infoX, infoY, { compact: true });

    // Engine
    const engine = new Engine(playField, holdBox, tetrominoQueue, levelIndicator);

    return { holdBox, levelIndicator, tetrominoQueue, playField, engine };
}

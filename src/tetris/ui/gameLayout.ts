import { CONST, getBlockSize, InputState } from "../const/const";
import { PlayField } from "../objects/playField";
import { TetrominoBox } from "../objects/tetrominoBox";
import { TetrominoBoxQueue } from "../objects/tetrominoBoxQueue";
import { LevelIndicator } from "../objects/levelIndicator";
import { Engine } from "../engine";

const BLOCK_SIZE = getBlockSize();

// ─── Layout Constants ───────────────────────────────────────────────
const GAP = BLOCK_SIZE * 0.5;
const HOLD_WIDTH = BLOCK_SIZE * 5;
const HOLD_HEIGHT = BLOCK_SIZE * 3;
const QUEUE_SIZE = 6;

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
}

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
 * Calculate the play field position for multiplayer mode (left side).
 */
export function calcMultiPlayerPosition(gameWidth: number, gameHeight: number) {
    const rawWidth = BLOCK_SIZE * CONST.PLAY_FIELD.COL_COUNT;
    const rawHeight = BLOCK_SIZE * CONST.PLAY_FIELD.ROW_COUNT;
    return {
        x: (gameWidth * 0.25) - (rawWidth / 2),
        y: (gameHeight - rawHeight) / 2,
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
 * Create the standard game layout: Hold box, Level Indicator, Queue, PlayField, Engine.
 * Eliminates the duplicate layout code between PlayScene and NMultiPlayScene.
 */
export function createGameLayout(options: GameLayoutOptions): GameLayoutResult {
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

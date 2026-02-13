import { getBlockSize } from "../const/const";

const BLOCK_SIZE = getBlockSize();
export const GAME_FONT_FAMILY = 'Pretendard, Arial Black, sans-serif';

// ─── Common Text Visual Effects ─────────────────────────────────────
export const TEXT_STROKE_COLOR = '#000000';
export const TEXT_SHADOW = {
    offsetX: 2,
    offsetY: 2,
    color: '#000000',
    blur: 2,
    stroke: true,
    fill: true,
} as const;

// ─── Panel Background Defaults ──────────────────────────────────────
export const PANEL_BG = {
    fillColor: 0x000000,
    fillAlpha: 0.2,
    strokeColor: 0xEEEEEE,
    strokeAlpha: 1.0,
    lineWidth: 1,
} as const;

// ─── Reusable Text Style Presets ────────────────────────────────────
export const TextStyles = {
    header: {
        fontFamily: GAME_FONT_FAMILY,
        fontStyle: 'bold',
        fontSize: `${BLOCK_SIZE * 0.7}px`,
        color: '#ffffff',
        align: 'left',
    },

    valueLarge: {
        fontFamily: GAME_FONT_FAMILY,
        fontSize: `${BLOCK_SIZE * 0.8}px`,
        color: '#ffffff',
        align: 'left',
    },

    label: {
        fontFamily: GAME_FONT_FAMILY,
        fontStyle: 'bold',
        fontSize: `${BLOCK_SIZE * 0.5}px`,
        color: '#ffffff',
        align: 'left',
    },

    valueSmall: {
        fontFamily: GAME_FONT_FAMILY,
        fontSize: `${BLOCK_SIZE * 0.5}px`,
        color: '#ffffff',
        align: 'right',
    },

    action: {
        fontFamily: GAME_FONT_FAMILY,
        fontSize: `${BLOCK_SIZE * 0.8}px`,
        color: '#ffff00',
        align: 'center',
    },

    combo: {
        fontFamily: GAME_FONT_FAMILY,
        fontSize: `${BLOCK_SIZE * 0.5}px`,
        color: '#00ffff',
        align: 'center',
    },
} as const;

// ─── Helper Functions ───────────────────────────────────────────────

/**
 * Apply stroke + shadow to a Phaser Text object for consistent readability.
 */
export function applyTextEffect(
    text: Phaser.GameObjects.Text,
    strokeThickness: number = 4
): Phaser.GameObjects.Text {
    text.setStroke(TEXT_STROKE_COLOR, strokeThickness);
    text.setShadow(
        TEXT_SHADOW.offsetX,
        TEXT_SHADOW.offsetY,
        TEXT_SHADOW.color,
        TEXT_SHADOW.blur,
        TEXT_SHADOW.stroke,
        TEXT_SHADOW.fill,
    );
    return text;
}

/**
 * Draw a standard panel background (fill + stroke rectangle) on a Graphics object.
 */
export function drawPanelBackground(
    graphics: Phaser.GameObjects.Graphics,
    width: number,
    height: number,
    x: number = 0,
    y: number = 0,
): Phaser.GameObjects.Graphics {
    graphics.fillStyle(PANEL_BG.fillColor, PANEL_BG.fillAlpha);
    graphics.fillRect(x, y, width, height);
    graphics.lineStyle(PANEL_BG.lineWidth, PANEL_BG.strokeColor, PANEL_BG.strokeAlpha);
    graphics.strokeRect(x, y, width, height);
    return graphics;
}

/**
 * Create a styled text, apply text effect, and add to a container in one call.
 */
export function createStyledText(
    scene: Phaser.Scene,
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    content: string,
    style: Phaser.Types.GameObjects.Text.TextStyle,
    strokeThickness: number = 4,
): Phaser.GameObjects.Text {
    const text = scene.add.text(x, y, content, style);
    applyTextEffect(text, strokeThickness);
    container.add(text);
    return text;
}

/**
 * Create a label + value row (left-aligned label, right-aligned value).
 * Returns the value text for later updates.
 */
export function createStatRow(
    scene: Phaser.Scene,
    container: Phaser.GameObjects.Container,
    y: number,
    label: string,
    xLeft: number,
    xRight: number,
    strokeThickness: number = 3,
): Phaser.GameObjects.Text {
    createStyledText(scene, container, xLeft, y, label, TextStyles.label, strokeThickness);
    const valueText = createStyledText(scene, container, xRight, y, '0', TextStyles.valueSmall, strokeThickness);
    valueText.setOrigin(1, 0);
    return valueText;
}

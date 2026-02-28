import { KENNEY_UI_IMAGE_KEYS } from './kenneyAssets';
import { GAME_FONT_FAMILY } from './uiStyles';

export type KenneyButtonKind = 'blue' | 'green' | 'red';
export type KenneyButtonState = 'normal' | 'hover' | 'pressed';

export interface KenneyButtonVisual {
    background: Phaser.GameObjects.Image;
    label: Phaser.GameObjects.Text;
    hitArea: Phaser.GameObjects.Rectangle;
    kind: KenneyButtonKind;
    state: KenneyButtonState;
}

export interface CreateKenneyButtonVisualOptions {
    scene: Phaser.Scene;
    text: string;
    kind: KenneyButtonKind;
    originX?: number;
    originY?: number;
    interactive?: boolean;
    labelStyle?: Phaser.Types.GameObjects.Text.TextStyle;
    labelStrokeColor?: string;
    labelStrokeThickness?: number;
}

export function resolveKenneyButtonTexture(kind: KenneyButtonKind, state: KenneyButtonState): string {
    if (kind === 'green') {
        if (state === 'hover') return KENNEY_UI_IMAGE_KEYS.buttonGreenHover;
        if (state === 'pressed') return KENNEY_UI_IMAGE_KEYS.buttonGreenPressed;
        return KENNEY_UI_IMAGE_KEYS.buttonGreenNormal;
    }
    if (kind === 'red') {
        if (state === 'hover') return KENNEY_UI_IMAGE_KEYS.buttonRedHover;
        if (state === 'pressed') return KENNEY_UI_IMAGE_KEYS.buttonRedPressed;
        return KENNEY_UI_IMAGE_KEYS.buttonRedNormal;
    }
    if (state === 'hover') return KENNEY_UI_IMAGE_KEYS.buttonBlueHover;
    if (state === 'pressed') return KENNEY_UI_IMAGE_KEYS.buttonBluePressed;
    return KENNEY_UI_IMAGE_KEYS.buttonBlueNormal;
}

export function createKenneyButtonVisual(options: CreateKenneyButtonVisualOptions): KenneyButtonVisual {
    const originX = options.originX ?? 0.5;
    const originY = options.originY ?? 0.5;

    const background = options.scene.add
        .image(0, 0, resolveKenneyButtonTexture(options.kind, 'normal'))
        .setOrigin(originX, originY);

    const hitArea = options.scene.add
        .rectangle(0, 0, 1, 1, 0x000000, 0.001)
        .setOrigin(originX, originY);

    if (options.interactive !== false) {
        hitArea.setInteractive({ useHandCursor: true });
    }

    const label = options.scene.add
        .text(0, 0, options.text, {
            fontFamily: GAME_FONT_FAMILY,
            color: '#ffffff',
            fontStyle: 'bold',
            align: 'center',
            ...(options.labelStyle || {}),
        })
        .setOrigin(0.5);

    label.setStroke(options.labelStrokeColor ?? '#163670', options.labelStrokeThickness ?? 4);

    return {
        background,
        label,
        hitArea,
        kind: options.kind,
        state: 'normal',
    };
}

export function setKenneyButtonState(
    button: KenneyButtonVisual,
    state: KenneyButtonState,
    pressedScale: number = 0.985,
): void {
    button.state = state;
    button.background.setTexture(resolveKenneyButtonTexture(button.kind, state));
    button.label.setScale(state === 'pressed' ? pressedScale : 1);
}

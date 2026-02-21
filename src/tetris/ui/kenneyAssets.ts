export const KENNEY_UI_IMAGE_KEYS = {
    buttonBlueNormal: 'kenneyUiButtonBlueNormal',
    buttonBlueHover: 'kenneyUiButtonBlueHover',
    buttonBluePressed: 'kenneyUiButtonBluePressed',
    buttonRedNormal: 'kenneyUiButtonRedNormal',
    buttonRedHover: 'kenneyUiButtonRedHover',
    buttonRedPressed: 'kenneyUiButtonRedPressed',
    buttonGreenNormal: 'kenneyUiButtonGreenNormal',
    buttonGreenHover: 'kenneyUiButtonGreenHover',
    buttonGreenPressed: 'kenneyUiButtonGreenPressed',
} as const;

const KENNEY_UI_IMAGE_PATHS: Record<(typeof KENNEY_UI_IMAGE_KEYS)[keyof typeof KENNEY_UI_IMAGE_KEYS], string> = {
    [KENNEY_UI_IMAGE_KEYS.buttonBlueNormal]: '/assets/image/ui-pack/PNG/Blue/Double/button_rectangle_depth_gloss.png',
    [KENNEY_UI_IMAGE_KEYS.buttonBlueHover]: '/assets/image/ui-pack/PNG/Blue/Double/button_rectangle_depth_gradient.png',
    [KENNEY_UI_IMAGE_KEYS.buttonBluePressed]: '/assets/image/ui-pack/PNG/Blue/Double/button_rectangle_depth_flat.png',
    [KENNEY_UI_IMAGE_KEYS.buttonRedNormal]: '/assets/image/ui-pack/PNG/Red/Double/button_rectangle_depth_gloss.png',
    [KENNEY_UI_IMAGE_KEYS.buttonRedHover]: '/assets/image/ui-pack/PNG/Red/Double/button_rectangle_depth_gradient.png',
    [KENNEY_UI_IMAGE_KEYS.buttonRedPressed]: '/assets/image/ui-pack/PNG/Red/Double/button_rectangle_depth_flat.png',
    [KENNEY_UI_IMAGE_KEYS.buttonGreenNormal]: '/assets/image/ui-pack/PNG/Green/Double/button_rectangle_depth_gloss.png',
    [KENNEY_UI_IMAGE_KEYS.buttonGreenHover]: '/assets/image/ui-pack/PNG/Green/Double/button_rectangle_depth_gradient.png',
    [KENNEY_UI_IMAGE_KEYS.buttonGreenPressed]: '/assets/image/ui-pack/PNG/Green/Double/button_rectangle_depth_flat.png',
};

export type KenneyImpactGroup = 'hardDrop' | 'lock' | 'lineClear' | 'hold' | 'gameOver';

const KENNEY_IMPACT_SOUND_KEYS: Record<KenneyImpactGroup, string[]> = {
    hardDrop: [
        'kenneyImpactHardDrop0',
        'kenneyImpactHardDrop1',
    ],
    lock: [
        'kenneyImpactLock0',
        'kenneyImpactLock1',
    ],
    lineClear: [
        'kenneyImpactLineClear0',
        'kenneyImpactLineClear1',
    ],
    hold: [
        'kenneyImpactHold0',
        'kenneyImpactHold1',
    ],
    gameOver: [
        'kenneyImpactGameOver0',
        'kenneyImpactGameOver1',
    ],
};

const KENNEY_IMPACT_SOUND_PATHS: Record<string, { ogg: string; mp3: string }> = {
    kenneyImpactHardDrop0: {
        ogg: '/assets/sound/impact-sounds/Audio/impactMetal_heavy_000.ogg',
        mp3: '/assets/sound/impact-sounds/Audio/impactMetal_heavy_000.mp3',
    },
    kenneyImpactHardDrop1: {
        ogg: '/assets/sound/impact-sounds/Audio/impactMetal_heavy_002.ogg',
        mp3: '/assets/sound/impact-sounds/Audio/impactMetal_heavy_002.mp3',
    },
    kenneyImpactLock0: {
        ogg: '/assets/sound/impact-sounds/Audio/impactWood_medium_000.ogg',
        mp3: '/assets/sound/impact-sounds/Audio/impactWood_medium_000.mp3',
    },
    kenneyImpactLock1: {
        ogg: '/assets/sound/impact-sounds/Audio/impactWood_medium_002.ogg',
        mp3: '/assets/sound/impact-sounds/Audio/impactWood_medium_002.mp3',
    },
    kenneyImpactLineClear0: {
        ogg: '/assets/sound/impact-sounds/Audio/impactGlass_light_001.ogg',
        mp3: '/assets/sound/impact-sounds/Audio/impactGlass_light_001.mp3',
    },
    kenneyImpactLineClear1: {
        ogg: '/assets/sound/impact-sounds/Audio/impactGlass_light_003.ogg',
        mp3: '/assets/sound/impact-sounds/Audio/impactGlass_light_003.mp3',
    },
    kenneyImpactHold0: {
        ogg: '/assets/sound/impact-sounds/Audio/impactGeneric_light_001.ogg',
        mp3: '/assets/sound/impact-sounds/Audio/impactGeneric_light_001.mp3',
    },
    kenneyImpactHold1: {
        ogg: '/assets/sound/impact-sounds/Audio/impactGeneric_light_003.ogg',
        mp3: '/assets/sound/impact-sounds/Audio/impactGeneric_light_003.mp3',
    },
    kenneyImpactGameOver0: {
        ogg: '/assets/sound/impact-sounds/Audio/impactPlate_heavy_001.ogg',
        mp3: '/assets/sound/impact-sounds/Audio/impactPlate_heavy_001.mp3',
    },
    kenneyImpactGameOver1: {
        ogg: '/assets/sound/impact-sounds/Audio/impactPlate_heavy_003.ogg',
        mp3: '/assets/sound/impact-sounds/Audio/impactPlate_heavy_003.mp3',
    },
};

export function preloadKenneyAssets(scene: Phaser.Scene): void {
    for (const [key, path] of Object.entries(KENNEY_UI_IMAGE_PATHS)) {
        scene.load.image(key, path);
    }

    for (const [key, paths] of Object.entries(KENNEY_IMPACT_SOUND_PATHS)) {
        scene.load.audio(key, [paths.ogg, paths.mp3]);
    }
}

export function playKenneyImpactSound(scene: Phaser.Scene, group: KenneyImpactGroup, volume: number = 0.45): void {
    const candidates = KENNEY_IMPACT_SOUND_KEYS[group];
    if (!candidates || candidates.length === 0) return;
    const nextKey = candidates[Math.floor(Math.random() * candidates.length)];
    if (!scene.cache.audio.exists(nextKey)) return;
    scene.sound.play(nextKey, { volume });
}

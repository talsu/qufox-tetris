import { CONST, getBlockSize } from "../const/const";
import { GAME_FONT_FAMILY } from "../ui/uiStyles";

const BLOCK_SIZE = getBlockSize();
const FIELD_WIDTH = CONST.PLAY_FIELD.COL_COUNT * BLOCK_SIZE;
const FIELD_HEIGHT = CONST.PLAY_FIELD.ROW_COUNT * BLOCK_SIZE;
const CENTER_X = FIELD_WIDTH / 2;
const BASE_Y = FIELD_HEIGHT * 0.38;

// Total popup visible duration, then float-up+fade lasts FADE_OUT_MS
const HOLD_MS = 1100;
const FADE_OUT_MS = 500;

type EffectTier = 0 | 1 | 2 | 3 | 4;

interface TierStyle {
    actionFontMultiplier: number;
    actionColor: string;
    glowColor: string;
    glowBlur: number;
    strokeColor: string;
    strokeThickness: number;
    scaleStart: number;
    shakeDuration: number;
    shakeIntensity: number;
    doParticles: boolean;
    doRainbow: boolean;
    particleCount: number;
    particleColor: number;
}

const TIER_STYLES: TierStyle[] = [
    // 0: nothing
    { actionFontMultiplier: 0, actionColor: '', glowColor: '', glowBlur: 0, strokeColor: '', strokeThickness: 0, scaleStart: 1, shakeDuration: 0, shakeIntensity: 0, doParticles: false, doRainbow: false, particleCount: 0, particleColor: 0 },
    // 1: Single / T-Spin Mini
    { actionFontMultiplier: 0.85, actionColor: '#cccccc', glowColor: '#888888', glowBlur: 0, strokeColor: '#000000', strokeThickness: 3, scaleStart: 1.15, shakeDuration: 0, shakeIntensity: 0, doParticles: false, doRainbow: false, particleCount: 0, particleColor: 0 },
    // 2: Double / Triple / T-Spin
    { actionFontMultiplier: 1.05, actionColor: '#ffee44', glowColor: '#ffcc00', glowBlur: 9, strokeColor: '#331100', strokeThickness: 4, scaleStart: 1.45, shakeDuration: 0, shakeIntensity: 0, doParticles: false, doRainbow: false, particleCount: 0, particleColor: 0 },
    // 3: Tetris / T-Spin Single
    { actionFontMultiplier: 1.3, actionColor: '#22eeff', glowColor: '#00aaff', glowBlur: 16, strokeColor: '#002244', strokeThickness: 5, scaleStart: 1.9, shakeDuration: 130, shakeIntensity: 0.005, doParticles: true, doRainbow: false, particleCount: 18, particleColor: 0x22eeff },
    // 4: Back to Back / T-Spin Double+ / T-Spin Triple
    { actionFontMultiplier: 1.55, actionColor: '#ff9900', glowColor: '#ffbb00', glowBlur: 24, strokeColor: '#330000', strokeThickness: 6, scaleStart: 2.3, shakeDuration: 230, shakeIntensity: 0.012, doParticles: true, doRainbow: true, particleCount: 35, particleColor: 0xff8800 },
];

function getEffectTier(actionName: string | null): EffectTier {
    if (!actionName) return 0;
    if (actionName.startsWith('Back to Back')) return 4;
    if (actionName.includes('T-Spin Double') || actionName.includes('T-Spin Triple')) return 4;
    if (actionName === 'Tetris' || actionName === 'T-Spin Single') return 3;
    if (actionName === 'Triple' || actionName.startsWith('T-Spin')) return 2;
    if (actionName === 'Double') return 2;
    return 1; // Single
}

function formatActionText(actionName: string): string {
    if (actionName.startsWith('Back to Back ')) {
        const rest = actionName.slice('Back to Back '.length).toUpperCase();
        return `B2B ${rest}`;
    }
    return actionName.toUpperCase();
}

function getComboStyle(combo: number): { color: string; glowBlur: number; fontSize: number } {
    const fontSize = Math.round(Math.min(1.05, 0.6 + combo * 0.05) * BLOCK_SIZE);
    if (combo >= 8) return { color: '#ff4422', glowBlur: 18, fontSize };
    if (combo >= 5) return { color: '#ff9900', glowBlur: 13, fontSize };
    if (combo >= 3) return { color: '#ffee00', glowBlur: 9, fontSize };
    return { color: '#00ffff', glowBlur: 5, fontSize };
}

/**
 * Renders flashy action/combo text at the center of the PlayField.
 * Effects scale with tier (action significance) and combo count.
 */
export class PlayFieldPopup {
    private scene: Phaser.Scene;
    /** Direct reference to the popupLayer container (inside PlayField). */
    private popupLayer: Phaser.GameObjects.Container;
    private activePopups: Phaser.GameObjects.Container[] = [];
    private rainbowTimers: Phaser.Time.TimerEvent[] = [];
    private popupEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

    constructor(scene: Phaser.Scene, popupLayer: Phaser.GameObjects.Container) {
        this.scene = scene;
        this.popupLayer = popupLayer;
    }

    show(actionName: string | null, combo: number) {
        if (!actionName && combo <= 0) return;

        const tier = getEffectTier(actionName);
        const style = TIER_STYLES[tier];

        const popupContainer = this.scene.add.container(CENTER_X, BASE_Y);
        this.popupLayer.add(popupContainer);
        this.activePopups.push(popupContainer);

        let yOffset = 0;

        if (actionName && tier > 0) {
            yOffset = this.addActionText(popupContainer, actionName, tier, style);
        }

        if (combo > 0) {
            this.addComboText(popupContainer, combo, yOffset);
        }

        this.animatePopup(popupContainer, style);

        if (style.shakeDuration > 0) {
            this.scene.cameras.main.shake(style.shakeDuration, style.shakeIntensity);
        }

        if (style.doParticles) {
            this.spawnParticles(style);
        }
    }

    private addActionText(
        popup: Phaser.GameObjects.Container,
        actionName: string,
        tier: EffectTier,
        style: TierStyle,
    ): number {
        const text = formatActionText(actionName);
        const fontSize = Math.round(style.actionFontMultiplier * BLOCK_SIZE);
        const wrapWidth = FIELD_WIDTH - 12;

        // Outer glow layer (tier 2+)
        if (tier >= 2) {
            const glow = this.scene.add.text(0, 0, text, {
                fontFamily: GAME_FONT_FAMILY,
                fontStyle: 'bold',
                fontSize: `${fontSize}px`,
                color: style.glowColor,
                align: 'center',
                wordWrap: { width: wrapWidth },
            });
            glow.setOrigin(0.5, 0.5);
            glow.setAlpha(0.35);
            glow.setShadow(0, 0, style.glowColor, style.glowBlur * 2.5, true, true);
            popup.add(glow);
        }

        // Main text
        const main = this.scene.add.text(0, 0, text, {
            fontFamily: GAME_FONT_FAMILY,
            fontStyle: 'bold',
            fontSize: `${fontSize}px`,
            color: style.actionColor,
            align: 'center',
            stroke: style.strokeColor || undefined,
            strokeThickness: style.strokeThickness,
            wordWrap: { width: wrapWidth },
        });
        main.setOrigin(0.5, 0.5);
        if (tier >= 2) {
            main.setShadow(0, 0, style.glowColor, style.glowBlur, true, true);
        }
        popup.add(main);

        if (style.doRainbow) {
            this.startRainbow(main);
        }

        // Return next yOffset (below the main text)
        return Math.round(main.height * 0.55 + fontSize * 0.1);
    }

    private addComboText(popup: Phaser.GameObjects.Container, combo: number, yOffset: number) {
        const { color, glowBlur, fontSize } = getComboStyle(combo);
        const label = `${combo} COMBO`;

        // Glow layer for combo ≥ 3
        if (combo >= 3) {
            const glow = this.scene.add.text(0, yOffset, label, {
                fontFamily: GAME_FONT_FAMILY,
                fontStyle: 'bold',
                fontSize: `${fontSize}px`,
                color,
                align: 'center',
            });
            glow.setOrigin(0.5, 0.5);
            glow.setAlpha(0.4);
            glow.setShadow(0, 0, color, glowBlur * 2, true, true);
            popup.add(glow);
        }

        const main = this.scene.add.text(0, yOffset, label, {
            fontFamily: GAME_FONT_FAMILY,
            fontStyle: 'bold',
            fontSize: `${fontSize}px`,
            color,
            align: 'center',
            stroke: '#000000',
            strokeThickness: 3,
        });
        main.setOrigin(0.5, 0.5);
        main.setShadow(0, 0, color, glowBlur, true, true);
        popup.add(main);
    }

    private animatePopup(popup: Phaser.GameObjects.Container, style: TierStyle) {
        popup.setScale(style.scaleStart);
        popup.setAlpha(0);

        // Pop in
        this.scene.tweens.add({
            targets: popup,
            scaleX: 1,
            scaleY: 1,
            alpha: 1,
            duration: 120,
            ease: 'Back.Out',
        });

        // Float up + fade out after hold period
        this.scene.time.delayedCall(HOLD_MS, () => {
            if (!popup.active) return;
            this.scene.tweens.add({
                targets: popup,
                y: popup.y - 48,
                alpha: 0,
                duration: FADE_OUT_MS,
                ease: 'Quad.In',
                onComplete: () => {
                    popup.destroy();
                    const idx = this.activePopups.indexOf(popup);
                    if (idx >= 0) this.activePopups.splice(idx, 1);
                },
            });
        });
    }

    private spawnParticles(style: TierStyle) {
        if (!this.scene.textures.exists('popupParticle')) {
            const g = this.scene.make.graphics({ x: 0, y: 0 });
            g.fillStyle(0xffffff);
            g.fillCircle(3, 3, 3);
            g.generateTexture('popupParticle', 6, 6);
            g.destroy();
        }

        if (!this.popupEmitter) {
            this.popupEmitter = this.scene.add.particles(CENTER_X, BASE_Y, 'popupParticle', {
                speed: { min: 60, max: 240 },
                angle: { min: 0, max: 360 },
                scale: { start: 1.8, end: 0 },
                lifespan: 750,
                gravityY: 160,
                tint: 0xffffff,
                quantity: 35,
                emitting: false,
            });
            this.popupLayer.add(this.popupEmitter);
        }

        const emitterApi = this.popupEmitter as unknown as {
            setSpeed?: (value: { min: number; max: number }) => void;
            setLifespan?: (value: number) => void;
            setQuantity?: (value: number) => void;
            setTint?: (value: number) => void;
        };
        emitterApi.setSpeed?.({ min: 60, max: style.particleCount > 20 ? 240 : 170 });
        emitterApi.setLifespan?.(style.particleCount > 20 ? 750 : 550);
        emitterApi.setQuantity?.(style.particleCount);
        emitterApi.setTint?.(style.particleColor);

        this.popupEmitter.explode(style.particleCount, CENTER_X, BASE_Y);
    }

    private startRainbow(text: Phaser.GameObjects.Text) {
        let phase = 0;
        const totalMs = HOLD_MS + FADE_OUT_MS;
        const timer = this.scene.time.addEvent({
            delay: 55,
            repeat: Math.ceil(totalMs / 55),
            callback: () => {
                phase += 0.18;
                const r = Math.floor(128 + 127 * Math.sin(phase));
                const g = Math.floor(128 + 127 * Math.sin(phase + 2.094));
                const b = Math.floor(128 + 127 * Math.sin(phase + 4.189));
                const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
                if (text.active) {
                    text.setColor(hex);
                    text.setShadow(0, 0, hex, 20, true, true);
                }
            },
        });
        this.rainbowTimers.push(timer);
        this.scene.time.delayedCall(totalMs + 100, () => {
            timer.destroy();
            const idx = this.rainbowTimers.indexOf(timer);
            if (idx >= 0) this.rainbowTimers.splice(idx, 1);
        });
    }

    destroy() {
        this.rainbowTimers.forEach(t => t.destroy());
        this.rainbowTimers = [];
        this.activePopups.forEach(p => { if (p.active) p.destroy(); });
        this.activePopups = [];
        if (this.popupEmitter && this.popupEmitter.active) {
            this.popupEmitter.destroy();
        }
        this.popupEmitter = null;
    }
}

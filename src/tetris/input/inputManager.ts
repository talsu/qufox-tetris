
import {CONST, InputState, getBlockSize} from "../const/const";

/**
 * Manages Keyboard and Touch input for the Tetris game.
 * Decouples input hardware events from game logic.
 */
export class InputManager {
    private scene: Phaser.Scene;
    private onInputCallback: (direction: string, state: InputState) => void;

    // Keys
    private keys: {
        LEFT: Phaser.Input.Keyboard.Key;
        RIGHT: Phaser.Input.Keyboard.Key;
        CTRL: Phaser.Input.Keyboard.Key;
        UP: Phaser.Input.Keyboard.Key;
        SPACE: Phaser.Input.Keyboard.Key;
        DOWN: Phaser.Input.Keyboard.Key;
        Z: Phaser.Input.Keyboard.Key;
        X: Phaser.Input.Keyboard.Key;
        C: Phaser.Input.Keyboard.Key;
        ESC: Phaser.Input.Keyboard.Key;
    };
    public escKey: Phaser.Input.Keyboard.Key; // Public for Menu toggling

    // DAS State
    private dasFlags: Record<string, number> = {};

    // Touch State
    private touchStartX: number = 0;
    private touchStartY: number = 0;
    private touchStartTime: number = 0;
    private lastPointerX: number = 0;
    private lastPointerY: number = 0;
    private isTap: boolean = false;

    // Flags
    public isEnabled: boolean = true;
    private BLOCK_SIZE: number;

    // Sensitivity
    private DRAG_THRESHOLD_SCALE = 2;

    constructor(scene: Phaser.Scene, onInputCallback: (direction: string, state: InputState) => void) {
        this.scene = scene;
        this.onInputCallback = onInputCallback;
        this.BLOCK_SIZE = getBlockSize();

        this.setupKeys();
        this.setupTouchControls();
    }

    private setupKeys() {
        this.keys = {
            LEFT: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
            RIGHT: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
            CTRL: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL),
            UP: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
            SPACE: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
            DOWN: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
            Z: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
            X: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X),
            C: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C),
            ESC: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
        };
        this.escKey = this.keys.ESC;
    }

    private setupTouchControls() {
        this.scene.input.addPointer(1);
        this.scene.game.canvas.style.touchAction = 'none';

        this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
            if (!this.isEnabled) return;
            if (currentlyOver && currentlyOver.length > 0) return;

            this.touchStartX = pointer.worldX;
            this.touchStartY = pointer.worldY;
            this.touchStartTime = pointer.time;
            this.lastPointerX = pointer.worldX;
            this.lastPointerY = pointer.worldY;
            this.isTap = true;
        });

        this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
             if (!this.isEnabled || !pointer.isDown) return;

             const dist = Phaser.Math.Distance.Between(this.touchStartX, this.touchStartY, pointer.worldX, pointer.worldY);
             if (dist > 10) {
                 this.isTap = false;
             }

             // Horizontal Move
             const deltaX = pointer.worldX - this.lastPointerX;
             if (Math.abs(deltaX) > (this.BLOCK_SIZE * this.DRAG_THRESHOLD_SCALE)) {
                 if (deltaX > 0) {
                     this.emitInput('right', InputState.PRESS);
                     this.scene.time.delayedCall(50, () => this.emitInput('right', InputState.RELEASE));
                 } else {
                     this.emitInput('left', InputState.PRESS);
                     this.scene.time.delayedCall(50, () => this.emitInput('left', InputState.RELEASE));
                 }
                 this.lastPointerX = pointer.worldX;
             }

             // Vertical Move (Soft Drop)
             const deltaY = pointer.worldY - this.lastPointerY;
             if (Math.abs(deltaY) > (this.BLOCK_SIZE * this.DRAG_THRESHOLD_SCALE) && !this.isTap) {
                if (deltaY > 0) {
                    this.emitInput('softDrop', InputState.PRESS);
                    this.scene.time.delayedCall(50, () => this.emitInput('softDrop', InputState.RELEASE)) ;
                }
                this.lastPointerY = pointer.worldY;
             }
        });

        this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            if (!this.isEnabled) return;

            const duration = pointer.time - this.touchStartTime;
            const deltaY = pointer.worldY - this.touchStartY;

            // Release Soft Drop
            this.emitInput('softDrop', InputState.RELEASE);

            if (this.isTap) {
                // Check Rotation
                // We use scene.scale.width to determine 'center' of screen relative to camera if needed,
                // but PlayScene uses logical GAME_WIDTH.
                // For now, we assume standard landscape center.
                // Ideally, we should pass the click region.
                // But let's assume worldX is correct.

                // TODO: Improve this hardcoded width check if possible.
                // Assuming logical width is consistent with PlayScene logic.
                const centerWidth = this.scene.cameras.main.width / 2; // approximate

                if (pointer.worldX < centerWidth) { // approximate center
                    this.emitInput('anticlockwise', InputState.PRESS);
                    this.scene.time.delayedCall(100, () => this.emitInput('anticlockwise', InputState.RELEASE));
                } else {
                    this.emitInput('clockwise', InputState.PRESS);
                    this.scene.time.delayedCall(100, () => this.emitInput('clockwise', InputState.RELEASE));
                }
            } else {
                // Check Hard Drop (Flick)
                if (duration < 300 && deltaY > 50) {
                    this.emitInput('hardDrop', InputState.PRESS);
                    this.scene.time.delayedCall(100, () => this.emitInput('hardDrop', InputState.RELEASE));
                }
            }
        });
    }

    private emitInput(direction: string, state: InputState) {
        if (this.onInputCallback) {
            this.onInputCallback(direction, state);
        }
    }

    /**
     * Should be called in Scene.update()
     */
    update(time: number, delta: number) {
        if (!this.isEnabled) return;

        this.chargeDAS("left", this.keys.LEFT.isDown, delta);
        this.chargeDAS("right", this.keys.RIGHT.isDown, delta);
        // SoftDrop has specific delays in original code: autoDropDelay / 20.
        // We might need to parameterize this or use defaults.
        // Using standard DAS constants for now unless specified.
        this.chargeDAS("softDrop", this.keys.DOWN.isDown, delta, CONST.PLAY_FIELD.DAS_MS, CONST.PLAY_FIELD.AR_MS);
        this.chargeDAS("hardDrop", this.keys.SPACE.isDown, delta);
        this.chargeDAS("anticlockwise", this.keys.Z.isDown || this.keys.CTRL.isDown, delta);
        this.chargeDAS("clockwise", this.keys.X.isDown || this.keys.UP.isDown, delta);
        this.chargeDAS("hold", this.keys.C.isDown, delta);
    }

    /*
        https://tetris.wiki/DAS
    */
    private chargeDAS(input: string, isPressed: boolean, time: number, init?: number, repeat?: number) {
        if (!this.dasFlags[input]) this.dasFlags[input] = 0;
        const oldValue = this.dasFlags[input];

        if (isPressed) this.dasFlags[input] += time;
        else this.dasFlags[input] = 0;

        const newValue = this.dasFlags[input];

        if (oldValue == 0 && newValue) this.emitInput(input, InputState.PRESS);
        if (oldValue && newValue == 0) this.emitInput(input, InputState.RELEASE);

        if (newValue == 0) return;

        const initDelay = init || CONST.PLAY_FIELD.DAS_MS;
        const repeatDelay = repeat || CONST.PLAY_FIELD.AR_MS;

        let rOld = Math.floor((oldValue - initDelay) / repeatDelay);
        let rNew = Math.floor((newValue - initDelay) / repeatDelay);

        if (rNew >= 0 && rOld < rNew) {
            if (rOld < 0) rOld = -1;
            for (let i = 0; i < (rNew - rOld); ++i) {
                this.emitInput(input, InputState.HOLD);
            }
        }
    }

    // Custom DAS for Soft Drop requires dynamic delays based on PlayField speed.
    // For now we expose a method to set specific DAS params if needed, or just update the update call in PlayScene to pass them.
    // Actually, let's allow passing custom delays in update() or a separate setter.
    public updateCustom(time: number, delta: number, softDropInit: number, softDropRepeat: number) {
        if (!this.isEnabled) return;

        this.chargeDAS("left", this.keys.LEFT.isDown, delta);
        this.chargeDAS("right", this.keys.RIGHT.isDown, delta);
        this.chargeDAS("softDrop", this.keys.DOWN.isDown, delta, softDropInit, softDropRepeat);
        this.chargeDAS("hardDrop", this.keys.SPACE.isDown, delta);
        this.chargeDAS("anticlockwise", this.keys.Z.isDown || this.keys.CTRL.isDown, delta);
        this.chargeDAS("clockwise", this.keys.X.isDown || this.keys.UP.isDown, delta);
        this.chargeDAS("hold", this.keys.C.isDown, delta);
    }

    public setDragThresholdScale(scale: number) {
        this.DRAG_THRESHOLD_SCALE = scale;
    }
}

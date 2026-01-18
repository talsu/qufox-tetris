
import { CONST } from "../const/const";


export interface MenuCallbacks {
    onResume: () => void;
    onExit: () => void;
    onRestart: () => void;
    onToggleBackground: (btn: HTMLElement) => void;
}

/**
 * Manages the in-game Pause Menu and Game Over Screen using Phaser DOM.
 */
export class InGameMenu {
    private scene: Phaser.Scene;
    private callbacks: MenuCallbacks;

    private menuDOM: Phaser.GameObjects.DOMElement;

    public isMenuOpen: boolean = false;
    public isGameEnded: boolean = false;

    constructor(scene: Phaser.Scene, width: number, height: number, callbacks: MenuCallbacks) {
        this.scene = scene;
        this.callbacks = callbacks;
    }

    public togglePauseMenu() {
        if (this.isGameEnded) return;

        this.isMenuOpen = !this.isMenuOpen;

        if (this.isMenuOpen) {
            this.showPauseMenu();
        } else {
            this.hideMenu();
        }
    }

    private showPauseMenu() {
        this.hideMenu(); // Clear existing

        const html = `
        <div class="overlay-container">
            <div class="menu-panel">
                <div class="menu-title">PAUSED</div>
                <button class="puyo-btn" id="resumeBtn">RESUME</button>
                <button class="puyo-btn" id="bgBtn">Background: ON</button>
                <button class="puyo-btn red" id="exitBtn">EXIT GAME</button>
            </div>
        </div>
        `;

        this.menuDOM = this.scene.add.dom(0, 0).createFromHTML(html);
        this.menuDOM.setOrigin(0);
        this.menuDOM.setScrollFactor(0);
        this.menuDOM.setPerspective(800);

        const resumeBtn = this.menuDOM.getChildByID('resumeBtn') as HTMLElement;
        const bgBtn = this.menuDOM.getChildByID('bgBtn') as HTMLElement;
        const exitBtn = this.menuDOM.getChildByID('exitBtn') as HTMLElement;

        if (resumeBtn) resumeBtn.onclick = () => this.callbacks.onResume();
        if (bgBtn) bgBtn.onclick = () => this.callbacks.onToggleBackground(bgBtn);
        if (exitBtn) exitBtn.onclick = () => this.callbacks.onExit();
    }

    public showEndGame(mainText: string, color: string, score?: number) {
        this.isGameEnded = true;
        this.isMenuOpen = true; // Block game input
        this.hideMenu();

        const html = `
        <div class="overlay-container">
            <div class="menu-panel">
                <div class="menu-title" style="-webkit-text-stroke-color: ${color}">${mainText}</div>
                ${score !== undefined ? `<div class="menu-score">SCORE: ${score}</div>` : ''}
                <button class="puyo-btn green" id="restartBtn">RESTART</button>
                <button class="puyo-btn red" id="exitBtn">EXIT</button>
            </div>
        </div>
        `;

        this.menuDOM = this.scene.add.dom(0, 0).createFromHTML(html);
        this.menuDOM.setOrigin(0);
        this.menuDOM.setScrollFactor(0);

        const restartBtn = this.menuDOM.getChildByID('restartBtn') as HTMLElement;
        const exitBtn = this.menuDOM.getChildByID('exitBtn') as HTMLElement;

        if (restartBtn) restartBtn.onclick = () => this.callbacks.onRestart();
        if (exitBtn) exitBtn.onclick = () => this.callbacks.onExit();
    }

    public hideMenu() {
        if (this.menuDOM) {
            this.menuDOM.destroy();
            this.menuDOM = null;
        }
    }

    public onKey(event: 'up' | 'down' | 'enter') {
        // Delegated to KeyboardNav via update(), but PlayScene calls this manually?
        // If PlayScene manual calls are present, we should divert them or use KeyboardNav directly.
        // Actually, PlayScene calls `onKey`. We can check if we want to manually drive KeyboardNav or let it run via update loop.
        // Since PlayScene has specific input separation, let's just map these calls to KeyboardNav if we want.
        // BUT KeyboardNav uses cursors internally. 
        // If `PlayScene` is blocking updates when paused, we might need to manually call update on KeyboardNav.

        // Actually, PlayScene:338 checks `if (this.inGameMenu.isMenuOpen ...)` and calls `this.inGameMenu.onKey(...)`.
        // So we can use that to drive the nav manually if we want to avoid double input handling.

        // Let's rely on KeyboardNav's internal input handling, BUT we need to make sure we don't double trigger if PlayScene is also listening.
        // PlayScene code: `if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) { this.inGameMenu.onKey('up'); }`

        // We should just expose an update method or map the specific actions.
        // Since KeyboardNav uses its own cursors, it might conflict if we don't disable one.
        // A cleaner way for this refactor:
        // Use the existing `onKey` to drive `keyboardNav.move()`.
    }

    // We'll effectively ignore onKey and let KeyboardNav class handle it via its own update method which we call from PlayScene.
    // Or, we modify KeyboardNav to allow manual triggers.
    // Let's modify PlayScene to call `update()` on InGameMenu instead of `onKey`.
    public update() {
        // Handled by window event listener
    }

    public destroy() {
        this.hideMenu();
    }
}

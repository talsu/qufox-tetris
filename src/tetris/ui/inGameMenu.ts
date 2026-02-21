export interface MenuCallbacks {
    onResume: () => void;
    onExit: () => void;
    onRestart: () => void;
    onToggleBackground: (btn: HTMLElement) => void;
}

/**
 * Manages the in-game Pause Menu and Game Over Screen as DOM overlays.
 *
 * Uses direct DOM manipulation (outside Phaser's scene graph) because these
 * overlays need to sit on top of the entire canvas regardless of camera zoom.
 */
export class InGameMenu {
    private scene: Phaser.Scene;
    private callbacks: MenuCallbacks;
    private menuContainer: HTMLElement | null = null;

    public isMenuOpen: boolean = false;
    public isGameEnded: boolean = false;

    constructor(scene: Phaser.Scene, callbacks: MenuCallbacks) {
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
        this.hideMenu();

        const html = `
            <div class="menu-panel">
                <div class="menu-title">PAUSED</div>
                <button class="puyo-btn" id="resumeBtn">RESUME</button>
                <button class="puyo-btn" id="bgBtn">Background: ON</button>
                <button class="puyo-btn red" id="exitBtn">EXIT GAME</button>
            </div>
        `;

        this.createMenuOverlay(html);

        const resumeBtn = document.getElementById('resumeBtn');
        const bgBtn = document.getElementById('bgBtn');
        const exitBtn = document.getElementById('exitBtn');

        if (resumeBtn) resumeBtn.onclick = () => this.callbacks.onResume();
        if (bgBtn) bgBtn.onclick = () => this.callbacks.onToggleBackground(bgBtn);
        if (exitBtn) exitBtn.onclick = () => this.callbacks.onExit();
    }

    public showEndGame(mainText: string, color: string, score?: number) {
        this.isGameEnded = true;
        this.isMenuOpen = true;
        this.hideMenu();

        const html = `
            <div class="menu-panel">
                <div class="menu-title" style="-webkit-text-stroke-color: ${color}">${mainText}</div>
                ${score !== undefined ? `<div class="menu-score">SCORE: ${score}</div>` : ''}
                <button class="puyo-btn green" id="restartBtn">RESTART</button>
                <button class="puyo-btn red" id="exitBtn">EXIT</button>
            </div>
        `;

        this.createMenuOverlay(html);

        const restartBtn = document.getElementById('restartBtn');
        const exitBtn = document.getElementById('exitBtn');

        if (restartBtn) restartBtn.onclick = () => this.callbacks.onRestart();
        if (exitBtn) exitBtn.onclick = () => this.callbacks.onExit();
    }

    private createMenuOverlay(innerHtml: string) {
        this.menuContainer = document.createElement('div');
        this.menuContainer.className = 'overlay-container';
        this.menuContainer.innerHTML = innerHtml;
        document.body.appendChild(this.menuContainer);
    }

    public hideMenu() {
        if (this.menuContainer) {
            if (this.menuContainer.parentNode) {
                this.menuContainer.parentNode.removeChild(this.menuContainer);
            }
            this.menuContainer = null;
        }
    }

    public resetState(): void {
        this.hideMenu();
        this.isMenuOpen = false;
        this.isGameEnded = false;
    }

    public destroy() {
        this.hideMenu();
    }
}


import {CONST} from "../const/const";

export interface MenuCallbacks {
    onResume: () => void;
    onExit: () => void;
    onRestart: () => void;
    onToggleBackground: (btn: Phaser.GameObjects.Text) => void;
}

/**
 * Manages the in-game Pause Menu and Game Over Screen.
 */
export class InGameMenu {
    private scene: Phaser.Scene;
    private width: number;
    private height: number;
    private callbacks: MenuCallbacks;

    private menuContainer: Phaser.GameObjects.Container;
    private endGameContainer: Phaser.GameObjects.Container;

    private menuButtons: Phaser.GameObjects.Text[] = [];
    private endGameButtons: Phaser.GameObjects.Text[] = [];

    private selectedMenuIndex: number = 0;
    private selectedEndGameIndex: number = 0;

    public isMenuOpen: boolean = false;
    public isGameEnded: boolean = false;

    constructor(scene: Phaser.Scene, width: number, height: number, callbacks: MenuCallbacks) {
        this.scene = scene;
        this.width = width;
        this.height = height;
        this.callbacks = callbacks;

        this.createPauseMenu();
        // End Game menu is created on demand or pre-created hidden.
        // Let's pre-create the container structure but populate on show to set score.
        this.endGameContainer = this.scene.add.container(0, 0);
        this.endGameContainer.setDepth(2000);
        this.endGameContainer.setVisible(false);
    }

    private createPauseMenu() {
        this.menuContainer = this.scene.add.container(0, 0);
        this.menuContainer.setVisible(false);
        this.menuContainer.setDepth(1000);

        const centerX = this.width / 2;
        const centerY = this.height / 2;

        // Dimmed background
        const dim = this.scene.add.rectangle(centerX, centerY, this.width, this.height, 0x000000, 0.7);
        dim.setInteractive(); // Block clicks below

        // Menu Box
        const menuBg = this.scene.add.rectangle(centerX, centerY, 500, 450, 0x333333).setStrokeStyle(4, 0xffffff);

        // Title
        const title = this.scene.add.text(centerX, centerY - 150, "PAUSED", { fontSize: '64px', color: '#fff' }).setOrigin(0.5);

        // Settings: Background Toggle
        const bgBtn = this.scene.add.text(centerX, centerY - 50, "Background: ON", { fontSize: '40px', color: '#fff' }).setOrigin(0.5).setInteractive();
        bgBtn.on('pointerdown', () => {
            this.callbacks.onToggleBackground(bgBtn);
        });
        bgBtn.on('pointerover', () => { this.selectedMenuIndex = 0; this.updateMenuAppearance(); });

        // Exit Button
        const exitBtn = this.scene.add.text(centerX, centerY + 50, "EXIT GAME", { fontSize: '40px', color: '#f00' }).setOrigin(0.5).setInteractive();
        exitBtn.on('pointerdown', () => {
            this.callbacks.onExit();
        });
        exitBtn.on('pointerover', () => { this.selectedMenuIndex = 1; this.updateMenuAppearance(); });

        // Resume Button
        const resumeBtn = this.scene.add.text(centerX, centerY + 150, "RESUME", { fontSize: '40px', color: '#fff' }).setOrigin(0.5).setInteractive();
        resumeBtn.on('pointerdown', () => {
            this.callbacks.onResume();
        });
        resumeBtn.on('pointerover', () => { this.selectedMenuIndex = 2; this.updateMenuAppearance(); });

        this.menuContainer.add([dim, menuBg, title, bgBtn, exitBtn, resumeBtn]);

        this.menuButtons = [bgBtn, exitBtn, resumeBtn];
        this.updateMenuAppearance();
    }

    public togglePauseMenu() {
        this.isMenuOpen = !this.isMenuOpen;
        this.menuContainer.setVisible(this.isMenuOpen);

        if (this.isMenuOpen) {
            this.selectedMenuIndex = 0;
            this.updateMenuAppearance();
        }
    }

    private updateMenuAppearance() {
        this.menuButtons.forEach((btn, index) => {
            if (index === this.selectedMenuIndex) {
                btn.setStyle({ backgroundColor: '#555' });
            } else {
                btn.setStyle({ backgroundColor: 'transparent' });
            }
        });
    }

    public showEndGame(mainText: string, color: string, score?: number) {
        this.isGameEnded = true;
        this.endGameContainer.setVisible(true);
        this.endGameContainer.removeAll(true); // Clear previous

        const centerX = this.width / 2;
        const centerY = this.height / 2;

        // Dimmed background
        const dim = this.scene.add.rectangle(centerX, centerY, this.width, this.height, 0x000000, 0.7);
        dim.setInteractive();

        // Panel
        const panel = this.scene.add.rectangle(centerX, centerY, 600, 500, 0x333333).setStrokeStyle(4, 0xffffff);

        // Main Text
        const titleText = this.scene.add.text(centerX, centerY - 150, mainText, {
            fontSize: '64px',
            color: color,
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Score
        let scoreTextObj;
        if (score !== undefined) {
            scoreTextObj = this.scene.add.text(centerX, centerY - 50, `SCORE: ${score}`, {
                fontSize: '48px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4
            }).setOrigin(0.5);
        }

        // Restart Button
        const restartBtn = this.scene.add.text(centerX, centerY + 50, "RESTART", { fontSize: '36px', color: '#fff' }).setOrigin(0.5).setInteractive();
        restartBtn.on('pointerdown', () => {
             this.callbacks.onRestart();
        });
        restartBtn.on('pointerover', () => {
            this.selectedEndGameIndex = 0;
            this.updateEndGameAppearance();
        });

        // Exit Button
        const exitBtn = this.scene.add.text(centerX, centerY + 130, "EXIT", { fontSize: '36px', color: '#fff' }).setOrigin(0.5).setInteractive();
        exitBtn.on('pointerdown', () => {
            this.callbacks.onExit();
        });
        exitBtn.on('pointerover', () => {
            this.selectedEndGameIndex = 1;
            this.updateEndGameAppearance();
        });

        const elements = [dim, panel, titleText, restartBtn, exitBtn];
        if (scoreTextObj) elements.push(scoreTextObj);

        this.endGameContainer.add(elements);

        this.endGameButtons = [restartBtn, exitBtn];
        this.selectedEndGameIndex = 0;
        this.updateEndGameAppearance();
    }

    private updateEndGameAppearance() {
        this.endGameButtons.forEach((btn, index) => {
            if (index === this.selectedEndGameIndex) {
                btn.setStyle({ color: '#ff0' });
            } else {
                btn.setStyle({ color: '#fff' });
            }
        });
    }

    // Keyboard Navigation Helpers
    public onKey(event: 'up' | 'down' | 'enter') {
        if (this.isMenuOpen) {
            if (event === 'up') this.changeMenuSelection(-1);
            if (event === 'down') this.changeMenuSelection(1);
            if (event === 'enter') this.triggerMenuSelection();
        } else if (this.isGameEnded) {
            if (event === 'up') this.changeEndGameSelection(-1);
            if (event === 'down') this.changeEndGameSelection(1);
            if (event === 'enter') this.triggerEndGameSelection();
        }
    }

    private changeMenuSelection(change: number) {
        let newIndex = this.selectedMenuIndex + change;
        if (newIndex < 0) newIndex = this.menuButtons.length - 1;
        if (newIndex >= this.menuButtons.length) newIndex = 0;
        this.selectedMenuIndex = newIndex;
        this.updateMenuAppearance();
    }

    private triggerMenuSelection() {
        if (this.menuButtons.length > 0) {
             const btn = this.menuButtons[this.selectedMenuIndex];
             btn.emit('pointerdown');
        }
    }

    private changeEndGameSelection(change: number) {
        let newIndex = this.selectedEndGameIndex + change;
        if (newIndex < 0) newIndex = this.endGameButtons.length - 1;
        if (newIndex >= this.endGameButtons.length) newIndex = 0;
        this.selectedEndGameIndex = newIndex;
        this.updateEndGameAppearance();
    }

    private triggerEndGameSelection() {
        if (this.endGameButtons.length > 0) {
            const btn = this.endGameButtons[this.selectedEndGameIndex];
            btn.emit('pointerdown');
        }
    }
}

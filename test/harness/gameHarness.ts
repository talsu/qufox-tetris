import { test as base, expect, Page, Locator } from '@playwright/test';

/**
 * GameHarness provides utilities for interacting with the Qufox Tetris game.
 * All game UI is rendered on Phaser Canvas, so interactions use canvas coordinates.
 *
 * Menu layout (3 buttons, top to bottom):
 *   - Single Player (y ≈ 42% of canvas height)
 *   - 1 : 1        (y ≈ 52% of canvas height)
 *   - Battle Royale (y ≈ 62% of canvas height)
 */
export class GameHarness {
    private canvas: Locator;

    constructor(public page: Page) {
        this.canvas = page.locator('#game canvas').first();
    }

    // --- MenuScene ---

    async gotoMenu() {
        await this.page.goto('/');
        await expect(this.canvas).toBeVisible({ timeout: 15000 });
        await this.page.waitForTimeout(2000);
    }

    async clickSinglePlayer() {
        await this.clickMenuButton(0.42);
    }

    async clickMultiPlayer() {
        await this.clickMenuButton(0.52);
    }

    async clickBattleRoyale() {
        await this.clickMenuButton(0.62);
    }

    private async clickMenuButton(heightRatio: number) {
        const box = await this.canvas.boundingBox();
        if (!box) throw new Error('Canvas not found');
        await this.page.mouse.click(box.x + box.width / 2, box.y + box.height * heightRatio);
    }

    // --- LobbyScene ---

    async waitForLobby() {
        await expect(this.canvas).toBeVisible();
    }

    // --- PlayScene ---

    async waitForGameCanvas() {
        await expect(this.canvas).toBeVisible();
    }

    async pressEscape() {
        await this.page.keyboard.press('Escape');
    }

    // --- Keyboard Controls ---

    async moveLeft() {
        await this.page.keyboard.press('ArrowLeft');
    }

    async moveRight() {
        await this.page.keyboard.press('ArrowRight');
    }

    async softDrop() {
        await this.page.keyboard.press('ArrowDown');
    }

    async hardDrop() {
        await this.page.keyboard.press(' ');
    }

    async rotateCW() {
        await this.page.keyboard.press('ArrowUp');
    }

    async rotateCCW() {
        await this.page.keyboard.press('z');
    }

    async holdPiece() {
        await this.page.keyboard.press('c');
    }

    async pause() {
        await this.page.keyboard.press('Escape');
    }

    // --- Visual checks ---

    async screenshot(name: string) {
        await this.page.screenshot({
            path: `test-results/screenshots/${name}.png`,
            fullPage: false,
        });
    }

    async getCanvasSize() {
        const box = await this.canvas.boundingBox();
        return box;
    }

    async waitForGameOver() {
        await this.page.waitForTimeout(5000);
        // Game over shows a pause-like menu; check canvas is still visible
        await expect(this.canvas).toBeVisible();
    }
}

// Extend Playwright test with gameHarness fixture
export const test = base.extend<{ game: GameHarness }>({
    game: async ({ page }, use) => {
        const harness = new GameHarness(page);
        await use(harness);
    },
});

export { expect } from '@playwright/test';

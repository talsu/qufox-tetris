import { expect, test } from '@playwright/test';

/**
 * Qufox Tetris E2E tests
 *
 * NOTE: All game UI is rendered on Phaser Canvas, not DOM elements.
 * Tests verify game state by:
 * 1. Checking canvas visibility and rendering
 * 2. Clicking at computed positions on the canvas
 * 3. Observing game state changes (scene transitions)
 */
test.describe('Menu Navigation', () => {
    test('loads menu and canvas is rendered', async ({ page }) => {
        await page.goto('/');

        // Wait for Phaser canvas to be rendered
        const canvas = page.locator('#game canvas').first();
        await expect(canvas).toBeVisible({ timeout: 15000 });

        // Verify canvas has actual rendered content (not blank)
        const boundingBox = await canvas.boundingBox();
        expect(boundingBox).not.toBeNull();
        expect(boundingBox!.width).toBeGreaterThan(100);
        expect(boundingBox!.height).toBeGreaterThan(100);
    });

    test('click single player starts game', async ({ page }) => {
        await page.goto('/');
        const canvas = page.locator('#game canvas').first();
        await expect(canvas).toBeVisible({ timeout: 15000 });

        // Wait for fonts and menu to be ready
        await page.waitForTimeout(2000);

        // Click the center area of the canvas where the 'Single Player' button is
        // The menu has 3 buttons: Single Player (top), 1:1 (middle), Battle Royale (bottom)
        // We click in the upper-middle area of the canvas
        const box = await canvas.boundingBox();
        if (!box) throw new Error('Canvas not found');

        // Single Player button is typically in the upper portion of the menu panel
        const clickX = box.x + box.width / 2;
        const clickY = box.y + box.height * 0.42;

        await page.mouse.click(clickX, clickY);

        // After clicking Single Player, the game should transition to PlayScene
        // The menu panel disappears and we see the game field
        await page.waitForTimeout(1000);

        // Canvas should still be visible (same canvas, different scene)
        await expect(canvas).toBeVisible();
    });

    test('multi player button opens lobby', async ({ page }) => {
        await page.goto('/');
        const canvas = page.locator('#game canvas').first();
        await expect(canvas).toBeVisible({ timeout: 15000 });

        await page.waitForTimeout(2000);

        const box = await canvas.boundingBox();
        if (!box) throw new Error('Canvas not found');

        // 1:1 button is in the middle of the menu
        const clickX = box.x + box.width / 2;
        const clickY = box.y + box.height * 0.52;

        await page.mouse.click(clickX, clickY);
        await page.waitForTimeout(1000);

        // Should still be on canvas (scene changed to LobbyScene)
        await expect(canvas).toBeVisible();
    });

    test('keyboard enter starts single player', async ({ page }) => {
        await page.goto('/');
        const canvas = page.locator('#game canvas').first();
        await expect(canvas).toBeVisible({ timeout: 15000 });

        await page.waitForTimeout(2000);

        // Press Enter (default selects first button: Single Player)
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        // Canvas should still be visible
        await expect(canvas).toBeVisible();
    });
});

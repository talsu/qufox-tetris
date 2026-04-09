import { expect, type Page, test } from '@playwright/test';

test.describe('Single Player Game Flow', () => {
    async function startSinglePlayer(page: Page) {
        await page.goto('/');
        const canvas = page.locator('#game canvas').first();
        await expect(canvas).toBeVisible({ timeout: 15000 });

        // Wait for menu to be ready
        await page.waitForTimeout(2000);

        // Click Single Player button
        const box = await canvas.boundingBox();
        if (!box) throw new Error('Canvas not found');
        await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.42);

        // Wait for game scene to initialize
        await page.waitForTimeout(1500);
        await expect(canvas).toBeVisible();
    }

    test('start game and interact with controls', async ({ page }) => {
        await startSinglePlayer(page);

        // Send keyboard inputs to move the tetromino
        for (let i = 0; i < 5; i++) {
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowRight');
        }
        await page.keyboard.press('ArrowUp'); // Rotate
        await page.keyboard.press(' '); // Hard drop

        // Game should still be running
        const canvas = page.locator('#game canvas').first();
        await expect(canvas).toBeVisible();
    });

    test('pause and resume game', async ({ page }) => {
        await startSinglePlayer(page);

        // Press Escape to pause
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);

        // Press Escape again to resume
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);

        // Game should still be running
        const canvas = page.locator('#game canvas').first();
        await expect(canvas).toBeVisible();
    });

    test('game canvas is responsive', async ({ page }) => {
        await startSinglePlayer(page);

        const canvas = page.locator('#game canvas').first();
        const box = await canvas.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.width).toBeGreaterThan(0);
        expect(box!.height).toBeGreaterThan(0);
    });
});

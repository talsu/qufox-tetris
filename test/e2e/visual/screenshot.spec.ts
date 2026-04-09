import { expect, test } from '@playwright/test';

// Visual regression uses platform-specific snapshots (font rendering, etc.).
// These are useful for local manual checks but should not block CI on Linux.
test.describe('Visual Regression', () => {
    test.skip(!!process.env.CI, 'Visual snapshots are macOS-specific');

    test('menu screenshot', async ({ page }) => {
        await page.goto('/');
        const canvas = page.locator('#game canvas').first();
        await expect(canvas).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(2000);
        await expect(canvas).toHaveScreenshot('menu-canvas.png', {
            maxDiffPixelRatio: 0.05,
        });
    });

    test('single player game screenshot', async ({ page }) => {
        await page.goto('/');
        const canvas = page.locator('#game canvas').first();
        await expect(canvas).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(2000);

        // Click Single Player
        const box = await canvas.boundingBox();
        if (!box) throw new Error('Canvas not found');
        await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.42);
        await page.waitForTimeout(1500);

        await expect(canvas).toHaveScreenshot('game-canvas.png', {
            maxDiffPixelRatio: 0.05, // Allow 5% diff due to animation
        });
    });
});

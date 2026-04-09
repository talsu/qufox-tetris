import { test, expect } from '@playwright/test';

test.describe('Performance Metrics', () => {
    test('page loads within threshold', async ({ page }) => {
        const startTime = Date.now();
        await page.goto('/');
        await expect(page.locator('#game canvas').first()).toBeVisible({ timeout: 15000 });
        const loadTime = Date.now() - startTime;

        // Menu should load within 5 seconds (Phaser init + font loading)
        expect(loadTime).toBeLessThan(5000);
    });

    test('single player starts within threshold', async ({ page }) => {
        await page.goto('/');
        const canvas = page.locator('#game canvas').first();
        await expect(canvas).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(2000);

        const startTime = Date.now();
        const box = await canvas.boundingBox();
        if (!box) throw new Error('Canvas not found');
        await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.42);
        await expect(canvas).toBeVisible();
        const startGameTime = Date.now() - startTime;

        // Scene transition should be instant
        expect(startGameTime).toBeLessThan(2000);
    });

    test('canvas maintains reasonable size', async ({ page }) => {
        await page.goto('/');
        const canvas = page.locator('#game canvas').first();
        await expect(canvas).toBeVisible({ timeout: 15000 });

        const box = await canvas.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.width).toBeGreaterThan(400);
        expect(box!.height).toBeGreaterThan(300);
    });
});

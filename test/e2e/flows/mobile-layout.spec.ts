import { expect, test } from '@playwright/test';

test.describe('Mobile Layout', () => {
    test.use({
        viewport: { width: 375, height: 812 }, // iPhone X
    });

    test('mobile portrait layout loads', async ({ page }) => {
        await page.goto('/');
        const canvas = page.locator('#game canvas').first();
        await expect(canvas).toBeVisible({ timeout: 15000 });

        const box = await canvas.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.width).toBeGreaterThan(0);
        expect(box!.height).toBeGreaterThan(0);
    });

    test('mobile landscape layout loads', async ({ page }) => {
        await page.setViewportSize({ width: 812, height: 375 });
        await page.goto('/');
        const canvas = page.locator('#game canvas').first();
        await expect(canvas).toBeVisible({ timeout: 15000 });

        const box = await canvas.boundingBox();
        expect(box).not.toBeNull();
    });
});

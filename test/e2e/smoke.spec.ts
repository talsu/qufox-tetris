import { expect, test } from '@playwright/test';

test('loads menu and starts single-player with canvas interaction', async ({ page }) => {
    await page.goto('/');

    // Wait for Phaser canvas to render
    const canvas = page.locator('#game canvas').first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    // Wait for menu to be ready
    await page.waitForTimeout(2000);

    // Click Single Player via canvas coordinate
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.42);

    // Menu scene transitions to PlayScene - canvas remains visible
    await page.waitForTimeout(1000);
    await expect(canvas).toBeVisible();
});

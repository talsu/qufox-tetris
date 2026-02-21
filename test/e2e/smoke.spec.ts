import { expect, test } from '@playwright/test';

test('loads menu and starts single-player with keyboard', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('.menu-container')).toBeVisible();
    await expect(page.locator('#singleBtn')).toBeVisible();
    await expect(page.locator('#game canvas').first()).toBeVisible();

    await page.locator('#singleBtn').focus();
    await page.keyboard.press('Enter');

    await expect(page.locator('.menu-container')).toHaveCount(0);
    await expect(page.locator('#game canvas').first()).toBeVisible();
});

import { expect, test } from '@playwright/test';

test.describe('Network Resilience', () => {
    test('game loads when server is unreachable', async ({ page }) => {
        // Block all requests to game server (socket.io)
        await page.route('**/socket.io/**', (route) => route.abort('failed'));

        await page.goto('/');
        // Menu should still load (it's client-side Phaser game)
        const canvas = page.locator('#game canvas').first();
        await expect(canvas).toBeVisible({ timeout: 15000 });
    });

    test('page handles slow network', async ({ page }) => {
        // Throttle network
        await page.route('**/*', async (route) => {
            await new Promise((r) => setTimeout(r, 500)); // 500ms delay
            await route.continue();
        });

        await page.goto('/');
        const canvas = page.locator('#game canvas').first();
        await expect(canvas).toBeVisible({ timeout: 20000 });
    });
});

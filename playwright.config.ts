import { defineConfig, devices } from '@playwright/test';

const E2E_PORT = 9090;

export default defineConfig({
    testDir: './test',
    testMatch: /e2e\/.*\.spec\.ts$|performance\/.*\.spec\.ts$/,
    fullyParallel: true,
    timeout: 60000,
    expect: {
        timeout: 10000,
    },
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
        baseURL: `http://127.0.0.1:${E2E_PORT}`,
        trace: 'on-first-retry',
    },
    webServer: {
        command: `npx webpack serve --mode development --no-open --host 127.0.0.1 --port ${E2E_PORT}`,
        url: `http://127.0.0.1:${E2E_PORT}`,
        reuseExistingServer: false,
        stdout: 'pipe',
        stderr: 'pipe',
        timeout: 120000,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});

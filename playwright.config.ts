import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './test/e2e',
    fullyParallel: true,
    timeout: 30000,
    expect: {
        timeout: 5000,
    },
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
        baseURL: 'http://127.0.0.1:8080',
        trace: 'on-first-retry',
    },
    webServer: {
        command: 'npm run dev -- --no-open --host 127.0.0.1 --port 8080',
        url: 'http://127.0.0.1:8080',
        reuseExistingServer: !process.env.CI,
        stdout: 'ignore',
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

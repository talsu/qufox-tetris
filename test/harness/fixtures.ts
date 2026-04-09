import { test as base } from '@playwright/test';
import { GameHarness } from '../harness/gameHarness';
import { SocketHarness } from '../harness/socketHarness';

type Fixtures = {
    game: GameHarness;
    socket: SocketHarness;
};

export const test = base.extend<Fixtures>({
    game: async ({ page }, use) => {
        const harness = new GameHarness(page);
        await use(harness);
    },

    socket: async ({}, use) => {
        const harness = new SocketHarness();
        await use(harness);
        await harness.disconnect();
    },
});

export { expect } from '@playwright/test';

import {
    createBotController,
    extractBotLevel,
    nextBotInputs,
} from '../../../server/botController';

describe('server bot controller', () => {
    test('extractBotLevel parses and clamps payload values', () => {
        expect(extractBotLevel({ botLevel: 30 })).toBe(30);
        expect(extractBotLevel({ bot: '77' })).toBe(77);
        expect(extractBotLevel({ botLevel: 300 })).toBe(100);
        expect(extractBotLevel({ bot: -3 })).toBe(0);
        expect(extractBotLevel({})).toBe(0);
    });

    test('nextBotInputs creates a playable plan and emits inputs', () => {
        const controller = createBotController(100);
        expect(controller).not.toBeNull();
        if (!controller) return;

        const sync = {
            boardCore: '0'.repeat(200),
            active: {
                type: 'T',
                rotate: '0',
                col: 3,
                row: -2,
            },
        };

        const emitted = nextBotInputs(controller, sync, () => 0);
        expect(emitted.length).toBeGreaterThan(0);

        let sawHardDrop = emitted.includes('hardDrop');
        for (let i = 0; i < 20 && !sawHardDrop; i += 1) {
            const step = nextBotInputs(controller, sync, () => 0);
            if (step.includes('hardDrop')) {
                sawHardDrop = true;
            }
        }

        expect(sawHardDrop).toBe(true);
    });
});

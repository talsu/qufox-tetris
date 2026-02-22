import { NMultiLobbyScene } from '../../../src/tetris/scenes/lobbyScene';

describe('NMultiLobbyScene re-entry', () => {
    test('rebinds socket events and requests room list when re-entering with active socket', () => {
        const scene = new NMultiLobbyScene() as any;

        scene.scale = {
            on: jest.fn(),
            off: jest.fn(),
        };
        scene.createBackground = jest.fn();
        scene.createPhaserUI = jest.fn();
        scene.resize = jest.fn();
        scene.setupSocketEvents = jest.fn();
        scene.socket = {
            connected: true,
            emit: jest.fn(),
        };

        scene.create();

        expect(scene.setupSocketEvents).toHaveBeenCalledTimes(1);
        expect(scene.socket.emit).toHaveBeenCalledWith('nmulti_get_rooms');
    });
});

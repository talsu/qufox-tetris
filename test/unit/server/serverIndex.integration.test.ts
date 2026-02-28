/**
 * @jest-environment node
 */

import path = require('path');
import net = require('net');
import { ChildProcess, spawn, spawnSync } from 'child_process';
import { io as ioClient, Socket } from 'socket.io-client';

type RoomJoinedPayload = {
    roomId: string;
    isHost: boolean;
    roomName: string;
    resumeToken: string;
    botLevel: number;
};

type NMultiRoomJoinedPayload = {
    roomId: string;
    playerId: string;
    playerName: string;
    roomName: string;
    players: Record<string, unknown>;
    authSeed: number;
    botLevel: number;
    authSnapshot: unknown;
};

function waitForEvent<T>(socket: Socket, event: string, timeoutMs: number = 5000): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            socket.off(event, onEvent);
            reject(new Error(`Timed out waiting for "${event}"`));
        }, timeoutMs);

        const onEvent = (payload: T) => {
            clearTimeout(timer);
            socket.off(event, onEvent);
            resolve(payload);
        };

        socket.on(event, onEvent);
    });
}

function waitForNoEvent(socket: Socket, event: string, durationMs: number = 600): Promise<void> {
    return new Promise((resolve, reject) => {
        const onEvent = () => {
            socket.off(event, onEvent);
            reject(new Error(`Unexpected "${event}" event`));
        };

        socket.on(event, onEvent);

        setTimeout(() => {
            socket.off(event, onEvent);
            resolve();
        }, durationMs);
    });
}

function findFreePort(): Promise<number> {
    return new Promise((resolve, reject) => {
        const probe = net.createServer();
        probe.on('error', reject);
        probe.listen(0, '127.0.0.1', () => {
            const address = probe.address();
            if (!address || typeof address === 'string') {
                probe.close();
                reject(new Error('Failed to allocate ephemeral port'));
                return;
            }
            const { port } = address;
            probe.close((closeErr) => {
                if (closeErr) {
                    reject(closeErr);
                    return;
                }
                resolve(port);
            });
        });
    });
}

function connectClient(baseUrl: string): Promise<Socket> {
    return new Promise((resolve, reject) => {
        const socket = ioClient(baseUrl, {
            path: '/server',
            transports: ['websocket'],
            reconnection: false,
        });

        const timer = setTimeout(() => {
            socket.disconnect();
            reject(new Error('Socket connect timeout'));
        }, 5000);

        socket.once('connect', () => {
            clearTimeout(timer);
            resolve(socket);
        });

        socket.once('connect_error', (err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

describe('server/index integration', () => {
    const repoRoot = path.resolve(__dirname, '../../..');
    const distEntry = path.join(repoRoot, 'dist/server/index.js');

    let port: number;
    let baseUrl: string;
    let serverProcess: ChildProcess | null = null;

    async function stopServer(): Promise<void> {
        if (!serverProcess) return;
        const child = serverProcess;
        serverProcess = null;

        await new Promise<void>((resolve) => {
            const forceTimer = setTimeout(() => {
                child.kill('SIGKILL');
            }, 2000);

            child.once('exit', () => {
                clearTimeout(forceTimer);
                resolve();
            });

            child.kill('SIGTERM');
        });
    }

    beforeAll(async () => {
        const tscEntry = path.join(repoRoot, 'node_modules/typescript/bin/tsc');
        const build = spawnSync(process.execPath, [tscEntry, '-p', 'tsconfig.server.json'], {
            cwd: repoRoot,
            encoding: 'utf8',
        });
        if (build.status !== 0) {
            const buildError = build.error ? `${build.error.name}: ${build.error.message}` : 'none';
            throw new Error(
                `server build failed (status=${String(build.status)}, signal=${String(build.signal)})\n` +
                    `spawnError=${buildError}\n` +
                    `${build.stdout ?? ''}\n${build.stderr ?? ''}`,
            );
        }

        port = await findFreePort();
        baseUrl = `http://127.0.0.1:${port}`;

        serverProcess = spawn('node', [distEntry], {
            cwd: repoRoot,
            env: {
                ...process.env,
                PORT: String(port),
            },
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        await new Promise<void>((resolve, reject) => {
            if (!serverProcess) {
                reject(new Error('Server process not created'));
                return;
            }

            const timeout = setTimeout(() => {
                reject(new Error('Timed out waiting for server startup'));
            }, 10000);

            const onData = (chunk: Buffer) => {
                const text = chunk.toString();
                if (text.includes(`Server running on port ${port}`)) {
                    clearTimeout(timeout);
                    resolve();
                }
            };

            serverProcess.stdout?.on('data', onData);
            serverProcess.stderr?.on('data', onData);
            serverProcess.once('exit', (code) => {
                clearTimeout(timeout);
                reject(new Error(`Server exited early with code ${String(code)}`));
            });
        });
    });

    afterAll(async () => {
        await stopServer();
    });

    test('1v1 create/join flow works and non-member restart request is ignored', async () => {
        const host = await connectClient(baseUrl);
        const guest = await connectClient(baseUrl);
        const intruder = await connectClient(baseUrl);

        try {
            const hostJoinedPromise = waitForEvent<RoomJoinedPayload>(host, 'room_joined');
            host.emit('create_room', { roomName: 'Integration 1v1', botLevel: 0 });

            const hostJoined = await hostJoinedPromise;
            expect(hostJoined.isHost).toBe(true);
            expect(hostJoined.roomName).toBe('Integration 1v1');

            const hostOpponentJoined = waitForEvent<{ opponentId: string }>(host, 'opponent_joined');
            const guestJoinedPromise = waitForEvent<RoomJoinedPayload>(guest, 'room_joined');
            guest.emit('join_room', { roomId: hostJoined.roomId, botLevel: 0 });

            const guestJoined = await guestJoinedPromise;
            expect(guestJoined.roomId).toBe(hostJoined.roomId);
            expect(guestJoined.isHost).toBe(false);
            expect(guestJoined.roomName).toBe('Integration 1v1');
            expect(guestJoined.resumeToken.length).toBeGreaterThan(0);

            const opponentInfo = await hostOpponentJoined;
            expect(typeof opponentInfo.opponentId).toBe('string');
            expect(opponentInfo.opponentId.length).toBeGreaterThan(0);

            intruder.emit('request_restart', { roomId: hostJoined.roomId });
            await waitForNoEvent(host, 'restart_signal');
            await waitForNoEvent(guest, 'restart_signal');
        } finally {
            host.disconnect();
            guest.disconnect();
            intruder.disconnect();
        }
    });

    test('n-multi join and full-sync request flow returns room snapshot + auth snapshot', async () => {
        const owner = await connectClient(baseUrl);
        const challenger = await connectClient(baseUrl);

        try {
            const ownerJoinedPromise = waitForEvent<NMultiRoomJoinedPayload>(owner, 'nmulti_room_joined');
            owner.emit('nmulti_create_room', { roomName: 'Integration NMulti', botLevel: 0 });
            const ownerJoined = await ownerJoinedPromise;

            expect(ownerJoined.roomName).toBe('Integration NMulti');
            expect(typeof ownerJoined.playerId).toBe('string');
            expect(ownerJoined.playerId.length).toBeGreaterThan(0);
            expect(ownerJoined.botLevel).toBe(0);

            const challengerJoinedPromise = waitForEvent<NMultiRoomJoinedPayload>(challenger, 'nmulti_room_joined');
            challenger.emit('nmulti_join_room', { roomId: ownerJoined.roomId, botLevel: 0 });
            const challengerJoined = await challengerJoinedPromise;

            expect(challengerJoined.roomId).toBe(ownerJoined.roomId);
            expect(typeof challengerJoined.playerName).toBe('string');
            expect(challengerJoined.playerName.length).toBeGreaterThan(0);

            const fullSyncPromise = waitForEvent<{ players: Record<string, unknown>; isDelta?: boolean }>(
                challenger,
                'nmulti_snapshot',
            );
            const authSnapshotPromise = waitForEvent<{ self: unknown; serverAckInputSeq: number }>(
                challenger,
                'nmulti_auth_snapshot',
            );
            challenger.emit('nmulti_request_full_sync', { roomId: challengerJoined.roomId });

            const fullSync = await fullSyncPromise;
            expect(fullSync.isDelta).toBe(false);
            expect(typeof fullSync.players).toBe('object');

            const authSnapshot = await authSnapshotPromise;
            expect(typeof authSnapshot.serverAckInputSeq).toBe('number');
            expect(authSnapshot.self).toBeDefined();
        } finally {
            owner.disconnect();
            challenger.disconnect();
        }
    });
});

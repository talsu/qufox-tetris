import { io, Socket } from 'socket.io-client';

/**
 * SocketHarness provides a direct socket connection for testing
 * server-client interactions without going through the UI.
 */
export class SocketHarness {
    private socket: Socket | null = null;

    constructor(private serverUrl: string = 'http://127.0.0.1:3031') {}

    async connect(): Promise<Socket> {
        this.socket = io(this.serverUrl, {
            transports: ['websocket'],
        });

        return new Promise((resolve, reject) => {
            this.socket!.on('connect', () => resolve(this.socket!));
            this.socket!.on('connect_error', (err) => reject(err));
            setTimeout(() => reject(new Error('Socket connection timeout')), 5000);
        });
    }

    getSocket(): Socket {
        if (!this.socket) throw new Error('Socket not connected. Call connect() first.');
        return this.socket;
    }

    async disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    // --- Event helpers ---

    waitForEvent(eventName: string, timeout = 5000): Promise<unknown> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${eventName}`)), timeout);
            this.getSocket().once(eventName, (data: unknown) => {
                clearTimeout(timer);
                resolve(data);
            });
        });
    }

    emit(event: string, data: unknown): void {
        this.getSocket().emit(event, data);
    }
}

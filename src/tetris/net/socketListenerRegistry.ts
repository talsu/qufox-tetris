export type SocketEventHandler = (...args: any[]) => void;

export interface SocketLike {
    on(event: string, handler: SocketEventHandler): void;
    off(event: string, handler: SocketEventHandler): void;
}

interface BoundSocketListener {
    event: string;
    handler: SocketEventHandler;
}

export class SocketListenerRegistry {
    private listeners: BoundSocketListener[] = [];

    bind(socket: SocketLike, event: string, handler: SocketEventHandler): void {
        socket.on(event, handler);
        this.listeners.push({ event, handler });
    }

    clear(socket: SocketLike | null | undefined): void {
        if (!socket) {
            this.listeners = [];
            return;
        }
        for (const listener of this.listeners) {
            socket.off(listener.event, listener.handler);
        }
        this.listeners = [];
    }
}

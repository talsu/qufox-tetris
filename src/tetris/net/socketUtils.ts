/**
 * Returns the appropriate socket server URL based on the current hostname.
 */
export function getSocketUrl(): string {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    return isLocal ? 'http://localhost:3031' : window.location.origin;
}

export const SOCKET_PATH = '/server';

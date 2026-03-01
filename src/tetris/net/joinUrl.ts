export type JoinUrlMode = 'multi' | 'n-multi';

export interface ParsedJoinTarget {
    mode: JoinUrlMode;
    roomKey: string;
    useShortJoin: boolean;
}

function sanitizeBotLevel(raw: string | null): number {
    const parsed = Number.parseInt(raw ?? '0', 10);
    return Number.isFinite(parsed) ? parsed : 0;
}

export function buildJoinUrl(mode: JoinUrlMode, roomKey: string, useShortJoin: boolean = true): string {
    const encodedRoomKey = encodeURIComponent(roomKey);
    const path = useShortJoin ? `/j/${mode === 'multi' ? 'm' : 'n'}/${encodedRoomKey}` : `/${mode}/${encodedRoomKey}`;

    if (typeof window === 'undefined' || typeof window.location?.origin !== 'string') {
        return path;
    }
    return `${window.location.origin}${path}`;
}

export function parseJoinRoute(pathname: string): ParsedJoinTarget | null {
    const shortMatch = pathname.match(/^\/j\/(m|n)\/(.+)$/);
    if (shortMatch) {
        return {
            mode: shortMatch[1] === 'm' ? 'multi' : 'n-multi',
            roomKey: decodeURIComponent(shortMatch[2]),
            useShortJoin: true,
        };
    }

    const longMatch = pathname.match(/^\/(multi|n-multi)\/(.+)$/);
    if (longMatch) {
        return {
            mode: longMatch[1] as JoinUrlMode,
            roomKey: decodeURIComponent(longMatch[2]),
            useShortJoin: false,
        };
    }

    return null;
}

export function resolveJoinRoute(pathname: string, search: string): (ParsedJoinTarget & { botLevel: number }) | null {
    const target = parseJoinRoute(pathname);
    if (!target) {
        return null;
    }

    const urlParams = new URLSearchParams(search);
    return {
        ...target,
        botLevel: sanitizeBotLevel(urlParams.get('bot')),
    };
}

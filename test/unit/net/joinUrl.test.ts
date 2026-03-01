import { buildJoinUrl, parseJoinRoute, resolveJoinRoute } from '../../../src/tetris/net/joinUrl';

describe('joinUrl helpers', () => {
    test('buildJoinUrl returns short route by default', () => {
        expect(buildJoinUrl('multi', 'room#1')).toBe(`${window.location.origin}/j/m/room%231`);
        expect(buildJoinUrl('n-multi', 'room alpha')).toBe(`${window.location.origin}/j/n/room%20alpha`);
    });

    test('parseJoinRoute supports short and legacy paths', () => {
        expect(parseJoinRoute('/j/m/room-1')).toEqual({
            mode: 'multi',
            roomKey: 'room-1',
            useShortJoin: true,
        });
        expect(parseJoinRoute('/n-multi/Room%20A')).toEqual({
            mode: 'n-multi',
            roomKey: 'Room A',
            useShortJoin: false,
        });
    });

    test('resolveJoinRoute returns bot level with defaults', () => {
        expect(resolveJoinRoute('/j/n/abc', '?bot=9')).toEqual({
            mode: 'n-multi',
            roomKey: 'abc',
            useShortJoin: true,
            botLevel: 9,
        });
        expect(resolveJoinRoute('/multi/abc', '')).toEqual({
            mode: 'multi',
            roomKey: 'abc',
            useShortJoin: false,
            botLevel: 0,
        });
    });
});

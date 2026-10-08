// 旅館の間取り（固定）。1 マス = 1.2m。x は西→東、y は北→南（奥→玄関）。
// corridors: [x, y, w, h]
// rooms: [種類, x, y, w, h, 入口の向き]（入口はその辺の真ん中）
// stairs: 下の階から上の階へ。footprint は下の階では廊下、上の階では吹き抜け。dir は上る向き。
export const U = 1.2;
export const FH = 3.0; // 階の高さ
export const GRID_W = 46;
export const GRID_H = 36;

export const FLOORS = [
  {
    name: '1階',
    corridors: [
      [0, 8, 46, 2], // 裏の廊下
      [10, 10, 2, 26], // 西の廊下
      [27, 10, 2, 10],
      [0, 20, 46, 2], // 表の廊下
      [32, 22, 2, 14],
    ],
    rooms: [
      ['rotenburo', 0, 0, 10, 8, 's'],
      ['takebayashi', 10, 0, 8, 8, 's'],
      ['teien', 18, 0, 10, 8, 's'],
      ['bochi', 28, 0, 8, 8, 's'],
      ['ido', 36, 0, 10, 8, 's'],
      ['bath', 0, 10, 10, 10, 'n'],
      ['chubo', 12, 10, 10, 10, 'n'],
      ['shokuryoko', 22, 10, 5, 5, 'n'],
      ['hikae', 22, 15, 5, 5, 'e'],
      ['boiler', 29, 10, 5, 5, 'n'],
      ['sentaku', 29, 15, 5, 5, 'w'],
      ['enkaijo', 34, 10, 12, 10, 's'],
      ['karaoke', 0, 22, 10, 6, 'n'],
      ['kissa', 0, 28, 10, 8, 'e'],
      ['lobby', 12, 22, 14, 8, 'n'],
      ['genkan', 12, 30, 14, 6, 'n'], // 入口はロビーへ
      ['chouba', 26, 22, 6, 6, 'n'],
      ['baiten', 26, 28, 6, 8, 'e'],
      ['okami', 34, 22, 10, 6, 'n'],
    ],
  },
  {
    name: '2階',
    corridors: [
      [0, 18, 46, 2],
      [42, 20, 2, 9],
      [29, 27, 17, 2],
    ],
    rooms: [
      ['oobeya', 0, 10, 10, 8, 's'],
      ['sensei', 10, 10, 6, 8, 's'],
      ['kyakushitsu', 16, 10, 6, 8, 's'],
      ['zashiki', 22, 10, 6, 8, 's'],
      ['tokubetsu', 28, 10, 12, 8, 's'],
      ['futonbeya', 40, 10, 6, 8, 's'],
      ['senmenjo', 0, 20, 8, 8, 'n'],
      ['toilet', 8, 20, 5, 8, 'n'],
      ['shosai', 13, 20, 10, 8, 'n'],
      ['chashitsu', 23, 20, 6, 7, 'n'],
      ['yugijo', 29, 20, 13, 7, 'n'],
    ],
  },
  {
    name: '3階',
    corridors: [
      [0, 34, 46, 2],
      [0, 12, 2, 24],
      [0, 12, 38, 2],
    ],
    rooms: [
      ['butsuma', 2, 14, 6, 10, 'n'],
      ['ningyo', 8, 14, 7, 10, 'n'],
      ['kagami', 15, 14, 6, 10, 'n'],
      ['shinden', 21, 14, 6, 10, 'n'],
      ['fuuin', 27, 14, 5, 10, 'n'],
      ['oku', 32, 14, 6, 6, 'n'],
      ['kodomo', 2, 24, 7, 10, 's'],
      ['monooki', 9, 24, 5, 10, 's'],
      ['kura', 14, 24, 10, 10, 's'],
      ['sekitei', 24, 24, 20, 10, 's'],
    ],
  },
];

export const STAIRS = [
  { from: 0, x: 44, y: 22, w: 2, len: 5, dir: 's' },
  { from: 1, x: 44, y: 29, w: 2, len: 5, dir: 's' },
];

export const START_ROOM = 'oobeya';

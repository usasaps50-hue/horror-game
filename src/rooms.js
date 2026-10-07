// 部屋の種類（21種）。ctx の使い方は world.js の makeRoomCtx を参照
import * as P from './props.js';

const STUDENT_COLORS = [0x2a3a6a, 0x6a2a2a, 0x2a5a3a, 0x3a3a3a, 0xc8a83a, 0x5a3a6a];

export const ROOM_TYPES = {
  // ===== 固定の部屋 =====
  oku: {
    name: '奥の間',
    plate: "奥の間",
    floor: 'tatami',
    build(c) {
      const back = c.back; // 入口の反対側
      c.wall(P.futon(0x8a1a1a), back, -0.45, 1.1);
      for (let i = 0; i < 14; i++) c.put(P.temari(c.R.range(0.8, 1.4)), c.R.range(-3, 3), c.R.range(-3, 3));
      c.put(P.toys(c.R), c.R.range(-2, 2), c.R.range(-2, 2), c.R.range(0, 6));
      const t = P.lowTable(0.8, 0.5, 0.25);
      c.wall(t, back, 0.5, 0.7, true);
      for (const [x, z] of c.corners.slice(0, 3)) c.put(P.candle(), x * 1.1, z * 1.1);
      c.hang(P.chochin(true, true), -1.2, 0.8);
      c.hang(P.chochin(true, true), 1.3, -0.9);
      c.ofudaEverywhere(28);
      c.spawnPoint('zashiki', back, 0, 1.2);
    },
  },

  // ===== ランダムに出てくる部屋 =====
  kyakushitsu: {
    name: '客室「桔梗の間」',
    plate: "桔梗の間",
    floor: 'tatami',
    build(c) {
      c.put(P.lowTable(), 0, 0, 0, true);
      for (const [x, z, r] of [[0, -0.75, 0], [0, 0.75, Math.PI], [-1.0, 0, Math.PI / 2], [1.0, 0, -Math.PI / 2]])
        c.put(P.zabuton(0x6e2626), x, z, r);
      c.put(P.teaSet(), 0.2, 0.1, 0.3).position.y = 0.33;
      if (c.free[0]) c.wall(P.tokonoma(), c.free[0], 0.45, 0.4, true);
      const [x, z] = c.corners[0];
      c.put(P.andon(), x, z);
      const [tx, tz] = c.corners[1];
      c.put(P.crtTv(), tx, tz, Math.atan2(-tx, -tz), true);
      for (let i = 0; i < 3; i++) c.put(P.bag(c.R.pick(STUDENT_COLORS)), c.corners[2][0] + i * 0.2, c.corners[2][1], c.R.range(0, 6));
    },
  },

  oobeya: {
    name: '大部屋（二年三組）',
    plate: "二年三組",
    floor: 'tatami',
    build(c) {
      // 修学旅行らしく布団がずらっと並んでいる
      const rows = [-1.7, 1.7];
      for (const z of rows)
        for (let i = 0; i < 5; i++) {
          if (c.R.chance(0.15)) continue;
          const f = P.futon(c.R.pick([0x4a6a8a, 0x6a4a6a, 0x4a6a5a]), c.R.range(-1, 1));
          c.put(f, -2.6 + i * 1.3, z, z < 0 ? 0 : Math.PI);
        }
      for (let i = 0; i < 5; i++) c.put(P.bag(c.R.pick(STUDENT_COLORS)), c.R.range(-3, 3), c.R.pick([-3.3, 3.3]), c.R.range(0, 6));
      c.hang(P.chochin(false), 0, 0);
    },
  },

  enkaijo: {
    name: '宴会場',
    plate: "宴会場",
    floor: 'tatami',
    build(c) {
      for (const z of [-1.3, 1.3]) {
        c.put(P.lowTable(5.2, 0.6, 0.3), 0, z, 0, true);
        for (let i = 0; i < 6; i++) {
          const x = -2.2 + i * 0.88;
          c.put(P.ozen(), x, z, 0).position.y = 0.3;
          for (const side of [-1, 1]) c.put(P.zabuton(0x5a1a1a), x, z + side * 0.62, side < 0 ? 0 : Math.PI);
        }
      }
      if (c.free[0]) c.wall(P.stage(2.8, 1.0), c.free[0], 0, 0.5, true);
      c.hang(P.chochin(), -2, 0);
      c.hang(P.chochin(c.R.chance(0.5)), 2, 0);
    },
  },

  chubo: {
    name: '厨房',
    plate: "厨房",
    floor: 'stone',
    build(c) {
      const [s1, s2] = c.free;
      if (s1) {
        c.wall(P.counter(3.0, 0.9, 0.6, 0x8a8a88, 0x9a9a98), s1, -0.25, 0.32, true);
        c.wall(P.stove(), s1, 0.55, 0.32, true);
      }
      if (s2) {
        const sh = P.fillShelf(P.shelf(2.0, 1.8, 0.4, 4, 0x5a5a58), c.R, 2.0, 0.4, (R) => (R.chance(0.85) ? P.plates(R) : null));
        c.wall(sh, s2, -0.3, 0.22, true);
        c.wall(P.fridge(), s2, 0.55, 0.38, true);
      }
      c.put(P.counter(1.6, 0.9, 0.9, 0x8a8a88, 0x9a9a98), 0, 0, c.R.pick([0, Math.PI / 2]), true);
      c.put(P.riceCooker(), 0.3, 0.1).position.y = 0.9;
      c.lamp(0, 0, 0xc8d8c0, 1.4);
    },
  },

  chouba: {
    name: '帳場',
    plate: "帳場",
    floor: 'wood',
    build(c) {
      const side = c.free[0] || 'n';
      c.wall(P.keyBoard(c.R), side, 0, 0.04);
      const ct = P.counter(3.0, 1.0, 0.55);
      c.wall(ct, side, 0, 1.4, true);
      for (const [obj, t] of [[P.deskBell(), -0.3], [P.bookLedger(), 0], [P.phone(), 0.3]]) c.wall(obj, side, t, 1.4).position.y = 1.0;
      if (c.free[1]) c.wall(P.clock(), c.free[1], 0, 0.06).position.y = 2.0;
      const [x, z] = c.corners[2];
      c.put(P.andon(), x, z);
    },
  },

  baiten: {
    name: '売店',
    plate: "売店",
    floor: 'wood',
    build(c) {
      for (const side of c.free.slice(0, 2)) {
        const sh = P.fillShelf(P.shelf(2.6, 1.6, 0.4, 4), c.R, 2.6, 0.4, (R) => (R.chance(0.9) ? P.souvenirBox(R) : null));
        c.wall(sh, side, -0.15, 0.22, true);
      }
      const [x, z] = c.corners[0];
      c.put(P.bokutoRack(c.R), x, z, c.R.range(0, 6), true);
      const [px, pz] = c.corners[1];
      c.put(P.postcardRack(c.R), px * 0.8, pz * 0.8, c.R.range(0, 6));
      c.put(P.counter(1.4, 0.9, 0.6), 1.0, 1.0, c.R.pick([0, Math.PI / 2]), true);
      c.put(P.cashRegister(), 1.0, 1.0).position.y = 0.9;
      c.hang(P.chochin(), -0.5, -0.5);
    },
  },

  yugijo: {
    name: '遊技場',
    plate: "遊技場",
    floor: 'wood',
    build(c) {
      c.put(P.pingPong(), 0, 0, c.R.pick([0, Math.PI / 2]), true);
      if (c.free[0]) c.wall(P.vendingMachine(), c.free[0], 0.55, 0.4, true);
      if (c.free[1]) c.wall(P.arcade(), c.free[1], -0.55, 0.4, true);
      const [x, z] = c.corners[2];
      c.put(P.massageChair(), x, z, Math.atan2(-x, -z), true);
    },
  },

  butsuma: {
    name: '仏間',
    plate: "仏間",
    floor: 'tatami',
    build(c) {
      const side = c.free[0] || c.back;
      c.wall(P.butsudan(), side, 0, 0.3, true);
      c.wall(P.zabuton(0x3a2a4a), side, 0, 1.2);
      for (let i = 0; i < 5; i++) c.wall(P.portraitFrame(), side, -0.75 + i * 0.37, 0.04).position.y = 1.85;
      for (const t of [-0.3, 0.3]) c.wall(P.candle(), side, t, 0.75);
      c.ofudaEverywhere(4);
    },
  },

  zashiki: {
    name: '座敷「鶴の間」',
    plate: "鶴の間",
    floor: 'tatami',
    build(c) {
      if (c.free[0]) c.wall(P.tokonoma(), c.free[0], 0, 0.4, true);
      if (c.free[1]) c.wall(P.byobu(2.6, 1.5), c.free[1], 0, 0.3);
      c.put(P.lowTable(2.0, 1.0), 0, 0, 0, true);
      for (const x of [-0.5, 0.5]) for (const z of [-0.8, 0.8]) c.put(P.zabuton(0x2a2a5a), x, z, z < 0 ? 0 : Math.PI);
      const [ax, az] = c.corners[0];
      c.put(P.andon(), ax, az);
    },
  },

  futonbeya: {
    name: '布団部屋',
    plate: "布団部屋",
    floor: 'tatami',
    build(c) {
      for (const side of c.free.slice(0, 2))
        for (const t of [-0.5, 0, 0.5]) c.wall(P.futonPile(c.R, c.R.int(4, 9)), side, t, 0.5, true);
      for (let i = 0; i < 2; i++) {
        const [x, z] = c.corners[i];
        c.put(P.futonPile(c.R, c.R.int(2, 6)), x, z, c.R.range(0, 6), true);
      }
      // 一枚だけ、誰かが寝ているようなふくらみ
      const f = P.futon(0x8a8a8a, 0.6);
      c.put(f, 0.6, 0.2, c.R.range(0, 6));
      const bump = P.sheetCovered(0.4, 0.3, 1.1);
      c.put(bump, 0.6, 0.2, f.rotation.y).position.y = 0.1;
    },
  },

  nakaniwa: {
    name: '中庭',
    plate: "中庭",
    floor: 'gravel',
    noCeiling: true,
    build(c) {
      const cs = c.corners;
      c.put(P.well(), cs[0][0] * 0.75, cs[0][1] * 0.75, c.R.range(0, 6), true);
      c.put(P.pine(c.R), cs[1][0], cs[1][1], c.R.range(0, 6), true);
      c.put(P.stoneLantern(), cs[2][0], cs[2][1], 0, true);
      c.put(P.pond(), cs[3][0] * 0.8, cs[3][1] * 0.8);
      for (const d of ['n', 's', 'e', 'w']) {
        if (!c.doors[d]) continue;
        for (let i = 1; i <= 4; i++) {
          const k = i / 5;
          const [dx, dz] = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[d];
          c.put(P.steppingStone(), dx * 3.6 * k, dz * 3.6 * k, c.R.range(0, 6));
        }
      }
      c.moon();
    },
  },

  monooki: {
    name: '物置',
    plate: "物置",
    floor: 'wood',
    build(c) {
      for (const side of c.free.slice(0, 2)) {
        const sh = P.fillShelf(P.shelf(2.4, 1.9, 0.45, 4, 0x4a3420), c.R, 2.4, 0.45, (R) => (R.chance(0.7) ? (R.chance(0.3) ? P.doll(R, 1.6) : P.jar(R)) : null));
        c.wall(sh, side, -0.1, 0.25, true);
      }
      for (let i = 0; i < 3; i++) {
        const [x, z] = c.corners[i];
        const st = P.crate(c.R.range(0.5, 0.8), c.R.range(0.35, 0.6), c.R.range(0.4, 0.6));
        c.put(st, x, z, c.R.range(-0.3, 0.3), true);
        if (c.R.chance(0.6)) c.put(P.crate(0.5, 0.4, 0.45), x, z, c.R.range(-0.5, 0.5)).position.y = 0.5;
      }
      c.put(P.brokenChair(), c.R.range(-1, 1), c.R.range(-1, 1), c.R.range(0, 6));
      const [x, z] = c.corners[3];
      c.put(P.sheetCovered(0.8, 1.5, 0.6), x, z, 0, true);
    },
  },

  chashitsu: {
    name: '茶室',
    plate: "茶室",
    floor: 'tatami',
    build(c) {
      c.put(P.hearth(), 0, 0, 0, true);
      if (c.free[0]) c.wall(P.tokonoma(), c.free[0], 0, 0.4, true);
      c.put(P.zabuton(0x3a4a3a), 0, 1.0, Math.PI);
      c.put(P.zabuton(0x3a4a3a), 0, -1.0, 0);
      c.put(P.teaSet(), 0.6, 0.6, 0.4);
    },
  },

  okami: {
    name: '女将の部屋',
    plate: "女将",
    floor: 'tatami',
    build(c) {
      const [s1, s2] = c.free;
      if (s1) {
        c.wall(P.dresser(), s1, -0.4, 0.25, true);
        c.wall(P.tansu(), s1, 0.4, 0.25, true);
      }
      if (s2) c.wall(P.kimonoRack(), s2, 0, 0.3, true);
      c.put(P.lowTable(1.0, 0.6), 0.4, 0.4, 0, true);
      c.put(P.bookLedger(), 0.4, 0.4, 0.2).position.y = 0.33;
      c.put(P.zabuton(0x5a2a3a), 0.4, 1.1, Math.PI);
      const [x, z] = c.corners[2];
      c.put(P.andon(), x, z);
    },
  },

  ningyo: {
    name: '人形の間',
    plate: "人形の間",
    floor: 'tatami',
    build(c) {
      const side = c.free[0] || c.back;
      c.wall(P.hinaDan(c.R, 2.8), side, 0, 0.85, true);
      for (let i = 0; i < 2; i++) {
        const [x, z] = c.corners[i + 1];
        c.put(P.glassCase(c.R), x, z, Math.atan2(-x, -z), true);
      }
      for (const t of [-0.45, 0.45]) c.wall(P.candle(), side, t, 1.9);
      // 床にも何体か、こちらを向いて座っている
      for (let i = 0; i < 4; i++) c.put(P.doll(c.R, 1.8), c.R.range(-1.5, 1.5), c.R.range(-1.5, 1.5), c.R.range(0, 6));
    },
  },
};

export const RANDOM_POOL = [
  'kyakushitsu', 'enkaijo', 'chubo', 'chouba', 'baiten', 'yugijo', 'butsuma',
  'zashiki', 'futonbeya', 'nakaniwa', 'monooki', 'chashitsu', 'okami', 'ningyo', 'oobeya',
];

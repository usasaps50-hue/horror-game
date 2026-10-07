// 部屋の種類（すべて 1 つずつしか出てこない）
// ctx: R, hw, hd（内側の半分の幅・奥行き。入口は -z 側の壁の真ん中）, put, wall, hang, lamp ...
import * as THREE from 'three';
import * as P from './props.js';
import * as Q from './props2.js';
import { buildBath } from './bath.js';

const STUDENT = [0x2a3a6a, 0x6a2a2a, 0x2a5a3a, 0x3a3a3a, 0xc8a83a, 0x5a3a6a, 0x8a8a8a];

// ---------- 小部屋（6m 四方） ----------
const S = {
  kyakushitsu: {
    name: '客室「桔梗の間」', plate: '桔梗の間', floor: 'tatami', door: 'koshi', windows: true,
    build(c) {
      c.put(P.lowTable(), 0, 0.2, 0, true);
      for (const [x, z, r] of [[0, -0.55, 0], [0, 0.95, Math.PI], [-1.0, 0.2, Math.PI / 2], [1.0, 0.2, -Math.PI / 2]]) c.put(P.zabuton(0x6e2626), x, z, r);
      c.put(P.teaSet(), 0.2, 0.25, 0.3).position.y = 0.33;
      c.wall(P.tokonoma(), 's', 0.4, 0.4, true);
      c.put(P.crtTv(), c.corners[0][0], c.corners[0][1], Math.atan2(-c.corners[0][0], -c.corners[0][1]), true);
      c.put(P.andon(), c.corners[1][0], c.corners[1][1]);
      c.lamp(0, 0);
    },
  },
  sensei: {
    name: '先生の部屋', plate: '引率教員', floor: 'tatami', door: 'koshi', windows: true,
    build(c) {
      for (const side of ['w', 'e']) {
        c.wall(P.lowTable(1.4, 0.6), side, 0.2, 0.5, true);
        const p = Q.papers(c.R, 6, 0.3);
        c.wall(p, side, 0.2, 0.5).position.y = 0.33;
      }
      c.wall(P.bookLedger(), 'w', 0.5, 0.5).position.y = 0.33;
      c.put(Q.beerCans(c.R, 6), 0.3, 0.8);
      c.put(Q.ashtray(), -0.2, 0.6);
      c.put(P.futonPile(c.R, 2), c.corners[0][0], c.corners[0][1], 0.3, true);
      for (let i = 0; i < 2; i++) c.put(P.bag(0x1a1a1a), c.corners[1][0] + i * 0.3, c.corners[1][1]);
      const roll = Q.textPlane(['しおり　三日目', '', '6:30 起床', '7:00 朝食', '8:00 出発', '', '※夜間の外出禁止'], 0.6, 0.8, { size: 24 });
      c.wall(roll, 's', -0.4, 0.04).position.y = 1.4;
      c.bulb(0, 0, true);
    },
  },
  zashiki: {
    name: '座敷「鶴の間」', plate: '鶴の間', floor: 'tatami', door: 'fusuma', windows: true,
    build(c) {
      c.wall(P.tokonoma(), 's', 0, 0.4, true);
      c.wall(P.byobu(2.2, 1.4), c.free.find((s) => s !== 's') || 'w', 0, 0.3);
      c.put(P.lowTable(1.8, 0.9), 0, 0.1, 0, true);
      for (const x of [-0.45, 0.45]) for (const z of [-0.65, 0.85]) c.put(P.zabuton(0x2a2a5a), x, z, z < 0 ? 0 : Math.PI);
      c.put(P.andon(), c.corners[0][0], c.corners[0][1]);
    },
  },
  chashitsu: {
    name: '茶室', plate: '茶室', floor: 'tatami', door: 'shoji',
    build(c) {
      c.put(P.hearth(), 0, 0.3, 0, true);
      c.wall(P.tokonoma(), 's', 0, 0.4, true);
      c.put(P.zabuton(0x3a4a3a), 0, -0.6, 0);
      c.put(P.zabuton(0x3a4a3a), 0, 1.2, Math.PI);
      c.put(P.teaSet(), 0.6, 0.6, 0.4);
      c.put(P.andon(), c.corners[2][0], c.corners[2][1]);
    },
  },
  butsuma: {
    name: '仏間', plate: '仏間', floor: 'tatami', door: 'fusuma',
    build(c) {
      c.wall(P.butsudan(), 's', 0, 0.3, true);
      c.wall(P.zabuton(0x3a2a4a), 's', 0, 1.2);
      for (let i = 0; i < 5; i++) c.wall(P.portraitFrame(), 's', -0.6 + i * 0.3, 0.04).position.y = 1.85;
      for (const t of [-0.25, 0.25]) c.wall(P.candle(), 's', t, 0.8);
      c.ofuda(4);
    },
  },
  ningyo: {
    name: '人形の間', plate: '人形の間', floor: 'tatami', door: 'fusuma',
    build(c) {
      c.wall(P.hinaDan(c.R, Math.min(2.8, c.hw * 2 - 0.8)), 's', 0, 0.85, true);
      for (let i = 0; i < 2; i++) {
        const [x, z] = c.corners[i];
        c.put(P.glassCase(c.R), x, z, Math.atan2(-x, -z), true);
      }
      for (const t of [-0.4, 0.4]) c.wall(P.candle(), 's', t, 1.9);
      for (let i = 0; i < 4; i++) c.put(P.doll(c.R, 1.8), c.R.range(-1.2, 1.2), c.R.range(-0.8, 0.8), c.R.range(0, 6));
    },
  },
  futonbeya: {
    name: '布団部屋', plate: '布団部屋', floor: 'tatami', door: 'wood',
    build(c) {
      for (const side of ['w', 'e', 's']) for (const t of [-0.5, 0.5]) c.wall(P.futonPile(c.R, c.R.int(4, 9)), side, t, 0.5, true);
      const f = P.futon(0x8a8a8a, 0.6);
      c.put(f, 0.3, 0.2, c.R.range(0, 6));
      c.put(P.sheetCovered(0.4, 0.3, 1.1), 0.3, 0.2, f.rotation.y).position.y = 0.1;
      c.bulb(0, 0, false);
    },
  },
  monooki: {
    name: '物置', plate: '物置', floor: 'wood', door: 'wood',
    build(c) {
      for (const side of ['w', 's']) {
        const sh = P.fillShelf(P.shelf(2.2, 1.9, 0.45, 4, 0x4a3420), c.R, 2.2, 0.45, (R) => (R.chance(0.7) ? (R.chance(0.3) ? P.doll(R, 1.6) : P.jar(R)) : null));
        c.wall(sh, side, 0, 0.25, true);
      }
      const [x, z] = c.corners[0];
      c.put(P.crate(0.7, 0.5, 0.5), x, z, 0.2, true);
      c.put(P.crate(0.5, 0.4, 0.45), x, z, -0.3).position.y = 0.5;
      c.put(P.brokenChair(), 0.3, 0.4, c.R.range(0, 6));
      c.wall(P.sheetCovered(0.8, 1.5, 0.6), 'e', 0.4, 0.4, true);
      c.bulb(0, 0, true);
    },
  },
  okami: {
    name: '女将の部屋', plate: '女将', floor: 'tatami', door: 'fusuma',
    build(c) {
      c.wall(P.dresser(), 'w', -0.3, 0.25, true);
      c.wall(P.tansu(), 'w', 0.5, 0.25, true);
      c.wall(P.kimonoRack(), 's', 0, 0.3, true);
      c.put(P.lowTable(1.0, 0.6), 0.6, 0.3, 0, true);
      c.put(P.bookLedger(), 0.6, 0.3, 0.2).position.y = 0.33;
      c.put(P.zabuton(0x5a2a3a), 0.6, 0.95, Math.PI);
      c.put(P.andon(), c.corners[0][0], c.corners[0][1]);
    },
  },
  chouba: {
    name: '帳場', plate: '帳場', floor: 'wood', door: 'wood', windows: true,
    build(c) {
      c.wall(P.keyBoard(c.R), 's', 0, 0.04);
      c.put(P.counter(c.hw * 2 - 1.8, 1.0, 0.55), 0, -0.4, 0, true);
      for (const [o, x] of [[P.deskBell(), -0.6], [P.bookLedger(), 0], [P.phone(), 0.6]]) c.put(o, x, -0.4).position.y = 1.0;
      c.wall(P.clock(), 'w', 0, 0.06).position.y = 2.0;
      c.put(Q.safeBox(), c.hw - 0.5, c.hd - 0.5, Math.PI, true);
      c.put(Q.pipeChair(), 0, 0.6, Math.PI);
      c.lamp(0, 0);
    },
  },
  shinden: {
    name: '祭壇の間', plate: '神の間', floor: 'tatami', door: 'fusuma',
    build(c) {
      c.wall(Q.altar(), 's', 0, 0.4, true);
      for (const t of [-0.75, 0.75]) c.wall(Q.sakeBarrel(), 's', t, 0.4, true);
      c.put(P.zabuton(0xc8c0a0), 0, 0.2, Math.PI);
      for (const [x, z] of c.corners) c.put(P.candle(), x, z);
      const sn = Q.shimenawa(c.hw * 2 - 0.4);
      c.put(sn, 0, -c.hd + 0.2).position.y = 2.3;
    },
  },
  fuuin: {
    name: '封じられた部屋', plate: '', floor: 'tatami', door: 'fusuma',
    build(c) {
      c.ofuda(70);
      const box = new THREE.Group();
      P.box(0.4, 0.3, 0.3, P.mat(0x2a1a0e), 0, 0, 0, box);
      const sn = Q.shimenawa(0.5);
      sn.scale.setScalar(0.5);
      sn.position.set(0, 0.3, 0);
      box.add(sn);
      c.put(box, 0, 0.6, 0.3, true);
      for (const [x, z] of c.corners) c.put(Q.morijio(), x * 0.95, z * 0.95);
      c.wall(Q.chains(c.hw * 1.6, 2.2), 's', 0, 0.1);
      c.put(P.candle(), 0.4, 0.3);
    },
  },
  kagami: {
    name: '鏡の間', plate: '鏡の間', floor: 'wood', door: 'fusuma',
    build(c) {
      const n = 8;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + 0.2;
        const r = Math.min(c.hw, c.hd) - 0.7;
        const x = Math.sin(a) * r, z = Math.cos(a) * r + 0.3;
        if (z < -c.hd + 1.6 && Math.abs(x) < 1.2) continue; // 入口の前はあける
        c.put(Q.standMirror(i === 3), x, z, a + Math.PI, true);
      }
      c.put(P.candle(), 0, 0.3);
    },
  },
  toilet: {
    name: 'お手洗い', plate: '御手洗', floor: 'tile', door: 'wood',
    build(c) {
      const n = Math.min(3, Math.floor((c.hw * 2 - 0.4) / 1.0));
      for (let i = 0; i < n; i++) c.put(Q.toiletStall(c.R), -((n - 1) * 1.0) / 2 + i * 1.0, c.hd - 0.68, Math.PI, true);
      for (const t of [-0.3, 0.3]) c.wall(Q.urinal(), 'e', t - 0.2, 0.15, true);
      c.wall(Q.sinkCounter(1), 'w', -0.3, 0.3, true);
      for (let i = 0; i < 3; i++) c.put(Q.toiletSlippers(), -0.4 + i * 0.35, -c.hd + 1.0, Math.PI);
      c.bulb(0, 0, true);
    },
  },
  kodomo: {
    name: '子ども部屋', plate: '', floor: 'tatami', door: 'fusuma',
    build(c) {
      c.wall(Q.smallDesk(), 's', -0.4, 0.3, true);
      c.wall(Q.randoseru(), 's', -0.4, 0.35).position.y = 0.59;
      c.wall(P.futon(0xd88aa0), 'w', 0.2, 0.6);
      for (let i = 0; i < 6; i++) {
        const side = c.R.pick(['s', 'e', 'w']);
        c.wall(Q.drawing(c.R), side, c.R.range(-0.8, 0.8), 0.04).position.y = c.R.range(1.1, 1.7);
      }
      for (let i = 0; i < 5; i++) c.wall(Q.kokeshi(c.R.range(0.8, 1.3)), 'e', -0.6 + i * 0.3, 0.3);
      c.put(P.toys(c.R), 0.3, 0.3);
      c.put(P.temari(1.2), -0.5, 0.6);
      c.put(P.andon(), c.corners[0][0], c.corners[0][1]);
    },
  },
  oku: {
    name: '奥の間', plate: '奥の間', floor: 'tatami', door: 'fusuma',
    build(c) {
      c.wall(P.futon(0x8a1a1a), 's', -0.5, 1.1);
      for (let i = 0; i < 14; i++) c.put(P.temari(c.R.range(0.8, 1.4)), c.R.range(-c.hw + 0.4, c.hw - 0.4), c.R.range(-c.hd + 1.4, c.hd - 0.4));
      c.put(P.toys(c.R), 0.5, 0.5);
      c.wall(P.lowTable(0.8, 0.5, 0.25), 's', 0.55, 0.7, true);
      for (const [x, z] of c.corners) c.put(P.candle(), x, z);
      c.hang(P.chochin(true, true), -1.0, 0.6);
      c.hang(P.chochin(true, true), 1.1, -0.6);
      c.ofuda(30);
      c.spawn('zashiki', 's', 0, 1.1);
    },
  },
};

// ---------- 中部屋（12m × 6m） ----------
const Mrooms = {
  oobeya: {
    name: '大部屋（二年三組）', plate: '二年三組', floor: 'tatami', door: 'koshi', windows: true,
    build(c) {
      // 長い方向に布団を 2 列
      const alongX = c.hw >= c.hd;
      const long = alongX ? c.hw : c.hd;
      const short = alongX ? c.hd : c.hw;
      const n = Math.floor((long * 2 - 0.6) / 1.15);
      for (const s of [-1, 1])
        for (let i = 0; i < n; i++) {
          const a = -long + 0.9 + i * 1.15;
          const b = s * (short - 1.15);
          const f = P.futon(c.R.pick([0x4a6a8a, 0x6a4a6a, 0x4a6a5a]), c.R.range(-1, 1));
          if (alongX) c.put(f, a, b, s < 0 ? 0 : Math.PI);
          else c.put(f, b, a, s < 0 ? Math.PI / 2 : -Math.PI / 2);
          if (c.R.chance(0.3)) c.put(P.bag(c.R.pick(STUDENT)), alongX ? a : b + 0.4, alongX ? b + 0.4 * s : a, c.R.range(0, 6));
        }
      for (let i = 0; i < 6; i++) c.put(P.zabuton(0xf2efe6), c.R.range(-c.hw + 1, c.hw - 1), c.R.range(-0.3, 0.3), c.R.range(0, 6)).scale.set(0.8, 1.4, 0.6);
      c.lamp(alongX ? -c.hw / 2 : 0, alongX ? 0 : -c.hd / 2, false);
      c.lamp(alongX ? c.hw / 2 : 0, alongX ? 0 : c.hd / 2, true);
    },
  },
  genkan: {
    name: '玄関', plate: '玄関', floor: 'wood', door: 'shoji',
    build(c) {
      // 奥（外側）が土間とガラスの玄関戸
      P.box(c.hw * 2, 0.012, 1.8, P.mat(0x55524c, { roughness: 0.9 }), 0, 0, c.hd - 0.9, c.g);
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(4, c.hw * 2 - 1), 1.9), new THREE.MeshStandardMaterial({ color: 0x1a2a3a, emissive: 0x0a1a30, emissiveIntensity: 0.7, roughness: 0.1 }));
      c.wall(glass, 's', 0, 0.05).position.y = 0.95;
      c.lockedNote('s', '鍵がかかっている……外には出られない');
      c.wall(P.getabako(2.0), 'w', 0.2, 0.22, true);
      c.wall(P.welcomeBoard(), 'e', 0.5, 0.35);
      c.put(P.tanuki(), c.hw - 0.6, c.hd - 0.6, -2.4);
      c.put(P.umbrellaStand(c.R), -c.hw + 0.5, c.hd - 0.5);
      for (let i = 0; i < 8; i++) c.put(P.slippers(), -1.6 + i * 0.45, c.hd - 2.1, Math.PI);
      c.lamp(0, 0);
    },
  },
  yugijo: {
    name: '遊技場', plate: '遊技場', floor: 'wood', door: 'wood', windows: true,
    build(c) {
      c.put(P.pingPong(), 0, 0.2, c.hw >= c.hd ? 0 : Math.PI / 2, true);
      c.wall(P.vendingMachine(), 's', 0.6, 0.4, true);
      c.wall(P.arcade(), 's', -0.6, 0.4, true);
      c.wall(P.massageChair(), c.free.find((s) => s !== 's'), 0.4, 0.5, true);
      c.lamp(0, 0);
    },
  },
  baiten: {
    name: '売店', plate: '売店', floor: 'wood', door: 'wood', windows: true,
    build(c) {
      for (const side of ['s', 'w']) {
        const len = Math.min(2.6, (side === 's' ? c.hw : c.hd) * 2 - 1);
        c.wall(P.fillShelf(P.shelf(len, 1.6, 0.4, 4), c.R, len, 0.4, (R) => (R.chance(0.9) ? P.souvenirBox(R) : null)), side, 0, 0.22, true);
      }
      c.put(P.bokutoRack(c.R), c.corners[0][0], c.corners[0][1], 0.3, true);
      c.put(P.postcardRack(c.R), c.hw * 0.4, 0, 0);
      c.put(P.counter(1.4, 0.9, 0.6), -c.hw * 0.3, 0.3, 0, true);
      c.put(P.cashRegister(), -c.hw * 0.3, 0.3).position.y = 0.9;
      const freezer = new THREE.Group();
      P.box(1.0, 0.8, 0.6, P.mat(0xe8e8e0), 0, 0, 0, freezer);
      P.box(0.9, 0.02, 0.5, P.glow(0xd8f0ff, 0x88bbdd, 0.8), 0, 0.8, 0, freezer);
      P.lightMarker(freezer, 0, 1.0, 0, 0x99ccff, 1.0, 3);
      c.wall(freezer, 'e', 0, 0.35, true);
      c.lamp(0, 0);
    },
  },
  kissa: {
    name: '喫茶「ゆうなぎ」', plate: '喫茶', floor: 'wood', door: 'glass', windows: true,
    build(c) {
      c.wall(Q.barCounter(Math.min(3.6, c.hw * 2 - 1.5)), 's', 0, 0.5, true);
      for (let i = 0; i < 4; i++) c.wall(Q.stool(), 's', -0.45 + i * 0.3, 1.2);
      c.put(Q.cafeTable(), -c.hw * 0.45, -0.3, 0, true);
      c.put(Q.cafeTable(), c.hw * 0.45, -0.3, 0, true);
      c.put(Q.jukebox(), c.corners[0][0], c.corners[0][1], Math.atan2(-c.corners[0][0], -c.corners[0][1]), true);
      c.put(Q.plant(), c.corners[1][0], c.corners[1][1]);
      c.hang(P.chochin(), 0, 0);
    },
  },
  karaoke: {
    name: 'カラオケルーム', plate: 'カラオケ', floor: 'wood', door: 'wood',
    build(c) {
      c.wall(Q.karaokeTV(), 's', 0, 0.35, true);
      for (const t of [-0.35, 0.35]) c.wall(Q.micStand(), 's', t, 1.0);
      const sw = c.free.find((s) => s !== 's') || 'w';
      c.wall(Q.sofa(2.4, 0x6a1a3a), sw, 0, 0.5, true);
      c.put(Q.coffeeTable(1.2, 0.6), 0, 0.2, 0, true);
      for (let i = 0; i < 3; i++) c.put(P.bookLedger(), -0.3 + i * 0.3, 0.2, i).position.y = 0.43;
      const mb = Q.mirrorBall();
      c.put(mb, 0, 0.5).position.y = 2.6;
      P.lightMarker(c.g, -1, 2.2, 0, 0xff3a9a, 2.0, 5);
      P.lightMarker(c.g, 1, 2.2, 0.5, 0x3a6aff, 2.0, 5);
    },
  },
  hikae: {
    name: '従業員控室', plate: '従業員', floor: 'wood', door: 'wood',
    build(c) {
      c.wall(Q.locker(5), 's', -0.3, 0.27, true);
      c.put(Q.officeTable(), 0, -0.1, 0, true);
      for (const [x, z, r] of [[-0.5, -0.65, 0], [0.5, -0.65, 0], [-0.5, 0.45, Math.PI], [0.5, 0.45, Math.PI]]) c.put(Q.pipeChair(), x, z, r);
      c.put(P.teaSet(), 0.2, -0.1).position.y = 0.74;
      c.put(P.crtTv(), c.corners[0][0], c.corners[0][1], Math.atan2(-c.corners[0][0], -c.corners[0][1]), true);
      c.wall(Q.calendar(), c.free.find((s) => s !== 's') || 'w', 0.3, 0.04).position.y = 1.5;
      c.wall(Q.timeCard(), c.free.find((s) => s !== 's') || 'w', -0.5, 0.12).position.y = 1.2;
      c.bulb(0, 0, true);
    },
  },
  sentaku: {
    name: '洗濯室', plate: 'リネン室', floor: 'tile', door: 'wood',
    build(c) {
      for (let i = 0; i < 3; i++) c.wall(Q.washingMachine(i === 1), 's', -0.5 + i * 0.35, 0.32, true);
      const len = Math.min(2.2, c.hd * 2 - 1.2);
      c.wall(P.fillShelf(P.shelf(len, 1.8, 0.4, 4), c.R, len, 0.4, (R) => Q.towelStack(R)), 'w', 0, 0.22, true);
      c.put(Q.ironingBoard(), 0.3, 0.2, 0.2, true);
      for (let i = 0; i < 3; i++) c.put(P.basket(), c.R.range(-1, 1), c.R.range(0.5, 1.5), c.R.range(0, 6));
      c.bulb(0, 0, true);
    },
  },
  shokuryoko: {
    name: '食品庫', plate: '食品庫', floor: 'stone', door: 'wood',
    build(c) {
      for (const side of ['s', 'w']) {
        const len = Math.min(2.6, (side === 's' ? c.hw : c.hd) * 2 - 1);
        c.wall(P.fillShelf(P.shelf(len, 1.9, 0.45, 4, 0x5a4a3a), c.R, len, 0.45, (R) => (R.chance(0.5) ? Q.sack(R) : P.jar(R))), side, 0, 0.25, true);
      }
      c.put(Q.riceBags(7), c.corners[0][0], c.corners[0][1], 0.2, true);
      c.put(Q.sakeBarrel(), c.corners[1][0], c.corners[1][1], 0, true);
      c.put(Q.sakeBarrel(), c.corners[1][0] * 0.8, c.corners[1][1], 0.5, true);
      c.bulb(0, 0, true);
    },
  },
  shosai: {
    name: '書庫', plate: '書庫', floor: 'wood', door: 'wood',
    build(c) {
      const alongX = c.hw >= c.hd;
      const long = alongX ? c.hw : c.hd;
      for (let k = -1; k <= 1; k += 2) {
        const bs = Q.bookshelf(c.R, 2.0);
        const pos = k * long * 0.45;
        c.put(bs, alongX ? pos : 0.8, alongX ? 0.8 : pos, alongX ? Math.PI / 2 : 0, true);
      }
      c.wall(Q.bookshelf(c.R, 2.2), 's', 0, 0.2, true);
      c.put(Q.ladder(), c.corners[0][0] * 0.8, c.corners[0][1] * 0.8, 0.5);
      c.put(Q.officeTable(1.2, 0.7), 0, -0.6, 0, true);
      c.put(Q.deskLamp(), 0.3, -0.6).position.y = 0.74;
      c.put(Q.papers(c.R, 5, 0.3), 0, -0.6).position.y = 0.74;
      c.put(Q.papers(c.R, 12, 1.2), 0, 0.5);
    },
  },
  senmenjo: {
    name: '洗面所', plate: '洗面所', floor: 'tile', door: 'noren2',
    build(c) {
      const n = Math.min(5, Math.floor((c.hw * 2 - 0.8) / 0.9));
      c.wall(Q.sinkCounter(n), 's', 0, 0.3, true);
      for (let i = 0; i < n; i++) c.wall(P.box(0.6, 0.05, 0.05, P.glow(0xfff4e0, 0xffe8c0, 1.3)), 's', (-(n - 1) / 2 + i) * (0.9 / c.hw), 0.06).position.y = 1.65;
      P.lightMarker(c.g, 0, 1.5, c.hd - 0.6, 0xffe8c8, 2.0, 5);
      c.put(P.fan(), c.corners[0][0], c.corners[0][1], 0.5);
      for (let i = 0; i < 4; i++) c.put(Q.toiletSlippers(), -0.6 + i * 0.4, -c.hd + 1.0, Math.PI);
    },
  },
  boiler: {
    name: 'ボイラー室', plate: '機械室', floor: 'stone', door: 'wood',
    build(c) {
      c.put(Q.boilerTank(), c.hw >= c.hd ? c.hw * 0.4 : 0, c.hw >= c.hd ? 0.4 : c.hd * 0.4, 0, true);
      c.wall(Q.pipes(Math.min(5, c.hw * 2 - 0.5)), 's', 0, 0.15);
      for (let i = 0; i < 3; i++) c.put(P.crate(0.6, 0.5, 0.5, 0x4a4a42), c.corners[0][0] + i * 0.2, c.corners[0][1], i * 0.2, true);
      c.bulb(-c.hw * 0.4, 0, true);
    },
  },
  kura: {
    name: '蔵', plate: '蔵', floor: 'wood', door: 'wood',
    build(c) {
      c.wall(Q.nagamochi(), 's', -0.4, 0.4, true);
      c.wall(Q.nagamochi(), 's', 0.4, 0.4, true);
      c.wall(Q.armorBox(), 'w', 0.3, 0.4, true);
      const len = Math.min(2.4, c.hd * 2 - 1.2);
      c.wall(P.fillShelf(P.shelf(len, 2.0, 0.45, 4, 0x3a2a1a), c.R, len, 0.45, (R) => (R.chance(0.6) ? P.jar(R) : P.crate(0.3, 0.2, 0.3))), 'e', 0, 0.25, true);
      c.put(Q.ladder(), c.corners[2][0] * 0.8, c.corners[2][1] * 0.8, 0.8);
      c.put(P.sheetCovered(0.7, 1.3, 0.6), 0.5, 0.2, 0, true);
      c.bulb(0, 0, true);
    },
  },
};

// ---------- 大部屋（12m 四方） ----------
const Lrooms = {
  enkaijo: {
    name: '大広間', plate: '大広間', floor: 'tatami', door: 'fusuma', windows: true,
    build(c) {
      for (const z of [-2.6, 0, 2.6].map((v) => v * (c.hd / 5.94))) {
        c.put(P.lowTable(8.0, 0.6, 0.3), 0, z, 0, true);
        for (let i = 0; i < 9; i++) {
          const x = -3.6 + i * 0.9;
          c.put(P.ozen(), x, z, 0).position.y = 0.3;
          for (const s of [-1, 1]) c.put(P.zabuton(0x5a1a1a), x, z + s * 0.62, s < 0 ? 0 : Math.PI);
        }
      }
      c.wall(P.stage(4.0, 1.2), 's', 0, 0.6, true);
      for (const [x, z] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) c.hang(P.chochin(c.R.chance(0.7)), x, z);
    },
  },
  bath: {
    name: '大浴場', plate: '大浴場', floor: 'none', door: 'noren',
    build(c) {
      buildBath(c.g, c.R, c);
    },
  },
  lobby: {
    name: 'ロビー', plate: 'ロビー', floor: 'wood', door: 'glass', windows: true,
    build(c) {
      c.put(Q.rug(4.5, 3.2, 0x5a1a1a), -1.8, -1.0);
      c.put(Q.sofa(2.2), -1.8, -2.3, 0, true);
      c.put(Q.sofa(2.2), -1.8, 0.3, Math.PI, true);
      c.put(Q.armchair(), -3.8, -1.0, Math.PI / 2, true);
      c.put(Q.coffeeTable(1.4, 0.7), -1.8, -1.0, 0, true);
      c.put(Q.irori(1.6), 2.6, 2.4, 0, true);
      for (const [x, z, r] of [[2.6, 1.4, 0], [2.6, 3.4, Math.PI], [1.6, 2.4, Math.PI / 2], [3.6, 2.4, -Math.PI / 2]]) c.put(P.zabuton(0x3a2a1a), x, z, r);
      c.wall(Q.grandfatherClock(), 's', -0.6, 0.2, true);
      c.wall(Q.fishTank(), 'e', -0.3, 0.3, true);
      for (const [x, z] of c.corners) c.put(Q.plant(1.4), x * 0.95, z * 0.95);
      c.wall(Q.bookshelf(c.R, 1.6, 1.4), 'w', 0.4, 0.2, true);
      for (const [x, z] of [[-2.5, -1], [2.5, -2], [2.5, 2.5], [-2.5, 3]]) c.lamp(x, z, c.R.chance(0.75));
    },
  },
  chubo: {
    name: '厨房', plate: '厨房', floor: 'stone', door: 'wood',
    build(c) {
      c.wall(P.counter(5.0, 0.9, 0.6, 0x8a8a88, 0x9a9a98), 's', -0.3, 0.32, true);
      c.wall(P.stove(), 's', 0.55, 0.32, true);
      c.wall(P.stove(), 's', 0.75, 0.32, true);
      c.wall(P.fridge(), 'w', -0.6, 0.38, true);
      c.wall(P.fridge(), 'w', -0.4, 0.38, true);
      c.wall(P.fillShelf(P.shelf(3.0, 1.8, 0.4, 4, 0x5a5a58), c.R, 3.0, 0.4, (R) => (R.chance(0.85) ? P.plates(R) : null)), 'e', 0, 0.22, true);
      c.put(P.counter(3.0, 0.9, 1.2, 0x8a8a88, 0x9a9a98), 0, 0.5, 0, true);
      for (const x of [-0.8, 0.6]) c.put(P.riceCooker(), x, 0.5).position.y = 0.9;
      for (let i = 0; i < 5; i++) {
        const pot = P.cyl(0.14, 0.12, 0.18, P.mat(0x8a8a8a, { metalness: 0.8, roughness: 0.3 }), 0, 0, 0, null, 14);
        c.put(pot, -1.0 + i * 0.5, 0.5).position.y = 1.7;
      }
      for (const [x, z] of [[-2.5, -2], [2.5, -2], [0, 2.5]]) c.lamp(x, z, true, 0xd8e0c8);
    },
  },
  tokubetsu: {
    name: '特別室「松の間」', plate: '松の間', floor: 'tatami', door: 'koshi', windows: true,
    build(c) {
      c.wall(P.tokonoma(), 's', -0.5, 0.4, true);
      c.wall(P.byobu(2.6, 1.5), 's', 0.4, 0.3);
      c.put(P.lowTable(2.0, 1.0), -1.5, 0.8, 0, true);
      for (const x of [-2.0, -1.0]) for (const z of [0.1, 1.5]) c.put(P.zabuton(0x2a3a2a), x, z, z < 0.8 ? 0 : Math.PI);
      c.wall(P.chairSet(), 'e', -0.6, 0.8, true);
      c.put(Q.kotatsu(), 2.6, 2.2, 0, true);
      // 部屋付きのひのき風呂
      const tub = new THREE.Group();
      P.box(1.7, 0.55, 1.3, P.mat(0xc8a878, { roughness: 0.5 }), 0, 0, 0, tub);
      P.box(1.5, 0.02, 1.1, P.mat(0x5e8e92, { transparent: true, opacity: 0.85, roughness: 0.05 }), 0, 0.5, 0, tub);
      c.put(tub, -c.hw + 1.1, -c.hd + 1.0, 0, true);
      for (let i = 0; i < 2; i++) c.put(P.futon(0x7a2a2a), 1.4 + i * 1.15, -2.0, 0);
      c.lamp(-1.5, 0.8);
      c.lamp(2.0, -1.5, false);
    },
  },
};

// ---------- 庭（屋根なし） ----------
const Gardens = {
  teien: {
    name: '池の庭', plate: '', floor: 'gravel', door: 'glass', outdoor: true,
    build(c) {
      c.put(P.pond(6.5, 3.6), 0, 0.6);
      c.put(Q.bridge(3.6), 0, 0.6, Math.PI / 2);
      for (const [x, z] of [[-4, -3.6], [4.2, 3.8]]) c.put(P.stoneLantern(), x, z, 0, true);
      for (const [x, z] of [[-4.2, 3.6], [4.2, -3.4], [-1, 4.4]]) c.put(P.pine(c.R), x, z, c.R.range(0, 6), true);
      for (let i = 0; i < 8; i++) c.put(Q.moss(c.R), c.R.range(-5, 5), c.R.range(-4, 5));
      for (let i = 0; i < 5; i++) c.put(Q.rock(c.R, 0.6), c.R.range(-5, 5), c.R.pick([-3.5, 4.6]));
      for (let i = 1; i < 5; i++) c.put(P.steppingStone(), 0, -c.hd + i * 0.9);
      c.moon();
    },
  },
  sekitei: {
    name: '石庭', plate: '', floor: 'gravel', door: 'glass', outdoor: true,
    build(c) {
      c.g.add(Q.rakedGravel(c.hw * 2, c.hd * 2));
      for (const [x, z, n] of [[-3, -1.5, 3], [2.5, 1.5, 2], [-1, 3.5, 2], [3.5, -3, 1]]) {
        c.put(Q.moss(c.R, 1.1), x, z);
        for (let i = 0; i < n; i++) c.put(Q.rock(c.R, c.R.range(0.7, 1.5)), x + c.R.range(-0.6, 0.6), z + c.R.range(-0.5, 0.5), 0, true);
      }
      c.put(P.stoneLantern(), -c.hw + 0.8, c.hd - 0.8, 0, true);
      c.moon();
    },
  },
  takebayashi: {
    name: '竹林', plate: '', floor: 'gravel', door: 'glass', outdoor: true,
    build(c) {
      for (let i = 0; i < 90; i++) {
        const x = c.R.range(-c.hw + 0.3, c.hw - 0.3), z = c.R.range(-c.hd + 0.3, c.hd - 0.3);
        if (Math.abs(x - Math.sin(z * 0.5) * 1.2) < 0.9) continue; // 小道
        c.put(Q.bamboo(c.R, c.R.range(4, 7)), x, z, 0, true);
      }
      for (let z = -c.hd + 0.6; z < c.hd; z += 0.9) c.put(P.steppingStone(), Math.sin(z * 0.5) * 1.2, z, c.R.range(0, 6));
      c.put(P.stoneLantern(), Math.sin(0) * 1.2 + 1.2, 0, 0, true);
      c.moon(0.5);
    },
  },
  rotenburo: {
    name: '露天風呂', plate: '露天風呂', floor: 'stone', door: 'glass', outdoor: true,
    build(c) {
      c.put(Q.hotPool(6.0, 3.6), 0, 1.6);
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2;
        c.put(Q.rock(c.R, 0.7), Math.cos(a) * 3.2, 1.6 + Math.sin(a) * 2.0, 0, true);
      }
      c.wall(Q.fence(c.hw * 2 - 0.2), 's', 0, 0.1);
      const deck = new THREE.Group();
      P.box(4, 0.1, 2, P.mat(0x6a4a2a), 0, 0, 0, deck);
      c.put(deck, 0, -c.hd + 1.3);
      c.put(P.stoneLantern(), c.hw - 0.8, 0, 0, true);
      c.put(Q.bench(), -c.hw + 1.0, -1.5, Math.PI / 2, true);
      c.steam(0, 1.6, 6, 3.6);
      c.moon();
    },
  },
  bochi: {
    name: '裏の墓地', plate: '', floor: 'gravel', door: 'glass', outdoor: true,
    build(c) {
      for (let i = 0; i < 4; i++)
        for (let k = 0; k < 4; k++) {
          if (c.R.chance(0.15)) continue;
          c.put(Q.gravestone(c.R), -3.6 + i * 2.4, -1.6 + k * 1.8, Math.PI + c.R.range(-0.1, 0.1), true);
          if (c.R.chance(0.4)) c.put(Q.sotoba(c.R), -3.6 + i * 2.4, -1.6 + k * 1.8 + 0.4, Math.PI);
        }
      for (let i = 0; i < 3; i++) c.put(Q.jizo(c.R), -2 + i * 0.6, -c.hd + 1.2, Math.PI);
      c.put(Q.deadTree(), c.hw - 1.2, c.hd - 1.2, 0, true);
      for (let i = 0; i < 3; i++) c.put(P.candle(), c.R.range(-3, 3), c.R.range(-1, 4));
      c.moon(0.6);
    },
  },
  ido: {
    name: '井戸の庭', plate: '', floor: 'gravel', door: 'glass', outdoor: true,
    build(c) {
      c.put(P.well(), 0, 0.8, 0.4, true);
      c.wall(Q.hokora(), 's', -0.5, 0.6, true);
      const tree = Q.deadTree();
      c.put(tree, c.hw - 1.5, c.hd - 1.5, 0, true);
      const sn = Q.shimenawa(1.0);
      c.put(sn, c.hw - 1.5, c.hd - 1.5 + 0.3).position.y = 1.4;
      for (let i = 0; i < 6; i++) c.put(Q.rock(c.R, 0.5), c.R.range(-4.5, 4.5), c.R.range(-3, 4.5));
      for (let i = 0; i < 6; i++) c.put(Q.moss(c.R), c.R.range(-4.5, 4.5), c.R.range(-4, 4.5));
      c.moon(0.7);
    },
  },
};

export const ROOM_TYPES = {};
for (const [k, v] of Object.entries(S)) ROOM_TYPES[k] = { ...v, size: 'S' };
for (const [k, v] of Object.entries(Mrooms)) ROOM_TYPES[k] = { ...v, size: 'M' };
for (const [k, v] of Object.entries(Lrooms)) ROOM_TYPES[k] = { ...v, size: 'L' };
for (const [k, v] of Object.entries(Gardens)) ROOM_TYPES[k] = { ...v, size: 'L' };

export const NEED = { L: 0, M: 0, S: 0 };
for (const v of Object.values(ROOM_TYPES)) NEED[v.size]++;

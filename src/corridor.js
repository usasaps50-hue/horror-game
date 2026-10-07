// ループする廊下の 1 区間（まっすぐな廊下 L + 右に曲がる角）
//
// ローカル座標：廊下は z = 0 から -L へ北に伸び、z ∈ [-L-W, -L] が角。
// 角の東側（x = +W/2）から次の区間へ出る。次の区間は右に 90 度回った位置にある。
// 左（西）の部屋は外側、右（東）の部屋はループの内側に並ぶ。
import * as THREE from 'three';
import { M } from './textures.js';
import { mbox } from './geo.js';
import {
  W, H, KAMOI, BAY, WT, wallRun, shojiPanel, fusumaPanel, koshiDoor, plainWall, ceiling, tatamiFloor, ceilingLamp,
} from './architecture.js';
import { buildBath } from './bath.js';
import { ROOM_TYPES } from './rooms.js';
import * as P from './props.js';

export const NB = 18; // 柱間の数
export const L = NB * BAY; // 28.8m

// 区間 → 次の区間 への変換（次の区間の原点は角の出口、向きは右に 90 度）
export const NEXT = new THREE.Matrix4()
  .makeRotationY(-Math.PI / 2)
  .setPosition(W / 2, 0, -L - W / 2);
export const PREV = NEXT.clone().invert();

// 部屋を置ける場所（5 柱間 = 8m、入口は真ん中の柱間）
const SLOTS = {
  L1: { side: -1, start: 1 },
  L2: { side: -1, start: 6 },
  L3: { side: -1, start: 11 },
  R2: { side: 1, start: 6 },
  R3: { side: 1, start: 11 },
};

const bayZ = (i) => -(i * BAY + BAY / 2);

function plateTexture(text) {
  const c = document.createElement('canvas');
  c.width = 96;
  c.height = 320;
  const g = c.getContext('2d');
  g.fillStyle = '#c9ab7a';
  g.fillRect(0, 0, 96, 320);
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(90,60,30,${Math.random() * 0.25})`;
    g.fillRect(0, Math.random() * 320, 96, 1 + Math.random() * 2);
  }
  g.strokeStyle = '#3a2412';
  g.lineWidth = 6;
  g.strokeRect(3, 3, 90, 314);
  g.fillStyle = '#1a1008';
  g.font = 'bold 50px "Hiragino Mincho ProN", "Yu Mincho", serif';
  g.textAlign = 'center';
  g.textBaseline = 'top';
  const chars = [...text].slice(0, 5);
  const size = Math.min(56, 290 / chars.length);
  g.font = `bold ${size}px "Hiragino Mincho ProN", "Yu Mincho", serif`;
  chars.forEach((ch, i) => g.fillText(ch, 48, 14 + i * size));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function roomPlate(text) {
  const g = new THREE.Group();
  P.box(0.16, 0.5, 0.025, new THREE.MeshStandardMaterial({ map: plateTexture(text), roughness: 0.7 }), 0, 0, 0, g);
  return g;
}

function exitSign() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = '#0e8a3e';
  g.fillRect(0, 0, 256, 96);
  g.fillStyle = '#f2fff4';
  g.font = 'bold 42px sans-serif';
  g.textAlign = 'center';
  g.fillText('非常口', 160, 62);
  g.beginPath();
  g.arc(48, 30, 10, 0, Math.PI * 2);
  g.fill();
  g.fillRect(40, 42, 14, 30);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const grp = new THREE.Group();
  P.box(0.6, 0.24, 0.06, new THREE.MeshStandardMaterial({ color: 0xffffff, map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 1.3 }), 0, 0, 0, grp);
  P.lightMarker(grp, 0, 0, 0.3, 0x30ff70, 0.8, 3);
  return grp;
}

function fireExtinguisher() {
  const g = new THREE.Group();
  P.box(0.32, 0.6, 0.2, P.mat(0xb01818, { roughness: 0.4 }), 0, 0.1, 0, g);
  P.cyl(0.08, 0.08, 0.5, P.mat(0xd02020, { roughness: 0.3 }), 0, 0.15, 0.17, g);
  P.box(0.3, 0.08, 0.01, P.glow(0xff3030, 0xff2020, 1.2), 0, 1.6, 0, g);
  return g;
}

function pinkPhone() {
  const g = new THREE.Group();
  P.box(0.45, 0.8, 0.38, P.mat(0x4a2a1a, { roughness: 0.5 }), 0, 0, 0, g);
  P.box(0.28, 0.22, 0.24, P.mat(0xe88aa0, { roughness: 0.35 }), 0, 0.8, 0, g);
  P.box(0.24, 0.05, 0.07, P.mat(0xe88aa0, { roughness: 0.35 }), 0, 1.02, 0.05, g);
  return g;
}

function hangingScroll(text) {
  const g = new THREE.Group();
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 420;
  const x = c.getContext('2d');
  x.fillStyle = '#3a4434';
  x.fillRect(0, 0, 128, 420);
  x.fillStyle = '#dccfae';
  x.fillRect(14, 60, 100, 300);
  x.fillStyle = '#121010';
  x.font = 'bold 50px "Hiragino Mincho ProN", serif';
  x.textAlign = 'center';
  [...text].forEach((ch, i) => x.fillText(ch, 64, 120 + i * 58));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const p = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 1.38), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }));
  p.position.y = 1.4;
  g.add(p);
  return g;
}

// ---------- 部屋のなかみ用の ctx（rooms.js から使う） ----------
function makeRoomCtx(g, R, seg) {
  const HALF = 3.94;
  const doors = { n: true, s: false, e: false, w: false };
  const free = R.shuffle(['w', 'e', 's']);
  const corners = R.shuffle([[-3.1, -3.1], [3.1, -3.1], [3.1, 3.1], [-3.1, 3.1]]);
  const alongWall = (side, t, depth) => {
    const a = t * HALF;
    switch (side) {
      case 'n': return [a, -HALF + depth, 0];
      case 's': return [-a, HALF - depth, Math.PI];
      case 'w': return [-HALF + depth, -a, Math.PI / 2];
      default: return [HALF - depth, a, -Math.PI / 2];
    }
  };
  const ctx = {
    R, doors, free, corners, back: 's',
    put(obj, x, z, ry = 0, solid = false) {
      obj.position.x = x;
      obj.position.z = z;
      obj.rotation.y = ry;
      g.add(obj);
      if (solid) obj.userData.solid = true;
      return obj;
    },
    wall(obj, side, t, depth, solid = false) {
      const [x, z, ry] = alongWall(side, t, depth);
      return ctx.put(obj, x, z, ry, solid);
    },
    hang(obj, x, z) {
      return ctx.put(obj, x, z).translateY(H - 0.5);
    },
    lamp(x, z, color, intensity) {
      const o = new THREE.Group();
      P.cyl(0.35, 0.35, 0.06, P.glow(0xffffff, color, 1.0), 0, 0, 0, o);
      P.lightMarker(o, 0, -0.3, 0, color, intensity * 2, 7);
      ctx.put(o, x, z).position.y = H - 0.07;
    },
    window() {},
    moon() {
      P.lightMarker(g, 0, H + 1.5, 0, 0x7088b0, 6, 12);
    },
    ofudaEverywhere(n) {
      for (let i = 0; i < n; i++) {
        const side = R.pick(['n', 's', 'e', 'w']);
        let t = R.range(-0.9, 0.9);
        if (side === 'n' && Math.abs(t * HALF) < 1.0) t = Math.sign(t || 1) * R.range(0.3, 0.9);
        const o = P.ofuda();
        ctx.wall(o, side, t, 0.075).position.y = R.range(0.6, 2.3);
        o.rotation.z = R.range(-0.2, 0.2);
      }
    },
    spawnPoint(name, side, t, depth) {
      const [x, z, ry] = alongWall(side, t, depth);
      const o = new THREE.Object3D();
      o.position.set(x, 0, z);
      o.rotation.y = ry;
      g.add(o);
      seg.spawnMarkers.push({ name, obj: o });
    },
  };
  return ctx;
}

function buildRoomShell(g, def) {
  if (def.floor === 'tatami') tatamiFloor(8, 8, 0, 0, g);
  else {
    const fm = { wood: M.woodFloor, tile: M.stoneFloor, stone: M.stoneFloor, gravel: M.gravel }[def.floor] || M.woodFloor;
    mbox(8, 0.05, 8, fm, 0, -0.05, 0, g);
  }
  if (!def.noCeiling) ceiling(8, 8, 0, 0, g);
  const lower = def.floor === 'tatami' ? M.plaster : def.floor === 'tile' ? M.mosaic : M.plaster;
  const place = (w, x, z, ry) => {
    w.position.set(x, 0, z);
    w.rotation.y = ry;
    g.add(w);
  };
  place(plainWall(8, lower), -4, 3.97, 0);
  place(plainWall(8, lower), -3.97, 4, Math.PI / 2);
  place(plainWall(8, lower), 3.97, 4, Math.PI / 2);
}

// ---------- 区間の組み立て ----------
// plan: { rooms: {L1, R2, R3}, anomalies: [...], goal: bool, lap }
export function buildSegment(plan, R, assets) {
  const root = new THREE.Group();
  const seg = { root, doors: [], interactables: [], updaters: [], spawnMarkers: [], plan };
  const has = (a) => plan.anomalies.includes(a);

  // ---------- 床・天井 ----------
  mbox(W + WT, 0.05, L + W, M.woodFloor, 0, -0.05, -(L + W) / 2, root);
  ceiling(W + WT, L + W, 0, -(L + W) / 2, root);

  // ---------- 左右の壁 ----------
  const slotOf = (side, i) =>
    Object.entries(SLOTS).find(([, s]) => s.side === side && i >= s.start && i < s.start + 5)?.[0];
  const roomAt = (slot) => (slot ? plan.rooms[slot] : null);

  function bayFor(side, i) {
    const slot = slotOf(side, i);
    const type = roomAt(slot);
    const isDoorBay = slot && i === SLOTS[slot].start + 2;
    if (type === 'bath') {
      if (slot === 'L2' && isDoorBay) return { len: BAY, type: 'noren' };
      return { len: BAY, type: 'wall' };
    }
    if (type && isDoorBay) {
      const def = ROOM_TYPES[type];
      const locked = has('locked') && !(plan.lap === 1 && slot === 'L1') ? '開かない……' : null;
      const open = (plan.lap === 1 && slot === 'L1') || has('doorsOpen');
      return {
        len: BAY, type: 'door', open: open && !locked, locked,
        makePanel: (w) => (def.floor === 'tatami' ? koshiDoor(w, KAMOI - 0.04, true) : fusumaPanel(w, KAMOI - 0.04)),
        slide: -1,
      };
    }
    // 部屋の入口の両どなりは、部屋の明かりが透ける障子窓
    if (type && slot && (i === SLOTS[slot].start + 1 || i === SLOTS[slot].start + 3)) {
      const lit = !has('lampsOff') || R.chance(0.5);
      return { len: BAY, type: 'shoji', paper: lit ? M.washiWarm : M.washiDark };
    }
    if (type) return { len: BAY, type: 'wall' };
    // 部屋のないところ：左は月明かりの障子、右は土壁
    if (side === -1) return { len: BAY, type: 'shoji', paper: M.washiCool };
    return { len: BAY, type: 'wall' };
  }

  const leftBays = [], rightBays = [];
  for (let i = 0; i < NB; i++) leftBays.push(bayFor(-1, i));
  for (let i = 0; i < NB; i++) rightBays.push(bayFor(1, i));
  leftBays.push({ len: W, type: 'shoji', paper: M.washiCool }); // 角の西側
  const wallCtx = seg;

  // 左の壁：u = 0..L+W が z = 0..-(L+W)。+z 側（ローカル）が廊下 = 世界の +x
  const left = wallRun(leftBays, wallCtx);
  left.position.set(-W / 2, 0, 0);
  left.rotation.y = Math.PI / 2;
  root.add(left);
  // 右の壁は奥から手前へ（u = 0 が z = -L）
  const right = wallRun(rightBays.slice().reverse().map((b) => ({ ...b, slide: b.slide ? -b.slide : undefined })), wallCtx);
  right.position.set(W / 2, 0, -L);
  right.rotation.y = -Math.PI / 2;
  root.add(right);

  // 角の北側の壁
  const goalDoor = plan.goal;
  const north = wallRun(
    goalDoor
      ? [
          { len: (W - BAY) / 2 + WT / 2, type: 'wall', noPost: true },
          { len: BAY, type: 'door', makePanel: (w) => fusumaPanel(w, KAMOI - 0.04), slide: 1 },
          { len: (W - BAY) / 2 + WT / 2, type: 'wall' },
        ]
      : [{ len: W + WT, type: 'wall' }],
    wallCtx,
  );
  north.position.set(-W / 2 - WT / 2, 0, -L - W);
  root.add(north);
  if (goalDoor) {
    // 角を曲がれないようにふさぐ
    const east = wallRun([{ len: W, type: 'wall' }], wallCtx);
    east.position.set(W / 2, 0, -L - W);
    east.rotation.y = -Math.PI / 2;
    root.add(east);
  }

  // ---------- 天井灯 ----------
  const lampBays = [1, 4, 7, 10, 13, 16];
  const offCount = has('lampsOff') ? Math.min(5, plan.lap - 1) : 0;
  const offSet = new Set(R.shuffle(lampBays).slice(0, offCount));
  for (const i of lampBays) {
    const l = ceilingLamp(!offSet.has(i), has('redLamps'));
    l.position.set(0, H - 0.02, bayZ(i));
    root.add(l);
  }
  const cl = ceilingLamp(true, has('redLamps'));
  cl.position.set(0, H - 0.02, -L - W / 2);
  root.add(cl);

  // ---------- 廊下の小物（毎周おなじ） ----------
  const sign = exitSign();
  sign.position.set(W / 2 - 0.35, H - 0.25, -L - W / 2);
  sign.rotation.y = -Math.PI / 2;
  root.add(sign);
  const fe = fireExtinguisher();
  fe.position.set(W / 2 - 0.12, 0, bayZ(2));
  fe.rotation.y = -Math.PI / 2;
  root.add(fe);
  const ph = pinkPhone();
  ph.position.set(W / 2 - 0.27, 0, bayZ(4));
  ph.rotation.y = -Math.PI / 2;
  ph.userData.solid = true;
  root.add(ph);
  // 角の床の間
  const niche = new THREE.Group();
  P.box(1.4, 0.12, 0.45, M.darkWood, 0, 0, 0, niche);
  const sc = hangingScroll(goalDoor ? '' : '一期一会');
  sc.position.z = -0.2;
  if (!goalDoor) niche.add(sc);
  const vase = P.cyl(0.07, 0.11, 0.35, P.mat(0x2a3440, { roughness: 0.3 }), -0.35, 0.12, 0, niche);
  for (let i = 0; i < 5; i++) {
    const st = P.box(0.012, 0.45 + i * 0.07, 0.012, P.mat(0x2a3a1a), -0.35 + (i - 2) * 0.04, 0.45, 0, niche);
    st.rotation.z = (i - 2) * 0.22;
  }
  niche.position.set(goalDoor ? -0.75 : 0, 0, -L - W + 0.3);
  if (!goalDoor) {
    niche.userData.solid = true;
    root.add(niche);
  }

  // 部屋の札
  for (const [slot, s] of Object.entries(SLOTS)) {
    const type = plan.rooms[slot];
    if (!type) continue;
    const def = type === 'bath' ? { plate: '大浴場' } : ROOM_TYPES[type];
    if (type === 'bath' && slot !== 'L2') continue;
    const text = has('plates') ? '奥の間' : def.plate || def.name;
    const p = roomPlate(text);
    const z = bayZ(s.start + 2) + BAY / 2 + 0.25;
    p.position.set(s.side * (W / 2 - 0.08), 1.25, z);
    p.rotation.y = s.side < 0 ? Math.PI / 2 : -Math.PI / 2;
    root.add(p);
  }

  // ---------- 部屋 ----------
  const roomCenter = (slot) => {
    const s = SLOTS[slot];
    return new THREE.Vector3(s.side * (W / 2 + WT / 2 + 4), 0, bayZ(s.start + 2));
  };
  for (const [slot, type] of Object.entries(plan.rooms)) {
    if (!type) continue;
    if (type === 'bath') {
      if (slot !== 'L2') continue;
      const g = new THREE.Group();
      const c2 = roomCenter('L2'), c3 = roomCenter('L3');
      g.position.copy(c2).add(c3).multiplyScalar(0.5);
      g.rotation.y = -Math.PI / 2;
      root.add(g);
      buildBath(g, R, seg);
      continue;
    }
    const def = ROOM_TYPES[type];
    const g = new THREE.Group();
    g.position.copy(roomCenter(slot));
    g.rotation.y = SLOTS[slot].side < 0 ? -Math.PI / 2 : Math.PI / 2;
    root.add(g);
    buildRoomShell(g, def);
    def.build(makeRoomCtx(g, R, seg));
  }
  if (goalDoor) {
    const g = new THREE.Group();
    g.position.set(0, 0, -L - W - WT / 2 - 4);
    g.rotation.y = Math.PI;
    root.add(g);
    buildRoomShell(g, ROOM_TYPES.oku);
    ROOM_TYPES.oku.build(makeRoomCtx(g, R, seg));
  }

  // ---------- 周回ごとの異変 ----------
  addAnomalies(seg, R, assets);
  return seg;
}

function addAnomalies(seg, R, assets) {
  const { root, plan } = seg;
  const has = (a) => plan.anomalies.includes(a);

  if (has('temari')) {
    const t = P.temari(1.3);
    t.position.set(R.range(-0.6, 0.6), 0, -R.range(6, 22));
    root.add(t);
  }
  if (has('dolls')) {
    for (let i = 0; i < 9; i++) {
      const d = P.doll(R, 1.7);
      d.position.set(W / 2 - 0.2, 0, -3 - i * 0.55);
      d.rotation.y = -Math.PI / 2;
      root.add(d);
    }
  }
  if (has('ofuda')) {
    for (let i = 0; i < 6 + plan.lap * 3; i++) {
      const o = P.ofuda();
      const side = R.chance(0.5) ? -1 : 1;
      o.position.set(side * (W / 2 - 0.08), R.range(0.5, 2.3), -R.range(1, L - 1));
      o.rotation.set(0, side < 0 ? Math.PI / 2 : -Math.PI / 2, R.range(-0.25, 0.25));
      root.add(o);
    }
  }
  if (has('slippers')) {
    for (let i = 0; i < 7; i++) {
      const s = P.slippers(0x8a2a2a);
      s.position.set(R.range(-0.5, 0.5), 0.003, -2 - i * 3.6);
      s.rotation.y = Math.PI + R.range(-0.1, 0.1);
      root.add(s);
    }
  }
  if (has('futon')) {
    const f = P.futon(0x8a1a1a);
    f.position.set(0, 0, -R.range(10, 18));
    f.rotation.y = R.range(-0.2, 0.2);
    root.add(f);
  }
  if (has('footprints')) {
    const m = new THREE.MeshStandardMaterial({ color: 0x0a0806, roughness: 0.1, transparent: true, opacity: 0.6 });
    for (let i = 0; i < 40; i++) {
      const p = new THREE.Mesh(new THREE.CircleGeometry(0.05, 10), m);
      p.scale.set(0.8, 1.4, 1);
      p.rotation.x = -Math.PI / 2;
      p.position.set((i % 2 ? 0.08 : -0.08) + Math.sin(i * 0.3) * 0.2, 0.004, -1 - i * 0.7);
      root.add(p);
    }
  }
  if (has('shadow')) {
    // 障子の向こうに子どもの影
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,0.85)';
    g.beginPath();
    g.ellipse(64, 60, 30, 34, 0, 0, Math.PI * 2);
    g.fill();
    g.fillRect(34, 40, 60, 40);
    g.beginPath();
    g.moveTo(30, 256);
    g.lineTo(44, 100);
    g.lineTo(84, 100);
    g.lineTo(98, 256);
    g.fill();
    const t = new THREE.CanvasTexture(c);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 1.1), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
    sh.position.set(-W / 2 - 0.03, 0.62, bayZ(R.pick([0, 16, 17])));
    sh.rotation.y = Math.PI / 2;
    root.add(sh);
  }
  if (has('zashikiFar') && assets.zashiki) {
    const z = assets.zashiki();
    z.position.set(0.2, 0, -L - W / 2);
    z.rotation.y = Math.PI * 0.95;
    z.userData.dynamic = true;
    root.add(z);
    seg.updaters.push({
      userData: {
        update(dt, time, near, playerLocal) {
          if (z.visible && playerLocal && playerLocal.z < -L + 9) z.visible = false;
        },
      },
    });
  }
}

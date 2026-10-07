// 間取り（layout.js）から旅館全体を組み立てる
import * as THREE from 'three';
import { M } from './textures.js';
import { mbox, mergeStatic } from './geo.js';
import {
  H, KAMOI, WT, wallRun, plainWall, ceiling, tatamiFloor, ceilingLamp, koshiDoor, fusumaPanel, glassDoor, shojiPanel,
} from './architecture.js';
import { generateLayout, U, P } from './layout.js';
import { ROOM_TYPES, NEED } from './rooms.js';
import * as Pr from './props.js';
import * as Q from './props2.js';

const X = (i) => i * P;
const Z = (j) => j * P;

// 壁を A→B に置く。N は廊下側（見る側）の向き
function placeWall(parent, bays, A, B, N, world) {
  let a = A.clone(), b = B.clone();
  let d = b.clone().sub(a).normalize();
  if (-d.z * N.x + d.x * N.z < 0) {
    [a, b] = [b, a];
    d = b.clone().sub(a).normalize();
    bays = bays.slice().reverse().map((x) => ({ ...x, slide: x.slide ? -x.slide : undefined }));
  }
  const g = wallRun(bays, world);
  g.position.copy(a);
  g.rotation.y = Math.atan2(-d.z, d.x);
  parent.add(g);
  return g;
}

function splitBays(len, kinds) {
  const n = Math.max(1, Math.round(len / 2.4));
  return Array.from({ length: n }, (_, i) => ({ len: len / n, ...kinds(i, n) }));
}

const DOOR_PANELS = {
  koshi: (w) => koshiDoor(w, KAMOI - 0.04, true),
  fusuma: (w) => fusumaPanel(w, KAMOI - 0.04),
  shoji: (w) => shojiPanel(w, KAMOI - 0.04, M.washiWarm),
  glass: (w) => glassDoor(w, KAMOI - 0.04),
  wood: (w) => {
    const g = new THREE.Group();
    Pr.box(w, KAMOI - 0.04, 0.04, M.woodPanel, 0, 0, 0, g);
    Pr.box(0.03, 0.15, 0.06, M.darkWood, w / 2 - 0.12, 0.85, 0, g);
    return g;
  },
};

export function buildRyokan(R) {
  const layout = generateLayout(R, NEED);
  const world = {
    root: new THREE.Group(),
    layout,
    doors: [],
    interactables: [],
    updaters: [],
    colliders: [],
    lights: [],
    spawns: {},
    rooms: [],
    corridors: [],
  };
  const { root } = world;

  // ---------- 部屋の種類を割りあてる（同じ種類は 1 回だけ） ----------
  const bySize = { S: [], M: [], L: [] };
  for (const [k, v] of Object.entries(ROOM_TYPES)) bySize[v.size].push(k);
  const slots = { S: [], M: [], L: [] };
  layout.rooms.forEach((r) => slots[r.size].push(r));
  const start = R.pick(slots.M);
  start.type = 'oobeya';
  layout.bfs(layout.doorEdge(start));
  const goal = slots.S.slice().sort((a, b) => layout.roomDist(b) - layout.roomDist(a))[0];
  goal.type = 'oku';
  for (const size of ['S', 'M', 'L']) {
    const pool = R.shuffle(bySize[size].filter((t) => t !== 'oobeya' && t !== 'oku'));
    for (const r of slots[size]) if (!r.type) r.type = pool.pop();
  }

  // ---------- 部屋 ----------
  for (const room of layout.rooms) {
    const { block, rect } = room;
    const x0 = X(block.i) + U + rect[0] * U, x1 = X(block.i) + U + rect[2] * U;
    const z0 = Z(block.j) + U + rect[1] * U, z1 = Z(block.j) + U + rect[3] * U;
    Object.assign(room, { x0, x1, z0, z1, def: ROOM_TYPES[room.type] });
    world.rooms.push(room);
    buildRoom(room, world, R);
  }

  // ---------- 廊下 ----------
  for (const e of layout.edges.values()) {
    if (!e.on) continue;
    const g = new THREE.Group();
    root.add(g);
    let cx, cz, w, d;
    if (e.kind === 'h') {
      cx = X(e.i) + P / 2; cz = Z(e.j); w = P - 2 * U; d = 2 * U;
    } else {
      cx = X(e.i); cz = Z(e.j) + P / 2; w = 2 * U; d = P - 2 * U;
    }
    mbox(w, 0.05, d, M.woodFloor, cx, -0.05, cz, g);
    ceiling(w + 0.1, d + 0.1, cx, cz, g);
    for (const f of [1 / 6, 0.5, 5 / 6]) {
      const lamp = ceilingLamp(R.chance(0.85));
      lamp.position.set(e.kind === 'h' ? X(e.i) + U + f * (P - 2 * U) : cx, H - 0.02, e.kind === 'h' ? cz : Z(e.j) + U + f * (P - 2 * U));
      g.add(lamp);
    }
    world.corridors.push({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2 });

    // 両側の壁：区画があればその区画の側面、なければ外壁
    const sides = e.kind === 'h'
      ? [
          { blk: [e.i, e.j - 1], side: 's', A: new THREE.Vector3(X(e.i) + U, 0, Z(e.j) - U), B: new THREE.Vector3(X(e.i + 1) - U, 0, Z(e.j) - U), N: new THREE.Vector3(0, 0, 1) },
          { blk: [e.i, e.j], side: 'n', A: new THREE.Vector3(X(e.i) + U, 0, Z(e.j) + U), B: new THREE.Vector3(X(e.i + 1) - U, 0, Z(e.j) + U), N: new THREE.Vector3(0, 0, -1) },
        ]
      : [
          { blk: [e.i - 1, e.j], side: 'e', A: new THREE.Vector3(X(e.i) - U, 0, Z(e.j) + U), B: new THREE.Vector3(X(e.i) - U, 0, Z(e.j + 1) - U), N: new THREE.Vector3(1, 0, 0) },
          { blk: [e.i, e.j], side: 'w', A: new THREE.Vector3(X(e.i) + U, 0, Z(e.j) + U), B: new THREE.Vector3(X(e.i) + U, 0, Z(e.j + 1) - U), N: new THREE.Vector3(-1, 0, 0) },
        ];
    for (const s of sides) {
      const block = layout.blocks.find((b) => b.i === s.blk[0] && b.j === s.blk[1]);
      if (!block) {
        // 外壁：月明かりの障子
        placeWall(g, splitBays(P - 2 * U, (i) => (i % 3 === 1 ? { type: 'wall' } : { type: 'shoji', paper: M.washiCool })), s.A, s.B, s.N, world);
        continue;
      }
      placeWall(g, blockSideBays(block, s.side, s.A, s.B, s.N, R), s.A, s.B, s.N, world);
    }
  }

  // ---------- 交差点 ----------
  for (let j = 0; j <= layout.NY; j++)
    for (let i = 0; i <= layout.NX; i++) {
      const e = {
        e: layout.edges.get(layout.ek('h', i, j)),
        w: layout.edges.get(layout.ek('h', i - 1, j)),
        s: layout.edges.get(layout.ek('v', i, j)),
        n: layout.edges.get(layout.ek('v', i, j - 1)),
      };
      if (!Object.values(e).some((x) => x?.on)) continue;
      const g = new THREE.Group();
      root.add(g);
      const cx = X(i), cz = Z(j);
      mbox(2 * U, 0.05, 2 * U, M.woodFloor, cx, -0.05, cz, g);
      ceiling(2 * U + 0.1, 2 * U + 0.1, cx, cz, g);
      const lamp = ceilingLamp(R.chance(0.8));
      lamp.position.set(cx, H - 0.02, cz);
      g.add(lamp);
      world.corridors.push({ x0: cx - U, x1: cx + U, z0: cz - U, z1: cz + U });
      const outer = (dir) => (dir === 'n' && j === 0) || (dir === 's' && j === layout.NY) || (dir === 'w' && i === 0) || (dir === 'e' && i === layout.NX);
      for (const [dir, A, B, N] of [
        ['n', [cx - U, cz - U], [cx + U, cz - U], [0, 1]],
        ['s', [cx - U, cz + U], [cx + U, cz + U], [0, -1]],
        ['w', [cx - U, cz - U], [cx - U, cz + U], [1, 0]],
        ['e', [cx + U, cz - U], [cx + U, cz + U], [-1, 0]],
      ]) {
        if (e[dir]?.on) continue;
        const bay = outer(dir) ? { len: 2 * U, type: 'shoji', paper: M.washiCool } : { len: 2 * U, type: 'wall' };
        placeWall(g, [bay], new THREE.Vector3(A[0], 0, A[1]), new THREE.Vector3(B[0], 0, B[1]), new THREE.Vector3(N[0], 0, N[1]), world);
      }
    }

  // ---------- 仕上げ：当たり判定・灯りを集めてから、形をまとめる ----------
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  root.traverse((o) => {
    if (o.userData.solid) {
      box.setFromObject(o);
      world.colliders.push({ minX: box.min.x + 0.03, maxX: box.max.x - 0.03, minZ: box.min.z + 0.03, maxZ: box.max.z - 0.03 });
    }
    if (o.userData.doorCollider) {
      box.setFromObject(o);
      world.colliders.push({ minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z, door: o.userData.doorCollider });
    }
    if (o.userData.light) world.lights.push({ pos: o.getWorldPosition(new THREE.Vector3()), ...o.userData.light, phase: R.next() * 100 });
    if (o.userData.spawn) world.spawns[o.userData.spawn] = { pos: o.getWorldPosition(new THREE.Vector3()), quat: o.getWorldQuaternion(new THREE.Quaternion()) };
  });
  for (const g of root.children) mergeStatic(g);

  // スタート：二年三組の部屋の真ん中、入口を向いて
  world.start = { pos: start.group.localToWorld(new THREE.Vector3(0, 0, 0.6)), yaw: start.group.rotation.y };
  world.goal = goal;
  return world;
}

// 区画の 1 辺（廊下側）の柱間の並び
function blockSideBays(block, side, A, B, N, R) {
  const total = 10 * U;
  // A→B の向きに合わせた、辺上の位置（A からの距離）
  const axis = side === 'n' || side === 's' ? 'x' : 'z';
  const segs = [];
  if (block.void) {
    return splitBays(total, (i, n) => ({ type: 'wall', decorate: i === Math.floor(n / 2) ? keepOutSign : undefined }));
  }
  for (const room of block.rooms) {
    const r = room.rect;
    const touches = side === 'n' ? r[1] === 0 : side === 's' ? r[3] === 10 : side === 'w' ? r[0] === 0 : r[2] === 10;
    if (!touches) continue;
    const a = (axis === 'x' ? r[0] : r[1]) * U, b = (axis === 'x' ? r[2] : r[3]) * U;
    segs.push({ a, b, room });
  }
  segs.sort((p, q) => p.a - q.a);
  const bays = [];
  for (const { a, b, room } of segs) {
    const def = room.def;
    const win = def.windows;
    const garden = def.outdoor;
    const plainKind = (i) => (garden ? { type: 'glass' } : win && i % 2 === 1 ? { type: 'shoji', paper: M.washiWarm } : { type: 'wall' });
    if (room.door !== side) {
      bays.push(...splitBays(b - a, plainKind));
      continue;
    }
    const m = (a + b) / 2;
    const left = splitBays(m - 0.6 - a, (i, n) => (i === n - 1 && win ? { type: 'shoji', paper: M.washiWarm } : plainKind(i)));
    const right = splitBays(b - (m + 0.6), (i) => (i === 0 && win ? { type: 'shoji', paper: M.washiWarm } : plainKind(i + 1)));
    let door;
    if (def.door === 'noren') door = { len: 1.2, type: 'noren', text: 'ゆ' };
    else if (def.door === 'noren2') door = { len: 1.2, type: 'noren', text: '' };
    else door = { len: 1.2, type: 'door', makePanel: DOOR_PANELS[def.door] || DOOR_PANELS.fusuma, slide: -1, open: room.type === 'oobeya' };
    door.decorate = (g, uc) => {
      if (!def.plate) return;
      const p = plateMesh(def.plate);
      p.position.set(uc + 0.85, 1.25, WT / 2 + 0.02);
      g.add(p);
    };
    bays.push(...left, door, ...right);
  }
  return bays;
}

const plateCache = new Map();
function plateMesh(text) {
  if (!plateCache.has(text)) {
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
    const chars = [...text].slice(0, 5);
    const size = Math.min(56, 290 / chars.length);
    g.font = `bold ${size}px "Hiragino Mincho ProN", "Yu Mincho", serif`;
    g.textAlign = 'center';
    g.textBaseline = 'top';
    chars.forEach((ch, i) => g.fillText(ch, 48, 14 + i * size));
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    plateCache.set(text, new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 }));
  }
  return new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.025), plateCache.get(text));
}

function keepOutSign(g, uc) {
  const s = Q.textPlane(['関係者以外', '立入禁止'], 0.5, 0.3, { bg: '#f0ece0', fg: '#a01010', size: 40, border: '#a01010' });
  s.position.set(uc, 1.5, WT / 2 + 0.01);
  g.add(s);
}

// ---------- 部屋ひとつ ----------
function buildRoom(room, world, R) {
  const { x0, x1, z0, z1, def, block } = room;
  const g = new THREE.Group();
  world.root.add(g);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;

  // 床・天井（区画の座標のまま）
  const shell = new THREE.Group();
  g.add(shell);
  if (def.floor === 'tatami') tatamiFloor(w, d, cx, cz, shell);
  else if (def.floor !== 'none') {
    const fm = { wood: M.woodFloor, tile: M.mosaic, stone: M.stoneFloor, gravel: M.gravel }[def.floor] || M.woodFloor;
    mbox(w, 0.05, d, fm, cx, -0.05, cz, shell);
  }
  if (!def.outdoor) ceiling(w, d, cx, cz, shell);

  // 廊下に面していない辺だけ、自分で壁を作る
  const r = room.rect;
  const corridorSide = (s) => block.corridorSides.includes(s) && (s === 'n' ? r[1] === 0 : s === 's' ? r[3] === 10 : s === 'w' ? r[0] === 0 : r[2] === 10);
  const lower = def.floor === 'tile' ? M.mosaic : M.plaster;
  for (const [s, px, pz, ry, len] of [
    ['n', x0, z0 + 0.03, 0, w],
    ['s', x0, z1 - 0.03, 0, w],
    ['w', x0 + 0.03, z1, Math.PI / 2, d],
    ['e', x1 - 0.03, z1, Math.PI / 2, d],
  ]) {
    if (corridorSide(s)) continue;
    const wl = plainWall(len, lower, M.plaster, Math.max(1, Math.round(len / 2.4)));
    wl.position.set(px, 0, pz);
    wl.rotation.y = ry;
    shell.add(wl);
  }

  // なかみ：入口が -z になるように回した座標で作る
  const inner = new THREE.Group();
  inner.position.set(cx, 0, cz);
  inner.rotation.y = { n: 0, s: Math.PI, e: -Math.PI / 2, w: Math.PI / 2 }[room.door];
  g.add(inner);
  room.group = inner;
  const across = room.door === 'n' || room.door === 's';
  const hw = (across ? w : d) / 2 - 0.06;
  const hd = (across ? d : w) / 2 - 0.06;
  def.build(makeCtx(inner, hw, hd, R, world));
}

function makeCtx(g, hw, hd, R, world) {
  const free = R.shuffle(['w', 'e', 's']);
  const ci = 0.75;
  const corners = R.shuffle([[-hw + ci, hd - ci], [hw - ci, hd - ci], [-hw + ci, -hd + ci + 0.6], [hw - ci, -hd + ci + 0.6]]);
  const alongWall = (side, t, depth) => {
    switch (side) {
      case 'n': return [t * (hw - 0.3), -hd + depth, 0];
      case 's': return [-t * (hw - 0.3), hd - depth, Math.PI];
      case 'w': return [-hw + depth, -t * (hd - 0.3), Math.PI / 2];
      default: return [hw - depth, t * (hd - 0.3), -Math.PI / 2];
    }
  };
  const c = {
    g, R, hw, hd, free, corners,
    doors: world.doors, interactables: world.interactables, updaters: world.updaters,
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
      return c.put(obj, x, z, ry, solid);
    },
    hang(obj, x, z) {
      return c.put(obj, x, z).translateY(H - 0.5);
    },
    lamp(x, z, on = true, color) {
      const l = ceilingLamp(on);
      if (color) l.traverse((o) => o.userData.light && (o.userData.light.color = color));
      c.put(l, x, z).position.y = H - 0.02;
    },
    bulb(x, z, on) {
      c.put(Q.bareBulb(on), x, z).position.y = H;
    },
    ofuda(n) {
      for (let i = 0; i < n; i++) {
        const side = R.pick(['n', 's', 'e', 'w']);
        let t = R.range(-0.95, 0.95);
        if (side === 'n' && Math.abs(t * hw) < 1.0) t = Math.sign(t || 1) * R.range(0.4, 0.95);
        const o = Pr.ofuda();
        c.wall(o, side, t, 0.075).position.y = R.range(0.5, 2.4);
        o.rotation.z = R.range(-0.25, 0.25);
      }
    },
    spawn(name, side, t, depth) {
      const [x, z, ry] = alongWall(side, t, depth);
      const o = new THREE.Object3D();
      o.userData.spawn = name;
      c.put(o, x, z, ry);
    },
    moon(k = 1) {
      Pr.lightMarker(g, 0, H + 2, 0, 0x7088b0, 7 * k, 14);
    },
    lockedNote(side, msg) {
      const [x, z, ry] = alongWall(side, 0, 0.15);
      const pick = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.0, 0.3), new THREE.MeshBasicMaterial());
      pick.visible = false;
      pick.userData.dynamic = true;
      pick.userData.note = msg;
      c.put(pick, x, z, ry).position.y = 1.0;
      world.interactables.push(pick);
    },
    addDoor(door, panel, center, size) {
      panel.traverse((o) => (o.userData.door = door));
      world.doors.push(door);
      world.interactables.push(panel);
      const hit = new THREE.Mesh(new THREE.BoxGeometry(...size));
      hit.position.copy(center);
      hit.visible = false;
      hit.userData.doorCollider = door;
      g.add(hit);
      const pick = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], 0.5), new THREE.MeshBasicMaterial());
      pick.position.copy(center);
      pick.visible = false;
      pick.userData.dynamic = true;
      pick.userData.door = door;
      g.add(pick);
      world.interactables.push(pick);
    },
    steam(x, z, w, d) {
      const n = Math.round(w * d * 4);
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        pos[i * 3] = x + R.range(-w / 2, w / 2);
        pos[i * 3 + 1] = R.range(0.3, 2.5);
        pos[i * 3 + 2] = z + R.range(-d / 2, d / 2);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: steamTexture(), size: 1.4, transparent: true, opacity: 0.08, depthWrite: false, color: 0xdde4e6 }));
      pts.userData.dynamic = true;
      g.add(pts);
      world.updaters.push({
        userData: {
          update(dt, time) {
            const a = geo.attributes.position;
            for (let i = 0; i < n; i++) {
              let y = a.getY(i) + dt * 0.18;
              if (y > 2.6) y = 0.3;
              a.setY(i, y);
              a.setX(i, a.getX(i) + Math.sin(time * 0.5 + i) * dt * 0.05);
            }
            a.needsUpdate = true;
          },
        },
      });
    },
  };
  return c;
}

let _steam;
function steamTexture() {
  if (_steam) return _steam;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,0.9)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  _steam = new THREE.CanvasTexture(c);
  return _steam;
}

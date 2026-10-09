// plan.js の間取りから、3 階建ての旅館を組み立てる
// 1.2m のマス目に「廊下・部屋・何もない」を塗り、境目に自動で壁・戸・窓を立てる。
import * as THREE from 'three';
import { M, T } from './textures.js';
import { mbox, mergeStatic } from './geo.js';
import {
  H, KAMOI, WT, wallRun, ceiling, tatamiFloor, ceilingLamp, koshiDoor, fusumaPanel, glassDoor, shojiPanel,
} from './architecture.js';
import { U, FH, GRID_W, GRID_H, FLOORS, STAIRS, START_ROOM } from './plan.js';
import { ROOM_TYPES } from './rooms.js';
import * as Pr from './props.js';
import * as Q from './props2.js';

const CHUNK = 9.6;

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
  const root = new THREE.Group();
  const world = {
    root, doors: [], interactables: [], updaters: [], colliders: FLOORS.map(() => []), lights: [],
    spawns: {}, rooms: [], stairs: [], grids: [], doorEdgeSets: [], edgeDoors: [], hideSpots: [],
  };
  const chunks = new Map();
  const chunk = (f, x, z) => {
    const k = `${f}:${Math.floor(x / CHUNK)}:${Math.floor(z / CHUNK)}`;
    if (!chunks.has(k)) {
      const g = new THREE.Group();
      root.add(g);
      chunks.set(k, g);
    }
    return chunks.get(k);
  };

  for (const s of STAIRS) world.stairs.push({ ...s, x0: s.x * U, x1: (s.x + s.w) * U, z0: s.y * U, z1: (s.y + s.len) * U });

  FLOORS.forEach((plan, f) => {
    const base = f * FH;
    const grid = new Array(GRID_W * GRID_H).fill(null);
    const at = (x, y) => (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H ? null : grid[y * GRID_W + x]);
    const set = (x, y, v) => (grid[y * GRID_W + x] = v);
    world.grids.push({ grid, at });

    const CORR = { kind: 'corr' };
    for (const [x, y, w, h] of plan.corridors) for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, CORR);
    const stairCells = new Map(); // 下の階の階段
    const wellCells = new Map(); // 上の階の吹き抜け
    for (const s of world.stairs) {
      for (let j = s.y; j < s.y + s.len; j++)
        for (let i = s.x; i < s.x + s.w; i++) {
          if (s.from === f) {
            set(i, j, CORR);
            stairCells.set(`${i},${j}`, s);
          } else if (s.from === f - 1) {
            set(i, j, { kind: 'corr', well: s });
            wellCells.set(`${i},${j}`, s);
          }
        }
    }
    const rooms = plan.rooms.map(([type, x, y, w, h, doors], idx) => {
      const room = { id: `${f}-${idx}`, type, def: ROOM_TYPES[type], floor: f, x, y, w, h, door: doors[0], doors: [...doors], x0: x * U, x1: (x + w) * U, z0: y * U, z1: (y + h) * U };
      const cell = { kind: 'room', room };
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, cell);
      world.rooms.push(room);
      return room;
    });

    // ---------- 廊下の床・天井・灯り ----------
    for (let y = 0; y < GRID_H; y++)
      for (let x = 0; x < GRID_W; x++) {
        const c = at(x, y);
        if (!c || c.kind !== 'corr') continue;
        const cx = (x + 0.5) * U, cz = (y + 0.5) * U;
        const g = chunk(f, cx, cz);
        if (!c.well) mbox(U + 0.002, 0.05, U + 0.002, M.woodFloor, cx, base - 0.05, cz, g);
        if (!stairCells.has(`${x},${y}`)) ceiling(U + 0.01, U + 0.01, cx, cz, g, base + H);
      }
    const lampAt = new Set();
    for (const [x, y, w, h] of plan.corridors) {
      const along = w >= h;
      const n = Math.floor((along ? w : h) / 3);
      for (let i = 0; i < n; i++) {
        const lx = along ? x + 1.5 + i * 3 : x + w / 2;
        const ly = along ? y + h / 2 : y + 1.5 + i * 3;
        const k = `${Math.round(lx / 2)},${Math.round(ly / 2)}`;
        if (lampAt.has(k) || wellCells.has(`${Math.floor(lx)},${Math.floor(ly)}`) || stairCells.has(`${Math.floor(lx)},${Math.floor(ly)}`)) continue;
        lampAt.add(k);
        const lamp = ceilingLamp(R.chance(f === 2 ? 0.45 : 0.85));
        lamp.position.set(lx * U, base + H - 0.02, ly * U);
        chunk(f, lx * U, ly * U).add(lamp);
      }
    }

    // ---------- 部屋 ----------
    for (const room of rooms) {
      const { x0, x1, z0, z1, def } = room;
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
      const g = chunk(f, cx, cz);
      const shell = new THREE.Group();
      shell.position.y = base;
      g.add(shell);
      if (def.floor === 'tatami') tatamiFloor(w, d, cx, cz, shell);
      else if (def.floor !== 'none') {
        const fm = { wood: M.woodFloor, tile: M.mosaic, stone: M.stoneFloor, gravel: M.gravel }[def.floor] || M.woodFloor;
        mbox(w, 0.05, d, fm, cx, -0.05, cz, shell);
      }
      if (!def.outdoor) ceiling(w, d, cx, cz, shell);
      const inner = new THREE.Group();
      inner.position.set(cx, base, cz);
      inner.rotation.y = { n: 0, s: Math.PI, e: -Math.PI / 2, w: Math.PI / 2 }[room.door];
      g.add(inner);
      room.group = inner;
      const across = room.door === 'n' || room.door === 's';
      const hw = (across ? w : d) / 2 - 0.06;
      const hd = (across ? d : w) / 2 - 0.06;
      const order = ['n', 'e', 's', 'w'];
      const extra = room.doors.slice(1).map((d) => order[(order.indexOf(d) - order.indexOf(room.door) + 4) % 4]);
      def.build(makeCtx(inner, hw, hd, R, world, extra));
      inner.children.forEach((o) => (o.userData.room = room.type));
    }

    // ---------- 入口の位置 ----------
    const doorEdges = new Map();
    for (const room of rooms) {
      const { x, y, w, h } = room;
      const mx = x + Math.floor((w - 1) / 2), my = y + Math.floor((h - 1) / 2);
      for (const d of room.doors) {
        const key = { n: `h:${mx}:${y}`, s: `h:${mx}:${y + h}`, w: `v:${x}:${my}`, e: `v:${x + w}:${my}` }[d];
        if (!doorEdges.has(key)) doorEdges.set(key, room);
      }
    }

    world.doorEdgeSets[f] = new Set(doorEdges.keys());
    world.doorEdgeRooms = world.doorEdgeRooms || [];
    world.doorEdgeRooms[f] = doorEdges;

    // ---------- 壁 ----------
    const keyOf = (c) => (!c ? 'V' : c.kind === 'corr' ? 'C' : c.room.id);
    const prio = (c) => (!c ? 0 : c.kind === 'corr' ? 3 : c.room.def.outdoor ? 1 : 2);
    const runs = [];
    const scan = (orient) => {
      const lines = orient === 'v' ? GRID_W + 1 : GRID_H + 1;
      const len = orient === 'v' ? GRID_H : GRID_W;
      for (let l = 0; l < lines; l++) {
        let run = null;
        for (let p = 0; p < len; p++) {
          const a = orient === 'v' ? at(l - 1, p) : at(p, l - 1);
          const b = orient === 'v' ? at(l, p) : at(p, l);
          const ka = keyOf(a), kb = keyOf(b);
          // 吹き抜けのまわりは手すり
          const wa = a?.well, wb = b?.well;
          if (ka === kb && ka === 'C' && (wa || wb) && wa !== wb) {
            const s = wa || wb;
            const topEdge = orient === 'h' && l === s.y + s.len;
            if (!topEdge) railing(orient, l, p, base, chunk(f, (orient === 'v' ? l : p + 0.5) * U, (orient === 'v' ? p + 0.5 : l) * U));
          }
          if (ka === kb) {
            run = null;
            continue;
          }
          const frontIsA = prio(a) >= prio(b);
          const sig = `${ka}|${kb}|${frontIsA}`;
          const edge = { p, a, b, door: doorEdges.get(`${orient}:${orient === 'v' ? l : p}:${orient === 'v' ? p : l}`) };
          if (run && run.sig === sig && run.end === p) {
            run.edges.push(edge);
            run.end = p + 1;
          } else {
            run = { orient, l, sig, start: p, end: p + 1, edges: [edge], front: frontIsA ? a : b, back: frontIsA ? b : a, frontIsA };
            runs.push(run);
          }
        }
      }
    };
    scan('v');
    scan('h');

    for (const run of runs) {
      const { orient, l, start, end, front, back, frontIsA } = run;
      const A = orient === 'v' ? new THREE.Vector3(l * U, base, start * U) : new THREE.Vector3(start * U, base, l * U);
      const B = orient === 'v' ? new THREE.Vector3(l * U, base, end * U) : new THREE.Vector3(end * U, base, l * U);
      const s = frontIsA ? -1 : 1;
      const N = orient === 'v' ? new THREE.Vector3(s, 0, 0) : new THREE.Vector3(0, 0, s);
      const doorIdx = new Set(run.edges.map((e, i) => (e.door ? i : -1)).filter((i) => i >= 0));
      const nearDoor = (i) => doorIdx.has(i - 1) || doorIdx.has(i + 1);
      const bays = run.edges.map((e, i) => {
        if (e.door) return doorBay(e.door, front);
        if (front?.kind === 'corr') {
          if (!back) return i % 3 === 2 ? { type: 'wall' } : { type: 'shoji', sill: 0.75, outside: true, paper: M.washiCool };
          const def = back.room.def;
          if (def.outdoor) return { type: 'glass' };
          if (def.windows && i % 2 === 1 && !nearDoor(i)) return { type: 'shoji', sill: 0.75, paper: M.washiWarm };
        }
        return { type: 'wall' };
      });
      // 続きの土壁は 2 マスで 1 つの柱間にまとめる
      const merged = [];
      for (const b of bays) {
        const last = merged[merged.length - 1];
        if (b.type === 'wall' && last?.type === 'wall' && last.len < 2 * U - 0.01) last.len += U;
        else merged.push({ len: U, ...b });
      }
      const mid = A.clone().add(B).multiplyScalar(0.5);
      placeWall(chunk(f, mid.x, mid.z), merged, A, B, N, world);
    }

    // ---------- 階段 ----------
    for (const s of world.stairs) if (s.from === f) buildStairs(s, base, chunk(f, (s.x0 + s.x1) / 2, (s.z0 + s.z1) / 2));
  });

  // ---------- 仕上げ ----------
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const floorOf = (y) => Math.max(0, Math.min(FLOORS.length - 1, Math.floor((y + 0.2) / FH)));
  root.traverse((o) => {
    if (o.userData.solid || o.userData.doorCollider) {
      box.setFromObject(o);
      const c = o.userData.doorCollider
        ? { minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z, door: o.userData.doorCollider }
        : { minX: box.min.x + 0.03, maxX: box.max.x - 0.03, minZ: box.min.z + 0.03, maxZ: box.max.z - 0.03, src: o.userData.room || o.parent?.userData.room || o.userData.model };
      world.colliders[floorOf((box.min.y + box.max.y) / 2 - 0.2)].push(c);
    }
    if (o.userData.light) {
      const pos = o.getWorldPosition(new THREE.Vector3());
      world.lights.push({ pos, floor: floorOf(pos.y - 1), ...o.userData.light, phase: R.next() * 100 });
    }
    if (o.userData.hide) {
      const pos = o.getWorldPosition(new THREE.Vector3());
      const q = o.getWorldQuaternion(new THREE.Quaternion());
      const f = floorOf(pos.y + 0.5);
      world.hideSpots.push({ type: o.userData.hide, pos, yaw: new THREE.Euler().setFromQuaternion(q, 'YXZ').y, floor: f, room: world.rooms.find((r) => r.floor === f && pos.x > r.x0 && pos.x < r.x1 && pos.z > r.z0 && pos.z < r.z1) });
    }
    if (o.userData.spawn) world.spawns[o.userData.spawn] = { pos: o.getWorldPosition(new THREE.Vector3()), quat: o.getWorldQuaternion(new THREE.Quaternion()) };
  });
  for (const o of world.interactables) o.userData.floor = floorOf(o.getWorldPosition(new THREE.Vector3()).y - 0.5);
  linkOpenings(world);
  for (const g of chunks.values()) mergeStatic(g);

  const start = world.rooms.find((r) => r.type === START_ROOM);
  world.start = { pos: start.group.localToWorld(new THREE.Vector3(0, 0, 0.6)), yaw: start.group.rotation.y, floor: start.floor };
  return world;
}

// 戸・障子窓・のれんを、それぞれの部屋の「開き口」として結びつける
function linkOpenings(world) {
  for (const r of world.rooms) r.openings = [];
  const roomAt = (f, p) => world.rooms.find((r) => r.floor === f && p.x > r.x0 && p.x < r.x1 && p.z > r.z0 && p.z < r.z1);
  const tmp = new THREE.Vector3();
  const doorPos = (d) => d.panel.parent.localToWorld(tmp.copy(d.base)).clone();
  // 入口（戸・のれん）
  world.doorEdgeRooms.forEach((edges, f) => {
    world.edgeDoors[f] = new Map();
    for (const key of edges.keys()) {
      const [o, a, b] = key.split(':');
      const x = Number(a), y = Number(b);
      const mid = o === 'h' ? new THREE.Vector3((x + 0.5) * U, f * FH + 1, y * U) : new THREE.Vector3(x * U, f * FH + 1, (y + 0.5) * U);
      let best = null, bd = 1.2;
      for (const d of world.doors) {
        if (d.window) continue;
        const p = doorPos(d);
        if (Math.floor((p.y + 0.5) / FH) !== f) continue;
        const dist = Math.hypot(p.x - mid.x, p.z - mid.z);
        if (dist < bd) [best, bd] = [d, dist];
      }
      if (best) world.edgeDoors[f].set(key, best);
      const side = o === 'h' ? [new THREE.Vector3(0, 0, -0.4), new THREE.Vector3(0, 0, 0.4)] : [new THREE.Vector3(-0.4, 0, 0), new THREE.Vector3(0.4, 0, 0)];
      const rs = new Set(side.map((v) => roomAt(f, mid.clone().add(v))).filter(Boolean));
      for (const r of rs) r.openings.push({ door: best, key, mid });
    }
  });
  // 障子窓
  for (const d of world.doors) {
    if (!d.window) continue;
    const p = doorPos(d);
    const f = Math.floor((p.y + 0.5) / FH);
    for (const v of [[0.45, 0], [-0.45, 0], [0, 0.45], [0, -0.45]]) {
      const r = roomAt(f, new THREE.Vector3(p.x + v[0], 0, p.z + v[1]));
      if (r && !r.openings.some((o) => o.door === d)) r.openings.push({ door: d, window: true, mid: p });
    }
  }
}

// 壁を A→B に置く。N は表（廊下側）の向き
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
}

function doorBay(room, front) {
  const def = room.def;
  if (def.door === 'noren') return { type: 'noren', text: 'ゆ' };
  if (def.door === 'noren2') return { type: 'noren', text: '' };
  return {
    type: 'door',
    makePanel: DOOR_PANELS[def.door] || DOOR_PANELS.fusuma,
    slide: -1,
    open: room.type === START_ROOM,
    decorate: (g, uc) => {
      if (!def.plate || front?.kind !== 'corr') return;
      const p = plateMesh(def.plate);
      p.position.set(uc + 0.72, 1.2, WT / 2 + 0.02);
      g.add(p);
    },
  };
}

function railing(orient, l, p, base, parent) {
  const g = new THREE.Group();
  const len = U;
  const m = M.darkWood;
  Pr.box(len, 0.05, 0.07, m, len / 2, 0.85, 0, g);
  Pr.box(len, 0.04, 0.06, m, len / 2, 0.05, 0, g);
  for (let i = 0; i <= 8; i++) Pr.box(0.025, 0.8, 0.025, m, (len * i) / 8, 0.05, 0, g);
  Pr.box(0.08, 0.95, 0.08, m, 0, 0, 0, g);
  const hit = new THREE.Mesh(new THREE.BoxGeometry(len, 0.9, 0.12));
  hit.position.set(len / 2, 0.45, 0);
  hit.visible = false;
  hit.userData.solid = true;
  g.add(hit);
  if (orient === 'v') {
    g.position.set(l * U, base, p * U);
    g.rotation.y = -Math.PI / 2;
  } else g.position.set(p * U, base, l * U);
  parent.add(g);
}

function buildStairs(s, base, parent) {
  const g = new THREE.Group();
  const n = Math.round((s.len * U) / 0.3);
  const run = (s.len * U) / n;
  const rise = FH / n;
  const w = s.w * U - 0.06;
  const cx = (s.x0 + s.x1) / 2;
  for (let i = 0; i < n; i++) {
    mbox(w, (i + 1) * rise, run, M.woodFloor, cx, base, s.z0 + (i + 0.5) * run, g);
    mbox(w + 0.01, 0.02, 0.04, M.darkWood, cx, base + (i + 1) * rise - 0.02, s.z0 + i * run + 0.02, g);
  }
  // 手すり
  const slope = Math.atan2(FH, s.len * U);
  const hl = Math.hypot(FH, s.len * U);
  for (const side of [-1, 1]) {
    const r = Pr.box(0.05, 0.05, hl, M.darkWood, 0, 0, 0, null);
    r.position.set(cx + side * (w / 2 - 0.05), base + FH / 2 + 0.85, (s.z0 + s.z1) / 2);
    r.rotation.x = slope;
    g.add(r);
  }
  // 階の境目のすき間をふさぐ梁
  for (const [x, z, bw, bd] of [
    [cx, s.z0, s.w * U, 0.1],
    [s.x0, (s.z0 + s.z1) / 2, 0.1, s.len * U],
    [s.x1, (s.z0 + s.z1) / 2, 0.1, s.len * U],
  ]) mbox(bw, FH - H, bd, M.darkWood, x, base + H, z, g);
  parent.add(g);
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

// ---------- 部屋のなかみ用の ctx（rooms.js から使う） ----------
function makeCtx(g, hw, hd, R, world, extraDoors = []) {
  const free = R.shuffle(['w', 'e', 's'].filter((x) => !extraDoors.includes(x)));
  const ci = 0.75;
  let back = 0; // 広縁のぶん、奥の壁を手前に見なす
  let corners = R.shuffle([[-hw + ci, hd - ci], [hw - ci, hd - ci], [-hw + ci, -hd + ci + 0.6], [hw - ci, -hd + ci + 0.6]]);
  const alongWall = (side, t, depth) => {
    const hd2 = hd - back;
    switch (side) {
      case 'n': return [t * (hw - 0.3), -hd + depth, 0];
      case 's': return [-t * (hw - 0.3), hd2 - depth, Math.PI];
      case 'w': return [-hw + depth, -t * (hd - 0.3) - back / 2, Math.PI / 2];
      default: return [hw - depth, t * (hd - 0.3) - back / 2, -Math.PI / 2];
    }
  };
  const c = {
    g, R, hw, hd, free, corners, extraDoors,
    // 客室の奥の広縁：板の間・開けた障子・いすとテーブル・窓
    hiroen(depth = 1.4) {
      back = depth;
      const z = hd - depth;
      mbox(hw * 2, 0.014, depth, M.woodFloor, 0, 0, hd - depth / 2, g);
      mbox(hw * 2, 0.1, 0.12, M.darkWood, 0, KAMOI, z, g);
      mbox(hw * 2, H - KAMOI - 0.1, 0.06, M.plaster, 0, KAMOI + 0.1, z, g);
      mbox(hw * 2, 0.03, 0.12, M.darkWood, 0, 0, z, g);
      for (const sx of [-1, 1]) {
        mbox(0.12, H, 0.12, M.darkWood, sx * (hw - 0.06), 0, z, g, false);
        const p = shojiPanel(0.9, KAMOI - 0.03, M.washiWarm);
        p.position.set(sx * (hw - 0.6), 0.03, z + sx * 0.02);
        g.add(p);
      }
      const win = new THREE.Mesh(new THREE.PlaneGeometry(hw * 2 - 0.5, 1.4), windowMat());
      win.position.set(0, 1.15, hd - 0.03);
      win.rotation.y = Math.PI;
      g.add(win);
      const cs = Pr.chairSet();
      cs.position.set(hw > 2.6 ? hw * 0.35 : 0, 0, hd - depth / 2);
      cs.userData.solid = true;
      g.add(cs);
      const ci2 = 0.75;
      corners = R.shuffle([[-hw + ci2, z - ci2], [hw - ci2, z - ci2], [-hw + ci2, -hd + ci2 + 0.6], [hw - ci2, -hd + ci2 + 0.6]]);
      c.corners = corners;
      c.hd2 = z;
    },
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

let _win;
function windowMat() {
  if (!_win) _win = new THREE.MeshStandardMaterial({ map: T.moonWindow, emissive: 0xffffff, emissiveMap: T.moonWindow, emissiveIntensity: 0.6, roughness: 0.2 });
  return _win;
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

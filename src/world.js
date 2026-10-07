// 間取り + 部屋の種類 → 3D の旅館を組み立てる
import * as THREE from 'three';
import { M, T } from './textures.js';
import * as P from './props.js';
import { generateLayout, DIRS, OPP } from './layout.js';
import { ROOM_TYPES, RANDOM_POOL } from './rooms.js';

export const S = 8; // 1マスの大きさ（m）
export const WALL_H = 2.7;
export const DOOR_H = 2.0;
export const DOOR_W = 1.6;
const WT = 0.12; // 壁の厚さ
const HALF = S / 2 - WT / 2 - 0.02;

// 箱の UV を「1 = 1m」にする（テクスチャ側の repeat で模様の大きさを決める）
function metricBox(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const sizes = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++)
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, uv.getX(k) * sizes[f][0], uv.getY(k) * sizes[f][1]);
    }
  return g;
}
function mbox(w, h, d, material, x, y, z, parent) {
  const m = new THREE.Mesh(metricBox(w, h, d), material);
  m.position.set(x, y + h / 2, z);
  parent.add(m);
  return m;
}

const FLOOR_MAT = { tatami: M.tatami, wood: M.woodFloor, tile: M.tile, gravel: M.gravel };

function assignTypes(layout, R) {
  let pool = [];
  for (const c of layout.cells) {
    if (c === layout.start) c.type = 'genkan';
    else if (c === layout.goal) c.type = 'oku';
    else if (c.links.size >= 3) c.type = R.chance(0.3) ? 'engawa' : 'rouka';
    else {
      if (!pool.length) pool = R.shuffle(RANDOM_POOL);
      c.type = pool.pop();
    }
  }
}

export function buildWorld(R) {
  const layout = generateLayout(R);
  assignTypes(layout, R);

  const root = new THREE.Group();
  const world = {
    root,
    layout,
    colliders: [],
    doors: [],
    interactables: [],
    lights: [],
    spawns: {},
    start: null,
  };
  const solids = [];
  const center = (c) => new THREE.Vector3(c.x * S, 0, c.y * S);
  const isCorr = (c) => !!(c && ROOM_TYPES[c.type].corridor);

  // ---------- 床・天井 ----------
  for (const c of layout.cells) {
    const def = ROOM_TYPES[c.type];
    const p = center(c);
    mbox(S, 0.05, S, FLOOR_MAT[def.floor], p.x, -0.05, p.z, root);
    if (!def.noCeiling) mbox(S, 0.06, S, M.ceiling, p.x, WALL_H, p.z, root);
  }

  // ---------- 壁・柱・戸 ----------
  const addCollider = (minX, maxX, minZ, maxZ, door = null) =>
    world.colliders.push({ minX, maxX, minZ, maxZ, door });

  function buildWall(a, b, dir) {
    // a: 必ず存在するマス, b: 隣（無ければ外周）, dir: a から見た方向
    const p = center(a);
    const alongX = dir === 'n' || dir === 's';
    const off = (S / 2) * (dir === 's' || dir === 'e' ? 1 : -1);
    const wx = alongX ? p.x : p.x + off;
    const wz = alongX ? p.z + off : p.z;
    const linked = b && a.links.has(dir);
    const shojiWall = isCorr(a) || isCorr(b);
    const lowerMat = shojiWall ? M.shoji : M.plaster;

    const seg = (len, along) => {
      const x = alongX ? wx + along : wx;
      const z = alongX ? wz : wz + along;
      const w = alongX ? len : WT;
      const d = alongX ? WT : len;
      mbox(w, DOOR_H, d, lowerMat, x, 0, z, root);
      mbox(w + 0.03, 0.09, d + 0.03, M.darkWood, x, 0, z, root); // 幅木
      addCollider(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
    };
    if (linked) {
      const side = (S - DOOR_W) / 2;
      seg(side, -(DOOR_W / 2 + side / 2));
      seg(side, DOOR_W / 2 + side / 2);
      // 敷居
      mbox(alongX ? DOOR_W : 0.14, 0.015, alongX ? 0.14 : DOOR_W, M.darkWood, wx, 0, wz, root);
    } else {
      seg(S, 0);
    }
    // 上の土壁と長押
    mbox(alongX ? S : WT, WALL_H - DOOR_H, alongX ? WT : S, M.plaster, wx, DOOR_H, wz, root);
    mbox(alongX ? S : WT + 0.05, 0.1, alongX ? WT + 0.05 : S, M.darkWood, wx, DOOR_H - 0.02, wz, root);

    if (linked) {
      const types = [a.type, b.type];
      const wet = types.some((t) => ['ofuro', 'datsuijo', 'chubo', 'monooki'].includes(t));
      const corr = isCorr(a) || isCorr(b);
      // 廊下どうしは戸なし、それ以外は引き戸
      if (corr && isCorr(a) && isCorr(b)) return;
      const material = wet ? M.woodPanel : corr || types.includes('genkan') ? M.shoji : M.fusuma;
      makeDoor(wx, wz, alongX, material, types.includes('oku'));
    } else if (!b && a === layout.start && dir === 's') {
      // 外への玄関戸（開かない）
      const glass = new THREE.MeshStandardMaterial({
        color: 0x1a2a3a, emissive: 0x0a1a30, emissiveIntensity: 0.6, roughness: 0.1, metalness: 0.4,
      });
      const fd = new THREE.Mesh(metricBox(alongX ? 2.4 : 0.05, 1.95, alongX ? 0.05 : 2.4), glass);
      const n = alongX ? [0, -Math.sign(off)] : [-Math.sign(off), 0];
      fd.position.set(wx + n[0] * 0.09, 0.98, wz + n[1] * 0.09);
      fd.userData.locked = '鍵がかかっている……外には出られない';
      root.add(fd);
      world.interactables.push(fd);
    }
  }

  function makeDoor(wx, wz, alongX, material, isGoal) {
    const w = alongX ? DOOR_W : 0.05;
    const d = alongX ? 0.05 : DOOR_W;
    const panel = new THREE.Mesh(metricBox(w, DOOR_H - 0.02, d), material);
    const nOff = 0.1;
    const base = new THREE.Vector3(wx + (alongX ? 0 : nOff), (DOOR_H - 0.02) / 2, wz + (alongX ? nOff : 0));
    panel.position.copy(base);
    root.add(panel);
    const door = {
      panel,
      base,
      axis: alongX ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1),
      t: 0,
      open: false,
      isGoal,
    };
    panel.userData.door = door;
    world.doors.push(door);
    world.interactables.push(panel);
    const hw = DOOR_W / 2;
    if (alongX) addCollider(wx - hw, wx + hw, wz - 0.12, wz + 0.12, door);
    else addCollider(wx - 0.12, wx + 0.12, wz - hw, wz + hw, door);
  }

  for (const a of layout.cells) {
    for (const dir of Object.keys(DIRS)) {
      const b = layout.neighbor(a, dir);
      if (b && (dir === 'n' || dir === 'w')) continue; // 隣側で作る
      buildWall(a, b, dir);
    }
  }

  // 柱（マスの角）
  const posts = new Set();
  for (const c of layout.cells)
    for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) posts.add(`${c.x * 2 - 1 + dx * 2},${c.y * 2 - 1 + dz * 2}`);
  for (const k of posts) {
    const [px, pz] = k.split(',').map(Number);
    mbox(0.18, WALL_H, 0.18, M.darkWood, (px * S) / 2, 0, (pz * S) / 2, root);
  }

  // ---------- 部屋の中身 ----------
  for (const c of layout.cells) {
    const g = new THREE.Group();
    g.position.copy(center(c));
    root.add(g);
    const ctx = makeRoomCtx(c, g, R, world, solids);
    ROOM_TYPES[c.type].build(ctx);
  }

  // ---------- 仕上げ ----------
  root.updateMatrixWorld(true);
  const tmp = new THREE.Box3();
  for (const o of solids) {
    tmp.setFromObject(o);
    addCollider(tmp.min.x + 0.05, tmp.max.x - 0.05, tmp.min.z + 0.05, tmp.max.z - 0.05);
  }
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
    if (o.userData.light) {
      world.lights.push({ pos: o.getWorldPosition(new THREE.Vector3()), ...o.userData.light, phase: R.next() * 100 });
    }
  });

  // スタート地点：玄関の中央、つながっている方向を向く
  const st = layout.start;
  const firstDir = [...st.links][0] || 'n';
  world.start = {
    pos: center(st).add(new THREE.Vector3(DIRS[firstDir][0], 0, DIRS[firstDir][1]).multiplyScalar(-1.5)),
    yaw: { n: 0, s: Math.PI, e: -Math.PI / 2, w: Math.PI / 2 }[firstDir],
  };
  return world;
}

function makeRoomCtx(cell, g, R, world, solids) {
  const doors = { n: false, s: false, e: false, w: false };
  for (const d of cell.links) doors[d] = true;
  const free = R.shuffle(Object.keys(doors).filter((d) => !doors[d]));
  const corners = R.shuffle([[-3.1, -3.1], [3.1, -3.1], [3.1, 3.1], [-3.1, 3.1]]);
  const firstDoor = [...cell.links][0];
  const back = firstDoor && !doors[OPP[firstDoor]] ? OPP[firstDoor] : free[0] || 'n';

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
    R,
    doors,
    free,
    corners,
    back,
    put(obj, x, z, ry = 0, solid = false) {
      obj.position.x = x;
      obj.position.z = z;
      obj.rotation.y = ry;
      g.add(obj);
      if (solid) solids.push(obj);
      return obj;
    },
    wall(obj, side, t, depth, solid = false) {
      const [x, z, ry] = alongWall(side, t, depth);
      return ctx.put(obj, x, z, ry, solid);
    },
    hang(obj, x, z) {
      return ctx.put(obj, x, z).translateY(WALL_H - 0.55);
    },
    lamp(x, z, color, intensity) {
      const o = new THREE.Group();
      P.cyl(0.35, 0.35, 0.06, P.glow(0xffffff, color, 1.0), 0, 0, 0, o);
      P.lightMarker(o, 0, -0.3, 0, color, intensity * 2, 7);
      ctx.put(o, x, z).position.y = WALL_H - 0.07;
    },
    window(side) {
      const o = new THREE.Group();
      P.plane(6.4, 1.6, windowMaterial(), 0, 1.05, 0, o);
      P.lightMarker(o, 0, 1.4, 0.8, 0x6688bb, 2.0, 6);
      ctx.wall(o, side, 0, 0.075);
    },
    moon() {
      P.lightMarker(g, 0, WALL_H + 1.5, 0, 0x7088b0, 6, 12);
    },
    ofudaEverywhere(n) {
      for (let i = 0; i < n; i++) {
        const side = R.pick(['n', 's', 'e', 'w']);
        let t = R.range(-0.9, 0.9);
        if (doors[side] && Math.abs(t * HALF) < 1.1) t = Math.sign(t || 1) * R.range(0.35, 0.9);
        const o = P.ofuda();
        ctx.wall(o, side, t, 0.075).position.y = R.range(0.6, 2.4);
        o.rotation.z = R.range(-0.2, 0.2);
      }
    },
    spawnPoint(name, side, t, depth) {
      const [x, z, ry] = alongWall(side, t, depth);
      world.spawns[name] = { pos: new THREE.Vector3(x, 0, z).add(g.position), ry };
    },
  };
  return ctx;
}

let _winMat;
function windowMaterial() {
  if (!_winMat) {
    _winMat = new THREE.MeshStandardMaterial({ map: T.moonWindow, emissive: 0xffffff, emissiveMap: T.moonWindow, emissiveIntensity: 0.7 });
  }
  return _winMat;
}

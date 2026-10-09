// 座敷童子の道案内：1.2m のマス目をたどる経路探索（階段で階をまたぐ）
import * as THREE from 'three';
import { U, FH, GRID_W, GRID_H } from './plan.js';

export class Nav {
  constructor(world) {
    this.world = world;
    this.floors = world.grids.length;
  }

  cell(f, x, y) {
    return this.world.grids[f]?.at(x, y) ?? null;
  }

  walkable(f, x, y) {
    const c = this.cell(f, x, y);
    if (!c) return false;
    // 上の階の吹き抜けは、階段のいちばん上の段だけ歩ける
    if (c.well) return y === c.well.y + c.well.len - 1;
    return true;
  }

  // となりのマスへ行けるか（同じ場所どうし、または入口のある境目）
  passable(f, x0, y0, x1, y1) {
    const a = this.cell(f, x0, y0), b = this.cell(f, x1, y1);
    if (!a || !b || !this.walkable(f, x0, y0) || !this.walkable(f, x1, y1)) return false;
    const ka = a.kind === 'corr' ? 'C' : a.room.id;
    const kb = b.kind === 'corr' ? 'C' : b.room.id;
    if (ka === kb) return true;
    const key = x0 !== x1 ? `v:${Math.max(x0, x1)}:${y0}` : `h:${x0}:${Math.max(y0, y1)}`;
    return this.world.doorEdgeSets[f].has(key);
  }

  edgeKey(x0, y0, x1, y1) {
    return x0 !== x1 ? `v:${Math.max(x0, x1)}:${y0}` : `h:${x0}:${Math.max(y0, y1)}`;
  }

  neighbors(n) {
    const out = [];
    const [f, x, y] = n;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (this.passable(f, x, y, x + dx, y + dy)) out.push([f, x + dx, y + dy]);
    }
    // 階段：下の階の足もとと上の階の吹き抜けは同じマスとしてつながる
    for (const s of this.world.stairs) {
      if (x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.len) {
        if (f === s.from && y === s.y + s.len - 1) out.push([f + 1, x, y]);
        if (f === s.from + 1 && y === s.y + s.len - 1) out.push([f - 1, x, y]);
      }
    }
    return out;
  }

  path(from, to) {
    const key = (n) => n.join(',');
    const h = (n) => Math.abs(n[1] - to[1]) + Math.abs(n[2] - to[2]) + Math.abs(n[0] - to[0]) * 20;
    const open = [from];
    const g = new Map([[key(from), 0]]);
    const came = new Map();
    const f = new Map([[key(from), h(from)]]);
    const closed = new Set();
    let guard = 0;
    while (open.length && guard++ < 20000) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (f.get(key(open[i])) < f.get(key(open[bi]))) bi = i;
      const cur = open.splice(bi, 1)[0];
      const ck = key(cur);
      if (ck === key(to)) {
        const out = [cur];
        let k = ck;
        while (came.has(k)) {
          const p = came.get(k);
          out.unshift(p);
          k = key(p);
        }
        return out;
      }
      closed.add(ck);
      for (const nb of this.neighbors(cur)) {
        const nk = key(nb);
        if (closed.has(nk)) continue;
        const ng = g.get(ck) + (nb[0] !== cur[0] ? 1 : 1);
        if (ng < (g.get(nk) ?? Infinity)) {
          came.set(nk, cur);
          g.set(nk, ng);
          f.set(nk, ng + h(nb));
          if (!open.some((o) => key(o) === nk)) open.push(nb);
        }
      }
    }
    return null;
  }

  // マスの中心（階段の上なら高さも）
  pointOf([f, x, y]) {
    const p = new THREE.Vector3((x + 0.5) * U, f * FH, (y + 0.5) * U);
    for (const s of this.world.stairs) {
      if (f === s.from && x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.len) {
        p.y = (s.from + (y + 0.5 - s.y) / s.len) * FH;
      }
    }
    return p;
  }

  nodeAt(pos, floor) {
    return [floor, Math.floor(pos.x / U), Math.floor(pos.z / U)];
  }

  randomNode(R, floor = null) {
    for (let i = 0; i < 200; i++) {
      const f = floor ?? Math.floor(R.next() * this.floors);
      const x = Math.floor(R.next() * GRID_W), y = Math.floor(R.next() * GRID_H);
      const c = this.cell(f, x, y);
      if (c && (c.kind === 'corr' || R.chance(0.3))) return [f, x, y];
    }
    return null;
  }
}

// 旅館全体の間取り
// 廊下は格子状のネットワーク（節点＝廊下の交差点）、そのあいだの区画に部屋を並べる。
export const U = 1.2; // 基本の寸法（m）
export const PITCH = 12; // 節点の間隔（U）
export const P = PITCH * U; // 14.4m

// 区画（10U × 10U）の分け方。[x0, z0, x1, z1]（U）
const PARTITIONS = {
  L: [[0, 0, 10, 10]],
  H2: [[0, 0, 10, 5], [0, 5, 10, 10]],
  V2: [[0, 0, 5, 10], [5, 0, 10, 10]],
  Q4: [[0, 0, 5, 5], [5, 0, 10, 5], [0, 5, 5, 10], [5, 5, 10, 10]],
  HQn: [[0, 0, 10, 5], [0, 5, 5, 10], [5, 5, 10, 10]],
  HQs: [[0, 0, 5, 5], [5, 0, 10, 5], [0, 5, 10, 10]],
  VQw: [[0, 0, 5, 10], [5, 0, 10, 5], [5, 5, 10, 10]],
  VQe: [[0, 0, 5, 5], [0, 5, 5, 10], [5, 0, 10, 10]],
};
const sizeOf = (r) => {
  const a = (r[2] - r[0]) * (r[3] - r[1]);
  return a >= 100 ? 'L' : a >= 50 ? 'M' : 'S';
};

export function generateLayout(R, need, { NX = 5, NY = 5, extra = 7 } = {}) {
  // ---------- 廊下 ----------
  const edges = new Map(); // key -> {a:[i,j], b:[i,j], kind:'h'|'v', i, j, on}
  const ek = (k, i, j) => `${k}${i},${j}`;
  for (let j = 0; j <= NY; j++) for (let i = 0; i < NX; i++) edges.set(ek('h', i, j), { kind: 'h', i, j, on: false });
  for (let j = 0; j < NY; j++) for (let i = 0; i <= NX; i++) edges.set(ek('v', i, j), { kind: 'v', i, j, on: false });
  const ends = (e) => (e.kind === 'h' ? [[e.i, e.j], [e.i + 1, e.j]] : [[e.i, e.j], [e.i, e.j + 1]]);
  const nk = ([i, j]) => `${i},${j}`;

  // ランダムな全域木（Kruskal）
  const parent = new Map();
  const find = (x) => (parent.get(x) === x ? x : (parent.set(x, find(parent.get(x))), parent.get(x)));
  for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) parent.set(`${i},${j}`, `${i},${j}`);
  const all = R.shuffle([...edges.values()]);
  for (const e of all) {
    const [a, b] = ends(e).map(nk);
    if (find(a) !== find(b)) {
      parent.set(find(a), find(b));
      e.on = true;
    }
  }
  // 回り道
  const off = R.shuffle(all.filter((e) => !e.on));
  for (let k = 0; k < extra && k < off.length; k++) off[k].on = true;

  const blockSides = (i, j) => ({
    n: edges.get(ek('h', i, j)),
    s: edges.get(ek('h', i, j + 1)),
    w: edges.get(ek('v', i, j)),
    e: edges.get(ek('v', i + 1, j)),
  });
  // どの区画も、少なくとも 1 辺は廊下に面するように
  for (let j = 0; j < NY; j++)
    for (let i = 0; i < NX; i++) {
      const s = blockSides(i, j);
      if (!Object.values(s).some((e) => e.on)) R.pick(Object.values(s)).on = true;
    }

  // ---------- 区画を部屋に分ける ----------
  const left = { ...need };
  const rooms = [];
  const blocks = [];
  const order = [];
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) order.push([i, j]);
  for (const [i, j] of R.shuffle(order)) {
    const sides = blockSides(i, j);
    const corridorSides = Object.keys(sides).filter((d) => sides[d].on);
    const touching = (r) => {
      const t = [];
      if (r[1] === 0) t.push('n');
      if (r[3] === 10) t.push('s');
      if (r[0] === 0) t.push('w');
      if (r[2] === 10) t.push('e');
      return t.filter((d) => corridorSides.includes(d));
    };
    const cands = [];
    for (const [name, rects] of Object.entries(PARTITIONS)) {
      if (!rects.every((r) => touching(r).length)) continue;
      const use = { L: 0, M: 0, S: 0 };
      rects.forEach((r) => use[sizeOf(r)]++);
      if (use.L > left.L || use.M > left.M || use.S > left.S) continue;
      const w = use.L * left.L * 2 + use.M * left.M + use.S * left.S * 0.6;
      if (w > 0) cands.push({ name, rects, use, w });
    }
    const block = { i, j, sides, corridorSides, rooms: [] };
    blocks.push(block);
    if (!cands.length) {
      block.void = true;
      continue;
    }
    let pick = R.next() * cands.reduce((s, c) => s + c.w, 0);
    const c = cands.find((x) => (pick -= x.w) < 0) || cands[0];
    for (const k of ['L', 'M', 'S']) left[k] -= c.use[k];
    for (const r of c.rects) {
      const t = touching(r);
      const room = { block, rect: r, size: sizeOf(r), touching: t, door: R.pick(t), type: null };
      // 長い辺に入口がある方が自然
      const long = t.filter((d) => ((d === 'n' || d === 's') ? r[2] - r[0] : r[3] - r[1]) >= 10);
      if (long.length && R.chance(0.7)) room.door = R.pick(long);
      block.rooms.push(room);
      rooms.push(room);
    }
  }

  // ---------- 玄関からの距離 ----------
  const doorEdge = (room) => room.block.sides[room.door];
  const dist = new Map();
  const bfs = (startEdge) => {
    dist.clear();
    const q = [];
    for (const n of ends(startEdge)) {
      dist.set(nk(n), 0);
      q.push(n);
    }
    while (q.length) {
      const n = q.shift();
      const d = dist.get(nk(n));
      const [i, j] = n;
      for (const e of [edges.get(ek('h', i, j)), edges.get(ek('h', i - 1, j)), edges.get(ek('v', i, j)), edges.get(ek('v', i, j - 1))]) {
        if (!e || !e.on) continue;
        for (const m of ends(e)) {
          if (!dist.has(nk(m))) {
            dist.set(nk(m), d + 1);
            q.push(m);
          }
        }
      }
    }
  };
  const roomDist = (room) => Math.min(...ends(doorEdge(room)).map((n) => dist.get(nk(n)) ?? 99));

  return { NX, NY, edges, ends, blocks, rooms, doorEdge, bfs, roomDist, ek };
}

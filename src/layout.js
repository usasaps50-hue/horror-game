// 旅館の間取りをグリッド上にランダム生成する
export const DIRS = {
  n: [0, -1],
  s: [0, 1],
  e: [1, 0],
  w: [-1, 0],
};
export const OPP = { n: 's', s: 'n', e: 'w', w: 'e' };

export function generateLayout(R, { W = 7, H = 7, count = 22, loops = 3 } = {}) {
  const key = (x, y) => `${x},${y}`;
  const cells = new Map();
  const order = [];

  const add = (x, y) => {
    const c = { x, y, links: new Set(), type: null, dist: 0 };
    cells.set(key(x, y), c);
    order.push(c);
    return c;
  };
  const neighbor = (c, d) => cells.get(key(c.x + DIRS[d][0], c.y + DIRS[d][1]));
  const inBounds = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

  const start = add(Math.floor(W / 2), H - 1);

  // 「最近足した部屋から伸ばす」寄りにすると、奥行きのある間取りになる
  let guard = 0;
  while (cells.size < count && guard++ < 10000) {
    const base = R.chance(0.65)
      ? order[order.length - 1 - Math.floor(R.next() * Math.min(3, order.length))]
      : R.pick(order);
    const opts = Object.keys(DIRS).filter((d) => {
      const nx = base.x + DIRS[d][0];
      const ny = base.y + DIRS[d][1];
      return inBounds(nx, ny) && !cells.has(key(nx, ny));
    });
    if (!opts.length) continue;
    const d = R.pick(opts);
    const c = add(base.x + DIRS[d][0], base.y + DIRS[d][1]);
    base.links.add(d);
    c.links.add(OPP[d]);
  }

  // いくつか回り道（ループ）を作る
  for (let i = 0, made = 0; i < 50 && made < loops; i++) {
    const c = R.pick(order);
    const d = R.pick(Object.keys(DIRS));
    const nb = neighbor(c, d);
    if (nb && !c.links.has(d) && c !== start && nb !== start) {
      c.links.add(d);
      nb.links.add(OPP[d]);
      made++;
    }
  }

  // 玄関からの距離を測って、一番遠い部屋を「奥の間」にする
  for (const c of order) c.dist = Infinity;
  start.dist = 0;
  const queue = [start];
  while (queue.length) {
    const c = queue.shift();
    for (const d of c.links) {
      const nb = neighbor(c, d);
      if (nb.dist > c.dist + 1) {
        nb.dist = c.dist + 1;
        queue.push(nb);
      }
    }
  }
  const maxDist = Math.max(...order.map((c) => c.dist));
  const far = order.filter((c) => c.dist >= maxDist - 1);
  const goal =
    far.filter((c) => c.links.size === 1).sort((a, b) => b.dist - a.dist)[0] ||
    order.slice().sort((a, b) => b.dist - a.dist)[0];

  return { W, H, cells: order, start, goal, get: (x, y) => cells.get(key(x, y)), neighbor };
}

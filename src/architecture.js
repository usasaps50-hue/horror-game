// 建具（障子・ふすま・格子戸・ガラス戸）と、柱・長押・欄間つきの壁
import * as THREE from 'three';
import { M, T } from './textures.js';
import { mbox, mergedMesh } from './geo.js';

export const W = 2.4; // 廊下の幅
export const H = 2.6; // 天井の高さ
export const KAMOI = 1.85; // 鴨居（戸の上端）の高さ
export const BAY = 1.6; // 柱と柱のあいだ
export const WT = 0.12; // 壁の厚さ

// ---------- 建具 ----------

// 障子：縦の框・上下の桟・細い組子・腰板・和紙
export function shojiPanel(w, h, paperMat, { koshi = 0.32, rows = 7, cols = 3 } = {}) {
  const g = new THREE.Group();
  const t = 0.032; // 框の太さ
  const d = 0.03;
  const paperBottom = koshi > 0 ? koshi + 0.03 : 0.06;
  const paperTop = h - 0.045;
  const ph = paperTop - paperBottom;
  const parts = [
    [t, h, d, -w / 2 + t / 2, h / 2, 0],
    [t, h, d, w / 2 - t / 2, h / 2, 0],
    [w, 0.045, d, 0, h - 0.0225, 0],
    [w, 0.06, d, 0, 0.03, 0],
  ];
  if (koshi > 0) parts.push([w, 0.03, d, 0, koshi + 0.015, 0]);
  const iw = w - 2 * t;
  for (let i = 1; i <= cols; i++) parts.push([0.011, ph, 0.016, -iw / 2 + (iw * i) / (cols + 1), paperBottom + ph / 2, 0]);
  for (let j = 1; j < rows; j++) parts.push([iw, 0.011, 0.016, 0, paperBottom + (ph * j) / rows, 0]);
  g.add(mergedMesh(parts, M.shojiWood));
  if (koshi > 0) {
    const board = new THREE.Mesh(new THREE.BoxGeometry(iw, koshi - 0.06, 0.012), M.agedWood);
    board.position.set(0, 0.06 + (koshi - 0.06) / 2, 0);
    g.add(board);
  }
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(iw, ph), paperMat);
  paper.position.set(0, paperBottom + ph / 2, -0.004);
  g.add(paper);
  g.userData.paper = paper;
  return g;
}

// ふすま：黒い縁＋金地の絵＋引手
export function fusumaPanel(w, h) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(w - 0.04, h - 0.04, 0.022), M.fusuma);
  body.position.y = h / 2;
  g.add(body);
  const f = 0.022;
  g.add(mergedMesh([
    [f, h, 0.028, -w / 2 + f / 2, h / 2, 0],
    [f, h, 0.028, w / 2 - f / 2, h / 2, 0],
    [w, f, 0.028, 0, h - f / 2, 0],
    [w, f, 0.028, 0, f / 2, 0],
  ], M.lacquer));
  for (const z of [-0.013, 0.013]) {
    const hk = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.006, 20), M.lacquer);
    hk.rotation.x = Math.PI / 2;
    hk.position.set(w / 2 - 0.12, 0.85, z);
    g.add(hk);
  }
  return g;
}

// 格子戸：客室の入口。細かい縦格子の奥に明かりのついた和紙
export function koshiDoor(w, h, lit = true) {
  const g = new THREE.Group();
  const t = 0.045, d = 0.04;
  const parts = [
    [t, h, d, -w / 2 + t / 2, h / 2, 0],
    [t, h, d, w / 2 - t / 2, h / 2, 0],
    [w, 0.06, d, 0, h - 0.03, 0],
    [w, 0.08, d, 0, 0.04, 0],
    [w, 0.04, d, 0, 0.5, 0],
  ];
  const iw = w - 2 * t;
  const n = Math.floor(iw / 0.042);
  for (let i = 1; i < n; i++) parts.push([0.016, h - 0.6, 0.026, -iw / 2 + (iw * i) / n, 0.5 + (h - 0.6) / 2, 0.006]);
  g.add(mergedMesh(parts, M.agedWood));
  const board = new THREE.Mesh(new THREE.BoxGeometry(iw, 0.4, 0.015), M.darkWood);
  board.position.y = 0.28;
  g.add(board);
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(iw, h - 0.6), lit ? M.washiWarm : M.washiDark);
  paper.position.set(0, 0.5 + (h - 0.6) / 2, -0.012);
  g.add(paper);
  return g;
}

// すりガラスの引き戸（浴場の入口）
export function glassDoor(w, h) {
  const g = new THREE.Group();
  const t = 0.05, d = 0.04;
  g.add(mergedMesh([
    [t, h, d, -w / 2 + t / 2, h / 2, 0],
    [t, h, d, w / 2 - t / 2, h / 2, 0],
    [w, 0.06, d, 0, h - 0.03, 0],
    [w, 0.1, d, 0, 0.05, 0],
    [w, 0.04, d, 0, 1.0, 0],
  ], M.hinoki));
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(w - 2 * t, h - 0.16),
    new THREE.MeshStandardMaterial({
      color: 0xdfe8ea, emissive: 0x6a8088, emissiveIntensity: 0.25, roughness: 0.25,
      transparent: true, opacity: 0.62, side: THREE.DoubleSide, depthWrite: false,
    }),
  );
  glass.position.y = 0.1 + (h - 0.16) / 2;
  g.add(glass);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.18, 0.05), M.darkWood);
  handle.position.set(w / 2 - 0.1, 1.0, 0);
  g.add(handle);
  return g;
}

// のれん（「湯」）
let _norenTex;
function norenTexture(text = 'ゆ') {
  if (_norenTex && _norenTex.userData.text === text) return _norenTex;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 384;
  const g = c.getContext('2d');
  g.fillStyle = '#1d2b4a';
  g.fillRect(0, 0, 512, 384);
  for (let i = 0; i < 3000; i++) {
    g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '80,100,140'},${Math.random() * 0.15})`;
    g.fillRect(Math.random() * 512, Math.random() * 384, 2, 2);
  }
  g.fillStyle = '#e8e2d2';
  g.font = 'bold 230px "Hiragino Mincho ProN", "Yu Mincho", serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, 200);
  _norenTex = new THREE.CanvasTexture(c);
  _norenTex.userData.text = text;
  _norenTex.colorSpace = THREE.SRGBColorSpace;
  return _norenTex;
}

export function noren(w, h = 0.9, text = 'ゆ') {
  const g = new THREE.Group();
  g.userData.dynamic = true;
  const tex = norenTexture(text);
  const n = 3;
  const sw = w / n;
  const strips = [];
  for (let i = 0; i < n; i++) {
    const t = tex.clone();
    t.needsUpdate = true;
    t.repeat.set(1 / n, 1);
    t.offset.set(i / n, 0);
    const geo = new THREE.PlaneGeometry(sw - 0.01, h);
    geo.translate(0, -h / 2, 0);
    const s = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: t, roughness: 0.95, side: THREE.DoubleSide }));
    s.position.x = -w / 2 + sw * (i + 0.5);
    g.add(s);
    strips.push(s);
  }
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, w + 0.1, 8), M.darkWood);
  rod.rotation.z = Math.PI / 2;
  g.add(rod);
  g.userData.update = (dt, time, near) => {
    strips.forEach((s, i) => {
      const target = near * 0.9 + Math.sin(time * 1.3 + i) * 0.04;
      s.rotation.x += (target - s.rotation.x) * Math.min(1, dt * 4);
    });
  };
  return g;
}

// 窓の外（夜の庭）
let _outside;
function outsideMaterial() {
  if (!_outside) {
    _outside = new THREE.MeshStandardMaterial({ map: T.moonWindow, emissive: 0xffffff, emissiveMap: T.moonWindow, emissiveIntensity: 0.55, roughness: 0.2 });
  }
  return _outside;
}

// ---------- 壁 ----------
// 壁は「u 方向に並ぶ柱間（bay）」の並び。+z 側が廊下（見る側）、-z 側が部屋。
// bay = { len, type: 'wall' | 'shoji' | 'door' | 'noren' | 'open', ...}
export function wallRun(bays, ctx) {
  const g = new THREE.Group();
  const total = bays.reduce((s, b) => s + b.len, 0);
  const solid = (m) => {
    m.userData.solid = true;
    return m;
  };

  // 長押・敷居
  mbox(total, 0.1, WT + 0.06, M.darkWood, total / 2, KAMOI, 0, g);
  // 天井際の回り縁
  mbox(total, 0.05, WT + 0.08, M.darkWood, total / 2, H - 0.05, 0, g);

  let u = 0;
  for (const b of bays) {
    const u0 = u, u1 = u + b.len, uc = (u0 + u1) / 2;
    const inner = b.len - 0.15;
    u = u1;
    if (b.type === 'open') continue;

    // 下の部分
    if (b.type === 'wall') {
      // 腰板＋土壁
      const kh = b.koshi ?? 0.85;
      if (kh > 0) {
        solid(mbox(inner, kh, WT + 0.01, M.koshiita, uc, 0, 0, g));
        mbox(inner, 0.035, WT + 0.04, M.darkWood, uc, kh, 0, g);
      }
      solid(mbox(inner, KAMOI - kh, WT, b.lowerMat || M.plaster, uc, kh, 0, g));
      mbox(inner, 0.09, WT + 0.03, M.darkWood, uc, 0, 0, g);
    } else if (b.type === 'shoji') {
      // 障子：手前の 1 枚を横に引いて開けられる。sill があれば腰高の窓
      const sill = b.sill || 0;
      if (sill > 0) {
        solid(mbox(inner, sill, WT + 0.01, M.koshiita, uc, 0, 0, g));
        mbox(inner + 0.04, 0.04, WT + 0.08, M.darkWood, uc, sill, 0, g);
      } else {
        mbox(inner + 0.05, 0.035, WT + 0.02, M.agedWood, uc, 0, 0, g);
      }
      const y0 = sill > 0 ? sill + 0.04 : 0.035;
      const ph = KAMOI - y0;
      const pw = inner / 2 + 0.025;
      const opts = { ...(b.shojiOpts || {}), ...(sill > 0 ? { koshi: 0, rows: 4 } : {}) };
      const back = shojiPanel(pw, ph, b.paper || M.washiCool, opts);
      back.position.set(uc - (inner - pw) / 2, y0, -0.022);
      g.add(back);
      const front = shojiPanel(pw, ph, b.paper || M.washiCool, opts);
      front.userData.dynamic = true;
      const base = new THREE.Vector3(uc + (inner - pw) / 2, y0, 0.022);
      front.position.copy(base);
      g.add(front);
      const door = { panel: front, base, axis: new THREE.Vector3(-1, 0, 0), dist: pw - 0.05, t: 0, open: false, window: true };
      front.traverse((o) => (o.userData.door = door));
      ctx.doors.push(door);
      ctx.interactables.push(front);
      const pick = new THREE.Mesh(new THREE.BoxGeometry(inner, ph, 0.4), new THREE.MeshBasicMaterial());
      pick.position.set(uc, y0 + ph / 2, 0);
      pick.visible = false;
      pick.userData.dynamic = true;
      pick.userData.door = door;
      g.add(pick);
      ctx.interactables.push(pick);
      // 外に面した窓：開けると夜の外が見える
      if (b.outside) {
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(inner, ph), outsideMaterial());
        glass.position.set(uc, y0 + ph / 2, -(WT / 2 + 0.12));
        g.add(glass);
      }
      // 当たり判定用（見えない）
      const hit = new THREE.Mesh(new THREE.BoxGeometry(inner, KAMOI, WT));
      hit.position.set(uc, KAMOI / 2, 0);
      hit.visible = false;
      g.add(solid(hit));
    } else if (b.type === 'glass') {
      mbox(inner + 0.05, 0.035, WT + 0.02, M.agedWood, uc, 0, 0, g);
      const pw = inner / 2 + 0.025;
      for (const [k, z] of [[-1, 0.022], [1, -0.022]]) {
        const p = glassDoor(pw, KAMOI - 0.035);
        p.position.set(uc + (k * (inner - pw)) / 2, 0.035, z);
        g.add(p);
      }
      const hit = new THREE.Mesh(new THREE.BoxGeometry(inner, KAMOI, WT));
      hit.position.set(uc, KAMOI / 2, 0);
      hit.visible = false;
      g.add(solid(hit));
    } else if (b.type === 'door' || b.type === 'noren') {
      mbox(inner + 0.05, 0.02, WT + 0.02, M.agedWood, uc, 0, 0, g);
    }

    // 上の部分（小壁 or 欄間）
    const upperY = KAMOI + 0.1;
    if ((b.type === 'door' || b.type === 'noren') && b.ranma !== false) {
      const rh = 0.42;
      const r = new THREE.Mesh(new THREE.PlaneGeometry(inner - 0.04, rh), M.ranma);
      r.position.set(uc, upperY + rh / 2 + 0.02, 0);
      g.add(r);
      mbox(inner + 0.02, 0.03, WT, M.darkWood, uc, upperY + rh + 0.03, 0, g);
      mbox(inner, H - (upperY + rh + 0.06), WT, M.plaster, uc, upperY + rh + 0.06, 0, g);
    } else {
      mbox(inner, H - upperY, WT, M.plaster, uc, upperY, 0, g);
    }

    // 戸
    if (b.type === 'door') {
      const panel = b.makePanel(inner + 0.02);
      panel.userData.dynamic = true;
      const base = new THREE.Vector3(uc, 0.02, -(WT / 2 + 0.03));
      panel.position.copy(base);
      g.add(panel);
      const door = {
        panel,
        base,
        axis: new THREE.Vector3(b.slide || -1, 0, 0),
        dist: inner - 0.05,
        t: b.open ? 1 : 0,
        open: !!b.open,
        locked: b.locked || null,
        sound: b.sound,
      };
      panel.traverse((o) => (o.userData.door = door));
      ctx.doors.push(door);
      ctx.interactables.push(panel);
      // 戸の当たり判定は wall のローカルで記録し、あとで変換する
      const hit = new THREE.Mesh(new THREE.BoxGeometry(inner, KAMOI, 0.2));
      hit.position.set(uc, KAMOI / 2, 0);
      hit.visible = false;
      hit.userData.doorCollider = door;
      g.add(hit);
      const pick = new THREE.Mesh(new THREE.BoxGeometry(inner, KAMOI, 0.5), new THREE.MeshBasicMaterial());
      pick.position.set(uc, KAMOI / 2, 0);
      pick.visible = false;
      pick.userData.dynamic = true;
      pick.userData.door = door;
      g.add(pick);
      ctx.interactables.push(pick);
    }
    if (b.type === 'noren') {
      const n = noren(inner + 0.02, 0.85, b.text ?? 'ゆ');
      n.position.set(uc, KAMOI, 0.09);
      g.add(n);
      ctx.updaters.push(n);
    }
    b.decorate?.(g, uc, u0, u1);
  }

  // 柱
  u = 0;
  for (let i = 0; i <= bays.length; i++) {
    if (!(bays[i]?.noPost && i < bays.length)) mbox(0.15, H, 0.15, M.darkWood, u, 0, 0, g, false);
    u += bays[i]?.len || 0;
  }
  return g;
}

// 平らな壁（部屋の内側用）：柱・長押・幅木つき
export function plainWall(len, lowerMat = M.plaster, upperMat = M.plaster, posts = 2) {
  const g = new THREE.Group();
  const t = 0.06;
  const m = mbox(len, KAMOI, t, lowerMat, len / 2, 0, 0, g);
  m.userData.solid = true;
  mbox(len, H - KAMOI, t, upperMat, len / 2, KAMOI, 0, g);
  mbox(len, 0.09, t + 0.03, M.darkWood, len / 2, KAMOI, 0, g);
  mbox(len, 0.08, t + 0.02, M.darkWood, len / 2, 0, 0, g);
  for (let i = 1; i < posts; i++) mbox(0.12, H, t + 0.05, M.darkWood, (len * i) / posts, 0, 0, g, false);
  return g;
}

// 竿縁天井：板＋細い竿
export function ceiling(w, d, x, z, parent, y = H) {
  mbox(w, 0.04, d, M.ceiling, x, y, z, parent);
  const n = Math.floor(d / 0.45);
  const parts = [];
  for (let i = 0; i <= n; i++) parts.push([w, 0.025, 0.025, x, y - 0.0125, z - d / 2 + (d * i) / n]);
  const s = mergedMesh(parts, M.darkWood);
  parent.add(s);
}

// 畳敷きの床：畳＋へり
export function tatamiFloor(w, d, x, z, parent) {
  mbox(w, 0.05, d, M.tatami, x, -0.05, z, parent);
  const parts = [];
  const cols = Math.round(w / 0.9);
  const cw = w / cols;
  for (let i = 0; i <= cols; i++) parts.push([0.03, 0.006, d, x - w / 2 + i * cw, 0.003, z]);
  for (let i = 0; i < cols; i++) {
    for (let zz = (i % 2) * 0.9; zz < d; zz += 1.8) {
      parts.push([cw, 0.006, 0.03, x - w / 2 + (i + 0.5) * cw, 0.003, z - d / 2 + zz]);
    }
  }
  parent.add(mergedMesh(parts, new THREE.MeshStandardMaterial({ color: 0x1a2418, roughness: 0.8 })));
}

// 四角い和紙の天井灯
export function ceilingLamp(lit = true, red = false) {
  const g = new THREE.Group();
  const s = 0.5;
  g.add(mergedMesh([
    [s, 0.03, 0.03, 0, 0, -s / 2], [s, 0.03, 0.03, 0, 0, s / 2],
    [0.03, 0.03, s, -s / 2, 0, 0], [0.03, 0.03, s, s / 2, 0, 0],
    [s, 0.03, 0.03, 0, -0.14, -s / 2], [s, 0.03, 0.03, 0, -0.14, s / 2],
    [0.03, 0.03, s, -s / 2, -0.14, 0], [0.03, 0.03, s, s / 2, -0.14, 0],
    [0.02, 0.2, 0.02, 0, 0.1, 0],
  ], M.darkWood));
  const paperMat = lit
    ? new THREE.MeshStandardMaterial({
        map: T.washi, emissive: red ? 0xd02010 : 0xffc888, emissiveMap: T.washi, emissiveIntensity: red ? 1.6 : 1.3,
      })
    : M.washiDark;
  const p = new THREE.Mesh(new THREE.BoxGeometry(s - 0.03, 0.13, s - 0.03), paperMat);
  p.position.y = -0.07;
  g.add(p);
  if (lit) {
    const o = new THREE.Object3D();
    o.position.y = -0.3;
    o.userData.light = { color: red ? 0xff2a18 : 0xffa860, intensity: red ? 3 : 3.2, range: 6.5 };
    g.add(o);
  }
  return g;
}

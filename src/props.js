// 家具・小物。どれも「床が原点・正面が +z」の Group を返す
import * as THREE from 'three';
import { T, M } from './textures.js';

const cache = new Map();
export function mat(color, o = {}) {
  const k = color + JSON.stringify(o);
  if (!cache.has(k)) {
    cache.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...o }));
  }
  return cache.get(k);
}
export const glow = (color, emissive, intensity = 1.5) =>
  mat(color, { emissive, emissiveIntensity: intensity });
const texMat = (map, o = {}) => new THREE.MeshStandardMaterial({ map, roughness: 0.85, ...o });

export const C = {
  dark: 0x24170c,
  wood: 0x56391f,
  light: 0x8d6a44,
  lacquer: 0x3a0d0b,
  black: 0x0e0b09,
  paper: 0xe8dcc0,
  cloth: 0xe6e0d2,
};

export function box(w, h, d, material, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y + h / 2, z);
  parent?.add(m);
  return m;
}
export function cyl(rt, rb, h, material, x = 0, y = 0, z = 0, parent, seg = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
  m.position.set(x, y + h / 2, z);
  parent?.add(m);
  return m;
}
export function sphere(r, material, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), material);
  m.position.set(x, y, z);
  parent?.add(m);
  return m;
}
export function plane(w, h, material, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  m.position.set(x, y, z);
  parent?.add(m);
  return m;
}
// 実際のライトは main.js が近い順に割り当てる
export function lightMarker(parent, x, y, z, color = 0xffa050, intensity = 3, range = 6) {
  const o = new THREE.Object3D();
  o.position.set(x, y, z);
  o.userData.light = { color, intensity, range };
  parent.add(o);
  return o;
}
const group = () => new THREE.Group();

// ---------- 和室まわり ----------
export function lowTable(w = 1.4, d = 0.9, h = 0.33) {
  const g = group();
  box(w, 0.05, d, mat(0x2e1a0c, { roughness: 0.35 }), 0, h - 0.05, 0, g);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) box(0.07, h - 0.05, 0.07, mat(C.dark), sx * (w / 2 - 0.1), 0, sz * (d / 2 - 0.1), g);
  return g;
}

export function zabuton(color = 0x6e2626) {
  const g = group();
  box(0.55, 0.07, 0.6, mat(color), 0, 0, 0, g);
  return g;
}

export function futon(color = 0x4a6a8a, messy = 0) {
  const g = group();
  box(1.0, 0.1, 2.0, mat(C.cloth), 0, 0, 0, g);
  const b = box(0.98, 0.08, 1.45, mat(color), 0, 0.1, 0.25, g);
  b.rotation.y = messy * 0.3;
  box(0.5, 0.1, 0.3, mat(0xf2efe6), 0, 0.1, -0.75, g);
  return g;
}

export function andon() {
  const g = group();
  box(0.36, 0.04, 0.36, mat(C.dark), 0, 0, 0, g);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.03, 0.7, 0.03, mat(C.dark), sx * 0.15, 0, sz * 0.15, g);
  box(0.28, 0.45, 0.28, glow(0xffe0b0, 0xff9a40, 1.6), 0, 0.2, 0, g);
  box(0.34, 0.03, 0.34, mat(C.dark), 0, 0.68, 0, g);
  lightMarker(g, 0, 0.45, 0, 0xff9a48, 2.5, 5);
  return g;
}

export function chochin(lit = true, red = false) {
  const g = group();
  const paperMat = lit
    ? glow(red ? 0xff6a50 : 0xffe2b0, red ? 0xc81e10 : 0xff9a40, red ? 2.2 : 1.6)
    : mat(red ? 0x7a1a12 : 0xb8ab90);
  const s = sphere(0.18, paperMat, 0, 0, 0, g);
  s.scale.y = 1.35;
  cyl(0.1, 0.1, 0.05, mat(C.black), 0, 0.22, 0, g);
  cyl(0.1, 0.1, 0.05, mat(C.black), 0, -0.27, 0, g);
  box(0.01, 0.4, 0.01, mat(C.black), 0, 0.27, 0, g);
  if (lit) lightMarker(g, 0, 0, 0, red ? 0xff3020 : 0xffa050, red ? 3.5 : 3, 6);
  return g;
}

export function tokonoma() {
  const g = group();
  box(1.8, 0.14, 0.75, mat(0x1c120a, { roughness: 0.3 }), 0, 0, 0, g);
  box(0.12, 2.0, 0.12, mat(0x4a3018), 0.92, 0, -0.32, g);
  plane(0.42, 1.25, texMat(T.scroll), 0, 1.35, -0.36, g);
  const vase = cyl(0.06, 0.1, 0.32, mat(0x2c3a4a, { roughness: 0.3 }), -0.45, 0.14, 0, g);
  vase.castShadow = true;
  for (let i = 0; i < 4; i++) {
    const st = box(0.01, 0.4 + i * 0.08, 0.01, mat(0x2a3a1a), -0.45 + (i - 1.5) * 0.04, 0.42, 0, g);
    st.rotation.z = (i - 1.5) * 0.25;
  }
  return g;
}

export function teaSet() {
  const g = group();
  box(0.4, 0.02, 0.28, mat(C.lacquer, { roughness: 0.3 }), 0, 0, 0, g);
  cyl(0.06, 0.07, 0.1, mat(0x3b4a3a, { roughness: 0.4 }), -0.1, 0.02, 0, g);
  for (const x of [0.05, 0.13]) cyl(0.03, 0.025, 0.05, mat(0xe8e0d0, { roughness: 0.3 }), x, 0.02, 0.05, g);
  return g;
}

export function crtTv() {
  const g = group();
  box(0.6, 0.35, 0.4, mat(0x1a1a1a), 0, 0, 0, g);
  box(0.55, 0.45, 0.45, mat(0x2a2722), 0, 0.35, 0, g);
  plane(0.42, 0.32, mat(0xffffff, { map: T.tvStatic, emissive: 0x99aabb, emissiveMap: T.tvStatic, emissiveIntensity: 0.9 }), 0, 0.58, 0.226, g);
  lightMarker(g, 0, 0.6, 0.5, 0x8899ff, 1.5, 3.5);
  return g;
}

export function bag(color) {
  const g = group();
  box(0.5, 0.3, 0.25, mat(color), 0, 0, 0, g);
  box(0.3, 0.04, 0.02, mat(0x111111), 0, 0.3, 0, g);
  return g;
}

export function byobu(w = 2.4, h = 1.5) {
  const g = group();
  const n = 6, pw = w / n;
  const m = texMat(T.byobu);
  for (let i = 0; i < n; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(pw, h, 0.03), m);
    p.position.set(-w / 2 + pw * (i + 0.5), h / 2, i % 2 ? 0.08 : 0);
    p.rotation.y = i % 2 ? 0.35 : -0.35;
    g.add(p);
  }
  return g;
}

export function ozen() {
  const g = group();
  box(0.36, 0.12, 0.32, mat(0x5a0f0c, { roughness: 0.3 }), 0, 0, 0, g);
  cyl(0.06, 0.04, 0.05, mat(C.black, { roughness: 0.3 }), -0.08, 0.12, 0, g);
  cyl(0.06, 0.04, 0.05, mat(0x5a0f0c, { roughness: 0.3 }), 0.08, 0.12, 0, g);
  return g;
}

export function stage(w = 3.2, d = 1.4) {
  const g = group();
  box(w, 0.35, d, mat(0x3a2210, { roughness: 0.4 }), 0, 0, 0, g);
  const b = byobu(w * 0.85, 1.4);
  b.position.set(0, 0.35, -d / 2 + 0.2);
  g.add(b);
  const mic = cyl(0.01, 0.01, 1.3, mat(0x888888, { metalness: 0.6 }), 0.4, 0.35, 0.2, g);
  sphere(0.035, mat(0x222222), 0.4, 1.68, 0.2, g);
  return g;
}

// ---------- 収納・家具 ----------
export function shelf(w = 1.6, h = 1.8, d = 0.45, levels = 4, color = C.wood) {
  const g = group();
  const m = mat(color);
  for (const sx of [-1, 1]) box(0.04, h, d, m, sx * (w / 2 - 0.02), 0, 0, g);
  box(w, 0.04, d, m, 0, h - 0.04, 0, g);
  box(w, h, 0.02, m, 0, 0, -d / 2 + 0.01, g);
  for (let i = 0; i < levels; i++) box(w, 0.03, d, m, 0, (i * (h - 0.05)) / levels, 0, g);
  g.userData.levels = levels;
  g.userData.levelH = (h - 0.05) / levels;
  return g;
}

export function fillShelf(sh, R, w, d, make) {
  const { levels, levelH } = sh.userData;
  for (let i = 0; i < levels; i++) {
    let x = -w / 2 + 0.1;
    while (x < w / 2 - 0.15) {
      const item = make(R, i);
      if (!item) break;
      const iw = item.userData.w || 0.2;
      item.position.set(x + iw / 2, i * levelH + 0.03, (R.next() - 0.5) * 0.05);
      sh.add(item);
      x += iw + 0.03 + R.next() * 0.06;
    }
  }
  return sh;
}

export function crate(w = 0.6, h = 0.45, d = 0.5, color = 0x5e4630) {
  const g = group();
  box(w, h, d, mat(color), 0, 0, 0, g);
  box(w + 0.01, 0.04, d + 0.01, mat(C.dark), 0, h * 0.5, 0, g);
  return g;
}

export function counter(w = 2.6, h = 0.95, d = 0.6, color = C.wood, topColor = 0x2a1a0e) {
  const g = group();
  box(w, h - 0.05, d, mat(color), 0, 0, 0, g);
  box(w + 0.06, 0.05, d + 0.06, mat(topColor, { roughness: 0.35 }), 0, h - 0.05, 0, g);
  return g;
}

export function tansu() {
  const g = group();
  box(1.0, 1.2, 0.45, mat(0x3e2412, { roughness: 0.4 }), 0, 0, 0, g);
  for (let i = 0; i < 4; i++) {
    box(0.95, 0.01, 0.01, mat(C.black), 0, 0.28 * i + 0.1, 0.226, g);
    for (const x of [-0.25, 0.25]) box(0.1, 0.03, 0.02, mat(0x1a1a1a, { metalness: 0.7 }), x, 0.28 * i + 0.2, 0.235, g);
  }
  return g;
}

export function dresser() {
  const g = group();
  box(0.6, 0.35, 0.35, mat(0x3a0e0b, { roughness: 0.3 }), 0, 0, 0, g);
  box(0.4, 0.6, 0.04, mat(0x9aa4a8, { metalness: 0.8, roughness: 0.1 }), 0, 0.4, -0.08, g);
  const cloth = box(0.46, 0.55, 0.01, mat(0x8a1414), 0, 0.42, -0.05, g);
  cloth.rotation.x = 0.05;
  box(0.6, 0.05, 0.1, mat(0x3a0e0b), 0, 0.35, -0.1, g);
  return g;
}

export function kimonoRack() {
  const g = group();
  for (const sx of [-1, 1]) box(0.05, 1.6, 0.25, mat(0x3a0e0b), sx * 0.7, 0, 0, g);
  box(1.6, 0.05, 0.05, mat(0x3a0e0b), 0, 1.5, 0, g);
  const k = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.35, 0.02), M.kimono);
  k.position.set(0, 0.8, 0.02);
  g.add(k);
  return g;
}

// ---------- 浴場・台所 ----------
export function tub(w = 4, d = 3) {
  const g = group();
  const s = M.stone;
  box(w, 0.55, 0.2, s, 0, 0, -d / 2 + 0.1, g);
  box(w, 0.55, 0.2, s, 0, 0, d / 2 - 0.1, g);
  box(0.2, 0.55, d, s, -w / 2 + 0.1, 0, 0, g);
  box(0.2, 0.55, d, s, w / 2 - 0.1, 0, 0, g);
  box(w - 0.4, 0.02, d - 0.4, mat(0x2a3a3a), 0, 0.02, 0, g);
  box(w - 0.4, 0.02, d - 0.4, M.water, 0, 0.42, 0, g);
  return g;
}

export function washStation() {
  const g = group();
  box(0.8, 0.5, 0.02, mat(0xa9b4b8, { metalness: 0.9, roughness: 0.15, envMapIntensity: 9 }), 0, 0.7, -0.15, g);
  box(0.06, 0.06, 0.12, mat(0xaaaaaa, { metalness: 0.8, roughness: 0.2 }), 0, 0.55, -0.1, g);
  cyl(0.14, 0.12, 0.22, mat(0xc8c0b0), 0, 0, 0.25, g);
  cyl(0.12, 0.1, 0.12, mat(0xe8c41a), 0.3, 0, 0.3, g);
  return g;
}

export function stove() {
  const g = group();
  box(1.2, 0.85, 0.6, mat(0x777a7c, { metalness: 0.7, roughness: 0.35 }), 0, 0, 0, g);
  for (const x of [-0.3, 0.3]) {
    cyl(0.12, 0.12, 0.02, mat(0x111111), x, 0.85, 0, g);
    cyl(0.16, 0.14, 0.2, mat(0x555555, { metalness: 0.8, roughness: 0.3 }), x, 0.87, 0, g);
  }
  return g;
}

export function fridge() {
  const g = group();
  box(0.8, 1.9, 0.7, mat(0xb8b8b0, { metalness: 0.4, roughness: 0.4 }), 0, 0, 0, g);
  box(0.03, 0.6, 0.04, mat(0x666666), 0.3, 1.0, 0.36, g);
  return g;
}

// ---------- 帳場・売店・遊技場 ----------
export function keyBoard(R) {
  const g = group();
  box(1.4, 0.9, 0.04, mat(0x4a2e18), 0, 1.0, 0, g);
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 6; c++) {
      if (R.chance(0.25)) continue; // 鍵がなくなっている部屋
      box(0.05, 0.14, 0.02, mat(0x7a1414), -0.55 + c * 0.22, 1.12 + r * 0.25, 0.03, g);
    }
  return g;
}

export function clock() {
  const g = group();
  const face = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 24), mat(0xe8dcc0));
  face.rotation.x = Math.PI / 2;
  face.position.y = 0;
  g.add(face);
  const h = box(0.015, 0.14, 0.01, mat(C.black), 0, -0.02, 0.03, g);
  h.rotation.z = 2.4;
  return g;
}

export function vendingMachine() {
  const g = group();
  box(1.0, 1.85, 0.75, mat(0xb02020, { roughness: 0.4 }), 0, 0, 0, g);
  plane(0.85, 1.6, mat(0xffffff, { map: T.vending, emissive: 0xffffff, emissiveMap: T.vending, emissiveIntensity: 1.1 }), 0, 0.98, 0.376, g);
  lightMarker(g, 0, 1.0, 0.7, 0xcfe4ff, 4, 6);
  return g;
}

export function arcade() {
  const g = group();
  box(0.7, 1.7, 0.75, mat(0x1a1a3a), 0, 0, 0, g);
  const scr = plane(0.55, 0.42, mat(0xffffff, { map: T.arcade, emissive: 0xffffff, emissiveMap: T.arcade, emissiveIntensity: 1.2 }), 0, 1.25, 0.38, g);
  scr.rotation.x = -0.15;
  box(0.7, 0.08, 0.35, mat(0x111111), 0, 0.9, 0.5, g);
  lightMarker(g, 0, 1.3, 0.8, 0x6688ff, 2, 4);
  return g;
}

export function pingPong() {
  const g = group();
  box(2.4, 0.05, 1.3, mat(0x1e4a32, { roughness: 0.5 }), 0, 0.72, 0, g);
  box(0.02, 0.01, 1.3, mat(0xffffff), 0, 0.77, 0, g);
  box(0.02, 0.15, 1.4, mat(0xdddddd, { transparent: true, opacity: 0.7 }), 0, 0.77, 0, g);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.06, 0.72, 0.06, mat(0x222222), sx * 1.0, 0, sz * 0.5, g);
  sphere(0.02, mat(0xffffff), 0.6, 0.79, 0.2, g);
  return g;
}

export function massageChair() {
  const g = group();
  box(0.75, 0.5, 0.9, mat(0x3a2a22, { roughness: 0.5 }), 0, 0, 0, g);
  const back = box(0.75, 0.9, 0.25, mat(0x3a2a22, { roughness: 0.5 }), 0, 0.4, -0.35, g);
  back.rotation.x = -0.25;
  for (const sx of [-1, 1]) box(0.15, 0.3, 0.8, mat(0x2a1e18), sx * 0.38, 0.5, 0, g);
  return g;
}

export function bokutoRack(R) {
  const g = group();
  box(0.6, 0.5, 0.3, mat(C.wood), 0, 0, 0, g);
  for (let i = 0; i < 9; i++) {
    const b = box(0.03, 1.0, 0.03, mat(0x8a6a3a, { roughness: 0.4 }), -0.24 + i * 0.06, 0.3, (R.next() - 0.5) * 0.15, g);
    b.rotation.z = (R.next() - 0.5) * 0.15;
  }
  return g;
}

// ---------- 仏間・人形 ----------
export function butsudan() {
  const g = group();
  box(1.0, 1.5, 0.55, mat(0x0a0706, { roughness: 0.2 }), 0, 0, 0, g);
  box(0.8, 1.1, 0.02, glow(0x8a6a20, 0x6a4a10, 0.5), 0, 0.3, 0.2, g);
  box(0.3, 0.4, 0.12, glow(0xb08a30, 0x705010, 0.6), 0, 0.8, 0.12, g);
  for (const x of [-0.25, 0.25]) {
    cyl(0.02, 0.02, 0.15, mat(0xf0ead8), x, 0.5, 0.15, g);
    sphere(0.015, glow(0xffcc66, 0xff9922, 3), x, 0.67, 0.15, g);
  }
  for (const x of [-0.1, 0.1]) sphere(0.06, mat(0xd8781a), x, 0.37, 0.15, g);
  lightMarker(g, 0, 0.75, 0.35, 0xff9a30, 2.2, 4);
  return g;
}

export function portraitFrame() {
  const g = group();
  box(0.36, 0.44, 0.03, mat(C.black), 0, 0, 0, g);
  plane(0.3, 0.38, texMat(T.portrait), 0, 0.22, 0.016, g);
  return g;
}

export function doll(R, scale = 1) {
  const g = group();
  const kimonoCol = R ? R.pick([0x8a1a1a, 0x1a2a6a, 0x6a1a5a, 0xc89a20, 0x1a5a3a]) : 0x8a1a1a;
  const body = cyl(0.04, 0.09, 0.2, mat(kimonoCol), 0, 0, 0, g);
  sphere(0.045, mat(0xf4f0ea, { roughness: 0.3 }), 0, 0.25, 0, g);
  const hair = sphere(0.048, mat(0x050505, { roughness: 0.4 }), 0, 0.26, -0.008, g);
  hair.scale.set(1, 1, 0.95);
  box(0.09, 0.03, 0.02, mat(0x050505), 0, 0.26, 0.03, g); // 前髪
  g.scale.setScalar(scale);
  g.userData.w = 0.2 * scale;
  return g;
}

export function hinaDan(R, w = 2.6) {
  const g = group();
  const red = mat(0xa01414, { roughness: 0.7 });
  const steps = 5;
  for (let i = 0; i < steps; i++) {
    const d = 0.32;
    const z = -steps * d * 0.5 + (steps - 1 - i) * d + d / 2;
    box(w, 0.28 * (i + 1), d, red, 0, 0, z + 0.0, g);
    const n = 3 + Math.floor(R.next() * 4);
    for (let k = 0; k < n; k++) {
      const dl = doll(R, 1.3);
      dl.position.set(-w / 2 + 0.25 + (k * (w - 0.5)) / Math.max(1, n - 1), 0.28 * (i + 1), z);
      dl.rotation.y = (R.next() - 0.5) * 0.2;
      g.add(dl);
    }
  }
  return g;
}

export function glassCase(R) {
  const g = group();
  box(0.6, 0.8, 0.45, mat(C.dark), 0, 0, 0, g);
  box(0.6, 0.6, 0.45, mat(0xaabbcc, { transparent: true, opacity: 0.18, roughness: 0.05 }), 0, 0.8, 0, g);
  const d = doll(R, 2.0);
  d.position.set(0, 0.82, 0);
  g.add(d);
  return g;
}

export function candle() {
  const g = group();
  cyl(0.06, 0.07, 0.06, mat(0x8a6a2a, { metalness: 0.6 }), 0, 0, 0, g);
  cyl(0.02, 0.02, 0.18, mat(0xf2ead6), 0, 0.06, 0, g);
  sphere(0.018, glow(0xffdd88, 0xff9922, 3), 0, 0.26, 0, g);
  lightMarker(g, 0, 0.3, 0, 0xff8a28, 1.4, 3);
  return g;
}

export function temari(scale = 1) {
  const g = group();
  sphere(0.09 * scale, new THREE.MeshStandardMaterial({ map: T.temari, roughness: 0.8 }), 0, 0.09 * scale, 0, g);
  return g;
}

export function toys(R) {
  const g = group();
  for (let i = 0; i < 3; i++) {
    const top = cyl(0.06, 0.005, 0.07, mat(R.pick([0xb02020, 0x2050a0, 0xe0b020])), R.range(-0.4, 0.4), 0, R.range(-0.3, 0.3), g);
    top.rotation.z = R.range(-0.8, 0.8);
  }
  const k = box(0.03, 0.2, 0.03, mat(0x8a5a2a), 0.2, 0, 0.2, g);
  k.rotation.z = 1.5;
  return g;
}

export function ofuda() {
  return plane(0.12, 0.36, texMat(T.ofuda, { side: THREE.DoubleSide }));
}

// ---------- 庭 ----------
export function stoneLantern() {
  const g = group();
  const s = M.stone;
  box(0.5, 0.15, 0.5, s, 0, 0, 0, g);
  cyl(0.1, 0.12, 0.6, s, 0, 0.15, 0, g);
  box(0.4, 0.08, 0.4, s, 0, 0.75, 0, g);
  box(0.32, 0.28, 0.32, glow(0x5a5650, 0x995522, 0.4), 0, 0.83, 0, g);
  const roof = cyl(0.04, 0.38, 0.22, s, 0, 1.11, 0, g, 4);
  roof.rotation.y = Math.PI / 4;
  sphere(0.06, s, 0, 1.37, 0, g);
  lightMarker(g, 0, 0.97, 0, 0xff8a40, 1.5, 4);
  return g;
}

export function pine(R) {
  const g = group();
  const trunk = cyl(0.08, 0.14, 2.2, mat(0x2a1e14), 0, 0, 0, g);
  trunk.rotation.z = 0.12;
  for (let i = 0; i < 4; i++) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.5 - i * 0.06, 8, 6), mat(0x1a2a18));
    c.scale.y = 0.35;
    c.position.set(R.range(-0.6, 0.6), 1.2 + i * 0.4, R.range(-0.4, 0.4));
    g.add(c);
  }
  return g;
}

export function well() {
  const g = group();
  const ring = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.6, 0.7, 20, 1, true),
    new THREE.MeshStandardMaterial({ map: T.stone, roughness: 0.9, side: THREE.DoubleSide }),
  );
  ring.position.y = 0.35;
  g.add(ring);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.06, 8, 24), M.stone);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.7;
  g.add(rim);
  const dark = new THREE.Mesh(new THREE.CircleGeometry(0.58, 20), mat(0x000000));
  dark.rotation.x = -Math.PI / 2;
  dark.position.y = 0.3;
  g.add(dark);
  // 半分ずれた木のふた
  const lid = box(0.7, 0.05, 1.3, mat(0x3a2a1a), 0.25, 0.72, 0, g);
  lid.rotation.y = 0.3;
  for (const sx of [-1, 1]) box(0.08, 1.5, 0.08, mat(0x2a1e14), sx * 0.7, 0, 0, g);
  box(1.5, 0.08, 0.08, mat(0x2a1e14), 0, 1.5, 0, g);
  cyl(0.008, 0.008, 0.9, mat(0x8a7a5a), 0, 0.6, 0, g);
  return g;
}

export function pond(w = 1.8, d = 1.2) {
  const g = group();
  const p = new THREE.Mesh(new THREE.CircleGeometry(1, 24), M.water);
  p.scale.set(w / 2, d / 2, 1);
  p.rotation.x = -Math.PI / 2;
  p.position.y = 0.02;
  g.add(p);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const r = sphere(0.12, M.stone, Math.cos(a) * w * 0.52, 0.03, Math.sin(a) * d * 0.52, g);
    r.scale.y = 0.5;
  }
  return g;
}

export function steppingStone() {
  const g = group();
  const s = cyl(0.25, 0.27, 0.05, M.stone, 0, 0, 0, g, 10);
  s.scale.z = 0.8;
  return g;
}

// ---------- その他 ----------
export function sheetCovered(w = 0.8, h = 1.4, d = 0.6) {
  const g = group();
  const s = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), mat(0xd8d2c4));
  s.scale.set(w, h, d);
  s.position.y = h * 0.42;
  g.add(s);
  return g;
}

export function brokenChair() {
  const g = group();
  box(0.45, 0.05, 0.45, mat(C.wood), 0, 0.42, 0, g);
  for (const [x, z] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18]]) box(0.04, 0.42, 0.04, mat(C.wood), x, 0, z, g);
  const back = box(0.45, 0.5, 0.04, mat(C.wood), 0, 0.47, -0.2, g);
  back.rotation.z = 0.2;
  g.rotation.z = 0.12;
  return g;
}

export function hearth() {
  const g = group();
  box(0.9, 0.04, 0.9, mat(0x1a1410), 0, 0, 0, g);
  box(0.7, 0.03, 0.7, mat(0x3a3530), 0, 0.01, 0, g);
  const coals = box(0.3, 0.03, 0.3, glow(0x4a1a08, 0xff3a08, 1.2), 0, 0.03, 0, g);
  cyl(0.02, 0.02, 0.3, mat(0x222222), 0.15, 0.04, 0, g);
  const kettle = sphere(0.14, mat(0x1a1a1a, { metalness: 0.5, roughness: 0.5 }), 0, 0.22, 0, g);
  kettle.scale.y = 0.8;
  lightMarker(g, 0, 0.25, 0, 0xff4a10, 1.6, 3.5);
  return g;
}

export function welcomeBoard() {
  const g = group();
  box(0.5, 0.04, 0.3, mat(C.dark), 0, 0, 0, g);
  box(0.04, 1.5, 0.04, mat(C.dark), 0, 0, -0.05, g);
  plane(0.48, 1.25, texMat(T.welcome), 0, 1.0, -0.02, g);
  return g;
}

export function tanuki() {
  const g = group();
  const m = mat(0x6a4a2a, { roughness: 0.4 });
  const body = sphere(0.32, m, 0, 0.32, 0, g);
  body.scale.set(1, 1.1, 0.9);
  sphere(0.22, m, 0, 0.82, 0, g);
  sphere(0.24, mat(0xc8a878, { roughness: 0.4 }), 0, 0.3, 0.12, g);
  for (const sx of [-1, 1]) sphere(0.06, m, sx * 0.14, 1.0, 0, g);
  const hat = cyl(0.05, 0.3, 0.12, mat(0x8a6a3a), 0, 1.0, 0, g);
  hat.position.y = 1.05;
  return g;
}

export function getabako(w = 1.8) {
  const g = group();
  const sh = shelf(w, 1.4, 0.4, 5, 0x6a4a2a);
  g.add(sh);
  for (let i = 1; i < 6; i++) box(0.02, 1.36, 0.38, mat(0x4a321c), -w / 2 + (i * w) / 6, 0, 0, g);
  return g;
}

export function slippers(color = 0x5a6a8a) {
  const g = group();
  for (const x of [-0.07, 0.07]) box(0.11, 0.03, 0.27, mat(color), x, 0, 0, g);
  return g;
}

export function umbrellaStand(R) {
  const g = group();
  cyl(0.18, 0.16, 0.5, mat(0x4a5a5a, { roughness: 0.5 }), 0, 0, 0, g);
  for (let i = 0; i < 4; i++) {
    const u = cyl(0.03, 0.05, 0.9, mat(R.pick([0x1a1a1a, 0x3a1a1a, 0x22304a])), R.range(-0.06, 0.06), 0.15, R.range(-0.06, 0.06), g, 8);
    u.rotation.z = R.range(-0.15, 0.15);
  }
  return g;
}

export function chairSet() {
  const g = group();
  const m = mat(0x5a3a22, { roughness: 0.5 });
  const cl = mat(0x6a6250);
  for (const sx of [-1, 1]) {
    box(0.55, 0.38, 0.55, cl, sx * 0.6, 0, 0, g);
    box(0.55, 0.45, 0.1, cl, sx * 0.6, 0.38, -0.23, g);
    for (const ax of [-1, 1]) box(0.06, 0.6, 0.55, m, sx * 0.6 + ax * 0.3, 0, 0, g);
  }
  cyl(0.28, 0.28, 0.03, mat(0x2a1a0e, { roughness: 0.3 }), 0, 0.5, 0.05, g);
  cyl(0.03, 0.05, 0.5, m, 0, 0, 0.05, g);
  return g;
}

export function fan() {
  const g = group();
  cyl(0.15, 0.17, 0.05, mat(0xd8d8d0), 0, 0, 0, g);
  cyl(0.02, 0.02, 0.9, mat(0xd8d8d0), 0, 0.05, 0, g);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 20, 1, true), mat(0x99a8b8, { side: THREE.DoubleSide }));
  head.rotation.x = Math.PI / 2;
  head.position.set(0, 1.0, 0.05);
  g.add(head);
  return g;
}

export function riceCooker() {
  const g = group();
  cyl(0.25, 0.25, 0.4, mat(0x9a9a92, { metalness: 0.6, roughness: 0.4 }), 0, 0, 0, g);
  return g;
}

export function plates(R) {
  const g = group();
  const n = 3 + Math.floor(R.next() * 6);
  for (let i = 0; i < n; i++) cyl(0.1, 0.08, 0.02, mat(0xe8e2d4, { roughness: 0.3 }), 0, i * 0.022, 0, g);
  g.userData.w = 0.22;
  return g;
}

export function souvenirBox(R) {
  const g = group();
  const w = 0.12 + R.next() * 0.15;
  const h = 0.06 + R.next() * 0.2;
  box(w, h, 0.18, mat(R.pick([0xb02a2a, 0x2a5a8a, 0xd8a83a, 0x3a7a4a, 0xe8d8c0, 0x6a2a6a])), 0, 0, 0, g);
  g.userData.w = w;
  return g;
}

export function basket() {
  const g = group();
  box(0.4, 0.22, 0.32, mat(0x9a7a4a), 0, 0, 0, g);
  g.userData.w = 0.4;
  return g;
}

export function futonPile(R, n = 6) {
  const g = group();
  for (let i = 0; i < n; i++) {
    const f = box(1.0, 0.13, 0.9, mat(R.pick([C.cloth, 0x4a6a8a, 0x8a4a4a, 0x6a7a5a, 0xd8d0c0])), R.range(-0.04, 0.04), i * 0.13, 0, g);
    f.rotation.y = R.range(-0.06, 0.06);
  }
  return g;
}

export function jar(R) {
  const g = group();
  const r = 0.08 + R.next() * 0.06;
  const j = sphere(r, mat(R.pick([0x5a4030, 0x3a3a30, 0x7a5a3a]), { roughness: 0.4 }), 0, r, 0, g);
  j.scale.y = 1.3;
  g.userData.w = r * 2;
  return g;
}

export function bookLedger() {
  const g = group();
  box(0.3, 0.04, 0.22, mat(0x2a3a5a), 0, 0, 0, g);
  box(0.28, 0.035, 0.2, mat(0xe8e0c8), 0, 0.005, 0.005, g);
  return g;
}

export function deskBell() {
  const g = group();
  const b = sphere(0.05, mat(0xc8a040, { metalness: 0.9, roughness: 0.2 }), 0, 0.02, 0, g);
  b.scale.y = 0.7;
  return g;
}

export function phone() {
  const g = group();
  box(0.2, 0.08, 0.22, mat(0x1a1a1a, { roughness: 0.3 }), 0, 0, 0, g);
  box(0.24, 0.04, 0.06, mat(0x1a1a1a, { roughness: 0.3 }), 0, 0.09, 0, g);
  return g;
}

export function postcardRack(R) {
  const g = group();
  cyl(0.02, 0.02, 1.4, mat(0x777777, { metalness: 0.7 }), 0, 0, 0, g);
  for (let i = 0; i < 4; i++)
    for (let k = 0; k < 4; k++) {
      const p = box(0.12, 0.16, 0.005, mat(R.pick([0xd8c8a8, 0x8ab8d8, 0xd88a8a, 0xa8d8a8])), Math.cos(k * 1.57) * 0.08, 0.6 + i * 0.2, Math.sin(k * 1.57) * 0.08, g);
      p.rotation.y = -k * 1.57;
    }
  return g;
}

export function scale() {
  const g = group();
  box(0.35, 0.06, 0.4, mat(0xe0e0d8), 0, 0, 0, g);
  return g;
}

export function cashRegister() {
  const g = group();
  box(0.4, 0.18, 0.35, mat(0x4a4a48), 0, 0, 0, g);
  const t = box(0.3, 0.08, 0.1, mat(0x222222), 0, 0.18, -0.08, g);
  t.rotation.x = -0.4;
  return g;
}

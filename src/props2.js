// 追加の家具・小物（どれも床が原点・正面が +z）
import * as THREE from 'three';
import { M, T } from './textures.js';
import { mat, glow, box, cyl, sphere, plane, lightMarker, C } from './props.js';
import { model } from './models.js';

const group = () => new THREE.Group();

// Higgsfield の 3D モデルがあればそれを使う（light: [x, y, z, color, intensity, range]）
function use(name, fit, light) {
  const m = model(name, fit);
  if (!m) return null;
  if (light) lightMarker(m, ...light);
  return m;
}

function canvasMat(w, h, draw, o = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.8, ...o });
}

export function textPlane(lines, w, h, { bg = '#e8e0cc', fg = '#1a1410', size = 34, vertical = false, border = null } = {}) {
  const pw = 256, ph = Math.round((256 * h) / w);
  const m = canvasMat(pw, ph, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, pw, ph);
    if (border) {
      g.strokeStyle = border;
      g.lineWidth = 8;
      g.strokeRect(6, 6, pw - 12, ph - 12);
    }
    g.fillStyle = fg;
    g.font = `bold ${size}px "Hiragino Mincho ProN", "Yu Mincho", serif`;
    g.textAlign = 'center';
    g.textBaseline = 'top';
    if (vertical) lines.forEach((l, i) => [...l].forEach((ch, k) => g.fillText(ch, pw / 2 + ((lines.length - 1) / 2 - i) * size * 1.2, 20 + k * size * 1.05)));
    else lines.forEach((l, i) => g.fillText(l, pw / 2, 20 + i * size * 1.3));
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
}

// ---------- ロビー・喫茶 ----------
export function sofa(w = 1.8, color = 0x5a3a2a) {
  const mdl = use('sofa', { w });
  if (mdl) return mdl;
  const g = group();
  const m = mat(color, { roughness: 0.7 });
  box(w, 0.42, 0.85, m, 0, 0, 0, g);
  box(w, 0.45, 0.2, m, 0, 0.42, -0.33, g);
  for (const s of [-1, 1]) box(0.18, 0.62, 0.85, m, s * (w / 2 - 0.09), 0, 0, g);
  for (let i = 0; i < Math.round(w / 0.6); i++) box(w / Math.round(w / 0.6) - 0.04, 0.1, 0.6, mat(color + 0x0a0a0a, { roughness: 0.75 }), -w / 2 + (w / Math.round(w / 0.6)) * (i + 0.5), 0.42, 0.08, g);
  return g;
}

export function armchair(color = 0x5a3a2a) {
  return sofa(0.9, color);
}

export function coffeeTable(w = 1.2, d = 0.6) {
  const g = group();
  box(w, 0.05, d, mat(0x2a1a0e, { roughness: 0.3 }), 0, 0.38, 0, g);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.05, 0.38, 0.05, mat(C.dark), sx * (w / 2 - 0.06), 0, sz * (d / 2 - 0.06), g);
  return g;
}

export function rug(w, d, color = 0x6a1e1e) {
  const g = group();
  const m = canvasMat(256, 256, (x) => {
    x.fillStyle = '#' + color.toString(16).padStart(6, '0');
    x.fillRect(0, 0, 256, 256);
    x.strokeStyle = 'rgba(220,190,120,0.6)';
    x.lineWidth = 6;
    x.strokeRect(14, 14, 228, 228);
    x.strokeRect(30, 30, 196, 196);
    for (let i = 0; i < 2000; i++) {
      x.fillStyle = `rgba(0,0,0,${Math.random() * 0.15})`;
      x.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
  });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m);
  p.rotation.x = -Math.PI / 2;
  p.position.y = 0.006;
  g.add(p);
  return g;
}

export function irori(size = 1.4) {
  const g = group();
  box(size, 0.06, size, mat(0x2a1a0c, { roughness: 0.4 }), 0, 0, 0, g);
  box(size - 0.25, 0.05, size - 0.25, mat(0x4a4642), 0, 0.02, 0, g);
  box(0.4, 0.04, 0.4, glow(0x3a1406, 0xff4a10, 1.4), 0, 0.06, 0, g);
  // 自在鉤（天井から吊るす）
  box(0.04, 2.0, 0.04, mat(0x1a1208), 0, 0.6, 0, g);
  box(0.3, 0.05, 0.06, mat(0x2a1a0c), 0, 1.0, 0, g);
  const kettle = sphere(0.18, mat(0x151515, { metalness: 0.5, roughness: 0.5 }), 0, 0.5, 0, g);
  kettle.scale.y = 0.8;
  lightMarker(g, 0, 0.3, 0, 0xff5a18, 2.2, 4.5);
  return g;
}

export function grandfatherClock() {
  const g = group();
  box(0.5, 2.0, 0.32, mat(0x3a1e0e, { roughness: 0.35 }), 0, 0, 0, g);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.17, 24), mat(0xe8dcc0));
  face.position.set(0, 1.62, 0.165);
  g.add(face);
  box(0.02, 0.13, 0.01, mat(C.black), 0, 1.6, 0.17, g).rotation.z = 0.9;
  box(0.3, 0.7, 0.01, mat(0x9aa0a0, { transparent: true, opacity: 0.4 }), 0, 0.6, 0.165, g);
  cyl(0.07, 0.07, 0.01, mat(0xb08a30, { metalness: 0.8 }), 0, 0.7, 0.14, g).rotation.x = Math.PI / 2;
  return g;
}

export function fishTank() {
  const g = group();
  box(1.2, 0.75, 0.45, mat(C.dark), 0, 0, 0, g);
  box(1.2, 0.55, 0.45, mat(0x2a5a5a, { transparent: true, opacity: 0.55, emissive: 0x0a3a40, emissiveIntensity: 0.8, roughness: 0.05 }), 0, 0.75, 0, g);
  // 魚はいない
  for (let i = 0; i < 6; i++) sphere(0.04, mat(0x3a4a2a), -0.45 + i * 0.18, 0.78, 0.1 - (i % 2) * 0.15, g);
  lightMarker(g, 0, 1.2, 0.3, 0x40c0c8, 1.2, 3);
  return g;
}

export function plant(h = 1.2) {
  const g = group();
  cyl(0.18, 0.14, 0.35, mat(0x5a4a3a, { roughness: 0.6 }), 0, 0, 0, g);
  for (let i = 0; i < 9; i++) {
    const l = box(0.05, h * (0.5 + Math.random() * 0.5), 0.2, mat(0x1e3a1e), 0, 0.3, 0, g);
    l.rotation.set((Math.random() - 0.5) * 0.9, (i / 9) * Math.PI * 2, (Math.random() - 0.5) * 0.9);
  }
  return g;
}

export function barCounter(w = 3.6) {
  const g = group();
  box(w, 1.0, 0.55, mat(0x2a1a10, { roughness: 0.4 }), 0, 0, 0, g);
  box(w + 0.1, 0.05, 0.7, mat(0x4a2a14, { roughness: 0.25 }), 0, 1.0, 0.05, g);
  for (let i = 0; i < 6; i++) cyl(0.04, 0.04, 0.25, mat(0x6a2a1a, { transparent: true, opacity: 0.7, roughness: 0.1 }), -w / 2 + 0.4 + i * 0.25, 1.05, -0.1, g, 10);
  // サイフォン
  sphere(0.08, mat(0xd8e8ec, { transparent: true, opacity: 0.5, roughness: 0.05 }), w / 2 - 0.5, 1.15, 0, g);
  cyl(0.05, 0.05, 0.25, mat(0xd8e8ec, { transparent: true, opacity: 0.5, roughness: 0.05 }), w / 2 - 0.5, 1.2, 0, g);
  return g;
}

export function stool() {
  const g = group();
  cyl(0.18, 0.18, 0.07, mat(0x6a1a1a, { roughness: 0.5 }), 0, 0.68, 0, g);
  cyl(0.03, 0.03, 0.68, mat(0x888888, { metalness: 0.8, roughness: 0.3 }), 0, 0, 0, g);
  cyl(0.2, 0.22, 0.03, mat(0x666666, { metalness: 0.8, roughness: 0.3 }), 0, 0, 0, g);
  return g;
}

export function cafeTable() {
  const g = group();
  cyl(0.35, 0.35, 0.03, mat(0x3a2414, { roughness: 0.3 }), 0, 0.7, 0, g);
  cyl(0.03, 0.03, 0.7, mat(C.black), 0, 0, 0, g);
  for (const a of [0, Math.PI]) {
    const ch = group();
    box(0.4, 0.04, 0.4, mat(0x5a2a1a), 0, 0.45, 0, ch);
    box(0.4, 0.45, 0.04, mat(0x5a2a1a), 0, 0.45, -0.18, ch);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.03, 0.45, 0.03, mat(C.black), sx * 0.17, 0, sz * 0.17, ch);
    ch.position.set(Math.sin(a) * 0.6, 0, Math.cos(a) * 0.6);
    ch.rotation.y = a + Math.PI;
    g.add(ch);
  }
  return g;
}

export function jukebox() {
  const mdl = use('jukebox', { h: 1.5 }, [0, 1.2, 0.5, 0xff9030, 1.8, 4]);
  if (mdl) return mdl;
  const g = group();
  box(0.8, 1.2, 0.5, mat(0x5a1a1a, { roughness: 0.3 }), 0, 0, 0, g);
  const top = cyl(0.4, 0.4, 0.5, glow(0xffd080, 0xff8a20, 1.2), 0, 1.2, 0, g, 20);
  top.rotation.x = Math.PI / 2;
  top.scale.set(1, 1, 0.5);
  box(0.6, 0.3, 0.02, glow(0xfff0c0, 0xffb040, 0.8), 0, 0.7, 0.26, g);
  lightMarker(g, 0, 1.3, 0.5, 0xff9030, 1.8, 4);
  return g;
}

// ---------- カラオケ ----------
export function karaokeTV() {
  const mdl = use('karaoke', { h: 1.5 }, [0, 1.1, 0.8, 0x6688ff, 2, 5]);
  if (mdl) return mdl;
  const g = group();
  box(1.0, 0.6, 0.5, mat(0x1a1a1a), 0, 0, 0, g);
  box(0.95, 0.75, 0.6, mat(0x222220), 0, 0.6, 0, g);
  const scr = canvasMat(256, 192, (x) => {
    const gr = x.createLinearGradient(0, 0, 0, 192);
    gr.addColorStop(0, '#1a3a8a');
    gr.addColorStop(1, '#0a0a2a');
    x.fillStyle = gr;
    x.fillRect(0, 0, 256, 192);
    x.fillStyle = '#ffffff';
    x.font = 'bold 22px sans-serif';
    x.textAlign = 'center';
    x.fillText('♪ かごめかごめ', 128, 120);
    x.fillStyle = '#ff6aa0';
    x.fillText('うしろの正面だあれ', 128, 160);
  }, { emissive: 0xffffff, emissiveIntensity: 0.9 });
  scr.emissiveMap = scr.map;
  plane(0.8, 0.6, scr, 0, 0.98, 0.301, g);
  lightMarker(g, 0, 1.0, 0.8, 0x6688ff, 2, 5);
  return g;
}

export function micStand() {
  const g = group();
  cyl(0.15, 0.15, 0.02, mat(0x222222, { metalness: 0.7 }), 0, 0, 0, g);
  cyl(0.012, 0.012, 1.4, mat(0x888888, { metalness: 0.8, roughness: 0.3 }), 0, 0, 0, g);
  sphere(0.04, mat(0x333333, { metalness: 0.5 }), 0, 1.45, 0.03, g);
  return g;
}

export function mirrorBall() {
  const g = group();
  sphere(0.2, mat(0xcccccc, { metalness: 1, roughness: 0.15 }), 0, -0.3, 0, g);
  box(0.01, 0.3, 0.01, mat(C.black), 0, -0.1, 0, g);
  return g;
}

// ---------- 従業員・洗濯 ----------
export function locker(n = 4) {
  const mdl = use('locker', { w: n * 0.44 });
  if (mdl) return mdl;
  const g = group();
  for (let i = 0; i < n; i++) {
    box(0.42, 1.8, 0.5, mat(0x7a8a8a, { metalness: 0.5, roughness: 0.4 }), -((n - 1) * 0.44) / 2 + i * 0.44, 0, 0, g);
    for (let k = 0; k < 4; k++) box(0.25, 0.012, 0.01, mat(0x2a2a2a), -((n - 1) * 0.44) / 2 + i * 0.44, 1.3 + k * 0.04, 0.255, g);
    box(0.03, 0.08, 0.02, mat(0x222222), -((n - 1) * 0.44) / 2 + i * 0.44 + 0.15, 0.95, 0.26, g);
  }
  return g;
}

export function officeTable(w = 1.6, d = 0.8) {
  const g = group();
  box(w, 0.04, d, mat(0xc8c0b0), 0, 0.7, 0, g);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.04, 0.7, 0.04, mat(0x777777, { metalness: 0.6 }), sx * (w / 2 - 0.05), 0, sz * (d / 2 - 0.05), g);
  return g;
}

export function pipeChair() {
  const g = group();
  box(0.4, 0.03, 0.4, mat(0x3a3a3a), 0, 0.44, 0, g);
  box(0.4, 0.3, 0.03, mat(0x3a3a3a), 0, 0.6, -0.2, g);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.02, 0.44, 0.02, mat(0xaaaaaa, { metalness: 0.8 }), sx * 0.18, 0, sz * 0.18, g);
  return g;
}

export function calendar() {
  return textPlane(['昭和六十三年', '八月', '', '日 月 火 水 木 金 土', '　　1 2 3 4 5 6', '7 8 9 ✕ ✕ ✕ ✕'], 0.4, 0.55, { size: 18 });
}

export function timeCard() {
  const g = group();
  box(0.3, 0.35, 0.18, mat(0xd8d0b8), 0, 0, 0, g);
  box(0.4, 0.5, 0.04, mat(0x8a7a5a), 0.4, 0.05, -0.05, g);
  for (let i = 0; i < 8; i++) box(0.06, 0.12, 0.01, mat(0xf0ecd8), 0.25 + (i % 4) * 0.1, 0.32 - Math.floor(i / 4) * 0.2, -0.02, g);
  return g;
}

export function washingMachine(open = false) {
  const mdl = use('washer', { h: 0.85 });
  if (mdl) return mdl;
  const g = group();
  box(0.6, 0.85, 0.6, mat(0xe8e8e0, { roughness: 0.4 }), 0, 0, 0, g);
  const door = cyl(0.2, 0.2, 0.03, mat(0x7a8a90, { transparent: true, opacity: 0.6, roughness: 0.1 }), 0, 0, 0, g, 24);
  door.rotation.x = Math.PI / 2;
  door.position.set(open ? 0.25 : 0, 0.45, open ? 0.45 : 0.3);
  if (open) door.rotation.y = 1.2;
  box(0.5, 0.06, 0.02, mat(0x444444), 0, 0.75, 0.31, g);
  return g;
}

export function ironingBoard() {
  const g = group();
  const b = box(1.2, 0.03, 0.35, mat(0xb8c0c8), 0, 0.85, 0, g);
  b.scale.x = 1;
  for (const r of [0.5, -0.5]) {
    const l = box(0.03, 0.95, 0.03, mat(0x777777, { metalness: 0.7 }), 0, 0, 0, g);
    l.rotation.z = r;
    l.position.y = 0.45;
  }
  box(0.25, 0.12, 0.12, mat(0x6a6a6a, { metalness: 0.6 }), 0.4, 0.88, 0, g);
  return g;
}

export function towelStack(R) {
  const g = group();
  const n = 3 + Math.floor(R.next() * 6);
  for (let i = 0; i < n; i++) box(0.35, 0.06, 0.3, mat(R.chance(0.8) ? 0xf2f0ea : 0x8a9ab0), 0, i * 0.06, 0, g);
  g.userData.w = 0.35;
  return g;
}

// ---------- 食品庫・蔵・書庫 ----------
export function sack(R) {
  const g = group();
  const s = sphere(0.3, mat(0xc8b890, { roughness: 1 }), 0, 0.25, 0, g);
  s.scale.set(1, 0.85, 0.7);
  g.userData.w = 0.55;
  return g;
}

export function riceBags(n = 6) {
  const g = group();
  for (let i = 0; i < n; i++) {
    const b = box(0.7, 0.18, 0.45, mat(0xe8e0c8, { roughness: 1 }), (i % 2) * 0.1, Math.floor(i) * 0.18, 0, g);
    b.rotation.y = (i % 2) * 0.1;
  }
  return g;
}

export function sakeBarrel() {
  const mdl = use('sakedaru', { h: 0.7 });
  if (mdl) return mdl;
  const g = group();
  cyl(0.32, 0.32, 0.6, mat(0xc8b08a), 0, 0, 0, g, 18);
  for (const y of [0.08, 0.5]) cyl(0.335, 0.335, 0.05, mat(0x3a2a1a), 0, y, 0, g, 18);
  const lab = textPlane(['御', '神', '酒'], 0.25, 0.4, { bg: '#c8b08a', vertical: true, size: 40 });
  lab.position.set(0, 0.3, 0.33);
  g.add(lab);
  return g;
}

export function nagamochi() {
  const g = group();
  box(1.4, 0.65, 0.7, mat(0x3a1a0a, { roughness: 0.35 }), 0, 0, 0, g);
  for (const x of [-0.6, 0.6]) box(0.06, 0.66, 0.72, mat(0x222222, { metalness: 0.7, roughness: 0.4 }), x, 0, 0, g);
  box(0.2, 0.15, 0.02, mat(0x8a7a3a, { metalness: 0.8 }), 0, 0.45, 0.36, g);
  return g;
}

export function armorBox() {
  const mdl = use('yoroi', { h: 1.5 });
  if (mdl) return mdl;
  const g = group();
  box(0.6, 0.6, 0.6, mat(0x1a0a0a, { roughness: 0.3 }), 0, 0, 0, g);
  // 兜
  const h = sphere(0.25, mat(0x151515, { metalness: 0.4, roughness: 0.4 }), 0, 0.85, 0, g);
  h.scale.y = 0.8;
  box(0.5, 0.06, 0.06, mat(0xb08a30, { metalness: 0.8 }), 0, 1.0, 0.1, g).rotation.z = 0;
  const mask = box(0.2, 0.16, 0.05, mat(0x6a1010, { roughness: 0.3 }), 0, 0.72, 0.2, g);
  return g;
}

export function bookshelf(R, w = 2.0, h = 2.2) {
  const mdl = use('bookshelf', { w, h, d: 0.36 });
  if (mdl) return mdl;
  const g = group();
  const m = mat(0x3a2412);
  for (const s of [-1, 1]) box(0.04, h, 0.35, m, s * (w / 2 - 0.02), 0, 0, g);
  box(w, h, 0.02, m, 0, 0, -0.17, g);
  const levels = 6;
  for (let i = 0; i <= levels; i++) box(w, 0.03, 0.35, m, 0, (i * (h - 0.03)) / levels, 0, g);
  for (let i = 0; i < levels; i++) {
    let x = -w / 2 + 0.06;
    while (x < w / 2 - 0.1) {
      if (R.chance(0.08)) {
        x += 0.15;
        continue;
      }
      const bw = 0.03 + R.next() * 0.04;
      const bh = 0.2 + R.next() * 0.12;
      const b = box(bw, bh, 0.24, mat(R.pick([0x5a2a1a, 0x2a3a4a, 0x3a3a2a, 0x6a5a3a, 0x1a1a1a, 0x7a6a4a]), { roughness: 0.8 }), x + bw / 2, (i * (h - 0.03)) / levels + 0.03, 0.02, g);
      if (R.chance(0.05)) b.rotation.z = 0.3;
      x += bw + 0.005;
    }
  }
  return g;
}

export function ladder() {
  const g = group();
  for (const s of [-1, 1]) box(0.05, 2.4, 0.05, mat(0x6a4a2a), s * 0.22, 0, 0, g);
  for (let i = 0; i < 7; i++) box(0.44, 0.03, 0.04, mat(0x6a4a2a), 0, 0.25 + i * 0.32, 0, g);
  g.rotation.x = -0.2;
  return g;
}

export function deskLamp() {
  const g = group();
  cyl(0.08, 0.08, 0.02, mat(0x2a4a2a, { metalness: 0.5 }), 0, 0, 0, g);
  cyl(0.01, 0.01, 0.35, mat(0xb08a30, { metalness: 0.8 }), 0, 0, 0, g);
  const shade = cyl(0.04, 0.12, 0.1, glow(0x2a6a3a, 0x0a3a1a, 0.5), 0, 0.3, 0.05, g);
  lightMarker(g, 0, 0.25, 0.1, 0xffe0a0, 1.2, 3);
  return g;
}

export function papers(R, n = 8, spread = 0.6) {
  const g = group();
  for (let i = 0; i < n; i++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.29), mat(0xece6d6));
    p.rotation.set(-Math.PI / 2, 0, R.range(0, 6));
    p.position.set(R.range(-spread, spread), 0.002 + i * 0.001, R.range(-spread, spread));
    g.add(p);
  }
  return g;
}

// ---------- 水まわり・設備 ----------
export function sinkCounter(n = 4) {
  const g = group();
  const w = n * 0.9;
  box(w, 0.8, 0.55, mat(0xd8d4cc), 0, 0, 0, g);
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + 0.45 + i * 0.9;
    cyl(0.2, 0.15, 0.02, mat(0xf4f2ee, { roughness: 0.15 }), x, 0.8, 0.03, g, 20);
    box(0.04, 0.2, 0.04, mat(0xc8ccd0, { metalness: 0.9, roughness: 0.15 }), x, 0.8, -0.18, g);
    box(0.6, 0.75, 0.02, mat(0xa8b2b6, { metalness: 0.9, roughness: 0.12, envMapIntensity: 9 }), x, 1.05, -0.26, g);
    if (i % 2 === 0) box(0.08, 0.1, 0.08, mat(0xe8e0d0), x + 0.25, 0.8, -0.15, g);
  }
  return g;
}

export function boilerTank() {
  const mdl = use('boiler', { h: 2.4 }, [0, 1.6, 1.0, 0xff3010, 1.5, 4]);
  if (mdl) return mdl;
  const g = group();
  const t = cyl(0.7, 0.7, 2.2, mat(0x5a5048, { metalness: 0.6, roughness: 0.5 }), 0, 0.3, 0, g, 20);
  for (const y of [0.5, 1.4, 2.3]) cyl(0.72, 0.72, 0.05, mat(0x3a3028, { metalness: 0.6 }), 0, y, 0, g, 20);
  for (let i = 0; i < 4; i++) box(0.1, 0.3, 0.1, mat(0x3a3028), Math.cos(i * 1.57) * 0.5, 0, Math.sin(i * 1.57) * 0.5, g);
  // 圧力計
  const gauge = cyl(0.12, 0.12, 0.04, mat(0xe8e0d0), 0, 1.6, 0.72, g, 20);
  gauge.rotation.x = Math.PI / 2;
  box(0.01, 0.1, 0.01, mat(0xc01010), 0.02, 1.6, 0.75, g).rotation.z = -2.2;
  box(0.08, 0.08, 0.02, glow(0xff2010, 0xff2010, 2), 0.25, 1.6, 0.71, g);
  lightMarker(g, 0, 1.6, 1.0, 0xff3010, 1.5, 4);
  return g;
}

export function pipes(len = 3, n = 3) {
  const g = group();
  for (let i = 0; i < n; i++) {
    const p = cyl(0.06 + i * 0.02, 0.06 + i * 0.02, len, mat(0x6a5a4a, { metalness: 0.6, roughness: 0.5 }), 0, 0, 0, g, 12);
    p.rotation.z = Math.PI / 2;
    p.position.set(0, 2.1 - i * 0.22, 0);
    const v = cyl(0.08, 0.08, 0.03, mat(0xa01818), len / 2 - 0.4 - i * 0.5, 2.25 - i * 0.22, 0, g, 10);
  }
  return g;
}

export function toiletStall(R) {
  const g = group();
  const m = mat(0x8a7a5a, { roughness: 0.6 });
  box(0.05, 1.9, 1.3, m, -0.48, 0, 0, g);
  box(0.05, 1.9, 1.3, m, 0.48, 0, 0, g);
  // 戸（少し開いている）
  const door = box(0.88, 1.75, 0.04, m, 0, 0.1, 0.65, g);
  door.geometry.translate(0.44, 0, 0);
  door.position.x = -0.44;
  door.rotation.y = -R.range(0.05, 1.2);
  // 和式便器
  box(0.35, 0.08, 0.6, mat(0xe8e6e0, { roughness: 0.2 }), 0, 0, -0.15, g);
  box(0.25, 0.01, 0.45, mat(0x2a3438, { roughness: 0.1 }), 0, 0.08, -0.15, g);
  box(0.3, 0.2, 0.1, mat(0xe8e6e0, { roughness: 0.2 }), 0, 0, -0.5, g);
  box(0.12, 0.12, 0.12, mat(0xf0ece0), 0.38, 0.8, -0.3, g); // 紙
  return g;
}

export function urinal() {
  const g = group();
  box(0.4, 0.6, 0.3, mat(0xe8e6e0, { roughness: 0.2 }), 0, 0.4, 0, g);
  box(0.3, 0.45, 0.02, mat(0xb8bcb8, { roughness: 0.2 }), 0, 0.5, 0.15, g);
  return g;
}

export function toiletSlippers() {
  const g = group();
  for (const x of [-0.07, 0.07]) {
    box(0.11, 0.03, 0.27, mat(0x3a7a4a), x, 0, 0, g);
  }
  const t = textPlane(['便所'], 0.12, 0.06, { bg: '#3a7a4a', fg: '#ffffff', size: 60 });
  t.rotation.x = -Math.PI / 2;
  t.position.set(0, 0.032, 0.05);
  g.add(t);
  return g;
}

export function bareBulb(on = true) {
  const g = group();
  box(0.01, 0.4, 0.01, mat(C.black), 0, -0.2, 0, g);
  sphere(0.05, on ? glow(0xfff0c0, 0xffc060, 2) : mat(0x888880), 0, -0.45, 0, g);
  if (on) lightMarker(g, 0, -0.5, 0, 0xffc070, 2.2, 5);
  return g;
}

// ---------- 祭壇・封印 ----------
export function shimenawa(w = 1.6) {
  const g = group();
  const rope = cyl(0.06, 0.06, w, mat(0xc8b88a, { roughness: 1 }), 0, 0, 0, g, 10);
  rope.rotation.z = Math.PI / 2;
  for (let i = 0; i < 4; i++) {
    const shide = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.3), mat(0xf4f2ec, { side: THREE.DoubleSide }));
    shide.position.set(-w / 2 + (w * (i + 0.5)) / 4, -0.2, 0.04);
    g.add(shide);
  }
  return g;
}

export function altar() {
  const mdl = use('kamidana', { h: 2.0 });
  if (mdl) return mdl;
  const g = group();
  box(1.6, 0.9, 0.7, mat(0xd8c8a0, { roughness: 0.5 }), 0, 0, 0, g);
  box(1.0, 0.3, 0.5, mat(0xd8c8a0), 0, 0.9, -0.05, g);
  // 鏡・榊・御神酒
  const mirror = cyl(0.15, 0.15, 0.03, mat(0xc8c0a0, { metalness: 0.9, roughness: 0.15 }), 0, 1.5, -0.1, g, 24);
  mirror.rotation.x = Math.PI / 2;
  box(0.06, 0.3, 0.06, mat(0x3a2a1a), 0, 1.2, -0.1, g);
  for (const x of [-0.6, 0.6]) {
    cyl(0.05, 0.06, 0.15, mat(0xf0ecdc), x, 0.9, 0.1, g);
    for (let i = 0; i < 6; i++) {
      const l = box(0.08, 0.02, 0.04, mat(0x1e3a1e), x, 1.1 + i * 0.05, 0.1, g);
      l.rotation.y = i;
    }
  }
  for (const x of [-0.25, 0.25]) cyl(0.04, 0.05, 0.18, mat(0xf0ecdc, { roughness: 0.2 }), x, 1.2, 0.1, g);
  sphere(0.1, mat(0xf4f2ec), 0, 1.25, 0.15, g).scale.y = 0.7; // 鏡餅
  const sn = shimenawa(1.8);
  sn.position.set(0, 2.1, 0.2);
  g.add(sn);
  return g;
}

export function chains(w, h) {
  const g = group();
  for (const s of [-1, 1]) {
    const c = cyl(0.025, 0.025, Math.hypot(w, h), mat(0x4a4a48, { metalness: 0.8, roughness: 0.5 }), 0, 0, 0, g, 6);
    c.rotation.z = s * Math.atan2(w, h);
    c.position.y = h / 2;
  }
  return g;
}

export function morijio() {
  const g = group();
  box(0.12, 0.02, 0.12, mat(0xe8e2d4), 0, 0, 0, g);
  cyl(0.001, 0.05, 0.1, mat(0xf8f8f4), 0, 0.02, 0, g, 4);
  return g;
}

export function standMirror(covered = false) {
  const g = group();
  box(0.6, 0.06, 0.35, mat(0x2a1208), 0, 0, 0, g);
  box(0.06, 1.7, 0.06, mat(0x2a1208), -0.3, 0, 0, g);
  box(0.06, 1.7, 0.06, mat(0x2a1208), 0.3, 0, 0, g);
  box(0.5, 1.4, 0.02, covered ? mat(0x6a1010) : mat(0xb8c2c6, { metalness: 0.95, roughness: 0.06, envMapIntensity: 9 }), 0, 0.25, 0.01, g);
  return g;
}

// ---------- 子ども部屋 ----------
export function randoseru() {
  const g = group();
  box(0.3, 0.35, 0.2, mat(0x9a1010, { roughness: 0.35 }), 0, 0, 0, g);
  box(0.3, 0.25, 0.04, mat(0x8a0a0a, { roughness: 0.35 }), 0, 0.15, 0.11, g);
  return g;
}

export function kokeshi(scale = 1) {
  const g = group();
  cyl(0.05, 0.06, 0.25, mat(0xd8b080), 0, 0, 0, g);
  for (const y of [0.05, 0.12, 0.19]) cyl(0.052, 0.052, 0.02, mat(0xa01818), 0, y, 0, g);
  sphere(0.07, mat(0xe8d0a8), 0, 0.32, 0, g);
  const hair = sphere(0.072, mat(0x0a0a0a), 0, 0.34, -0.01, g);
  hair.scale.set(1, 0.8, 1);
  g.scale.setScalar(scale);
  return g;
}

export function drawing(R) {
  const cols = ['#c02020', '#2040c0', '#209040', '#e0a020', '#202020'];
  return new THREE.Mesh(
    new THREE.PlaneGeometry(0.38, 0.27),
    canvasMat(128, 92, (x) => {
      x.fillStyle = '#f2ece0';
      x.fillRect(0, 0, 128, 92);
      x.lineWidth = 3;
      // 手をつないだ子どもたち（ひとりだけ黒くぬりつぶされている）
      for (let i = 0; i < 4; i++) {
        x.strokeStyle = i === 3 ? '#000' : R.pick(cols);
        x.fillStyle = '#000';
        x.beginPath();
        x.arc(20 + i * 28, 30, 9, 0, Math.PI * 2);
        if (i === 3) x.fill();
        x.stroke();
        x.beginPath();
        x.moveTo(20 + i * 28, 39);
        x.lineTo(20 + i * 28, 65);
        x.moveTo(8 + i * 28, 50);
        x.lineTo(32 + i * 28, 50);
        x.stroke();
      }
      x.fillStyle = '#c02020';
      x.font = '12px sans-serif';
      x.fillText('みんなずっといっしょ', 8, 86);
    }),
  );
}

export function smallDesk() {
  const g = group();
  box(0.9, 0.04, 0.5, mat(0x8a6a44), 0, 0.55, 0, g);
  for (const sx of [-1, 1]) box(0.04, 0.55, 0.48, mat(0x6a4a2a), sx * 0.42, 0, 0, g);
  box(0.3, 0.02, 0.21, mat(0xf0ead8), 0.1, 0.59, 0.02, g);
  return g;
}

// ---------- 先生 ----------
export function beerCans(R, n = 5) {
  const g = group();
  for (let i = 0; i < n; i++) {
    const c = cyl(0.033, 0.033, 0.12, mat(R.pick([0xc0c0b8, 0xc8a020, 0x2a4a8a]), { metalness: 0.7, roughness: 0.3 }), R.range(-0.3, 0.3), 0, R.range(-0.3, 0.3), g, 10);
    if (R.chance(0.5)) {
      c.rotation.z = Math.PI / 2;
      c.position.y = 0.033;
    }
  }
  return g;
}

export function ashtray() {
  const g = group();
  cyl(0.08, 0.07, 0.03, mat(0x8a8a88, { metalness: 0.6, roughness: 0.3 }), 0, 0, 0, g, 16);
  for (let i = 0; i < 5; i++) box(0.05, 0.01, 0.01, mat(0xe8e0c8), Math.random() * 0.06 - 0.03, 0.03, Math.random() * 0.06 - 0.03, g).rotation.y = i;
  return g;
}

export function safeBox() {
  const mdl = use('safe', { h: 0.75 });
  if (mdl) return mdl;
  const g = group();
  box(0.6, 0.7, 0.55, mat(0x2a3a2a, { metalness: 0.5, roughness: 0.4 }), 0, 0, 0, g);
  const dial = cyl(0.07, 0.07, 0.03, mat(0xc0c0b0, { metalness: 0.8 }), 0, 0.42, 0.29, g, 16);
  dial.rotation.x = Math.PI / 2;
  box(0.04, 0.15, 0.04, mat(0xc0c0b0, { metalness: 0.8 }), 0.18, 0.4, 0.29, g);
  return g;
}

// ---------- 庭 ----------
export function rock(R, s = 1) {
  const g = group();
  const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5 * s, 0), M.stone);
  r.scale.set(R.range(0.8, 1.4), R.range(0.5, 0.9), R.range(0.8, 1.3));
  r.rotation.set(R.range(0, 1), R.range(0, 6), R.range(0, 1));
  r.position.y = 0.2 * s;
  g.add(r);
  return g;
}

export function bridge(len = 3.2) {
  const g = group();
  const red = mat(0x9a1a10, { roughness: 0.5 });
  const n = 10;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1) - 0.5;
    const y = 0.5 - t * t * 1.6;
    box(1.0, 0.05, len / n + 0.02, mat(0x5a3a22), 0, y, t * len, g);
    for (const s of [-1, 1]) if (i % 3 === 0) box(0.06, 0.6, 0.06, red, s * 0.5, y, t * len, g);
  }
  for (const s of [-1, 1]) {
    for (let i = 0; i < n - 1; i++) {
      const t0 = i / (n - 1) - 0.5, t1 = (i + 1) / (n - 1) - 0.5;
      const y0 = 0.5 - t0 * t0 * 1.6 + 0.55, y1 = 0.5 - t1 * t1 * 1.6 + 0.55;
      const seg = box(0.06, 0.06, len / (n - 1) + 0.03, red, s * 0.5, 0, ((t0 + t1) / 2) * len, g);
      seg.position.y = (y0 + y1) / 2;
      seg.rotation.x = Math.atan2(y0 - y1, len / (n - 1));
    }
  }
  return g;
}

export function bamboo(R, h = 6) {
  const g = group();
  const m = mat(0x5a7a2a, { roughness: 0.5 });
  const b = cyl(0.045, 0.05, h, m, 0, 0, 0, g, 8);
  b.rotation.z = R.range(-0.05, 0.05);
  for (let y = 0.4; y < h; y += 0.45) cyl(0.055, 0.055, 0.02, mat(0x4a6a20), 0, y, 0, g, 8);
  for (let i = 0; i < 3; i++) {
    const l = box(0.4, 0.01, 0.06, mat(0x3a5a1a), 0.15, h * (0.6 + i * 0.12), 0, g);
    l.rotation.y = R.range(0, 6);
  }
  return g;
}

export function gravestone(R) {
  const mdl = use('gravestone', { h: R.range(1.1, 1.4) });
  if (mdl) return mdl;
  const g = group();
  box(0.6, 0.15, 0.5, M.stone, 0, 0, 0, g);
  box(0.45, 0.15, 0.4, M.stone, 0, 0.15, 0, g);
  const h = R.range(0.6, 0.9);
  const st = box(0.28, h, 0.24, M.stone, 0, 0.3, 0, g);
  st.rotation.z = R.range(-0.06, 0.06);
  const t = textPlane([R.pick(['先祖代々之墓', '南無阿弥陀仏', '童女之霊', '倶会一処'])], 0.12, h * 0.8, { bg: '#5a5852', fg: '#1a1a18', vertical: true, size: 40 });
  t.position.set(0, 0.3 + h / 2, 0.121);
  g.add(t);
  if (R.chance(0.6)) cyl(0.04, 0.05, 0.12, mat(0x3a5a3a), 0.2, 0.3, 0.15, g); // 花立て
  return g;
}

export function sotoba(R) {
  const g = group();
  for (let i = 0; i < 4; i++) {
    const b = box(0.08, R.range(1.2, 1.7), 0.015, mat(0x9a8a6a), -0.15 + i * 0.1, 0, 0, g);
    b.rotation.z = R.range(-0.06, 0.06);
  }
  return g;
}

export function jizo(R) {
  const mdl = use('jizo', { h: 0.8 });
  if (mdl) return mdl;
  const g = group();
  box(0.4, 0.2, 0.35, M.stone, 0, 0, 0, g);
  const b = cyl(0.13, 0.17, 0.45, M.stone, 0, 0.2, 0, g, 10);
  sphere(0.12, M.stone, 0, 0.75, 0, g);
  // 赤いよだれかけ
  const bib = cyl(0.14, 0.2, 0.18, mat(0xa01010, { roughness: 0.9 }), 0, 0.48, 0.02, g, 10);
  return g;
}

export function hokora() {
  const g = group();
  box(0.8, 0.5, 0.6, M.stone, 0, 0, 0, g);
  box(0.6, 0.55, 0.5, mat(0x5a3a22), 0, 0.5, 0, g);
  const roof = cyl(0.05, 0.6, 0.3, mat(0x2a2a2a), 0, 1.05, 0, g, 4);
  roof.rotation.y = Math.PI / 4;
  roof.scale.z = 0.8;
  box(0.4, 0.4, 0.02, mat(0x1a0a0a), 0, 0.55, 0.26, g);
  const sn = shimenawa(0.7);
  sn.scale.setScalar(0.6);
  sn.position.set(0, 1.0, 0.3);
  g.add(sn);
  return g;
}

export function fence(len, h = 1.9) {
  const g = group();
  const n = Math.floor(len / 0.09);
  const parts = [];
  for (let i = 0; i < n; i++) box(0.06, h, 0.04, mat(0x4a5a2a), -len / 2 + (i + 0.5) * (len / n), 0, 0, g);
  for (const y of [0.4, 1.4]) box(len, 0.04, 0.06, mat(0x3a2a1a), 0, y, 0.04, g);
  return g;
}

export function hotPool(w, d) {
  const g = group();
  const water = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color: 0x5a7a72, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.85 }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.06;
  g.add(water);
  return g;
}

export function rakedGravel(w, d) {
  const m = canvasMat(512, 512, (x) => {
    x.fillStyle = '#9a968c';
    x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 8000; i++) {
      x.fillStyle = `rgba(${Math.random() < 0.5 ? '60,58,54' : '220,215,205'},${Math.random() * 0.4})`;
      x.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }
    x.strokeStyle = 'rgba(40,38,34,0.35)';
    x.lineWidth = 3;
    for (let y = 8; y < 512; y += 16) {
      x.beginPath();
      x.moveTo(0, y);
      x.lineTo(512, y);
      x.stroke();
    }
  });
  m.map.wrapS = m.map.wrapT = THREE.RepeatWrapping;
  m.map.repeat.set(w / 3, d / 3);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m);
  p.rotation.x = -Math.PI / 2;
  p.position.y = 0.01;
  return p;
}

export function moss(R, r = 0.8) {
  const g = group();
  const p = new THREE.Mesh(new THREE.CircleGeometry(r, 12), mat(0x2a3a1a, { roughness: 1 }));
  p.rotation.x = -Math.PI / 2;
  p.position.y = 0.015;
  p.scale.set(R.range(0.8, 1.3), R.range(0.8, 1.3), 1);
  g.add(p);
  return g;
}

export function deadTree() {
  const g = group();
  const t = cyl(0.12, 0.25, 3.5, mat(0x2a2018), 0, 0, 0, g, 8);
  for (let i = 0; i < 5; i++) {
    const b = cyl(0.03, 0.07, 1.4, mat(0x2a2018), 0, 0, 0, g, 6);
    b.position.set(0, 2.0 + i * 0.3, 0);
    b.rotation.set(Math.random() - 0.5, i * 1.3, 0.9 + Math.random() * 0.4);
    b.translateY(0.6);
  }
  return g;
}

export function bench(w = 1.6) {
  const g = group();
  box(w, 0.05, 0.4, M.hinoki, 0, 0.42, 0, g);
  for (const x of [-w / 2 + 0.1, w / 2 - 0.1]) box(0.06, 0.42, 0.35, M.darkWood, x, 0, 0, g);
  return g;
}

export function kotatsu() {
  const g = group();
  box(0.9, 0.04, 0.9, mat(0x5a3a22, { roughness: 0.4 }), 0, 0.4, 0, g);
  const f = box(1.5, 0.35, 1.5, mat(0x7a2a2a, { roughness: 0.95 }), 0, 0.03, 0, g);
  sphere(0.06, mat(0xe08a20), 0.1, 0.48, 0.1, g);
  sphere(0.06, mat(0xe08a20), -0.05, 0.48, 0.15, g);
  return g;
}

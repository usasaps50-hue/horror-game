// 大浴場（12m 四方の区画）：のれん → 脱衣所 → すりガラスの戸 → 浴場
// ローカル座標：入口は z = -hd の壁の真ん中。脱衣所が手前、浴場が奥。
import * as THREE from 'three';
import { M, T } from './textures.js';
import { mbox, mergedMesh } from './geo.js';
import { H, KAMOI, plainWall, ceiling, glassDoor, ceilingLamp } from './architecture.js';
import * as P from './props.js';

const steamTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,0.9)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();

const waterNormal = (() => {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  const d = g.createImageData(s, s);
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      const a = (x / s) * Math.PI * 2, b = (y / s) * Math.PI * 2;
      const nx = Math.sin(a * 3 + Math.cos(b * 2) * 1.5) * 0.5 + Math.sin(a * 7 + b * 5) * 0.2;
      const ny = Math.cos(b * 4 + Math.sin(a * 2) * 1.5) * 0.5 + Math.cos(b * 9 - a * 3) * 0.2;
      const i = (y * s + x) * 4;
      d.data[i] = 128 + nx * 90;
      d.data[i + 1] = 128 + ny * 90;
      d.data[i + 2] = 255;
      d.data[i + 3] = 255;
    }
  g.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 1.5);
  return t;
})();

function sign(text, w = 0.5, h = 0.7) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 360;
  const g = c.getContext('2d');
  g.fillStyle = '#e8e0cc';
  g.fillRect(0, 0, 256, 360);
  g.strokeStyle = '#6a1a1a';
  g.lineWidth = 8;
  g.strokeRect(10, 10, 236, 340);
  g.fillStyle = '#1a1410';
  g.font = 'bold 30px "Hiragino Mincho ProN", serif';
  g.textAlign = 'center';
  text.split('\n').forEach((l, i) => g.fillText(l, 128, 60 + i * 44));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }));
}

function yukata(R) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ map: T.kimono, color: 0x8899cc, roughness: 0.9 });
  P.box(0.32, 0.07, 0.24, m, 0, 0, 0, g);
  P.box(0.3, 0.05, 0.12, P.mat(0xf2f0e8), 0, 0.07, 0.04, g);
  if (R.chance(0.5)) P.box(0.08, 0.06, 0.04, P.mat(0x2a2a2a), 0.08, 0.07, -0.08, g); // メガネケース
  return g;
}

function washStation(R, withShower = true) {
  const g = new THREE.Group();
  const chrome = P.mat(0xc8ccd0, { metalness: 0.9, roughness: 0.15 });
  // 鏡（少し曇っている）
  P.box(0.5, 0.6, 0.02, P.mat(0x9aa6aa, { metalness: 0.85, roughness: 0.35, envMapIntensity: 7 }), 0, 0.68, 0.02, g);
  P.box(0.54, 0.64, 0.015, M.darkWood, 0, 0.66, 0.005, g);
  // 棚とシャンプー
  P.box(0.5, 0.025, 0.12, P.mat(0xd8d4cc), 0, 0.58, 0.08, g);
  for (const [x, col] of [[-0.15, 0xf0ece0], [-0.05, 0x3a2a24], [0.06, 0x8a2a2a]]) {
    P.cyl(0.03, 0.03, 0.16, P.mat(col, { roughness: 0.35 }), x, 0.6, 0.08, g, 10);
    P.cyl(0.006, 0.006, 0.05, P.mat(0x222222), x, 0.76, 0.08, g, 6);
  }
  // 蛇口
  P.box(0.3, 0.05, 0.05, chrome, 0, 0.4, 0.04, g);
  for (const x of [-0.12, 0.12]) P.cyl(0.03, 0.03, 0.04, P.mat(x < 0 ? 0xc03030 : 0x3050c0), x, 0.38, 0.08, g, 10);
  P.box(0.03, 0.03, 0.12, chrome, 0, 0.38, 0.12, g);
  if (withShower) {
    P.box(0.025, 0.7, 0.025, chrome, 0.2, 0.75, 0.04, g);
    const head = P.cyl(0.035, 0.05, 0.14, chrome, 0.2, 1.45, 0.08, g, 12);
    head.rotation.x = 0.5;
  }
  // 椅子と黄色い桶
  const stool = new THREE.Group();
  P.box(0.32, 0.03, 0.26, P.mat(R.pick([0xe0dcd0, 0xd88a3a, 0x9ab8c8])), 0, 0.22, 0, stool);
  P.box(0.28, 0.22, 0.03, P.mat(0xcfcac0), 0, 0, -0.1, stool);
  P.box(0.28, 0.22, 0.03, P.mat(0xcfcac0), 0, 0, 0.1, stool);
  stool.position.set(-0.05, 0, 0.55);
  stool.rotation.y = R.range(-0.2, 0.2);
  g.add(stool);
  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.12, 20, 1, true), P.mat(0xe8c420, { side: THREE.DoubleSide, roughness: 0.4 }));
  bucket.position.set(R.range(0.15, 0.3), R.chance(0.6) ? 0.06 : 0.31, 0.5);
  g.add(bucket);
  return g;
}

export function buildBath(g, R, c) {
  const { hw, hd } = c;
  const zp = -hd + 4.6; // 仕切りの位置

  // ---------- 床・内装 ----------
  mbox(hw * 2, 0.05, zp + hd, M.woodFloor, 0, -0.05, (zp - hd) / 2, g);
  mbox(hw * 2, 0.05, hd - zp, M.stoneFloor, 0, -0.05, (zp + hd) / 2, g);
  // 浴場の壁：下はタイル、上はひのきの板（部屋の壁の内側に貼る）
  for (const [x, z, w, d] of [[-hw + 0.02, (zp + hd) / 2, 0.03, hd - zp], [hw - 0.02, (zp + hd) / 2, 0.03, hd - zp]]) {
    mbox(w, 1.3, d, M.mosaic, x, 0, z, g);
    mbox(w, H - 1.3, d, M.hinoki, x, 1.3, z, g);
  }
  // 脱衣所の壁：腰板
  for (const [x, z, w, d] of [[-hw + 0.02, (zp - hd) / 2, 0.03, zp + hd], [hw - 0.02, (zp - hd) / 2, 0.03, zp + hd]]) mbox(w, 1.1, d, M.hinoki, x, 0, z, g);

  // 仕切り（z = zp）：すりガラスの引き戸
  const dw = 1.4;
  const side = (hw * 2 - dw) / 2;
  for (const sx of [-1, 1]) {
    const w = plainWall(side, M.mosaic, M.hinoki);
    w.position.set(sx < 0 ? -hw : dw / 2, 0, zp);
    g.add(w);
  }
  mbox(dw, H - KAMOI, 0.08, M.hinoki, 0, KAMOI, zp, g);
  mbox(dw, 0.03, 0.12, M.hinoki, 0, 0, zp, g);
  {
    const panel = glassDoor(dw + 0.04, KAMOI - 0.02);
    panel.userData.dynamic = true;
    const base = new THREE.Vector3(0, 0.01, zp - 0.07);
    panel.position.copy(base);
    g.add(panel);
    const door = { panel, base, axis: new THREE.Vector3(1, 0, 0), dist: dw - 0.05, t: 0, open: false, sound: 'glass' };
    c.addDoor(door, panel, new THREE.Vector3(0, KAMOI / 2, zp), [dw, KAMOI, 0.2]);
  }

  // ---------- 浴場 ----------
  const mural = new THREE.Mesh(new THREE.PlaneGeometry(hw * 2 - 0.6, 2.0), M.fuji);
  mural.position.set(0, 1.55, hd - 0.04);
  mural.rotation.y = Math.PI;
  g.add(mural);
  mbox(hw * 2 - 0.4, 0.55, 0.03, M.mosaic, 0, 0, hd - 0.03, g);

  // ひのきの湯船（奥の壁ぞい）
  const tub = new THREE.Group();
  const tx0 = -hw + 0.1, tx1 = hw - 2.2, tz0 = hd - 2.9, tz1 = hd - 0.05, th = 0.55, rim = 0.14;
  const tw = tx1 - tx0, td = tz1 - tz0, tcx = (tx0 + tx1) / 2, tcz = (tz0 + tz1) / 2;
  mbox(tw, th, rim, M.hinoki, tcx, 0, tz0 + rim / 2, tub);
  mbox(rim, th, td, M.hinoki, tx1 - rim / 2, 0, tcz, tub);
  mbox(tw, 0.04, rim + 0.04, M.hinoki, tcx, th, tz0 + rim / 2, tub);
  mbox(rim + 0.04, 0.04, td, M.hinoki, tx1 - rim / 2, th, tcz, tub);
  mbox(tw, 0.02, td, P.mat(0x3a4a48), tcx, 0, tcz, tub);
  tub.userData.solid = true;
  g.add(tub);
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(tw - rim, td - rim),
    new THREE.MeshStandardMaterial({
      color: 0x5e8e92, roughness: 0.04, metalness: 0.15, transparent: true, opacity: 0.82,
      normalMap: waterNormal, normalScale: new THREE.Vector2(0.25, 0.25),
    }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(tcx - rim / 2, th - 0.08, tcz + rim / 2);
  water.userData.dynamic = true;
  g.add(water);
  // 岩と竹の湯口
  for (let i = 0; i < 7; i++) {
    const r = P.sphere(R.range(0.18, 0.32), M.stone, tx0 + 0.3 + R.range(0, 0.6), R.range(0.4, 0.7), tz1 - 0.3 - R.range(0, 0.5), g);
    r.scale.set(1, R.range(0.6, 0.9), 1);
  }
  const bamboo = P.cyl(0.04, 0.04, 0.7, P.mat(0x6a7a3a, { roughness: 0.5 }), 0, 0, 0, null, 10);
  bamboo.rotation.z = Math.PI / 2 - 0.25;
  bamboo.position.set(tx0 + 0.75, 1.05, tz1 - 0.55);
  g.add(bamboo);
  const pour = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.03, 0.62, 8), new THREE.MeshStandardMaterial({ color: 0xcfe8ec, transparent: true, opacity: 0.45, roughness: 0.05 }));
  pour.position.set(tx0 + 1.1, 0.72, tz1 - 0.55);
  g.add(pour);
  mbox(tw, 0.006, 0.08, P.mat(0x1a1a1a), tcx, 0, tz0 - 0.08, g);
  c.steam(tcx, tcz, tw, td);
  c.updaters.push({
    userData: {
      update(dt, time) {
        waterNormal.offset.x = time * 0.02;
        waterNormal.offset.y = time * 0.013;
      },
    },
  });

  // 洗い場（左右の壁ぞい）
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const z = zp + 0.9 + i * 1.2;
      if (sx > 0 && z > tz0 - 0.4) continue;
      const s = washStation(R);
      s.position.set(sx * (hw - 0.05), 0, z);
      s.rotation.y = -sx * Math.PI / 2;
      g.add(s);
    }
  }
  // 積み重ねた桶
  for (let i = 0; i < 6; i++) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.12, 20, 1, true), P.mat(0xe8c420, { side: THREE.DoubleSide, roughness: 0.4 }));
    b.position.set(hw - 1.0, 0.06 + i * 0.05, hd - 0.6);
    g.add(b);
  }
  for (const x of [-2.5, 2.5]) {
    const l = new THREE.Group();
    P.cyl(0.2, 0.22, 0.12, P.glow(0xffffff, 0xffe2b8, 1.2), 0, -0.12, 0, l, 20);
    P.lightMarker(l, 0, -0.4, 0, 0xffd8a8, 3.2, 7);
    l.position.set(x, H, (zp + hd) / 2);
    g.add(l);
  }

  // ---------- 脱衣所 ----------
  for (const sx of [-1, 1]) {
    const sh = P.shelf(2.2, 1.75, 0.45, 4, 0x6a4a2a);
    sh.rotation.y = -sx * Math.PI / 2;
    sh.position.set(sx * (hw - 0.3), 0, -hd + 2.6);
    for (let lv = 0; lv < 4; lv++)
      for (let k = 0; k < 4; k++) {
        const b = P.basket();
        b.position.set(-0.8 + k * 0.53, (lv * 1.7) / 4 + 0.03, 0.02);
        sh.add(b);
        if (R.chance(0.3)) {
          const y = yukata(R);
          y.position.set(-0.8 + k * 0.53, (lv * 1.7) / 4 + 0.08, 0.02);
          sh.add(y);
        }
      }
    sh.userData.solid = true;
    g.add(sh);
  }
  // 洗面台（仕切りの手前側）
  for (const sx of [-1, 1]) {
    const vanity = P.counter(2.6, 0.8, 0.5, 0xd8d0c0, 0xe8e4dc);
    vanity.position.set(sx * (dw / 2 + 0.3 + 1.3), 0, zp - 0.32);
    vanity.rotation.y = Math.PI;
    vanity.userData.solid = true;
    g.add(vanity);
    for (let i = 0; i < 2; i++) {
      const x = sx * (dw / 2 + 0.3 + 0.65 + i * 1.3);
      mbox(0.9, 0.9, 0.02, P.mat(0xa8b2b6, { metalness: 0.9, roughness: 0.1, envMapIntensity: 9 }), x, 1.05, zp - 0.06, g);
      P.box(0.9, 0.06, 0.06, P.glow(0xfff4e0, 0xffe8c0, 1.4), x, 2.0, zp - 0.08, g);
      P.cyl(0.18, 0.14, 0.02, P.mat(0xf4f2ee, { roughness: 0.2 }), x, 0.79, zp - 0.32, g, 20);
      const dryer = P.box(0.08, 0.2, 0.08, P.mat(0xe8e8e8), x + 0.45, 1.2, zp - 0.1, g);
      dryer.rotation.z = 0.3;
    }
    P.lightMarker(g, sx * 3, 1.9, zp - 0.6, 0xffe0b8, 1.2, 3.5);
  }
  const bench = new THREE.Group();
  P.box(1.8, 0.05, 0.4, M.hinoki, 0, 0.4, 0, bench);
  for (const x of [-0.8, 0.8]) P.box(0.06, 0.4, 0.35, M.darkWood, x, 0, 0, bench);
  bench.position.set(0, 0, -hd + 2.4);
  bench.rotation.y = Math.PI / 2;
  bench.userData.solid = true;
  g.add(bench);
  const sc = P.scale();
  sc.position.set(-1.6, 0, -hd + 1.0);
  g.add(sc);
  const fan = P.fan();
  fan.position.set(hw - 0.6, 0, -hd + 0.6);
  fan.rotation.y = -0.8;
  g.add(fan);
  const mc = P.massageChair();
  mc.position.set(-hw + 0.8, 0, zp - 1.4);
  mc.rotation.y = Math.PI / 2;
  mc.userData.solid = true;
  g.add(mc);
  mbox(1.0, 0.012, 0.6, P.mat(0x4a6a8a), 0, 0, zp - 0.5, g, false);
  const poster = sign('入浴の心得\n\n一、かけ湯をしてから\n一、タオルは湯船に\n　入れないでください\n一、夜十一時以降の\n　入浴はご遠慮ください');
  poster.position.set(hw - 0.05, 1.4, -hd + 1.2);
  poster.rotation.y = -Math.PI / 2;
  g.add(poster);
  const lamp = ceilingLamp(true);
  lamp.position.set(0, H - 0.05, -hd + 2.3);
  g.add(lamp);
}

// 大浴場：のれん → 脱衣所 → すりガラスの戸 → 浴場
// ローカル座標：x ∈ [-8, 8], z ∈ [-4, 4]。z = -4 が廊下側の壁（廊下が作る）。
// 脱衣所は x ∈ [0, 8]（入口は x = 4）、浴場は x ∈ [-8, 0]。
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
  P.box(0.5, 0.6, 0.02, P.mat(0x9aa6aa, { metalness: 0.85, roughness: 0.35 }), 0, 0.68, 0.02, g);
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

export function buildBath(g, R, ctx) {
  // ---------- 床・天井 ----------
  mbox(8, 0.05, 8, M.woodFloor, 4, -0.05, 0, g);
  mbox(8, 0.05, 8, M.stoneFloor, -4, -0.05, 0, g);
  ceiling(16, 8, 0, 0, g);

  // ---------- 壁 ----------
  const place = (w, x, z, ry) => {
    w.position.set(x, 0, z);
    w.rotation.y = ry;
    g.add(w);
  };
  place(plainWall(8, M.hinoki), 0, 3.97, 0); // 脱衣所の奥
  place(plainWall(8, M.mosaic, M.mosaic), -8, 3.97, 0); // 浴場の奥（壁画の下地）
  place(plainWall(8, M.mosaic, M.hinoki), -7.97, 4, Math.PI / 2);
  place(plainWall(8, M.hinoki), 7.97, 4, Math.PI / 2);

  // 仕切り（x = 0）：すりガラスの引き戸
  const d0 = 0.3, d1 = 1.7;
  place(plainWall(d0 + 4, M.mosaic), 0, d0, Math.PI / 2);
  place(plainWall(4 - d1, M.mosaic), 0, 4, Math.PI / 2);
  mbox(0.1, H - KAMOI, d1 - d0, M.hinoki, 0, KAMOI, (d0 + d1) / 2, g);
  mbox(0.12, 0.03, d1 - d0, M.hinoki, 0, 0, (d0 + d1) / 2, g);
  {
    const panel = glassDoor(d1 - d0 + 0.04, KAMOI - 0.02);
    panel.userData.dynamic = true;
    panel.rotation.y = Math.PI / 2;
    const base = new THREE.Vector3(0.06, 0.01, (d0 + d1) / 2);
    panel.position.copy(base);
    g.add(panel);
    const door = { panel, base, axis: new THREE.Vector3(0, 0, -1), dist: d1 - d0 - 0.05, t: 0, open: false, sound: 'glass' };
    panel.traverse((o) => (o.userData.door = door));
    ctx.doors.push(door);
    ctx.interactables.push(panel);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.2, KAMOI, d1 - d0));
    hit.position.set(0, KAMOI / 2, (d0 + d1) / 2);
    hit.visible = false;
    hit.userData.doorCollider = door;
    g.add(hit);
  }

  // ---------- 浴場 ----------
  // 富士山の壁画
  const mural = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 2.0), M.fuji);
  mural.position.set(-4, 1.6, 3.93);
  mural.rotation.y = Math.PI;
  g.add(mural);
  mbox(7.5, 0.04, 0.05, M.hinoki, -4, 2.6, 3.92, g);

  // ひのきの湯船
  const tub = new THREE.Group();
  const tx0 = -7.7, tx1 = -1.3, tz0 = 1.25, tz1 = 3.92, th = 0.55, rim = 0.14;
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
  // 排水溝
  mbox(tw, 0.006, 0.08, P.mat(0x1a1a1a), tcx, 0, tz0 - 0.08, g);

  // 湯気
  const n = 140;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = R.range(tx0, tx1);
    pos[i * 3 + 1] = R.range(0.5, 2.5);
    pos[i * 3 + 2] = R.range(tz0, tz1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const steam = new THREE.Points(geo, new THREE.PointsMaterial({
    map: steamTex, size: 1.4, transparent: true, opacity: 0.09, depthWrite: false, color: 0xdde4e6,
  }));
  steam.userData.dynamic = true;
  g.add(steam);
  ctx.updaters.push({
    userData: {
      update(dt, time) {
        const a = geo.attributes.position;
        for (let i = 0; i < n; i++) {
          let y = a.getY(i) + dt * 0.18;
          if (y > 2.6) y = 0.5;
          a.setY(i, y);
          a.setX(i, a.getX(i) + Math.sin(time * 0.5 + i) * dt * 0.05);
        }
        a.needsUpdate = true;
        waterNormal.offset.x = time * 0.02;
        waterNormal.offset.y = time * 0.013;
      },
    },
  });

  // 洗い場（廊下側の壁ぞい・西の壁ぞい）
  for (let i = 0; i < 5; i++) {
    const s = washStation(R);
    s.position.set(-7.0 + i * 1.25, 0, -3.95);
    g.add(s);
  }
  for (let i = 0; i < 2; i++) {
    const s = washStation(R);
    s.position.set(-7.95, 0, -1.9 + i * 1.3);
    s.rotation.y = Math.PI / 2;
    g.add(s);
  }
  // 積み重ねた桶と椅子
  for (let i = 0; i < 6; i++) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.12, 20, 1, true), P.mat(0xe8c420, { side: THREE.DoubleSide, roughness: 0.4 }));
    b.position.set(-0.55, 0.06 + i * 0.05, 3.3);
    g.add(b);
  }
  // 浴場の照明（丸い防湿灯）
  for (const x of [-5.6, -2.4]) {
    const l = new THREE.Group();
    P.cyl(0.2, 0.22, 0.12, P.glow(0xffffff, 0xffe2b8, 1.2), 0, -0.12, 0, l, 20);
    P.lightMarker(l, 0, -0.4, 0, 0xffd8a8, 3.2, 7);
    l.position.set(x, H, -0.5);
    g.add(l);
  }

  // ---------- 脱衣所 ----------
  // 棚とかご（いくつかには浴衣が残っている）
  for (const z of [-2.0, 0.6]) {
    const sh = P.shelf(2.2, 1.75, 0.45, 4, 0x6a4a2a);
    sh.rotation.y = -Math.PI / 2;
    sh.position.set(7.7, 0, z);
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
  // 洗面台
  const vanity = P.counter(3.8, 0.8, 0.55, 0xd8d0c0, 0xe8e4dc);
  vanity.position.set(4, 0, 3.6);
  vanity.rotation.y = Math.PI;
  vanity.userData.solid = true;
  g.add(vanity);
  for (let i = 0; i < 3; i++) {
    const x = 2.75 + i * 1.25;
    mbox(0.9, 0.9, 0.02, P.mat(0xa8b2b6, { metalness: 0.9, roughness: 0.1 }), x, 1.05, 3.92, g);
    const bulb = P.box(0.9, 0.06, 0.06, P.glow(0xfff4e0, 0xffe8c0, 1.4), x, 2.0, 3.9, g);
    P.lightMarker(g, x, 1.9, 3.5, 0xffe0b8, 1.0, 3);
    P.cyl(0.18, 0.14, 0.02, P.mat(0xf4f2ee, { roughness: 0.2 }), x, 0.79, 3.6, g, 20);
    const dryer = P.box(0.08, 0.2, 0.08, P.mat(0xe8e8e8), x + 0.45, 1.2, 3.85, g);
    dryer.rotation.z = 0.3;
  }
  // ベンチ・体重計・扇風機・マッサージチェア・冷水器
  const bench = new THREE.Group();
  P.box(1.8, 0.05, 0.4, M.hinoki, 0, 0.4, 0, bench);
  for (const x of [-0.8, 0.8]) P.box(0.06, 0.4, 0.35, M.darkWood, x, 0, 0, bench);
  bench.position.set(4, 0, 0.3);
  bench.userData.solid = true;
  g.add(bench);
  const sc = P.scale();
  sc.position.set(1.0, 0, -2.6);
  g.add(sc);
  const fan = P.fan();
  fan.position.set(7.3, 0, 3.0);
  fan.rotation.y = -2.4;
  g.add(fan);
  const mc = P.massageChair();
  mc.position.set(7.0, 0, -3.2);
  mc.rotation.y = -Math.PI / 2 - 0.3;
  mc.userData.solid = true;
  g.add(mc);
  const cooler = new THREE.Group();
  P.box(0.4, 1.0, 0.35, P.mat(0xd8d8d0), 0, 0, 0, cooler);
  P.cyl(0.14, 0.14, 0.35, P.mat(0x9ac8e0, { transparent: true, opacity: 0.6 }), 0, 1.0, 0, cooler);
  cooler.position.set(1.2, 0, -3.5);
  cooler.userData.solid = true;
  g.add(cooler);
  // マット・貼り紙・時計
  mbox(0.9, 0.012, 0.6, P.mat(0x4a6a8a), 0.6, 0, 1.0, g, false);
  const poster = sign('入浴の心得\n\n一、かけ湯をしてから\n一、タオルは湯船に\n　入れないでください\n一、夜十一時以降の\n　入浴はご遠慮ください');
  poster.position.set(0.04, 1.4, -1.6);
  poster.rotation.y = Math.PI / 2;
  g.add(poster);
  const clk = P.clock();
  clk.position.set(4, 2.2, 3.9);
  clk.rotation.y = Math.PI;
  g.add(clk);
  // 脱衣所の照明
  const lamp = ceilingLamp(true);
  lamp.position.set(4, H - 0.05, -0.6);
  g.add(lamp);
}

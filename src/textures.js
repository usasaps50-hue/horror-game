// 画像ファイルを使わず、canvas で和風の質感を描く
import * as THREE from 'three';

const R = Math.random;

function tex(w, h, draw, unitW = 1, unitH = unitW, repeat = true) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1 / unitW, 1 / unitH);
  }
  return t;
}

function speckle(g, w, h, n, rgb, aMax) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = `rgba(${rgb},${R() * aMax})`;
    const s = 1 + R() * 2;
    g.fillRect(R() * w, R() * h, s, s);
  }
}

function stains(g, w, h, n, rgb, aMax) {
  for (let i = 0; i < n; i++) {
    const x = R() * w, y = R() * h, r = 10 + R() * w * 0.3;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${rgb},${R() * aMax})`);
    gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  }
}

function verticalText(g, lines, x0, y0, size, gap, color) {
  g.fillStyle = color;
  g.font = `bold ${size}px "Hiragino Mincho ProN", "Yu Mincho", serif`;
  g.textAlign = 'center';
  g.textBaseline = 'top';
  lines.forEach((line, i) => {
    [...line].forEach((ch, j) => g.fillText(ch, x0 - i * gap, y0 + j * size * 1.05));
  });
}

export const T = {
  tatami: tex(256, 512, (g, w, h) => {
    g.fillStyle = '#9c8f55';
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) {
      g.fillStyle = `rgba(${R() < 0.5 ? '60,52,22' : '190,180,120'},${0.08 + R() * 0.12})`;
      g.fillRect(0, y, w, 1);
    }
    speckle(g, w, h, 1500, '40,35,15', 0.25);
    stains(g, w, h, 3, '50,40,20', 0.2);
    g.fillStyle = '#1d271b';
    g.fillRect(0, 0, 14, h);
    g.fillRect(w - 14, 0, 14, h);
    g.fillStyle = 'rgba(0,0,0,0.4)';
    g.fillRect(0, h - 2, w, 2);
  }, 0.9, 1.8),

  woodFloor: tex(512, 512, (g, w, h) => {
    const n = 6, rh = h / n;
    for (let i = 0; i < n; i++) {
      const b = 55 + R() * 25;
      g.fillStyle = `rgb(${(b + 35) | 0},${(b + 12) | 0},${(b - 18) | 0})`;
      g.fillRect(0, i * rh, w, rh);
      for (let k = 0; k < 30; k++) {
        g.strokeStyle = `rgba(25,12,4,${R() * 0.3})`;
        g.lineWidth = 1 + R() * 1.5;
        const y = i * rh + R() * rh;
        g.beginPath();
        g.moveTo(0, y);
        g.bezierCurveTo(w * 0.3, y + (R() - 0.5) * 8, w * 0.6, y + (R() - 0.5) * 8, w, y);
        g.stroke();
      }
      g.fillStyle = 'rgba(10,5,2,0.85)';
      g.fillRect(0, i * rh, w, 2);
      g.fillRect(R() * w, i * rh, 2, rh);
    }
    stains(g, w, h, 4, '15,8,2', 0.25);
  }, 1.2, 1.2),

  plaster: tex(256, 256, (g, w, h) => {
    g.fillStyle = '#a3937a';
    g.fillRect(0, 0, w, h);
    speckle(g, w, h, 4000, '60,50,35', 0.25);
    speckle(g, w, h, 2000, '220,210,190', 0.15);
    stains(g, w, h, 5, '70,55,35', 0.18);
  }, 1.5),

  shoji: tex(256, 512, (g, w, h) => {
    g.fillStyle = '#ddd5bf';
    g.fillRect(0, 0, w, h);
    speckle(g, w, h, 800, '150,140,110', 0.2);
    stains(g, w, h, 2, '140,120,80', 0.15);
    g.fillStyle = '#3b2a1a';
    for (let i = 1; i < 3; i++) g.fillRect((w * i) / 3 - 2, 0, 5, h);
    for (let i = 1; i < 6; i++) g.fillRect(0, (h * i) / 6 - 2, w, 5);
    g.fillRect(0, 0, 10, h);
    g.fillRect(w - 10, 0, 10, h);
    g.fillRect(0, 0, w, 10);
    g.fillRect(0, h - 10, w, 10);
  }, 0.9, 1.8),

  fusuma: tex(256, 512, (g, w, h) => {
    g.fillStyle = '#c8b88e';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 7; i++) {
      g.fillStyle = `rgba(175,145,70,${0.15 + R() * 0.2})`;
      g.beginPath();
      g.ellipse(R() * w, R() * h, 30 + R() * 60, 10 + R() * 20, 0, 0, Math.PI * 2);
      g.fill();
    }
    speckle(g, w, h, 1500, '90,75,40', 0.2);
    stains(g, w, h, 3, '90,70,40', 0.2);
    g.fillStyle = '#140c06';
    g.fillRect(0, 0, 7, h);
    g.fillRect(w - 7, 0, 7, h);
    g.fillRect(0, 0, w, 7);
    g.fillRect(0, h - 7, w, 7);
    g.beginPath();
    g.arc(w * 0.82, h * 0.5, 9, 0, Math.PI * 2);
    g.fill();
  }, 0.9, 1.8),

  woodPanel: tex(256, 512, (g, w, h) => {
    const n = 5, cw = w / n;
    for (let i = 0; i < n; i++) {
      const b = 50 + R() * 20;
      g.fillStyle = `rgb(${(b + 30) | 0},${(b + 10) | 0},${(b - 15) | 0})`;
      g.fillRect(i * cw, 0, cw, h);
      for (let k = 0; k < 14; k++) {
        g.fillStyle = `rgba(20,10,3,${R() * 0.25})`;
        g.fillRect(i * cw + R() * cw, 0, 1, h);
      }
      g.fillStyle = 'rgba(8,4,1,0.9)';
      g.fillRect(i * cw, 0, 2, h);
    }
  }, 0.9, 1.8),

  tile: tex(256, 256, (g, w, h) => {
    const n = 4, s = w / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const b = 105 + R() * 25;
        g.fillStyle = `rgb(${(b - 10) | 0},${(b + 5) | 0},${(b + 10) | 0})`;
        g.fillRect(i * s, j * s, s, s);
      }
    speckle(g, w, h, 600, '30,35,35', 0.3);
    stains(g, w, h, 3, '50,45,30', 0.25);
    g.fillStyle = '#2a2c2b';
    for (let i = 0; i <= n; i++) {
      g.fillRect(i * s - 2, 0, 4, h);
      g.fillRect(0, i * s - 2, w, 4);
    }
  }, 0.6),

  gravel: tex(256, 256, (g, w, h) => {
    g.fillStyle = '#56534e';
    g.fillRect(0, 0, w, h);
    speckle(g, w, h, 6000, '180,175,165', 0.5);
    speckle(g, w, h, 4000, '20,20,18', 0.5);
  }, 1),

  stone: tex(256, 256, (g, w, h) => {
    g.fillStyle = '#6a6862';
    g.fillRect(0, 0, w, h);
    speckle(g, w, h, 5000, '30,30,28', 0.35);
    speckle(g, w, h, 2000, '170,168,160', 0.25);
    stains(g, w, h, 4, '40,50,30', 0.3);
  }, 1),

  ceiling: tex(512, 512, (g, w, h) => {
    const n = 8, cw = w / n;
    for (let i = 0; i < n; i++) {
      const b = 45 + R() * 18;
      g.fillStyle = `rgb(${(b + 28) | 0},${(b + 10) | 0},${(b - 12) | 0})`;
      g.fillRect(i * cw, 0, cw, h);
    }
    g.fillStyle = '#1a0f07';
    for (let i = 0; i < 4; i++) g.fillRect(0, (i * h) / 4, w, 10);
    stains(g, w, h, 3, '10,5,0', 0.35);
  }, 1.8),

  kimono: tex(256, 256, (g, w, h) => {
    g.fillStyle = '#6e1a1a';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 14; i++) {
      const x = R() * w, y = R() * h, r = 8 + R() * 14;
      g.fillStyle = R() < 0.5 ? 'rgba(230,210,200,0.7)' : 'rgba(220,150,150,0.6)';
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        g.beginPath();
        g.arc(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.45, 0, Math.PI * 2);
        g.fill();
      }
    }
    stains(g, w, h, 4, '20,5,5', 0.35);
  }, 0.5),

  scroll: tex(128, 384, (g, w, h) => {
    g.fillStyle = '#34402f';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#d6cba9';
    g.fillRect(14, 50, w - 28, h - 100);
    stains(g, w, h, 3, '120,90,40', 0.3);
    verticalText(g, [['夢', '幻', '泡', '影'].join('')], w / 2, 70, 44, 0, '#111');
  }, 1, 1, false),

  welcome: tex(192, 512, (g, w, h) => {
    g.fillStyle = '#b89c6c';
    g.fillRect(0, 0, w, h);
    speckle(g, w, h, 1500, '80,55,25', 0.3);
    g.strokeStyle = '#3a2412';
    g.lineWidth = 8;
    g.strokeRect(4, 4, w - 8, h - 8);
    verticalText(g, ['歓迎'], w / 2, 18, 46, 0, '#7a0f0f');
    verticalText(g, ['第二小学校', '修学旅行御一行様'], w / 2 + 26, 130, 34, 52, '#151008');
  }, 1, 1, false),

  ofuda: tex(64, 192, (g, w, h) => {
    g.fillStyle = '#e6dfcc';
    g.fillRect(0, 0, w, h);
    stains(g, w, h, 2, '120,100,60', 0.3);
    g.fillStyle = 'rgba(170,20,20,0.85)';
    g.fillRect(w / 2 - 14, 18, 28, 28);
    verticalText(g, ['封鎮魂'], w / 2, 62, 36, 0, '#111');
  }, 1, 1, false),

  portrait: tex(128, 160, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#3a3a38');
    gr.addColorStop(1, '#141413');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#8a8780';
    g.beginPath();
    g.ellipse(w / 2, h * 0.42, 24, 30, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#0d0d0c';
    g.fillRect(w / 2 - 30, h * 0.18, 60, 22);
    g.fillRect(w / 2 - 50, h * 0.72, 100, h);
    g.fillStyle = 'rgba(0,0,0,0.85)';
    g.fillRect(w / 2 - 16, h * 0.38, 9, 4);
    g.fillRect(w / 2 + 7, h * 0.38, 9, 4);
    speckle(g, w, h, 900, '200,200,190', 0.15);
  }, 1, 1, false),

  temari: tex(128, 64, (g, w, h) => {
    g.fillStyle = '#7a1c22';
    g.fillRect(0, 0, w, h);
    const cols = ['#d9b24a', '#2b4a7a', '#e8e0d0', '#2f6b45'];
    for (let i = 0; i < 16; i++) {
      g.strokeStyle = cols[i % cols.length];
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo((i * w) / 16, 0);
      g.lineTo(((i + 4) * w) / 16, h);
      g.moveTo(((i + 4) * w) / 16, 0);
      g.lineTo((i * w) / 16, h);
      g.stroke();
    }
    g.fillStyle = '#d9b24a';
    g.fillRect(0, h / 2 - 2, w, 4);
  }, 1, 1, false),

  moonWindow: tex(512, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#0c1a33');
    gr.addColorStop(1, '#04070d');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#d8dfe8';
    g.beginPath();
    g.arc(w * 0.72, h * 0.28, 22, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#020305';
    for (let i = 0; i < 9; i++) {
      const x = R() * w, top = h * (0.3 + R() * 0.35);
      g.beginPath();
      g.moveTo(x - 40 - R() * 30, h);
      g.lineTo(x, top);
      g.lineTo(x + 40 + R() * 30, h);
      g.fill();
    }
    g.fillRect(0, h * 0.85, w, h);
    g.fillStyle = '#2a1c10';
    for (let i = 0; i <= 4; i++) g.fillRect((i * w) / 4 - 4, 0, 8, h);
    g.fillRect(0, 0, w, 8);
    g.fillRect(0, h - 8, w, 8);
  }, 1, 1, false),

  vending: tex(128, 256, (g, w, h) => {
    g.fillStyle = '#e8eef2';
    g.fillRect(0, 0, w, h);
    const cols = ['#c0392b', '#2e86c1', '#f1c40f', '#27ae60', '#8e44ad', '#e67e22'];
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 5; c++) {
        g.fillStyle = cols[(r * 5 + c) % cols.length];
        g.fillRect(10 + c * 22, 20 + r * 40, 14, 30);
      }
    g.fillStyle = '#20262b';
    g.fillRect(10, 190, w - 20, 50);
  }, 1, 1, false),

  arcade: tex(128, 96, (g, w, h) => {
    g.fillStyle = '#05050a';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 30; i++) {
      g.fillStyle = ['#ff3355', '#33ddff', '#ffee33', '#55ff66'][i % 4];
      g.fillRect(R() * w, R() * h, 6, 6);
    }
    g.fillStyle = '#ffffff';
    g.font = 'bold 14px monospace';
    g.fillText('GAME OVER', 24, 52);
  }, 1, 1, false),

  tvStatic: tex(128, 96, (g, w, h) => {
    g.fillStyle = '#222';
    g.fillRect(0, 0, w, h);
    speckle(g, w, h, 5000, '230,230,230', 0.8);
  }, 1, 1, false),

  byobu: tex(512, 256, (g, w, h) => {
    g.fillStyle = '#a8863a';
    g.fillRect(0, 0, w, h);
    speckle(g, w, h, 3000, '240,210,120', 0.3);
    for (let i = 0; i < 8; i++) {
      g.fillStyle = `rgba(30,55,35,${0.5 + R() * 0.3})`;
      g.beginPath();
      g.ellipse(R() * w, h * (0.3 + R() * 0.4), 40 + R() * 40, 12 + R() * 10, R() - 0.5, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#2a1a0e';
    for (let i = 0; i < 6; i++) g.fillRect((i * w) / 6 - 3, 0, 6, h);
  }, 1, 1, false),
};

const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, ...o });

// 初期値（画像の読み込み前でも動くように canvas 版を入れておく）
export const M = {
  tatami: std({ map: T.tatami }),
  woodFloor: std({ map: T.woodFloor, roughness: 0.6 }),
  plaster: std({ map: T.plaster }),
  shoji: std({ map: T.shoji, emissive: 0x8fa6c8, emissiveMap: T.shoji, emissiveIntensity: 0.1 }),
  fusuma: std({ map: T.fusuma }),
  woodPanel: std({ map: T.woodPanel, roughness: 0.7 }),
  tile: std({ map: T.tile, roughness: 0.35 }),
  gravel: std({ map: T.gravel }),
  stone: std({ map: T.stone }),
  ceiling: std({ map: T.ceiling }),
  kimono: std({ map: T.kimono }),
  darkWood: std({ color: 0x2b1c10, roughness: 0.6 }),
  water: new THREE.MeshStandardMaterial({
    color: 0x1e3a42, roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.8,
  }),
};

// ---------- Higgsfield で作った素材画像 ----------
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// 端と端がつながるように、半分ずらした画像を縁にだけ重ねる
function seamless(img) {
  const w = img.width, h = img.height;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const shifted = document.createElement('canvas');
  shifted.width = w;
  shifted.height = h;
  const sg = shifted.getContext('2d');
  for (const [dx, dy] of [[0, 0], [-w, 0], [0, -h], [-w, -h]]) sg.drawImage(img, dx + w / 2, dy + h / 2);
  const mask = document.createElement('canvas');
  mask.width = w;
  mask.height = h;
  const mg = mask.getContext('2d');
  const md = mg.createImageData(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const e = Math.max(Math.abs(x / w - 0.5), Math.abs(y / h - 0.5)) * 2;
      md.data[(y * w + x) * 4 + 3] = Math.max(0, Math.min(255, ((e - 0.6) / 0.4) * 255));
    }
  mg.putImageData(md, 0, 0);
  sg.globalCompositeOperation = 'destination-in';
  sg.drawImage(mask, 0, 0);
  g.drawImage(shifted, 0, 0);
  return c;
}

// 欄間の彫刻：暗い透かし部分を透明にする
function cutDark(img, threshold = 28) {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < d.data.length; i += 4) {
    const l = 0.3 * d.data[i] + 0.59 * d.data[i + 1] + 0.11 * d.data[i + 2];
    d.data[i + 3] = l < threshold ? 0 : 255;
  }
  g.putImageData(d, 0, 0);
  return c;
}

function toTexture(source, unitW, unitH = unitW, repeat = true) {
  const t = new THREE.Texture(source);
  t.needsUpdate = true;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1 / unitW, 1 / unitH);
  }
  return t;
}

export async function initTextures() {
  const names = ['tatami', 'wood_floor', 'plaster', 'washi', 'fusuma', 'fuji', 'mosaic', 'hinoki', 'stone_floor', 'ranma'];
  const imgs = Object.fromEntries(
    await Promise.all(names.map(async (n) => [n, await loadImage(`assets/textures/${n}.jpg`)])),
  );

  T.tatamiImg = toTexture(imgs.tatami, 0.9, 0.9);
  T.woodImg = toTexture(imgs.wood_floor, 2.0, 2.0);
  T.plasterImg = toTexture(seamless(imgs.plaster), 1.6);
  T.washi = toTexture(seamless(imgs.washi), 0.9);
  T.fusumaImg = toTexture(imgs.fusuma, 1, 1, false);
  T.fuji = toTexture(imgs.fuji, 1, 1, false);
  T.mosaic = toTexture(imgs.mosaic, 0.6);
  T.hinoki = toTexture(imgs.hinoki, 1.2);
  T.stoneFloor = toTexture(imgs.stone_floor, 1.6);
  T.ranma = toTexture(cutDark(imgs.ranma), 1, 1, false);
  T.ceilingImg = toTexture(imgs.wood_floor, 2.4, 2.4);

  Object.assign(M, {
    tatami: std({ map: T.tatamiImg, roughness: 0.85 }),
    woodFloor: std({ map: T.woodImg, roughness: 0.32, metalness: 0.05 }),
    plaster: std({ map: T.plasterImg, color: 0xb0a492, roughness: 0.95 }),
    koshiita: std({ map: T.hinoki, color: 0x6e5034, roughness: 0.55 }),
    fusuma: std({ map: T.fusumaImg, roughness: 0.7 }),
    tile: std({ map: T.mosaic, roughness: 0.25 }),
    mosaic: std({ map: T.mosaic, roughness: 0.25 }),
    hinoki: std({ map: T.hinoki, roughness: 0.55 }),
    stoneFloor: std({ map: T.stoneFloor, roughness: 0.3, metalness: 0.05 }),
    ceiling: std({ map: T.ceilingImg, color: 0x8a7a6a, roughness: 0.8 }),
    fuji: std({ map: T.fuji, roughness: 0.4 }),
    ranma: std({ map: T.ranma, alphaTest: 0.5, side: THREE.DoubleSide, color: 0x9a8a7a }),
    // 障子紙：裏から光が透けているように見せる
    washiCool: std({ map: T.washi, emissive: 0x9fb4d6, emissiveMap: T.washi, emissiveIntensity: 0.32, side: THREE.DoubleSide }),
    washiWarm: std({ map: T.washi, emissive: 0xffc888, emissiveMap: T.washi, emissiveIntensity: 0.45, side: THREE.DoubleSide }),
    washiDark: std({ map: T.washi, color: 0xb8b0a0, side: THREE.DoubleSide }),
    shojiWood: std({ color: 0xa88a62, roughness: 0.6 }),
    agedWood: std({ color: 0x5a3c22, roughness: 0.55 }),
    darkWood: std({ color: 0x24160b, roughness: 0.45 }),
    lacquer: std({ color: 0x0c0806, roughness: 0.25 }),
  });
}

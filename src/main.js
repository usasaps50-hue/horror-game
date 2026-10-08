import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mulberry32, makeRandom } from './rng.js';
import { initTextures } from './textures.js';
import { buildRyokan } from './building.js';
import { FH, U, GRID_W, GRID_H, FLOORS } from './plan.js';

// ---------- 設定（ブラウザに保存） ----------
const DEFAULTS = { sensitivity: 1.0, fov: 70, brightness: 1.0, invertY: false };
const settings = { ...DEFAULTS };
try {
  Object.assign(settings, JSON.parse(localStorage.getItem('zashiki-settings') || '{}'));
} catch {}
const saveSettings = () => {
  try {
    localStorage.setItem('zashiki-settings', JSON.stringify(settings));
  } catch {}
};

// ---------- シード ----------
const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed')) || Math.floor(Math.random() * 1e9);
const R = makeRandom(mulberry32(seed));

// ---------- 描画まわり ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020203);
scene.fog = new THREE.FogExp2(0x040405, 0.055);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.07;

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 80);
camera.rotation.order = 'YXZ';
scene.add(camera);
scene.add(new THREE.HemisphereLight(0x34445e, 0x100a06, 0.3));

const flashlight = new THREE.SpotLight(0xfff0d8, 24, 20, 0.45, 0.55, 1.5);
flashlight.castShadow = true;
flashlight.shadow.mapSize.set(1024, 1024);
flashlight.shadow.bias = -0.0004;
flashlight.shadow.camera.near = 0.1;
flashlight.position.set(0.18, -0.15, 0);
flashlight.target.position.set(0, -0.12, -1);
camera.add(flashlight, flashlight.target);
let flashOn = true;

const POOL = 8;
const pool = [];
for (let i = 0; i < POOL; i++) {
  const l = new THREE.PointLight(0xffa050, 0, 6, 2);
  scene.add(l);
  pool.push(l);
}

function applySettings() {
  camera.fov = settings.fov;
  camera.updateProjectionMatrix();
  renderer.toneMappingExposure = settings.brightness;
}
applySettings();

// ---------- 読み込み ----------
await initTextures();
const gltf = await new GLTFLoader().loadAsync('assets/models/zashiki_warashi.glb');
const world = buildRyokan(R);
scene.add(world.root);

if (world.spawns.zashiki) {
  const m = gltf.scene;
  m.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  m.position.copy(world.spawns.zashiki.pos);
  m.quaternion.copy(world.spawns.zashiki.quat);
  scene.add(m);
}
const mixer = new THREE.AnimationMixer(gltf.scene);
if (gltf.animations[0]) mixer.clipAction(gltf.animations[0]).play();
document.getElementById('loading').remove();
document.getElementById('seed').textContent = `seed ${seed}`;

// ---------- プレイヤー ----------
// 小学六年生の目の高さ
const EYE = 1.28;
const RADIUS = 0.22;
let floor = world.start.floor;
let groundY = floor * FH;
camera.position.copy(world.start.pos).setY(groundY + EYE);
let yaw = world.start.yaw;
let pitch = 0;

const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('start');
let locked = false;
startBtn.addEventListener('click', () => renderer.domElement.requestPointerLock());
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === renderer.domElement;
  overlay.classList.toggle('hidden', locked);
  startBtn.textContent = 'つづける';
});
document.addEventListener('mousemove', (e) => {
  if (!locked) return;
  const k = 0.0022 * settings.sensitivity;
  yaw -= e.movementX * k;
  pitch -= e.movementY * k * (settings.invertY ? -1 : 1);
  pitch = Math.max(-1.45, Math.min(1.45, pitch));
});

// 設定パネル
for (const [id, key, fmt] of [
  ['s-sens', 'sensitivity', (v) => v.toFixed(2)],
  ['s-fov', 'fov', (v) => `${v}°`],
  ['s-bright', 'brightness', (v) => v.toFixed(2)],
]) {
  const input = document.getElementById(id);
  const out = document.getElementById(`${id}-v`);
  input.value = settings[key];
  out.textContent = fmt(settings[key]);
  input.addEventListener('input', () => {
    settings[key] = Number(input.value);
    out.textContent = fmt(settings[key]);
    applySettings();
    saveSettings();
  });
}
const inv = document.getElementById('s-inv');
inv.checked = settings.invertY;
inv.addEventListener('change', () => {
  settings.invertY = inv.checked;
  saveSettings();
});
document.getElementById('s-reset').addEventListener('click', () => {
  Object.assign(settings, DEFAULTS);
  saveSettings();
  location.reload();
});

const keys = new Set();
addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (!locked) return;
  if (e.code === 'KeyE') interact();
  if (e.code === 'KeyF') {
    flashOn = !flashOn;
    flashlight.visible = flashOn;
  }
  if (e.code === 'KeyM') minimap.classList.toggle('hidden');
});
addEventListener('keyup', (e) => keys.delete(e.code));

// 階段の上では、進んだぶんだけ高さが変わる
function groundAt(x, z) {
  for (const s of world.stairs) {
    if (x > s.x0 && x < s.x1 && z > s.z0 && z < s.z1 && (floor === s.from || floor === s.from + 1)) {
      const t = Math.max(0, Math.min(1, (z - s.z0) / (s.z1 - s.z0)));
      return { y: (s.from + t) * FH, floor: t > 0.5 ? s.from + 1 : s.from, stairs: true };
    }
  }
  return { y: floor * FH, floor, stairs: false };
}
let onStairs = false;

const overlaps = (c, x, z, r) => x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ;
function blocked(x, z) {
  for (const c of world.colliders[floor]) {
    if (c.door && c.door.t > 0.75) continue;
    if (overlaps(c, x, z, RADIUS)) return true;
  }
  return false;
}

// ---------- 戸 ----------
const ray = new THREE.Raycaster();
ray.far = 2.4;
let target = null;
const prompt = document.getElementById('prompt');
const center = new THREE.Vector2(0, 0);

function updateTarget() {
  camera.updateMatrixWorld();
  ray.setFromCamera(center, camera);
  const hit = ray.intersectObjects(world.interactables.filter((o) => o.userData.floor === floor), true)[0];
  target = hit ? hit.object : null;
  const door = target?.userData.door;
  if (door) prompt.textContent = door.open ? 'E　閉める' : 'E　開ける';
  else if (target?.userData.note) prompt.textContent = 'E　調べる';
  else prompt.textContent = '';
}

function interact() {
  if (!target) return;
  if (target.userData.note) return toast(target.userData.note);
  const door = target.userData.door;
  if (!door) return;
  if (door.locked && !door.open) {
    door.rattle = 0.4;
    return toast(door.locked);
  }
  if (door.open) {
    // 戸口に立っていると閉められない（閉じこめられないように）
    const c = world.colliders[floor].find((x) => x.door === door);
    if (c && overlaps(c, camera.position.x, camera.position.z, RADIUS)) return;
  }
  door.open = !door.open;
}

// ---------- 表示 ----------
const toastEl = document.getElementById('toast');
let toastTimer;
function toast(text, ms = 2200) {
  toastEl.textContent = text;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
}

const inRect = (r, x, z) => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1;
const visitedRooms = new Set();
const visitedCorr = new Set();
let currentRoom = null;
let lastFloor = floor;
let goalShown = false;
function updatePlace() {
  const { x, z } = camera.position;
  const room = world.rooms.find((r) => r.floor === floor && inRect(r, x, z)) || null;
  const cx = Math.floor(x / U), cz = Math.floor(z / U);
  for (let j = cz - 1; j <= cz + 1; j++) for (let i = cx - 1; i <= cx + 1; i++) visitedCorr.add(`${floor}:${i}:${j}`);
  if (floor !== lastFloor) {
    lastFloor = floor;
    toast(FLOORS[floor].name, 1600);
  }
  if (room === currentRoom) return;
  currentRoom = room;
  if (!room) return;
  visitedRooms.add(room);
  toast(room.def.name);
  if (room.type === 'oku' && !goalShown) {
    goalShown = true;
    setTimeout(() => document.getElementById('goal').classList.add('show'), 3000);
  }
}

const minimap = document.getElementById('minimap');
const mm = minimap.getContext('2d');
function drawMinimap() {
  const W = minimap.width;
  const s = W / GRID_W;
  const oy = (W - GRID_H * s) / 2;
  mm.clearRect(0, 0, W, W);
  const { at } = world.grids[floor];
  for (const k of visitedCorr) {
    const [f, i, j] = k.split(':').map(Number);
    if (f !== floor) continue;
    const c = at(i, j);
    if (!c) continue;
    mm.fillStyle = c.kind === 'corr' ? 'rgba(200,190,160,0.32)' : c.room.type === 'oku' ? 'rgba(170,20,20,0.7)' : c.room === currentRoom ? 'rgba(230,210,170,0.6)' : 'rgba(200,190,160,0.45)';
    mm.fillRect(i * s, oy + j * s, s + 0.5, s + 0.5);
  }
  mm.fillStyle = '#e8dcc0';
  mm.font = '12px sans-serif';
  mm.fillText(FLOORS[floor].name, 6, 14);
  const px = (camera.position.x / U) * s, pz = oy + (camera.position.z / U) * s;
  mm.fillStyle = '#fff';
  mm.beginPath();
  mm.arc(px, pz, 3, 0, Math.PI * 2);
  mm.fill();
  mm.strokeStyle = '#fff';
  mm.beginPath();
  mm.moveTo(px, pz);
  mm.lineTo(px - Math.sin(yaw) * 10, pz - Math.cos(yaw) * 10);
  mm.stroke();
}

// ---------- メインループ ----------
const clock = new THREE.Clock();
const fwd = new THREE.Vector3();
const right = new THREE.Vector3();
const tmp = new THREE.Vector3();
let bob = 0;
let lightTimer = 0;
let assigned = [];
let elapsed = 0;

function update(dt) {
  elapsed += dt;
  camera.rotation.set(pitch, yaw, 0);
  if (locked) {
    fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    right.set(Math.cos(yaw), 0, -Math.sin(yaw));
    const run = keys.has('ShiftLeft') || keys.has('ShiftRight');
    const speed = run ? 3.3 : 1.7;
    let mx = 0, mz = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) { mx += fwd.x; mz += fwd.z; }
    if (keys.has('KeyS') || keys.has('ArrowDown')) { mx -= fwd.x; mz -= fwd.z; }
    if (keys.has('KeyD') || keys.has('ArrowRight')) { mx += right.x; mz += right.z; }
    if (keys.has('KeyA') || keys.has('ArrowLeft')) { mx -= right.x; mz -= right.z; }
    const len = Math.hypot(mx, mz);
    if (len > 0) {
      mx = (mx / len) * speed * dt;
      mz = (mz / len) * speed * dt;
      const p = camera.position;
      if (!blocked(p.x + mx, p.z)) p.x += mx;
      if (!blocked(p.x, p.z + mz)) p.z += mz;
      bob += dt * (run ? 12 : 8);
    }
    const gnd = groundAt(camera.position.x, camera.position.z);
    floor = gnd.floor;
    onStairs = gnd.stairs;
    groundY += (gnd.y - groundY) * Math.min(1, dt * 14);
    camera.position.y = groundY + EYE + Math.sin(bob) * 0.02;
  }

  for (const d of world.doors) {
    const goal = d.open ? 1 : 0;
    if (d.t !== goal || d.rattle > 0) {
      d.t += Math.sign(goal - d.t) * Math.min(Math.abs(goal - d.t), dt * 2.2);
      d.panel.position.copy(d.base).addScaledVector(d.axis, d.t * d.dist);
      if (d.rattle > 0) {
        d.rattle -= dt;
        d.panel.position.addScaledVector(d.axis, Math.sin(d.rattle * 60) * 0.008);
      }
    }
  }
  for (const u of world.updaters) {
    let near = 0;
    if (u.isObject3D) near = u.getWorldPosition(tmp).distanceTo(camera.position) < 1.1 ? 1 : 0;
    u.userData.update(dt, elapsed, near);
  }
  mixer.update(dt);

  lightTimer -= dt;
  if (lightTimer <= 0) {
    lightTimer = 0.2;
    const p = camera.position;
    assigned = world.lights
      .filter((l) => l.floor === floor || (onStairs && Math.abs(l.floor - floor) <= 1))
      .map((l) => ({ l, d: l.pos.distanceToSquared(p) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, POOL)
      .map((x) => x.l);
    assigned.forEach((l, i) => {
      pool[i].position.copy(l.pos);
      pool[i].color.setHex(l.color);
      pool[i].distance = l.range;
    });
    for (let i = assigned.length; i < POOL; i++) pool[i].intensity = 0;
  }
  assigned.forEach((l, i) => {
    const f = 0.85 + 0.15 * Math.sin(elapsed * 13 + l.phase) * Math.sin(elapsed * 7.3 + l.phase * 2);
    pool[i].intensity = l.intensity * f;
  });
  if (flashOn) flashlight.intensity = 24 * (Math.random() < 0.004 ? 0.2 : 1);

  updateTarget();
  updatePlace();
  if (!minimap.classList.contains('hidden')) drawMinimap();
}

renderer.setAnimationLoop(() => {
  update(Math.min(clock.getDelta(), 0.05));
  renderer.render(scene, camera);
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// デバッグ用
window.__game = {
  world, scene, camera, renderer, seed, settings,
  get floor() { return floor; },
  setView(x, z, y, p = 0, f = floor) {
    floor = f;
    groundY = f * FH;
    camera.position.set(x, groundY + EYE, z);
    yaw = y;
    pitch = p;
  },
  interact: () => interact(),
  // テスト用：ロックなしで 1 歩ぶん動かす
  move(dx, dz) {
    const p = camera.position;
    if (!blocked(p.x + dx, p.z)) p.x += dx;
    if (!blocked(p.x, p.z + dz)) p.z += dz;
    const gnd = groundAt(p.x, p.z);
    floor = gnd.floor;
    onStairs = gnd.stairs;
    groundY = gnd.y;
    p.y = groundY + EYE;
    return [p.x.toFixed(2), p.z.toFixed(2), floor, groundY.toFixed(2)];
  },
  step: (dt = 0.016) => { update(dt); renderer.render(scene, camera); },
};

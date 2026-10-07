import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mulberry32, makeRandom } from './rng.js';
import { buildWorld, S, DOOR_W } from './world.js';
import { ROOM_TYPES } from './rooms.js';

// ---------- シード（URL の ?seed= で同じ旅館を再現できる） ----------
const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed')) || Math.floor(Math.random() * 1e9);
const R = makeRandom(mulberry32(seed));
document.getElementById('seed').textContent = `seed ${seed}`;

// ---------- 描画まわり ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020203);
scene.fog = new THREE.FogExp2(0x030405, 0.075);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 60);
camera.rotation.order = 'YXZ';
scene.add(camera);

const world = buildWorld(R);
scene.add(world.root);

scene.add(new THREE.HemisphereLight(0x34445e, 0x100a06, 0.35));

// 懐中電灯
const flashlight = new THREE.SpotLight(0xfff0d8, 28, 22, 0.42, 0.5, 1.5);
flashlight.castShadow = true;
flashlight.shadow.mapSize.set(1024, 1024);
flashlight.shadow.bias = -0.0004;
flashlight.shadow.camera.near = 0.1;
flashlight.position.set(0.18, -0.15, 0);
flashlight.target.position.set(0, -0.12, -1);
camera.add(flashlight, flashlight.target);
let flashOn = true;

// 行灯や提灯の灯りは、近いものから順に使い回す
const POOL = 7;
const pool = [];
for (let i = 0; i < POOL; i++) {
  const l = new THREE.PointLight(0xffa050, 0, 6, 2);
  scene.add(l);
  pool.push(l);
}
let assigned = [];

// ---------- プレイヤー ----------
const EYE = 1.5;
const RADIUS = 0.28;
camera.position.copy(world.start.pos).setY(EYE);
camera.rotation.y = world.start.yaw;

const controls = new PointerLockControls(camera, document.body);
const overlay = document.getElementById('overlay');
overlay.addEventListener('click', () => controls.lock());
controls.addEventListener('lock', () => overlay.classList.add('hidden'));
controls.addEventListener('unlock', () => overlay.classList.remove('hidden'));

const keys = new Set();
addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (e.code === 'KeyE') interact();
  if (e.code === 'KeyF') {
    flashOn = !flashOn;
    flashlight.visible = flashOn;
  }
  if (e.code === 'KeyM') minimap.classList.toggle('hidden');
  if (e.code === 'KeyR') location.search = `?seed=${Math.floor(Math.random() * 1e9)}`;
});
addEventListener('keyup', (e) => keys.delete(e.code));

function blocked(x, z) {
  for (const c of world.colliders) {
    if (c.door && c.door.t > 0.75) continue;
    if (x + RADIUS > c.minX && x - RADIUS < c.maxX && z + RADIUS > c.minZ && z - RADIUS < c.maxZ) return true;
  }
  return false;
}

// ---------- 戸を開ける ----------
const ray = new THREE.Raycaster();
ray.far = 2.4;
let target = null;
const prompt = document.getElementById('prompt');

function updateTarget() {
  ray.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hit = ray.intersectObjects(world.interactables, false)[0];
  target = hit ? hit.object : null;
  if (!target) prompt.textContent = '';
  else if (target.userData.door) prompt.textContent = target.userData.door.open ? 'E　閉める' : 'E　開ける';
  else prompt.textContent = 'E　調べる';
}

function interact() {
  if (!target) return;
  if (target.userData.door) target.userData.door.open = !target.userData.door.open;
  else if (target.userData.locked) toast(target.userData.locked);
}

// ---------- 表示 ----------
const toastEl = document.getElementById('toast');
let toastTimer;
function toast(text, ms = 2400) {
  toastEl.textContent = text;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
}

const minimap = document.getElementById('minimap');
const mm = minimap.getContext('2d');
const visited = new Set();
let current = null;
let goalReached = false;

function drawMinimap() {
  const { W, H, cells } = world.layout;
  const cs = Math.floor(minimap.width / Math.max(W, H));
  mm.clearRect(0, 0, minimap.width, minimap.height);
  for (const c of cells) {
    if (!visited.has(c)) continue;
    const x = c.x * cs, y = c.y * cs;
    mm.fillStyle = c.type === 'oku' ? 'rgba(160,20,20,0.75)' : c === current ? 'rgba(220,200,160,0.55)' : 'rgba(200,190,160,0.3)';
    mm.fillRect(x + 2, y + 2, cs - 4, cs - 4);
    mm.fillStyle = 'rgba(200,190,160,0.5)';
    for (const d of c.links) {
      if (d === 'e') mm.fillRect(x + cs - 3, y + cs / 2 - 3, 6, 6);
      if (d === 's') mm.fillRect(x + cs / 2 - 3, y + cs - 3, 6, 6);
      if (d === 'w') mm.fillRect(x - 3, y + cs / 2 - 3, 6, 6);
      if (d === 'n') mm.fillRect(x + cs / 2 - 3, y - 3, 6, 6);
    }
  }
  const px = (camera.position.x / S + 0.5) * cs;
  const py = (camera.position.z / S + 0.5) * cs;
  mm.fillStyle = '#fff';
  mm.beginPath();
  mm.arc(px, py, 3, 0, Math.PI * 2);
  mm.fill();
  const yaw = camera.rotation.y;
  mm.strokeStyle = '#fff';
  mm.beginPath();
  mm.moveTo(px, py);
  mm.lineTo(px - Math.sin(yaw) * 9, py - Math.cos(yaw) * 9);
  mm.stroke();
}

function updateRoom() {
  const cell = world.layout.get(Math.round(camera.position.x / S), Math.round(camera.position.z / S));
  if (!cell || cell === current) return;
  current = cell;
  visited.add(cell);
  toast(ROOM_TYPES[cell.type].name, 1800);
  if (cell.type === 'oku' && !goalReached) {
    goalReached = true;
    setTimeout(() => document.getElementById('goal').classList.add('show'), 2500);
  }
}

// ---------- 座敷童子 ----------
let mixer = null;
if (world.spawns.zashiki) {
  new GLTFLoader().load('assets/models/zashiki_warashi.glb', (gltf) => {
    const m = gltf.scene;
    m.position.copy(world.spawns.zashiki.pos);
    m.rotation.y = world.spawns.zashiki.ry;
    m.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    scene.add(m);
    if (gltf.animations.length) {
      mixer = new THREE.AnimationMixer(m);
      mixer.clipAction(gltf.animations[0]).play();
    }
  });
}

// ---------- メインループ ----------
const clock = new THREE.Clock();
const fwd = new THREE.Vector3();
const right = new THREE.Vector3();
let bob = 0;
let lightTimer = 0;
let elapsed = 0;

function update(dt) {
  elapsed += dt;

  if (controls.isLocked) {
    camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();
    right.crossVectors(fwd, camera.up);
    const run = keys.has('ShiftLeft') || keys.has('ShiftRight');
    const speed = run ? 3.6 : 1.9;
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
      bob += dt * (run ? 11 : 7);
    }
    camera.position.y = EYE + Math.sin(bob) * 0.025;
  }

  for (const d of world.doors) {
    const goal = d.open ? 1 : 0;
    d.t += Math.sign(goal - d.t) * Math.min(Math.abs(goal - d.t), dt * 2.5);
    d.panel.position.copy(d.base).addScaledVector(d.axis, d.t * DOOR_W * 0.92);
  }

  lightTimer -= dt;
  if (lightTimer <= 0) {
    lightTimer = 0.2;
    const p = camera.position;
    assigned = world.lights
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
    const f = 0.82 + 0.18 * Math.sin(elapsed * 13 + l.phase) * Math.sin(elapsed * 7.3 + l.phase * 2);
    pool[i].intensity = l.intensity * f;
  });
  if (flashOn) flashlight.intensity = 28 * (Math.random() < 0.004 ? 0.2 : 1);

  updateTarget();
  updateRoom();
  if (!minimap.classList.contains('hidden')) drawMinimap();
  mixer?.update(dt);
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

// デバッグ用（ブラウザのコンソールから触れる）
window.__game = { world, camera, scene, controls, seed, renderer, step: (dt = 0.016) => { update(dt); renderer.render(scene, camera); } };

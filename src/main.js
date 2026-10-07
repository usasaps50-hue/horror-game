import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mulberry32, makeRandom } from './rng.js';
import { initTextures } from './textures.js';
import { mergeStatic, transformBox } from './geo.js';
import { W, BAY } from './architecture.js';
import { buildSegment, NEXT, PREV, L } from './corridor.js';
import { ROOM_TYPES, RANDOM_POOL } from './rooms.js';

// ---------- シード ----------
const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed')) || Math.floor(Math.random() * 1e9);
const runR = makeRandom(mulberry32(seed));
const GOAL_LAP = runR.int(6, 8);

// ---------- 描画まわり ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020203);
scene.fog = new THREE.FogExp2(0x040405, 0.06);

const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.05, 60);
camera.rotation.order = 'YXZ';
scene.add(camera);
scene.add(new THREE.HemisphereLight(0x34445e, 0x100a06, 0.3));
// 鏡や床にうっすら映り込みを出すための環境マップ（明るさはごく弱く）
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.07;

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

const loadingEl = document.getElementById('loading');

// ---------- 読み込み ----------
await initTextures();
const gltf = await new GLTFLoader().loadAsync('assets/models/zashiki_warashi.glb');
gltf.scene.traverse((o) => {
  if (o.isMesh) {
    o.castShadow = true;
    o.receiveShadow = true;
  }
});
const assets = { zashiki: () => SkeletonUtils.clone(gltf.scene) };
loadingEl.remove();

// ---------- 周回の中身 ----------
const ANOMALIES = ['lampsOff', 'temari', 'dolls', 'ofuda', 'slippers', 'futon', 'footprints', 'shadow', 'redLamps', 'locked', 'doorsOpen'];

function planFor(lap) {
  const R = makeRandom(mulberry32((seed ^ Math.imul(lap + 1000, 2654435761)) >>> 0));
  const pool = R.shuffle(RANDOM_POOL.filter((t) => t !== 'oobeya'));
  const rooms = {
    L1: lap === 1 ? 'oobeya' : pool.pop(),
    L2: 'bath',
    L3: 'bath',
    R2: pool.pop(),
    R3: pool.pop(),
  };
  let anomalies = [];
  if (lap >= 2) {
    const n = Math.min(4, 1 + Math.floor((lap - 2) / 2));
    anomalies = R.shuffle(ANOMALIES).slice(0, n);
    if (lap >= 4 && R.chance(0.6)) anomalies.push('zashikiFar');
    if (lap >= GOAL_LAP - 1) anomalies.push('plates', 'lampsOff');
    if (lap === GOAL_LAP) anomalies = anomalies.filter((a) => a !== 'zashikiFar' && a !== 'locked');
  }
  return { lap, rooms, anomalies, goal: lap === GOAL_LAP, R };
}

const segCache = new Map();
function getSegment(lap) {
  if (segCache.has(lap)) return segCache.get(lap);
  const plan = planFor(lap);
  const seg = buildSegment(plan, plan.R, assets);
  const root = seg.root;
  root.updateMatrixWorld(true);
  // 当たり判定・灯り・出現位置をローカル座標で記録してから、形をまとめる
  seg.colliders = [];
  const box = new THREE.Box3();
  root.traverse((o) => {
    if (o.userData.solid) {
      box.setFromObject(o);
      seg.colliders.push({ minX: box.min.x + 0.03, maxX: box.max.x - 0.03, minZ: box.min.z + 0.03, maxZ: box.max.z - 0.03 });
    }
    if (o.userData.doorCollider) {
      box.setFromObject(o);
      seg.colliders.push({ minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z, door: o.userData.doorCollider });
    }
  });
  seg.lights = [];
  root.traverse((o) => {
    if (o.userData.light) seg.lights.push({ pos: o.getWorldPosition(new THREE.Vector3()), ...o.userData.light, phase: Math.random() * 100 });
  });
  mergeStatic(root);
  for (const { name, obj } of seg.spawnMarkers) {
    if (name !== 'zashiki') continue;
    const m = gltf.scene; // 奥の間には本体（アニメーションつき）を置く
    m.position.copy(obj.getWorldPosition(new THREE.Vector3()));
    m.quaternion.copy(obj.getWorldQuaternion(new THREE.Quaternion()));
    root.add(m);
    seg.mixer = new THREE.AnimationMixer(m);
    if (gltf.animations[0]) seg.mixer.clipAction(gltf.animations[0]).play();
  }
  segCache.set(lap, seg);
  return seg;
}

let lap = 1;
let active = []; // { seg, matrix }
let colliders = [], lights = [], interactables = [];

function placeSegments() {
  const cur = getSegment(lap);
  const wanted = [{ seg: cur, matrix: new THREE.Matrix4() }];
  wanted.push({ seg: getSegment(lap - 1), matrix: PREV });
  if (!cur.plan.goal) wanted.push({ seg: getSegment(lap + 1), matrix: NEXT });

  for (const a of active) scene.remove(a.seg.root);
  active = wanted;
  colliders = [];
  lights = [];
  interactables = [];
  for (const { seg, matrix } of active) {
    seg.root.matrixAutoUpdate = false;
    seg.root.matrix.copy(matrix);
    scene.add(seg.root);
    for (const c of seg.colliders) colliders.push(transformBox(c, matrix));
    for (const l of seg.lights) lights.push({ ...l, pos: l.pos.clone().applyMatrix4(matrix) });
    interactables.push(...seg.interactables);
  }
  scene.updateMatrixWorld(true);
  lightTimer = 0;

  // 使わなくなった区間を片づける
  for (const [k, seg] of segCache) {
    if (Math.abs(k - lap) <= 2) continue;
    seg.root.traverse((o) => o.geometry?.dispose());
    segCache.delete(k);
  }
  document.getElementById('lap').textContent = `seed ${seed}`;
}

// ---------- プレイヤー ----------
const EYE = 1.5;
const RADIUS = 0.26;
camera.position.set(-0.3, EYE, -(3 * BAY + BAY / 2) + 0.4);
camera.rotation.y = 0;

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
  if (e.code === 'KeyR') location.search = `?seed=${Math.floor(Math.random() * 1e9)}`;
});
addEventListener('keyup', (e) => keys.delete(e.code));

function blocked(x, z) {
  for (const c of colliders) {
    if (c.door && c.door.t > 0.75) continue;
    if (x + RADIUS > c.minX && x - RADIUS < c.maxX && z + RADIUS > c.minZ && z - RADIUS < c.maxZ) return true;
  }
  return false;
}

// 区間の境目をこえたら、座標ごと隣の区間に入れかえる（見た目は同じなので気づかない）
function checkLoop() {
  const p = camera.position;
  const cur = getSegment(lap);
  if (!cur.plan.goal && p.x > W / 2 + 0.3 && p.z < -L) {
    p.applyMatrix4(PREV);
    camera.rotation.y += Math.PI / 2;
    lap++;
    placeSegments();
  } else if (p.z > 0.3) {
    p.applyMatrix4(NEXT);
    camera.rotation.y -= Math.PI / 2;
    lap--;
    placeSegments();
  }
}

// ---------- 戸 ----------
const ray = new THREE.Raycaster();
ray.far = 2.4;
let target = null;
const prompt = document.getElementById('prompt');

function updateTarget() {
  ray.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hit = ray.intersectObjects(interactables, true)[0];
  target = hit ? hit.object : null;
  const door = target?.userData.door;
  if (!door) prompt.textContent = '';
  else if (door.locked && !door.open) prompt.textContent = 'E　開ける';
  else prompt.textContent = door.open ? 'E　閉める' : 'E　開ける';
}

function interact() {
  const door = target?.userData.door;
  if (!door) return;
  if (door.locked && !door.open) {
    toast(door.locked);
    door.rattle = 0.4;
    return;
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

let currentPlace = null;
let goalShown = false;
function updatePlace() {
  const p = camera.position;
  const plan = getSegment(lap).plan;
  let place = 'corridor';
  if (p.z < -L - W - 0.1) place = 'oku';
  else if (Math.abs(p.x) > W / 2 + 0.15 && p.z > -L) {
    const side = p.x < 0 ? 'L' : 'R';
    const idx = Math.floor(-p.z / BAY);
    const n = idx >= 11 ? 3 : idx >= 6 ? 2 : 1;
    place = plan.rooms[side + n] || 'corridor';
  }
  if (place === currentPlace) return;
  currentPlace = place;
  if (place === 'corridor') return;
  if (place === 'bath') toast(p.z < -17.6 ? '大浴場' : '脱衣所');
  else toast(ROOM_TYPES[place].name);
  if (place === 'oku' && !goalShown) {
    goalShown = true;
    setTimeout(() => document.getElementById('goal').classList.add('show'), 3000);
  }
}

// ---------- メインループ ----------
const clock = new THREE.Clock();
const fwd = new THREE.Vector3();
const right = new THREE.Vector3();
const tmp = new THREE.Vector3();
const inv = new THREE.Matrix4();
let bob = 0;
let lightTimer = 0;
let assigned = [];
let elapsed = 0;

function update(dt) {
  elapsed += dt;
  if (controls.isLocked) {
    camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();
    right.crossVectors(fwd, camera.up);
    const run = keys.has('ShiftLeft') || keys.has('ShiftRight');
    const speed = run ? 3.4 : 1.8;
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
    camera.position.y = EYE + Math.sin(bob) * 0.022;
  }
  checkLoop();

  for (const { seg } of active) {
    for (const d of seg.doors) {
      const goal = d.open ? 1 : 0;
      d.t += Math.sign(goal - d.t) * Math.min(Math.abs(goal - d.t), dt * 2.2);
      d.panel.position.copy(d.base).addScaledVector(d.axis, d.t * d.dist);
      if (d.rattle > 0) {
        d.rattle -= dt;
        d.panel.position.addScaledVector(d.axis, Math.sin(d.rattle * 60) * 0.008);
      }
    }
    inv.copy(seg.root.matrix).invert();
    const local = camera.position.clone().applyMatrix4(inv);
    for (const u of seg.updaters) {
      let near = 0;
      if (u.isObject3D) near = u.getWorldPosition(tmp).distanceTo(camera.position) < 1.1 ? 1 : 0;
      u.userData.update(dt, elapsed, near, local);
    }
    seg.mixer?.update(dt);
  }

  lightTimer -= dt;
  if (lightTimer <= 0) {
    lightTimer = 0.2;
    const p = camera.position;
    assigned = lights
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
}

placeSegments();
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
  scene, camera, controls, seed, renderer, GOAL_LAP,
  get lap() { return lap; },
  set lap(v) { lap = v; placeSegments(); },
  get colliders() { return colliders; },
  active: () => active,
  step: (dt = 0.016) => { update(dt); renderer.render(scene, camera); },
};

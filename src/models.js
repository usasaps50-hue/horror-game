// Higgsfield（Tripo）で作った家具の 3D モデル
// 読み込んだら大きさをそろえ、床に置けるように原点を足もとにする。正面は +z。
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Tripo のモデルは +x が正面で出てくるので、-90 度回して +z を正面にする。例外だけここに書く
export const MODEL_YAW = {};
export const MODEL_NAMES = [
  'tanuki', 'sofa', 'safe', 'jukebox', 'kyodai', 'ozen', 'karaoke', 'bathset', 'stove', 'sakedaru',
  'locker', 'boiler', 'washer', 'toro', 'well', 'gravestone', 'jizo', 'futon', 'zabuton', 'chabudai',
  'andon', 'crttv', 'byobu', 'bookshelf', 'vending', 'butsudan', 'hinadan', 'kamidana', 'yoroi', 'hinadoll',
];

const templates = {};

export async function loadModels(onProgress) {
  const loader = new GLTFLoader();
  let done = 0;
  await Promise.all(
    MODEL_NAMES.map(async (name) => {
      try {
        const gltf = await loader.loadAsync(new URL(`../assets/models/props/${name}.glb`, import.meta.url).href);
        const inner = gltf.scene;
        inner.rotation.y = MODEL_YAW[name] ?? -Math.PI / 2;
        const wrap = new THREE.Group();
        wrap.add(inner);
        wrap.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(wrap);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        inner.position.set(-center.x, -box.min.y, -center.z);
        inner.traverse((o) => {
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
            if (o.material) {
              o.material.metalness = Math.min(o.material.metalness ?? 0, 0.3);
              o.material.roughness = Math.max(o.material.roughness ?? 1, 0.55);
            }
          }
        });
        templates[name] = { wrap, size };
      } catch (e) {
        console.warn('model load failed', name, e);
      }
      onProgress?.(++done / MODEL_NAMES.length);
    }),
  );
}

// fit: { h } 高さを合わせる / { w } 横幅（x）を合わせる / { w, h, d } それぞれに合わせる
export function model(name, fit = {}) {
  const t = templates[name];
  if (!t) return null;
  const g = new THREE.Group();
  const inst = t.wrap.clone(true);
  const { x, y, z } = t.size;
  let sx, sy, sz;
  if (fit.w && fit.h && fit.d) [sx, sy, sz] = [fit.w / x, fit.h / y, fit.d / z];
  else {
    const s = fit.h ? fit.h / y : fit.w ? fit.w / x : fit.d ? fit.d / z : 1;
    sx = sy = sz = s;
  }
  inst.scale.set(sx, sy, sz);
  g.add(inst);
  g.userData.model = name;
  return g;
}

export const hasModel = (name) => !!templates[name];

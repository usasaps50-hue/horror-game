// 形づくりの共通処理
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// 箱の UV を「1 = 1m」にする（模様の大きさはテクスチャの repeat で決める）
export function metricBox(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const sizes = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++)
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, uv.getX(k) * sizes[f][0], uv.getY(k) * sizes[f][1]);
    }
  return g;
}

// 床（y=0）から積む箱。uv が metric なら模様の縮尺がそろう
export function mbox(w, h, d, material, x, y, z, parent, metric = true) {
  const m = new THREE.Mesh(metric ? metricBox(w, h, d) : new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y + h / 2, z);
  parent?.add(m);
  return m;
}

// 細かい部品をまとめて 1 つの形にする（障子の桟など）
export function mergedMesh(parts, material) {
  const geos = parts.map(([w, h, d, x, y, z]) => {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(x, y, z);
    return g;
  });
  return new THREE.Mesh(mergeGeometries(geos), material);
}

// 動かない部品をマテリアルごとに結合して、描画を軽くする
export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  const remove = [];
  root.traverse((o) => {
    if (!o.isMesh || o.isSkinnedMesh) return;
    for (let p = o; p && p !== root; p = p.parent) if (p.userData.dynamic) return;
    if (!o.visible) {
      remove.push(o); // 当たり判定専用の見えない箱
      return;
    }
    if (Array.isArray(o.material)) return;
    let g = o.geometry.clone();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    if (g.index) g = g.toNonIndexed();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) {
      g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((g.attributes.position.count) * 2), 2));
    }
    const key = o.material.uuid;
    if (!buckets.has(key)) buckets.set(key, { material: o.material, geos: [] });
    buckets.get(key).geos.push(g);
    remove.push(o);
  });
  for (const o of remove) o.parent.remove(o);
  for (const { material, geos } of buckets.values()) {
    const m = new THREE.Mesh(mergeGeometries(geos), material);
    m.castShadow = true;
    m.receiveShadow = true;
    root.add(m);
  }
}

// 90度単位の回転＋平行移動で AABB を変換する
export function transformBox(c, matrix) {
  const pts = [
    new THREE.Vector3(c.minX, 0, c.minZ),
    new THREE.Vector3(c.maxX, 0, c.minZ),
    new THREE.Vector3(c.minX, 0, c.maxZ),
    new THREE.Vector3(c.maxX, 0, c.maxZ),
  ].map((p) => p.applyMatrix4(matrix));
  return {
    minX: Math.min(...pts.map((p) => p.x)),
    maxX: Math.max(...pts.map((p) => p.x)),
    minZ: Math.min(...pts.map((p) => p.z)),
    maxZ: Math.max(...pts.map((p) => p.z)),
    door: c.door,
  };
}

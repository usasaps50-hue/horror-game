// 座敷童子（鬼）
//
// dormant  … まだ出てこない
// countdown… 「いまから　みつけるね」から 10 秒
// roam     … わらべうたを歌いながら旅館を走り回る
// approach … プレイヤーのいる部屋の前へ向かう
// knock    … 戸を叩いて「ここにいるの？」、5 秒待つ
// search   … 部屋に入って探す（隠れていれば見つからない）
// chase    … 見つけて追いかける
import * as THREE from 'three';
import { U, FH } from './plan.js';

const ROAM_SPEED = 2.7;
const CHASE_SPEED = 3.05;
const CATCH_DIST = 0.85;

export class Seeker {
  constructor({ world, nav, scene, model, audio, R, onCatch, onSay }) {
    Object.assign(this, { world, nav, audio, R, onCatch, onSay });
    this.obj = new THREE.Group();
    this.obj.add(model);
    this.obj.visible = false;
    scene.add(this.obj);
    this.pos = new THREE.Vector3();
    this.floor = 0;
    this.state = 'dormant';
    this.timer = 0;
    this.path = null;
    this.pi = 0;
    this.pause = 0;
    this.lostTimer = 0;
    this.visitTimer = 0;
    this.noticeTimer = 0;
    this.stepTimer = 0;
    this.bob = 0;
    this.target = null;
    this.searchRoom = null;
    this.cooldownRoom = null;
    this.cooldown = 0;
  }

  say(text) {
    this.audio.say(text);
    this.onSay?.(text);
  }

  start(delay) {
    this.state = 'dormant';
    this.timer = delay;
    this.obj.visible = false;
    this.audio.stopSong();
  }

  // ---------- 移動 ----------
  goTo(node) {
    const from = this.nav.nodeAt(this.pos, this.floor);
    const p = this.nav.path(from, node);
    if (!p || p.length < 2) return false;
    this.path = p;
    this.pi = 1;
    return true;
  }

  followPath(dt, speed) {
    if (!this.path || this.pi >= this.path.length) return true;
    if (this.pause > 0) {
      this.pause -= dt;
      return false;
    }
    const prev = this.path[this.pi - 1];
    const node = this.path[this.pi];
    // 閉まっている戸は開けて通る
    if (prev[0] === node[0] && (prev[1] !== node[1] || prev[2] !== node[2])) {
      const key = this.nav.edgeKey(prev[1], prev[2], node[1], node[2]);
      const door = this.world.edgeDoors[node[0]]?.get(key);
      if (door && !door.open && door.t < 0.5) {
        door.open = true;
        this.audio.slide(this.pos);
        this.pause = 0.45;
        return false;
      }
    }
    const target = this.nav.pointOf(node);
    const d = new THREE.Vector3(target.x - this.pos.x, 0, target.z - this.pos.z);
    const dist = d.length();
    const step = speed * dt;
    if (dist <= step) {
      this.pos.x = target.x;
      this.pos.z = target.z;
      this.floor = node[0];
      this.pi++;
    } else {
      d.multiplyScalar(step / dist);
      this.pos.add(d);
      this.obj.rotation.y = Math.atan2(d.x, d.z);
    }
    this.pos.y += (target.y - this.pos.y) * Math.min(1, dt * 8);
    this.bob += dt * speed * 4;
    this.stepTimer -= dt;
    if (this.stepTimer <= 0) {
      this.stepTimer = 0.9 / speed;
      this.audio.footstep();
    }
    return this.pi >= this.path.length;
  }

  // ---------- 見えているか ----------
  canSee(player) {
    if (player.hidden || player.floor !== this.floor) return false;
    const ax = this.pos.x, az = this.pos.z, bx = player.pos.x, bz = player.pos.z;
    const len = Math.hypot(bx - ax, bz - az);
    if (len > 16) return false;
    for (const c of this.world.colliders[this.floor]) {
      if (c.door && c.door.t > 0.75) continue;
      if (segHitsBox(ax, az, bx, bz, c)) return false;
    }
    return true;
  }

  isOpen(room) {
    return room.openings.some((o) => !o.door || o.door.t > 0.05);
  }

  // プレイヤーの部屋の前（廊下側のマス）と、その戸
  doorstep(room) {
    const ops = room.openings.filter((o) => !o.window && o.key);
    if (!ops.length) return null;
    const o = ops[Math.floor(this.R.next() * ops.length)];
    const [k, a, b] = o.key.split(':');
    const x = Number(a), y = Number(b);
    const cells = k === 'h' ? [[x, y - 1], [x, y]] : [[x - 1, y], [x, y]];
    const outside = cells.find(([cx, cy]) => {
      const c = this.nav.cell(room.floor, cx, cy);
      return c && (c.kind === 'corr' || c.room !== room);
    });
    const inside = cells.find(([cx, cy]) => this.nav.cell(room.floor, cx, cy)?.room === room);
    if (!outside || !inside) return null;
    return { out: [room.floor, ...outside], in: [room.floor, ...inside], door: o.door, mid: o.mid };
  }

  // ---------- 毎フレーム ----------
  update(dt, player) {
    this.obj.position.set(this.pos.x, this.pos.y + Math.abs(Math.sin(this.bob)) * 0.05, this.pos.z);
    this.audio.setSource(new THREE.Vector3(this.pos.x, this.pos.y + 1, this.pos.z), player.floor === this.floor);

    switch (this.state) {
      case 'dormant':
        this.timer -= dt;
        if (this.timer <= 0) {
          this.say('いまから、みつけるね');
          this.state = 'countdown';
          this.timer = 10;
        }
        return;
      case 'countdown':
        this.timer -= dt;
        if (this.timer <= 0) this.appear(player);
        return;
    }

    const dist = Math.hypot(player.pos.x - this.pos.x, player.pos.z - this.pos.z);
    if (!player.hidden && player.floor === this.floor && dist < CATCH_DIST && Math.abs(player.pos.y - this.pos.y) < 1.2) {
      this.catch();
      return;
    }

    this.noticeTimer -= dt;
    const look = this.noticeTimer <= 0;
    if (look) this.noticeTimer = 0.25;

    this.cooldown -= dt;
    const resting = (room) => room === this.cooldownRoom && this.cooldown > 0;

    if (this.state === 'roam') {
      this.visitTimer -= dt;
      if (look && !player.hidden && player.floor === this.floor) {
        const room = player.room;
        if (dist < 2.2 || (!room && this.canSee(player))) return this.startChase();
        // 開いている部屋にいると、近くを通ったときに気づかれる
        if (room && this.isOpen(room) && dist < 9 && !(resting(room) && dist > 4)) return this.enterRoom(room, player);
      }
      if (look && player.hidden && player.room && !resting(player.room) && this.isOpen(player.room) && player.floor === this.floor && dist < 7) {
        return this.enterRoom(player.room, player);
      }
      if (this.visitTimer <= 0 && player.room) {
        this.visitTimer = 25 + this.R.next() * 20;
        const ds = this.doorstep(player.room);
        if (ds && this.goTo(ds.out)) {
          this.state = 'approach';
          this.target = ds;
          this.searchRoom = player.room;
          return;
        }
      }
      if (this.followPath(dt, ROAM_SPEED)) this.pickRoamTarget(player);
      return;
    }

    if (this.state === 'approach') {
      if (player.room !== this.searchRoom) {
        this.state = 'roam';
        this.path = null;
        return;
      }
      if (look && !player.hidden && this.canSee(player)) return this.startChase();
      if (this.followPath(dt, ROAM_SPEED)) {
        if (this.isOpen(this.searchRoom)) return this.enterRoom(this.searchRoom, player);
        this.audio.knock(new THREE.Vector3(this.target.mid.x, this.target.mid.y, this.target.mid.z));
        this.say('ここに、いるの？');
        this.state = 'knock';
        this.timer = 5;
      }
      return;
    }

    if (this.state === 'knock') {
      this.timer -= dt;
      if (this.timer <= 0) {
        if (this.target.door) {
          this.target.door.open = true;
          this.audio.slide(this.pos);
        }
        this.enterRoom(this.searchRoom, player);
      }
      return;
    }

    if (this.state === 'search') {
      if (look && !player.hidden && player.room === this.searchRoom) return this.startChase();
      if (this.followPath(dt, ROAM_SPEED * 0.6)) {
        this.timer -= dt;
        this.obj.rotation.y += dt * 1.5;
        if (this.timer <= 0) {
          this.say('いないね……');
          this.state = 'roam';
          this.cooldownRoom = this.searchRoom;
          this.cooldown = 25;
          this.visitTimer = 30 + this.R.next() * 20;
          this.pickRoamTarget(player, true);
        }
      }
      return;
    }

    if (this.state === 'chase') {
      if (player.hidden) {
        this.state = 'search';
        this.searchRoom = player.room;
        this.timer = 3;
        return;
      }
      if (look) {
        if (this.canSee(player) || dist < 3) this.lostTimer = 0;
        this.repath = (this.repath || 0) - 0.25;
        if (this.repath <= 0) {
          this.repath = 0.5;
          this.goTo(this.nav.nodeAt(player.pos, player.floor));
        }
      }
      this.lostTimer += dt;
      if (this.lostTimer > 6) {
        this.state = 'roam';
        this.path = null;
        return;
      }
      // 同じマスまで来たら、まっすぐ近づく
      const done = this.followPath(dt, CHASE_SPEED);
      if (done && player.floor === this.floor) {
        const d = new THREE.Vector3(player.pos.x - this.pos.x, 0, player.pos.z - this.pos.z);
        if (d.length() > 0.01) {
          this.obj.rotation.y = Math.atan2(d.x, d.z);
          this.pos.addScaledVector(d.normalize(), Math.min(d.length(), CHASE_SPEED * dt));
        }
      }
    }
  }

  appear(player) {
    // プレイヤーから遠い廊下に現れる
    let best = null, bd = -1;
    for (let i = 0; i < 40; i++) {
      const n = this.nav.randomNode(this.R);
      if (!n || this.nav.cell(...n).kind !== 'corr') continue;
      const p = this.nav.pointOf(n);
      const d = p.distanceTo(player.pos) + (n[0] !== player.floor ? 20 : 0);
      if (d > bd && d < 70) [best, bd] = [n, d];
    }
    if (!best) best = this.nav.randomNode(this.R);
    this.pos.copy(this.nav.pointOf(best));
    this.floor = best[0];
    this.obj.visible = true;
    this.audio.startSong();
    this.state = 'roam';
    this.path = null;
    this.visitTimer = 15 + this.R.next() * 10;
  }

  pickRoamTarget(player, away = false) {
    const sameFloor = !away && this.R.chance(0.6) ? player.floor : null;
    for (let i = 0; i < 10; i++) {
      const n = this.nav.randomNode(this.R, sameFloor);
      if (n && this.goTo(n)) return;
    }
  }

  enterRoom(room, player) {
    this.searchRoom = room;
    this.state = player.hidden || player.room !== room ? 'search' : 'chase';
    this.timer = 3.5;
    this.lostTimer = 0;
    // 部屋の中のどこか（隠れている場所の近くを通ることもある）
    const tx = Math.floor((room.x0 + (room.x1 - room.x0) * (0.3 + this.R.next() * 0.4)) / U);
    const ty = Math.floor((room.z0 + (room.z1 - room.z0) * (0.3 + this.R.next() * 0.4)) / U);
    if (!this.goTo([room.floor, tx, ty])) this.goTo(this.nav.nodeAt(player.pos, player.floor));
  }

  startChase() {
    this.state = 'chase';
    this.lostTimer = 0;
    this.repath = 0;
  }

  catch() {
    this.state = 'caught';
    this.audio.stopSong();
    this.say('みーつけた');
    this.onCatch?.();
  }
}

// 線分（2D）と箱が交わるか
function segHitsBox(ax, az, bx, bz, c) {
  let t0 = 0, t1 = 1;
  const dx = bx - ax, dz = bz - az;
  for (const [p, q] of [[-dx, ax - c.minX], [dx, c.maxX - ax], [-dz, az - c.minZ], [dz, c.maxZ - az]]) {
    if (p === 0) {
      if (q < 0) return false;
    } else {
      const r = q / p;
      if (p < 0) {
        if (r > t1) return false;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return false;
        if (r < t1) t1 = r;
      }
    }
  }
  return t0 < t1 && t1 > 0.02 && t0 < 0.98;
}

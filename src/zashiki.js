// 座敷童子（鬼）
//
// dormant    … まだ出てこない
// countdown  … 「いまから　みつけるね」から 10 秒
// roam       … わらべうたを歌いながら旅館を走り回る
// investigate… 物音（走る・戸・隠れる）がしたところへ見に行く
// approach   … 部屋の前へ向かう（プレイヤーの部屋／見失ったあたりの部屋）
// knock      … 戸を叩いて「ここにいるの？」、しばらく待つ
// search     … 部屋に入って、隠れ場所をひとつずつのぞく
// chase      … 見つけて追いかける
// stare      … 廊下で立ち止まって、こちらをじっと見る（フェイント）
// fakeLeave / sneak / ambush … 立ち去ったふりをして、戸の前で待ち伏せ
// reveal     … 隠れ場所を開けて見つけた（少しだけ逃げる間がある）
//
// 記憶：隠れたのを聞いた／見た／見つけた隠れ場所を覚えていて、同じ所に続けて隠れると見つかりやすい。
// 見失ったら、最後に見た位置と逃げた方向から、近い部屋を順に探す。
import * as THREE from 'three';
import { U } from './plan.js';

const ROAM_SPEED = 2.7;
const CHASE_SPEED = 3.05;
const SNEAK_SPEED = 1.3;
const CATCH_DIST = 0.85;
const MEMORY_TIME = 180; // 隠れ場所を覚えている時間（秒）
export const SEEKER_SCALE = 1.4; // 子どもより少し大きく（身長 約 1.55m）

const pick = (R, arr) => arr[Math.floor(R.next() * arr.length)];
const LINES = {
  heard: ['……いま、音がした', 'だれか、いるの？', 'きこえたよ'],
  nothing: ['……きのせい？', 'ねずみ、かな'],
  fail: ['いないね……', 'どこ、いったの……', 'ここじゃ、ないのかな'],
  check: ['ここかな……', 'ここ、かな？'],
  again: 'また、ここ？',
  found: 'みぃつけた',
  stareSeen: ['……みえてるよ', 'あそぼ？', 'ふふ……'],
  stareBlind: ['……そこに、いるの？', 'ねえ……'],
  hunt: ['にげても、むだだよ', 'どっちに、いったの？'],
  huntKnock: ['どこ、かくれたの？', 'ここ？'],
  ambushHit: 'やっぱり、いた',
  ambushOut: '……つまんない',
};

export class Seeker {
  constructor({ world, nav, scene, model, clips = {}, audio, R, onCatch, onSay, onReveal }) {
    Object.assign(this, { world, nav, audio, R, onCatch, onSay, onReveal });
    this.obj = new THREE.Group();
    model.scale.setScalar(SEEKER_SCALE);
    this.obj.add(model);
    // アニメーション（走る・ふらふら歩く・叫ぶ）
    this.mixer = new THREE.AnimationMixer(model);
    this.actions = {};
    for (const [k, clip] of Object.entries(clips)) if (clip) this.actions[k] = this.mixer.clipAction(clip);
    if (this.actions.scream) {
      this.actions.scream.setLoop(THREE.LoopOnce);
      this.actions.scream.clampWhenFinished = true;
    }
    this.anim = null;
    this.moved = false;
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
    this.now = 0;
    this.silent = false;
    // 記憶
    this.memory = new Map(); // 隠れ場所 → { count, t }
    this.hotspots = []; // 見つけた／追いかけた場所 { node, t }
    this.heardHide = null; // { room, pos, t }
    this.sawSpot = null; // { spot, t }
    this.prevSpot = null; // プレイヤーが前回隠れた所
    this.streak = 0; // 同じ所に続けて隠れた回数
    this.lastSeen = null; // { pos, floor, dir, t }
    this.huntQueue = [];
    // フェイント
    this.stareCD = 20;
    this.blindStareTimer = 25;
    this.ambushCD = 30;
    this.hearCD = 0;
    this.sayT = -99;
  }

  say(text, gap = 0) {
    if (gap && this.now - this.sayT < gap) return;
    this.sayT = this.now;
    this.audio.say(text);
    this.onSay?.(text);
  }

  start(delay) {
    this.state = 'dormant';
    this.timer = delay;
    this.obj.visible = false;
    this.silent = false;
    this.huntQueue = [];
    this.audio.stopSong();
  }

  // ---------- 記憶 ----------
  remember(spot, w = 1) {
    if (!spot) return;
    const m = this.memory.get(spot) || { count: 0, t: 0 };
    m.count += w;
    m.t = this.now;
    this.memory.set(spot, m);
  }

  addHotspot(pos, floor) {
    this.hotspots.push({ node: this.nav.nodeAt(pos, floor), t: this.now });
    if (this.hotspots.length > 6) this.hotspots.shift();
  }

  forget() {
    for (const [s, m] of this.memory) if (this.now - m.t > MEMORY_TIME) this.memory.delete(s);
    this.hotspots = this.hotspots.filter((h) => this.now - h.t < MEMORY_TIME);
  }

  // プレイヤーが隠れたとき（main.js から）。続けて同じ所を使っているかだけ数える
  onPlayerHide(spot) {
    this.streak = spot === this.prevSpot ? this.streak + 1 : 1;
    this.prevSpot = spot;
  }

  // その隠れ場所をのぞいたとき、見つける確率
  findChance(spot) {
    let p = 0;
    const h = this.heardHide;
    if (h && h.room === spot.room && this.now - h.t < 25) p += 0.22;
    if (this.sawSpot && this.sawSpot.spot === spot && this.now - this.sawSpot.t < 30) p += 0.4;
    const m = this.memory.get(spot);
    if (m) {
      p += 0.15 * Math.min(m.count, 2);
      if (this.streak >= 2) p += 0.1 * Math.min(this.streak - 1, 3);
    }
    return Math.min(p, 0.65);
  }

  // ---------- 音 ----------
  // noise = { kind: 'step'|'door'|'hide'|'unhide', pos, floor, room, radius }
  hear(noise, player) {
    if (!this.obj.visible || noise.radius <= 0) return false;
    if (['dormant', 'countdown', 'caught', 'chase', 'reveal', 'stare'].includes(this.state)) return false;
    if (noise.floor !== this.floor) return false;
    let r = noise.radius;
    // 閉まった部屋の中の音は、壁ごしだと小さく聞こえる
    const here = this.nav.cell(...this.nav.nodeAt(this.pos, this.floor))?.room;
    if (noise.room && noise.room !== here && !this.isOpen(noise.room)) r *= 0.6;
    const d = Math.hypot(noise.pos.x - this.pos.x, noise.pos.z - this.pos.z);
    if (d > r) return false;
    if (noise.kind === 'hide' && noise.room) this.heardHide = { room: noise.room, pos: noise.pos.clone(), t: this.now };

    switch (this.state) {
      case 'approach':
      case 'knock':
        return true; // 戸の前にいるときは覚えておくだけ（「ここに、いるの？」の最中に隠れると危ない）
      case 'search':
        // 探している部屋で隠れた音がしたら、その近くから先に調べる
        if (noise.room === this.searchRoom && noise.kind === 'hide') this.sortChecks(noise.pos);
        return true;
      case 'sneak':
      case 'ambush':
        if (noise.room && noise.room === this.ambush?.room) {
          this.endAmbush();
          this.enterRoom(noise.room, player, { cause: 'noise', focus: noise.pos });
        } else this.investigate(noise);
        return true;
    }
    if (this.hearCD > 0 && noise.kind === 'step') return false;
    this.investigate(noise);
    return true;
  }

  investigate(noise) {
    this.endAmbush();
    this.noise = { ...noise, pos: noise.pos.clone() };
    this.state = 'investigate';
    this.invLook = 0;
    if (!this.goTo(this.nav.nodeAt(noise.pos, noise.floor))) this.path = null;
    this.say(pick(this.R, LINES.heard), 8);
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

  play(name, timeScale = 1) {
    const a = this.actions[name];
    if (!a) return;
    a.timeScale = timeScale;
    if (this.anim === name) return;
    const prev = this.actions[this.anim];
    a.reset().play();
    if (prev) a.crossFadeFrom(prev, name === 'scream' ? 0.05 : 0.25, false);
    this.anim = name;
  }

  animate(dt) {
    if (this.state === 'caught') this.play('scream', 0.35); // 叫びはじめ（立ったまま）だけ使う
    else if (!this.moved) this.play('walk', 0.15);
    else if (this.state === 'search' || this.state === 'sneak') this.play('walk', this.state === 'sneak' ? 0.7 : 1);
    else this.play('run', this.state === 'chase' ? 1.15 : 1);
    this.mixer.update(dt);
    this.moved = false;
  }

  face(x, z) {
    const dx = x - this.pos.x, dz = z - this.pos.z;
    if (Math.hypot(dx, dz) > 0.01) this.obj.rotation.y = Math.atan2(dx, dz);
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
    this.moved = true;
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
      if (!this.silent) this.audio.footstep();
    }
    return this.pi >= this.path.length;
  }

  // ---------- 見えているか ----------
  canSee(player) {
    if (player.hidden || player.floor !== this.floor) return false;
    const ax = this.pos.x, az = this.pos.z, bx = player.pos.x, bz = player.pos.z;
    const len = Math.hypot(bx - ax, bz - az);
    if (len > (player.crouch ? 10 : 16)) return false; // しゃがんでいると見つかりにくい
    for (const c of this.world.colliders[this.floor]) {
      if (c.door && c.door.t > 0.75) continue;
      if (segHitsBox(ax, az, bx, bz, c)) return false;
    }
    return true;
  }

  isOpen(room) {
    return room.openings.some((o) => !o.door || o.door.t > 0.05);
  }

  hasDoor(room) {
    return room.openings.some((o) => !o.window && o.key);
  }

  // 部屋の前（廊下側のマス）と、その戸
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

  // 隠れ場所の前のマス
  spotFront(s) {
    const n = [s.floor, Math.floor((s.pos.x + Math.sin(s.yaw) * 0.7) / U), Math.floor((s.pos.z + Math.cos(s.yaw) * 0.7) / U)];
    return this.nav.cell(...n)?.room === s.room ? n : this.nav.nodeAt(s.pos, s.floor);
  }

  // ---------- 毎フレーム ----------
  update(dt, player) {
    this.now += dt;
    if (this.state !== 'caught') this.obj.position.set(this.pos.x, this.pos.y, this.pos.z);
    if (this.obj.visible) this.animate(dt);
    if (this.state === 'caught') return;
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
    if (this.state !== 'reveal' && !player.hidden && player.floor === this.floor && dist < CATCH_DIST && Math.abs(player.pos.y - this.pos.y) < 1.2) {
      this.catch(player);
      return;
    }

    this.noticeTimer -= dt;
    const look = this.noticeTimer <= 0;
    if (look) {
      this.noticeTimer = 0.25;
      this.forget();
    }
    this.cooldown -= dt;
    this.stareCD -= dt;
    this.ambushCD -= dt;
    this.hearCD -= dt;
    const resting = (room) => room === this.cooldownRoom && this.cooldown > 0;
    const seen = look && this.canSee(player);
    if (seen) this.noteSeen(player);

    switch (this.state) {
      case 'roam': {
        this.visitTimer -= dt;
        if (look && !player.hidden && player.floor === this.floor) {
          const room = player.room;
          if (dist < 2.2) return this.startChase(player);
          if (!room && seen) {
            // 遠くから見つけたときは、たまに立ち止まってじっと見てから来る
            if (dist > 6 && this.stareCD <= 0 && this.R.chance(0.4)) return this.startStare(player, true);
            return this.startChase(player);
          }
          // 開いている部屋にいると、近くを通ったときに気づかれる
          if (room && this.isOpen(room) && dist < 9 && !(resting(room) && dist > 4)) return this.enterRoom(room, player, { cause: 'open' });
        }
        if (look && player.hidden && player.room && !resting(player.room) && this.isOpen(player.room) && player.floor === this.floor && dist < 7) {
          return this.enterRoom(player.room, player, { cause: 'open' });
        }
        // 廊下でふと立ち止まって、こちらのほうを見つめる
        this.blindStareTimer -= dt;
        if (this.blindStareTimer <= 0) {
          this.blindStareTimer = 20 + this.R.next() * 20;
          const here = this.nav.cell(...this.nav.nodeAt(this.pos, this.floor));
          if (here?.kind === 'corr' && player.floor === this.floor && dist < 15 && dist > 4) return this.startStare(player, false);
        }
        if (this.visitTimer <= 0 && player.room) {
          this.visitTimer = 25 + this.R.next() * 20;
          if (this.goApproach(player.room, 'visit')) return;
        }
        if (this.followPath(dt, ROAM_SPEED)) this.pickRoamTarget(player);
        return;
      }

      case 'investigate': {
        if (seen && !player.hidden) return this.startChase(player);
        if (this.invLook > 0) {
          this.invLook -= dt;
          this.obj.rotation.y += dt * 1.8;
          if (this.invLook <= 0) {
            if (this.R.chance(0.5)) this.say(pick(this.R, LINES.nothing), 6);
            this.hearCD = 3;
            this.toRoam(player);
          }
          return;
        }
        if (this.followPath(dt, ROAM_SPEED)) {
          const room = this.noise.room;
          if (room) return this.enterRoom(room, player, { cause: 'noise', focus: this.noise.pos });
          this.invLook = 2;
        }
        return;
      }

      case 'stare': {
        this.face(player.pos.x, player.pos.z);
        this.timer -= dt;
        if (this.stareChase && dist < 3) return this.startChase(player);
        if (this.timer <= 0) {
          this.stareCD = 35 + this.R.next() * 20;
          if (this.stareChase) return this.startChase(player);
          this.state = 'roam';
          this.pickRoamTarget(player);
        }
        return;
      }

      case 'approach': {
        if (this.approachMode === 'visit' && player.room !== this.searchRoom) return this.toRoam(player);
        if (seen && !player.hidden) return this.startChase(player);
        if (this.followPath(dt, ROAM_SPEED)) {
          if (this.isOpen(this.searchRoom)) return this.enterRoom(this.searchRoom, player, { cause: this.approachMode });
          this.audio.knock(new THREE.Vector3(this.target.mid.x, this.target.mid.y, this.target.mid.z));
          this.face(this.target.mid.x, this.target.mid.z);
          if (this.approachMode === 'hunt') {
            this.say(pick(this.R, LINES.huntKnock));
            this.timer = 3;
          } else {
            this.say('ここに、いるの？');
            this.timer = 5;
          }
          this.state = 'knock';
        }
        return;
      }

      case 'knock': {
        this.timer -= dt;
        if (this.timer <= 0) {
          if (this.target.door) {
            this.target.door.open = true;
            this.audio.slide(this.pos);
          }
          this.enterRoom(this.searchRoom, player, { cause: this.approachMode });
        }
        return;
      }

      case 'search':
        return this.updateSearch(dt, player, look);

      case 'reveal': {
        this.timer -= dt;
        this.face(player.pos.x, player.pos.z);
        if (this.timer <= 0) this.startChase(player);
        return;
      }

      case 'fakeLeave': {
        if (seen && !player.hidden) return this.startChase(player);
        if (this.followPath(dt, ROAM_SPEED)) {
          // 歌をやめて、足音を立てずに戻ってくる
          this.audio.stopSong();
          this.silent = true;
          this.state = 'sneak';
          if (!this.goTo(this.ambush.ds.out)) this.path = null;
        }
        return;
      }

      case 'sneak':
      case 'ambush': {
        const out = this.ambush;
        if (look && !player.hidden && (seen || (player.room !== out.room && dist < 7 && player.floor === this.floor))) {
          this.say(LINES.ambushHit);
          this.endAmbush();
          return this.startChase(player);
        }
        if (this.state === 'sneak') {
          if (this.followPath(dt, SNEAK_SPEED)) {
            this.state = 'ambush';
            this.timer = 9 + this.R.next() * 4;
          }
          return;
        }
        this.face(out.ds.mid.x, out.ds.mid.z);
        this.timer -= dt;
        if (this.timer <= 0) {
          this.say(LINES.ambushOut);
          this.endAmbush();
          this.cooldownRoom = out.room;
          this.cooldown = 25;
          this.toRoam(player, true);
        }
        return;
      }

      case 'chase':
        return this.updateChase(dt, player, look, seen, dist);
    }
  }

  noteSeen(player) {
    const prev = this.lastSeen;
    const dir = new THREE.Vector3();
    if (prev && prev.floor === player.floor && this.now - prev.t < 1.5) {
      dir.subVectors(player.pos, prev.pos).setY(0);
      if (dir.lengthSq() < 0.0004) dir.copy(prev.dir);
      else dir.normalize().lerp(prev.dir, 0.5);
    }
    this.lastSeen = { pos: player.pos.clone(), floor: player.floor, dir, t: this.now };
  }

  updateChase(dt, player, look, seen, dist) {
    if (player.hidden) {
      // 目の前で隠れたら、どこに入ったか分かっている
      const saw = this.lastSeen && this.now - this.lastSeen.t < 1.5;
      if (saw && player.spot) {
        this.sawSpot = { spot: player.spot, t: this.now };
        this.remember(player.spot, 1);
      }
      if (player.room) return this.enterRoom(player.room, player, { cause: 'chase', focus: saw ? player.pos : null });
      return this.startHunt(player);
    }
    if (look) {
      if (seen || dist < 3) this.lostTimer = 0;
      this.repath = (this.repath || 0) - 0.25;
      if (this.repath <= 0) {
        this.repath = 0.5;
        this.goTo(this.nav.nodeAt(player.pos, player.floor));
      }
    }
    this.lostTimer += dt;
    if (this.lostTimer > 6) return this.startHunt(player);
    // 同じマスまで来たら、まっすぐ近づく
    const done = this.followPath(dt, CHASE_SPEED);
    if (done && player.floor === this.floor) {
      const d = new THREE.Vector3(player.pos.x - this.pos.x, 0, player.pos.z - this.pos.z);
      if (d.length() > 0.01) {
        this.obj.rotation.y = Math.atan2(d.x, d.z);
        this.pos.addScaledVector(d.normalize(), Math.min(d.length(), CHASE_SPEED * dt));
        this.moved = true;
      }
    }
  }

  // ---------- 部屋を探す ----------
  enterRoom(room, player, { cause = 'visit', focus = null } = {}) {
    this.searchRoom = room;
    this.searchCause = cause;
    this.lostTimer = 0;
    if (!player.hidden && player.room === room) return this.startChase(player);
    this.state = 'search';
    // 調べる隠れ場所：見た所 → 覚えている所 → 音のした近く の順
    const spots = this.world.hideSpots.filter((s) => s.room === room);
    const evidence = !!focus || (this.heardHide?.room === room && this.now - this.heardHide.t < 25);
    const score = (s) => {
      let v = this.R.next() * 2;
      if (this.sawSpot?.spot === s && this.now - this.sawSpot.t < 30) v -= 100;
      const m = this.memory.get(s);
      if (m) v -= 20 * m.count;
      const f = focus || (evidence ? this.heardHide.pos : null);
      if (f) v += Math.hypot(s.pos.x - f.x, s.pos.z - f.z);
      return v;
    };
    const sorted = spots.map((s) => [score(s), s]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    const n = evidence || sorted.some((s) => this.memory.has(s)) ? 3 : 1 + (this.R.chance(0.5) ? 1 : 0);
    this.checks = sorted.slice(0, n);
    this.ci = 0;
    this.phase = 'walk';
    if (this.checks.length) {
      if (!this.goTo(this.spotFront(this.checks[0]))) this.path = null;
    } else {
      // 隠れ場所のない部屋は、まん中あたりを見回す
      const tx = Math.floor((room.x0 + (room.x1 - room.x0) * (0.3 + this.R.next() * 0.4)) / U);
      const ty = Math.floor((room.z0 + (room.z1 - room.z0) * (0.3 + this.R.next() * 0.4)) / U);
      if (!this.goTo([room.floor, tx, ty])) this.goTo(this.nav.nodeAt(player.pos, player.floor));
    }
  }

  sortChecks(pos) {
    const rest = this.world.hideSpots.filter((s) => s.room === this.searchRoom && !this.checks.slice(0, this.ci).includes(s));
    rest.sort((a, b) => Math.hypot(a.pos.x - pos.x, a.pos.z - pos.z) - Math.hypot(b.pos.x - pos.x, b.pos.z - pos.z));
    this.checks = [...this.checks.slice(0, this.ci), ...rest.slice(0, 2)];
    if (this.phase === 'walk' && this.checks[this.ci] && !this.goTo(this.spotFront(this.checks[this.ci]))) this.path = null;
  }

  updateSearch(dt, player, look) {
    if (look && !player.hidden && player.room === this.searchRoom) return this.startChase(player);
    if (this.phase === 'walk') {
      if (!this.followPath(dt, ROAM_SPEED * 0.6)) return;
      const s = this.checks[this.ci];
      if (!s) {
        this.phase = 'look';
        this.timer = this.checks.length ? 1.5 : 3.5;
        return;
      }
      this.phase = 'check';
      this.timer = 1.3;
      const here = player.hidden && player.spot === s;
      if (here && this.memory.has(s)) this.say(LINES.again);
      else if (this.ci === 0 && this.R.chance(0.5)) this.say(pick(this.R, LINES.check), 5);
      return;
    }
    if (this.phase === 'check') {
      const s = this.checks[this.ci];
      this.face(s.pos.x, s.pos.z);
      this.timer -= dt;
      if (this.timer > 0) return;
      if (player.hidden && player.spot === s) {
        if (this.R.next() < this.findChance(s)) return this.reveal(player, s);
        this.remember(s, 0.5); // なんとなく、気配だけ覚えている
      }
      this.ci++;
      if (this.ci < this.checks.length) {
        this.phase = 'walk';
        if (!this.goTo(this.spotFront(this.checks[this.ci]))) this.path = null;
      } else {
        this.phase = 'look';
        this.timer = 1.5;
      }
      return;
    }
    // look：見回して、あきらめる
    this.timer -= dt;
    this.obj.rotation.y += dt * 1.5;
    if (this.timer <= 0) this.finishSearch(player);
  }

  finishSearch(player) {
    const room = this.searchRoom;
    this.say(pick(this.R, LINES.fail));
    this.cooldownRoom = room;
    this.cooldown = 25;
    this.visitTimer = 30 + this.R.next() * 20;
    if (this.huntQueue.length && this.nextHunt()) return;
    // 立ち去ったふりをして、戸の前で待ち伏せする
    if (this.ambushCD <= 0 && this.hasDoor(room) && this.searchCause !== 'open' && this.R.chance(0.35)) {
      const ds = this.doorstep(room);
      const away = ds && this.nodeNear(ds.out, 4, 8);
      if (away && this.goTo(away)) {
        this.ambush = { room, ds };
        this.ambushCD = 60 + this.R.next() * 30;
        this.state = 'fakeLeave';
        return;
      }
    }
    this.toRoam(player, true);
  }

  endAmbush() {
    if (this.silent) {
      this.silent = false;
      this.audio.startSong();
    }
    this.ambush = null;
  }

  // 廊下で、ある場所から min〜max マスくらい離れたマス
  nodeNear([f, x, y], min, max) {
    for (let i = 0; i < 30; i++) {
      const a = this.R.next() * Math.PI * 2, r = min + this.R.next() * (max - min);
      const n = [f, Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r)];
      if (this.nav.cell(...n)?.kind === 'corr' && this.nav.walkable(...n)) return n;
    }
    return null;
  }

  reveal(player, spot) {
    this.remember(spot, 1);
    this.addHotspot(player.pos, player.floor);
    this.say(LINES.found);
    this.state = 'reveal';
    this.timer = 1.3; // 出されてから、少しだけ逃げる間がある
    this.onReveal?.(spot);
  }

  // ---------- 見失ったあと ----------
  startHunt(player) {
    this.huntQueue = [];
    const ls = this.lastSeen;
    if (ls && this.now - ls.t < 20) {
      const p = ls.pos.clone().addScaledVector(ls.dir, 6);
      this.huntQueue = this.world.rooms
        .filter((r) => r.floor === ls.floor && this.hasDoor(r))
        .map((r) => [Math.hypot((r.x0 + r.x1) / 2 - p.x, (r.z0 + r.z1) / 2 - p.z), r])
        .sort((a, b) => a[0] - b[0])
        .slice(0, 3)
        .map((x) => x[1]);
    }
    if (this.huntQueue.length) this.say(pick(this.R, LINES.hunt), 4);
    if (!this.nextHunt()) this.toRoam(player);
  }

  nextHunt() {
    while (this.huntQueue.length) {
      if (this.goApproach(this.huntQueue.shift(), 'hunt')) return true;
    }
    return false;
  }

  goApproach(room, mode) {
    const ds = this.doorstep(room);
    if (!ds || !this.goTo(ds.out)) return false;
    this.state = 'approach';
    this.approachMode = mode;
    this.target = ds;
    this.searchRoom = room;
    return true;
  }

  // ---------- その他 ----------
  toRoam(player, away = false) {
    this.state = 'roam';
    this.path = null;
    this.pickRoamTarget(player, away);
  }

  startStare(player, chase) {
    this.state = 'stare';
    this.stareChase = chase;
    this.timer = chase ? 1.2 + this.R.next() * 1.2 : 2 + this.R.next() * 1.5;
    this.stareCD = 30;
    this.say(pick(this.R, chase ? LINES.stareSeen : LINES.stareBlind), 6);
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
    this.stareCD = 15;
  }

  pickRoamTarget(player, away = false) {
    // 前に見つけた／追いかけたあたりへ、ときどき戻ってくる
    if (!away && this.hotspots.length && this.R.chance(0.25)) {
      const h = pick(this.R, this.hotspots);
      if (this.goTo(h.node)) return;
    }
    const sameFloor = !away && this.R.chance(0.6) ? player.floor : null;
    for (let i = 0; i < 10; i++) {
      const n = this.nav.randomNode(this.R, sameFloor);
      if (n && this.goTo(n)) return;
    }
  }

  startChase(player) {
    this.endAmbush();
    this.huntQueue = [];
    this.state = 'chase';
    this.lostTimer = 0;
    this.repath = 0;
    if (player) this.addHotspot(player.pos, player.floor);
  }

  catch(player) {
    this.endAmbush();
    this.state = 'caught';
    this.addHotspot(player.pos, player.floor);
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

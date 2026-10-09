// 音：わらべうた（オルゴール風）・足音・戸を叩く音・心臓の音・声（読み上げ）
// 座敷童子の音は、いる方向から聞こえる（PannerNode）。
import * as THREE from 'three';

// かごめかごめ（音名, 長さ[拍]）
const N = { D4: 293.66, E4: 329.63, G4: 392.0, A4: 440.0, C5: 523.25, D5: 587.33 };
const KAGOME = [
  ['A4', 1], ['A4', 1], ['G4', 0.5], ['A4', 0.5], ['A4', 1], ['G4', 1], [null, 1],
  ['A4', 0.5], ['A4', 0.5], ['C5', 0.5], ['C5', 0.5], ['A4', 0.5], ['A4', 0.5], ['G4', 0.5], ['A4', 1], [null, 0.5],
  ['A4', 0.5], ['A4', 0.5], ['C5', 0.5], ['C5', 0.5], ['A4', 0.5], ['A4', 0.5], ['G4', 1], [null, 0.5],
  ['A4', 0.5], ['A4', 0.5], ['C5', 0.5], ['D5', 0.5], ['C5', 0.5], ['A4', 0.5], ['G4', 1], [null, 0.5],
  ['A4', 0.5], ['G4', 0.5], ['E4', 0.5], ['E4', 0.5], ['G4', 0.5], ['A4', 0.5], ['G4', 0.5], ['E4', 0.5], ['D4', 1], [null, 0.5],
  ['E4', 0.5], ['E4', 0.5], ['G4', 0.5], ['A4', 0.5], ['G4', 0.5], ['E4', 0.5], ['D4', 0.5], ['D4', 0.5], ['E4', 0.5], ['D4', 1.5], [null, 2],
];

export class GameAudio {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);
    this.songOn = false;
    this.songTimer = null;
    this.songStep = 0;
    this.source = new THREE.Vector3();
    this.sourceFloorFactor = 1;
    // 座敷童子の位置から聞こえる音の出口
    this.panner = this.makePanner();
    this.panner.connect(this.master);
    this.voice = null;
  }

  resume() {
    if (this.ctx.state !== 'running') this.ctx.resume();
    if (!this.voice && 'speechSynthesis' in window) {
      const pick = () => {
        const vs = speechSynthesis.getVoices().filter((v) => v.lang.startsWith('ja'));
        this.voice = vs.find((v) => /Kyoko|Female|女性|Nanami|Haruka/i.test(v.name)) || vs[0] || null;
      };
      pick();
      speechSynthesis.onvoiceschanged = pick;
    }
  }

  makePanner() {
    const p = this.ctx.createPanner();
    p.panningModel = 'HRTF';
    p.distanceModel = 'inverse';
    p.refDistance = 2.5;
    p.rolloffFactor = 1.3;
    p.maxDistance = 60;
    return p;
  }

  setPos(node, v) {
    const t = this.ctx.currentTime;
    if (node.positionX) {
      node.positionX.setValueAtTime(v.x, t);
      node.positionY.setValueAtTime(v.y, t);
      node.positionZ.setValueAtTime(v.z, t);
    } else node.setPosition(v.x, v.y, v.z);
  }

  updateListener(camera) {
    const l = this.ctx.listener;
    const p = camera.getWorldPosition(new THREE.Vector3());
    const f = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const u = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    const t = this.ctx.currentTime;
    if (l.positionX) {
      l.positionX.setValueAtTime(p.x, t);
      l.positionY.setValueAtTime(p.y, t);
      l.positionZ.setValueAtTime(p.z, t);
      l.forwardX.setValueAtTime(f.x, t);
      l.forwardY.setValueAtTime(f.y, t);
      l.forwardZ.setValueAtTime(f.z, t);
      l.upX.setValueAtTime(u.x, t);
      l.upY.setValueAtTime(u.y, t);
      l.upZ.setValueAtTime(u.z, t);
    } else {
      l.setPosition(p.x, p.y, p.z);
      l.setOrientation(f.x, f.y, f.z, u.x, u.y, u.z);
    }
  }

  // 座敷童子の位置（ちがう階にいると、こもった小さな音になる）
  setSource(v, sameFloor) {
    this.source.copy(v);
    this.setPos(this.panner, v);
    this.sourceFloorFactor = sameFloor ? 1 : 0.35;
  }

  // オルゴールの 1 音
  note(freq, at, dest, vol = 0.35) {
    const o1 = this.ctx.createOscillator();
    const o2 = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o1.type = 'sine';
    o2.type = 'sine';
    o1.frequency.value = freq * (1 + (Math.random() - 0.5) * 0.006); // 少し調子はずれ
    o2.frequency.value = freq * 2.01;
    const g2 = this.ctx.createGain();
    g2.gain.value = 0.25;
    o1.connect(g);
    o2.connect(g2).connect(g);
    g.connect(dest);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vol * this.sourceFloorFactor, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, at + 1.4);
    o1.start(at);
    o2.start(at);
    o1.stop(at + 1.5);
    o2.stop(at + 1.5);
  }

  startSong() {
    if (this.songOn) return;
    this.songOn = true;
    this.songStep = 0;
    const beat = 0.5;
    let t = this.ctx.currentTime + 0.1;
    const tick = () => {
      if (!this.songOn) return;
      // 少し先まで予約する
      while (t < this.ctx.currentTime + 0.6) {
        const [n, len] = KAGOME[this.songStep % KAGOME.length];
        if (n) this.note(N[n], t, this.panner);
        t += len * beat;
        this.songStep++;
      }
      this.songTimer = setTimeout(tick, 150);
    };
    tick();
  }

  stopSong() {
    this.songOn = false;
    clearTimeout(this.songTimer);
  }

  noiseBurst(dest, at, dur, freq, vol) {
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(dest);
    src.start(at);
  }

  // ぺたぺた（裸足の足音）
  footstep() {
    this.noiseBurst(this.panner, this.ctx.currentTime, 0.07, 900, 0.5 * this.sourceFloorFactor);
  }

  // どん、どん、どん
  knock(pos) {
    const p = this.makePanner();
    p.refDistance = 3;
    p.connect(this.master);
    this.setPos(p, pos);
    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const at = t + i * 0.45;
      this.noiseBurst(p, at, 0.18, 220, 1.6);
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.frequency.value = 70;
      g.gain.setValueAtTime(0.9, at);
      g.gain.exponentialRampToValueAtTime(0.001, at + 0.25);
      o.connect(g).connect(p);
      o.start(at);
      o.stop(at + 0.3);
    }
  }

  // 戸を開ける音
  slide(pos) {
    const p = this.makePanner();
    p.connect(this.master);
    this.setPos(p, pos);
    this.noiseBurst(p, this.ctx.currentTime, 0.5, 1800, 0.35);
  }

  heartbeat(rate) {
    const t = this.ctx.currentTime;
    for (const dt of [0, 0.18]) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.frequency.value = 55;
      g.gain.setValueAtTime(0.0001, t + dt);
      g.gain.exponentialRampToValueAtTime(0.5 * rate, t + dt + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.18);
      o.connect(g).connect(this.master);
      o.start(t + dt);
      o.stop(t + dt + 0.2);
    }
  }

  // 子どもの声（読み上げを高い声にする）
  say(text) {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    if (this.voice) u.voice = this.voice;
    u.pitch = 1.9;
    u.rate = 0.82;
    u.volume = 1;
    speechSynthesis.speak(u);
  }
}

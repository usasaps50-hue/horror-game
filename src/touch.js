// スマホ用の操作：左手でスティック（移動）、右手でなでて視点、右下にボタン
export const IS_TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

const RADIUS = 55; // スティックの半径（px）

export function setupTouch({ onLook, onAction, onFlash, onMap, onPause, onRun }) {
  const state = { x: 0, y: 0, run: false };

  const ui = document.createElement('div');
  ui.id = 'touch-ui';
  ui.innerHTML = `
    <div id="t-layer"></div>
    <div id="t-stick"><div id="t-knob"></div></div>
    <button id="t-action" class="t-btn">　</button>
    <button id="t-run" class="t-btn small">走る</button>
    <button id="t-flash" class="t-btn small">灯り</button>
    <button id="t-map" class="t-btn small">地図</button>
    <button id="t-pause" class="t-btn small">Ⅱ</button>
  `;
  document.body.appendChild(ui);
  const stick = ui.querySelector('#t-stick');
  const knob = ui.querySelector('#t-knob');
  const action = ui.querySelector('#t-action');
  const runBtn = ui.querySelector('#t-run');

  let moveId = null, lookId = null;
  let base = { x: 0, y: 0 }, last = { x: 0, y: 0 };

  const layer = ui.querySelector('#t-layer');
  layer.addEventListener('touchstart', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (moveId === null && t.clientX < innerWidth * 0.45) {
        moveId = t.identifier;
        base = { x: t.clientX, y: t.clientY };
        stick.style.left = `${base.x}px`;
        stick.style.top = `${base.y}px`;
        stick.classList.add('show');
        knob.style.transform = 'translate(-50%, -50%)';
      } else if (lookId === null) {
        lookId = t.identifier;
        last = { x: t.clientX, y: t.clientY };
      }
    }
  }, { passive: false });
  layer.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === moveId) {
        let dx = t.clientX - base.x, dy = t.clientY - base.y;
        const d = Math.hypot(dx, dy);
        if (d > RADIUS) {
          dx *= RADIUS / d;
          dy *= RADIUS / d;
        }
        state.x = dx / RADIUS;
        state.y = dy / RADIUS;
        knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      } else if (t.identifier === lookId) {
        onLook(t.clientX - last.x, t.clientY - last.y);
        last = { x: t.clientX, y: t.clientY };
      }
    }
  }, { passive: false });
  const end = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === moveId) {
        moveId = null;
        state.x = state.y = 0;
        stick.classList.remove('show');
      }
      if (t.identifier === lookId) lookId = null;
    }
  };
  layer.addEventListener('touchend', end);
  layer.addEventListener('touchcancel', end);

  const tap = (el, fn) => el.addEventListener('touchstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  }, { passive: false });
  tap(action, onAction);
  tap(ui.querySelector('#t-flash'), onFlash);
  tap(ui.querySelector('#t-map'), onMap);
  tap(ui.querySelector('#t-pause'), onPause);
  tap(runBtn, () => {
    state.run = !state.run;
    runBtn.classList.toggle('on', state.run);
    onRun?.(state.run);
  });

  return {
    state,
    show(v) {
      ui.classList.toggle('show', v);
    },
    setAction(label) {
      action.textContent = label || '　';
      action.classList.toggle('ready', !!label);
    },
  };
}

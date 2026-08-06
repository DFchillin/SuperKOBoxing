// Keyboard input, kept configurable so gamepad support can slot in later.
// Movement/block are polled as held state; punches/dodge are queued as edges and
// consumed once per frame.

const DEFAULT_MAP = {
  forward: 'KeyW',
  back: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  leftJab: 'KeyQ',
  rightCross: 'KeyE',
  leftHook: 'KeyZ',
  rightHook: 'KeyC',
  touch: 'KeyF',
  block: 'ShiftLeft',
  dodge: 'Space',
  bodyModifier: 'ControlLeft',
};

// Which punch id a bound key maps to, with/without the body modifier.
const PUNCH_BINDINGS = {
  leftJab: { normal: 'left_jab', body: 'left_body' },
  rightCross: { normal: 'right_cross', body: 'right_body' },
  leftHook: { normal: 'left_hook', body: 'left_body' },
  rightHook: { normal: 'right_hook', body: 'right_body' },
};

export class InputManager {
  constructor(map = DEFAULT_MAP) {
    this.map = { ...map };
    this.held = new Set();
    this.punchQueue = [];
    this.dodgeQueue = [];
    this.enabled = true;

    // Touch overlay state (set by MobileControls). Movement from the thumbstick
    // overrides the keyboard axis while it is engaged.
    this.touchAxis = { x: 0, z: 0 };
    this.touchBlock = false;

    this._onDown = (e) => this._keydown(e);
    this._onUp = (e) => this.held.delete(e.code);
    window.addEventListener('keydown', this._onDown);
    window.addEventListener('keyup', this._onUp);
  }

  destroy() {
    window.removeEventListener('keydown', this._onDown);
    window.removeEventListener('keyup', this._onUp);
  }

  _keydown(e) {
    if (!this.enabled) return;
    // Prevent Space/arrows from scrolling the page during play.
    if ([this.map.dodge, this.map.forward, this.map.back].includes(e.code)) {
      e.preventDefault();
    }
    if (this.held.has(e.code)) return; // ignore auto-repeat for edges
    this.held.add(e.code);

    if (e.code === this.map.touch) {
      this.punchQueue.push({ id: 'touch', t: performance.now() });
      return;
    }
    const body = this.held.has(this.map.bodyModifier);
    for (const [action, binding] of Object.entries(PUNCH_BINDINGS)) {
      if (e.code === this.map[action]) {
        this.punchQueue.push({ id: body ? binding.body : binding.normal, t: performance.now() });
        return;
      }
    }
    if (e.code === this.map.dodge) {
      const dir = this.held.has(this.map.right) ? 1
        : this.held.has(this.map.left) ? -1 : (Math.random() < 0.5 ? -1 : 1);
      this.dodgeQueue.push(dir);
    }
  }

  // Logical movement axis: x = forward(+)/back(-), z = strafe right(+)/left(-).
  // The touch thumbstick takes over while engaged; otherwise the keyboard drives.
  axis() {
    if (Math.hypot(this.touchAxis.x, this.touchAxis.z) > 0.12) return this.touchAxis;
    const x = (this.held.has(this.map.forward) ? 1 : 0) - (this.held.has(this.map.back) ? 1 : 0);
    const z = (this.held.has(this.map.right) ? 1 : 0) - (this.held.has(this.map.left) ? 1 : 0);
    return { x, z };
  }

  isBlocking() {
    return this.touchBlock || this.held.has(this.map.block);
  }

  // --- Touch overlay API (used by MobileControls) ---
  setTouchAxis(x, z) { this.touchAxis.x = x; this.touchAxis.z = z; }
  setTouchBlock(on) { this.touchBlock = !!on; }
  queuePunch(id) { if (this.enabled) this.punchQueue.push({ id, t: performance.now() }); }
  queueDodge(dir) { if (this.enabled) this.dodgeQueue.push(dir); }

  // Input buffering (design notes): a press stays valid for `bufferMs` so it can
  // fire the moment a hand frees / a cancel window opens. MatchScene peeks the
  // oldest still-valid press, and pops it once it successfully starts.
  peekPunch(nowMs, bufferMs) {
    while (this.punchQueue.length && nowMs - this.punchQueue[0].t > bufferMs) {
      this.punchQueue.shift(); // drop stale presses
    }
    return this.punchQueue.length ? this.punchQueue[0].id : null;
  }

  popPunch() {
    this.punchQueue.shift();
  }

  consumeDodge() {
    if (!this.dodgeQueue.length) return null;
    const d = this.dodgeQueue[0];
    this.dodgeQueue = [];
    return d;
  }
}

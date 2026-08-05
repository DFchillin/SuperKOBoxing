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

    const body = this.held.has(this.map.bodyModifier);
    for (const [action, binding] of Object.entries(PUNCH_BINDINGS)) {
      if (e.code === this.map[action]) {
        this.punchQueue.push(body ? binding.body : binding.normal);
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
  axis() {
    const x = (this.held.has(this.map.forward) ? 1 : 0) - (this.held.has(this.map.back) ? 1 : 0);
    const z = (this.held.has(this.map.right) ? 1 : 0) - (this.held.has(this.map.left) ? 1 : 0);
    return { x, z };
  }

  isBlocking() {
    return this.held.has(this.map.block);
  }

  consumePunches() {
    const q = this.punchQueue;
    this.punchQueue = [];
    return q;
  }

  consumeDodge() {
    if (!this.dodgeQueue.length) return null;
    const d = this.dodgeQueue[0];
    this.dodgeQueue = [];
    return d;
  }
}

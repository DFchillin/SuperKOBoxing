// On-screen touch controls: a movement thumbstick (left) and an action-button
// cluster (right). It only drives the shared InputManager touch API, so game
// logic stays identical to the keyboard path.

const ACTIONS = [
  { id: 'left_jab', label: 'JAB', cls: 'a-jab' },
  { id: 'right_cross', label: 'CROSS', cls: 'a-cross' },
  { id: 'left_hook', label: 'L·HOOK', cls: 'a-hook' },
  { id: 'right_hook', label: 'R·HOOK', cls: 'a-hook' },
  { id: 'touch', label: 'TOUCH', cls: 'a-touch' },
];

export class MobileControls {
  constructor(input, root) {
    this.input = input;
    this.bodyMode = false; // BODY toggle: routes jab/cross to body shots
    this.stickId = null;   // active pointerId owning the thumbstick

    this.el = document.createElement('div');
    this.el.className = 'mobile-controls';
    this.el.innerHTML = `
      <div class="mc-left">
        <div class="mc-stick" id="mc-stick">
          <div class="mc-stick-knob" id="mc-knob"></div>
        </div>
        <div class="mc-util">
          <button class="mc-btn mc-block" data-hold="block">BLOCK</button>
          <button class="mc-btn mc-dodge" data-tap="dodge">DODGE</button>
        </div>
      </div>
      <div class="mc-right">
        <button class="mc-btn mc-body" data-toggle="body">BODY</button>
        <div class="mc-actions">
          ${ACTIONS.map((a) => `<button class="mc-btn ${a.cls}" data-punch="${a.id}">${a.label}</button>`).join('')}
        </div>
      </div>
    `;
    root.appendChild(this.el);

    this.stick = this.el.querySelector('#mc-stick');
    this.knob = this.el.querySelector('#mc-knob');
    this._wire();
  }

  show(on) { this.el.style.display = on ? 'block' : 'none'; }

  _wire() {
    // Prevent the page from scrolling / zooming when using the pad.
    this.el.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

    // --- Thumbstick ---
    const onStickDown = (e) => {
      this.stickId = e.pointerId;
      this.stick.setPointerCapture?.(e.pointerId);
      this._moveStick(e);
    };
    this.stick.addEventListener('pointerdown', onStickDown);
    this.stick.addEventListener('pointermove', (e) => {
      if (e.pointerId === this.stickId) this._moveStick(e);
    });
    const release = (e) => {
      if (e.pointerId !== this.stickId) return;
      this.stickId = null;
      this.input.setTouchAxis(0, 0);
      this.knob.style.transform = 'translate(-50%, -50%)';
    };
    this.stick.addEventListener('pointerup', release);
    this.stick.addEventListener('pointercancel', release);

    // --- Buttons ---
    for (const btn of this.el.querySelectorAll('.mc-btn')) {
      if (btn.dataset.punch) {
        btn.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          this.input.queuePunch(this._resolvePunch(btn.dataset.punch));
          this._flash(btn);
        });
      } else if (btn.dataset.tap === 'dodge') {
        btn.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          const dir = this.input.touchAxis.z > 0.2 ? 1 : this.input.touchAxis.z < -0.2 ? -1 : (Math.random() < 0.5 ? -1 : 1);
          this.input.queueDodge(dir);
          this._flash(btn);
        });
      } else if (btn.dataset.hold === 'block') {
        const set = (on) => (e) => { e.preventDefault(); this.input.setTouchBlock(on); btn.classList.toggle('active', on); };
        btn.addEventListener('pointerdown', set(true));
        btn.addEventListener('pointerup', set(false));
        btn.addEventListener('pointerleave', set(false));
        btn.addEventListener('pointercancel', set(false));
      } else if (btn.dataset.toggle === 'body') {
        btn.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          this.bodyMode = !this.bodyMode;
          btn.classList.toggle('active', this.bodyMode);
        });
      }
    }
  }

  _resolvePunch(id) {
    if (!this.bodyMode) return id;
    if (id === 'left_jab') return 'left_body';
    if (id === 'right_cross') return 'right_body';
    return id; // hooks / touch have no body variant here
  }

  _moveStick(e) {
    const r = this.stick.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const radius = r.width / 2;
    const len = Math.hypot(dx, dy) || 1;
    const clamped = Math.min(len, radius);
    dx = (dx / len) * clamped;
    dy = (dy / len) * clamped;
    this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    // Screen up = forward (toward opponent) = +x; right = +z (strafe).
    this.input.setTouchAxis(-dy / radius, dx / radius);
  }

  _flash(btn) {
    btn.classList.add('pressed');
    setTimeout(() => btn.classList.remove('pressed'), 90);
  }
}

import { Config } from '../core/Config.js';

// Retro-arcade in-match HUD, built as a lightweight DOM overlay over the canvas.
export class Hud {
  constructor(root, player, ai) {
    this.player = player;
    this.ai = ai;
    root.innerHTML = `
      <div class="hud-top">
        ${this._fighterBar('p', player)}
        <div class="hud-centre">
          <div class="hud-round" id="hud-round">ROUND 1</div>
          <div class="hud-timer" id="hud-timer">60</div>
        </div>
        ${this._fighterBar('a', ai)}
      </div>
      <div class="hud-combo" id="hud-combo"></div>
      <div class="hud-announce" id="hud-announce"></div>
      <div class="hud-debug" id="hud-debug"></div>
    `;
    this.el = {
      round: root.querySelector('#hud-round'),
      timer: root.querySelector('#hud-timer'),
      combo: root.querySelector('#hud-combo'),
      announce: root.querySelector('#hud-announce'),
      debug: root.querySelector('#hud-debug'),
      p: this._grab(root, 'p'),
      a: this._grab(root, 'a'),
    };
    this.comboTimer = 0;
    this.announceTimer = 0;
  }

  _fighterBar(id, f) {
    const align = id === 'p' ? 'left' : 'right';
    return `
      <div class="hud-fighter ${align}">
        <div class="hud-name">${f.def.name} <span class="hud-nick">"${f.def.nickname}"</span></div>
        <div class="hud-meter"><span>HEAD</span><div class="bar"><i id="${id}-head"></i></div></div>
        <div class="hud-meter"><span>BODY</span><div class="bar body"><i id="${id}-body"></i></div></div>
        <div class="hud-meter"><span>STAM</span><div class="bar stam"><i id="${id}-stam"></i></div></div>
        <div class="hud-meter"><span>GRD</span><div class="bar grd"><i id="${id}-grd"></i></div></div>
        <div class="hud-hands"><span>HANDS</span><i class="pip" id="${id}-hl">L</i><i class="pip" id="${id}-hr">R</i></div>
        <div class="hud-kd" id="${id}-kd"></div>
      </div>`;
  }

  _grab(root, id) {
    return {
      head: root.querySelector(`#${id}-head`),
      body: root.querySelector(`#${id}-body`),
      stam: root.querySelector(`#${id}-stam`),
      grd: root.querySelector(`#${id}-grd`),
      hl: root.querySelector(`#${id}-hl`),
      hr: root.querySelector(`#${id}-hr`),
      kd: root.querySelector(`#${id}-kd`),
    };
  }

  _pip(el, hand) {
    // loaded (ready) / live (throwing) / reload (recovering, dim + filling).
    const state = hand.phase === 'idle' ? 'loaded'
      : hand.phase === 'recovery' ? 'reload' : 'live';
    el.className = `pip ${state}`;
    if (state === 'reload' && hand.punch) {
      el.style.setProperty('--fill', `${(1 - hand.timer / hand.punch.recoveryMs) * 100}%`);
    } else {
      el.style.setProperty('--fill', state === 'loaded' ? '100%' : '0%');
    }
  }

  _updateFighter(bars, f) {
    // Head/body bars show remaining condition (100 = fresh).
    const headLeft = Math.max(0, 100 - f.damage.head);
    const bodyLeft = Math.max(0, 100 - f.damage.body);
    bars.head.style.width = `${headLeft}%`;
    bars.body.style.width = `${bodyLeft}%`;
    bars.stam.style.width = `${(f.stamina / Config.fighter.maxStamina) * 100}%`;
    bars.grd.style.width = `${(f.guard / Config.defence.guardMax) * 100}%`;
    this._pip(bars.hl, f.hands.left);
    this._pip(bars.hr, f.hands.right);
    bars.kd.textContent = f.knockdowns > 0 ? '● '.repeat(f.knockdowns).trim() : '';
  }

  showCombo(name) {
    this.el.combo.textContent = `${name}!`;
    this.el.combo.classList.add('show');
    this.comboTimer = 1100;
  }

  announce(text, ms = 1800) {
    this.el.announce.textContent = text;
    this.el.announce.classList.add('show');
    this.announceTimer = ms;
  }

  setRound(n, total) {
    this.el.round.textContent = `ROUND ${n}/${total}`;
  }

  update(dtMs, roundTime) {
    this._updateFighter(this.el.p, this.player);
    this._updateFighter(this.el.a, this.ai);
    this.el.timer.textContent = Math.ceil(Math.max(0, roundTime)).toString();

    if (this.comboTimer > 0) {
      this.comboTimer -= dtMs;
      if (this.comboTimer <= 0) this.el.combo.classList.remove('show');
    }
    if (this.announceTimer > 0) {
      this.announceTimer -= dtMs;
      if (this.announceTimer <= 0) this.el.announce.classList.remove('show');
    }
  }

  setDebug(lines) {
    if (!Config.debug) { this.el.debug.style.display = 'none'; return; }
    this.el.debug.style.display = 'block';
    this.el.debug.innerHTML = lines.join('<br>');
  }
}

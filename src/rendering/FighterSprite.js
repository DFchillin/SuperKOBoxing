import * as THREE from 'three';

// Procedural placeholder pixel-boxer drawn in SIDE PROFILE (Street-Fighter style)
// facing the opponent. Draws to a small canvas each frame and exposes it as a
// billboard sprite. Swap this module for real sprite-sheet playback later.

const CW = 112; // canvas pixel width
const CH = 144; // canvas pixel height
const GLOVE = 13;

export class FighterSprite {
  constructor(fighter) {
    this.fighter = fighter;
    this.canvas = document.createElement('canvas');
    this.canvas.width = CW;
    this.canvas.height = CH;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.SpriteMaterial({ map: this.texture, transparent: true });
    this.sprite = new THREE.Sprite(mat);
    this.sprite.scale.set(1.75, 2.25, 1);
  }

  // Draw a rect given in "facing-right" local coords (local +x = toward opponent),
  // auto-mirrored when the fighter faces left.
  _rect(lx, y, w, h, color) {
    const left = this._cx + (this._dir > 0 ? lx : -(lx + w));
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(left), Math.round(y), Math.round(w), Math.round(h));
  }

  redraw(nowMs) {
    const f = this.fighter;
    const c = f.def.colors;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CW, CH);

    this._dir = f.facing; // +1 faces right, -1 faces left
    this._cx = CW / 2;

    const flash = f.hitFlash > 0 && Math.floor(nowMs / 60) % 2 === 0;
    const skin = flash ? '#ff5a5a' : c.skin;
    const skinDark = flash ? '#c83030' : this._shade(c.skin, -0.18);
    const pants = '#26262f';

    if (f.down) { this._drawDown(c, skin); this.texture.needsUpdate = true; return; }

    // Idle sway + a "slip" when dodging (lean the head/hands back off the centre-line).
    const sway = Math.sin(nowMs / 320) * 1.5;
    const slip = f.isDodging() ? -10 : 0;
    const stun = f.stunned ? Math.sin(nowMs / 90) * 5 : 0;
    const headShift = slip + stun;

    // Legs — staggered orthodox stance (rear foot back, lead foot forward).
    this._rect(-17, 104, 10, 34, pants);         // rear thigh/shin
    this._rect(5, 104, 10, 34, pants);           // lead thigh/shin
    this._rect(-19, 134, 15, 8, c.accent);       // rear boot
    this._rect(5, 134, 15, 8, c.accent);         // lead boot

    // Trunks.
    this._rect(-15, 88, 27, 22, c.trunks);
    this._rect(-15, 88, 27, 4, c.accent);

    // Torso, leaning slightly forward toward the opponent.
    this._rect(-12 + sway * 0.3, 66, 25, 24, skin);
    this._rect(-8 + sway * 0.5, 52, 22, 16, skin);
    this._rect(-13, 66, 3, 24, skinDark);        // back-muscle shade

    // Neck + head (profile with a nose bump and chin toward the opponent).
    const hx = sway + headShift;
    this._rect(1 + hx, 46, 8, 8, skin);          // neck
    this._rect(2 + hx, 28, 20, 22, skin);        // head
    this._rect(22 + hx, 34, 4, 7, skin);         // nose/brow bump (forward)
    this._rect(2 + hx, 30, 4, 8, skinDark);      // back of skull shade
    this._rect(13 + hx, 36, 4, 4, '#141414');    // eye
    this._rect(3 + hx, 24, 15, 5, skinDark);     // hair

    // Arms: rear first (behind), then lead on top.
    this._drawArm(f, 'right', false, hx, c, skin);
    this._drawArm(f, 'left', true, hx, c, skin);

    this.texture.needsUpdate = true;
  }

  _drawArm(f, key, isLead, hx, colors, skin) {
    const hand = f.hands[key];
    const shoulder = isLead ? { x: 2, y: 58 } : { x: -6, y: 56 };
    let gx = isLead ? 14 : 5;
    let gy = isLead ? 50 : 46;

    const guardUp = (f.blocking && hand.phase === 'idle');
    if (guardUp) { gx = isLead ? 15 : 11; gy = isLead ? 36 : 33; }

    if (hand.phase !== 'idle' && hand.punch) {
      const p = hand.punch;
      const ext = hand.extension;
      const armLen = isLead ? 28 : 33;
      const base = isLead ? 12 : 4;
      if (p.type === 'hook') { gx = base + ext * armLen * 0.85; gy = 40 - Math.sin(ext * Math.PI) * 4; }
      else if (p.target === 'body') { gx = base + ext * armLen; gy = 72; }
      else { gx = base + ext * armLen; gy = 48; } // straight (jab/cross/touch)
    }
    gx += hx * 0.5;

    // Forearm: a bar connecting shoulder to glove.
    const a = Math.min(shoulder.x, gx);
    const b = Math.max(shoulder.x, gx) + GLOVE;
    this._rect(a, gy + GLOVE / 2 - 2, b - a, 5, skin);
    // Glove with a bright knuckle edge on the forward side.
    this._rect(gx, gy, GLOVE, GLOVE, colors.gloves);
    this._rect(gx + GLOVE - 3, gy, 3, GLOVE, colors.accent);
  }

  _drawDown(c, skin) {
    // Prone figure lying toward the mat, head to the forward side.
    this._rect(-30, 120, 46, 14, skin);   // torso
    this._rect(16, 116, 16, 16, skin);    // head forward
    this._rect(-28, 134, 40, 8, c.trunks);
    this._rect(-34, 118, 12, 12, c.gloves);
  }

  _shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.max(0, Math.min(255, r + amt * 255));
    g = Math.max(0, Math.min(255, g + amt * 255));
    b = Math.max(0, Math.min(255, b + amt * 255));
    return `rgb(${r | 0},${g | 0},${b | 0})`;
  }
}

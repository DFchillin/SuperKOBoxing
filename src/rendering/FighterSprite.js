import * as THREE from 'three';

// Procedural placeholder pixel-boxer. Draws to a small canvas each frame and
// exposes it as a billboard THREE.Sprite. Swap this whole module for real
// sprite-sheet playback later without touching game logic.

const CW = 96;  // canvas pixel width
const CH = 144; // canvas pixel height

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
    this.sprite.scale.set(1.5, 2.25, 1);
    this.bob = 0;
  }

  _px(x, y, w, h, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  redraw(nowMs) {
    const f = this.fighter;
    const c = f.def.colors;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CW, CH);

    const dir = f.facing; // +1 opponent on the right
    const cx = CW / 2;

    // Hurt flash: full-body red tint frames.
    const flash = f.hitFlash > 0 && Math.floor(nowMs / 60) % 2 === 0;
    const skin = flash ? '#ff5a5a' : c.skin;

    if (f.down) { this._drawDown(dir, c, skin); this.texture.needsUpdate = true; return; }

    // Idle bob + defensive lean/dodge sway.
    this.bob = Math.sin(nowMs / 260) * 2;
    let sway = f.lean * 8;
    if (f.isDodging()) sway += f.dodge.dir * 14;
    const stunSway = f.stunned ? Math.sin(nowMs / 90) * 6 : 0;
    const ox = sway + stunSway;
    const oy = this.bob;

    // Legs.
    this._px(cx - 16 + ox * 0.4, 104 + oy * 0.2, 12, 34, '#2a2a33');
    this._px(cx + 4 + ox * 0.4, 104 + oy * 0.2, 12, 34, '#2a2a33');
    // Boots.
    this._px(cx - 18 + ox * 0.4, 134, 16, 8, c.accent);
    this._px(cx + 4 + ox * 0.4, 134, 16, 8, c.accent);

    // Trunks.
    this._px(cx - 18 + ox, 86 + oy * 0.5, 36, 24, c.trunks);
    this._px(cx - 18 + ox, 86 + oy * 0.5, 36, 4, c.accent);

    // Torso.
    this._px(cx - 16 + ox, 54 + oy, 32, 34, skin);

    // Head.
    this._px(cx - 11 + ox, 30 + oy, 22, 24, skin);
    // Eyes / brow (facing direction).
    this._px(cx - 6 + dir * 3 + ox, 40 + oy, 4, 4, '#1a1a1a');
    this._px(cx + 2 + dir * 3 + ox, 40 + oy, 4, 4, '#1a1a1a');

    // Gloves.
    this._drawGlove(f, 'left', dir, cx, ox, oy, c);
    this._drawGlove(f, 'right', dir, cx, ox, oy, c);

    this.texture.needsUpdate = true;
  }

  _drawGlove(f, key, dir, cx, ox, oy, colors) {
    const hand = f.hands[key];
    // Neutral guard position: gloves up by the chin.
    let gx = cx + (key === 'left' ? -14 : 6) + ox;
    let gy = 48 + oy;
    const size = 14;

    const blocking = f.blocking && hand.phase === 'idle';
    if (blocking) {
      // Both gloves pulled tight in front of the face.
      gx = cx - 4 + (key === 'left' ? -6 : 6) + ox;
      gy = 34 + oy;
    }

    if (hand.phase !== 'idle' && hand.punch) {
      const p = hand.punch;
      const ext = hand.extension;
      const armLen = 34;
      gx = cx + dir * ext * armLen + (key === 'left' ? -6 : 2) + ox;
      if (p.type === 'hook') {
        gy = 44 - Math.sin(ext * Math.PI) * 8 + oy; // arcs across
        gx += dir * 6 * ext;
      } else if (p.target === 'body') {
        gy = 70 + oy; // dig to the body
      } else {
        gy = 46 + oy; // straight punch stays level
      }
    }

    this._px(gx, gy, size, size, colors.gloves);
    this._px(gx, gy, size, 3, colors.accent);
  }

  _drawDown(dir, c, skin) {
    // Simple prone figure lying along the canvas bottom.
    const y = 118;
    this._px(30, y, 40, 14, skin);        // torso
    this._px(20 + (dir > 0 ? 44 : -12), y, 18, 14, skin); // head to one side
    this._px(40, y + 14, 34, 8, c.trunks);
    this._px(28, y - 8, 12, 12, c.gloves);
    this._px(64, y - 8, 12, 12, c.gloves);
  }
}

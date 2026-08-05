import { Config } from '../core/Config.js';
import { StaminaSystem } from './StaminaSystem.js';

const HALF = Config.ring.halfSize;
const MIN_SEP = Config.fighter.clinchRange; // fighters can't fully overlap

// Owns ring movement, boundary/rope handling and fighter separation. Shared by
// both the player input path and the AI so behaviour stays consistent.
export const MovementSystem = {
  move(fighter, dir, dtMs, aggressive) {
    const dt = dtMs / 1000;
    fighter.move.x = 0; fighter.move.z = 0;
    fighter.movingAggressively = false;
    if (fighter.down || fighter.stunned) return;

    const len = Math.hypot(dir.x, dir.z);
    if (len < 0.001) return;

    const nx = dir.x / len;
    const nz = dir.z / len;

    const base = Config.fighter.baseMoveSpeed * (fighter.attr('movementSpeed') / 50);
    const speed = base * StaminaSystem.speedMult(fighter);
    let step = speed * dt;

    // Against-the-ropes: backward movement (away from opponent) is throttled.
    const towardOpp = Math.sign(fighter.opponent.pos.x - fighter.pos.x);
    const nearRope = Math.abs(fighter.pos.x) > HALF - 0.4;
    if (nearRope && Math.sign(nx) === -towardOpp) step *= 0.45;

    fighter.pos.x += nx * step;
    fighter.pos.z += nz * step;

    fighter.move.x = nx;
    fighter.move.z = nz;

    if (aggressive) {
      fighter.movingAggressively = true;
      StaminaSystem.spend(fighter, 2.5 * dt);
    }

    this._constrain(fighter);
  },

  _constrain(fighter) {
    fighter.pos.x = Math.max(-HALF, Math.min(HALF, fighter.pos.x));
    fighter.pos.z = Math.max(-HALF * 0.6, Math.min(HALF * 0.6, fighter.pos.z));

    // Keep fighters from occupying the same spot.
    const opp = fighter.opponent;
    const dx = fighter.pos.x - opp.pos.x;
    const dz = fighter.pos.z - opp.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < MIN_SEP && d > 0.0001) {
      const push = (MIN_SEP - d) / 2;
      fighter.pos.x += (dx / d) * push;
      fighter.pos.z += (dz / d) * push;
      opp.pos.x -= (dx / d) * push;
      opp.pos.z -= (dz / d) * push;
    }
  },

  // Fighters always logically face each other (used for sprite mirroring).
  updateFacing(a, b) {
    const sign = a.pos.x <= b.pos.x ? 1 : -1;
    a.facing = sign;
    b.facing = -sign;
  },
};

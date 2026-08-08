import { Config } from '../core/Config.js';
import { StaminaSystem } from './StaminaSystem.js';

const HALF = Config.ring.halfSize;
const MIN_SEP = Config.fighter.clinchRange; // fighters can't fully overlap

// Side-view footwork: movement is locked to the horizontal (x) axis. Closing and
// opening distance IS the game — there is no depth movement. `h` is a signed
// horizontal intent (-1 left … +1 right).
export const MovementSystem = {
  move(fighter, h, dtMs, aggressive) {
    const dt = dtMs / 1000;
    fighter.move.x = 0;
    fighter.movingAggressively = false;
    fighter.pos.z = 0; // stay on the fight plane
    if (fighter.down || fighter.stunned) return;
    if (Math.abs(h) < 0.05) return;

    const dir = Math.sign(h);
    const base = Config.fighter.baseMoveSpeed * (fighter.attr('movementSpeed') / 50);
    let step = base * StaminaSystem.speedMult(fighter) * dt;

    // Against the ropes: retreating (moving away from the opponent) is throttled.
    const towardOpp = Math.sign(fighter.opponent.pos.x - fighter.pos.x) || 1;
    const nearRope = Math.abs(fighter.pos.x) > HALF - 0.4;
    if (nearRope && dir === -towardOpp) step *= 0.45;

    fighter.pos.x += dir * step;
    fighter.move.x = dir;

    if (aggressive) {
      fighter.movingAggressively = true;
      StaminaSystem.spend(fighter, 2.0 * dt);
    }

    this._constrain(fighter);
  },

  _constrain(fighter) {
    fighter.pos.x = Math.max(-HALF, Math.min(HALF, fighter.pos.x));
    fighter.pos.z = 0;

    // Keep fighters from crossing over on the single axis.
    const opp = fighter.opponent;
    const dx = fighter.pos.x - opp.pos.x;
    const d = Math.abs(dx);
    if (d < MIN_SEP && d > 0.0001) {
      const push = (MIN_SEP - d) / 2;
      const s = Math.sign(dx);
      fighter.pos.x += s * push;
      opp.pos.x -= s * push;
    }
  },

  // Fighters always face each other (drives the sprite profile mirroring).
  updateFacing(a, b) {
    const sign = a.pos.x <= b.pos.x ? 1 : -1;
    a.facing = sign;
    b.facing = -sign;
  },
};

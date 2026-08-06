import { Config } from '../core/Config.js';
import { StaminaSystem } from './StaminaSystem.js';
import { DamageSystem } from './DamageSystem.js';

// A Fighter is pure game-state + a small per-hand state machine. It knows nothing
// about rendering. CombatSystem drives hit resolution against fighter state.

function makeHand() {
  return {
    phase: 'idle', // idle | startup | active | recovery
    punch: null,
    timer: 0,
    resolved: false, // did this punch already connect?
    whiffFlag: false, // set for one frame when a punch ends without landing
    // 0..1 extension used purely for the sprite pose.
    extension: 0,
  };
}

export class Fighter {
  constructor(def, side) {
    this.def = def;
    this.side = side; // 'player' | 'ai'
    this.pos = { x: 0, z: 0 };
    this.facing = 1; // +1 faces opponent to the right, -1 to the left (logical)

    this.health = Config.fighter.maxHealth;
    this.stamina = Config.fighter.maxStamina;
    this.damage = { head: 0, body: 0 };
    this.stun = 0;
    this.guard = Config.defence.guardMax;

    this.knockdowns = 0;
    this.down = false;
    this.getUpTimer = 0;
    this.countTimer = 0; // referee count while down
    this.stunned = false;

    this.hands = { left: makeHand(), right: makeHand() };
    this.blocking = false;
    this.dodge = { active: false, dir: 0, timer: 0 };

    this.move = { x: 0, z: 0 }; // last frame movement intent (for anim)
    this.movingAggressively = false;

    this.punchHistory = [];
    this.lastComboFinishT = -1;
    this.lastComboId = null;

    // Rendering hints written by systems, read by AnimationController.
    this.anim = 'idle';
    this.lean = 0;
    this.hitFlash = 0;

    this.opponent = null; // set by MatchScene
  }

  get maxHealth() { return Config.fighter.maxHealth; }

  attr(key) { return this.def.attributes[key]; }

  handBusy(hand) {
    return this.hands[hand].phase !== 'idle';
  }

  canAct() {
    return !this.down && !this.stunned;
  }

  // Attempt to begin a punch on the given hand. Returns true if it started.
  // Combat rule (design notes): only one punch may be ACTIVE at a time.
  //  - same hand must fully recover to idle before throwing again
  //  - the opposite hand may only begin while the busy hand is in RECOVERY
  //    (the "cancel window"); it is blocked during startup/active
  startPunch(handKey, punch) {
    if (!this.canAct()) return false;
    const hand = this.hands[handKey];
    if (hand.phase !== 'idle') return false;
    const other = this.hands[handKey === 'left' ? 'right' : 'left'];
    if (other.phase === 'startup' || other.phase === 'active') return false;
    if (this.stamina < punch.staminaCost * 0.5) return false; // too gassed to throw
    hand.phase = 'startup';
    hand.punch = punch;
    hand.timer = punch.startupMs;
    hand.resolved = false;
    hand.whiffFlag = false;
    this.blocking = false; // can't punch while holding a full guard
    // Commit the base stamina cost up front; a whiff adds extra later.
    StaminaSystem.spend(this, punch.staminaCost);
    return true;
  }

  startDodge(dir) {
    if (!this.canAct() || this.dodge.active) return false;
    if (this.stamina < Config.stamina.dodgeCost) return false;
    this.dodge.active = true;
    this.dodge.dir = dir; // -1 left, +1 right
    this.dodge.timer = Config.defence.dodgeWindowMs;
    StaminaSystem.spend(this, Config.stamina.dodgeCost);
    return true;
  }

  isDodging() {
    return this.dodge.active && this.dodge.timer > 0;
  }

  // Force a hand back to idle — used when a Touch interrupts its startup.
  cancelHand(handKey) {
    const h = this.hands[handKey];
    h.phase = 'idle'; h.punch = null; h.timer = 0; h.extension = 0; h.resolved = false;
  }

  knockDown() {
    this.down = true;
    this.knockdowns += 1;
    this.countTimer = 0;
    this.stun = 0;
    this.blocking = false;
    for (const h of Object.values(this.hands)) {
      h.phase = 'idle'; h.punch = null; h.timer = 0; h.extension = 0;
    }
  }

  // Advance per-hand timers and transient states. dtMs in milliseconds.
  update(dtMs) {
    const dt = dtMs / 1000;

    // Guard integrity slowly recovers.
    this.guard = Math.min(
      Config.defence.guardMax,
      this.guard + Config.defence.guardRegenPerSec * dt,
    );

    DamageSystem.decayStun(this, dt);
    StaminaSystem.regen(this, dt);

    if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dtMs);

    // Dodge window countdown.
    if (this.dodge.active) {
      this.dodge.timer -= dtMs;
      if (this.dodge.timer <= 0) { this.dodge.active = false; this.dodge.dir = 0; }
    }

    // Down / count / get-up handling is orchestrated by RoundController, but we
    // keep the stunned flag in sync here.
    this.stunned = this.stun >= Config.knockdown.stunKnockdownThreshold && !this.down;

    // Hand state machine.
    for (const key of ['left', 'right']) {
      const hand = this.hands[key];
      if (hand.phase === 'idle') { hand.extension = Math.max(0, hand.extension - dt * 6); continue; }
      hand.timer -= dtMs;
      const p = hand.punch;
      if (hand.phase === 'startup') {
        hand.extension = 1 - hand.timer / p.startupMs; // arm winds toward full
        if (hand.timer <= 0) { hand.phase = 'active'; hand.timer = p.activeMs; }
      } else if (hand.phase === 'active') {
        hand.extension = 1;
        if (hand.timer <= 0) {
          if (!hand.resolved) hand.whiffFlag = true; // whiffed — CombatSystem reads this
          hand.phase = 'recovery';
          hand.timer = p.recoveryMs;
        }
      } else if (hand.phase === 'recovery') {
        hand.extension = Math.max(0, hand.timer / p.recoveryMs);
        if (hand.timer <= 0) {
          hand.phase = 'idle'; hand.punch = null; hand.extension = 0;
        }
      }
    }
  }
}
